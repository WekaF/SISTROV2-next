"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Search } from "lucide-react";

interface BypassRow {
  number: number;
  bookingcode: string;
  reason: string;
  posisi_awal: string;
  posisi_akhir: string;
  updatedby: string;
  tanggalupdate: string;
}

interface Filters {
  SD: string;
  ED: string;
  bookingcode: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function LogBypassPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [draft, setDraft] = useState<Filters>({ SD: today, ED: today, bookingcode: "" });
  const [filters, setFilters] = useState<Filters>(draft);
  const [exporting, setExporting] = useState(false);

  const handleTampilkan = () => setFilters({ ...draft });

  const fetchFullData = async (): Promise<BypassRow[]> => {
    try {
      const result = await apiTable("/api/Tiket/LogBypass", {
        draw: 1,
        start: 0,
        length: 10000,
        search: "",
        SD: filters.SD,
        ED: filters.ED,
        bookingcode: filters.bookingcode,
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "bookingcode", searchable: false, orderable: false },
          { data: "bookingcode", name: "bookingcode", searchable: true, orderable: true },
          { data: "reason", name: "reason", searchable: true, orderable: false },
          { data: "posisi_awal", name: "posisi_awal", searchable: false, orderable: false },
          { data: "posisi_akhir", name: "posisi_akhir", searchable: false, orderable: false },
          { data: "updatedby", name: "updatedby", searchable: true, orderable: false },
          { data: "tanggalupdate", name: "updatedon", searchable: false, orderable: true },
        ],
      });
      return result.data ?? [];
    } catch (err: any) {
      addToast({ title: "Gagal memuat data export", description: err.message, variant: "destructive" });
      return [];
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    const data = await fetchFullData();
    if (data.length > 0) {
      const headers = [
        "Booking Code", "Alasan Bypass", "Posisi Awal", "Posisi Akhir", "Updated By", "Waktu Update"
      ];
      const keys = [
        "bookingcode", "reason", "posisi_awal", "posisi_akhir", "updatedby", "tanggalupdate"
      ];
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(data, headers, keys, `Log_Bypass_${filters.SD}_${filters.ED}`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    const data = await fetchFullData();
    if (data.length > 0) {
      const headers = [
        "Booking Code", "Alasan Bypass", "Posisi Awal", "Posisi Akhir", "Updated By", "Waktu Update"
      ];
      const keys = [
        "bookingcode", "reason", "posisi_awal", "posisi_akhir", "updatedby", "tanggalupdate"
      ];
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(data, headers, keys, `Log Bypass Tiket (${filters.SD} s.d ${filters.ED})`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const fetcher = async (params: DataTableParams) => {
    try {
      const result = await apiTable("/api/Tiket/LogBypass", {
        draw: params.draw,
        start: params.start,
        length: params.length,
        search: params.search || "",
        SD: filters.SD,
        ED: filters.ED,
        bookingcode: filters.bookingcode,
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "bookingcode", searchable: false, orderable: false },
          { data: "bookingcode", name: "bookingcode", searchable: true, orderable: true },
          { data: "reason", name: "reason", searchable: true, orderable: false },
          { data: "posisi_awal", name: "posisi_awal", searchable: false, orderable: false },
          { data: "posisi_akhir", name: "posisi_akhir", searchable: false, orderable: false },
          { data: "updatedby", name: "updatedby", searchable: true, orderable: false },
          { data: "tanggalupdate", name: "updatedon", searchable: false, orderable: true },
        ],
      });
      return {
        data: result.data ?? [],
        recordsTotal: result.recordsTotal ?? 0,
        recordsFiltered: result.recordsFiltered ?? result.recordsTotal ?? 0,
      };
    } catch (err: any) {
      addToast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const columns: DataTableColumn<BypassRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { key: "bookingcode", header: "Booking No", render: (r) => <span className="font-mono text-xs">{r.bookingcode}</span> },
    { key: "reason", header: "Alasan Bypass", render: (r) => <span className="text-xs">{r.reason}</span> },
    { key: "posisi_awal", header: "Posisi Awal", render: (r) => <span className="text-xs">{r.posisi_awal}</span> },
    { key: "posisi_akhir", header: "Posisi Akhir", render: (r) => <span className="text-xs">{r.posisi_akhir}</span> },
    { key: "updatedby", header: "Oleh", render: (r) => <span className="text-xs">{r.updatedby}</span> },
    { key: "tanggalupdate", header: "Waktu Update", render: (r) => <span className="text-xs whitespace-nowrap">{r.tanggalupdate}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-6 w-6" />
        <h1 className="text-xl font-bold">Log Bypass</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tanggal Mulai</label>
              <Input
                type="date"
                className="w-36"
                value={draft.SD}
                onChange={(e) => setDraft((p) => ({ ...p, SD: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tanggal Akhir</label>
              <Input
                type="date"
                className="w-36"
                value={draft.ED}
                onChange={(e) => setDraft((p) => ({ ...p, ED: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Booking Code</label>
              <Input
                className="w-44"
                placeholder="Opsional"
                value={draft.bookingcode}
                onChange={(e) => setDraft((p) => ({ ...p, bookingcode: e.target.value }))}
              />
            </div>
            <Button onClick={handleTampilkan} className="gap-2">
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
            queryKey={["report-log-bypass", filters.SD, filters.ED, filters.bookingcode, activeCompanyCode ?? ""]}
            fetcher={fetcher}
            rowKey={(r) => `${r.bookingcode}-${r.tanggalupdate}`}
            searchPlaceholder="Cari booking code, alasan..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
