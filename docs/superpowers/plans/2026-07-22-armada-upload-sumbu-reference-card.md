# Armada Upload — Sumbu Reference Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reference card to `/armada/upload` that shows the currently-enforced Master Sumbu combinations (No. Sumbu, Jenis Kendaraan, Tonase Max), so a user filling the Excel template can see valid values before uploading instead of finding out only after a row is rejected.

**Architecture:** Frontend-only change to `src/app/armada/upload/page.tsx`. The page already fetches the full `Sumbu` master table into `sumbuMaster` state (used only for row validation) — no new API call is needed. Add a derived, memoized "active" subset (the same latest-`tahun` filter `validateRow` already applies for matching) and render it in a new `Card` placed between the file-drop zone and the upload summary/preview.

**Tech Stack:** Next.js 16 / React / TypeScript. No test runner in this repo — verification is `rtk tsc --noEmit`, `rtk lint`, and a manual check against `npm run dev:local`.

**Context:** This exact wording ("tambah informasi sumbu — no. sumbu, jenis kendaraan, tonasemax") was raised before as QA finding #25 and closed in `docs/superpowers/plans/2026-07-09-fix-armada-sumbu.md` (Task 3) as already-implemented — and it is: the upload preview table already has "No. Sumbu"/"Sumbu"/"Jenis"/"Qty Max" columns (`src/app/armada/upload/page.tsx:565-568`), and the Excel template already includes `sumbu`/`jeniskendaraan`/`TonaseMax` (`EXCEL_COLUMNS`, lines 38-54). Confirmed with the user this time the actual ask is different: a **visible reference card of the master Sumbu table** on the same page, not another column on the already-existing preview/template.

---

## Task 1: Add the Sumbu master reference card to the upload page

**Files:**
- Modify: `src/app/armada/upload/page.tsx`

- [ ] **Step 1: Read the current imports and master-data fetch**

```bash
rtk read src/app/armada/upload/page.tsx 1 20
rtk read src/app/armada/upload/page.tsx 240 283
```

- [ ] **Step 2: Add `useMemo` to the React import**

Change (line 3):
```tsx
import { useState, useRef, useCallback, useEffect } from "react";
```
to:
```tsx
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
```

- [ ] **Step 3: Track a loading flag for the master-data fetch**

Change (lines 241-243):
```tsx
  // Master data for validation
  const [sumbuMaster, setSumbuMaster] = useState<any[]>([]);
  const [tahunPembuatanEnabled, setTahunPembuatanEnabled] = useState(false);
```
to:
```tsx
  // Master data for validation
  const [sumbuMaster, setSumbuMaster] = useState<any[]>([]);
  const [sumbuLoading, setSumbuLoading] = useState(true);
  const [tahunPembuatanEnabled, setTahunPembuatanEnabled] = useState(false);
```

- [ ] **Step 4: Set the flag around the existing fetch**

Change (lines 257-282):
```tsx
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const sumbuRes = await apiTable('/api/Sumbu/DataTable', {
          start: 0,
          length: 10000,
          order: [{ column: 0, dir: "asc" }],
          columns: [{ data: "Id", name: "Id", searchable: "true", orderable: "true", search: { value: "", regex: "false" } }],
        });
        if (Array.isArray(sumbuRes?.data)) setSumbuMaster(sumbuRes.data);

        // Fetch plants config to check tahunpembuatan
        const plantRes = await fetch("/api/admin/plants");
        const plantJson = await plantRes.json();
        if (plantJson.success && Array.isArray(plantJson.data)) {
          const currentPlant = plantJson.data.find((p: any) => p.company_code === activeCompanyCode);
          if (currentPlant) {
            setTahunPembuatanEnabled(!!currentPlant.tahunpembuatan);
          }
        }
      } catch (err) {
        console.error("Failed to load master data", err);
      }
    };
    fetchMasterData();
  }, [activeCompanyCode, apiTable]);
```
to:
```tsx
  useEffect(() => {
    const fetchMasterData = async () => {
      setSumbuLoading(true);
      try {
        const sumbuRes = await apiTable('/api/Sumbu/DataTable', {
          start: 0,
          length: 10000,
          order: [{ column: 0, dir: "asc" }],
          columns: [{ data: "Id", name: "Id", searchable: "true", orderable: "true", search: { value: "", regex: "false" } }],
        });
        if (Array.isArray(sumbuRes?.data)) setSumbuMaster(sumbuRes.data);

        // Fetch plants config to check tahunpembuatan
        const plantRes = await fetch("/api/admin/plants");
        const plantJson = await plantRes.json();
        if (plantJson.success && Array.isArray(plantJson.data)) {
          const currentPlant = plantJson.data.find((p: any) => p.company_code === activeCompanyCode);
          if (currentPlant) {
            setTahunPembuatanEnabled(!!currentPlant.tahunpembuatan);
          }
        }
      } catch (err) {
        console.error("Failed to load master data", err);
      } finally {
        setSumbuLoading(false);
      }
    };
    fetchMasterData();
  }, [activeCompanyCode, apiTable]);
```

- [ ] **Step 5: Derive the active (latest-year) Sumbu list**

Add this right after the `canAccess` line (currently line 287, right before the blank line and `handleFile` callback):
```tsx
  const canAccess = allRoles.some((r) => ALLOWED_ROLES.includes(normalizeRole(r)));

  // Mirrors the latest-`tahun` filter validateRow() uses to match rows against
  // the master table, so this reference list shows exactly what's enforced.
  const latestSumbuYear = useMemo(() => {
    let latest = 0;
    for (const s of sumbuMaster) {
      const ty = parseInt(s.tahun) || 0;
      if (ty > latest) latest = ty;
    }
    return latest;
  }, [sumbuMaster]);

  const activeSumbuList = useMemo(() => {
    if (latestSumbuYear === 0) return [];
    return sumbuMaster
      .filter((s) => (parseInt(s.tahun) || 0) === latestSumbuYear)
      .sort((a, b) => (a.Id ?? a.id ?? 0) - (b.Id ?? b.id ?? 0));
  }, [sumbuMaster, latestSumbuYear]);
```

- [ ] **Step 6: Read the JSX around the upload zone card**

```bash
rtk read src/app/armada/upload/page.tsx 446 494
```

- [ ] **Step 7: Insert the reference card after the upload zone Card, before the Summary block**

Current code ends the upload-zone `Card` and begins the Summary block like this (lines 489-494):
```tsx
        </CardContent>
      </Card>

      {/* Summary */}
      {totalRows > 0 && (
```
Replace with:
```tsx
        </CardContent>
      </Card>

      {/* Sumbu Master Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            Referensi Master Sumbu{latestSumbuYear > 0 ? ` (Tahun ${latestSumbuYear})` : ""}
          </CardTitle>
          <CardDescription>
            Kombinasi No. Sumbu, Jenis Kendaraan, dan Tonase Max yang berlaku untuk validasi upload. Isi kolom &quot;sumbu&quot;, &quot;jeniskendaraan&quot;, dan &quot;TonaseMax&quot; pada file Excel sesuai salah satu baris di bawah ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/50">
                <tr className="border-b">
                  <th className="p-2 text-left font-medium">No. Sumbu</th>
                  <th className="p-2 text-left font-medium">Sumbu</th>
                  <th className="p-2 text-left font-medium">Jenis Kendaraan</th>
                  <th className="p-2 text-right font-medium">Tonase Max</th>
                </tr>
              </thead>
              <tbody>
                {sumbuLoading ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      Memuat referensi sumbu...
                    </td>
                  </tr>
                ) : activeSumbuList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      Data master sumbu belum tersedia.
                    </td>
                  </tr>
                ) : (
                  activeSumbuList.map((s) => (
                    <tr key={s.Id ?? s.id} className="border-b">
                      <td className="p-2 font-mono">{s.Id ?? s.id}</td>
                      <td className="p-2">{s.nama}</td>
                      <td className="p-2">{s.jenistruk}</td>
                      <td className="p-2 text-right">{s.muatan} Ton</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {totalRows > 0 && (
```

- [ ] **Step 8: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors.

- [ ] **Step 9: Manual verify**

Run `npm run dev:local`, log in as a `pod`/`admin`/`superadmin` user, open `/armada/upload`, and confirm:
- A new "Referensi Master Sumbu (Tahun XXXX)" card appears between the drop zone and the Summary/Preview area, showing "Memuat referensi sumbu..." briefly then a table of No. Sumbu / Sumbu / Jenis Kendaraan / Tonase Max rows.
- The rows shown match what `/api/Sumbu/DataTable` actually returns for the latest `tahun` (cross-check a couple of rows against `/superadmin/settings/sumbu`).
- Uploading a file with a sumbu/jenis/tonase combo that IS in this reference list validates as "Valid" in the preview table below; a combo NOT in the list still shows the existing "Kombinasi Sumbu ... tidak terdaftar" error — i.e. the reference card and the actual validation logic stay in sync (they share `latestSumbuYear`/`sumbuMaster`).
- Switching the active plant (top-right plant switcher) re-fetches and the card updates without stale data.

- [ ] **Step 10: Commit**

```bash
rtk git add src/app/armada/upload/page.tsx
rtk git commit -m "feat: show master sumbu reference card on armada upload page"
```

---

## Self-Review Notes

- **Spec coverage:** user's ask ("card mengenai informasi sumbu armada yang ada di table sumbu, di halaman /armada/upload") → Task 1 adds exactly that card, sourced from the `Sumbu` master table already loaded on that page.
- **Placeholder scan:** every step has complete, copy-pasteable code; no TBD/TODO.
- **Type consistency:** `activeSumbuList` items reuse the same shape already used elsewhere in this file (`s.Id ?? s.id`, `s.nama`, `s.jenistruk`, `s.muatan`, `s.tahun`) — matches the fields `validateRow` (lines 152-177) already reads off `sumbuMaster`, so no new/mismatched fields introduced.
- **Why "latest year" filter, not the full master list:** `validateRow` only matches a row against the master table when `tahun === latestYear` — older-year entries in `Sumbu` exist but aren't accepted. Showing the unfiltered list would display combinations that the upload would then reject, confusing the user. The reference card reuses that same filter so it never lies about what's enforced.
