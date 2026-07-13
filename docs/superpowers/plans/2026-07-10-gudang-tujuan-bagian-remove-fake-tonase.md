# Gudang Tujuan Bagian: Remove Fake Tonase Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `/gudang/tujuan-bagian` so the table only shows columns the API actually returns (Code, Deskripsi Gudang, Tipe, Kabupaten, Aksi), removing the bogus "Tonase" column which was silently rendering the Tipe value a second time.

**Architecture:** Frontend-only change in `src/app/gudang/tujuan-bagian/page.tsx`. No backend change — `GudangController.DataGudangTujuan()` (backend repo `sistropigroup`) never returned tonase/qty fields; the frontend was reading nonexistent `row.qty`/`row.tonase` and silently falling back to `row.id` (the same field the Tipe column falls back to), so Tonase == Tipe on screen. Fix: align the `GudangTujuan` TypeScript interface with the real API shape, drop the Tonase column, drop the "KUOTA TONASE" badge/subtitle that implied this page tracks tonnage.

**Tech Stack:** Next.js 16, React, TypeScript, `DataTable` component (`src/components/ui/DataTable.tsx`).

---

## Root Cause Reference

Backend response shape (`GudangController.cs:267-275`, `Models/GudangView.cs:8-23`):

```csharp
dt = viewGudang.AsEnumerable().Select((x, i) => new GudangView
{
    number = i + 1,
    idgudang = x.g.ID,
    namagudang = x.g.Deskripsi,
    id = (int)x.g.Tipe,        // <-- "Tipe" value, confusingly named "id"
    kabupaten = x.g.Kabupaten,
    Action = detail1 + x.g.ID + detail2
}).ToList();
```

`GudangView` class has no `tonase`, `qty`, or `tipe` property at all. Frontend was calling `row.tipe || row.id` for the Tipe column and `row.qty || row.tonase || row.id` for Tonase — both resolve to `row.id` since `tipe`/`qty`/`tonase` don't exist on the response.

---

### Task 1: Align frontend types and columns with the real API response

**Files:**
- Modify: `src/app/gudang/tujuan-bagian/page.tsx:20-30` (interface), `:160-182` (columns), `:186-193` (header/badge/subtitle)

- [ ] **Step 1: Fix the `GudangTujuan` interface to match the actual response**

Replace lines 20-30:

```typescript
interface GudangTujuan {
  id: string;
  number: number;
  idgudang: string;
  namagudang: string;
  tipe: string | number;
  kabupaten: string;
  tonase: string | number;
  qty?: string | number;
  Action: string;
}
```

with:

```typescript
interface GudangTujuan {
  id: number;
  number: number;
  idgudang: string;
  namagudang: string;
  kabupaten: string;
  Action: string;
}
```

- [ ] **Step 2: Remove the Tonase column and fix the Tipe column to read the real field**

Replace the `columns` array at lines 160-182:

```typescript
  const columns: DataTableColumn<GudangTujuan>[] = [
    { key: "number", header: "No", className: "w-12 text-center", render: (_, i) => <span className="text-xs font-bold text-slate-400">{i + 1}</span> },
    { key: "idgudang", header: "Code", className: "font-mono font-bold text-xs" },
    { key: "namagudang", header: "Gudang Tujuan", className: "font-black uppercase text-slate-800 dark:text-white text-sm tracking-tight" },
    { key: "tipe", header: "Tipe", className: "text-center font-bold text-slate-500", render: (row) => row.tipe || row.id },
    { key: "kabupaten", header: "Kabupaten", className: "text-xs font-medium" },
    { 
      key: "tonase", 
      header: "Tonase", 
      className: "text-right",
      render: (row) => <span className="font-black text-brand-600">{row.qty || row.tonase || row.id} <span className="text-[10px] uppercase">Ton</span></span>
    },
    {
      key: "Action",
      header: "Aksi",
      className: "text-center",
      render: (row) => (
        <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest border-blue-200 hover:bg-blue-50 px-3" onClick={() => handleOpenDetail(row)}>
          Detail
        </Button>
      )
    }
  ];
```

with:

```typescript
  const columns: DataTableColumn<GudangTujuan>[] = [
    { key: "number", header: "No", className: "w-12 text-center", render: (_, i) => <span className="text-xs font-bold text-slate-400">{i + 1}</span> },
    { key: "idgudang", header: "Code", className: "font-mono font-bold text-xs" },
    { key: "namagudang", header: "Deskripsi Gudang", className: "font-black uppercase text-slate-800 dark:text-white text-sm tracking-tight" },
    { key: "id", header: "Tipe", className: "text-center font-bold text-slate-500", render: (row) => row.id },
    { key: "kabupaten", header: "Kabupaten", className: "text-xs font-medium" },
    {
      key: "Action",
      header: "Aksi",
      className: "text-center",
      render: (row) => (
        <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest border-blue-200 hover:bg-blue-50 px-3" onClick={() => handleOpenDetail(row)}>
          Detail
        </Button>
      )
    }
  ];
```

- [ ] **Step 3: Remove the misleading "KUOTA TONASE" badge and tonase subtitle**

Replace lines 186-193:

```typescript
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Gudang Tujuan Bagian</h1>
            <Badge color="success" variant="solid" size="sm">KUOTA TONASE</Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">* Kuota dalam satuan ton. Daftar pemetaan gudang tujuan pemuatan.</p>
        </div>
```

with:

```typescript
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Gudang Tujuan Bagian</h1>
          <p className="text-sm text-slate-500 font-medium">Daftar pemetaan gudang tujuan pemuatan.</p>
        </div>
```

Note: `Badge` import at line 14 is still used elsewhere in this file (detail modal badges at lines 223/282) — do not remove the import.

- [ ] **Step 4: Verify no other reference to `tonase`/`qty` remains in this file**

Run: `rtk grep -n "tonase\|qty" src/app/gudang/tujuan-bagian/page.tsx`
Expected: no matches.

- [ ] **Step 5: Typecheck**

Run: `rtk tsc --noEmit`
Expected: no new errors in `src/app/gudang/tujuan-bagian/page.tsx`.

- [ ] **Step 6: Manual verify in browser**

Start dev server (`npm run dev` if not already running), open `http://localhost:3000/gudang/tujuan-bagian`, confirm:
- Table shows exactly 5 data columns: No, Code, Deskripsi Gudang, Tipe, Kabupaten, plus Aksi.
- No "Tonase" column, no "KUOTA TONASE" badge.
- "Detail" button still opens the modal with correct data (unaffected — uses separate `DetailDataTujuan` endpoint/`GudangDetail` type, untouched by this change).

- [ ] **Step 7: Commit**

```bash
rtk git add src/app/gudang/tujuan-bagian/page.tsx
rtk git commit -m "fix: remove fake tonase column from gudang tujuan bagian table"
```

---

## Self-Review Notes

- **Spec coverage:** user asked (1) find tonase source → documented above (none, was a fallback bug), (2) match table to actual response, (3) keep only code/deskripsi gudang/tipe/kabupaten/action detail — Task 1 covers all three.
- **Out of scope, left untouched:** the Detail modal (`GudangDetail`/`DetailDataTujuan`) shows `detail?.tipe` labeled "... Ton" (page.tsx:241) — same underlying `Tipe` field mislabeled as tonnage, but user's request was scoped to the table columns, not the modal. Flagging for a possible follow-up plan if desired.
