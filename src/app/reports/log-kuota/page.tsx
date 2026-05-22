"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Search } from "lucide-react";

interface KuotaLogRow {
  number: number;
  tanggal: string;
  tipe: string;
  scope: string;
  produk: string;
  before: number;
  after: number;
  aktivitas: string;
  oleh: string;
  tanggalupdate: string;
}

interface Filters {
  SD: string;
  ED: string;
  ASD: string;
  AED: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function LogKuotaPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [draft, setDraft] = useState<Filters>({ SD: today, ED: today, ASD: "", AED: "" });
  const [filters, setFilters] = useState<Filters>(draft);
  const [exporting, setExporting] = useState(false);

  const handleTampilkan = () => setFilters({ ...draft });

  const fetchFullData = async (): Promise<KuotaLogRow[]> => {
    try {
      const result = await apiTable("/api/KuotaLevel1/LogDataReport", {
        draw: 1,
        start: 0,
        length: 10000,
        search: "",
        SD: filters.SD,
        ED: filters.ED,
        ASD: filters.ASD,
        AED: filters.AED,
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "tanggalupdate", searchable: false, orderable: false },
          { data: "tanggal", name: "tanggal", searchable: false, orderable: true },
          { data: "tipe", name: "action", searchable: true, orderable: false },
          { data: "scope", name: "scope", searchable: true, orderable: true },
          { data: "produk", name: "produk", searchable: true, orderable: false },
          { data: "before", name: "before", searchable: false, orderable: false },
          { data: "after", name: "after", searchable: false, orderable: false },
          { data: "aktivitas", name: "activity", searchable: true, orderable: false },
          { data: "oleh", name: "updatedby", searchable: true, orderable: false },
          { data: "tanggalupdate", name: "tanggalupdate", searchable: false, orderable: true },
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
        "Tanggal Kuota", "Aksi", "Scope", "Produk", "Before", "After", "Aktivitas", "Updated By", "Waktu Aktivitas"
      ];
      const keys = [
        "tanggal", "tipe", "scope", "produk", "before", "after", "aktivitas", "oleh", "tanggalupdate"
      ];
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(data, headers, keys, `Log_Kuota_${filters.SD}_${filters.ED}`);
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
        "Tanggal Kuota", "Aksi", "Scope", "Produk", "Before", "After", "Aktivitas", "Updated By", "Waktu Aktivitas"
      ];
      const keys = [
        "tanggal", "tipe", "scope", "produk", "before", "after", "aktivitas", "oleh", "tanggalupdate"
      ];
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(data, headers, keys, `Log Pembuatan Kuota (${filters.SD} s.d ${filters.ED})`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const fetcher = async (params: DataTableParams) => {
    try {
      const result = await apiTable("/api/KuotaLevel1/LogDataReport", {
        draw: params.draw,
        start: params.start,
        length: params.length,
        search: params.search || "",
        SD: filters.SD,
        ED: filters.ED,
        ASD: filters.ASD,
        AED: filters.AED,
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "tanggalupdate", searchable: false, orderable: false },
          { data: "tanggal", name: "tanggal", searchable: false, orderable: true },
          { data: "tipe", name: "action", searchable: true, orderable: false },
          { data: "scope", name: "scope", searchable: true, orderable: false },
          { data: "produk", name: "produk", searchable: true, orderable: false },
          { data: "before", name: "before", searchable: false, orderable: false },
          { data: "after", name: "after", searchable: false, orderable: false },
          { data: "aktivitas", name: "detail", searchable: true, orderable: false },
          { data: "oleh", name: "updatedby", searchable: true, orderable: false },
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

  const columns: DataTableColumn<KuotaLogRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { key: "tanggal", header: "Tgl Kuota", render: (r) => <span className="text-xs">{r.tanggal}</span> },
    { key: "tipe", header: "Tipe", render: (r) => <span className="text-xs">{r.tipe}</span> },
    { key: "scope", header: "Scope", render: (r) => <span className="text-xs">{r.scope}</span> },
    { key: "produk", header: "Produk", render: (r) => <span>{r.produk}</span> },
    { key: "before", header: "Sebelum", render: (r) => <span className="text-right block">{r.before?.toLocaleString("id-ID")}</span> },
    { key: "after", header: "Sesudah", render: (r) => <span className="text-right block">{r.after?.toLocaleString("id-ID")}</span> },
    { key: "aktivitas", header: "Aktivitas", render: (r) => <span className="text-xs">{r.aktivitas}</span> },
    { key: "oleh", header: "Oleh", render: (r) => <span className="text-xs">{r.oleh}</span> },
    { key: "tanggalupdate", header: "Waktu Aktivitas", render: (r) => <span className="text-xs whitespace-nowrap">{r.tanggalupdate}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6" />
        <h1 className="text-xl font-bold">Log Kuota</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tgl Posting Mulai</label>
              <Input
                type="date"
                className="w-36"
                value={draft.SD}
                onChange={(e) => setDraft((p) => ({ ...p, SD: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tgl Posting Akhir</label>
              <Input
                type="date"
                className="w-36"
                value={draft.ED}
                onChange={(e) => setDraft((p) => ({ ...p, ED: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tgl Aktivitas Mulai</label>
              <Input
                type="date"
                className="w-36"
                value={draft.ASD}
                onChange={(e) => setDraft((p) => ({ ...p, ASD: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tgl Aktivitas Akhir</label>
              <Input
                type="date"
                className="w-36"
                value={draft.AED}
                onChange={(e) => setDraft((p) => ({ ...p, AED: e.target.value }))}
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
            queryKey={["report-log-kuota", filters.SD, filters.ED, filters.ASD, filters.AED, activeCompanyCode ?? ""]}
            fetcher={fetcher}
            rowKey={(r) => `${r.tanggal}-${r.number}`}
            searchPlaceholder="Cari scope, produk, aktivitas..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
