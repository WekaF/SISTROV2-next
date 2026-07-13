# Fix Prioritas Muat, Kuota Export & Shift Settings QA Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 unrelated-but-small QA findings: the "cara penggunaan" info card on Prioritas Tujuan Muat disappearing when it shouldn't, a completely non-functional Export button on Penjadwalan Kuota, and Pengaturan Shift showing no data for `admin`-role users due to a role mismatch between frontend and backend.

**Architecture:** Frontend-only changes, all in `SISTROV2-next`. No backend changes needed for this cluster.

**Tech Stack:** Next.js 16 / React / TypeScript, TanStack Query, `xlsx` via the shared `src/lib/export-helper.ts`.

**No test runner exists in this repo.** Verification steps use `rtk tsc --noEmit`, `rtk lint`, and manual checks against `npm run dev:local`.

---

## Task 1: Move the "Cara Penggunaan" card to the top and keep it visible

QA finding #8: "card cara penggunaan ditaro di atas, dan jangan ilang kalo udh ngeklik gudangnya" (put the how-to-use card at the top, and don't make it disappear once a warehouse is clicked).

Investigation found `src/app/posto/priority/page.tsx` renders this card at the very bottom (lines 436-450), and it's only shown when `postoItems.length === 0 && !loadingPosto && selectedGudang.size === 0` — so it vanishes the moment the user selects any gudang, even before any POSTO data loads.

**Files:**
- Modify: `src/app/posto/priority/page.tsx:184-450`

- [ ] **Step 1: Read the current header and info-banner blocks**

```bash
rtk read src/app/posto/priority/page.tsx 184 215
rtk read src/app/posto/priority/page.tsx 434 451
```

- [ ] **Step 2: Remove the info banner from the bottom**

Delete this block from the end of the file (currently lines 436-450):
```tsx
      {/* Info banner */}
      {postoItems.length === 0 && !loadingPosto && selectedGudang.size === 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
          <TriangleAlert className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-400">
            <p className="font-bold mb-1">Cara Penggunaan:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Pilih satu atau lebih gudang tujuan dari panel di atas.</li>
              <li>Klik <strong>Tampilkan POSTO</strong> untuk melihat daftar dokumen aktif.</li>
              <li>Aktifkan/nonaktifkan toggle pada setiap dokumen POSTO.</li>
              <li>Klik <strong>Simpan Prioritas</strong> untuk menyimpan perubahan.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
```
leaving the file ending with just:
```tsx
    </div>
  );
}
```

- [ ] **Step 3: Insert it at the top, unconditionally, right after the page header**

Current code around lines 184-216:
```tsx
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SortAsc className="h-6 w-6 text-brand-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prioritas Tujuan Muat</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Atur status aktif/nonaktif dokumen POSTO per tujuan gudang untuk mengontrol antrian pemuatan.
          </p>
        </div>
        {postoItems.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchPrioritas} disabled={loadingPosto}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingPosto ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 text-white shadow shadow-brand-500/20"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Simpan Prioritas
            </Button>
          </div>
        )}
      </div>

      {/* Gudang selector */}
```

Insert the (now unconditional) info banner between the header `</div>` and the `{/* Gudang selector */}` comment:
```tsx
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SortAsc className="h-6 w-6 text-brand-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prioritas Tujuan Muat</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Atur status aktif/nonaktif dokumen POSTO per tujuan gudang untuk mengontrol antrian pemuatan.
          </p>
        </div>
        {postoItems.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchPrioritas} disabled={loadingPosto}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingPosto ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 text-white shadow shadow-brand-500/20"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Simpan Prioritas
            </Button>
          </div>
        )}
      </div>

      {/* Info banner (always visible — doesn't hide once a gudang is selected) */}
      <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
        <TriangleAlert className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-400">
          <p className="font-bold mb-1">Cara Penggunaan:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Pilih satu atau lebih gudang tujuan dari panel di bawah.</li>
            <li>Klik <strong>Tampilkan POSTO</strong> untuk melihat daftar dokumen aktif.</li>
            <li>Aktifkan/nonaktifkan toggle pada setiap dokumen POSTO.</li>
            <li>Klik <strong>Simpan Prioritas</strong> untuk menyimpan perubahan.</li>
          </ol>
        </div>
      </div>

      {/* Gudang selector */}
```
(the first list item's wording changed from "panel di atas" to "panel di bawah" since the gudang selector panel is now below this card instead of above it)

- [ ] **Step 4: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 5: Manual verify**

Open `/posto/priority`, confirm the "Cara Penggunaan" card appears at the top right below the page header, select one or more gudang, click "Tampilkan POSTO", and confirm the card stays visible throughout (doesn't disappear after selecting a gudang or after POSTO data loads).

- [ ] **Step 6: Commit**

```bash
rtk git add src/app/posto/priority/page.tsx
rtk git commit -m "fix: move Cara Penggunaan card to top and keep it always visible on Prioritas Tujuan Muat"
```

---

## Task 2: Implement the "Export" button on Penjadwalan Kuota

QA finding #10: "export jadwal kuota gabisa" (can't export the quota schedule). Investigation found the button in `src/app/kuota/schedule/page.tsx:224-227` has no `onClick` handler at all — it's a fully dead button:
```tsx
<Button variant="outline" size="sm" className="dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700">
  <Download className="h-4 w-4 mr-2" />
  Export
</Button>
```
The page already fetches its rows through `/api/kuota/schedule` (used by the `fetcher` at lines 60-79) and the app already has a shared Excel export helper (`src/lib/export-helper.ts`, `exportToExcel(data, headers, keys, filename)`) used elsewhere (e.g. `src/app/reports/tiket-pi/page.tsx`). Reuse it instead of writing new export logic.

**Files:**
- Modify: `src/app/kuota/schedule/page.tsx`

- [ ] **Step 1: Add the export helper import and an `exporting` state**

Near the top of the file, add:
```tsx
import { exportToExcel } from "@/lib/export-helper"
```
and inside the component (near the other `useState` calls, after `metrics`):
```tsx
  const [exporting, setExporting] = useState(false)
```
(add `useState` to the existing `import { useState, useEffect, useCallback } from "react"` if it isn't already imported — it already is, per line 2)

- [ ] **Step 2: Add a `handleExport` function that fetches the full dataset and exports it**

Add this function near `fetcher` (after it, before the `columns` definition):
```tsx
  const handleExport = async () => {
    setExporting(true)
    try {
      const qs = new URLSearchParams({
        draw: "1",
        start: "0",
        length: "10000",
        search: "",
      })
      if (activeCompanyCode) qs.set("companyCode", activeCompanyCode)
      const res = await fetch(`/api/kuota/schedule?${qs}`)
      const result = await res.json()
      if (!result.success) throw new Error(result.error || "Gagal mengambil data untuk export")
      const rows = (result.data ?? []) as QuotaRow[]
      const exportRows = rows.map((r) => ({
        ...r,
        statusLabel: r.activated === "1" ? "Aktif" : "Nonaktif",
      }))
      exportToExcel(
        exportRows,
        ["Tanggal", "Produk", "Kuota (Ton)", "Terpesan", "Masuk", "Keluar", "Status", "Updated On", "Updated By"],
        ["tanggalString", "namaproduk", "kuota", "kuota_terpesan", "kuota_in", "kuota_out", "statusLabel", "updatedonString", "updatedbyString"],
        `Jadwal_Kuota_${new Date().toISOString().slice(0, 10)}`
      )
    } catch (err: any) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }
```

- [ ] **Step 3: Wire the button up**

Change (lines 224-227):
```tsx
          <Button variant="outline" size="sm" className="dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
```
to:
```tsx
          <Button
            variant="outline"
            size="sm"
            className="dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Mengekspor..." : "Export"}
          </Button>
```

- [ ] **Step 4: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 5: Manual verify**

Open `/kuota/schedule`, click "Export", confirm an `.xlsx` file downloads named `Jadwal_Kuota_<today's date>.xlsx`, and open it to confirm the columns (Tanggal, Produk, Kuota (Ton), Terpesan, Masuk, Keluar, Status, Updated On, Updated By) contain real data matching what's shown on screen.

- [ ] **Step 6: Commit**

```bash
rtk git add src/app/kuota/schedule/page.tsx
rtk git commit -m "feat: implement Export button on Penjadwalan Kuota"
```

---

## Task 3: Fix "Pengaturan Shift" showing no data

QA finding #11: "pengaturan shift datanya gaada" (shift settings data doesn't show up). Investigation found a role mismatch between the frontend and its own backing API route:
- `src/app/shift/page.tsx:23` — `canEdit = ["superadmin", "admin"].includes(role)` — the page itself treats `admin` as allowed to view/edit shifts.
- `src/app/api/admin/shifts/route.ts:6-11` — `hasAccess()` only allows `["superadmin", "ti", "staffarea"]` — **`admin` is missing**.

Since every method on this route (`GET`, `PATCH`, `PUT`, `POST`) gates on `hasAccess()`, any user with only the `admin` role gets a 401 from `GET /api/admin/shifts`. The page's `allShifts` query (lines 40-47) doesn't check `res.ok` and just returns `[]` on a non-array response, so the stats cards silently show 0/0 and the table appears to have no data — exactly matching the QA report.

**Files:**
- Modify: `src/app/api/admin/shifts/route.ts:6-11`

- [ ] **Step 1: Read the current access check**

```bash
rtk read src/app/api/admin/shifts/route.ts 1 12
```

- [ ] **Step 2: Add `admin` to the allowed roles**

Change:
```ts
function hasAccess(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    ["superadmin", "ti", "staffarea"].includes(r.toLowerCase())
  );
}
```
to:
```ts
function hasAccess(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    ["superadmin", "ti", "staffarea", "admin"].includes(r.toLowerCase())
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Log in as a user whose only role is `admin`, open `/shift`, and confirm the stats cards and table now show real shift data instead of zeros/empty. Also confirm `superadmin`/`ti`/`staffarea` users still work as before (regression check), and that a role with genuinely no access (e.g. a plain `viewer`) still gets rejected.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/api/admin/shifts/route.ts
rtk git commit -m "fix: allow admin role to access Pengaturan Shift data"
```

---

## Self-Review Notes

- Coverage: Task 1 → #8, Task 2 → #10, Task 3 → #11. All 3 items in this cluster covered.
- All three tasks touch different files with no overlap — safe to execute fully in parallel.
