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
