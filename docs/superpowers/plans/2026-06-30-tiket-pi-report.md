# Tiket PI Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-company ticket report page in Next.js equivalent to the ASP.NET `Tiket/IndexPi` view, with `bookingno` ("Kode SISTRO") visibly included in the report and accessible to `pi_admin`/viewer-class users.

**Architecture:** New Next.js API route `POST /api/tiket/report-pi` proxies to ASP.NET `DashboardTiket` endpoint with session-based auth; new page at `/reports/tiket-pi` renders the DataTable + export. `DashboardViewerClient` gets a shortcut link for `pi_admin` users.

**Tech Stack:** Next.js 16, `aspnetFetchServer`, `DataTable` component, `export-helper`, `useApi`, next-auth session.

---

## Background Context

### What IndexPi shows (ASP.NET side)
- **View**: `sistropigroup/SISTROAWESOME/Views/Tiket/IndexPi.cshtml`
- **DataTable source**: ASP.NET `GET/POST /api/Tiket/DashboardTiket`
- **Params accepted**: `company`, `SD`, `ED`, `SDMuat`, `EDMuat`, `posto`, `mode`, `position`, `tiketstatus`, `produk`, `draw`, `start`, `length`, `search[value]`
- **Response fields**: `number`, `posto`, `tanggalPOSTO`, `qtyPOSTO`, `bookingno`, `qty`, `tanggalString`, `shift`, `produkString`, `transportString`, `asal`, `tujuan`, `Kabupaten`, `nopol`, `driver`, `donumber`, `statuspemuatan`, `positionString`, `string_timesec`, `string_timekosong`, `string_timegudang`, `string_timemuat`, `string_timeisi`, `string_timeout`, `updatedonString`
- `bookingno` is labeled **"Kode SISTRO"** in the original view

### What the current Next.js `/reports/tickets` page does
- Calls `/api/Tiket/DataReport` via aspnet-proxy from client
- Partially overlapping columns (no time columns, no kabupaten, no donumber)
- Company-scoped to `activeCompanyCode` — no cross-company dropdown

### Key existing files
- `src/app/api/admin/companies/lookup/route.ts` — open to any logged-in user, returns `{ id, code, name }[]`
- `src/app/reports/tickets/page.tsx` — pattern to follow for filter panel + DataTable + export
- `src/app/dashboard/DashboardViewerClient.tsx:47` — `isPiAdmin` already detected
- `src/lib/api-client.ts` — `aspnetFetchServer(path, token, options)` for server-side calls
- `src/lib/export-helper.ts` — `exportToExcel(data, headers, keys, filename)` + `exportToPdf(...)`

---

## File Map

| Action  | Path                                           | Responsibility                                   |
|---------|------------------------------------------------|--------------------------------------------------|
| Create  | `src/app/api/tiket/report-pi/route.ts`         | POST handler — proxies DashboardTiket, auth gate |
| Create  | `src/app/reports/tiket-pi/page.tsx`            | IndexPi-style report page with bookingno column  |
| Modify  | `src/app/dashboard/DashboardViewerClient.tsx`  | Add shortcut card/link for pi_admin              |

---

## Task 1: API Route — `POST /api/tiket/report-pi`

**Files:**
- Create: `src/app/api/tiket/report-pi/route.ts`

- [ ] **Step 1.1: Write the route file**

```typescript
// src/app/api/tiket/report-pi/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  if (!session?.user) return false;
  const username = ((session.user as any).username as string ?? "").toLowerCase();
  if (username === "pi_admin") return true;
  const roles: string[] = (session.user as any).roles ?? [];
  return roles.some((r) =>
    ["superadmin", "ti", "viewer", "pkd"].includes(r.toLowerCase())
  );
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = (session!.user as any).aspnetToken as string;
    const body = await req.text(); // forward form-urlencoded as-is

    const res = await aspnetFetchServer("/api/Tiket/DashboardTiket", token, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return NextResponse.json(
        { success: false, error: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 1.2: Verify file exists**

Run: `ls src/app/api/tiket/report-pi/`
Expected: `route.ts` listed

- [ ] **Step 1.3: Quick smoke-test (optional — needs dev server)**

```bash
curl -X POST http://localhost:3000/api/tiket/report-pi \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "draw=1&start=0&length=5&company=PKG&SD=2026-06-30&ED=2026-06-30"
```
Expected: JSON with `data`, `recordsTotal`, `recordsFiltered` keys.

- [ ] **Step 1.4: Commit**

```bash
git add src/app/api/tiket/report-pi/route.ts
git commit -m "feat: add POST /api/tiket/report-pi — proxy DashboardTiket for pi_admin/viewer"
```

---

## Task 2: Report Page — `/reports/tiket-pi`

**Files:**
- Create: `src/app/reports/tiket-pi/page.tsx`

**Reference columns from IndexPi.cshtml (lines 185–209):**
No | POSTO | Tanggal POSTO | Tonase POSTO | Tonase | Tanggal Booking | Shift | Produk | Transportir | Asal | Tujuan | Kabupaten Tujuan | Nopol | Driver | Status Pemuatan | Posisi | Security In | Timbangan Kosong | Tiba Digudang | Pemuatan | Timbangan Isi | Security Out | Tanggal Pemuatan | **Kode SISTRO (bookingno)** | Nomor DO

- [ ] **Step 2.1: Create page file**

```typescript
// src/app/reports/tiket-pi/page.tsx
"use client";

import { useState, useEffect } from "react";
import { FileText, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/toast";

interface TiketPiRow {
  number: number;
  posto: string;
  tanggalPOSTO: string;
  qtyPOSTO: number | null;
  bookingno: string;
  qty: number | null;
  tanggalString: string;
  shift: string | number;
  produkString: string;
  transportString: string;
  asal: string;
  tujuan: string;
  Kabupaten: string;
  nopol: string;
  driver: string;
  statuspemuatan: string;
  positionString: string;
  string_timesec: string;
  string_timekosong: string;
  string_timegudang: string;
  string_timemuat: string;
  string_timeisi: string;
  string_timeout: string;
  updatedonString: string;
  donumber: string;
}

interface Company { code: string; name: string; }

interface Filters {
  company: string;
  SD: string;
  ED: string;
  SDMuat: string;
  EDMuat: string;
  position: string;
  tiketstatus: string;
}

const today = new Date().toISOString().slice(0, 10);

const POSITIONS = [
  { value: "", label: "Semua Posisi" },
  { value: "00", label: "Tiket Siap Dicetak" },
  { value: "01", label: "Security Pass" },
  { value: "02", label: "Timbang Kosong" },
  { value: "03", label: "Tiba di Gudang" },
  { value: "04", label: "Checkout Gudang" },
  { value: "05", label: "Timbang Isi" },
  { value: "06", label: "Checkout SPPT" },
  { value: "07", label: "Checkout Security" },
];

export default function TiketPiReportPage() {
  const { addToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [draft, setDraft] = useState<Filters>({
    company: "",
    SD: today,
    ED: today,
    SDMuat: "",
    EDMuat: "",
    position: "",
    tiketstatus: "",
  });
  const [filters, setFilters] = useState<Filters>(draft);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/companies/lookup")
      .then((r) => r.json())
      .then((data: { code: string; name: string }[]) => setCompanies(data))
      .catch(() => {});
  }, []);

  const buildBody = (params: DataTableParams, f: Filters) => {
    const body = new URLSearchParams();
    body.set("draw", String(params.draw));
    body.set("start", String(params.start));
    body.set("length", String(params.length));
    body.set("search[value]", params.search || "");
    body.set("order[0][column]", "0");
    body.set("order[0][dir]", "desc");
    body.set("columns[0][name]", "tanggal");
    if (f.company) body.set("company", f.company);
    if (f.SD) body.set("SD", f.SD);
    if (f.ED) body.set("ED", f.ED);
    if (f.SDMuat) body.set("SDMuat", f.SDMuat);
    if (f.EDMuat) body.set("EDMuat", f.EDMuat);
    if (f.position) body.set("position", f.position);
    if (f.tiketstatus) body.set("tiketstatus", f.tiketstatus);
    return body.toString();
  };

  const fetcher = async (params: DataTableParams) => {
    const res = await fetch("/api/tiket/report-pi", {
      method: "POST",
      body: buildBody(params, filters),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!res.ok) throw new Error("Gagal memuat data");
    const json = await res.json();
    return {
      data: json.data ?? [],
      recordsTotal: json.recordsTotal ?? 0,
      recordsFiltered: json.recordsFiltered ?? json.recordsTotal ?? 0,
    };
  };

  const fetchFullData = async (): Promise<TiketPiRow[]> => {
    try {
      const res = await fetch("/api/tiket/report-pi", {
        method: "POST",
        body: buildBody({ draw: 1, start: 0, length: 10000, search: "" }, filters),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!res.ok) throw new Error("Gagal memuat data");
      const json = await res.json();
      return json.data ?? [];
    } catch (err: any) {
      addToast({ title: "Gagal export", description: err.message, variant: "destructive" });
      return [];
    }
  };

  const EXPORT_HEADERS = [
    "No", "POSTO", "Tgl POSTO", "Tonase POSTO", "Kode SISTRO (Booking)",
    "Tonase", "Tanggal Booking", "Shift", "Produk", "Transportir",
    "Asal", "Tujuan", "Kabupaten", "Nopol", "Driver",
    "Status Muat", "Posisi", "Security In", "Timbang Kosong",
    "Tiba Gudang", "Pemuatan", "Timbang Isi", "Security Out",
    "Tanggal Muat", "Nomor DO",
  ];
  const EXPORT_KEYS: (keyof TiketPiRow)[] = [
    "number", "posto", "tanggalPOSTO", "qtyPOSTO", "bookingno",
    "qty", "tanggalString", "shift", "produkString", "transportString",
    "asal", "tujuan", "Kabupaten", "nopol", "driver",
    "statuspemuatan", "positionString", "string_timesec", "string_timekosong",
    "string_timegudang", "string_timemuat", "string_timeisi", "string_timeout",
    "updatedonString", "donumber",
  ];

  const handleExportExcel = async () => {
    setExporting(true);
    const data = await fetchFullData();
    if (data.length > 0) {
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(data, EXPORT_HEADERS, EXPORT_KEYS, `Report_TiketPI_${filters.SD}_${filters.ED}`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    const data = await fetchFullData();
    if (data.length > 0) {
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(data, EXPORT_HEADERS, EXPORT_KEYS, `Laporan Tiket PI (${filters.SD} s.d ${filters.ED})`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const columns: DataTableColumn<TiketPiRow>[] = [
    { key: "number",         header: "No",              render: (r) => <span>{r.number}</span> },
    { key: "posto",          header: "POSTO",           render: (r) => <span className="font-mono text-xs">{r.posto}</span> },
    { key: "tanggalPOSTO",   header: "Tgl POSTO",       render: (r) => <span className="text-xs">{r.tanggalPOSTO}</span> },
    { key: "qtyPOSTO",       header: "Tonase POSTO",    render: (r) => <span className="text-right block">{r.qtyPOSTO?.toLocaleString("id-ID") ?? "—"}</span> },
    { key: "bookingno",      header: "Kode SISTRO",     render: (r) => <span className="font-mono text-xs font-bold">{r.bookingno}</span> },
    { key: "qty",            header: "Tonase",          render: (r) => <span className="text-right block">{r.qty?.toLocaleString("id-ID") ?? "—"}</span> },
    { key: "tanggalString",  header: "Tgl Booking",     render: (r) => <span className="text-xs">{r.tanggalString}</span> },
    { key: "shift",          header: "Shift",           render: (r) => <span>{r.shift}</span> },
    { key: "produkString",   header: "Produk",          render: (r) => <span>{r.produkString}</span> },
    { key: "transportString",header: "Transportir",     render: (r) => <span>{r.transportString}</span> },
    { key: "asal",           header: "Asal",            render: (r) => <span className="text-xs">{r.asal}</span> },
    { key: "tujuan",         header: "Tujuan",          render: (r) => <span className="text-xs">{r.tujuan}</span> },
    { key: "Kabupaten",      header: "Kabupaten",       render: (r) => <span className="text-xs">{r.Kabupaten}</span> },
    { key: "nopol",          header: "Nopol",           render: (r) => <span className="font-mono text-xs">{r.nopol}</span> },
    { key: "driver",         header: "Driver",          render: (r) => <span>{r.driver}</span> },
    { key: "statuspemuatan", header: "Status Muat",     render: (r) => <span className="text-xs">{r.statuspemuatan}</span> },
    { key: "positionString", header: "Posisi",          render: (r) => <span className="text-xs">{r.positionString}</span> },
    { key: "string_timesec", header: "Security In",     render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timesec}</span> },
    { key: "string_timekosong", header: "Timbang Kosong", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timekosong}</span> },
    { key: "string_timegudang", header: "Tiba Gudang",  render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timegudang}</span> },
    { key: "string_timemuat",   header: "Pemuatan",    render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timemuat}</span> },
    { key: "string_timeisi",    header: "Timbang Isi", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timeisi}</span> },
    { key: "string_timeout",    header: "Security Out", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timeout}</span> },
    { key: "updatedonString",   header: "Tgl Muat",    render: (r) => <span className="text-xs">{r.updatedonString}</span> },
    { key: "donumber",          header: "Nomor DO",    render: (r) => <span className="font-mono text-xs">{r.donumber}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <div>
          <h1 className="text-xl font-bold">Laporan Tiket PI</h1>
          <p className="text-sm text-muted-foreground">Realisasi Pemuatan (Security In s.d Security Out)</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Company/Plant</Label>
              <select
                className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={draft.company}
                onChange={(e) => setDraft((p) => ({ ...p, company: e.target.value }))}
              >
                <option value="">Semua</option>
                {companies.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tgl Booking Mulai</Label>
              <Input type="date" className="w-36" value={draft.SD}
                onChange={(e) => setDraft((p) => ({ ...p, SD: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tgl Booking Akhir</Label>
              <Input type="date" className="w-36" value={draft.ED}
                onChange={(e) => setDraft((p) => ({ ...p, ED: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tgl Muat Mulai</Label>
              <Input type="date" className="w-36" value={draft.SDMuat}
                onChange={(e) => setDraft((p) => ({ ...p, SDMuat: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tgl Muat Akhir</Label>
              <Input type="date" className="w-36" value={draft.EDMuat}
                onChange={(e) => setDraft((p) => ({ ...p, EDMuat: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Posisi</Label>
              <select
                className="flex h-9 w-44 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={draft.position}
                onChange={(e) => setDraft((p) => ({ ...p, position: e.target.value }))}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos.value} value={pos.value}>{pos.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status Tiket</Label>
              <select
                className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={draft.tiketstatus}
                onChange={(e) => setDraft((p) => ({ ...p, tiketstatus: e.target.value }))}
              >
                <option value="">Semua</option>
                <option value="00">Belum Selesai</option>
                <option value="01">Selesai</option>
              </select>
            </div>
            <Button onClick={() => setFilters({ ...draft })} className="gap-2">
              <Search className="h-4 w-4" />
              Tampilkan
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={exporting}
              className="gap-2 text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-emerald-950"
            >
              {exporting ? "Memproses..." : "Export Excel"}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exporting}
              className="gap-2 text-rose-600 border-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-400 dark:hover:bg-rose-950"
            >
              {exporting ? "Memproses..." : "Export PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["report-tiket-pi", filters.company, filters.SD, filters.ED, filters.SDMuat, filters.EDMuat, filters.position, filters.tiketstatus]}
            fetcher={fetcher}
            rowKey={(r) => r.bookingno ?? String(r.number)}
            searchPlaceholder="Cari kode SISTRO, nopol, driver, POSTO..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2.2: Verify the page exists**

Run: `ls src/app/reports/tiket-pi/`
Expected: `page.tsx` listed

- [ ] **Step 2.3: Commit**

```bash
git add src/app/reports/tiket-pi/page.tsx
git commit -m "feat: add /reports/tiket-pi — IndexPi-style cross-company ticket report with bookingno"
```

---

## Task 3: Link pi_admin to new report from DashboardViewerClient

**Files:**
- Modify: `src/app/dashboard/DashboardViewerClient.tsx`

The `isPiAdmin` check already exists at line 47. When `pi_admin` lands on the dashboard with no company param, they see `<ViewerDashboard />`. Add a quick-access card pointing to `/reports/tiket-pi`.

- [ ] **Step 3.1: Read current DashboardViewerClient.tsx**

Read lines 44–92 of `src/app/dashboard/DashboardViewerClient.tsx` to verify current structure (already read, but re-read to get exact anchor points before editing).

- [ ] **Step 3.2: Add the pi_admin shortcut before the `!company` return**

Find this block (lines 89–91):
```tsx
  if (!company) {
    return <ViewerDashboard />;
  }
```

Replace with:
```tsx
  if (!company) {
    return (
      <>
        {isPiAdmin && (
          <div className="p-6 pb-0">
            <a
              href="/reports/tiket-pi"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 text-sm font-medium transition-colors"
            >
              <FileText className="h-4 w-4" />
              Laporan Tiket PI
            </a>
          </div>
        )}
        <ViewerDashboard />
      </>
    );
  }
```

Also add to the import line at the top:
```tsx
import { Loader2, Truck, Package, Clock, AlertCircle, FileText } from "lucide-react";
```

- [ ] **Step 3.3: Verify TypeScript compiles**

Run: `rtk tsc --noEmit`
Expected: No errors in `DashboardViewerClient.tsx` or `reports/tiket-pi/page.tsx`

- [ ] **Step 3.4: Commit**

```bash
git add src/app/dashboard/DashboardViewerClient.tsx
git commit -m "feat: add Laporan Tiket PI shortcut for pi_admin in dashboard viewer"
```

---

## Task 4: Manual verification

- [ ] **Step 4.1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 4.2: Verify API route**

Navigate to `http://localhost:3000/reports/tiket-pi` while logged in as pi_admin or superadmin.
- Confirm company dropdown is populated
- Set company to e.g. `PKG`, SD/ED to today, click "Tampilkan"
- Confirm table loads with data
- Confirm **Kode SISTRO** column shows booking numbers

- [ ] **Step 4.3: Verify export**

Click "Export Excel" — confirm downloaded file has "Kode SISTRO (Booking)" column with booking numbers.

- [ ] **Step 4.4: Verify pi_admin dashboard link**

Log in as `pi_admin`, go to `/dashboard` — confirm "Laporan Tiket PI" button appears above ViewerDashboard.

---

## Self-Review Checklist

**Spec coverage:**
- ✅ API route created proxying DashboardTiket
- ✅ bookingno shown as "Kode SISTRO" in table and export
- ✅ Cross-company company dropdown
- ✅ Full filter set (date booking, date muat, position, tiketstatus)
- ✅ All time columns (Security In, Timbang Kosong, Tiba Gudang, Pemuatan, Timbang Isi, Security Out)
- ✅ Export Excel + PDF
- ✅ pi_admin accessible (username check + viewer/superadmin role)
- ✅ DashboardViewerClient gets shortcut for pi_admin

**No placeholders:** All code blocks are complete and runnable.

**Type consistency:** `TiketPiRow` field names match ASP.NET `TiketView` response field names verified from `api/TiketController.cs` lines 5524–5551.
