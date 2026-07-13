# Armada Pengajuan: STNK Fields + Action Buttons Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/armada/pengajuan`, add the missing "No Rangka STNK" / "No Mesin STNK" form inputs, and fix the backend role check so the row-level Action buttons (Tolak/Approve/View/Edit/Delete) actually render for the roles the frontend already treats as "admin armada".

**Architecture:** Two independent single-file fixes across the two repos that make up SISTRO:
1. Frontend-only UI addition in `SISTROV2-next` — the form state, validation, and backend persistence for `no_rangka_stnk`/`no_mesin_stnk` already exist end-to-end; only the `<Input>` fields are missing from the form markup.
2. Backend-only RBAC fix in `sistropigroup` — the API's `isAdminArmada` getter only matches the literal role `"AdminArmada"`, while the frontend already grants "admin armada" UI (and thus expects action buttons) to `StaffArea*`, `Candal*`, and `Admin` roles too. Because the backend never puts action-button HTML in the `Action` field for those roles, the Action column renders empty for anyone whose role isn't literally `AdminArmada` or `Transport`.

**Tech Stack:** Next.js 16 (React, TanStack Query) for the frontend; ASP.NET Framework 4.5 Web API (C#) for the backend.

---

## Root cause notes (read before starting)

### Why the STNK fields don't show up

`src/app/armada/pengajuan/page.tsx` already has `no_rangka_stnk`/`no_mesin_stnk` in:
- `emptyForm()` (`page.tsx:135-136`)
- `buildFormData()`, which sends them to the backend (`page.tsx:421-422`)
- `validate()`, which **requires** them and rejects submission if they don't match the KIR fields (`page.tsx:444-450`)
- The edit-populate logic when opening an existing record (`page.tsx:392-393`)

But `renderFormFields()` (Section 3, "Legalitas & Berkas") only renders `<Input>` fields for `no_rangka_kir` / `no_mesin_kir` (`page.tsx:906-915`). There is no input for `no_rangka_stnk` / `no_mesin_stnk` anywhere in the JSX. Since those two fields can never be typed into, they stay `""` forever, and `validate()` always throws `"Nomor Rangka STNK () dan KIR (...) tidak sama."` — the form is currently unsubmittable in practice. The backend (`sistropigroup/SISTROAWESOME/api/ArmadaController.cs`) already reads, validates, and persists these two fields correctly (confirmed at lines 1220-1221, 1420-1421, 1910-1944, 2051-2089) — this is a pure frontend markup gap, no backend change needed.

### Why the Action buttons don't show up

The Action column in the table is driven entirely by an HTML string the backend builds and the frontend regex-parses (`parseActions()`, `page.tsx:569-588`). The backend only builds that HTML for `isTransport` or `isAdminArmada` (`sistropigroup/SISTROAWESOME/api/ArmadaController.cs:2899-2903`), where:

```csharp
// BaseApiController.cs:37
protected bool isAdminArmada { get => IsUserInRole("AdminArmada"); }
```

Meanwhile the frontend already treats a much wider set of roles as "admin armada" and shows them the admin submission form (`page.tsx:240-251`):

```js
r.includes("adminarmada") || r.includes("staffare") || r.includes("candal") ||
r.includes("pod") || r.includes("dataareabagian") || r === "admin"
```

So a user with role `StaffArea`, any `Candal*` role, or plain `Admin` sees the admin form on the frontend, but the backend's `isAdminArmada` is `false` for them and `isTransport` is also `false` (their role isn't `Transport` either) — so `Action` comes back as an empty string for every row, and the Action column renders with zero buttons, regardless of a row's status.

(`pod` and `dataareabagian` in that frontend check don't correspond to any role the backend recognizes for armada purposes — `pod` is only a menu-grouping key elsewhere in the backend, unrelated to `IsUserInRole`, and the `DataAreaBagian*` roles are legacy roles actively being decommissioned in favor of a new `UserAreaScopes` table. Leaving those two frontend checks alone — they're pre-existing and harmless; fixing them is out of scope here.)

The fix: extend `isAdminArmada` in `BaseApiController.cs` to also match `Admin` and the real `StaffArea*`/`Candal*` roles, so it agrees with what the frontend already shows.

---

## Task 1: Add No Rangka STNK / No Mesin STNK inputs to the form

**Files:**
- Modify: `src/app/armada/pengajuan/page.tsx:906-915`

- [ ] **Step 1: Add the STNK input grid above the existing KIR input grid**

In `renderFormFields()`, Section 3 ("Legalitas & Berkas"), find this existing block:

```tsx
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">No Rangka KIR</label>
              <Input value={f.no_rangka_kir} onChange={(e) => set({ no_rangka_kir: e.target.value })} className="h-9 rounded-xl text-[10px] uppercase font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">No Mesin KIR</label>
              <Input value={f.no_mesin_kir} onChange={(e) => set({ no_mesin_kir: e.target.value })} className="h-9 rounded-xl text-[10px] uppercase font-mono" />
            </div>
          </div>
```

Replace it with (new STNK grid inserted above the existing KIR grid):

```tsx
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">No Rangka STNK <span className="text-red-500">*</span></label>
              <Input value={f.no_rangka_stnk} onChange={(e) => set({ no_rangka_stnk: e.target.value })} className="h-9 rounded-xl text-[10px] uppercase font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">No Mesin STNK <span className="text-red-500">*</span></label>
              <Input value={f.no_mesin_stnk} onChange={(e) => set({ no_mesin_stnk: e.target.value })} className="h-9 rounded-xl text-[10px] uppercase font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">No Rangka KIR</label>
              <Input value={f.no_rangka_kir} onChange={(e) => set({ no_rangka_kir: e.target.value })} className="h-9 rounded-xl text-[10px] uppercase font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">No Mesin KIR</label>
              <Input value={f.no_mesin_kir} onChange={(e) => set({ no_mesin_kir: e.target.value })} className="h-9 rounded-xl text-[10px] uppercase font-mono" />
            </div>
          </div>
```

This is the exact same pattern (`Input`, same classes, same `set()` callback) already used for the KIR fields two lines below — `f.no_rangka_stnk`/`f.no_mesin_stnk`/`set` all already exist on `ReturnType<typeof emptyForm>`, so no type changes are needed.

- [ ] **Step 2: Manually verify in the browser**

Start the dev server if it isn't already running:

```bash
npm run dev
```

Open `http://localhost:3000/armada/pengajuan` logged in as a `Transport`/`Rekanan` user:
1. Confirm two new fields "No Rangka STNK" and "No Mesin STNK" appear above "No Rangka KIR"/"No Mesin KIR" in the "Legalitas & Berkas" section, both marked required (`*`).
2. Fill the full form, including matching values for STNK and KIR fields (e.g. `no_rangka_stnk = "ABC123"`, `no_rangka_kir = "ABC123"`).
3. Submit — confirm it succeeds (previously this would always fail with "Nomor Rangka STNK () dan KIR (ABC123) tidak sama." because the STNK field could never be filled in).
4. Open an existing row for edit — confirm the STNK fields populate from `DetailDataReview` correctly (`page.tsx:392-393` already wires this).

- [ ] **Step 3: Commit**

```bash
git add src/app/armada/pengajuan/page.tsx
git commit -m "fix: add missing No Rangka/Mesin STNK inputs to armada pengajuan form"
```

---

## Task 2: Fix Action buttons not rendering for StaffArea/Candal/Admin roles

**Files:**
- Modify: `sistropigroup/SISTROAWESOME/api/BaseApiController.cs:37`

- [ ] **Step 1: Broaden the `isAdminArmada` role check**

Find this line:

```csharp
        protected bool isAdminArmada { get => IsUserInRole("AdminArmada"); }
```

Replace it with:

```csharp
        protected bool isAdminArmada
        {
            get => IsUserInRole("AdminArmada") ||
                   IsUserInRole("Admin") ||
                   isStaffArea ||
                   IsUserInRole("CandalContainer") ||
                   IsUserInRole("CandalTruk") ||
                   IsUserInRole("CandalGudang") ||
                   IsUserInRole("CandalKuota") ||
                   IsUserInRole("CandalKuotaPKG") ||
                   IsUserInRole("CandalKuotaPKC") ||
                   IsUserInRole("CandalKuotaMENENG");
        }
```

`isStaffArea` (declared two lines below in the same class, at `BaseApiController.cs:38`) already covers `StaffAreaWilayah1`, `StaffAreaWilayah2`, `StaffAreaJatim`, and `StaffArea` — C# doesn't care about member declaration order within a class, so referencing it here is fine.

This intentionally does **not** touch the pre-existing `isCandalDept` getter (`BaseApiController.cs:40`), which has its own unrelated bug (it lists `CandalContainer` twice and is missing `CandalGudang`/`CandalKuota`) — that's a separate issue from what was asked here, so the Candal roles are enumerated directly instead of reusing `isCandalDept`.

`isAdminArmada` is used in exactly one place in the API layer — `ArmadaController.cs` (5 call sites: lines 2482, 2578, 2789-2790, 2900-2903) — all of which build the Action-button HTML for armada review rows, so broadening this one getter fixes all of them consistently.

- [ ] **Step 2: Build the backend**

From `sistropigroup`, build the `SISTROAWESOME` project (e.g. via Visual Studio, or `msbuild` if available on PATH) and confirm it compiles with no errors — this is a pure boolean-expression change with no new dependencies.

- [ ] **Step 3: Manually verify with a real login**

Start both projects per the existing workflow:

```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```

Log in as a user whose role is `StaffArea`, any `Candal*` role, or `Admin` (not `AdminArmada` or `Transport`), and open `/armada/pengajuan`:
1. Confirm the admin submission form (Transportir dropdown) still shows, as before.
2. In "Riwayat Pengajuan Unit", confirm the Action column now shows buttons (Tolak/Approve/View for pending rows) instead of being empty.
3. Open browser devtools → Network tab, find the `DataTableReviewBaru` POST response, and confirm the `Action` field for a pending row is a non-empty HTML string containing `tolakItemProcess(...)`/`approveItemProcess(...)`/`viewItemProcess(...)` anchors.

(No automated test is added for this getter: the codebase has no unit-test harness that mocks `ApiController.User`/`ClaimsPrincipal` — the one existing test project, `ClassLibrary1/SISTRO.Tests.csproj`, only contains a live-server integration stress test that hits a real running API and database. Building fresh mocking scaffolding just for this one-line boolean getter would be disproportionate to the fix; manual verification against a running login matches how the rest of this controller's RBAC logic is validated in this codebase.)

- [ ] **Step 4: Commit**

```bash
git add SISTROAWESOME/api/BaseApiController.cs
git commit -m "fix: recognize StaffArea/Candal/Admin roles as admin-armada for action buttons"
```

---

## Self-review

- **Spec coverage:** "tambahkan form nomor mesin dan rangka stnk" → Task 1. "kenapa tombol action tidak muncul? jelaskan ke saya" → root-cause section above (explanation) + Task 2 (fix). Both explicitly requested items are covered.
- **Placeholder scan:** No TBD/TODO/"add validation"-style placeholders; all steps show exact code.
- **Type consistency:** `no_rangka_stnk`/`no_mesin_stnk` names match exactly what's already used in `emptyForm()`, `buildFormData()`, `validate()`, and the edit-populate block in `page.tsx`. `isStaffArea` name matches the existing getter in `BaseApiController.cs`.
