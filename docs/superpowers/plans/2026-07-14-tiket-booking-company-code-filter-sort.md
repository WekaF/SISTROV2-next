# Booking Tiket: Company Code Filter + Table Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/tiket/booking` (Daftar Order Tersedia), add a filterable "Kode Perusahaan" (company code) column and make the whole table sortable by clicking column headers.

**Architecture:** The page currently calls `apiTable('/api/POSTO/AvailableBaru', { ...params, cmd: 'refresh' })` with no explicit `columns` array, so `DataTable`'s per-column search/sort features are silently no-ops — the ASP.NET backend (`POSTOController.AvailableBaru`) reads filters and sort field names positionally out of `columns[N][search][value]` / `columns[order[0][column]][name]`, and none of that is ever sent. Fix requires two coordinated changes:
1. **Backend** (`sistropigroup`): expose `company_code` on `POSTOView`, project it in `AvailableBaru`, and add a new positional filter slot (index 13, appended so no existing filter index shifts) that matches on it.
2. **Frontend** (`SISTROV2-next`): replace the passthrough fetcher with an explicit one that builds the full positional `columns` array (mirroring the pattern already used in `src/app/posto/page.tsx`), wire `sortColumn` onto the existing column defs so header clicks actually sort, and add a new searchable "Kode Perusahaan" column.

No test runner exists in either repo for this kind of feature (no `test` script in `SISTROV2-next/package.json`, no test project touching `POSTOController` in `sistropigroup`) — verification here is manual: hit the backend endpoint directly with curl, then drive the page in a browser. Do not add a testing framework for this one change; follow the codebase's existing convention of manual verification.

**Tech Stack:** Next.js 16 (client component, `@tanstack/react-query` via `DataTable`), ASP.NET Framework 4.5 Web API (`System.Linq.Dynamic` for string-based `OrderBy`), Entity Framework (`Posto` → `Company` navigation).

---

### Task 1: Backend — expose `companyCode` and add its filter to `AvailableBaru`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Models\POSTOView.cs:78-79`
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\POSTOController.cs:1294-1435`

- [ ] **Step 1: Add the `companyCode` field to `POSTOView`**

In `POSTOView.cs`, the class currently ends its scalar fields with:

```csharp
        public string percepatan { get; set; }
        public int? gruptruk { get; set; }
        public string gruptrukString {  get; set; }
    }
```

Change to:

```csharp
        public string percepatan { get; set; }
        public int? gruptruk { get; set; }
        public string gruptrukString {  get; set; }
        public string companyCode { get; set; }
    }
```

- [ ] **Step 2: Read the new filter param in `AvailableBaru`**

In `POSTOController.cs`, this block reads the existing positional column filters (around line 1294-1304):

```csharp
            string fil_plant = Request["columns[2][search][value]"];
            string fil_wilayah = Request["columns[3][search][value]"];
            string fil_tglposto = Request["columns[4][search][value]"];
            string fil_noposto = Request["columns[5][search][value]"];
            string fil_tglakhir = Request["columns[6][search][value]"];
            string fil_tujuan = Request["columns[7][search][value]"];
            string fil_produk = Request["columns[8][search][value]"];
            string fil_qty = Request["columns[9][search][value]"];
            string fil_qtyrencana = Request["columns[10][search][value]"];
            string fil_qtysisaBooking = Request["columns[11][search][value]"];
            string fil_tgljatuhtempo = Request["columns[12][search][value]"];
```

Append a new line for index 13 (append-only — do not renumber the existing indices, the frontend for other pages may still rely on them... though nothing else calls this action, appending is still the safer/smaller diff):

```csharp
            string fil_plant = Request["columns[2][search][value]"];
            string fil_wilayah = Request["columns[3][search][value]"];
            string fil_tglposto = Request["columns[4][search][value]"];
            string fil_noposto = Request["columns[5][search][value]"];
            string fil_tglakhir = Request["columns[6][search][value]"];
            string fil_tujuan = Request["columns[7][search][value]"];
            string fil_produk = Request["columns[8][search][value]"];
            string fil_qty = Request["columns[9][search][value]"];
            string fil_qtyrencana = Request["columns[10][search][value]"];
            string fil_qtysisaBooking = Request["columns[11][search][value]"];
            string fil_tgljatuhtempo = Request["columns[12][search][value]"];
            string fil_companycode = Request["columns[13][search][value]"];
```

- [ ] **Step 3: Add the company-code condition to the `Where` clause**

The `dataSearch` query's filter block currently ends with:

```csharp
                                        (string.IsNullOrEmpty(fil_qtysisaBooking) || (x.qty - x.qtyrencana).ToString().Contains(fil_qtysisaBooking)) &&
                                        (string.IsNullOrEmpty(fil_tgljatuhtempo) || x.tgljatuhtempo == search_tgljatuhtempo)
                                        ))
                                        .OrderBy(sortColumnName + " " + sortDirection);
```

Change to (exact match on the code, case-insensitive, same style as the existing `username.ToUpper()` comparison a few lines above):

```csharp
                                        (string.IsNullOrEmpty(fil_qtysisaBooking) || (x.qty - x.qtyrencana).ToString().Contains(fil_qtysisaBooking)) &&
                                        (string.IsNullOrEmpty(fil_tgljatuhtempo) || x.tgljatuhtempo == search_tgljatuhtempo) &&
                                        (string.IsNullOrEmpty(fil_companycode) || x.Company.company_code.ToUpper() == fil_companycode.ToUpper())
                                        ))
                                        .OrderBy(sortColumnName + " " + sortDirection);
```

- [ ] **Step 4: Project `companyCode` in the `dataSelect` mapping**

The `POSTOView` projection currently includes:

```csharp
                    id = x.id,
                    guid = x.guid,
                    noposto = x.noposto,
                    tglposto = x.tglposto,
                    plant = x.Company.company1,
```

Change to:

```csharp
                    id = x.id,
                    guid = x.guid,
                    noposto = x.noposto,
                    tglposto = x.tglposto,
                    plant = x.Company.company1,
                    companyCode = x.Company.company_code,
```

- [ ] **Step 5: Build and manually verify the endpoint**

Build the `SISTROAWESOME` project (Visual Studio or `msbuild`), start the local backend (`sistropigroup\start-dev.ps1`), then from `SISTROV2-next` (or any shell) hit the endpoint directly with a valid bearer token for a transportir user that has POSTO orders, filtering on a known company code (replace `<TOKEN>` and `1000` with real values from your dev environment):

```bash
curl -s -X POST "http://localhost:8090/api/POSTO/AvailableBaru" \
  -H "Authorization: Bearer <TOKEN>" \
  --data-urlencode "draw=1" \
  --data-urlencode "start=0" \
  --data-urlencode "length=25" \
  --data-urlencode "search[value]=" \
  --data-urlencode "order[0][column]=4" \
  --data-urlencode "order[0][dir]=asc" \
  --data-urlencode "columns[0][name]=" \
  --data-urlencode "columns[4][name]=tglposto" \
  --data-urlencode "columns[13][search][value]=1000"
```

Expected: JSON response's `data[]` entries all have `companyCode` present, and every entry's `companyCode` equals `"1000"` (or empty result set if that transportir has no orders for that company — try without `columns[13][search][value]` first to confirm `companyCode` is populated at all, then add the filter to confirm it narrows results).

- [ ] **Step 6: Commit**

```bash
git add SISTROAWESOME/Models/POSTOView.cs SISTROAWESOME/api/POSTOController.cs
git commit -m "feat: expose company code filter on POSTO AvailableBaru"
```

(Run this from `C:\Users\weka\Indigo\sistropigroup`.)

---

### Task 2: Frontend — explicit column-mapped fetcher, sortable headers, company code column

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\tiket\booking\page.tsx`

- [ ] **Step 1: Replace the inline fetcher with one that sends the full positional `columns` array**

Current code (`page.tsx:10-37`):

```tsx
export default function TicketBookingPage() {
  const { apiTable } = useApi();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
          Booking Tiket Antrian
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Terbitkan tiket antrian berdasarkan order POSTO yang Anda miliki.
        </p>
      </div>

      <Card className="shadow-theme-xs overflow-hidden border-none bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/40 dark:shadow-none">
        <CardHeader className="border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-brand-500 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-none bg-brand-500 animate-pulse" />
            List Order Tersedia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            queryKey={['available-posto']}
            fetcher={(params) => apiTable('/api/POSTO/AvailableBaru', { ...params, cmd: 'refresh' })}
            rowKey={(row: any) => row.id || row.noposto}
            refetchInterval={10000}
            columns={[
```

Change the import line and the component body's fetcher to:

```tsx
import { DataTable, type DataTableParams } from "@/components/ui/DataTable";

export default function TicketBookingPage() {
  const { apiTable } = useApi();
  const router = useRouter();

  const fetcher = (params: DataTableParams) => {
    const cf = params.columnFilters ?? {};
    const cs = (key: string) => ({ value: cf[key] || "", regex: "false" });
    return apiTable('/api/POSTO/AvailableBaru', {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: params.search || "",
      order: params.order?.length ? params.order : [{ column: 4, dir: "asc" }],
      cmd: 'refresh',
      columns: [
        { data: "numberString", name: "", searchable: false, orderable: false },
        { data: "action", name: "", searchable: false, orderable: false },
        { data: "plant", name: "Company.company1", searchable: true, orderable: true, search: cs("plant") },
        { data: "wilayah", name: "M_Wilayah.keterangan", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "tanggalString", name: "tglposto", searchable: true, orderable: true, search: cs("tanggalString") },
        { data: "noposto", name: "noposto", searchable: true, orderable: true, search: cs("noposto") },
        { data: "tglakhirString", name: "tglakhir", searchable: true, orderable: true, search: cs("tglakhirString") },
        { data: "tujuanString", name: "Gudang1.Deskripsi", searchable: true, orderable: true, search: cs("tujuanString") },
        { data: "produkString", name: "Produk1.Nama", searchable: true, orderable: true, search: cs("produkString") },
        { data: "qty", name: "qty", searchable: true, orderable: true, search: cs("qty") },
        { data: "qtyrencana", name: "qtyrencana", searchable: true, orderable: true, search: cs("qtyrencana") },
        { data: "qtysisaBooking", name: "", searchable: true, orderable: false, search: cs("qtysisaBooking") },
        { data: "tanggaljatuhtempoString", name: "tgljatuhtempo", searchable: true, orderable: true, search: cs("tanggaljatuhtempoString") },
        { data: "companyCode", name: "Company.company_code", searchable: true, orderable: true, search: cs("companyCode") },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
          Booking Tiket Antrian
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Terbitkan tiket antrian berdasarkan order POSTO yang Anda miliki.
        </p>
      </div>

      <Card className="shadow-theme-xs overflow-hidden border-none bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/40 dark:shadow-none">
        <CardHeader className="border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-brand-500 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-none bg-brand-500 animate-pulse" />
            List Order Tersedia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            queryKey={['available-posto']}
            fetcher={fetcher}
            rowKey={(row: any) => row.id || row.noposto}
            refetchInterval={10000}
            columns={[
```

Note: `DataTableParams` is imported alongside `DataTable` from `@/components/ui/DataTable` (it's already exported there per `src/components/ui/DataTable.tsx:19`).

- [ ] **Step 2: Add `sortColumn` to the existing column definitions**

These column definitions already exist in the `columns={[...]}` array (`page.tsx:76-214`). Add only the `sortColumn` prop to each (leave `header`/`render` untouched) — do not add `searchable` to these, only the new company-code column (Step 3) gets a search box, per the scope of the request:

```tsx
              {
                key: "plant",
                header: "Plant",
                sortColumn: 2,
                render: (row: any) => (
```

```tsx
              {
                key: "tanggalString",
                header: "Tanggal",
                sortColumn: 4,
                render: (row: any) => (
```

```tsx
              {
                key: "noposto",
                header: "No POSTO",
                sortColumn: 5,
                render: (row: any) => (
```

```tsx
              {
                key: "tglakhirString",
                header: "Exp",
                sortColumn: 6,
                render: (row: any) => (
```

```tsx
              {
                key: "tujuanString",
                header: "Tujuan",
                sortColumn: 7,
                render: (row: any) => (
```

```tsx
              {
                key: "produkString",
                header: "Produk",
                sortColumn: 8,
                render: (row: any) => (
```

```tsx
              {
                key: "qty",
                header: "Qty",
                headerClassName: "text-right",
                className: "text-right",
                sortColumn: 9,
                render: (row: any) => (
```

```tsx
              {
                key: "qtyrencana",
                header: "Qty Pesan",
                headerClassName: "text-right",
                className: "text-right",
                sortColumn: 10,
                render: (row: any) => (
```

```tsx
              {
                key: "tanggaljatuhtempoString",
                header: "Jatuh Tempo",
                sortColumn: 12,
                render: (row: any) => (
```

Leave `qtysisaBooking`, `transportString`, and `gruptruk` without `sortColumn` — `qtysisaBooking` is a computed diff the backend doesn't expose a sortable name for (Step 1's `columns[11][name]` payload is intentionally left as `""`), and `transportString`/`gruptruk` have no backend filter/sort slot at all.

- [ ] **Step 3: Add the new "Kode Perusahaan" column**

Insert this new column definition right after the `plant` column and before `tanggalString` (so it reads company → company code → date left to right):

```tsx
              {
                key: "companyCode",
                header: "Kode Perusahaan",
                searchable: true,
                sortColumn: 13,
                render: (row: any) => (
                  <div className="font-bold text-gray-500 dark:text-gray-400 font-mono text-xs uppercase whitespace-nowrap">
                    {row.companyCode || "-"}
                  </div>
                )
              },
```

- [ ] **Step 4: Typecheck**

```bash
cd c:\Users\weka\Indigo\SISTROV2-next
npx tsc --noEmit
```

Expected: no new errors referencing `src/app/tiket/booking/page.tsx`.

- [ ] **Step 5: Manual verification in the browser**

Start both projects (`sistropigroup\start-dev.ps1` from that directory, or `npm run dev:local` in `SISTROV2-next` if the backend is already running), then open `http://localhost:3000/tiket/booking` as a transportir/rekanan user with active POSTO orders and confirm:
1. A "Kode Perusahaan" column appears with a search box under its header; typing a company code narrows the rows to matching `companyCode` values (check Network tab: the `AvailableBaru` request body includes `columns[13][search][value]=<what you typed>`).
2. Clicking "Plant", "Tanggal", "No POSTO", "Exp", "Tujuan", "Produk", "Qty", "Qty Pesan", "Jatuh Tempo", or "Kode Perusahaan" headers toggles an ascending/descending arrow and re-orders the rows (check Network tab: `order[0][column]` matches the clicked column's index and `order[0][dir]` toggles asc/desc on repeat clicks).
3. Existing behavior is unchanged: booking/print buttons still work, the overdue-row red highlight (`rowClassName`) still applies, the 10s auto-refresh still runs.

- [ ] **Step 6: Commit**

```bash
git add src/app/tiket/booking/page.tsx
git commit -m "feat: add company code filter and column sorting to booking table"
```

---

## Self-Review Notes

- **Spec coverage:** "tambahkan filter company code" → Task 1 (backend field/filter) + Task 2 Step 3 (UI column+search box). "ditabelnya pasang sorting" → Task 2 Step 2 (sortColumn on every column the backend can actually order by).
- **Why append index 13 instead of reusing an existing slot:** `fil_plant` (index 2) filters on `company1` (the display name), not `company_code` — they're different fields on `Company` (`sistropigroup\SISTROAWESOME\BDO\Company.cs:29-30`), so the code filter needs its own slot, not a repurposed one.
- **Why no `sortColumn` on `qtysisaBooking`:** it's `(x.qty - x.qtyrencana)` computed server-side per-row, not a queryable entity field; wiring dynamic-LINQ `OrderBy` on an arithmetic expression string is untested territory for this endpoint and out of scope for what was asked.
