"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search } from "lucide-react";

interface BookingRow {
  number: number;
  posto: string;
  tanggalPOSTO: string;
  bookingno: string;
  qty: number;
  tanggalString: string;
  shift: string;
  produkString: string;
  transportString: string;
  asal: string;
  tujuan: string;
  nopol: string;
  driver: string;
  statuspemuatan: string;
  positionString: string;
}

interface Filters {
  SD: string;
  ED: string;
  tiketstatus: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function LaporanBookingPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [draft, setDraft] = useState<Filters>({ SD: today, ED: today, tiketstatus: "" });
  const [filters, setFilters] = useState<Filters>(draft);
  const [exporting, setExporting] = useState(false);

  const handleTampilkan = () => setFilters({ ...draft });

  const fetchFullData = async (): Promise<BookingRow[]> => {
    try {
      const result = await apiTable("/api/Tiket/DataReport", {
        draw: 1,
        start: 0,
        length: 10000,
        search: "",
        SD: filters.SD,
        ED: filters.ED,
        tiketstatus: filters.tiketstatus,
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "bookingno", searchable: false, orderable: false },
          { data: "posto", name: "posto", searchable: true, orderable: true },
          { data: "tanggalPOSTO", name: "tanggal", searchable: false, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "qty", name: "qty", searchable: false, orderable: true },
          { data: "tanggalString", name: "tanggal", searchable: false, orderable: true },
          { data: "shift", name: "bookingno", searchable: false, orderable: false },
          { data: "produkString", name: "idproduk", searchable: false, orderable: true },
          { data: "transportString", name: "idtransport", searchable: false, orderable: false },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "asal", name: "bookingno", searchable: false, orderable: false },
          { data: "tujuan", name: "bookingno", searchable: false, orderable: false },
          { data: "statuspemuatan", name: "statuspemuatan", searchable: false, orderable: false },
          { data: "positionString", name: "position", searchable: false, orderable: true },
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
        "POSTO", "Tgl POSTO", "Booking No", "Qty (ton)", "Tgl Booking",
        "Shift", "Produk", "Transportir", "Nopol", "Driver", "Asal", "Tujuan", "Status Muat", "Posisi"
      ];
      const keys = [
        "posto", "tanggalPOSTO", "bookingno", "qty", "tanggalString",
        "shift", "produkString", "transportString", "nopol", "driver", "asal", "tujuan", "statuspemuatan", "positionString"
      ];
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(data, headers, keys, `Laporan_Booking_${filters.SD}_${filters.ED}`);
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
        "POSTO", "Tgl POSTO", "Booking No", "Qty (ton)", "Tgl Booking",
        "Shift", "Produk", "Transportir", "Nopol", "Driver", "Asal", "Tujuan", "Status Muat", "Posisi"
      ];
      const keys = [
        "posto", "tanggalPOSTO", "bookingno", "qty", "tanggalString",
        "shift", "produkString", "transportString", "nopol", "driver", "asal", "tujuan", "statuspemuatan", "positionString"
      ];
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(data, headers, keys, `Laporan Booking (${filters.SD} s.d ${filters.ED})`);
    } else {
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
        SD: filters.SD,
        ED: filters.ED,
        tiketstatus: filters.tiketstatus,
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "bookingno", searchable: false, orderable: false },
          { data: "posto", name: "posto", searchable: true, orderable: true },
          { data: "tanggalPOSTO", name: "tanggal", searchable: false, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "qty", name: "qty", searchable: false, orderable: true },
          { data: "tanggalString", name: "tanggal", searchable: false, orderable: true },
          { data: "shift", name: "bookingno", searchable: false, orderable: false },
          { data: "produkString", name: "idproduk", searchable: false, orderable: true },
          { data: "transportString", name: "idtransport", searchable: false, orderable: false },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "asal", name: "bookingno", searchable: false, orderable: false },
          { data: "tujuan", name: "bookingno", searchable: false, orderable: false },
          { data: "statuspemuatan", name: "statuspemuatan", searchable: false, orderable: false },
          { data: "positionString", name: "position", searchable: false, orderable: true },
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

  const columns: DataTableColumn<BookingRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { key: "posto", header: "POSTO", render: (r) => <span className="font-mono text-xs">{r.posto}</span> },
    { key: "tanggalPOSTO", header: "Tgl POSTO", render: (r) => <span className="text-xs">{r.tanggalPOSTO}</span> },
    { key: "bookingno", header: "Booking No", render: (r) => <span className="font-mono text-xs">{r.bookingno}</span> },
    { key: "qty", header: "Qty (ton)", render: (r) => <span className="text-right block">{r.qty?.toLocaleString("id-ID")}</span> },
    { key: "tanggalString", header: "Tgl Booking", render: (r) => <span className="text-xs">{r.tanggalString}</span> },
    { key: "shift", header: "Shift", render: (r) => <span>{r.shift}</span> },
    { key: "produkString", header: "Produk", render: (r) => <span>{r.produkString}</span> },
    { key: "transportString", header: "Transportir", render: (r) => <span>{r.transportString}</span> },
    { key: "nopol", header: "Nopol", render: (r) => <span className="font-mono text-xs">{r.nopol}</span> },
    { key: "driver", header: "Driver", render: (r) => <span>{r.driver}</span> },
    { key: "asal", header: "Asal", render: (r) => <span className="text-xs">{r.asal}</span> },
    { key: "tujuan", header: "Tujuan", render: (r) => <span className="text-xs">{r.tujuan}</span> },
    { key: "statuspemuatan", header: "Status Muat", render: (r) => <span className="text-xs">{r.statuspemuatan}</span> },
    { key: "positionString", header: "Posisi", render: (r) => <span className="text-xs">{r.positionString}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6" />
        <h1 className="text-xl font-bold">Laporan Booking</h1>
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
              <label className="text-xs text-muted-foreground">Status Tiket</label>
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
            queryKey={["report-booking", filters.SD, filters.ED, filters.tiketstatus, activeCompanyCode ?? ""]}
            fetcher={fetcher}
            rowKey={(r) => r.bookingno ?? String(r.number)}
            searchPlaceholder="Cari booking no, nopol, driver..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
