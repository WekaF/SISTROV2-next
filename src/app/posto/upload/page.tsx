"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Table as TableIcon,
  Save,
  Info,
  XCircle,
  Clock,
  Truck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import * as XLSX from 'xlsx';
import { useApi } from "@/hooks/use-api";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// --- Interfaces ---

interface PostoImportCheckView {
  guid: string;
  noposto: string;
  tglposto: string;         // "2026/04/07"
  tglpostoString: string;   // "07 April 2026"
  asal: string;             // kode asal
  asal_des: string;         // deskripsi asal
  tujuan: string;
  tujuan_des: string;
  transport: string;
  transport_des: string;
  distributor: string;
  distributor_des: string;
  produk: string;
  produkString: string;
  qty: number;
  qtyString: string;
  status: string;
  uploadcode: string;
  tglakhir: string;
  tglakhirString: string;
  tgljatuhtempo: string;
  tanggaljatuhtempoString: string;
  bagian: string;
  wilayah: string;
  company_code: string;
  tipe: string;             // "POALL" | "SOALL" | "POCLUSTER" | "SOCLUSTER"
  charter: string;
  percepatan: number;       // 0 atau 1
  gruptruk: string;
  kapal: string;
  kotatujuan: string;
  // Validation flags:
  cekTransportir: number;   // > 0 = valid
  cekAsal: number;          // > 0 = valid
  cekTujuan: number;        // > 0 = valid
  cekDistributor: number;   // > 0 = valid (hanya SO)
  cekSO: number;            // > 0 = company boleh upload SO
  duplicate: number;        // > 0 = sudah ada di DB
  // Percepatan period:
  validfrom: string;        // "2026/04/01"
  validto: string;          // "2026/04/30"
  // Notif data:
  token: string;
  transport_username: string;
  transport_phoneNumber: string;
  company_des: string;
  initialqty: number;
  qtyrencana: number;
  qtyrealisasi: number;
  pallet: number;
  cutoff: number;
  selisihcutoff: number;
}

// --- Helper Functions ---

function formatTanggal(str: any): string {
  if (!str) return "";
  const s = String(str).trim();

  // Pattern 1: dd/MM/yyyy atau dd-MM-yyyy
  const p1 = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
  // Pattern 2: yyyy/MM/dd atau yyyy-MM-dd
  const p2 = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;

  let formatted = s;
  if (p1.test(s)) {
    const match = s.match(p1);
    if (match) {
      const [_, d, m, y] = match;
      formatted = `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
    }
  } else if (p2.test(s)) {
    const match = s.match(p2);
    if (match) {
      const [_, y, m, d] = match;
      formatted = `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
    }
  }

  // Convert to yyyy/MM/dd for server
  try {
    const date = new Date(formatted);
    if (isNaN(date.getTime())) return s;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    return s;
  }
}

function parseQty(val: any): string {
  if (val === undefined || val === null) return "0";
  let s = String(val).replace(/,/g, '.'); // Handle comma as decimal point
  const num = parseFloat(s);
  return isNaN(num) ? "0" : num.toString();
}

// --- Main Component ---

export default function PostoUploadPage() {
  const { data: session } = useSession();
  const { apiJson, apiFetch, token } = useApi();

  const [file, setFile] = useState<File | null>(null);
  const [selectedWilayah, setSelectedWilayah] = useState("");
  const [wilayahOptions, setWilayahOptions] = useState<{ abbrev: string; keterangan: string }[]>([]);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<{ status: string; uploadcode: string; listposto: PostoImportCheckView[] } | null>(null);
  const [uploadcode, setUploadcode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState({ sukses: 0, gagal: 0 });
  const [submitDone, setSubmitDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Wilayah Options
  useEffect(() => {
    if (!token) return;
    const fetchWilayah = async () => {
      try {
        let data = await apiJson('/api/Wilayah/DataMappingPOSTO');
        // Fallback to all regions if DataMappingPOSTO returns empty list (e.g. for SuperAdmin/TI or unmapped scopes)
        if (Array.isArray(data) && data.length === 0) {
          data = await apiJson('/api/Wilayah/DataForMapping');
        }
        if (Array.isArray(data)) setWilayahOptions(data);
      } catch (err) {
        console.error("Failed to load wilayah options", err);
      }
    };
    fetchWilayah();
  }, [apiJson, token]);

  // Step 1: Parse Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setSubmitDone(false);
    setValidationResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'array', raw: false });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const rows = data.map((row: any) => {
        const isSO = !!(row.NoSO || row.TglSO);
        const mapped: any = { ...row };

        if (isSO) {
          if (!mapped.NoPOSTO) mapped.NoPOSTO = row.NoSO;
          if (!mapped.TglPOSTO) mapped.TglPOSTO = row.TglSO;
          if (!mapped.distributor) mapped.distributor = row.Trans;
          if (!mapped.Tujuan) mapped.Tujuan = row.Asal;
        }

        return {
          noPOSTO: String(mapped.NoPOSTO || "").trim(),
          tglPOSTO: formatTanggal(mapped.TglPOSTO),
          Asal: String(mapped.Asal || "").trim(),
          Tujuan: String(mapped.Tujuan || "").trim(),
          Trans: String(mapped.Trans || "").trim(),
          Produk: String(mapped.Produk || "").trim(),
          Qty: parseQty(mapped.Qty),
          status: String(mapped.status || "1"),
          tglAkhir: formatTanggal(mapped.tglakhir || mapped.TglPOSTO),
          tglJatuhTempo: formatTanggal(mapped.tgljatuhtempo || mapped.TglPOSTO),
          charter: String(mapped.charter || "0"),
          percepatan: mapped.percepatan ?? 0,
          gruptruk: String(mapped.idsumbu || mapped.GrupTruk || "0"),
          kapal: String(mapped.kapal || ""),
          distributor: String(mapped.distributor || ""),
        };
      });

      // Simple client-side check
      const validInitialRows = rows.filter(r => r.noPOSTO && r.tglPOSTO && r.Trans && r.Produk);
      setParsedRows(validInitialRows);

      if (validInitialRows.length > 0 && selectedWilayah) {
        triggerValidation(validInitialRows, selectedWilayah);
      } else if (!selectedWilayah) {
        alert("Pilih wilayah terlebih dahulu");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Step 2: POST to /POSTO/checkUpload
  const triggerValidation = async (rows: any[], wilayah: string) => {
    setIsValidating(true);
    try {
      const params = new URLSearchParams();
      rows.forEach((row, i) => {
        Object.entries(row).forEach(([k, v]) => {
          params.append(`postoData[${i}][${k}]`, String(v ?? ""));
        });
      });
      params.append("company", wilayah);
      params.append("status", "upload");
      params.append("uploadcode", "");

      const res = await apiFetch("/POSTO/checkUpload", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });

      if (!res.ok) throw new Error("Gagal validasi server");

      const result = await res.json();
      setValidationResult(result);
      setUploadcode(result.uploadcode);

      // Count success/fail
      let sukses = 0;
      let gagal = 0;
      result.listposto.forEach((item: PostoImportCheckView) => {
        if (isRowError(item)) gagal++;
        else sukses++;
      });
      setSummary({ sukses, gagal });

    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat validasi");
    } finally {
      setIsValidating(false);
    }
  };

  const isRowError = (item: PostoImportCheckView) => {
    const isSO = item.tipe === "SOALL" || item.tipe === "SOCLUSTER";
    const now = new Date();
    const jatuhTempo = new Date(item.tgljatuhtempo);

    const hasFatalError =
      item.cekTransportir <= 0 ||
      item.cekAsal <= 0 ||
      item.cekTujuan <= 0 ||
      item.qty <= 0 ||
      item.produkString === "" ||
      item.duplicate > 0 ||
      jatuhTempo < now;

    if (isSO) {
      return hasFatalError || item.cekDistributor <= 0 || item.cekSO <= 0;
    }

    // Percepatan check
    if (item.percepatan === 1 && item.validfrom && item.validto) {
      const tgl = new Date(item.tglposto);
      const from = new Date(item.validfrom);
      const to = new Date(item.validto);
      if (tgl < from || tgl > to) return true;
    }

    return hasFatalError;
  };

  // Step 4: Submit
  const handleSubmit = async () => {
    if (!validationResult) return;

    const validRows = validationResult.listposto.filter(item => !isRowError(item));
    if (validRows.length === 0) {
      alert("Tidak ada data valid untuk disimpan");
      return;
    }

    setIsSubmitting(true);
    try {
      const params = new URLSearchParams();
      validRows.forEach((item, i) => {
        const payload: any = {
          guid: item.guid,
          noposto: item.noposto,
          tglposto: item.tglposto,
          tgljatuhtempo: item.tgljatuhtempo,
          asal: item.asal,
          tujuan: item.tujuan,
          transport: item.transport,
          transport_des: item.transport_des,
          distributor: item.distributor,
          distributor_des: item.distributor_des,
          produk: item.produk,
          qty: item.qty,
          status: item.status,
          updatedon: new Date().toISOString(),
          updatedby: (session?.user as any)?.id || "system",
          uploadcode: item.uploadcode || uploadcode,
          tglakhir: item.tglakhir,
          qtyrencana: 0,
          qtyrealisasi: 0,
          pallet: 0,
          cutoff: 0,
          wilayah: item.wilayah,
          bagian: item.bagian,
          selisihcutoff: 0,
          kapal: item.kapal,
          company_code: item.company_code,
          tipe: item.tipe,
          kotatujuan: item.kotatujuan,
          initialqty: 0,
          token: item.token,
          charter: item.charter,
          username: item.transport_username,
          phonenumber: item.transport_phoneNumber,
          companyString: item.company_des,
          percepatan: item.percepatan,
          gruptruk: item.gruptruk,
          transport_phonenumber: item.transport_phoneNumber,
        };

        Object.entries(payload).forEach(([k, v]) => {
          params.append(`postoData[${i}][${k}]`, String(v ?? ""));
        });
      });
      params.append("uploadcode", uploadcode);

      const res = await apiFetch("/POSTO/SimpanUpload", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });

      if (res.ok) {
        setSubmitDone(true);
        setValidationResult(null);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        alert("Gagal menyimpan data");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = (type: 'POSTO' | 'SO') => {
    let headers = [];
    let sample = [];
    let filename = "";

    if (type === 'POSTO') {
      headers = ["NoPOSTO", "TglPOSTO", "Asal", "Tujuan", "Trans", "Produk", "Qty", "status", "tglakhir", "tgljatuhtempo", "charter", "percepatan", "idsumbu"];
      sample = ["5320069457", "2026/04/07", "D205", "D3GO", "1000000859", "1000036", "150", "1", "2026/04/18", "2026/04/18", "0", "0", "0"];
      filename = "Template_POSTO.xlsx";
    } else {
      headers = ["NoSO", "TglSO", "Asal", "Trans", "Produk", "Qty", "status", "tglakhir", "tgljatuhtempo", "charter", "percepatan", "idsumbu"];
      sample = ["5320069457", "2026/04/07", "D205", "1000000859", "1000036", "150", "1", "2026/04/18", "2026/04/18", "0", "0", "0"];
      filename = "Template_SO.xlsx";
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">SISTRO</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/posto">POSTO</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Upload</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Upload <span className="text-brand-500 uppercase">POSTO / SO</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Impor data pesanan pemuatan atau sales order dari file Excel dengan validasi real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadTemplate('POSTO')}
            className="h-10 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shadow-sm font-bold uppercase tracking-wider text-[10px] transition-all"
          >
            <Download className="h-4 w-4 mr-2 text-brand-500 shrink-0" />
            Template POSTO
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadTemplate('SO')}
            className="h-10 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shadow-sm font-bold uppercase tracking-wider text-[10px] transition-all"
          >
            <Download className="h-4 w-4 mr-2 text-blue-500 shrink-0" />
            Template SO
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Control Section */}
        <Card className="lg:col-span-4 border-none shadow-xl shadow-brand-500/5 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-white/20">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-brand-500" />
              Kontrol Upload
            </CardTitle>
            <CardDescription>Pilih wilayah dan file untuk memulai proses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Wilayah</label>
              <select
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all outline-none"
                value={selectedWilayah}
                onChange={(e) => {
                  setSelectedWilayah(e.target.value);
                  if (parsedRows.length > 0) triggerValidation(parsedRows, e.target.value);
                }}
              >
                <option value="" className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">-- Pilih Wilayah --</option>
                {wilayahOptions.map(opt => (
                  <option key={opt.abbrev} value={opt.abbrev} className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">{opt.keterangan}</option>
                ))}
              </select>
            </div>

            <div
              className={cn(
                "relative group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all duration-300",
                !selectedWilayah
                  ? "opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800"
                  : "cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-950/20 border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-100",
                file ? "border-brand-500 bg-brand-50/10 dark:bg-brand-950/10" : ""
              )}
              onClick={() => selectedWilayah && fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx,.xls"
                disabled={!selectedWilayah}
              />

              <div className="p-4 bg-brand-50 dark:bg-brand-500/10 rounded-full mb-4 group-hover:scale-110 transition-transform">
                {isValidating ? (
                  <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
                ) : (
                  <FileText className={cn("h-8 w-8", file ? "text-brand-500" : "text-gray-400 dark:text-gray-500")} />
                )}
              </div>

              <div className="text-center">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {file ? file.name : "Klik untuk pilih file Excel"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Maksimal 10MB (.xlsx atau .xls)</p>
              </div>

              {!selectedWilayah && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-[1px] rounded-2xl">
                  <Badge variant="outline" className="bg-white dark:bg-gray-900 border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400 animate-pulse">
                    Pilih Wilayah Dulu
                  </Badge>
                </div>
              )}
            </div>

            {validationResult && (
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ringkasan Validasi</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-2xl font-black text-emerald-600">{summary.sukses}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Valid</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-red-100 dark:border-red-900/30">
                    <p className="text-2xl font-black text-red-600">{summary.gagal}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Gagal</p>
                  </div>
                </div>

                {summary.sukses > 0 && (
                  <Button
                    className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                    Simpan {summary.sukses} Data Valid
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guidelines Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-gray-150 dark:border-gray-800/80 shadow-xl shadow-gray-900/5 bg-white/80 dark:bg-gray-950/50 backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Info className="h-4 w-4 text-brand-500" /> Ketentuan Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3 text-muted-foreground">
                <p className="font-semibold text-gray-900 dark:text-gray-100">Data Upload POSTO akan terupload jika memenuhi ketentuan berikut:</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>Tanggal Akhir POSTO melebihi Tanggal saat ini</li>
                  <li>Data Gudang Asal, Gudang Tujuan, dan Kode Transportir telah terdaftar pada sistem SISTRO</li>
                  <li>Status berisi nilai <strong>1 (Aktif)</strong> dan <strong>0 (Tidak Aktif)</strong></li>
                  <li>Format tanggal harus sesuai kebutuhan sistem: <span className="text-red-500 font-bold">Tanggal/Bulan/Tahun</span> atau <span className="text-red-500 font-bold">Tahun/Bulan/Tanggal</span>. Format yang salah akan ditolak.</li>
                  <li>Mekanisme Pemuatan: <strong>1 (PERCEPATAN)</strong> dan <strong>0 (ZERO ODOL)</strong></li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-gray-150 dark:border-gray-800/80 shadow-xl shadow-gray-900/5 bg-white/80 dark:bg-gray-950/50 backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-500">
                  <Truck className="h-4 w-4" /> Daftar Jenis Truk & Sumbu
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden">
                <div className="grid grid-cols-2 gap-1 p-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {[
                    { n: "Colt Diesel (CDD)", s: "1.2" },
                    { n: "Engkel/Fuso", s: "1.2" },
                    { n: "Trintin", s: "1.1.2" },
                    { n: "Tronton", s: "1.2.2" },
                    { n: "Gandengan", s: "1.2+2.2" },
                    { n: "Trinton", s: "1.1.2.2" },
                    { n: "Trintin Gandengan", s: "1.1.2+2.2" },
                    { n: "Trailler 20 Ft", s: "1.2-2.2" },
                    { n: "Trailler 20 Ft", s: "1.2.2-2.2" },
                    { n: "Trailler 40 Ft", s: "1.2.2-2.2.2" },
                    { n: "Trailler 40 Ft", s: "1.2-2.2.2" },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-[10px]">
                      <span className="font-medium truncate pr-1 text-gray-700 dark:text-gray-300" title={t.n}>{i + 1}. {t.n}</span>
                      <Badge variant="outline" className="h-4 px-1 text-[8px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-mono shrink-0">{t.s}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {!validationResult && !submitDone && (
            <div className="flex flex-col items-center justify-center h-[400px] bg-white/30 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
              <TableIcon className="h-16 w-16 text-gray-200 dark:text-gray-800 mb-4" />
              <p className="text-muted-foreground font-medium">Belum ada data untuk dipreview</p>
            </div>
          )}

          {submitDone && (
            <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/20">
              <CardContent className="p-12 flex flex-col items-center text-center">
                <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-400 mb-2">Upload Berhasil!</h2>
                <p className="text-emerald-700 dark:text-emerald-300/70 mb-8 max-w-sm">Data valid telah berhasil disimpan ke database. Anda bisa melanjutkan upload file lain atau kembali ke dashboard.</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="border-emerald-200 text-emerald-700" onClick={() => setSubmitDone(false)}>
                    Upload Lagi
                  </Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.location.href = '/posto'}>
                    Lihat Data POSTO
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {validationResult && (
            <Card className="border border-gray-150 dark:border-gray-800 shadow-2xl bg-white dark:bg-gray-950/50 backdrop-blur-md overflow-hidden">
              <CardHeader className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <TableIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Preview Validasi</CardTitle>
                </div>
                <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 font-mono">
                  CODE: {uploadcode.substring(0, 8)}...
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">No</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">No PO STO/SO</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Batas</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Asal</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Tujuan</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Transport</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Distributor</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider text-right">Qty</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Kapal</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Kota</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Mekanisme</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase tracking-wider">Sumbu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-transparent">
                      {validationResult.listposto.map((item, idx) => {
                        const error = isRowError(item);
                        const isSO = item.tipe === "SOALL" || item.tipe === "SOCLUSTER";
                        const now = new Date();
                        const jatuhTempo = new Date(item.tgljatuhtempo);

                        return (
                          <tr key={idx} className={cn(
                            "group hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors text-gray-700 dark:text-gray-300",
                            error ? "bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200" : ""
                          )}>
                            <td className="px-3 py-3 font-medium whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {error ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                {idx + 1}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span>{item.tglpostoString}</span>
                                <div className="flex gap-1">
                                  {item.charter === "1" && (
                                    <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100 border-none text-[9px] px-1.5 py-0">CHARTER</Badge>
                                  )}
                                  {item.percepatan === 1 && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 border-none text-[9px] px-1.5 py-0">PERCEPATAN</Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className={cn(
                              "px-3 py-3 whitespace-nowrap font-medium",
                              jatuhTempo < now ? "text-red-600 dark:text-red-400 bg-red-100/10 dark:bg-red-950/40" : ""
                            )}>
                              {item.tanggaljatuhtempoString}
                            </td>
                            <td className={cn(
                              "px-3 py-3 whitespace-nowrap font-bold font-mono",
                              item.duplicate > 0 ? "text-red-600 dark:text-red-400 bg-red-100/10 dark:bg-red-950/40" : ""
                            )}>
                              {item.noposto}
                              {item.duplicate > 0 && <span className="block text-[8px] uppercase font-black text-red-500">Duplikat</span>}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">{item.tglakhirString}</td>
                            <td className={cn("px-3 py-3 min-w-[120px]", item.cekAsal <= 0 ? "bg-red-100/10 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "")}>
                              <span className="font-bold">{item.asal}</span>
                              <span className="block text-[10px] text-muted-foreground truncate">{item.asal_des}</span>
                            </td>
                            <td className={cn("px-3 py-3 min-w-[120px]", item.cekTujuan <= 0 ? "bg-red-100/10 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "")}>
                              <span className="font-bold">{item.tujuan}</span>
                              <span className="block text-[10px] text-muted-foreground truncate">{item.tujuan_des}</span>
                            </td>
                            <td className={cn("px-3 py-3 min-w-[120px]", item.cekTransportir <= 0 ? "bg-red-100/10 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "")}>
                              <span className="font-bold">{item.transport}</span>
                              <span className="block text-[10px] text-muted-foreground truncate">{item.transport_des}</span>
                            </td>
                            <td className={cn(
                              "px-3 py-3 min-w-[120px]",
                              isSO && item.cekDistributor <= 0 ? "bg-red-100/10 dark:bg-red-950/40 text-red-600 dark:text-red-400" : ""
                            )}>
                              <span className="font-bold">{item.distributor || "-"}</span>
                              <span className="block text-[10px] text-muted-foreground truncate">{item.distributor_des}</span>
                            </td>
                            <td className={cn("px-3 py-3 min-w-[120px]", item.produkString === "" ? "bg-red-100/10 dark:bg-red-950/40 text-red-600 dark:text-red-400" : "")}>
                              <span className="font-bold">{item.produk}</span>
                              <span className="block text-[10px] text-muted-foreground truncate">{item.produkString}</span>
                            </td>
                            <td className={cn("px-3 py-3 text-right font-black text-sm", item.qty <= 0 ? "text-red-600 dark:text-red-400" : "")}>
                              {item.qtyString}
                            </td>
                            <td className="px-3 py-3">{item.kapal || "-"}</td>
                            <td className="px-3 py-3">{item.kotatujuan || "-"}</td>
                            <td className="px-3 py-3">
                              {item.percepatan === 1 ? "PERCEPATAN" : "ZERO ODOL"}
                            </td>
                            <td className="px-3 py-3 font-mono">{item.gruptruk}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 py-3 flex justify-between">
                <div className="flex gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" /> Gagal Validasi
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Siap Import
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Menampilkan {validationResult.listposto.length} baris data</p>
              </CardFooter>
            </Card>
          )}

          {validationResult && summary.gagal > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/20 rounded-2xl flex gap-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-400">
                <p className="font-bold mb-1">Peringatan Validasi</p>
                <p>Terdapat {summary.gagal} data yang tidak valid (ditandai merah). Hanya data yang valid yang akan diproses saat Anda menekan tombol Simpan.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
