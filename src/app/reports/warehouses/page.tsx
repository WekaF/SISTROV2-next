"use client";

import React, { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Warehouse } from "lucide-react";

interface GudangRow {
  number: number;
  ID: string;
  Deskripsi: string;
  KodeGudang: string;
  wilayah: string;
  kabupaten: string;
  alamat: string;
}

export default function LaporanGudangPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();
  const [exporting, setExporting] = useState(false);

  const fetchFullData = async (): Promise<GudangRow[]> => {
    try {
      const result = await apiTable("/api/Data/GudangDataTable", {
        draw: 1,
        start: 0,
        length: 10000,
        search: "",
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "ID", searchable: false, orderable: false },
          { data: "Deskripsi", name: "Deskripsi", searchable: true, orderable: true },
          { data: "KodeGudang", name: "ID", searchable: true, orderable: true },
          { data: "wilayah", name: "wilayah", searchable: true, orderable: true },
          { data: "kabupaten", name: "kabupaten", searchable: true, orderable: true },
          { data: "alamat", name: "alamat", searchable: true, orderable: false },
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
        "Nama Gudang", "Kode", "Wilayah", "Kabupaten", "Alamat"
      ];
      const keys = [
        "Deskripsi", "KodeGudang", "wilayah", "kabupaten", "alamat"
      ];
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(data, headers, keys, `Laporan_Gudang_${new Date().toISOString().slice(0, 10)}`);
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
        "Nama Gudang", "Kode", "Wilayah", "Kabupaten", "Alamat"
      ];
      const keys = [
        "Deskripsi", "KodeGudang", "wilayah", "kabupaten", "alamat"
      ];
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(data, headers, keys, `Laporan Gudang (${new Date().toLocaleDateString("id-ID")})`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const fetcher = async (params: DataTableParams) => {
    try {
      const result = await apiTable("/api/Data/GudangDataTable", {
        draw: params.draw,
        start: params.start,
        length: params.length,
        search: params.search || "",
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "ID", searchable: false, orderable: false },
          { data: "Deskripsi", name: "Deskripsi", searchable: true, orderable: true },
          { data: "KodeGudang", name: "ID", searchable: true, orderable: true },
          { data: "wilayah", name: "wilayah", searchable: true, orderable: true },
          { data: "kabupaten", name: "kabupaten", searchable: true, orderable: true },
          { data: "alamat", name: "alamat", searchable: true, orderable: false },
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

  const columns: DataTableColumn<GudangRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { key: "Deskripsi", header: "Nama Gudang", render: (r) => <span className="font-medium">{r.Deskripsi}</span> },
    { key: "KodeGudang", header: "Kode", render: (r) => <span className="font-mono text-xs">{r.KodeGudang}</span> },
    { key: "wilayah", header: "Wilayah", render: (r) => <span className="text-xs">{r.wilayah}</span> },
    { key: "kabupaten", header: "Kabupaten", render: (r) => <span className="text-xs">{r.kabupaten}</span> },
    { key: "alamat", header: "Alamat", render: (r) => <span className="text-xs">{r.alamat}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Warehouse className="h-6 w-6" />
          <h1 className="text-xl font-bold">Laporan Gudang</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={exporting}
            className="gap-2 text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-emerald-950"
          >
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={exporting}
            className="gap-2 text-rose-600 border-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-400 dark:hover:bg-rose-950"
          >
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["report-gudang", activeCompanyCode ?? ""]}
            fetcher={fetcher}
            rowKey={(r) => r.ID ?? String(r.number)}
            searchPlaceholder="Cari nama gudang, kode, kabupaten..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
