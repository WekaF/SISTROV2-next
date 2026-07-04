"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Search } from "lucide-react";

interface LoadingRow {
  number: number;
  posto: string;
  bookingno: string;
  qty: number;
  tanggalString: string;
  produkString: string;
  transportString: string;
  nopol: string;
  driver: string;
  positionString: string;
  string_timesec: string;
  string_timekosong: string;
  string_timegudang: string;
  string_timemuat: string;
  string_timeisi: string;
  string_timeout: string;
}

interface Filters {
  SD: string;
  ED: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function LaporanLoadingPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [draft, setDraft] = useState<Filters>({ SD: today, ED: today });
  const [filters, setFilters] = useState<Filters>(draft);
  const [exporting, setExporting] = useState(false);

  const handleTampilkan = () => setFilters({ ...draft });

  const fetchFullData = async (): Promise<LoadingRow[]> => {
    try {
      const result = await apiTable("/api/Tiket/DataReport", {
        draw: 1,
        start: 0,
        length: 10000,
        search: "",
        SD: filters.SD,
        ED: filters.ED,
        mode: "aktif",
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "bookingno", searchable: false, orderable: false },
          { data: "posto", name: "posto", searchable: true, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "qty", name: "qty", searchable: false, orderable: true },
          { data: "tanggalString", name: "tanggal", searchable: false, orderable: true },
          { data: "produkString", name: "idproduk", searchable: false, orderable: false },
          { data: "transportString", name: "idtransport", searchable: false, orderable: false },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "positionString", name: "position", searchable: false, orderable: true },
          { data: "string_timesec", name: "timesec", searchable: false, orderable: false },
          { data: "string_timekosong", name: "timekosong", searchable: false, orderable: false },
          { data: "string_timegudang", name: "timegudang", searchable: false, orderable: false },
          { data: "string_timemuat", name: "timemuat", searchable: false, orderable: false },
          { data: "string_timeisi", name: "timeisi", searchable: false, orderable: false },
          { data: "string_timeout", name: "timeout", searchable: false, orderable: false },
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
        "POSTO", "Booking No", "Qty (ton)", "Tgl Booking", "Produk", "Transportir",
        "Nopol", "Driver", "Posisi", "Security In", "Timbang Kosong", "Tiba Gudang",
        "Pemuatan", "Timbang Isi", "Security Out"
      ];
      const keys = [
        "posto", "bookingno", "qty", "tanggalString", "produkString", "transportString",
        "nopol", "driver", "positionString", "string_timesec", "string_timekosong", "string_timegudang",
        "string_timemuat", "string_timeisi", "string_timeout"
      ];
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(data, headers, keys, `Laporan_Loading_${filters.SD}_${filters.ED}`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const handleExportPdf = async () => {
    const printWin = window.open("", "_blank");
    setExporting(true);
    const data = await fetchFullData();
    if (data.length > 0) {
      const headers = [
        "POSTO", "Booking No", "Qty (ton)", "Tgl Booking", "Produk", "Transportir",
        "Nopol", "Driver", "Posisi", "Security In", "Timbang Kosong", "Tiba Gudang",
        "Pemuatan", "Timbang Isi", "Security Out"
      ];
      const keys = [
        "posto", "bookingno", "qty", "tanggalString", "produkString", "transportString",
        "nopol", "driver", "positionString", "string_timesec", "string_timekosong", "string_timegudang",
        "string_timemuat", "string_timeisi", "string_timeout"
      ];
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(data, headers, keys, `Laporan Realisasi Pemuatan (${filters.SD} s.d ${filters.ED})`, printWin);
    } else {
      printWin?.close();
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const fetcher = async (params: DataTableParams) => {
    try {
      const result = await apiTable("/api/Tiket/DataReport", {
        draw: params.draw,
        start: params.start,
        length: params.length,
        search: params.search || "",
        order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
        SD: filters.SD,
        ED: filters.ED,
        mode: "aktif",
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "bookingno", searchable: false, orderable: false },
          { data: "posto", name: "posto", searchable: true, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "qty", name: "qty", searchable: false, orderable: true },
          { data: "tanggalString", name: "tanggal", searchable: false, orderable: true },
          { data: "produkString", name: "idproduk", searchable: false, orderable: false },
          { data: "transportString", name: "idtransport", searchable: false, orderable: false },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "positionString", name: "position", searchable: false, orderable: true },
          { data: "string_timesec", name: "timesec", searchable: false, orderable: false },
          { data: "string_timekosong", name: "timekosong", searchable: false, orderable: false },
          { data: "string_timegudang", name: "timegudang", searchable: false, orderable: false },
          { data: "string_timemuat", name: "timemuat", searchable: false, orderable: false },
          { data: "string_timeisi", name: "timeisi", searchable: false, orderable: false },
          { data: "string_timeout", name: "timeout", searchable: false, orderable: false },
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

  const columns: DataTableColumn<LoadingRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { key: "posto", header: "POSTO", sortColumn: 1, render: (r) => <span className="font-mono text-xs">{r.posto}</span> },
    { key: "bookingno", header: "Booking No", sortColumn: 2, render: (r) => <span className="font-mono text-xs">{r.bookingno}</span> },
    { key: "qty", header: "Qty (ton)", sortColumn: 3, render: (r) => <span className="text-right block">{r.qty?.toLocaleString("id-ID")}</span> },
    { key: "tanggalString", header: "Tgl Booking", sortColumn: 4, render: (r) => <span className="text-xs">{r.tanggalString}</span> },
    { key: "produkString", header: "Produk", render: (r) => <span>{r.produkString}</span> },
    { key: "transportString", header: "Transportir", render: (r) => <span>{r.transportString}</span> },
    { key: "nopol", header: "Nopol", sortColumn: 7, render: (r) => <span className="font-mono text-xs">{r.nopol}</span> },
    { key: "driver", header: "Driver", sortColumn: 8, render: (r) => <span>{r.driver}</span> },
    { key: "positionString", header: "Posisi", sortColumn: 9, render: (r) => <span className="text-xs">{r.positionString}</span> },
    { key: "string_timesec", header: "Security In", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timesec}</span> },
    { key: "string_timekosong", header: "Timbang Kosong", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timekosong}</span> },
    { key: "string_timegudang", header: "Tiba Gudang", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timegudang}</span> },
    { key: "string_timemuat", header: "Pemuatan", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timemuat}</span> },
    { key: "string_timeisi", header: "Timbang Isi", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timeisi}</span> },
    { key: "string_timeout", header: "Security Out", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timeout}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-6 w-6" />
        <h1 className="text-xl font-bold">Laporan Loading</h1>
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
            queryKey={["report-loading", filters.SD, filters.ED, activeCompanyCode ?? ""]}
            fetcher={fetcher}
            rowKey={(r) => r.bookingno ?? String(r.number)}
            searchPlaceholder="Cari booking no, nopol, driver..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
