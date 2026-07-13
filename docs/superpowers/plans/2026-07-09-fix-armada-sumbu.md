# Fix Armada & Sumbu QA Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 9 QA findings across fleet (armada) upload and axle (sumbu) management: an unwanted KIR template column, silent server-side validation failures on armada upload, a broken "Tarik Data Sumbu" pull, a non-functional axle-setup mockup page, and a role-gated master data page that shows no data for some roles.

**Architecture:** Mostly frontend (`SISTROV2-next`). One fix (Task 3) requires the ASP.NET backend (`sistropigroup/SISTROAWESOME/api/SumbuController.cs`).

**Tech Stack:** Next.js 16 / React / TypeScript, `xlsx` for upload parsing; ASP.NET Framework 4.5 / Entity Framework on the backend.

**No test runner exists in this repo.** Verification steps use `rtk tsc --noEmit`, `rtk lint`, and manual checks against `npm run dev:local` (and the backend where noted).

**Decisions confirmed with the user before writing this plan:**
- QA finding #30 ("sumbu kendaraan" should become a plain table) and #31 ("sumbu kendaraan is redundant with master sumbu, delete it") conflict. The user chose: **fix `axle-setup` into a working plain table and keep both menus** — do not delete anything.

---

## Task 1: Remove the "kir" column from the armada upload template

QA finding #24: "template -> kolom kir diapus". Investigation found `src/app/armada/upload/page.tsx`'s `EXCEL_COLUMNS` array (lines 34-50) includes a `"kir"` column that's redundant with the already-present `masa_berlaku_kir`/`no_rangka_kir`/`no_mesin_kir` fields (`kir` itself is parsed but never validated or displayed in the preview table — it's dead weight in the template). Removing it from the downloadable template is safe: `kir` isn't a required field anywhere in `validateRow()` (lines 101-133) or the backend's `ValidateArmadaData` (confirmed in `sistropigroup/SISTROAWESOME/Helper/GeneralHelper.cs:654-712` — `kir` isn't referenced at all there), and `parseExcelRows` already defaults it to `""` if the column is absent from the uploaded file (line 153: `String(raw["kir"] ?? raw["KIR"] ?? "").trim()`).

**Files:**
- Modify: `src/app/armada/upload/page.tsx:34-50`

- [ ] **Step 1: Read the current column list**

```bash
rtk read src/app/armada/upload/page.tsx 33 51
```

- [ ] **Step 2: Remove the "kir" entry**

Change:
```tsx
const EXCEL_COLUMNS = [
  "Username",
  "Nopol",
  "sumbu",
  "jeniskendaraan",
  "TonaseMax",
  "jbi",
  "BeratKendaraan",
  "beratpenumpang",
  "kir",
  "tahun_pembuatan",
  "no_rangka_stnk",
  "no_mesin_stnk",
  "masa_berlaku_kir",
  "no_rangka_kir",
  "no_mesin_kir",
];
```
to:
```tsx
const EXCEL_COLUMNS = [
  "Username",
  "Nopol",
  "sumbu",
  "jeniskendaraan",
  "TonaseMax",
  "jbi",
  "BeratKendaraan",
  "beratpenumpang",
  "tahun_pembuatan",
  "no_rangka_stnk",
  "no_mesin_stnk",
  "masa_berlaku_kir",
  "no_rangka_kir",
  "no_mesin_kir",
];
```

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Open `/armada/upload`, click "Download Template", open the downloaded `.xlsx`, and confirm the "kir" column is gone while every other column is unchanged. Upload a file built from the new template and confirm it still parses and validates correctly (the `kir` DB field will just be stored empty, which is fine since it's not validated).

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/armada/upload/page.tsx
rtk git commit -m "fix: remove unused kir column from armada upload template"
```

---

## Task 2: Surface server-side validation errors on armada upload (per row)

QA findings #26, #27, and #28 turned out to share one root cause, confirmed by reading the actual backend validator:

- `sistropigroup/SISTROAWESOME/Helper/GeneralHelper.cs:654-712` (`ValidateArmadaData`, called from `ArmadaController.UploadBulk` at line 222) **already rejects**:
  - vehicle age over 20 years, gated by the plant's `tahunpembuatan` config flag (lines 677-684) — this is QA finding #27.
  - a sumbu/jeniskendaraan/tonase combination that doesn't match the `Sumbu` master table (lines 686-709) — this is QA finding #26, and its exact rejection message ("Tolak. Kombinasi Sumbu (...) dan Jenis Kendaraan (...) tidak terdaftar di master data.") matches QA finding #28's own words precisely.
- `ArmadaController.UploadBulk` (lines 217-293) collects every per-row failure into an `errors: [{ nopol, error }]` array and returns it in the response.
- But `src/app/armada/upload/page.tsx`'s `handleSubmit` (lines 229-281) only reads `inserted`/`failed` for the toast message and does `console.warn("Server-side errors:", errors)` (line 274) — the actual `errors` array is **never shown to the user**. This is why QA saw "9 armada valid tapi gagal simpan" with no visible reason: the rows were correctly rejected by validations that already work, but the rejection reasons only ever reached the browser console.

Fix: map the returned `errors` back onto the preview table by `nopol`, reusing the same per-row error column the table already has for client-side validation errors (see `src/app/armada/upload/page.tsx:483-494`).

**Files:**
- Modify: `src/app/armada/upload/page.tsx:229-281` (`handleSubmit`)

- [ ] **Step 1: Read the current submit handler**

```bash
rtk read src/app/armada/upload/page.tsx 229 282
```

- [ ] **Step 2: Map server errors back onto the rows by nopol**

Current code:
```tsx
      const { inserted, failed, errors } = json.data ?? {};
      setSubmitDone(true);
      addToast({
        variant: inserted > 0 ? "success" : "warning",
        title: `Upload selesai`,
        description: `${inserted ?? 0} armada berhasil disimpan, ${failed ?? 0} gagal.`,
      });

      if (errors && errors.length > 0) {
        console.warn("Server-side errors:", errors);
      }
```

Replace with:
```tsx
      const { inserted, failed, errors } = json.data ?? {};
      setSubmitDone(true);
      addToast({
        variant: inserted > 0 ? "success" : "warning",
        title: `Upload selesai`,
        description: `${inserted ?? 0} armada berhasil disimpan, ${failed ?? 0} gagal.`,
      });

      if (errors && errors.length > 0) {
        const errorByNopol = new Map<string, string>(
          (errors as { nopol: string; error: string }[]).map((e) => [e.nopol, e.error])
        );
        setRows((prev) =>
          prev.map((r) =>
            errorByNopol.has(r.nopol)
              ? { ...r, isValid: false, errors: [...r.errors, errorByNopol.get(r.nopol)!] }
              : r
          )
        );
      }
```

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Build a test upload file with at least one row whose `sumbu`/`jeniskendaraan` combination doesn't exist in the `Sumbu` master table (check `/superadmin/settings/sumbu` for valid combinations, then use an invalid one), upload it on `/armada/upload`, and confirm: (a) the row initially shows "Valid" (client-side checks pass), (b) after clicking "Simpan", that row's Status badge flips to "Invalid" and its Error column now shows the exact backend rejection message ("Tolak. Kombinasi Sumbu ... tidak terdaftar di master data."). Repeat with a vehicle whose `tahun_pembuatan` is more than 20 years old on a plant that has the age-limit config enabled (`tahunpembuatan` toggle on `/superadmin/settings/plants`), and confirm the age-limit rejection message shows the same way.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/armada/upload/page.tsx
rtk git commit -m "fix: surface server-side armada validation errors in the preview table"
```

---

## Task 3: Verify "informasi sumbu" fields on armada upload (no code change expected)

QA finding #25: "tambah informasi sumbu (no. sumbu, jenis kendaraan, tonasemax)" — add axle info fields to the upload flow. Investigation found `src/app/armada/upload/page.tsx` already has all three: the template already includes `sumbu`, `jeniskendaraan`, and `TonaseMax` columns (`EXCEL_COLUMNS`, confirmed in Task 1), `ArmadaRow` already parses them (lines 52-71), and the preview table already renders them as "Sumbu", "Jenis", and "Qty Max" columns (lines 436-438, 471-473). No gap found — likely the same class of issue as other "already implemented" findings in this QA pass (stale build tested).

**Files:**
- Verify only: `src/app/armada/upload/page.tsx`

- [ ] **Step 1: Manual verify**

Run `npm run dev:local`, open `/armada/upload`, upload any valid file, and confirm the preview table's "Sumbu", "Jenis", and "Qty Max" columns show real data from the uploaded rows.

- [ ] **Step 2: If it doesn't reproduce as fixed**

If these columns are genuinely missing in the running app, re-open investigation — check whether a different, older upload page exists elsewhere in the codebase that QA might have tested instead of `src/app/armada/upload/page.tsx` (search `rtk grep "armada.*upload" src/lib/menu-catalog.ts src/lib/menu-configs.tsx` to confirm which page the "Upload Armada" menu item actually links to). Otherwise, close this item as already resolved.

No commit needed for this task unless Step 2 uncovers a real gap.

---

## Task 4: Fix "Sumbu Percepatan" failing to pull data

QA finding #29: "menu sumbu percepatan = gagal Tarik data sumbu". Investigation found the actively-routed backend action `sistropigroup/SISTROAWESOME/api/SumbuController.cs:268-348` (`TarikSumbuPercepatan()`, which is what `/api/Sumbu/TarikSumbuPercepatan` resolves to by convention — confirmed no `[Route]` override) has two bugs:

1. **No null check on the current user** (line 274): `AspNetUsers user = db.AspNetUsers.Where(x => x.UserName == User.Identity.Name).FirstOrDefault();` — if this lookup returns `null` (e.g. a username casing mismatch between the auth identity and the `AspNetUsers` table), the very next line (`db.M_Percepatan.Where(x => x.KodePlant == user.company_code)`) throws a `NullReferenceException`. A separate, unused sibling method in the same file, `TarikSumbuPercepatan1()` (lines 351+), already has the correct fix (`if (user == null) return Json(...)`) but isn't the one actually wired to the route the frontend calls — it looks like a fix was written and never applied to the real endpoint.
2. **The catch block returns HTTP 200 on failure** (lines 342-347): `return Json((object)ex.ToString());` — same anti-pattern found elsewhere in this codebase (see the `fix-tiket-reports` plan, Task 2). This means the Next.js proxy route (`src/app/api/armada/percepatan/tarik/route.ts:31`, `if (!res.ok) throw ...`) never catches it either — instead `data.data ?? data ?? []` falls through to the raw exception string, and calling `.map()` on a string throws a *different*, more confusing `TypeError` inside the Next.js route, which is what actually surfaces as "Gagal memuat data sumbu".

**Files:**
- Modify: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\SumbuController.cs` (`TarikSumbuPercepatan()`, lines 268-348)

- [ ] **Step 1: Read the current method**

```bash
grep -n "public JsonResult<object> TarikSumbuPercepatan()" -A 80 SISTROAWESOME/api/SumbuController.cs
```
(run inside `sistropigroup`)

- [ ] **Step 2: Add the missing null check**

Change:
```csharp
        public JsonResult<object> TarikSumbuPercepatan()
        {
            //Serverside parameter
            try
            {

                AspNetUsers user = db.AspNetUsers.Where(x => x.UserName == User.Identity.Name).FirstOrDefault();

                //Serverside parameter
                var Request = HttpContext.Current.Request;
```
to:
```csharp
        public JsonResult<object> TarikSumbuPercepatan()
        {
            //Serverside parameter
            try
            {

                AspNetUsers user = db.AspNetUsers.Where(x => x.UserName == User.Identity.Name).FirstOrDefault();
                if (user == null)
                {
                    return Json((object)new { success = false, message = "User tidak ditemukan." });
                }

                //Serverside parameter
                var Request = HttpContext.Current.Request;
```

- [ ] **Step 3: Return a real error status from the catch block**

Change (lines 341-347):
```csharp
            catch (Exception ex)
            {
                Debug.WriteLine($"Error in SumbuPercepatan: {ex}");

                return Json((object)ex.ToString());
            }
        }
```
to:
```csharp
            catch (Exception ex)
            {
                Debug.WriteLine($"Error in SumbuPercepatan: {ex}");

                return Json((object)new { success = false, message = "An error occurred while retrieving data.", error = ex.Message });
            }
        }
```
(this still returns HTTP 200 like before — `JsonResult<object>` actions in this codebase don't have an easy path to a non-200 status without changing the return type — but it now returns a stable, always-parseable `{ success, message, error }` shape instead of a bare exception string, so the Next.js route's `raw.map()` no longer blows up on a string; pair this with Step 4)

- [ ] **Step 4: Make the Next.js route handle the `{success:false}` shape explicitly**

In `src/app/api/armada/percepatan/tarik/route.ts`, current code (lines 32-42):
```ts
    const data = await res.json();
    const raw: any[] = data.data ?? data ?? [];
    const normalized = raw.map((item: any) => ({
```
Replace with:
```ts
    const data = await res.json();
    if (data && data.success === false) {
      throw new Error(data.message || data.error || "Gagal menarik data sumbu");
    }
    const raw: any[] = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
    const normalized = raw.map((item: any) => ({
```

- [ ] **Step 5: Build the backend**

Open `sistropigroup/SISTROAWESOME.sln` in Visual Studio (or run `msbuild`) and confirm `SumbuController.cs` compiles with no errors.

- [ ] **Step 6: Type-check and lint the frontend change**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 7: Manual verify**

With both backend and frontend running, open `/armada/percepatan`, click "Tarik Data Sumbu Kendaraan", and confirm it now succeeds and populates the modal with sumbu rows instead of showing "Gagal memuat data sumbu". If you can reproduce the original null-user condition (e.g. a test user whose `AspNetUsers.UserName` doesn't exactly match their login identity), confirm the toast now shows a clear "User tidak ditemukan" message instead of a generic failure.

- [ ] **Step 8: Commit (two separate commits, one per repo)**

```bash
rtk git add src/app/api/armada/percepatan/tarik/route.ts
rtk git commit -m "fix: handle graceful error responses from TarikSumbuPercepatan"
```
Then in `sistropigroup`:
```bash
git add SISTROAWESOME/api/SumbuController.cs
git commit -m "fix: null-check current user and return stable error shape in TarikSumbuPercepatan"
```

---

## Task 5: Rebuild "Sumbu Kendaraan" as a working plain table

QA finding #30 (per the user's decision above: fix in place, don't delete). Investigation found `src/app/armada/axle-setup/page.tsx` is entirely disconnected from real data — `axleConfigs` is a hardcoded in-file array with generic placeholder rows (no "no sumbu"/ID field at all, matching QA's complaint), the "Jumlah Sumbu" input has no `value`/`onChange`, and both "Save Configuration" and row "Edit" buttons have no `onClick` handlers. It's a UI mockup that was never wired up.

The real, working axle master data already exists at `/api/admin/sumbu` (used by `src/app/superadmin/settings/sumbu/page.tsx`, the "Master Sumbu Kendaraan" page being fixed for data-loading in Task 6 below) and returns `{ Id, jenistruk, nama, tahun, muatan, IdGrupTruk }` per row (confirmed via the `Sumbu` interface in that file, lines 24-33). Per the user's decision, `axle-setup` stays as a separate menu item, rebuilt as a genuinely working **read-only** table sourced from that same endpoint — matching QA's own phrasing, "mending dibuat table biasa kyk dulu" (better to make it a plain table like before), rather than reattempting the broken inline-edit UI. Actual create/edit/delete continues to live on the Master Sumbu Kendaraan page.

**Files:**
- Modify: `src/app/armada/axle-setup/page.tsx` (full rewrite of the page body)

- [ ] **Step 1: Read the current page**

```bash
rtk read src/app/armada/axle-setup/page.tsx
```

- [ ] **Step 2: Replace the page with a real, fetch-backed read-only table**

Replace the entire contents of `src/app/armada/axle-setup/page.tsx` with:
```tsx
"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Weight, AlertCircle, Loader2, Hash } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";

interface Sumbu {
  Id: number;
  jenistruk: string;
  nama: string;
  tahun: string;
  muatan: number;
  IdGrupTruk: number;
}

export default function AxleSetupPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["axle-setup-sumbu"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sumbu");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal mengambil data sumbu");
      return (json.data ?? []) as Sumbu[];
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sumbu Kendaraan</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Daftar konfigurasi sumbu dan batas tonase maksimal yang dipakai untuk validasi upload/pengajuan armada.
          Untuk menambah, mengubah, atau menghapus konfigurasi, gunakan menu Master Sumbu Kendaraan.
        </p>
      </div>

      <Card className="shadow-theme-xs">
        <CardHeader>
          <CardTitle>Konfigurasi Sumbu Terdaftar</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Memuat data...
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-12 text-red-500 text-sm">
              <AlertCircle className="h-5 w-5 mr-2" /> Gagal memuat data sumbu.
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">No. Sumbu</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Nama Sumbu</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Jenis Kendaraan</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Tonase Max</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Tahun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                        Belum ada data sumbu.
                      </td>
                    </tr>
                  ) : (
                    (data ?? []).map((s) => (
                      <tr key={s.Id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                        <td className="px-6 py-4 font-mono text-sm font-bold">
                          <div className="flex items-center gap-2">
                            <Hash className="h-3.5 w-3.5 text-gray-400" />
                            {s.Id}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold">{s.nama}</td>
                        <td className="px-6 py-4 text-sm">{s.jenistruk}</td>
                        <td className="px-6 py-4">
                          <Badge color="info" size="sm" startIcon={<Weight className="h-3 w-3" />}>
                            {s.muatan} Ton
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{s.tahun}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-4 bg-brand-50 border border-brand-100 dark:bg-brand-500/5 dark:border-brand-500/10 rounded-xl flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-brand-500 mt-1" />
        <div className="text-sm text-brand-700 dark:text-brand-400">
          <p className="font-bold mb-1">Penting:</p>
          <p>Konfigurasi ini divalidasi oleh sistem saat upload/pengajuan armada. Kombinasi Sumbu, Jenis Kendaraan, dan Tonase Max yang tidak terdaftar di sini akan ditolak.</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Open `/armada/axle-setup`, confirm it now shows a real table of sumbu configurations (with a visible "No. Sumbu" ID column) sourced from live data instead of the 5 hardcoded placeholder rows, and confirm there's no longer a fake "Add New Config"/non-functional "Edit" UI.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/armada/axle-setup/page.tsx
rtk git commit -m "fix: rebuild Sumbu Kendaraan as a working read-only table backed by real data"
```

---

## Task 6: Fix "Master Sumbu Kendaraan" showing no data for some roles

QA finding #32: "menu master sumbu kendaraan = datanya ga muncul". Investigation found `src/app/api/admin/sumbu/route.ts`'s `isAuthorized()` (lines 6-11) only allows `["superadmin", "ti", "adminsumbu", "adminarmada"]`. The sibling armada percepatan routes (`src/app/api/armada/percepatan/tarik/route.ts` and `src/app/api/armada/percepatan/route.ts`) allow a broader set including `pod` and `admin`. Any user whose role is `admin` or `pod` — both otherwise treated as legitimate armada-management roles elsewhere in this app (e.g. `ALLOWED_ROLES` on the armada upload page, `src/app/armada/upload/page.tsx:31`, already includes `pod`/`admin`/`superadmin`) — gets a 401 from every method on this route (`GET`/`POST`/`PUT`/`DELETE`), and the page just renders an empty table.

**Files:**
- Modify: `src/app/api/admin/sumbu/route.ts:6-11`

- [ ] **Step 1: Read the current access check**

```bash
rtk read src/app/api/admin/sumbu/route.ts 1 12
```

- [ ] **Step 2: Broaden the allowed roles to match the rest of the armada/sumbu surface**

Change:
```ts
function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    ["superadmin", "ti", "adminsumbu", "adminarmada"].includes(r.toLowerCase())
  );
}
```
to:
```ts
function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    ["superadmin", "ti", "adminsumbu", "adminarmada", "pod", "admin"].includes(r.toLowerCase())
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Log in as a user whose only role is `admin` or `pod`, open `/superadmin/settings/sumbu`, and confirm the table now shows real data instead of appearing empty. Confirm `superadmin`/`ti`/`adminsumbu`/`adminarmada` users still work as before (regression check), and that a role with genuinely no relation to armada (e.g. `viewer`) still gets rejected.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/api/admin/sumbu/route.ts
rtk git commit -m "fix: allow admin/pod roles to access Master Sumbu Kendaraan data"
```

---

## Self-Review Notes

- Coverage: Task 1 → #24, Task 2 → #26+#27+#28, Task 3 → #25, Task 4 → #29, Task 5 → #30, Task 6 → #32. QA finding #31 is resolved by the user's explicit decision (keep both menus, fix `axle-setup` instead of deleting it) — no separate task needed. All 9 items in this cluster are accounted for.
- Task 5 depends on Task 6 being deployed for full effect in one sense (both read from `/api/admin/sumbu`), but Task 5's own page works for any role that already has access — execute Task 6 first (or in parallel) so both pages work correctly for the same set of roles at the same time.
- Task 4's backend fix (SumbuController.cs) is independent of every other task in this plan — safe to run in parallel.
