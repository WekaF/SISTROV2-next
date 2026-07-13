# Viewer Armada Pengajuan Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Viewer role a read-only "Pengajuan Armada" page under the Viewer Dashboard, listing every armada submission across all companies (pending + approved + rejected) with summary count cards, and with zero code path that could approve or reject a submission.

**Architecture:** Reuse the existing `POST /api/Armada/DataTableReviewBaru` ASP.NET endpoint (already returns all statuses in one paginated response — no new list endpoint needed). Patch that endpoint so the `Viewer` role bypasses the per-company filter (today it's hard-scoped to the logged-in user's own `company_code`, with no override support, unlike POSTO/Gudang/Antrian). Add a new, self-contained Next.js page that renders a `DataTable` of the results (no action column, no approve/reject mutations at all — not hidden, not present) plus three stat cards (Menunggu / Disetujui / Ditolak) tallied from a capped 500-row client-side fetch, matching the pattern already used in `src/app/armada/approvals/page.tsx`. Wire it into the Viewer sidebar's existing "Dashboard" submenu, alongside "Report Plant".

**Tech Stack:** Next.js 16 (client component), `@tanstack/react-query` (`useQuery`), existing `DataTable` component (`src/components/ui/DataTable.tsx`), `useApi()`/`apiTable()` hook, ASP.NET Framework 4.5 backend (`ArmadaController.cs`).

**Decisions confirmed with user:**
- Scope is **global** — Viewer sees armada across all companies, not just their own. This requires the backend change in Task 1 (backend has no company-override support for Armada today, unlike other modules).
- Count cards use a **capped client-side tally** (fetch up to 500 rows, count by status in JS) rather than a new backend aggregate-count endpoint. This is fast to ship and matches the existing `armada/approvals/page.tsx` pattern, but will silently undercount if a company's pending+approved+rejected total ever exceeds 500 rows — flagged with a `ponytail:` comment at the fetch site so it's easy to find later.

---

### Task 1: Backend — let Viewer see armada submissions across all companies

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\ArmadaController.cs:2842`

**Context — current code at line 2842** (inside `DataTableReviewBaru()`):

```csharp
IQueryable<ArmadaReview> datasearch = db.ArmadaReview.Where(x => (isTransport ? x.Transport.username == namauser : x.approver == myCompanyCode));
```

Every non-Transport caller (including Viewer) is hard-scoped to `myCompanyCode` (the logged-in user's own `AspNetUsers.company_code`). There is no `companyCode` override param on this controller at all — unlike `GudangController`/`POSTOController`/`AntrianController`, which already support an `effectiveCompanyCode` pattern via `isAllowedCompanyOverride` (defined in `BaseApiController.cs:58-67`, and it already includes `IsUserInRole("Viewer")`).

- [ ] **Step 1: Add the company-bypass logic**

Replace the line above with:

```csharp
string companyCodeParam = Request["companyCode"] ?? "";
string effectiveCompanyCode = (isAllowedCompanyOverride && !string.IsNullOrWhiteSpace(companyCodeParam))
    ? companyCodeParam
    : myCompanyCode;
bool bypassCompanyFilter = IsUserInRole("Viewer") && string.IsNullOrWhiteSpace(companyCodeParam);

IQueryable<ArmadaReview> datasearch = db.ArmadaReview.Where(x =>
    isTransport ? x.Transport.username == namauser :
    (bypassCompanyFilter || x.approver == effectiveCompanyCode));
```

This preserves existing behavior for every other role (Transport still sees only its own submissions; Admin/StaffArea/etc. still see only `myCompanyCode` unless they pass `companyCode`), and adds: Viewer with no `companyCode` param → sees all companies. Viewer *with* a `companyCode` param → scoped to that one company (same override behavior other controllers already give Viewer).

- [ ] **Step 2: Rebuild the backend**

Open `SISTROAWESOME.sln` in Visual Studio and Build → Rebuild Solution (or, if MSBuild is on PATH: `msbuild SISTROAWESOME.sln /p:Configuration=Debug` from `C:\Users\weka\Indigo\sistropigroup`). Confirm zero build errors in the Output window.

- [ ] **Step 3: Manual smoke test**

From `C:\Users\weka\Indigo\sistropigroup`, run `.\start-dev.ps1` to start IIS Express on port 8090. Log in to the frontend as a `Viewer` account, open browser DevTools → Network, and manually POST to `/aspnet-proxy/api/Armada/DataTableReviewBaru` (or trigger it once Task 2's page exists) with no `companyCode` field. Confirm the `data` array contains rows whose `approver` company differs from the Viewer's own plant (i.e., cross-company rows are present, not just one company).

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\weka\Indigo\sistropigroup"
git add SISTROAWESOME/api/ArmadaController.cs
git commit -m "feat: let Viewer role see armada submissions across all companies"
```

---

### Task 2: Frontend — new read-only "Pengajuan Armada" viewer page

**Files:**
- Create: `src/app/dashboard/armada/page.tsx`

This mirrors the sibling pattern already used by `src/app/dashboard/report/page.tsx` (a standalone page reachable from the Viewer's "Dashboard" submenu, not embedded inside `ViewerDashboard.tsx`). It is a brand-new file with **no approve/reject/edit/delete code of any kind** — not role-gated, structurally absent — so there is no path by which a Viewer (or anyone else who lands on this URL) can mutate a submission from here.

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useMemo } from "react";
import { Truck, Clock, CheckCircle2, XCircle, FileText, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useSession } from "next-auth/react";
import { DataTable, DataTableColumn, DataTableParams, DataTableResult } from "@/components/ui/DataTable";

interface HistoryRow {
  ID?: number;
  aprrovestatus?: string;
  approver?: string;
  nopol?: string;
  jeniskendaraan?: string;
  sumbu?: string;
  qtymax?: number;
  masa_berlaku_kir_string?: string;
  createdSubmission?: string;
  file1String?: string;
  file2String?: string;
  charterString?: string;
}

const getStatusBadge = (status: string) => {
  if (!status) return { label: "Menunggu", color: "warning" as const };
  const s = status.toLowerCase();
  if (s.includes("menunggu")) return { label: "Menunggu", color: "warning" as const };
  if (s.includes("sudah approve") || s === "approve") return { label: "Disetujui", color: "success" as const };
  if (s.includes("tolak") || s.includes("ditolak") || s.includes("revisi")) return { label: "Ditolak/Revisi", color: "error" as const };
  if (s.includes("approve")) return { label: "Disetujui", color: "success" as const };
  return { label: "Menunggu", color: "warning" as const };
};

// DataTables payload columns the backend needs for sorting (see ArmadaController.cs DataTableReviewBaru).
const API_COLUMNS = [
  { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: "", regex: false } },
  { data: "aprrovestatus", name: "approve", searchable: true, orderable: true, search: { value: "", regex: false } },
  { data: "approver", name: "approver", searchable: true, orderable: true, search: { value: "", regex: false } },
  { data: "sumbu", name: "sumbu", searchable: true, orderable: true, search: { value: "", regex: false } },
  { data: "masa_berlaku_kir_string", name: "masa_berlaku_kir", searchable: true, orderable: true, search: { value: "", regex: false } },
  { data: "createdSubmission", name: "ID", searchable: true, orderable: true, search: { value: "", regex: false } },
];

const columns: DataTableColumn<HistoryRow>[] = [
  {
    key: "nopol",
    header: "Nomor Polisi",
    sortColumn: 0,
    className: "font-mono font-bold text-gray-900 dark:text-white",
    render: (row) => (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-bold">{row.nopol || "—"}</span>
          {String(row.charterString) === "1" && <Badge color="indigo" size="sm" variant="solid">Charter</Badge>}
        </div>
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{row.jeniskendaraan}</span>
      </div>
    ),
  },
  {
    key: "aprrovestatus",
    header: "Status",
    sortColumn: 1,
    render: (row) => {
      const s = getStatusBadge(row.aprrovestatus ?? "");
      return <Badge color={s.color} size="sm">{s.label}</Badge>;
    },
  },
  {
    key: "approver",
    header: "Approver",
    sortColumn: 2,
    className: "text-xs font-medium text-gray-600 dark:text-gray-400",
    render: (row) => <span className="truncate block max-w-[150px]" title={row.approver}>{row.approver || "—"}</span>,
  },
  {
    key: "sumbu",
    header: "Sumbu",
    sortColumn: 3,
    className: "text-xs whitespace-nowrap",
    render: (row) => (
      <div className="flex flex-col">
        <span className="font-semibold">{row.sumbu}</span>
        <span className="text-[10px] text-brand-600 font-bold">{row.qtymax} TON</span>
      </div>
    ),
  },
  {
    key: "masa_berlaku_kir_string",
    header: "Legalitas",
    sortColumn: 4,
    className: "text-xs whitespace-nowrap",
    render: (row) => (
      <div className="flex flex-col">
        <span className="text-[10px] text-gray-400 font-black uppercase">Masa KIR</span>
        <span className="font-medium">{row.masa_berlaku_kir_string || "—"}</span>
      </div>
    ),
  },
  {
    key: "createdSubmission",
    header: "Diajukan Pada",
    sortColumn: 5,
    className: "text-[10px] text-gray-400 font-mono",
  },
  {
    key: "files",
    header: "Dokumen",
    render: (row) => (
      <div className="flex items-center gap-1.5">
        {row.file1String && (
          <a href={row.file1String} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-brand-50 text-brand-600 border border-brand-100 hover:bg-brand-100 transition-all" title="KIR & STNK">
            <FileText className="h-3.5 w-3.5" />
          </a>
        )}
        {row.file2String && (
          <a href={row.file2String} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all" title="Lainnya">
            <FileText className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    ),
  },
];

export default function ViewerPengajuanArmadaPage() {
  const { data: session } = useSession();
  const { apiTable } = useApi();
  const queryClient = useQueryClient();

  const fetchHistory = async (params: DataTableParams): Promise<DataTableResult<HistoryRow>> => {
    return apiTable<DataTableResult<HistoryRow>>("/api/Armada/DataTableReviewBaru", {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: params.search || "",
      order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
      columns: API_COLUMNS,
    });
  };

  const { data: statsRows = [], isFetching: statsLoading } = useQuery({
    queryKey: ["armada-viewer-stats"],
    queryFn: async () => {
      // ponytail: 500-row cap for client-side tally, no backend count endpoint exists yet.
      // Add one to ArmadaController.cs if a company's fleet ever exceeds this.
      const res = await apiTable<DataTableResult<HistoryRow>>("/api/Armada/DataTableReviewBaru", {
        draw: 1,
        start: 0,
        length: 500,
        search: "",
        order: [{ column: 0, dir: "desc" }],
        columns: API_COLUMNS,
      });
      return res.data ?? [];
    },
    enabled: !!session,
    staleTime: 30_000,
  });

  const { pendingCount, approvedCount, rejectedCount } = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0;
    for (const row of statsRows) {
      const label = getStatusBadge(row.aprrovestatus ?? "").label;
      if (label === "Menunggu") pending++;
      else if (label === "Disetujui") approved++;
      else rejected++;
    }
    return { pendingCount: pending, approvedCount: approved, rejectedCount: rejected };
  }, [statsRows]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["armada-viewer-stats"] });
    queryClient.invalidateQueries({ queryKey: ["armada-viewer-table"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengajuan Armada</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Daftar pengajuan unit armada dari seluruh company — menunggu approval, sudah disetujui, dan ditolak.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Approve</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{statsLoading ? "—" : pendingCount}</div>
            <p className="text-xs text-gray-400 mt-1">Belum diapprove</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sudah Disetujui</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">{statsLoading ? "—" : approvedCount}</div>
            <p className="text-xs text-gray-400 mt-1">Armada disetujui</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditolak/Revisi</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{statsLoading ? "—" : rejectedCount}</div>
            <p className="text-xs text-gray-400 mt-1">Armada ditolak</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-theme-xs bg-white dark:bg-white/[0.02]">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Riwayat Pengajuan</CardTitle>
              <CardDescription>Data ditampilkan read-only. Approve/tolak hanya oleh Admin Armada.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-gray-400 hover:text-brand-600" onClick={refreshAll}>
              <RefreshCw className="h-3 w-3 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            queryKey={["armada-viewer-table"]}
            fetcher={fetchHistory}
            rowKey={(row) => row.ID || Math.random()}
            searchPlaceholder="Cari Nopol, Approver, atau Status..."
            defaultPageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `src/app/dashboard/armada/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/armada/page.tsx
git commit -m "feat: add read-only viewer page for armada pengajuan with status cards"
```

---

### Task 3: Wire the page into the Viewer sidebar

**Files:**
- Modify: `src/components/app-sidebar.tsx:296-320` (the `viewer` entry in `roleMenus`)

- [ ] **Step 1: Add the menu item**

Current code (`app-sidebar.tsx:296-305`):

```tsx
  viewer: [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboard,
      items: [
        { title: "Dashboard Utama", url: "/", icon: LayoutDashboard },
        { title: "Report Plant", url: "/dashboard/report", icon: BarChart3 },
      ],
    },
```

Change to:

```tsx
  viewer: [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboard,
      items: [
        { title: "Dashboard Utama", url: "/", icon: LayoutDashboard },
        { title: "Report Plant", url: "/dashboard/report", icon: BarChart3 },
        { title: "Pengajuan Armada", url: "/dashboard/armada", icon: Truck },
      ],
    },
```

(`Truck` is already imported at the top of this file — it's used by `MENU_ARMADA_TRANSPORT`/`MENU_ARMADA_ADMIN`.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-sidebar.tsx
git commit -m "feat: add Pengajuan Armada link to Viewer dashboard menu"
```

---

### Task 4: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start both projects**

```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```

- [ ] **Step 2: Log in as a Viewer account and open the new page**

Navigate to Dashboard → "Pengajuan Armada" (`/dashboard/armada`) in the sidebar. Confirm:
- The three cards show non-zero, plausible counts (Menunggu / Disetujui / Ditolak).
- The table lists armada from more than one company's `approver` column (confirms Task 1's global bypass is active) — cross-check against known submissions from at least two different plants if available.
- No approve/reject/edit/delete button or icon appears anywhere on the page, for any row, regardless of status.
- Clicking a "Dokumen" file icon opens the attached PDF/image in a new tab (read-only action, confirms links still work).

- [ ] **Step 3: Confirm the Viewer truly cannot mutate**

With DevTools open, search the page's rendered HTML/JS for `ApproveDataReview` or `TolakDataReview` — confirm neither string appears anywhere in this page's bundle (they only exist in `armada/pengajuan/page.tsx`, which the Viewer role has no sidebar link to).

- [ ] **Step 4: Regression check on the existing admin/transport page**

Log in as an `AdminArmada`/`Transport` account and open `/armada/pengajuan` as before. Confirm approve/reject buttons still work exactly as before Task 1's backend change (Task 1 only added a new branch for the `Viewer` role; every other role's query is unchanged).

---

## Self-review notes

- **Spec coverage:** (1) list of not-yet-approved + already-approved armada on the viewer dashboard → Task 2 + Task 3. (2) Viewer cannot approve/reject → Task 2 (no mutation code exists in the file at all) + Task 4 Step 3 (explicit verification). (3) cards for approved/rejected counts → Task 2's three `Card`s (bonus: pending count too, since it's the same tally with no extra cost).
- **Cross-repo risk:** Task 1 touches the ASP.NET backend (`sistropigroup`), a separate deploy pipeline from the Next.js frontend. Task 2/3 (frontend) will still function without Task 1 — the Viewer will just see their own company's armada instead of all companies — so the tasks can ship independently if the backend deploy needs to lag behind.
- **Known limitation carried forward, not introduced by this work:** this codebase has no server-side route guard (no `src/middleware.ts`); access control everywhere is sidebar-menu-only. This plan follows that existing convention rather than introducing a new one.
