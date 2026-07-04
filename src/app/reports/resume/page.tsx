"use client";

import React, { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Search } from "lucide-react";

interface ResumeRow {
  number: number;
  bookingno: string;
  posto: string;
  tanggalString: string;
  nopol: string;
  driver: string;
  produkString: string;
  qty: number;
  asal: string;
  tujuan: string;
  positionString: string;
}

interface Filters {
  SD: string;
  ED: string;
}

const today = new Date().toISOString().slice(0, 10);
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

export default function ResumeBookingPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [draft, setDraft] = useState<Filters>({ SD: sevenDaysAgo, ED: today });
  const [filters, setFilters] = useState<Filters>(draft);
  const [exporting, setExporting] = useState(false);

  const handleTampilkan = () => setFilters({ ...draft });

  const fetchFullData = async (): Promise<ResumeRow[]> => {
    try {
      const result = await apiTable("/api/Tiket/DataReport", {
        draw: 1,
        start: 0,
        length: 10000,
        search: "",
        SD: filters.SD,
        ED: filters.ED,
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "bookingno", searchable: false, orderable: false },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "posto", name: "posto", searchable: true, orderable: true },
          { data: "tanggalString", name: "tanggal", searchable: false, orderable: true },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "produkString", name: "idproduk", searchable: false, orderable: false },
          { data: "qty", name: "qty", searchable: false, orderable: true },
          { data: "asal", name: "bookingno", searchable: false, orderable: false },
          { data: "tujuan", name: "bookingno", searchable: false, orderable: false },
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
        "Booking No", "POSTO", "Tgl Booking", "Nopol", "Driver", "Produk", "Qty (ton)", "Asal", "Tujuan", "Status"
      ];
      const keys = [
        "bookingno", "posto", "tanggalString", "nopol", "driver", "produkString", "qty", "asal", "tujuan", "positionString"
      ];
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(data, headers, keys, `Resume_Booking_${filters.SD}_${filters.ED}`);
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
        "Booking No", "POSTO", "Tgl Booking", "Nopol", "Driver", "Produk", "Qty (ton)", "Asal", "Tujuan", "Status"
      ];
      const keys = [
        "bookingno", "posto", "tanggalString", "nopol", "driver", "produkString", "qty", "asal", "tujuan", "positionString"
      ];
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(data, headers, keys, `Resume Booking Tiket (${filters.SD} s.d ${filters.ED})`, printWin);
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
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "bookingno", searchable: false, orderable: false },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "posto", name: "posto", searchable: true, orderable: true },
          { data: "tanggalString", name: "tanggal", searchable: false, orderable: true },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "produkString", name: "idproduk", searchable: false, orderable: false },
          { data: "qty", name: "qty", searchable: false, orderable: true },
          { data: "asal", name: "bookingno", searchable: false, orderable: false },
          { data: "tujuan", name: "bookingno", searchable: false, orderable: false },
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

  const columns: DataTableColumn<ResumeRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { key: "bookingno", header: "Booking No", sortColumn: 1, render: (r) => <span className="font-mono text-xs">{r.bookingno}</span> },
    { key: "posto", header: "POSTO", sortColumn: 2, render: (r) => <span className="font-mono text-xs">{r.posto}</span> },
    { key: "tanggalString", header: "Tgl Booking", sortColumn: 3, render: (r) => <span className="text-xs">{r.tanggalString}</span> },
    { key: "nopol", header: "Nopol", sortColumn: 4, render: (r) => <span className="font-mono text-xs">{r.nopol}</span> },
    { key: "driver", header: "Driver", sortColumn: 5, render: (r) => <span>{r.driver}</span> },
    { key: "produkString", header: "Produk", render: (r) => <span>{r.produkString}</span> },
    { key: "qty", header: "Qty (ton)", sortColumn: 7, render: (r) => <span className="text-right block">{r.qty?.toLocaleString("id-ID")}</span> },
    { key: "asal", header: "Asal", render: (r) => <span className="text-xs">{r.asal}</span> },
    { key: "tujuan", header: "Tujuan", render: (r) => <span className="text-xs">{r.tujuan}</span> },
    { key: "positionString", header: "Status", sortColumn: 10, render: (r) => <span className="text-xs">{r.positionString}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6" />
        <h1 className="text-xl font-bold">Resume Booking Tiket</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Mulai</Label>
              <Input
                type="date"
                className="w-36"
                value={draft.SD}
                onChange={(e) => setDraft((p) => ({ ...p, SD: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Akhir</Label>
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
            queryKey={["report-resume", filters.SD, filters.ED, activeCompanyCode ?? ""]}
            fetcher={fetcher}
            rowKey={(r) => r.bookingno ?? String(r.number)}
            searchPlaceholder="Cari booking no, nopol, driver..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
