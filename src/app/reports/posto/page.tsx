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
import { Package, Search } from "lucide-react";
import Badge from "@/components/ui/badge/Badge";

interface PostoRow {
  number: number;
  noposto: string;
  tglposto: string;
  tgljatuhtempo: string;
  qty: number;
  produkString: string;
  gudangAsalString: string;
  gudangTujuanString: string;
  tipe: string;
  statusString: string;
}

interface Filters {
  SD: string;
  ED: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function LaporanPostoPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [draft, setDraft] = useState<Filters>({ SD: today, ED: today });
  const [filters, setFilters] = useState<Filters>(draft);
  const [exporting, setExporting] = useState(false);

  const handleTampilkan = () => setFilters({ ...draft });

  const fetchFullData = async (): Promise<PostoRow[]> => {
    try {
      const result = await apiTable("/api/POSTO/DataTable", {
        draw: 1,
        start: 0,
        length: 10000,
        search: "",
        SD: filters.SD,
        ED: filters.ED,
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "noposto", searchable: false, orderable: false },
          { data: "noposto", name: "noposto", searchable: true, orderable: true },
          { data: "tglposto", name: "tglposto", searchable: false, orderable: true },
          { data: "tgljatuhtempo", name: "tgljatuhtempo", searchable: false, orderable: true },
          { data: "qty", name: "qty", searchable: false, orderable: true },
          { data: "produkString", name: "idproduk", searchable: false, orderable: false },
          { data: "gudangAsalString", name: "asal", searchable: false, orderable: false },
          { data: "gudangTujuanString", name: "tujuan", searchable: true, orderable: false },
          { data: "tipe", name: "tipe", searchable: false, orderable: true },
          { data: "statusString", name: "status", searchable: false, orderable: false },
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
        "No POSTO", "Tgl POSTO", "Jatuh Tempo", "Qty (ton)", "Produk", "Asal", "Tujuan", "Tipe", "Status"
      ];
      const keys = [
        "noposto", "tglposto", "tgljatuhtempo", "qty", "produkString", "gudangAsalString", "gudangTujuanString", "tipe", "statusString"
      ];
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(data, headers, keys, `Laporan_POSTO_${filters.SD}_${filters.ED}`);
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
        "No POSTO", "Tgl POSTO", "Jatuh Tempo", "Qty (ton)", "Produk", "Asal", "Tujuan", "Tipe", "Status"
      ];
      const keys = [
        "noposto", "tglposto", "tgljatuhtempo", "qty", "produkString", "gudangAsalString", "gudangTujuanString", "tipe", "statusString"
      ];
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(data, headers, keys, `Laporan POSTO (${filters.SD} s.d ${filters.ED})`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const fetcher = async (params: DataTableParams) => {
    try {
      const result = await apiTable("/api/POSTO/DataTable", {
        draw: params.draw,
        start: params.start,
        length: params.length,
        search: params.search || "",
        SD: filters.SD,
        ED: filters.ED,
        company: activeCompanyCode || "",
        order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
        columns: [
          { data: "number", name: "noposto", searchable: false, orderable: false },
          { data: "noposto", name: "noposto", searchable: true, orderable: true },
          { data: "tglposto", name: "tglposto", searchable: false, orderable: true },
          { data: "tgljatuhtempo", name: "tgljatuhtempo", searchable: false, orderable: true },
          { data: "qty", name: "qty", searchable: false, orderable: true },
          { data: "produkString", name: "idproduk", searchable: false, orderable: false },
          { data: "gudangAsalString", name: "asal", searchable: false, orderable: false },
          { data: "gudangTujuanString", name: "tujuan", searchable: true, orderable: false },
          { data: "tipe", name: "tipe", searchable: false, orderable: true },
          { data: "statusString", name: "status", searchable: false, orderable: false },
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

  const columns: DataTableColumn<PostoRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { 
      key: "noposto", 
      header: "No POSTO", 
      sortColumn: 1, 
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs">{r.noposto}</span>
          {((r as any).percepatan && String((r as any).percepatan).toUpperCase().includes("PERCEPATAN")) && (
            <Badge color="warning" size="sm" variant="light" className="w-fit font-bold text-[9px] uppercase px-1.5 py-0 h-4 mt-1">
              Percepatan
            </Badge>
          )}
        </div>
      )
    },
    { key: "tglposto", header: "Tgl POSTO", sortColumn: 2, render: (r) => <span className="text-xs">{r.tglposto}</span> },
    { key: "tgljatuhtempo", header: "Jatuh Tempo", sortColumn: 3, render: (r) => <span className="text-xs">{r.tgljatuhtempo}</span> },
    { key: "qty", header: "Qty (ton)", sortColumn: 4, render: (r) => <span className="text-right block">{r.qty?.toLocaleString("id-ID")}</span> },
    { key: "produkString", header: "Produk", render: (r) => <span>{r.produkString}</span> },
    { key: "gudangAsalString", header: "Asal", render: (r) => <span className="text-xs">{r.gudangAsalString}</span> },
    { key: "gudangTujuanString", header: "Tujuan", render: (r) => <span className="text-xs">{r.gudangTujuanString}</span> },
    { key: "tipe", header: "Tipe", sortColumn: 8, render: (r) => <span className="text-xs">{r.tipe}</span> },
    { key: "statusString", header: "Status", render: (r) => <span className="text-xs">{r.statusString}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-6 w-6" />
        <h1 className="text-xl font-bold">Laporan POSTO</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tanggal POSTO Mulai</Label>
              <Input
                type="date"
                className="w-36"
                value={draft.SD}
                onChange={(e) => setDraft((p) => ({ ...p, SD: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal POSTO Akhir</Label>
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
            queryKey={["report-posto", filters.SD, filters.ED, activeCompanyCode ?? ""]}
            fetcher={fetcher}
            rowKey={(r) => r.noposto ?? String(r.number)}
            searchPlaceholder="Cari no posto, produk, tujuan..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
