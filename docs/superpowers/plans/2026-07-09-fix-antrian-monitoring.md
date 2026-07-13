# Fix Antrian & Live Monitoring QA Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 QA findings on the queue (antrian) pages: no per-product filter on the "All Plant"/"Horizontal"/manager antrian views (only the standalone `/antrian` page has one), no weighbridge ("Jembatan Timbang") summary card on those same views even though `/antrian/report` already has one, and the live-monitoring page's empty-weighing queue not accounting for plants that don't use weighbridge integration at all.

**Architecture:** Frontend-only changes in `SISTROV2-next`, spread across `src/app/antrian/all-plant/page.tsx`, `src/app/antrian/horizontal/page.tsx`, `src/app/manager/antrian/page.tsx`, and `src/app/antrian/live-monitoring/page.tsx`. No backend changes — the data needed for all three fixes (product per truck, weighbridge section IDs, and the per-company `timbangan` flag) is already returned by existing endpoints; the frontend just wasn't reading/using it.

**Tech Stack:** Next.js 16 / React / TypeScript.

**No test runner exists in this repo.** Verification steps use `rtk tsc --noEmit`, `rtk lint`, and manual checks against `npm run dev:local`.

---

## Task 1: Add a per-product filter to All Plant, Horizontal, and Manager Antrian

QA finding #12: "menu antrian = filter produk adanya cuma semua produk" — only an "all products" option exists, no way to filter by a specific product.

Investigation found `src/app/antrian/page.tsx` (the standalone antrian page) already has a real per-product filter (lines 456-466) fed by `/api/Produk/Data`. Three other pages that show the same kind of truck-queue data have **no** product filter at all: `src/app/antrian/all-plant/page.tsx`, `src/app/antrian/horizontal/page.tsx`, and `src/app/manager/antrian/page.tsx`. All three consume the same `ReportHorizontalQ2` API shape (`{ sections: [{ id, name, type, trucks: [{ produk, ... }] }] }`), so rather than depending on a separate products API (whose ID/name values may not line up with the plain string in `truck.produk`), the simplest correct fix is to derive the filter's options directly from whatever `produk` values are actually present in the already-loaded data, and filter client-side.

**Files:**
- Modify: `src/app/antrian/all-plant/page.tsx`
- Modify: `src/app/antrian/horizontal/page.tsx`
- Modify: `src/app/manager/antrian/page.tsx`

### Part A: `src/app/antrian/all-plant/page.tsx`

- [ ] **Step 1: Add `useMemo` to the React import**

Change:
```tsx
import React, { Suspense, useState, useEffect, useCallback } from "react";
```
to:
```tsx
import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react";
```

- [ ] **Step 2: Add filter state and derived options/sections**

Inside `AntrianAllPlantContent`, after the existing `const [report, setReport] = useState<ReportQ2Response | null>(null);` (around line 131), add:
```tsx
  const [filterProduk, setFilterProduk] = useState("");

  const produkOptions = useMemo(() => {
    if (!report) return [];
    const set = new Set<string>();
    report.sections.forEach((s) => s.trucks.forEach((t) => { if (t.produk) set.add(t.produk); }));
    return Array.from(set).sort();
  }, [report]);

  const filteredSections = useMemo(() => {
    if (!report) return [];
    if (!filterProduk) return report.sections;
    return report.sections.map((s) => ({ ...s, trucks: s.trucks.filter((t) => t.produk === filterProduk) }));
  }, [report, filterProduk]);
```

- [ ] **Step 3: Add the filter `<select>` next to the plant picker**

Current code (lines 175-189):
```tsx
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
        <label className="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Pilih Plant:</label>
        <div className="flex-1 max-w-xs">
          <SearchableSelect
            options={companies.map(c => ({ value: c.company_code, label: c.company }))}
            value={selectedCompany}
            onChange={(val) => handleCompanyChange(val)}
            placeholder="-- Pilih Perusahaan --"
            searchPlaceholder="Cari perusahaan..."
          />
        </div>
        {report && (
          <span className="text-xs text-gray-400">Data: {report.date}</span>
        )}
      </div>
```

Replace with:
```tsx
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 flex-wrap">
        <label className="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Pilih Plant:</label>
        <div className="flex-1 max-w-xs">
          <SearchableSelect
            options={companies.map(c => ({ value: c.company_code, label: c.company }))}
            value={selectedCompany}
            onChange={(val) => handleCompanyChange(val)}
            placeholder="-- Pilih Perusahaan --"
            searchPlaceholder="Cari perusahaan..."
          />
        </div>
        {report && produkOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300">Produk:</label>
            <select
              className="h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm px-2 text-gray-700 dark:text-gray-200"
              value={filterProduk}
              onChange={(e) => setFilterProduk(e.target.value)}
            >
              <option value="">Semua Produk</option>
              {produkOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
        {report && (
          <span className="text-xs text-gray-400">Data: {report.date}</span>
        )}
      </div>
```

- [ ] **Step 4: Render the filtered sections instead of the raw ones**

Change (around line 206-208):
```tsx
          {report.sections.map((sec, i) => (
            <SectionAccordion key={sec.id} section={sec} defaultOpen={i < 3} />
          ))}
```
to:
```tsx
          {filteredSections.map((sec, i) => (
            <SectionAccordion key={sec.id} section={sec} defaultOpen={i < 3} />
          ))}
```

### Part B: `src/app/manager/antrian/page.tsx`

- [ ] **Step 5: Add `useMemo` to the React import**

Change:
```tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
```
to:
```tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
```

- [ ] **Step 6: Add filter state and derived options/sections**

After `const [report, setReport] = useState<ReportQ2Response | null>(null);` (around line 126), add the same block as Step 2:
```tsx
  const [filterProduk, setFilterProduk] = useState("");

  const produkOptions = useMemo(() => {
    if (!report) return [];
    const set = new Set<string>();
    report.sections.forEach((s) => s.trucks.forEach((t) => { if (t.produk) set.add(t.produk); }));
    return Array.from(set).sort();
  }, [report]);

  const filteredSections = useMemo(() => {
    if (!report) return [];
    if (!filterProduk) return report.sections;
    return report.sections.map((s) => ({ ...s, trucks: s.trucks.filter((t) => t.produk === filterProduk) }));
  }, [report, filterProduk]);
```

- [ ] **Step 7: Add the filter `<select>` to the header row**

Current code (lines 176-189):
```tsx
        <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-gray-400">
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {lastUpdate && <span>Update: {lastUpdate}</span>}
          {report && <span className="text-muted-foreground/60 dark:text-gray-500">{report.date}</span>}
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-1.5 rounded hover:bg-muted dark:hover:bg-gray-800 transition-colors disabled:opacity-50 text-gray-700 dark:text-gray-250 cursor-pointer"
            title="Refresh manual"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
```

Replace with:
```tsx
        <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-gray-400">
          {produkOptions.length > 0 && (
            <select
              className="h-8 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs px-2 text-gray-700 dark:text-gray-200"
              value={filterProduk}
              onChange={(e) => setFilterProduk(e.target.value)}
            >
              <option value="">Semua Produk</option>
              {produkOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {lastUpdate && <span>Update: {lastUpdate}</span>}
          {report && <span className="text-muted-foreground/60 dark:text-gray-500">{report.date}</span>}
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-1.5 rounded hover:bg-muted dark:hover:bg-gray-800 transition-colors disabled:opacity-50 text-gray-700 dark:text-gray-250 cursor-pointer"
            title="Refresh manual"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
```

- [ ] **Step 8: Render the filtered sections instead of the raw ones**

Change (lines 208-210):
```tsx
          {report.sections.map((sec, i) => (
            <SectionAccordion key={sec.id} section={sec} defaultOpen={i < 3} />
          ))}
```
to:
```tsx
          {filteredSections.map((sec, i) => (
            <SectionAccordion key={sec.id} section={sec} defaultOpen={i < 3} />
          ))}
```

### Part C: `src/app/antrian/horizontal/page.tsx`

- [ ] **Step 9: Add `useMemo` to the React import**

Change:
```tsx
import React, { useState, useCallback, useEffect } from "react";
```
to:
```tsx
import React, { useState, useCallback, useEffect, useMemo } from "react";
```

- [ ] **Step 10: Add filter state and derived options/sections**

After `const [sections, setSections] = useState<Section[]>([]);` (around line 164), add:
```tsx
  const [filterProduk, setFilterProduk] = useState("");

  const produkOptions = useMemo(() => {
    const set = new Set<string>();
    sections.forEach((s) => s.trucks.forEach((t) => { if (t.produk) set.add(t.produk); }));
    return Array.from(set).sort();
  }, [sections]);

  const filteredSections = useMemo(() => {
    if (!filterProduk) return sections;
    return sections.map((s) => ({ ...s, trucks: s.trucks.filter((t) => t.produk === filterProduk) }));
  }, [sections, filterProduk]);
```

- [ ] **Step 11: Add the filter `<select>` next to the company picker**

Current code (lines 221-245):
```tsx
        <div className="flex items-center gap-2">
          {showCompanyPicker && (
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] font-bold px-3 text-slate-700 dark:text-slate-200"
            >
              {companies.map((c) => (
                <option key={c.company_code} value={c.company_code}>
                  {c.company_code} — {c.company}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-10 bg-white border-2 font-bold uppercase text-[10px] tracking-widest"
            onClick={fetchData}
            disabled={isLoading || !selectedCompany}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
```

Replace with:
```tsx
        <div className="flex items-center gap-2">
          {showCompanyPicker && (
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] font-bold px-3 text-slate-700 dark:text-slate-200"
            >
              {companies.map((c) => (
                <option key={c.company_code} value={c.company_code}>
                  {c.company_code} — {c.company}
                </option>
              ))}
            </select>
          )}
          {produkOptions.length > 0 && (
            <select
              value={filterProduk}
              onChange={(e) => setFilterProduk(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] font-bold px-3 text-slate-700 dark:text-slate-200"
            >
              <option value="">Semua Produk</option>
              {produkOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-10 bg-white border-2 font-bold uppercase text-[10px] tracking-widest"
            onClick={fetchData}
            disabled={isLoading || !selectedCompany}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
```

- [ ] **Step 12: Render the filtered sections instead of the raw ones**

Change (lines 268-274):
```tsx
      {!isLoading && sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section) => (
            <SectionAccordion key={section.id} section={section} />
          ))}
        </div>
      )}
```
to:
```tsx
      {!isLoading && sections.length > 0 && (
        <div className="space-y-3">
          {filteredSections.map((section) => (
            <SectionAccordion key={section.id} section={section} />
          ))}
        </div>
      )}
```

- [ ] **Step 13: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 14: Manual verify**

Open `/antrian/all-plant`, `/manager/antrian`, and `/antrian/horizontal` (as roles that can access each), confirm a "Produk" filter now appears once data loads, populated with the actual products present in that plant's current queue (not a hardcoded list), and confirm selecting one filters the truck cards shown in every section while "Semua Produk" restores the full list.

- [ ] **Step 15: Commit**

```bash
rtk git add src/app/antrian/all-plant/page.tsx src/app/manager/antrian/page.tsx src/app/antrian/horizontal/page.tsx
rtk git commit -m "feat: add per-product filter to All Plant, Horizontal, and Manager Antrian views"
```

---

## Task 2: Add the "Info Jembatan Timbang" card to All Plant and Manager Antrian

QA finding #13: "card info jembatan timbang gaada, padahal di antrian report ada" (the weighbridge info card is missing, even though the Antrian Report page has one).

Investigation found `src/app/antrian/report/page.tsx` already highlights weighbridge-related sections using:
```tsx
const MIDDLE_IDS = new Set(["timbangan_in", "timbangan_isi"]);
```
and renders them in a dedicated "Jembatan Timbangan" column via `partitionSections()`/`ColumnSection`. `src/app/antrian/all-plant/page.tsx` and `src/app/manager/antrian/page.tsx` receive the exact same `ReportHorizontalQ2` response (same section `id`s), but render every section identically in one flat accordion list with no highlighting. Rather than reworking these two pages into `report/page.tsx`'s full multi-column layout (a much larger change, and QA specifically asked for a "card", not a redesign), add a compact summary card above the section list showing the weighbridge sections' truck counts.

**Files:**
- Modify: `src/app/antrian/all-plant/page.tsx`
- Modify: `src/app/manager/antrian/page.tsx`

### Part A: `src/app/antrian/all-plant/page.tsx`

- [ ] **Step 1: Add the `Warehouse` icon import**

This file currently has no `lucide-react` import at all. Add, near the top:
```tsx
import { Warehouse } from "lucide-react";
```

- [ ] **Step 2: Add the `MIDDLE_IDS` constant and derive weighbridge sections**

Near the top of the file, after the `interface ReportQ2Response { ... }` block, add:
```tsx
const MIDDLE_IDS = new Set(["timbangan_in", "timbangan_isi"]);
```

Inside `AntrianAllPlantContent`, alongside the `filteredSections` memo added in Task 1 Step 2, add:
```tsx
  const weighbridgeSections = useMemo(
    () => filteredSections.filter((s) => MIDDLE_IDS.has(s.id)),
    [filteredSections]
  );
```

- [ ] **Step 3: Render the card above the section list**

Insert this block right before the `{filteredSections.map(...)}` line (inside the `{report && !loading && (...)}` block, after the `<h2>{report.company}</h2>` line):
```tsx
          {weighbridgeSections.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Warehouse className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-sm text-amber-800 dark:text-amber-300">Info Jembatan Timbang</span>
                <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {weighbridgeSections.reduce((acc, s) => acc + s.trucks.length, 0)} truk
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-amber-700 dark:text-amber-400">
                {weighbridgeSections.map((s) => (
                  <span key={s.id}>{s.name}: <strong>{s.trucks.length}</strong> truk</span>
                ))}
              </div>
            </div>
          )}
```

### Part B: `src/app/manager/antrian/page.tsx`

- [ ] **Step 4: Add the `Warehouse` icon import**

Change:
```tsx
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
```
to:
```tsx
import { BarChart3, Loader2, RefreshCw, Warehouse } from "lucide-react";
```

- [ ] **Step 5: Add the `MIDDLE_IDS` constant and derive weighbridge sections**

Near the top of the file, after the `interface ReportQ2Response { ... }` block, add:
```tsx
const MIDDLE_IDS = new Set(["timbangan_in", "timbangan_isi"]);
```

Inside `ManagerAntrianPage`, alongside the `filteredSections` memo added in Task 1 Step 6, add:
```tsx
  const weighbridgeSections = useMemo(
    () => filteredSections.filter((s) => MIDDLE_IDS.has(s.id)),
    [filteredSections]
  );
```

- [ ] **Step 6: Render the card above the section list**

Current code (lines 206-215):
```tsx
      {/* Sections */}
      {report && (
        <div>
          {filteredSections.map((sec, i) => (
            <SectionAccordion key={sec.id} section={sec} defaultOpen={i < 3} />
          ))}
          {report.sections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground dark:text-gray-450">Tidak ada data antrian</div>
          )}
        </div>
      )}
```
Replace with:
```tsx
      {/* Sections */}
      {report && (
        <div>
          {weighbridgeSections.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Warehouse className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-sm text-amber-800 dark:text-amber-300">Info Jembatan Timbang</span>
                <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {weighbridgeSections.reduce((acc, s) => acc + s.trucks.length, 0)} truk
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-amber-700 dark:text-amber-400">
                {weighbridgeSections.map((s) => (
                  <span key={s.id}>{s.name}: <strong>{s.trucks.length}</strong> truk</span>
                ))}
              </div>
            </div>
          )}
          {filteredSections.map((sec, i) => (
            <SectionAccordion key={sec.id} section={sec} defaultOpen={i < 3} />
          ))}
          {report.sections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground dark:text-gray-450">Tidak ada data antrian</div>
          )}
        </div>
      )}
```

- [ ] **Step 7: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 8: Manual verify**

Open `/antrian/all-plant` and `/manager/antrian` for a plant that has trucks in a weighbridge-related section (`timbangan_in`/`timbangan_isi`), confirm the amber "Info Jembatan Timbang" card appears above the section list with a correct total truck count. For a plant with no trucks in those sections, confirm the card doesn't render (no empty card clutter).

- [ ] **Step 9: Commit**

```bash
rtk git add src/app/antrian/all-plant/page.tsx src/app/manager/antrian/page.tsx
rtk git commit -m "feat: add Info Jembatan Timbang card to All Plant and Manager Antrian views"
```

---

## Task 3: Handle plants with no weighbridge integration on Live Monitor Pintu Pemuatan

QA finding #14: "truk antre di antrian timbang kosong, kalo misalkan gudangnya gaada timbang gimana?" (trucks queue at the empty-weighing station — what happens if the plant doesn't have a weighbridge?).

Investigation found `src/app/antrian/live-monitoring/page.tsx` always renders an "Antrian Timbang Kosong" section (position `"02"`, fetched at lines 152-154) regardless of whether the selected plant uses weighbridge integration at all. The system already has exactly this concept as a per-company flag: `Company.timbangan` (`bool`, confirmed in `sistropigroup/SISTROAWESOME/BDO` and already surfaced to the frontend as `Plant.timbangan` on `src/app/superadmin/settings/plants/page.tsx:22`, and already included in the JSON returned by `/api/Company/getCompanyListFitur` — the same endpoint `live-monitoring/page.tsx` already calls to populate its company dropdown (lines 103-119), it just isn't reading the `timbangan` field from the response). The ASP.NET backend (`TiketController.cs`, multiple spots, e.g. lines 451-455) already uses this same flag to skip weighing-related positions for companies that don't have `timbangan` enabled. Fix: read `timbangan` from the already-fetched company list and use it to replace the empty-queue section with an explanatory message instead of an always-empty list.

**Files:**
- Modify: `src/app/antrian/live-monitoring/page.tsx`

- [ ] **Step 1: Extend the `companies` state to carry `timbangan`**

Current code (lines 85-91):
```tsx
  const [companies, setCompanies] = useState<{ company_code: string; company: string }[]>([
    { company_code: "PKG", company: "Petrokimia Gresik" },
    { company_code: "PKC", company: "Pupuk Kujang" },
    { company_code: "PIM", company: "Pupuk Iskandar Muda" },
    { company_code: "PI", company: "Pupuk Indonesia (Semua Plant)" },
    { company_code: "LOG4MENENG", company: "Logistics Meneng" },
  ]);
```
Replace with:
```tsx
  const [companies, setCompanies] = useState<{ company_code: string; company: string; timbangan?: boolean }[]>([
    { company_code: "PKG", company: "Petrokimia Gresik", timbangan: true },
    { company_code: "PKC", company: "Pupuk Kujang", timbangan: true },
    { company_code: "PIM", company: "Pupuk Iskandar Muda", timbangan: true },
    { company_code: "PI", company: "Pupuk Indonesia (Semua Plant)", timbangan: true },
    { company_code: "LOG4MENENG", company: "Logistics Meneng", timbangan: true },
  ]);
```
(the hardcoded fallback list defaults `timbangan: true` — preserving today's always-shown behavior for these plants until the real API response loads and overrides it)

- [ ] **Step 2: Read `timbangan` from the API response**

Current code (lines 101-120):
```tsx
  // Fetch company list from API
  useEffect(() => {
    if (!token) return;
    apiJson<any[]>("/api/Company/getCompanyListFitur")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((c: any) => ({
            company_code: c.company_code,
            company: c.company || c.company_code,
          }));
          if (!formatted.some(m => m.company_code === "LOG4MENENG")) {
            formatted.push({ company_code: "LOG4MENENG", company: "Logistics Meneng" });
          }
          if (!formatted.some(m => m.company_code === "PI")) {
            formatted.push({ company_code: "PI", company: "Pupuk Indonesia (Semua Plant)" });
          }
          setCompanies(formatted);
        }
      })
      .catch((err) => console.error("[live-monitoring] company list fetch error:", err));
  }, [apiJson, token]);
```
Replace with:
```tsx
  // Fetch company list from API
  useEffect(() => {
    if (!token) return;
    apiJson<any[]>("/api/Company/getCompanyListFitur")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((c: any) => ({
            company_code: c.company_code,
            company: c.company || c.company_code,
            timbangan: c.timbangan !== false,
          }));
          if (!formatted.some(m => m.company_code === "LOG4MENENG")) {
            formatted.push({ company_code: "LOG4MENENG", company: "Logistics Meneng", timbangan: true });
          }
          if (!formatted.some(m => m.company_code === "PI")) {
            formatted.push({ company_code: "PI", company: "Pupuk Indonesia (Semua Plant)", timbangan: true });
          }
          setCompanies(formatted);
        }
      })
      .catch((err) => console.error("[live-monitoring] company list fetch error:", err));
  }, [apiJson, token]);
```

- [ ] **Step 3: Derive whether the selected company has weighbridge integration**

Near the other derived values (after the `companies` state, before the render `return`), add:
```tsx
  const selectedCompanyTimbangan = companies.find((c) => c.company_code === selectedCompany)?.timbangan ?? true;
```

- [ ] **Step 4: Update the queue-strip render to branch on it**

Current code (lines 424-451):
```tsx
          {/* Queue strip */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3.5 flex items-center gap-1.5">
              <Warehouse className="h-4 w-4 text-amber-500" />
              Antrian Timbang Kosong (Menunggu Masuk Gudang)
            </h4>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {realQueue.length === 0 ? (
                <div className="text-xs text-gray-400 py-3">Tidak ada truk menunggu di antrean.</div>
              ) : realQueue.map((q, idx) => (
                <div key={idx} className="bg-gray-50/60 dark:bg-white/[0.01] border border-gray-150 dark:border-gray-800 p-3 rounded-xl min-w-[200px] flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-brand-50/50 dark:bg-brand-950/20 text-brand-500 rounded-lg text-xs font-black">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-800 dark:text-white block">{q.nopol}</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{q.driver} • {q.produkString}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col gap-0.5 items-end">
                    <span className="text-[9px] font-mono font-bold text-gray-600 dark:text-gray-300">{q.bookingno}</span>
                    <span className="text-[9px] text-gray-400 font-mono">{q.posto}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
```
Replace with:
```tsx
          {/* Queue strip */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3.5 flex items-center gap-1.5">
              <Warehouse className="h-4 w-4 text-amber-500" />
              Antrian Timbang Kosong (Menunggu Masuk Gudang)
            </h4>
            {!selectedCompanyTimbangan ? (
              <div className="text-xs text-gray-400 py-3 italic">
                Plant ini tidak menggunakan integrasi timbangan — truk langsung menuju gudang tanpa melalui tahap penimbangan.
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {realQueue.length === 0 ? (
                  <div className="text-xs text-gray-400 py-3">Tidak ada truk menunggu di antrean.</div>
                ) : realQueue.map((q, idx) => (
                  <div key={idx} className="bg-gray-50/60 dark:bg-white/[0.01] border border-gray-150 dark:border-gray-800 p-3 rounded-xl min-w-[200px] flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-brand-50/50 dark:bg-brand-950/20 text-brand-500 rounded-lg text-xs font-black">
                        #{idx + 1}
                      </div>
                      <div>
                        <span className="text-xs font-black text-gray-800 dark:text-white block">{q.nopol}</span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">{q.driver} • {q.produkString}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col gap-0.5 items-end">
                      <span className="text-[9px] font-mono font-bold text-gray-600 dark:text-gray-300">{q.bookingno}</span>
                      <span className="text-[9px] text-gray-400 font-mono">{q.posto}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
```

- [ ] **Step 5: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 6: Manual verify**

Open `/antrian/live-monitoring`. Select a plant known to have `timbangan = true` (e.g. via `/superadmin/settings/plants`, check the "Timbangan (Integrasi)" toggle for that plant) and confirm the queue strip behaves as before. Then select (or temporarily toggle off `timbangan` for) a plant with `timbangan = false` and confirm the queue strip now shows the explanatory message instead of an empty list.

- [ ] **Step 7: Commit**

```bash
rtk git add src/app/antrian/live-monitoring/page.tsx
rtk git commit -m "fix: explain empty weighing queue for plants without weighbridge integration"
```

---

## Self-Review Notes

- Coverage: Task 1 → #12, Task 2 → #13, Task 3 → #14. All 3 items in this cluster covered.
- Task 1 and Task 2 both modify `src/app/antrian/all-plant/page.tsx` and `src/app/manager/antrian/page.tsx` — execute Task 1 before Task 2 in each file (Task 2's `weighbridgeSections` memo depends on Task 1's `filteredSections` memo existing first), or have the same subagent do both tasks back-to-back for those two files.
- Task 3 is fully independent (different file) and can run in parallel with Tasks 1/2.
