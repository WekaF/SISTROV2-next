# Antrian Horizontal & Report — Generic Plant Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two missing antrian visualization pages that work for ANY SISTRO plant (except PKT and PSP which use external APIs). Company is derived from the user's session (`activeCompanyCode`) with a local dropdown for Viewer role.

**Architecture:** Both pages consume `GET /aspnet-proxy/api/Antrian/ReportHorizontalQ2?company=<code>` (already in backend). Company code comes from `useCompany().activeCompanyCode` by default. Viewer role gets a local company picker (uses `companies` list, local state — does NOT call `switchCompany`). Two layouts share the same data:
- **Horizontal**: accordion sections + horizontal-scrolling truck cards
- **Report**: 3-column vertical (Shift+Security | Timbangan | Gudang)

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS, `useApi` hook, `useCompany` context, Lucide icons, shadcn Button/Select.

---

## Background

### Why PKT/PSP are different
- `report-pkt` calls `/api/Antrian/ReportPKT` → external PKT API (Tursina Barat)
- `report-psp` calls `/api/Antrian/ReportPSP` → external PSP API
- All other plants → internal SISTRO DB → `ReportHorizontalQ2?company=<code>`

### API: `GET /aspnet-proxy/api/Antrian/ReportHorizontalQ2?company=<code>`

Response shape:
```json
{
  "Success": true,
  "company": "Petrokimia Gresik",
  "company_code": "PKG",
  "date": "2026-07-01",
  "sections": [
    {
      "id": "shift_A",
      "name": "Shift A (07:00 - 15:00)",
      "type": "shift",
      "trucks": [
        {
          "nopol": "B 1234 CD",
          "driver": "Ahmad",
          "bookingno": "BK0001",
          "produk": "Urea",
          "posto": "P01",
          "kabupatenTujuan": "Surabaya",
          "gudangTujuan": "G01-Gudang Utama",
          "tonase": "25",
          "color": "crimson"
        }
      ]
    },
    { "id": "security_in",   "name": "Security In",               "type": "position", "trucks": [] },
    { "id": "security_out",  "name": "OTW Security Out",          "type": "position", "trucks": [] },
    { "id": "timbangan_in",  "name": "Jembatan Timbangan In",     "type": "position", "trucks": [] },
    { "id": "timbangan_isi", "name": "OTW Jembatan Timbang Isi",  "type": "position", "trucks": [] },
    { "id": "gudang_G001",   "name": "Gudang Urea",               "type": "gudang",   "trucks": [] }
  ]
}
```

### Report column partitioning (from `Antrian/Report` backend logic)
- **Left**: `type === "shift"` + `id` in `{ security_in, security_out }`
- **Middle**: `id` in `{ timbangan_in, timbangan_isi }`
- **Right**: `type === "gudang"`

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/app/antrian/horizontal/page.tsx` | Horizontal view — accordion + horizontal scroll |
| Create | `src/app/antrian/report/page.tsx` | Report view — 3-column vertical layout |
| Modify | `src/lib/menu-catalog.ts` | Add 2 paths to Gudang category |
| Modify | `src/lib/menu-configs.tsx` | Add 2 entries to viewer + relevant roles |

---

## Tasks

---

### Task 1: Create `/antrian/horizontal/page.tsx`

**Files:**
- Create: `src/app/antrian/horizontal/page.tsx`

Accordion sections, each collapsible, with a horizontal-scrolling row of truck cards. Color badge counts top-right of each section header. Company from `useCompany().activeCompanyCode`; Viewer sees a company picker (local state).

- [ ] **Step 1: Write the page**

```tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { RefreshCw, Truck, ChevronDown, ChevronUp } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";

interface TruckCardData {
  nopol: string;
  driver: string;
  bookingno: string;
  produk: string;
  posto: string;
  kabupatenTujuan: string;
  gudangTujuan: string;
  tonase: string;
  color: string;
}

interface Section {
  id: string;
  name: string;
  type: "shift" | "position" | "gudang";
  trucks: TruckCardData[];
}

interface ApiResponse {
  Success: boolean;
  company: string;
  company_code: string;
  date: string;
  sections: Section[];
}

const COLOR_HEX: Record<string, string> = {
  crimson: "#DC143C",
  gold: "#FFD700",
  darkcyan: "#008B8B",
  royalblue: "#4169E1",
  gray: "#9CA3AF",
};
const COLOR_ORDER = ["royalblue", "darkcyan", "gold", "crimson"] as const;

function colorCounts(trucks: TruckCardData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of trucks) {
    if (t.color && t.color !== "gray") counts[t.color] = (counts[t.color] ?? 0) + 1;
  }
  return counts;
}

function TruckCardH({ truck }: { truck: TruckCardData }) {
  const bg = COLOR_HEX[truck.color] ?? COLOR_HEX.gray;
  return (
    <div
      className="flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
      style={{ width: 160, borderTopWidth: 4, borderTopColor: bg, borderTopStyle: "solid" }}
    >
      <div className="p-3 space-y-2">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ backgroundColor: bg, width: 40, height: 40 }}
        >
          <Truck className="h-4 w-4 text-white" />
        </div>
        <p className="text-[12px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 truncate">
          {truck.nopol}
        </p>
        <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{truck.driver}</p>
        <div className="rounded-lg p-2 space-y-0.5" style={{ backgroundColor: bg + "18" }}>
          {(
            [
              ["Booking", truck.bookingno],
              ["Produk", truck.produk],
              ["POSTO", truck.posto],
              ["Kab. Tujuan", truck.kabupatenTujuan],
              ["Gudang", truck.gudangTujuan],
              ["Tonase", truck.tonase],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                {label}
              </span>
              <span className="text-[9px] font-bold break-words leading-tight" style={{ color: bg }}>
                {value || "-"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionAccordion({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);
  const counts = colorCounts(section.trucks);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            {section.name}
          </span>
          <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full">
            {section.trucks.length} truk
          </span>
        </div>
        <div className="flex items-center gap-2">
          {COLOR_ORDER.map((c) =>
            counts[c] ? (
              <span
                key={c}
                className="text-[9px] font-black px-2 py-0.5 rounded text-white"
                style={{ backgroundColor: COLOR_HEX[c] }}
              >
                {counts[c]} Truk
              </span>
            ) : null
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 overflow-x-auto">
          {section.trucks.length === 0 ? (
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-6">
              Tidak ada antrian
            </p>
          ) : (
            <div className="flex gap-3 pb-1" style={{ minWidth: "max-content" }}>
              {section.trucks.map((t, i) => (
                <TruckCardH key={`${t.nopol}-${i}`} truck={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AntrianHorizontalPage() {
  const { apiJson } = useApi();
  const { activeCompanyCode, companies } = useCompany();

  // Local company selector — does NOT call switchCompany (read-only view)
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  // Sync default when context resolves
  useEffect(() => {
    if (!selectedCompany && activeCompanyCode) setSelectedCompany(activeCompanyCode);
  }, [activeCompanyCode, selectedCompany]);

  const [sections, setSections] = useState<Section[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiJson<ApiResponse>(
        `/api/Antrian/ReportHorizontalQ2?company=${encodeURIComponent(selectedCompany)}`
      );
      if (res?.Success) {
        setSections(res.sections ?? []);
        setCompanyName(res.company ?? selectedCompany);
        setDate(res.date ?? "");
      } else {
        setError("Server mengembalikan respons tidak berhasil.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Gagal mengambil data.");
    } finally {
      setIsLoading(false);
    }
  }, [apiJson, selectedCompany]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [fetchData, selectedCompany]);

  const totalTrucks = sections.reduce((acc, s) => acc + s.trucks.length, 0);
  const showCompanyPicker = companies.length > 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Antrian Horizontal
            {companyName && (
              <span className="ml-2 text-slate-400 font-medium normal-case text-xl">
                — {companyName}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Dashboard antrian truk gudang.
            {date && <span className="ml-2 text-slate-400">Tanggal: {date}</span>}
            {totalTrucks > 0 && (
              <span className="ml-3 text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                {totalTrucks} truk aktif
              </span>
            )}
          </p>
        </div>
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
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-16" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sections.length === 0 && !error && (
        <div className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest py-16 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          Belum ada data antrian.
        </div>
      )}

      {/* Sections */}
      {!isLoading && sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section) => (
            <SectionAccordion key={section.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
rtk tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to this file.

- [ ] **Step 3: Commit**

```bash
rtk git add src/app/antrian/horizontal/page.tsx
rtk git commit -m "feat: add antrian horizontal page (generic plant, dynamic company)"
```

---

### Task 2: Create `/antrian/report/page.tsx`

**Files:**
- Create: `src/app/antrian/report/page.tsx`

3-column layout. Same API + same company-picker pattern as Task 1. Sections partitioned:
- Left column: `type === "shift"` or `id` in `{ security_in, security_out }`
- Middle column: `id` in `{ timbangan_in, timbangan_isi }`
- Right column: `type === "gudang"`

- [ ] **Step 1: Write the page**

```tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { RefreshCw, Truck } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";

interface TruckCardData {
  nopol: string;
  driver: string;
  bookingno: string;
  produk: string;
  posto: string;
  kabupatenTujuan: string;
  gudangTujuan: string;
  tonase: string;
  color: string;
}

interface Section {
  id: string;
  name: string;
  type: "shift" | "position" | "gudang";
  trucks: TruckCardData[];
}

interface ApiResponse {
  Success: boolean;
  company: string;
  company_code: string;
  date: string;
  sections: Section[];
}

const COLOR_HEX: Record<string, string> = {
  crimson: "#DC143C",
  gold: "#FFD700",
  darkcyan: "#008B8B",
  royalblue: "#4169E1",
  gray: "#9CA3AF",
};

function TruckCardV({ truck }: { truck: TruckCardData }) {
  const bg = COLOR_HEX[truck.color] ?? COLOR_HEX.gray;
  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mb-2 overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: bg, borderLeftStyle: "solid" }}
    >
      <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: bg, width: 32, height: 32 }}
        >
          <Truck className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 truncate">
            {truck.nopol}
          </p>
          <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{truck.driver}</p>
        </div>
      </div>
      <div className="px-3 py-2 space-y-0.5">
        {(
          [
            ["Booking", truck.bookingno],
            ["Produk", truck.produk],
            ["POSTO", truck.posto],
            ["Kab. Tujuan", truck.kabupatenTujuan],
            ["Gudang", truck.gudangTujuan],
            ["Tonase", truck.tonase],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex-shrink-0">
              {label}
            </span>
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 text-right leading-tight max-w-[140px] break-words">
              {value || "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColumnSection({ section }: { section: Section }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
          {section.name}
        </span>
        <span className="text-[10px] font-black text-slate-500 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full">
          {section.trucks.length}
        </span>
      </div>
      {section.trucks.length === 0 ? (
        <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest py-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
          Tidak ada antrian
        </p>
      ) : (
        section.trucks.map((t, i) => <TruckCardV key={`${t.nopol}-${i}`} truck={t} />)
      )}
    </div>
  );
}

const LEFT_IDS = new Set(["security_in", "security_out"]);
const MIDDLE_IDS = new Set(["timbangan_in", "timbangan_isi"]);

function partitionSections(sections: Section[]) {
  const left: Section[] = [];
  const middle: Section[] = [];
  const right: Section[] = [];
  for (const s of sections) {
    if (s.type === "shift" || LEFT_IDS.has(s.id)) left.push(s);
    else if (MIDDLE_IDS.has(s.id)) middle.push(s);
    else if (s.type === "gudang") right.push(s);
  }
  return { left, middle, right };
}

export default function AntrianReportPage() {
  const { apiJson } = useApi();
  const { activeCompanyCode, companies } = useCompany();
  const [selectedCompany, setSelectedCompany] = useState("");

  useEffect(() => {
    if (!selectedCompany && activeCompanyCode) setSelectedCompany(activeCompanyCode);
  }, [activeCompanyCode, selectedCompany]);

  const [sections, setSections] = useState<Section[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiJson<ApiResponse>(
        `/api/Antrian/ReportHorizontalQ2?company=${encodeURIComponent(selectedCompany)}`
      );
      if (res?.Success) {
        setSections(res.sections ?? []);
        setCompanyName(res.company ?? selectedCompany);
        setDate(res.date ?? "");
      } else {
        setError("Server mengembalikan respons tidak berhasil.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Gagal mengambil data.");
    } finally {
      setIsLoading(false);
    }
  }, [apiJson, selectedCompany]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [fetchData, selectedCompany]);

  const { left, middle, right } = partitionSections(sections);
  const totalTrucks = sections.reduce((acc, s) => acc + s.trucks.length, 0);
  const showCompanyPicker = companies.length > 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Report Antrian
            {companyName && (
              <span className="ml-2 text-slate-400 font-medium normal-case text-xl">
                — {companyName}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Dashboard antrian truk gudang.
            {date && <span className="ml-2 text-slate-400">Tanggal: {date}</span>}
            {totalTrucks > 0 && (
              <span className="ml-3 text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                {totalTrucks} truk aktif
              </span>
            )}
          </p>
        </div>
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
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-64" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sections.length === 0 && !error && (
        <div className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest py-16 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          Belum ada data antrian.
        </div>
      )}

      {/* 3-column layout */}
      {!isLoading && sections.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-4" style={{ minWidth: 900 }}>
            {/* Left: Shift + Security */}
            <div className="flex-1 min-w-[280px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                Shift & Security
              </h2>
              {left.map((s) => (
                <ColumnSection key={s.id} section={s} />
              ))}
            </div>

            {/* Middle: Timbangan */}
            <div className="flex-1 min-w-[280px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                Jembatan Timbangan
              </h2>
              {middle.map((s) => (
                <ColumnSection key={s.id} section={s} />
              ))}
            </div>

            {/* Right: Gudang */}
            <div className="flex-1 min-w-[280px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                Gudang
              </h2>
              {right.map((s) => (
                <ColumnSection key={s.id} section={s} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
rtk tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/app/antrian/report/page.tsx
rtk git commit -m "feat: add antrian report page (3-column layout, generic plant)"
```

---

### Task 3: Update `menu-catalog.ts`

**Files:**
- Modify: `src/lib/menu-catalog.ts`

Add 2 new paths to the `Gudang` category.

- [ ] **Step 1: Open file, find Gudang category**

Current state (around line 40):
```ts
{ path: "/antrian/report-psp", label: "Antrian PSP" },
{ path: "/antrian/report-pkt", label: "Antrian PKT" },
```

- [ ] **Step 2: Add after the PKT line**

```ts
{ path: "/antrian/horizontal", label: "Antrian Horizontal" },
{ path: "/antrian/report", label: "Antrian Report" },
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/lib/menu-catalog.ts
rtk git commit -m "feat: add antrian horizontal and report paths to menu catalog"
```

---

### Task 4: Update `menu-configs.tsx` — add to relevant roles

**Files:**
- Modify: `src/lib/menu-configs.tsx`

Add to `viewer` Antrian subItems. Also add to roles that use the internal antrian: `superadmin`, `admin`, `candal`, `gudang`, `pod`.

- [ ] **Step 1: Find viewer Antrian subItems (around line 443)**

Current:
```tsx
{ name: "Antrian All Plant", path: "/antrian/all-plant" },
{ name: "Antrian PSP",       path: "/antrian/report-psp" },
{ name: "Antrian PKT",       path: "/antrian/report-pkt" },
```

After:
```tsx
{ name: "Antrian All Plant",   path: "/antrian/all-plant" },
{ name: "Antrian PSP",         path: "/antrian/report-psp" },
{ name: "Antrian PKT",         path: "/antrian/report-pkt" },
{ name: "Antrian Horizontal",  path: "/antrian/horizontal" },
{ name: "Antrian Report",      path: "/antrian/report" },
```

- [ ] **Step 2: Find superadmin Gudang subItems (around line 177)**

Current Gudang subItems for superadmin:
```tsx
{ name: "Antrian", path: "/antrian" },
{ name: "List Gudang", path: "/gudang" },
// ...
```

Add after `{ name: "Antrian", path: "/antrian" }`:
```tsx
{ name: "Antrian Horizontal", path: "/antrian/horizontal" },
{ name: "Antrian Report",     path: "/antrian/report" },
```

- [ ] **Step 3: Repeat for `admin` role Gudang subItems (around line 281)**

Same two entries after `{ name: "Antrian", path: "/antrian" }`.

- [ ] **Step 4: Repeat for `candal` role Gudang subItems (around line 357)**

Same two entries after `{ name: "Antrian", path: "/antrian" }`.

- [ ] **Step 5: Repeat for `gudang` role Gudang subItems (around line 587)**

Same two entries after `{ name: "Antrian", path: "/antrian" }`.

- [ ] **Step 6: Repeat for `pod` role Gudang subItems (around line 671)**

The `pod` role doesn't show `/antrian` under Gudang — it has a top-level `{ path: "/antrian" }`. Add the two new entries there as subItems under the existing Gudang group instead:
```tsx
{ name: "Antrian Horizontal", path: "/antrian/horizontal" },
{ name: "Antrian Report",     path: "/antrian/report" },
```
Add to the Gudang subItems block for `pod`.

- [ ] **Step 7: Commit**

```bash
rtk git add src/lib/menu-configs.tsx
rtk git commit -m "feat: add antrian horizontal and report to all relevant role menus"
```

---

## Self-Review

### Spec coverage check

| Requirement | Task |
|---|---|
| Generic horizontal view for any SISTRO plant | Task 1 |
| Generic report view (3-column) for any SISTRO plant | Task 2 |
| Company from session, not hardcoded | Tasks 1 & 2 (use `activeCompanyCode`) |
| Viewer can pick any company (local picker, no session switch) | Tasks 1 & 2 (`showCompanyPicker` when `companies.length > 1`) |
| Menu catalog paths | Task 3 |
| Menu entries for viewer + internal roles | Task 4 |

### Column partitioning verification

From `AntrianController.cs (MVC) Report()` action:
- Left td: tiketshift (booking), tiketsecurity (position "01"), tiketsecurityout (position "06")
- Middle td: tikettimbangan (position "02"), tikettimbanganout (position "04")
- Right td: gudangs (position "03", per Gudang_SPPT)

Maps to `ReportHorizontalQ2` API section IDs:
- `type === "shift"` → LEFT ✓
- `security_in` (pos "01") → LEFT ✓
- `security_out` (pos "06") → LEFT ✓
- `timbangan_in` (pos "02") → MIDDLE ✓
- `timbangan_isi` (pos "04") → MIDDLE ✓
- `type === "gudang"` → RIGHT ✓

### No placeholder check ✓
All steps have actual code. No TBDs.

### Type consistency check ✓
`TruckCardData` fields (`nopol`, `driver`, `bookingno`, `produk`, `posto`, `kabupatenTujuan`, `gudangTujuan`, `tonase`, `color`) match `BuildTruckCardQ2()` in `api/AntrianController.cs` lines 801-812.

`Section` fields (`id`, `name`, `type`, `trucks`) match sections array built in `ReportHorizontalQ2()` lines 708-771.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-07-01-antrian-pkg-horizontal-report.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks

**2. Inline Execution** — Execute tasks in this session using executing-plans

**Which approach?**
