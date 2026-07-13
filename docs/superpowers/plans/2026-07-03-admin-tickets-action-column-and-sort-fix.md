# Admin Tickets DataTable: Action Column Position + Default Sort Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/admin/tickets`, move the row action buttons to the leftmost column (before Booking No) and make the table default-sort by newest ticket first.

**Architecture:** Both fixes live entirely in `src/app/admin/tickets/page.tsx` (a client component). No backend (`sistropigroup`) or `DataTable` component changes needed.
- The action column is just an entry in the `columns` array passed to `<DataTable>` — reordering the array reorders the rendered `<td>`s.
- Sorting is broken because the DataTables-style `order` payload defaults to `column: 0`, and the backend (`TiketController.DataTableFilterLegacy`, confirmed at `sistropigroup/SISTROAWESOME/api/TiketController.cs:3516-3519`) resolves that index against the `columns` array sent in the request body — index 0 is `bookingno`, so it sorts alphabetically by booking number string, not by recency. `bookingno` is not a reliable recency signal (it's not a monotonically-sortable numeric string across all postos). The `Tiket` entity has a real auto-increment `id` (confirmed in `TiketView.cs:20`, `id = x.id` in the projection at `TiketController.cs:3590`), which strictly reflects insertion order regardless of edits to booking date. Add a hidden `id` column to the request's `columns` array and default-sort on it, descending.

**Tech Stack:** Next.js 16 client component, React, `@tanstack/react-query` (via existing `DataTable` component), no new dependencies.

---

### Task 1: Move action column to the leftmost position

**Files:**
- Modify: `src/app/admin/tickets/page.tsx:27-118`

- [ ] **Step 1: Move the `actions` column object to the front of the `columns` array and restyle it for left placement**

Current (lines 27-118) has `columns` starting with `bookingno` and ending with the `actions` entry (lines 103-117):

```tsx
    {
      key: "actions",
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right",
      render: (row: any) => (
        <TicketActions 
          bookingNo={row.bookingno} 
          status={row.position || row.status} 
          currentNopol={row.nopol}
          currentDriver={row.driver}
          className="justify-end"
        />
      ),
    },
  ];
```

Replace the whole `columns` array (lines 27-118) with the same list but with the `actions` entry moved to index 0 and restyled for left alignment (`justify-start`, no `text-right`):

```tsx
  const columns: DataTableColumn<any>[] = [
    {
      key: "actions",
      header: "Aksi",
      render: (row: any) => (
        <TicketActions 
          bookingNo={row.bookingno} 
          status={row.position || row.status} 
          currentNopol={row.nopol}
          currentDriver={row.driver}
          className="justify-start"
        />
      ),
    },
    {
      key: "bookingno",
      header: "Booking No",
      searchable: true,
      className: "font-black text-brand-600 font-mono text-[11px]",
    },
    {
      key: "posto",
      header: "POSTO",
      searchable: true,
      className: "font-bold text-gray-900 dark:text-white text-[11px]",
    },
    {
      key: "tanggalString",
      header: "Tanggal",
      className: "text-[11px] font-bold",
    },
    {
      key: "shift",
      header: "Shift",
      render: (row: any) => (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="font-bold">{row.shift}</span>
        </div>
      ),
    },
    {
      key: "nopol",
      header: "No. Polisi",
      searchable: true,
      className: "font-black text-[11px] uppercase tracking-wider",
    },
    {
      key: "driver",
      header: "Driver",
      searchable: true,
      className: "text-[11px] font-bold text-gray-600 dark:text-gray-400 truncate max-w-[120px]",
    },
    {
      key: "produkString",
      header: "Produk",
      className: "text-[11px] font-bold text-gray-900 dark:text-white",
    },
    {
      key: "transportString",
      header: "Transportir",
      className: "text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate max-w-[150px]",
    },
    {
      key: "qty",
      header: "Qty",
      render: (row: any) => (
        <div className="font-black text-[11px]">
          {row.qty?.toLocaleString()} <span className="text-[8px] text-gray-400 uppercase">TON</span>
        </div>
      ),
    },
    {
      key: "positionString",
      header: "Status",
      render: (row: any) => {
        const pos = row.position || "00";
        let variant: any = "default";
        if (pos === "00") variant = "info";
        if (pos === "10" || pos === "20") variant = "warning";
        if (pos === "30" || pos === "40") variant = "success";
        
        return (
          <Badge color={variant} size="sm" className="rounded-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
            {row.positionString || "PENDING"}
          </Badge>
        );
      },
    },
  ];
```

- [ ] **Step 2: Save and confirm no TypeScript errors**

Run: `cd c:\Users\weka\Indigo\SISTROV2-next; rtk tsc --noEmit`
Expected: no new errors referencing `src/app/admin/tickets/page.tsx`

- [ ] **Step 3: Commit**

```bash
cd c:\Users\weka\Indigo\SISTROV2-next
git add src/app/admin/tickets/page.tsx
git commit -m "fix: move ticket action buttons to leftmost column in admin tickets table"
```

---

### Task 2: Default-sort admin tickets table by newest ticket first

**Files:**
- Modify: `src/app/admin/tickets/page.tsx` (inside the `fetcher` passed to `<DataTable>`, originally lines 158-183, now shifted by the Task 1 edit — locate via the `apiTable('/api/Tiket/DataTableFilterLegacy', payload)` call)

- [ ] **Step 1: Add a hidden `id` column and change the default sort column index**

Current `fetcher` body (pre-Task-1 line numbers 158-183):

```tsx
            fetcher={(params) => {
              const p = params as any;
              const payload = {
                draw: p.draw,
                start: p.start,
                length: p.length,
                search: { value: searchTerm },
                companyCode: activeCompanyCode,
                cmd: 'refresh',
                order: p.order?.length ? p.order : [{ column: 0, dir: "desc" }],
                columns: [
                  { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: p.columnFilters?.bookingno || "" } },
                  { data: "posto", name: "posto", searchable: true, orderable: true, search: { value: p.columnFilters?.posto || "" } },
                  { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
                  { data: "shift", name: "idshift", searchable: true, orderable: true },
                  { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: p.columnFilters?.nopol || "" } },
                  { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: p.columnFilters?.driver || "" } },
                  { data: "produkString", name: "idproduk", searchable: true, orderable: true },
                  { data: "transportString", name: "idtransport", searchable: true, orderable: true },
                  { data: "qty", name: "qty", searchable: true, orderable: true },
                  { data: "positionString", name: "positionString", searchable: true, orderable: true },
                  { data: "position", name: "position", searchable: true, orderable: true }
                ]
              };
              return apiTable('/api/Tiket/DataTableFilterLegacy', payload);
            }}
```

Replace with (adds an 11th, non-rendered `id` column at index 11 and points the default `order` at it, descending — `id` is the `Tiket` table's auto-increment primary key, so `id desc` is always newest-created-first regardless of edited booking dates or non-numeric booking number formats):

```tsx
            fetcher={(params) => {
              const p = params as any;
              const payload = {
                draw: p.draw,
                start: p.start,
                length: p.length,
                search: { value: searchTerm },
                companyCode: activeCompanyCode,
                cmd: 'refresh',
                order: p.order?.length ? p.order : [{ column: 11, dir: "desc" }],
                columns: [
                  { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: p.columnFilters?.bookingno || "" } },
                  { data: "posto", name: "posto", searchable: true, orderable: true, search: { value: p.columnFilters?.posto || "" } },
                  { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
                  { data: "shift", name: "idshift", searchable: true, orderable: true },
                  { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: p.columnFilters?.nopol || "" } },
                  { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: p.columnFilters?.driver || "" } },
                  { data: "produkString", name: "idproduk", searchable: true, orderable: true },
                  { data: "transportString", name: "idtransport", searchable: true, orderable: true },
                  { data: "qty", name: "qty", searchable: true, orderable: true },
                  { data: "positionString", name: "positionString", searchable: true, orderable: true },
                  { data: "position", name: "position", searchable: true, orderable: true },
                  { data: "id", name: "id", searchable: false, orderable: true }
                ]
              };
              return apiTable('/api/Tiket/DataTableFilterLegacy', payload);
            }}
```

- [ ] **Step 2: Manually verify against the running backend**

Start both projects per `AGENTS.md` (`sistropigroup\start-dev.ps1` from that repo root, or `npm run dev` in this repo if backend already running).

Run: navigate to `http://localhost:3000/admin/tickets`
Expected: the newest-created ticket (the one you'd expect to see if you just booked one) appears in the first row. Cross-check by opening the network tab, inspecting the `DataTableFilterLegacy` response, and confirming rows are ordered by descending `id`.

- [ ] **Step 3: Commit**

```bash
cd c:\Users\weka\Indigo\SISTROV2-next
git add src/app/admin/tickets/page.tsx
git commit -m "fix: default-sort admin tickets table by newest ticket (id desc) instead of bookingno"
```

---

## Self-Review Notes

- **Spec coverage:** (1) action column moved to leftmost, before Booking No — Task 1. (2) sorting fixed to show newest tickets first — Task 2. Both requested items covered.
- **Scope note:** `src/app/tiket/page.tsx` (the `/tiket` route) already has its action column first, but has the same `order: [{ column: 0, dir: "desc" }]` sort bug (sorts by `bookingno`, confirmed at that file's line 60). Not in scope here since the user's report matches `/admin/tickets` specifically (action column was on the right there, not on `/tiket`). Flag to the user: if `/tiket` should get the same sort fix, that's a near-identical one-line change (add hidden `id` column at index 12, default order `{ column: 12, dir: "desc" }}`).
- **Placeholder scan:** no TBD/"add later"/vague steps — all code blocks are complete and copy-pasteable.
- **Type consistency:** `DataTableColumn<any>` and `TicketActions` props unchanged from existing usage elsewhere in the same file; no new types introduced.
