"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Search } from "lucide-react";

interface TiketPiRow {
  number: number;
  posto: string;
  tanggalPOSTO: string;
  qtyPOSTO: number;
  bookingno: string;
  qty: number;
  tanggalString: string;
  shift: string;
  produkString: string;
  transportString: string;
  asal: string;
  tujuan: string;
  Kabupaten: string;
  nopol: string;
  driver: string;
  donumber: string;
  statuspemuatan: string;
  positionString: string;
  string_timesec: string;
  string_timekosong: string;
  string_timegudang: string;
  string_timemuat: string;
  string_timeisi: string;
  string_timeout: string;
  updatedonString: string;
}

interface CompanyOption {
  id: number;
  code: string;
  name: string;
}

interface Filters {
  company: string;
  SD: string;
  ED: string;
  SDMuat: string;
  EDMuat: string;
  position: string;
  tiketstatus: string;
}

const POSITIONS = [
  { value: "", label: "Semua Posisi" },
  { value: "00", label: "Tiket Siap Dicetak" },
  { value: "01", label: "Security Pass" },
  { value: "02", label: "Timbang Kosong" },
  { value: "03", label: "Tiba di Gudang" },
  { value: "04", label: "Checkout Gudang" },
  { value: "05", label: "Timbang Isi" },
  { value: "06", label: "Checkout SPPT" },
  { value: "07", label: "Checkout Security" },
];

const EXPORT_HEADERS = [
  "No", "POSTO", "Tgl POSTO", "Tonase POSTO", "Kode SISTRO (Booking)",
  "Tonase", "Tgl Booking", "Shift", "Produk", "Transportir",
  "Asal", "Tujuan", "Kabupaten", "Nopol", "Driver",
  "Status Muat", "Posisi", "Security In", "Timbang Kosong",
  "Tiba Gudang", "Pemuatan", "Timbang Isi", "Security Out",
  "Tgl Muat", "Nomor DO",
];

const EXPORT_KEYS: (keyof TiketPiRow)[] = [
  "number", "posto", "tanggalPOSTO", "qtyPOSTO", "bookingno",
  "qty", "tanggalString", "shift", "produkString", "transportString",
  "asal", "tujuan", "Kabupaten", "nopol", "driver",
  "statuspemuatan", "positionString", "string_timesec", "string_timekosong",
  "string_timegudang", "string_timemuat", "string_timeisi", "string_timeout",
  "updatedonString", "donumber",
];

const today = new Date().toISOString().slice(0, 10);

const buildBody = (params: DataTableParams, f: Filters): string => {
  const body = new URLSearchParams();
  body.set("draw", String(params.draw));
  body.set("start", String(params.start));
  body.set("length", String(params.length));
  body.set("search[value]", params.search || "");
  body.set("order[0][column]", "0");
  body.set("order[0][dir]", "desc");
  body.set("columns[0][name]", "tanggal");
  if (f.company) body.set("company", f.company);
  if (f.SD) body.set("SD", f.SD);
  if (f.ED) body.set("ED", f.ED);
  if (f.SDMuat) body.set("SDMuat", f.SDMuat);
  if (f.EDMuat) body.set("EDMuat", f.EDMuat);
  if (f.position) body.set("position", f.position);
  if (f.tiketstatus) body.set("tiketstatus", f.tiketstatus);
  return body.toString();
};

export default function LaporanTiketPiPage() {
  const { addToast } = useToast();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [draft, setDraft] = useState<Filters>({
    company: "",
    SD: today,
    ED: today,
    SDMuat: "",
    EDMuat: "",
    position: "",
    tiketstatus: "",
  });
  const [filters, setFilters] = useState<Filters>(draft);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/companies/lookup")
      .then((r) => r.json())
      .then((data: CompanyOption[]) => setCompanies(data))
      .catch(() => { setCompanies([]); });
  }, []);

  const handleTampilkan = () => setFilters({ ...draft });

  const fetcher = async (params: DataTableParams) => {
    try {
      const res = await fetch("/api/tiket/report-pi", {
        method: "POST",
        body: buildBody(params, filters),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      return {
        data: (result.data ?? []) as TiketPiRow[],
        recordsTotal: result.recordsTotal ?? 0,
        recordsFiltered: result.recordsFiltered ?? result.recordsTotal ?? 0,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast({ title: "Gagal memuat data", description: msg, variant: "destructive" });
      throw err;
    }
  };

  const fetchFullData = async (): Promise<TiketPiRow[]> => {
    try {
      const res = await fetch("/api/tiket/report-pi", {
        method: "POST",
        body: buildBody({ draw: 1, start: 0, length: 10000, search: "" }, filters),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      return (result.data ?? []) as TiketPiRow[];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast({ title: "Gagal memuat data export", description: msg, variant: "destructive" });
      return [];
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    const data = await fetchFullData();
    if (data.length > 0) {
      const { exportToExcel } = await import("@/lib/export-helper");
      exportToExcel(data, EXPORT_HEADERS, EXPORT_KEYS as string[], `Laporan_TiketPI_${filters.SD}_${filters.ED}`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    const data = await fetchFullData();
    if (data.length > 0) {
      const { exportToPdf } = await import("@/lib/export-helper");
      exportToPdf(data, EXPORT_HEADERS, EXPORT_KEYS as string[], `Laporan Tiket PI (${filters.SD} s.d ${filters.ED})`);
    } else {
      addToast({ title: "Tidak ada data", description: "Tidak ada data untuk diexport", variant: "destructive" });
    }
    setExporting(false);
  };

  const columns: DataTableColumn<TiketPiRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { key: "posto", header: "POSTO", render: (r) => <span className="font-mono text-xs">{r.posto}</span> },
    { key: "tanggalPOSTO", header: "Tgl POSTO", render: (r) => <span className="text-xs">{r.tanggalPOSTO}</span> },
    { key: "qtyPOSTO", header: "Tonase POSTO", render: (r) => <span className="text-right block">{r.qtyPOSTO?.toLocaleString("id-ID")}</span> },
    { key: "bookingno", header: "Kode SISTRO", render: (r) => <span className="font-mono text-xs font-bold">{r.bookingno}</span> },
    { key: "qty", header: "Tonase", render: (r) => <span className="text-right block">{r.qty?.toLocaleString("id-ID")}</span> },
    { key: "tanggalString", header: "Tgl Booking", render: (r) => <span className="text-xs">{r.tanggalString}</span> },
    { key: "shift", header: "Shift", render: (r) => <span>{r.shift}</span> },
    { key: "produkString", header: "Produk", render: (r) => <span>{r.produkString}</span> },
    { key: "transportString", header: "Transportir", render: (r) => <span>{r.transportString}</span> },
    { key: "asal", header: "Asal", render: (r) => <span>{r.asal}</span> },
    { key: "tujuan", header: "Tujuan", render: (r) => <span>{r.tujuan}</span> },
    { key: "Kabupaten", header: "Kabupaten", render: (r) => <span>{r.Kabupaten}</span> },
    { key: "nopol", header: "Nopol", render: (r) => <span className="font-mono text-xs">{r.nopol}</span> },
    { key: "driver", header: "Driver", render: (r) => <span>{r.driver}</span> },
    { key: "statuspemuatan", header: "Status Muat", render: (r) => <span className="text-xs">{r.statuspemuatan}</span> },
    { key: "positionString", header: "Posisi", render: (r) => <span className="text-xs">{r.positionString}</span> },
    { key: "string_timesec", header: "Security In", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timesec}</span> },
    { key: "string_timekosong", header: "Timbang Kosong", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timekosong}</span> },
    { key: "string_timegudang", header: "Tiba Gudang", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timegudang}</span> },
    { key: "string_timemuat", header: "Pemuatan", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timemuat}</span> },
    { key: "string_timeisi", header: "Timbang Isi", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timeisi}</span> },
    { key: "string_timeout", header: "Security Out", render: (r) => <span className="text-xs whitespace-nowrap">{r.string_timeout}</span> },
    { key: "updatedonString", header: "Tgl Muat", render: (r) => <span className="text-xs">{r.updatedonString}</span> },
    { key: "donumber", header: "Nomor DO", render: (r) => <span className="font-mono text-xs">{r.donumber}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6" />
        <div>
          <h1 className="text-xl font-bold">Laporan Tiket PI</h1>
          <p className="text-sm text-muted-foreground">Realisasi Pemuatan (Security In s.d Security Out)</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Perusahaan</Label>
              <select
                className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={draft.company}
                onChange={(e) => setDraft((p) => ({ ...p, company: e.target.value }))}
              >
                <option value="">Semua Perusahaan</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
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
            <div className="space-y-1">
              <Label className="text-xs">Tgl Muat Mulai</Label>
              <Input
                type="date"
                className="w-36"
                value={draft.SDMuat}
                onChange={(e) => setDraft((p) => ({ ...p, SDMuat: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tgl Muat Akhir</Label>
              <Input
                type="date"
                className="w-36"
                value={draft.EDMuat}
                onChange={(e) => setDraft((p) => ({ ...p, EDMuat: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Posisi</Label>
              <select
                className="flex h-9 w-44 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                value={draft.position}
                onChange={(e) => setDraft((p) => ({ ...p, position: e.target.value }))}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos.value} value={pos.value}>{pos.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status Tiket</Label>
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
            queryKey={["report-tiket-pi", filters.company, filters.SD, filters.ED, filters.SDMuat, filters.EDMuat, filters.position, filters.tiketstatus]}
            fetcher={fetcher}
            rowKey={(r) => r.bookingno ?? String(r.number)}
            searchPlaceholder="Cari kode SISTRO, nopol, driver..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
