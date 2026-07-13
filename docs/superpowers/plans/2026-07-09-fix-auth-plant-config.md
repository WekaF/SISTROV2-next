# Fix Auth & Plant Config QA Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 QA findings from the SISTRO v2 QA pass related to login error messaging, plant-switcher, and the "Tambah Plant" (create plant) wizard: unfriendly login errors, ambiguous status labels, missing field guidance, single-shift-only plant creation, and a confusing destructive-operation warning.

**Architecture:** Frontend-only changes in `SISTROV2-next` (Next.js 16) except Task 5, which also touches the ASP.NET backend (`sistropigroup/SISTROAWESOME/api/PlantInstallController.cs`) because the "Tambah Plant" wizard posts directly to a legacy install endpoint that currently hardcodes a single shift row.

**Tech Stack:** Next.js 16 / React / TypeScript, TanStack Query, existing `Tooltip` component (`src/components/ui/tooltip.tsx`, built on `@base-ui/react/tooltip`). Backend: ASP.NET Framework 4.5, raw SQL via `SqlCommand`.

**No test runner exists in this repo** (`package.json` only has `lint`, no `test` script). Every task's verification step is: `rtk tsc --noEmit`, `rtk lint`, and a manual check against the running dev server (`npm run dev:local`) instead of an automated test.

---

## Task 1: Login error — always show friendly message for account failures

QA finding #1: when a user isn't registered, the error notification should say "akun tidak terdaftar". Investigation found this message already fires for a whitelist of known backend error substrings (`src/components/auth/SignInForm.tsx:80-87`), but any backend error string that doesn't match the whitelist leaks the raw ASP.NET error text to the user instead. Fix: invert the check — default to the friendly message, and only pass through the raw error for messages that look like genuine infrastructure failures.

**Files:**
- Modify: `src/components/auth/SignInForm.tsx:80-87`

- [ ] **Step 1: Read current logic**

Current code (`src/components/auth/SignInForm.tsx:80-87`):
```tsx
      if (result?.error) {
        let displayError = result.error;
        const lowerError = displayError.toLowerCase();
        if (lowerError.includes("invalid username") || lowerError.includes("not found") || lowerError.includes("tidak ditemukan") || lowerError.includes("invalid_grant") || lowerError.includes("login gagal") || lowerError.includes("please provide company code")) {
          displayError = "Akun tidak terdaftar";
        }
        setError(displayError);
        setIsLoading(false);
      } else if (result?.ok) {
```

- [ ] **Step 2: Replace with default-to-friendly logic**

```tsx
      if (result?.error) {
        const lowerError = result.error.toLowerCase();
        const isSystemError =
          lowerError.includes("network") ||
          lowerError.includes("timeout") ||
          lowerError.includes("fetch failed") ||
          lowerError.includes("econnrefused") ||
          lowerError.includes("kesalahan sistem");
        setError(isSystemError ? "Terjadi kesalahan sistem, silakan coba lagi." : "Akun tidak terdaftar");
        setIsLoading(false);
      } else if (result?.ok) {
```

- [ ] **Step 3: Type-check**

Run: `rtk tsc --noEmit`
Expected: no new errors in `SignInForm.tsx`

- [ ] **Step 4: Manual verify**

Run `npm run dev:local`, go to `/login`, submit a username that doesn't exist in the backend with any password. Expect the error banner to read exactly "Akun tidak terdaftar" (not a raw backend string). Then submit valid credentials to confirm login still succeeds (regression check).

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/auth/SignInForm.tsx
rtk git commit -m "fix: default login error to 'akun tidak terdaftar' instead of leaking raw backend errors"
```

---

## Task 2: Verify plant switcher search (no code change expected)

QA finding #2: "switch plant per akun kalo bisa di search". Investigation found `src/components/header/CompanySwitcher.tsx` already implements search: `searchQuery` state (line 16), `filteredCompanies` filter over `company.company`/`company_code` (lines 59-62), a search `Input` (lines 126-134), and an empty-state message "Plant tidak ditemukan." (line 139). No bug found — QA likely tested a stale deployment.

**Files:**
- Read only: `src/components/header/CompanySwitcher.tsx`

- [ ] **Step 1: Manual verify**

Run `npm run dev:local`, log in as a user with access to 2+ plants, open the plant/company switcher in the header, type a partial plant name into the search box. Expect the list to filter live and show "Plant tidak ditemukan." if nothing matches.

- [ ] **Step 2: If it reproduces**

If search does NOT work in the running app, re-open investigation — check whether `CompanySwitcher.tsx` is actually the component rendered in the header for the affected user role (`src/components/layout/AppSidebar.tsx` and `src/components/layout/LayoutWrapper.tsx` both import header components — confirm no older/duplicate switcher component is used instead). This step only runs if Step 1 fails; otherwise skip to closing the item as "already fixed, confirm with QA on latest build."

No commit needed for this task unless Step 2 uncovers a real bug.

---

## Task 3: Disambiguate "Status Plant" vs "Status Gudang" labels

QA finding #38: QA is confused because "Konfigurasi Plant" shows a plant as active while "List Gudang" shows a related row as inactive. Investigation confirmed these are two different entities with two different status fields and two different backend endpoints:
- Plant-level: `src/app/superadmin/settings/plants/page.tsx` — field `statusPlant`, Badge at lines 271-276, toggled via `PUT /api/admin/plants`.
- Gudang-level: `src/app/gudang/page.tsx` — field `Aktif` on each warehouse row (line 46, badge at lines 289-322), toggled via ASP.NET `POST /api/Gudang/GudangMuatSetting`.

They're not the same status and there's no bug — but the UI doesn't make that clear. Fix: relabel both badges so the entity they describe is unambiguous.

**Files:**
- Modify: `src/app/superadmin/settings/plants/page.tsx` (around line 271-276)
- Modify: `src/app/gudang/page.tsx` (around line 289-322)

- [ ] **Step 1: Read the plant status badge**

```bash
rtk read src/app/superadmin/settings/plants/page.tsx 260 285
```

- [ ] **Step 2: Add explicit entity label next to the plant status badge**

Wherever the badge is rendered (around line 271-276), ensure the surrounding label/column header reads "Status Perusahaan (Plant)" rather than a bare "Status" — e.g. if the table header cell currently reads:
```tsx
<th>Status</th>
```
change it to:
```tsx
<th>Status Perusahaan</th>
```
and if there is a per-row inline label pattern, prefix the badge with a small muted label the same way.

- [ ] **Step 3: Read the gudang status badge**

```bash
rtk read src/app/gudang/page.tsx 280 325
```

- [ ] **Step 4: Add explicit entity label next to the gudang status badge**

Wherever this table's status column header is (around line 289-322), change it from a bare "Status" to "Status Gudang" so it's visually distinct from the plant-level status shown elsewhere.

- [ ] **Step 5: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 6: Manual verify**

Open `/superadmin/settings/plants` and `/gudang` side by side (or in two tabs) and confirm the column headers now read "Status Perusahaan" and "Status Gudang" respectively, making clear these track different things.

- [ ] **Step 7: Commit**

```bash
rtk git add src/app/superadmin/settings/plants/page.tsx src/app/gudang/page.tsx
rtk git commit -m "fix: relabel plant vs gudang status badges to avoid confusion"
```

---

## Task 4: Add field tooltips to "Tambah Plant" wizard

QA finding #39: add tooltips explaining how to fill each field in the plant creation wizard (`src/app/superadmin/settings/plants/new/page.tsx`). A `Tooltip` component already exists (`src/components/ui/tooltip.tsx`, exports `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`) and is already used in `src/components/ui/sidebar.tsx:22-25` — reuse it, don't build a new one.

**Files:**
- Modify: `src/app/superadmin/settings/plants/new/page.tsx`

- [ ] **Step 1: Import the tooltip primitives**

At the top of `src/app/superadmin/settings/plants/new/page.tsx`, add:
```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
```
(add `HelpCircle` to the existing `lucide-react` import block at lines 9-17 instead of a second import statement)

- [ ] **Step 2: Add a tooltip next to the Company Code field**

Find the label for `company_code` in step 1 of the wizard (`renderStep1`). Change the label block from a plain `<label>` to include an inline help icon, e.g.:
```tsx
<div className="flex items-center gap-1.5 mb-2">
  <label className="text-sm font-medium">Company Code</label>
  <Tooltip>
    <TooltipTrigger>
      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
    </TooltipTrigger>
    <TooltipContent>
      Kode unik plant, huruf kapital, contoh: PKG, SBI. Tidak bisa diubah setelah plant dibuat.
    </TooltipContent>
  </Tooltip>
</div>
```

- [ ] **Step 3: Repeat the same pattern for Gudang, Produk, and Shift fields**

Apply the same `Tooltip`-wrapped `HelpCircle` pattern to:
- the Gudang list field in `renderStep2` — tooltip text: "Daftar kode gudang yang terhubung ke plant ini, satu kode per baris."
- the Produk list field in `renderStep3` — tooltip text: "Daftar produk yang akan di-mapping ke plant ini."
- the Shift label in `renderStep4` (line ~310-312, "Shift 1 (jam mulai – jam selesai)") — tooltip text: "Jam operasional shift. Tambahkan lebih dari satu shift jika plant beroperasi 24 jam." (this tooltip stays relevant after Task 5 adds multi-shift support)

- [ ] **Step 4: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 5: Manual verify**

Open `/superadmin/settings/plants/new`, hover/focus each help icon on steps 1-4, confirm tooltip text appears and is readable in both light and dark mode.

- [ ] **Step 6: Commit**

```bash
rtk git add src/app/superadmin/settings/plants/new/page.tsx
rtk git commit -m "feat: add field tooltips to plant creation wizard"
```

---

## Task 5: Support multiple shifts when creating a plant

QA finding #40: the "Tambah Plant" wizard should let the user configure more than one shift instead of defaulting to exactly 1.

Investigation: the frontend form only has single `shift_start`/`shift_end` fields (`src/app/superadmin/settings/plants/new/page.tsx:42-43`), serialized to `set_shift: "HH:mm,HH:mm"` (line 71) and posted to ASP.NET `POST /api/PlantInstall/Install`. Backend parsing (`sistropigroup/SISTROAWESOME/api/PlantInstallController.cs:66-69`) splits `set_shift` on a single comma into start/end, then calls `InsertShift` exactly once (line 102). `InsertShift` (lines 448-463) inserts one row into `M_Shift` with `keterangan='Shift 1'` and `level='1'` — the table itself supports multiple rows per `company_code` (this is the same table the separate "Pengaturan Shift" page at `/shift` reads from), so the fix is to change the wire format to a list and loop the insert, matching the existing `|`-joined-list pattern already used for `set_gudangs`/`set_produk` in this same payload.

**Files:**
- Modify: `src/app/superadmin/settings/plants/new/page.tsx` (FormState, initialForm, toPayload, renderStep4, add/removeItem helpers)
- Modify: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\PlantInstallController.cs` (InstallRequest parsing, InsertShift)

- [ ] **Step 1: Change FormState shift fields to a list**

In `src/app/superadmin/settings/plants/new/page.tsx`, replace:
```tsx
interface FormState {
  mode: "1" | "2" | "3";
  company_code: string;
  company_name: string;
  set_group: string;
  gudangs: string[];
  gudangSPPT: GudangSPPTItem[];
  produks: string[];
  shift_start: string;
  shift_end: string;
  mapping: MappingItem[];
}
```
with:
```tsx
interface ShiftItem {
  start: string;
  end: string;
}

interface FormState {
  mode: "1" | "2" | "3";
  company_code: string;
  company_name: string;
  set_group: string;
  gudangs: string[];
  gudangSPPT: GudangSPPTItem[];
  produks: string[];
  shifts: ShiftItem[];
  mapping: MappingItem[];
}
```

- [ ] **Step 2: Update initialForm**

Replace:
```tsx
  shift_start: "06:00",
  shift_end: "14:00",
```
with:
```tsx
  shifts: [{ start: "06:00", end: "14:00" }],
```

- [ ] **Step 3: Update toPayload to join shifts with `|`**

Replace:
```tsx
    set_shift: `${f.shift_start},${f.shift_end}`,
```
with:
```tsx
    set_shift: f.shifts
      .filter((s) => s.start && s.end)
      .map((s) => `${s.start},${s.end}`)
      .join("|"),
```

- [ ] **Step 4: Replace the single-shift UI in renderStep4 with an add/remove list**

Replace the block at lines 309-331 (the single "Shift 1" label + two time inputs) with a repeatable list mirroring the existing produk list pattern (`renderStep3`, which uses `removeItem`/`setField`):
```tsx
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Shift Operasional</label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setField("shifts", [...form.shifts, { start: "06:00", end: "14:00" }])
              }
            >
              <Plus className="w-3 h-3 mr-1" /> Tambah Shift
            </Button>
          </div>
          {form.shifts.map((s, i) => (
            <div key={i} className="flex gap-4 items-end mb-2">
              <div>
                <label className="text-xs text-muted-foreground">Shift {i + 1} Mulai</label>
                <Input
                  type="time"
                  value={s.start}
                  onChange={(e) => {
                    const arr = [...form.shifts];
                    arr[i] = { ...arr[i], start: e.target.value };
                    setField("shifts", arr);
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Selesai</label>
                <Input
                  type="time"
                  value={s.end}
                  onChange={(e) => {
                    const arr = [...form.shifts];
                    arr[i] = { ...arr[i], end: e.target.value };
                    setField("shifts", arr);
                  }}
                />
              </div>
              {form.shifts.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => removeItem("shifts", i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
```

Note: `removeItem`/`setField` are generic helpers already used for `gudangs`/`produks`/`mapping` earlier in this file (see `renderStep2`/`renderStep3`) — confirm their generic signature accepts a `keyof FormState` and index so `removeItem("shifts", i)` type-checks without changes to the helper itself.

- [ ] **Step 5: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no errors. If `removeItem`/`setField` are typed narrowly (e.g. a union of specific field name literals instead of `keyof FormState`), widen their type signature to include `"shifts"`.

- [ ] **Step 6: Update backend to parse and insert multiple shifts**

In `sistropigroup/SISTROAWESOME/api/PlantInstallController.cs`, replace the single-shift parse block (lines 66-69):
```csharp
            \ Parse shift: "HH:mm,HH:mm"
            var shiftParts  = (req.set_shift ?? "00:00,00:00").Split(',');
            var shiftStart  = shiftParts.Length > 0 ? shiftParts[0].Trim() : "00:00";
            var shiftEnd    = shiftParts.Length > 1 ? shiftParts[1].Trim() : "00:00";
```
with:
```csharp
            \ Parse shifts: "HH:mm,HH:mm|HH:mm,HH:mm"
            var shifts = new List<(string start, string end)>();
            foreach (var item in (req.set_shift ?? "00:00,00:00").Split(new[] { '|' }, StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = item.Split(',');
                var start = parts.Length > 0 ? parts[0].Trim() : "00:00";
                var end   = parts.Length > 1 ? parts[1].Trim() : "00:00";
                shifts.Add((start, end));
            }
            if (shifts.Count == 0) shifts.Add(("00:00", "00:00"));
```

- [ ] **Step 7: Update the call site to loop over shifts**

Replace line 102:
```csharp
                            InsertShift(conn, tx, kode, shiftStart, shiftEnd, results);
```
with:
```csharp
                            for (int i = 0; i < shifts.Count; i++)
                                InsertShift(conn, tx, kode, i + 1, shifts[i].start, shifts[i].end, results);
```

- [ ] **Step 8: Update InsertShift to accept a shift number**

Replace `InsertShift` (lines 448-463):
```csharp
        private void InsertShift(SqlConnection conn, SqlTransaction tx,
            string company, string starttime, string endtime, List<ResultRow> results)
        {
            using (var cmd = new SqlCommand(@"
                INSERT INTO M_Shift(abbrev,keterangan,scope,level,starttime,endtime,company_code)
                SELECT t.abbrev,'Shift 1','All','1',@start,@end,@c
                FROM (SELECT ISNULL(MAX(abbrev+1),1) AS abbrev FROM M_Shift) AS t
                WHERE NOT EXISTS (SELECT 1 FROM M_Shift
                    WHERE keterangan='Shift 1' AND scope='All' AND level='1' AND company_code=@c)", conn, tx))
            {
                cmd.Parameters.AddWithValue("@start", starttime);
                cmd.Parameters.AddWithValue("@end",   endtime);
                cmd.Parameters.AddWithValue("@c",     company);
                results.Add(new ResultRow { namaTabel = "M_Shift", keterangan = "", statusInsert = cmd.ExecuteNonQuery() });
            }
        }
```
with:
```csharp
        private void InsertShift(SqlConnection conn, SqlTransaction tx,
            string company, int shiftNumber, string starttime, string endtime, List<ResultRow> results)
        {
            var keterangan = "Shift " + shiftNumber;
            using (var cmd = new SqlCommand(@"
                INSERT INTO M_Shift(abbrev,keterangan,scope,level,starttime,endtime,company_code)
                SELECT t.abbrev,@ket,'All',@lvl,@start,@end,@c
                FROM (SELECT ISNULL(MAX(abbrev+1),1) AS abbrev FROM M_Shift) AS t
                WHERE NOT EXISTS (SELECT 1 FROM M_Shift
                    WHERE keterangan=@ket AND scope='All' AND level=@lvl AND company_code=@c)", conn, tx))
            {
                cmd.Parameters.AddWithValue("@ket",   keterangan);
                cmd.Parameters.AddWithValue("@lvl",   shiftNumber.ToString());
                cmd.Parameters.AddWithValue("@start", starttime);
                cmd.Parameters.AddWithValue("@end",   endtime);
                cmd.Parameters.AddWithValue("@c",     company);
                results.Add(new ResultRow { namaTabel = "M_Shift", keterangan = keterangan, statusInsert = cmd.ExecuteNonQuery() });
            }
        }
```

- [ ] **Step 9: Build the backend**

This is an ASP.NET Framework project (not part of the Next.js repo). Open `sistropigroup/SISTROAWESOME.sln` in Visual Studio (or run `msbuild`) and confirm `PlantInstallController.cs` compiles with no errors.

- [ ] **Step 10: Manual verify end-to-end**

With both `start-dev.ps1` (backend) and the Next.js dev server running, go to `/superadmin/settings/plants/new`, add 2 shifts in step 4 (e.g. `06:00-14:00` and `14:00-22:00`) with a fresh/test `company_code`, submit, and confirm the result table shows `M_Shift` inserted twice (once per shift). Then check `/shift` (Pengaturan Shift page) for that plant and confirm both shifts appear.

- [ ] **Step 11: Commit (two separate commits, one per repo)**

```bash
rtk git add src/app/superadmin/settings/plants/new/page.tsx
rtk git commit -m "feat: support multiple shifts when creating a plant"
```
Then in `sistropigroup`:
```bash
git add SISTROAWESOME/api/PlantInstallController.cs
git commit -m "feat: accept multiple shifts in plant install payload"
```

---

## Task 6: Clarify the "Operasi Destruktif" warning wording

QA finding #41: QA doesn't understand what "operasi destruktif" means despite the existing warning box. Investigation found the warning at `src/app/superadmin/settings/plants/new/page.tsx:422-444` already explains the consequence, but leads with an unexplained technical term and shows a raw function name (`installationPlant_deleteData`) to a non-technical user. Fix: lead with plain-language consequence, move the technical function name into a tooltip instead of inline body text.

**Files:**
- Modify: `src/app/superadmin/settings/plants/new/page.tsx:422-444`

- [ ] **Step 1: Replace the warning block**

Current code:
```tsx
        <div className="rounded border border-yellow-400 bg-yellow-50 p-3 flex gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              Perhatian — Operasi Destruktif
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Klik Install akan menjalankan{" "}
              <code className="font-mono">installationPlant_deleteData</code> yang{" "}
              <strong>MENGHAPUS</strong> semua data plant{" "}
              <strong>{form.company_code || "…"}</strong> sebelum re-seed. Pastikan
              ini memang intended.
            </p>
            <label className="flex items-center gap-2 mt-2 text-xs font-medium text-yellow-800 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Saya memahami dan ingin melanjutkan
            </label>
          </div>
        </div>
```

Replace with:
```tsx
        <div className="rounded border border-yellow-400 bg-yellow-50 p-3 flex gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-yellow-800">
                Perhatian — Data Lama Akan Dihapus
              </p>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-yellow-700" />
                </TooltipTrigger>
                <TooltipContent>
                  Proses ini menjalankan fungsi backend <code>installationPlant_deleteData</code>.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Klik Install akan <strong>MENGHAPUS</strong> semua data plant{" "}
              <strong>{form.company_code || "…"}</strong> yang sudah ada sebelum
              data baru dibuat ulang (re-seed). Tindakan ini{" "}
              <strong>tidak bisa dibatalkan</strong>. Pastikan Anda memang bermaksud
              menghapus dan membuat ulang plant ini.
            </p>
            <label className="flex items-center gap-2 mt-2 text-xs font-medium text-yellow-800 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Saya memahami dan ingin melanjutkan
            </label>
          </div>
        </div>
```

(This step depends on Task 4 Step 1 already having imported `Tooltip`, `TooltipTrigger`, `TooltipContent`, and `HelpCircle` in this file — if Task 6 is executed independently of Task 4, add those imports first.)

- [ ] **Step 2: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 3: Manual verify**

Open `/superadmin/settings/plants/new`, go to step 4, confirm the warning now reads in plain Indonesian without leading with a raw function name, and that hovering the help icon still shows the technical detail for anyone who wants it.

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/superadmin/settings/plants/new/page.tsx
rtk git commit -m "fix: reword destructive-operation warning in plain language"
```

---

## Self-Review Notes

- Coverage: Task 1 → #1, Task 2 → #2, Task 3 → #38, Task 4 → #39, Task 5 → #40, Task 6 → #41. All 6 items in this cluster covered.
- Tasks 4 and 6 both touch `renderStep4`/imports in the same file — if executed by different subagents, execute Task 4 before Task 6 (Task 6 depends on Task 4's import step), or merge them into one PR to avoid an import conflict.
- Task 5 is the only cross-repo task in this plan; its backend half must be committed and built in `sistropigroup`, not this repo.
