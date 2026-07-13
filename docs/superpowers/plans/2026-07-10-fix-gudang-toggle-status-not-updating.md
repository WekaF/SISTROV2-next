# Fix Gudang Toggle Status Not Updating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "Aktifkan/Nonaktifkan Gudang" toggle on `/gudang` — it shows a "Sukses" toast but the radio/switch never visually changes state.

**Architecture:** The frontend sends `aktif: "1" | "0"` (a JSON *string*) in the POST body to `/aspnet-proxy/api/Gudang/GudangMuatSetting`. The backend model `MappingProdukGudang.aktif` is `Nullable<bool>`. Json.NET cannot convert the quoted string `"1"`/`"0"` into a `bool` — it only accepts unquoted JSON booleans (`true`/`false`) or the strings `"true"`/`"false"`. Because `GudangController.GudangMuatSetting` never checks `ModelState.IsValid`, the failed-to-bind property silently falls back to `null` instead of throwing, the row is saved with `aktif = NULL`, and `HttpStatusCode.OK` is still returned — hence the misleading success toast. Downstream, `DataMapping()` renders the switch/badge using `x.aktif == true`, so a `NULL` value always renders as "Nonaktif" no matter which direction you toggled. Fix: send real JSON booleans instead of the string "1"/"0".

**Tech Stack:** Next.js 16 (App Router, `"use client"`), TanStack Query, `/gudang` page component. Backend is ASP.NET Framework 4.5 (Web API 2 + Json.NET), read-only for this fix (no backend code changes needed/available to deploy from this repo).

---

## Investigation Notes (read before starting)

- Frontend toggle handler: [`src/app/gudang/page.tsx:215-229`](../../../src/app/gudang/page.tsx#L215-L229) (`handleToggleAktifConfirm`). Line 221 sends:
  ```ts
  body: JSON.stringify({ id: row.id, aktif: nextStatus ? "1" : "0" })
  ```
- Backend action: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\GudangController.cs:1105-1121` (`GudangMuatSetting`). Binds `MappingProdukGudang param` from the JSON body, then:
  ```csharp
  MappingProdukGudang produkgudang = db.MappingProdukGudang.Where(x => x.id == param.id).SingleOrDefault();
  produkgudang.aktif = param.aktif;
  db.Entry(produkgudang).State = EntityState.Modified;
  db.SaveChanges();
  return Content(HttpStatusCode.OK, param);
  ```
  No `ModelState.IsValid` check — a bind failure on `aktif` doesn't abort the request.
- Model field: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\BDO\MappingProdukGudang.cs:24`:
  ```csharp
  public Nullable<bool> aktif { get; set; }
  ```
- Render logic that depends on the true boolean value: `GudangController.cs:113` inside `DataMapping()`:
  ```csharp
  Aktif = ((User.IsInRole("CandalGudang") || User.IsInRole("TI"))
      ? switch1 + x.id + switch2 + x.id + switch3 + (x.aktif == true ? "checked" : "") + switch4
      : (x.aktif == true ? "<span class='badge badge-success'>Aktif</span>" : "<span class='badge badge-danger'>Non Aktif</span>"))
  ```
  `x.aktif == true` is `false` for both `false` and `null` — this is why the switch always renders "off" after any toggle attempt, regardless of which direction the user chose.
- No backend deploy/build step is available from this repo (`sistropigroup` is a separate ASP.NET project) — this plan does **not** modify backend code, since the bug is fully fixable from the frontend by sending a correctly-typed payload. If the team later wants defense-in-depth on the backend (checking `ModelState.IsValid` and returning 400 on bad payloads), that's a separate follow-up, not required to fix this bug.
- No test runner (vitest/playwright) is configured in `package.json` — verification for this plan is manual, via the running dev server and a direct `curl`/PowerShell API check.

---

### Task 1: Send real JSON booleans instead of "1"/"0" strings

**Files:**
- Modify: `src/app/gudang/page.tsx:221`

- [ ] **Step 1: Read the current toggle handler**

Confirm the exact code before editing (`src/app/gudang/page.tsx:215-229`):

```tsx
  const handleToggleAktifConfirm = async () => {
    if (!toggleTarget) return;
    const { row, nextStatus } = toggleTarget;
    try {
      await apiJson("/api/Gudang/GudangMuatSetting", {
        method: "POST",
        body: JSON.stringify({ id: row.id, aktif: nextStatus ? "1" : "0" })
      });
      addToast({ title: "Sukses", description: `Gudang ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gudang-list"] });
      setToggleTarget(null);
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengubah status gudang", variant: "destructive" });
    }
  };
```

- [ ] **Step 2: Change the request body to send a real boolean**

Replace the `body` line so `aktif` is a JSON boolean (`true`/`false`), which Json.NET binds correctly to `Nullable<bool>`:

```tsx
        body: JSON.stringify({ id: row.id, aktif: nextStatus })
```

Full corrected function:

```tsx
  const handleToggleAktifConfirm = async () => {
    if (!toggleTarget) return;
    const { row, nextStatus } = toggleTarget;
    try {
      await apiJson("/api/Gudang/GudangMuatSetting", {
        method: "POST",
        body: JSON.stringify({ id: row.id, aktif: nextStatus })
      });
      addToast({ title: "Sukses", description: `Gudang ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gudang-list"] });
      setToggleTarget(null);
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengubah status gudang", variant: "destructive" });
    }
  };
```

- [ ] **Step 3: Type-check the change**

Run: `npm run build` (or `npx tsc --noEmit` if faster) from `c:\Users\weka\Indigo\SISTROV2-next`.
Expected: no new TypeScript errors introduced by this change.

- [ ] **Step 4: Start (or confirm running) dev server**

Run: `npm run dev` from `c:\Users\weka\Indigo\SISTROV2-next` (network backend) — skip if already running.
Expected: server up at `http://localhost:3000`.

- [ ] **Step 5: Manually verify in browser as a CandalGudang/TI-role user**

1. Open `http://localhost:3000/gudang`.
2. Find a row currently "Off" (Nonaktif). Click its switch.
3. Confirm the dialog ("Ya, Ubah").
4. Expected: "Sukses" toast appears **and** the switch visually flips to green/"On" without a manual page refresh.
5. Click the same switch again to toggle back to "Off".
6. Expected: switch flips back to grey/"Off".
7. Reload the page (`F5`).
8. Expected: the switch state persists as whatever it was last set to (proves it's actually persisted server-side, not just a stale optimistic UI).

- [ ] **Step 6: Verify the raw API payload/response (optional but recommended)**

In browser DevTools → Network tab, click the switch once more and inspect the `GudangMuatSetting` request:
Expected request payload: `{"id":"<id>","aktif":true}` (or `false`) — not `"1"`/`"0"`.
Expected response: HTTP 200 with `aktif` echoed back as `true`/`false` (not `null`).

- [ ] **Step 7: Commit**

```bash
git add src/app/gudang/page.tsx
git commit -m "fix: send boolean aktif instead of string \"1\"/\"0\" for gudang toggle"
```
