"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";

interface ArmadaRow {
  number: number;
  nopol: string;
  transportString: string;
  sumbu: string;
  jeniskendaraan: string;
  qtymax: number;
  status_armada: string;
  masa_berlaku_kir_string: string;
  keterangan: string;
}

export default function LaporanArmadaPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();
  const [exporting, setExporting] = useState(false);

  const fetchFullData = async (): Promise<ArmadaRow[]> => {
    try {
      const result = await apiTable("/api/Armada/DataTable", {
        draw: 1,
        start: 0,
        length: 10000,
        search: "",
        company: activeCompanyCode || "",
        columns: [
          { data: "number", name: "nopol", searchable: false, orderable: false },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "transportString", name: "idtransport", searchable: true, orderable: true },
          { data: "sumbu", name: "sumbu", searchable: false, orderable: true },
          { data: "jeniskendaraan", name: "jeniskendaraan", searchable: false, orderable: true },
          { data: "qtymax", name: "qtymax", searchable: false, orderable: true },
          { data: "status_armada", name: "status_armada", searchable: false, orderable: true },
          { data: "masa_berlaku_kir_string", name: "masa_berlaku_kir", searchable: false, orderable: true },
          { data: "keterangan", name: "kir", searchable: false, orderable: false },
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
        "Nopol", "Transportir", "Sumbu", "Jenis", "Qty Max (ton)", "Status", "Berlaku KIR s.d.", "Ket KIR"
      ];
      const keys = [
        "nopol", "transportString", "sumbu", "jeniskendaraan", "qtymax", "status_armada", "masa_berlaku_kir_string", "keterangan"
      ];
      const formattedData = data.map(item => ({
        ...item,
        status_armada: item.status_armada === "1" ? "Aktif" : "Nonaktif"
      }));
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(formattedData, headers, keys, `Laporan_Armada_${new Date().toISOString().slice(0, 10)}`);
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
        "Nopol", "Transportir", "Sumbu", "Jenis", "Qty Max (ton)", "Status", "Berlaku KIR s.d.", "Ket KIR"
      ];
      const keys = [
        "nopol", "transportString", "sumbu", "jeniskendaraan", "qtymax", "status_armada", "masa_berlaku_kir_string", "keterangan"
      ];
      const formattedData = data.map(item => ({
        ...item,
        status_armada: item.status_armada === "1" ? "Aktif" : "Nonaktif"
      }));
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(formattedData, headers, keys, `Laporan Armada (${new Date().toLocaleDateString("id-ID")})`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };


  const fetcher = async (params: DataTableParams) => {
    try {
      const result = await apiTable("/api/Armada/DataTable", {
        draw: params.draw,
        start: params.start,
        length: params.length,
        search: params.search || "",
        company: activeCompanyCode || "",
        order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
        columns: [
          { data: "number", name: "nopol", searchable: false, orderable: false },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "transportString", name: "idtransport", searchable: true, orderable: true },
          { data: "sumbu", name: "sumbu", searchable: false, orderable: true },
          { data: "jeniskendaraan", name: "jeniskendaraan", searchable: false, orderable: true },
          { data: "qtymax", name: "qtymax", searchable: false, orderable: true },
          { data: "status_armada", name: "status_armada", searchable: false, orderable: true },
          { data: "masa_berlaku_kir_string", name: "masa_berlaku_kir", searchable: false, orderable: true },
          { data: "keterangan", name: "kir", searchable: false, orderable: false },
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

  const columns: DataTableColumn<ArmadaRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { key: "nopol", header: "Nopol", sortColumn: 1, render: (r) => <span className="font-mono text-xs font-bold">{r.nopol}</span> },
    { key: "transportString", header: "Transportir", sortColumn: 2, render: (r) => <span>{r.transportString}</span> },
    { key: "sumbu", header: "Sumbu", sortColumn: 3, render: (r) => <span className="text-xs">{r.sumbu}</span> },
    { key: "jeniskendaraan", header: "Jenis", sortColumn: 4, render: (r) => <span className="text-xs">{r.jeniskendaraan}</span> },
    { key: "qtymax", header: "Qty Max (ton)", sortColumn: 5, render: (r) => <span className="text-right block">{r.qtymax?.toLocaleString("id-ID")}</span> },
    {
      key: "status_armada",
      header: "Status",
      sortColumn: 6,
      render: (r) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status_armada === "1" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {r.status_armada === "1" ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    { key: "masa_berlaku_kir_string", header: "Berlaku KIR s.d.", sortColumn: 7, render: (r) => <span className="text-xs whitespace-nowrap">{r.masa_berlaku_kir_string}</span> },
    { key: "keterangan", header: "Ket KIR", render: (r) => <span className="text-xs">{r.keterangan}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6" />
          <h1 className="text-xl font-bold">Laporan Armada</h1>
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
            queryKey={["report-armada", activeCompanyCode ?? ""]}
            fetcher={fetcher}
            rowKey={(r) => r.nopol ?? String(r.number)}
            searchPlaceholder="Cari nopol, transportir..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
