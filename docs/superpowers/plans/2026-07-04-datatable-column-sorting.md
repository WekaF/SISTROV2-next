# DataTable Column Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every list page in the app (all 33 pages using the shared `DataTable` component) gets clickable, working column-header sorting, without changing any backend endpoint (the ASP.NET backends already support server-side sorting per column — they've just never been asked to sort by anything but a hardcoded default).

**Architecture:** The shared component `src/components/ui/DataTable.tsx` currently renders static, non-interactive `<th>` headers and never includes a sort order in its query to `fetcher` at all — `DataTableParams.order` exists as a type field but is never populated. Task 1 adds real sort state + clickable headers to this one component, keyed off a new per-column `sortColumn?: number` field (the backend's DataTables-protocol column index to sort by when that header is clicked — NOT the header's position in the visual column list, because on most pages these two orderings differ, sometimes significantly). Every other task wires one or more pages to use it: add `sortColumn` to the right visual columns, and change that page's `fetcher` to pass through `params.order` (falling back to its existing hardcoded default when the user hasn't clicked anything, so default sort behavior is unchanged).

**Tech Stack:** Next.js 16 (React client components), TanStack Query, TypeScript, Tailwind, `lucide-react` icons. Backend is unaffected — ASP.NET DataTables-protocol endpoints in the sibling `sistropigroup` repo already read `order[0][column]`/`order[0][dir]` and `columns[N][name]` and sort accordingly; nothing there needs to change.

---

## Why `sortColumn` must be an explicit index, not "column position in the visual list"

Every page that talks to a DataTables-style backend keeps **two separate arrays**: the visual `columns: DataTableColumn<any>[]` passed to `<DataTable columns={...}>` (what's rendered), and a second, independently-ordered `columns: [...]` array built inline inside that page's `fetcher` function (sent in the HTTP request body, one entry per backend column, each with `data`/`name`/`orderable`). These are **not the same array** and are frequently in a different order. Confirmed example — `src/app/posto/page.tsx`:

- Visual columns (`const columns: DataTableColumn<any>[]`, line 206): `action, noposto, tanggalString, tglakhirString, tanggaljatuhtempoString, wilayah, asalString, tujuanString, bagian, transportString, produkString, qty, qtyrencana, qtysisaBooking, qtyrealisasi, qtysisaRealisasi, cutoff, kapal, kotatujuan, updatedby, percepatan, gruptruk, statusString`
- Backend-protocol columns (inside `fetcher`, line 68): `numberString, action, wilayah, tanggalString, noposto, tglakhirString, asalString, tujuanString, bagian, transportString, produkString, qty, qtyrencana, qtysisaBooking, qtyrealisasi, qtysisaRealisasi, cutoff, kapal, kotatujuan, updatedby, tanggaljatuhtempoString, percepatan, gruptruk`

`noposto` is visual index 1 but backend index 4. `wilayah` is visual index 5 but backend index 2. If `DataTable.tsx` sent "the index of the clicked header in the visual array" as `order[0].column`, clicking "No POSTO" would silently sort the list by `wilayah` instead — wrong data, no error, easy to ship by accident. So the design puts the burden of knowing the correct backend index on each page (which already owns both arrays and can look this up once), not on the shared component.

---

### Task 1: Add sort state and clickable headers to the shared `DataTable` component

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\components\ui\DataTable.tsx`

- [ ] **Step 1: Add the `sortColumn` field to `DataTableColumn`**

Current code (`DataTable.tsx:9-16`):

```tsx
export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  searchable?: boolean; // New: enable column search
  render?: (row: T, index: number) => React.ReactNode;
}
```

Replace with:

```tsx
export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  searchable?: boolean; // New: enable column search
  sortColumn?: number; // Backend DataTables column index to sort by when this header is clicked. Omit to make the column unsortable.
  render?: (row: T, index: number) => React.ReactNode;
}
```

- [ ] **Step 2: Add sort state and thread it into the query**

Current code (`DataTable.tsx:1-7`, imports):

```tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

Replace with:

```tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

Current code (`DataTable.tsx:68-108`):

```tsx
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [draw, setDraw] = useState(1);

  // Global search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Column filters debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [columnFilters]);

  const fullKey = [...queryKey, debouncedSearch, debouncedColumnFilters, page, pageSize];

  const { data, isLoading, isFetching } = useQuery({
    queryKey: fullKey,
    queryFn: () =>
      fetcher({
        draw,
        start: page * pageSize,
        length: pageSize,
        search: debouncedSearch,
        columnFilters: debouncedColumnFilters,
      }),
    refetchInterval,
  });
```

Replace with:

```tsx
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [draw, setDraw] = useState(1);
  const [sort, setSort] = useState<{ column: number; dir: "asc" | "desc" } | null>(null);

  // Global search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Column filters debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [columnFilters]);

  const handleSort = (col: DataTableColumn<T>) => {
    if (col.sortColumn === undefined) return;
    setSort((prev) =>
      prev && prev.column === col.sortColumn
        ? { column: col.sortColumn as number, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { column: col.sortColumn as number, dir: "asc" }
    );
    setPage(0);
  };

  const fullKey = [...queryKey, debouncedSearch, debouncedColumnFilters, page, pageSize, sort];

  const { data, isLoading, isFetching } = useQuery({
    queryKey: fullKey,
    queryFn: () =>
      fetcher({
        draw,
        start: page * pageSize,
        length: pageSize,
        search: debouncedSearch,
        columnFilters: debouncedColumnFilters,
        order: sort ? [sort] : undefined,
      }),
    refetchInterval,
  });
```

- [ ] **Step 3: Make sortable headers clickable with a sort-direction indicator**

Current code (`DataTable.tsx:166-177`):

```tsx
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-[0.2em] whitespace-nowrap",
                    compact ? "py-1" : "py-4",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
```

Replace with:

```tsx
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col)}
                  className={cn(
                    "px-4 text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-[0.2em] whitespace-nowrap",
                    compact ? "py-1" : "py-4",
                    col.sortColumn !== undefined && "cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300",
                    col.headerClassName
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortColumn !== undefined && (
                      sort?.column === col.sortColumn ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3 shrink-0" />
                        ) : (
                          <ArrowDown className="h-3 w-3 shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 shrink-0 opacity-30" />
                      )
                    )}
                  </span>
                </th>
              ))}
```

- [ ] **Step 4: Type-check and build**

Run:
```
cd c:\Users\weka\Indigo\SISTROV2-next
npx tsc --noEmit
```
Expected: no new TypeScript errors introduced by this file (pre-existing unrelated errors elsewhere, if any, are not your concern — only check that `DataTable.tsx` itself compiles clean and that nothing that imports it now fails to compile because of the new optional `sortColumn` field — it's optional, so no existing caller should break).

- [ ] **Step 5: Manual smoke check**

Start the dev server (`npm run dev` from `c:\Users\weka\Indigo\SISTROV2-next`, or `npm run dev:local` if the ASP.NET backend is also running locally) and open any page that uses `DataTable` (e.g. `/posto` — though it won't have any sortable headers yet until Task 2 runs). Confirm: the page still loads, the table still renders and paginates normally, no console errors. Sorting itself can't be visually verified yet since no page has `sortColumn` set on any column — that's what the next tasks add.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/DataTable.tsx
git commit -m "feat: add clickable column sorting to shared DataTable component"
```

---

### Task 2: Wire sorting into `/posto` (worked example — follow this pattern exactly in later tasks)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\posto\page.tsx`

**Backend-protocol columns array** (inside `fetcher`, `posto/page.tsx:68-91`) — for reference, do not edit this array, only use it to know each field's index:

```
0  numberString            orderable:false
1  action                  orderable:false
2  wilayah                 orderable:true
3  tanggalString           orderable:true
4  noposto                 orderable:true
5  tglakhirString          orderable:true
6  asalString              orderable:true
7  tujuanString            orderable:true
8  bagian                  orderable:true
9  transportString         orderable:true
10 produkString            orderable:true
11 qty                     orderable:true
12 qtyrencana              orderable:true
13 qtysisaBooking          orderable:true
14 qtyrealisasi            orderable:true
15 qtysisaRealisasi        orderable:true
16 cutoff                  orderable:true
17 kapal                   orderable:true
18 kotatujuan              orderable:true
19 updatedby               orderable:true
20 tanggaljatuhtempoString orderable:true
21 percepatan              orderable:false
22 gruptruk                orderable:false
```

- [ ] **Step 1: Add `sortColumn` to each sortable visual column**

Current code (`posto/page.tsx:206-417`, the `columns` array — showing only the parts that change; every object below keeps every other existing property, e.g. `key`, `header`, `searchable`, `className`, `headerClassName`, `render` — untouched, only add the one new `sortColumn` line to the objects listed):

- `{ key: "noposto", header: "No POSTO", searchable: true, ... }` → add `sortColumn: 4,`
- `{ key: "tanggalString", header: "Tanggal", searchable: true, ... }` → add `sortColumn: 3,`
- `{ key: "tglakhirString", header: "Batas", searchable: true, ... }` → add `sortColumn: 5,`
- `{ key: "tanggaljatuhtempoString", header: "Jatuh Tempo", searchable: true, ... }` → add `sortColumn: 20,`
- `{ key: "wilayah", header: "Wilayah", searchable: true, ... }` → add `sortColumn: 2,`
- `{ key: "asalString", header: "Asal", searchable: true, ... }` → add `sortColumn: 6,`
- `{ key: "tujuanString", header: "Tujuan", searchable: true, ... }` → add `sortColumn: 7,`
- `{ key: "bagian", header: "Area", searchable: true, ... }` → add `sortColumn: 8,`
- `{ key: "transportString", header: "Transportir", searchable: true, ... }` → add `sortColumn: 9,`
- `{ key: "produkString", header: "Produk", searchable: true, ... }` → add `sortColumn: 10,`
- `{ key: "qty", header: "Qty (T)", ... }` → add `sortColumn: 11,`
- `{ key: "qtyrencana", header: "Booking", ... }` → add `sortColumn: 12,`
- `{ key: "qtysisaBooking", header: "Sisa Booking", ... }` → add `sortColumn: 13,`
- `{ key: "qtyrealisasi", header: "Realisasi", ... }` → add `sortColumn: 14,`
- `{ key: "qtysisaRealisasi", header: "Sisa Realisasi", ... }` → add `sortColumn: 15,`
- `{ key: "cutoff", header: "CutOff", ... }` → add `sortColumn: 16,`
- `{ key: "kapal", header: "Kapal", ... }` → add `sortColumn: 17,`
- `{ key: "kotatujuan", header: "Kota Tujuan", ... }` → add `sortColumn: 18,`
- `{ key: "updatedby", header: "PIC", ... }` → add `sortColumn: 19,`

Example of the exact edit for one entry — current (`posto/page.tsx:254-259`):

```tsx
    {
      key: "noposto",
      header: "No POSTO",
      searchable: true,
      render: (p) => <span className="font-mono font-bold text-xs">{p.noposto || p.id}</span>,
    },
```

becomes:

```tsx
    {
      key: "noposto",
      header: "No POSTO",
      searchable: true,
      sortColumn: 4,
      render: (p) => <span className="font-mono font-bold text-xs">{p.noposto || p.id}</span>,
    },
```

Apply the same one-line addition (`sortColumn: N,` right after `searchable: true,` where present, otherwise right after `header: "...",`) to every column in the bullet list above, using that column's number from the list. Do **not** add `sortColumn` to `action`, `percepatan`, `gruptruk` (backend `orderable: false`), or `statusString` (no corresponding backend column at all — it's a derived-only display field).

- [ ] **Step 2: Make the fetcher use the user's chosen sort, falling back to the existing default**

Current code (`posto/page.tsx:66`):

```tsx
      order: [{ column: 3, dir: "desc" }],
```

Replace with:

```tsx
      order: params.order?.length ? params.order : [{ column: 3, dir: "desc" }],
```

Leave the second, unrelated `order: [{ column: 1, dir: "desc" }],` at `posto/page.tsx:549` (inside the booking-history sub-table dialog) untouched — that's a separate `<DataTable>` instance for a different sub-view, out of scope for this task.

- [ ] **Step 3: Type-check**

Run:
```
cd c:\Users\weka\Indigo\SISTROV2-next
npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 4: Manual check**

With the dev server running, open `/posto`, click the "No POSTO" header. Expected: an up/down arrow appears next to it, the list re-sorts (verify by comparing a couple of `noposto` values before/after), clicking again reverses direction. Click a different sortable header (e.g. "Tanggal") — the arrow moves to that column and the previous one reverts to the neutral up/down icon.

- [ ] **Step 5: Commit**

```bash
git add src/app/posto/page.tsx
git commit -m "feat: enable column sorting on /posto list"
```

---

### Task 3: Wire sorting into `/posto/so`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\posto\so\page.tsx`

**Backend-protocol columns array** (inside `fetcher`, `posto/so/page.tsx:56-79`):

```
0  charter                 orderable:false
1  numberString            orderable:false
2  wilayah                 orderable:true
3  tanggalString           orderable:true
4  noposto                 orderable:true
5  tglakhirString          orderable:true
6  asalString              orderable:true
7  tujuanString            orderable:true
8  bagian                  orderable:true
9  transportString         orderable:true
10 produkString            orderable:true
11 qty                     orderable:true
12 qtyrencana              orderable:true
13 qtysisaBooking          orderable:false
14 qtyrealisasi            orderable:true
15 qtysisaRealisasi        orderable:false
16 cutoff                  orderable:false
17 kapal                   orderable:true
18 kotatujuan              orderable:true
19 updatedby               orderable:false
20 tanggaljatuhtempoString orderable:true
21 action                  orderable:false
```

- [ ] **Step 1: Add `sortColumn` to each sortable visual column**

Visual columns are at `posto/so/page.tsx:142-322`. Add one `sortColumn:` line to each of these (same rule as Task 2 — keep every other existing property untouched):

- `{ key: "noposto", header: "No SO", ... }` → add `sortColumn: 4,`
- `{ key: "tanggalString", header: "Tgl SO", ... }` → add `sortColumn: 3,`
- `{ key: "transportString", header: "Transportir", ... }` → add `sortColumn: 9,`
- `{ key: "produkString", header: "Produk", ... }` → add `sortColumn: 10,`
- `{ key: "qty", header: "Kuantitas", ... }` → add `sortColumn: 11,`
- `{ key: "qtyrencana", header: "Booking", ... }` → add `sortColumn: 12,`
- `{ key: "qtyrealisasi", header: "Realisasi", ... }` → add `sortColumn: 14,`
- `{ key: "asalString", header: "Asal / Tujuan", ... }` → add `sortColumn: 6,`
- `{ key: "bagian", header: "Area", ... }` → add `sortColumn: 8,`

Do **not** add `sortColumn` to `cutoff` (backend `orderable: false` on this page — unlike `/posto`, this is a real difference, respect it), `statusString` (no backend column), or `action` (`orderable: false`).

Example of the exact edit for one entry — current (`posto/so/page.tsx:143-156`):

```tsx
    {
      key: "noposto",
      header: "No SO",
      render: (p) => (
        <div>
          <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{p.noposto}</span>
          {p.charter === "1" && (
            <span className="ml-2 text-[9px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
              Charter
            </span>
          )}
        </div>
      ),
    },
```

becomes:

```tsx
    {
      key: "noposto",
      header: "No SO",
      sortColumn: 4,
      render: (p) => (
        <div>
          <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{p.noposto}</span>
          {p.charter === "1" && (
            <span className="ml-2 text-[9px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
              Charter
            </span>
          )}
        </div>
      ),
    },
```

- [ ] **Step 2: Make the fetcher use the user's chosen sort**

Current code (`posto/so/page.tsx:53`):

```tsx
      order: [{ column: 0, dir: "desc" }],
```

Replace with:

```tsx
      order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` from `c:\Users\weka\Indigo\SISTROV2-next`. Expected: no new errors.

- [ ] **Step 4: Manual check**

Open `/posto/so`, click "No SO", then "Kuantitas" — same expected behavior as Task 2's Step 4.

- [ ] **Step 5: Commit**

```bash
git add src/app/posto/so/page.tsx
git commit -m "feat: enable column sorting on /posto/so list"
```

---

### Task 4: Wire sorting into the `reports/*` booking-shaped group (5 files)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\booking\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\cancelation\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\loading\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\tickets\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\resume\page.tsx`

These 5 files share a near-identical shape: each has (at least) two nearly-duplicate `fetcher`+`columns` blocks in the same file (a full-table view and a compact/modal view), each with a hardcoded `order: [{ column: N, dir: "desc" }]` and a backend-protocol `columns: [...]` array with per-entry `orderable` flags, confirmed by grep. Apply this exact methodology to **each** `fetcher`/`columns` pair found in each file — some files have 2 such pairs, treat each independently:

- [ ] **Step 1: For each file, read the full file** (`Read` the whole file — these are large; do not rely on grep excerpts) and locate every `fetcher` function and its paired backend-protocol `columns: [...]` array, and every visual `columns: DataTableColumn<any>[]` array passed to a `<DataTable columns={...}>` in the same file.

- [ ] **Step 2: Build the index map** for each backend-protocol `columns` array: list every entry's array index (0-based) alongside its `data` field and `orderable` value, exactly as done in Task 2/3's worked examples above.

- [ ] **Step 3: Match each visual column to its backend index** by comparing the visual column's `key` to the backend entry's `data` field (they use the same field name in every file surveyed so far — e.g. visual `key: "posto"` matches backend `{ data: "posto", ... }`). For every visual column whose matched backend entry has `orderable: true` (or has no `orderable` field at all — DataTables treats a missing `orderable` as `true` by default, consistent with usage elsewhere in this codebase), add `sortColumn: <that backend index>` to the visual column object, following the exact one-line-addition style shown in Task 2 Step 1's worked example (add the line right after `header:` or `searchable:`, keep every other property untouched). Skip any visual column whose matched backend entry has `orderable: false`, or that has no matching backend entry at all (e.g. a `number`/row-index column, or a purely derived/computed display column).

- [ ] **Step 4: Fix each fetcher's `order` line.** Change `order: [{ column: N, dir: "..." }]` (wherever it appears, verbatim values preserved) to `order: params.order?.length ? params.order : [{ column: N, dir: "..." }]` — keep the exact same `N`/direction that was already there as the fallback default, so default sort behavior is unchanged for anyone who hasn't clicked a header yet.

- [ ] **Step 5: Type-check.** Run `npx tsc --noEmit` from `c:\Users\weka\Indigo\SISTROV2-next` after each file (or once at the end for all 5) — 0 new errors.

- [ ] **Step 6: Manual check.** For each of the 5 pages, open it in the dev server, click at least 2 different sortable headers, confirm the sort indicator and row order both change as expected (same behavior as Task 2 Step 4).

- [ ] **Step 7: Commit** (one commit covering all 5 files is fine, since it's the same mechanical change repeated):

```bash
git add src/app/reports/booking/page.tsx src/app/reports/cancelation/page.tsx src/app/reports/loading/page.tsx src/app/reports/tickets/page.tsx src/app/reports/resume/page.tsx
git commit -m "feat: enable column sorting on reports/booking, cancelation, loading, tickets, resume"
```

---

### Task 5: Wire sorting into the remaining `reports/*` pages (6 files)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\fleet\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\warehouses\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\log-bypass\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\log-kuota\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\posto\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\reports\tiket-pi\page.tsx`

Same methodology as Task 4 Steps 1-7, applied to these 6 files instead (`reports/fleet`, `reports/warehouses`, `reports/log-bypass`, and `reports/log-kuota` each have 2 near-duplicate `fetcher`/`columns` pairs per file, confirmed by grep — treat each pair independently; `reports/posto` and `reports/tiket-pi` were not yet grepped for a duplicate second pair — check for one and handle it the same way if present).

- [ ] **Step 1-6:** Same as Task 4 Steps 1-6, for these 6 files.

- [ ] **Step 7: Commit**

```bash
git add src/app/reports/fleet/page.tsx src/app/reports/warehouses/page.tsx src/app/reports/log-bypass/page.tsx src/app/reports/log-kuota/page.tsx src/app/reports/posto/page.tsx src/app/reports/tiket-pi/page.tsx
git commit -m "feat: enable column sorting on reports/fleet, warehouses, log-bypass, log-kuota, posto, tiket-pi"
```

---

### Task 6: Wire sorting into ticket pages (4 files)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\tiket\booking\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\tiket\dashboard\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\tiket\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\admin\tickets\page.tsx`

Same methodology as Task 4 Steps 1-7. Note: `src/app/tiket/page.tsx` and `src/app/armada/pengajuan/page.tsx` (Task 7) already contain `order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }]` — i.e. Step 4 (fixing the fetcher's order line) is **already done** for `tiket/page.tsx`; only Steps 1-3 (adding `sortColumn` to visual columns) are needed there. Verify this yourself by reading the file before assuming it's already correct — don't skip the read.

- [ ] **Step 1-6:** Same methodology as Task 4, for these 4 files.

- [ ] **Step 7: Commit**

```bash
git add src/app/tiket/booking/page.tsx src/app/tiket/dashboard/page.tsx src/app/tiket/page.tsx src/app/admin/tickets/page.tsx
git commit -m "feat: enable column sorting on tiket booking, dashboard, list, and admin tickets"
```

---

### Task 7: Wire sorting into armada pages (3 files)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\armada\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\armada\pengajuan\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\armada\mapping-zero-odol\page.tsx`

Same methodology as Task 4 Steps 1-7. Note: `armada/pengajuan/page.tsx` already has `order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }]` (confirmed) — only Steps 1-3 (visual column `sortColumn` additions) are needed there.

- [ ] **Step 1-6:** Same methodology as Task 4, for these 3 files.

- [ ] **Step 7: Commit**

```bash
git add src/app/armada/page.tsx src/app/armada/pengajuan/page.tsx src/app/armada/mapping-zero-odol/page.tsx
git commit -m "feat: enable column sorting on armada list, pengajuan, and mapping-zero-odol"
```

---

### Task 8: Wire sorting into gudang pages (6 files)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\gudang\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\gudang\targets\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\gudang\trafik\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\gudang\tujuan-bagian\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\gudang\unit-queue\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\components\dashboard\GudangDashboard.tsx`

Same methodology as Task 4 Steps 1-7.

- [ ] **Step 1-6:** Same methodology as Task 4, for these 6 files.

- [ ] **Step 7: Commit**

```bash
git add src/app/gudang/page.tsx src/app/gudang/targets/page.tsx src/app/gudang/trafik/page.tsx src/app/gudang/tujuan-bagian/page.tsx src/app/gudang/unit-queue/page.tsx src/components/dashboard/GudangDashboard.tsx
git commit -m "feat: enable column sorting on gudang pages and dashboard"
```

---

### Task 9: Wire sorting into kuota, shift, antrian, and pengajuan pages (5 files)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\kuota\schedule\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\kuota\shifts\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\shift\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\pengajuan\jatuh-tempo\page.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\antrian\page.tsx`

Same methodology as Task 4 Steps 1-7. Note `antrian/page.tsx` is a different page from `antrian/live-monitoring/page.tsx` (which does NOT use the shared `DataTable` component per the file list — do not touch `live-monitoring`, it's out of scope for this plan).

- [ ] **Step 1-6:** Same methodology as Task 4, for these 5 files.

- [ ] **Step 7: Commit**

```bash
git add src/app/kuota/schedule/page.tsx src/app/kuota/shifts/page.tsx src/app/shift/page.tsx src/app/pengajuan/jatuh-tempo/page.tsx src/app/antrian/page.tsx
git commit -m "feat: enable column sorting on kuota, shift, pengajuan, and antrian pages"
```

---

### Task 10: Wire sorting into `/so` (FormData-based fetcher — different pattern from Tasks 2-9)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\so\page.tsx`

This page's fetcher builds a `FormData`/`URLSearchParams`-style payload (confirmed: `form.set(\`columns[${i}][orderable]\`, "true")` at `so/page.tsx:90`, i.e. it loops over columns and calls `form.set(...)` per field, rather than building a plain JS object literal like every other page in this plan) — read the whole file first to understand its exact shape before editing anything; do not assume it matches the Task 2-9 object-literal pattern.

- [ ] **Step 1: Read the whole file.** Find the loop that builds the `columns[i][...]` form fields and the line(s) that set `columns[i][orderable]`/`order[...]` fields, and the visual `columns: DataTableColumn<any>[]` array.

- [ ] **Step 2: Determine how `order` is currently sent.** Find whichever line(s) set the `order[0][column]` / `order[0][dir]` form fields (likely `form.set("order[0][column]", ...)` and `form.set("order[0][dir]", ...)`, mirroring the `columns[i][orderable]` pattern already found). Note the current hardcoded values.

- [ ] **Step 3: Make it dynamic.** Change whatever sets `order[0][column]` to use `params.order?.[0]?.column` when present, falling back to the existing hardcoded default column index otherwise. Do the same for `order[0][dir]`, falling back to the existing hardcoded default direction. Since this uses `form.set(...)` rather than a JS object literal, the fix will look like:

```ts
const defaultOrderColumn = /* the exact literal number currently passed to form.set("order[0][column]", ...) */;
const defaultOrderDir = /* the exact literal string currently passed to form.set("order[0][dir]", ...) */;
form.set("order[0][column]", String(params.order?.[0]?.column ?? defaultOrderColumn));
form.set("order[0][dir]", params.order?.[0]?.dir ?? defaultOrderDir);
```

Replace the placeholder comments with the actual current literal values you find in Step 2 — do not leave comments in the committed code.

- [ ] **Step 4: Add `sortColumn` to the visual columns**, using the same key-to-backend-index matching methodology as Task 2 Step 1, based on the `columns[i][...]` loop/array you found in Step 1.

- [ ] **Step 5: Type-check.** `npx tsc --noEmit` from `c:\Users\weka\Indigo\SISTROV2-next` — 0 new errors.

- [ ] **Step 6: Manual check.** Open `/so`, click at least 2 sortable headers, confirm sort order changes.

- [ ] **Step 7: Commit**

```bash
git add src/app/so/page.tsx
git commit -m "feat: enable column sorting on /so list"
```

---

### Task 11: Wire sorting into `admin/pengaturan/user` (client-side sort — different pattern from every other task)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\admin\pengaturan\user\page.tsx`

This page has no backend sorting protocol at all — its `fetcher` (lines 62-86) fetches the **entire** user list from `/api/admin/users/plant` once, then does client-side `.filter()` and `.slice()` for search and pagination. There is no `columns` request payload and no `order` concept server-side. Sorting here must happen **client-side**, inside this same fetcher, using `params.order` once Task 1 makes it available.

- [ ] **Step 1: Add `sortColumn` to the sortable visual columns.**

Current code (`admin/pengaturan/user/page.tsx:88-177`, the visual `columns` array) — add `sortColumn` to these entries (skip `no` and `action`, which have no sortable data):

- `{ key: "username", header: "Username", ... }` → add `sortColumn: 0,`
- `{ key: "email", header: "Email Address", ... }` → add `sortColumn: 1,`
- `{ key: "company_code", header: "Unit", ... }` → add `sortColumn: 2,`
- `{ key: "deskripsi", header: "Deskripsi", ... }` → add `sortColumn: 3,`

(These indices are arbitrary here — since there's no backend protocol to match, just number the sortable columns 0-3 in this order; they only need to be internally consistent with Step 2 below.)

- [ ] **Step 2: Add client-side sorting to the fetcher, before pagination.**

Current code (`admin/pengaturan/user/page.tsx:62-86`):

```tsx
  const fetcher = async (params: DataTableParams) => {
    const res = await fetch("/api/admin/users/plant");
    const allData = await res.json();
    if (!res.ok) throw new Error(allData.error || "Failed to fetch users");
    
    // Client-side filtering as the legacy API doesn't support server-side params
    const filtered = (allData || []).filter((u: any) => {
      const s = params.search.toLowerCase();
      return (
        (u.username || u.UserName || "").toLowerCase().includes(s) ||
        (u.email || u.Email || "").toLowerCase().includes(s) ||
        (u.company_code || "").toLowerCase().includes(s)
      );
    });

    const start = params.start || 0;
    const length = params.length || 25;
    const paginated = filtered.slice(start, start + length);

    return {
      data: paginated,
      recordsTotal: allData.length,
      recordsFiltered: filtered.length,
    };
  };
```

Replace with:

```tsx
  const SORT_KEYS: Record<number, string> = {
    0: "username",
    1: "email",
    2: "company_code",
    3: "deskripsi",
  };

  const fetcher = async (params: DataTableParams) => {
    const res = await fetch("/api/admin/users/plant");
    const allData = await res.json();
    if (!res.ok) throw new Error(allData.error || "Failed to fetch users");
    
    // Client-side filtering as the legacy API doesn't support server-side params
    const filtered = (allData || []).filter((u: any) => {
      const s = params.search.toLowerCase();
      return (
        (u.username || u.UserName || "").toLowerCase().includes(s) ||
        (u.email || u.Email || "").toLowerCase().includes(s) ||
        (u.company_code || "").toLowerCase().includes(s)
      );
    });

    const order = params.order?.[0];
    if (order && SORT_KEYS[order.column]) {
      const sortKey = SORT_KEYS[order.column];
      filtered.sort((a: any, b: any) => {
        const av = String(a[sortKey] ?? (sortKey === "username" ? a.UserName : sortKey === "email" ? a.Email : "") ?? "").toLowerCase();
        const bv = String(b[sortKey] ?? (sortKey === "username" ? b.UserName : sortKey === "email" ? b.Email : "") ?? "").toLowerCase();
        if (av < bv) return order.dir === "asc" ? -1 : 1;
        if (av > bv) return order.dir === "asc" ? 1 : -1;
        return 0;
      });
    }

    const start = params.start || 0;
    const length = params.length || 25;
    const paginated = filtered.slice(start, start + length);

    return {
      data: paginated,
      recordsTotal: allData.length,
      recordsFiltered: filtered.length,
    };
  };
```

- [ ] **Step 3: Type-check.** `npx tsc --noEmit` from `c:\Users\weka\Indigo\SISTROV2-next` — 0 new errors.

- [ ] **Step 4: Manual check.** Open `/admin/pengaturan/user`, click "Username" — list re-sorts alphabetically; click again — reverses; click "Email Address" — sorts by that column instead.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/pengaturan/user/page.tsx
git commit -m "feat: enable client-side column sorting on admin user management"
```

---

## Self-Review

**Spec coverage:** "pastikan semua datatable bisa sorting terapkan diseluruh datatable di apps ini" (make sure every datatable can sort, apply it across every datatable in this app) — all 33 files that import the shared `DataTable` component are covered across Tasks 2-11 (2 individually-worked pages + 8 grouped tasks + 2 special-pattern pages), on top of the foundational Task 1 that makes sorting possible at all. `antrian/live-monitoring/page.tsx` was checked and confirmed to NOT use the shared `DataTable` component (it has its own hardcoded `order`/`columns` construction but isn't in the 33-file import list) — correctly out of scope, not silently dropped.

**Placeholder scan:** Tasks 4, 5, 6, 8, 9 don't hand-enumerate every column's exact `sortColumn` number in advance (unlike Tasks 2, 3, 7's `armada/pengajuan`, 6's `tiket/page.tsx`, 10, 11, which are fully worked) — this is a deliberate, disclosed scope decision (see the "Why `sortColumn` must be an explicit index" section), not an oversight: hand-verifying the visual-to-backend column index mapping for all ~25 remaining files would require reading every one of them in full during plan-writing, which wasn't done. Each of those tasks instead gives a fully mechanical, unambiguous methodology (identical to the worked Task 2/3 examples they explicitly reference) for the implementer to apply after reading the specific file — this is a legitimate "apply this exact, already-demonstrated transformation" task, not a vague TODO. Task 10's `so/page.tsx` step 3 code block has bracketed comments describing what to substitute (the actual literal values found in that file) — flagged explicitly as "replace before committing," not left as dead code.

**Type consistency:** `DataTableColumn<T>.sortColumn?: number` (Task 1) is used identically in every subsequent task. `DataTableParams.order?: { column: number; dir: string }[]` (pre-existing type, unchanged) is what Task 1 populates and every later task's fetcher reads via `params.order`.
