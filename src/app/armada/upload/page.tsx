"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Truck,
  XCircle,
  Save,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/components/ui/toast";
import { normalizeRole } from "@/lib/role-utils";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";

const ALLOWED_ROLES = ["pod", "superadmin", "admin"];

// Exact header names matching TEMPLATE-Armada-v2.xlsx (MVC UploadExcel parser)
const EXCEL_COLUMNS = [
  "Username",
  "Nopol",
  "sumbu",
  "jeniskendaraan",
  "TonaseMax",
  "jbi",
  "BeratKendaraan",
  "beratpenumpang",
  // "kir",
  "tahun_pembuatan",
  "no_rangka_stnk",
  "no_mesin_stnk",
  "masa_berlaku_kir",
  "no_rangka_kir",
  "no_mesin_kir",
];

interface ArmadaRow {
  username: string;
  nopol: string;
  idsumbu: number | null;
  sumbu: string;
  jeniskendaraan: string;
  qtymax: number | null;
  jbi: number | null;
  beratkendaraan: number | null;
  beratpenumpang: number | null;
  // kir: string;
  tahun_pembuatan: number | null;
  no_rangka_stnk: string;
  no_mesin_stnk: string;
  masa_berlaku_kir: string | null;
  no_rangka_kir: string;
  no_mesin_kir: string;
  // validation
  isValid: boolean;
  errors: string[];
}

function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(String(val).replace(",", "."));
  return isNaN(n) ? null : n;
}

function excelDateToISO(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  // Excel serial number
  if (/^\d+$/.test(s) && Number(s) > 30000) {
    const date = XLSX.SSF.parse_date_code(Number(s));
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  // dd/MM/yyyy or dd-MM-yyyy
  const p1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (p1) return `${p1[3]}-${p1[2].padStart(2, "0")}-${p1[1].padStart(2, "0")}`;
  // yyyy-MM-dd or yyyy/MM/dd
  const p2 = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (p2) return `${p2[1]}-${p2[2].padStart(2, "0")}-${p2[3].padStart(2, "0")}`;
  return null;
}

function validateRow(
  row: Omit<ArmadaRow, "isValid" | "errors">, 
  today: Date, 
  sumbuMaster: any[], 
  tahunPembuatanEnabled: boolean
): string[] {
  const errs: string[] = [];
  if (!row.username) errs.push("Username wajib diisi");
  if (!row.nopol) errs.push("Nopol wajib diisi");
  if (!row.sumbu) errs.push("Sumbu wajib diisi");
  if (!row.jeniskendaraan) errs.push("Jenis Kendaraan wajib diisi");
  if (!row.tahun_pembuatan) errs.push("Tahun Pembuatan wajib diisi");
  if (!row.no_rangka_stnk) errs.push("No Rangka STNK wajib diisi");
  if (!row.no_mesin_stnk) errs.push("No Mesin STNK wajib diisi");
  if (!row.no_rangka_kir) errs.push("No Rangka KIR wajib diisi");
  if (!row.no_mesin_kir) errs.push("No Mesin KIR wajib diisi");
  if (!row.masa_berlaku_kir) {
    errs.push("Masa Berlaku KIR wajib diisi");
  } else {
    const kir = new Date(row.masa_berlaku_kir);
    if (isNaN(kir.getTime())) {
      errs.push("Format Masa Berlaku KIR tidak valid");
    } else if (kir < today) {
      errs.push(`KIR sudah habis (${row.masa_berlaku_kir})`);
    }
  }
  if (row.no_rangka_stnk && row.no_rangka_kir) {
    if (row.no_rangka_stnk.trim().toUpperCase() !== row.no_rangka_kir.trim().toUpperCase()) {
      errs.push("No Rangka STNK ≠ KIR");
    }
  }
  if (row.no_mesin_stnk && row.no_mesin_kir) {
    if (row.no_mesin_stnk.trim().toUpperCase() !== row.no_mesin_kir.trim().toUpperCase()) {
      errs.push("No Mesin STNK ≠ KIR");
    }
  }

  // Age limit check
  if (tahunPembuatanEnabled && row.tahun_pembuatan) {
    const currentYear = today.getFullYear();
    if ((currentYear - row.tahun_pembuatan) > 20) {
      errs.push(`Usia armada melebihi 20 tahun (Tahun Buat: ${row.tahun_pembuatan})`);
    }
  }

  // Sumbu Master validation
  if (sumbuMaster.length > 0) {
    let latestYear = 0;
    for (const s of sumbuMaster) {
      const ty = parseInt(s.tahun) || 0;
      if (ty > latestYear) latestYear = ty;
    }
    
    if (latestYear > 0) {
      const match = sumbuMaster.find(s => 
        (parseInt(s.tahun) || 0) === latestYear &&
        (s.nama || "").toLowerCase() === (row.sumbu || "").toLowerCase() &&
        (s.jenistruk || "").toLowerCase() === (row.jeniskendaraan || "").toLowerCase()
      );

      if (match) {
        row.idsumbu = match.Id || match.id;
        const masterMuatan = parseFloat(match.muatan) || 0;
        if (Math.abs(masterMuatan - (row.qtymax || 0)) > 0.01) {
          errs.push(`Tonase (${row.qtymax}) tidak sesuai Sumbu ${row.sumbu} (${masterMuatan})`);
        }
      } else {
        errs.push(`Kombinasi Sumbu (${row.sumbu}) dan Jenis (${row.jeniskendaraan}) tidak terdaftar`);
      }
    } else {
      errs.push(`Tahun Sumbu tidak dapat divalidasi dari Master Data`);
    }
  } else {
    errs.push(`Data Master Sumbu gagal dimuat atau kosong, harap muat ulang halaman.`);
  }

  return errs;
}

function parseExcelRows(data: any[], sumbuMaster: any[], tahunPembuatanEnabled: boolean): ArmadaRow[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return data.map((raw: any) => {
    // Column names match official TEMPLATE-Armada-v2.xlsx (same as MVC UploadExcel parser)
    const masa_berlaku_kir = excelDateToISO(
      raw["masa_berlaku_kir"] ?? raw["Masa Berlaku KIR"] ?? raw["Masa KIR"] ?? raw["MasaBerlakuKIR"]
    );
    const base: Omit<ArmadaRow, "isValid" | "errors"> = {
      username: String(raw["Username"] ?? raw["username"] ?? "").trim(),
      nopol: String(raw["Nopol"] ?? raw["nopol"] ?? "").trim().toUpperCase(),
      idsumbu: null,
      sumbu: String(raw["sumbu"] ?? raw["Sumbu"] ?? "").trim(),
      jeniskendaraan: String(raw["jeniskendaraan"] ?? raw["Jenis Kendaraan"] ?? raw["JenisKendaraan"] ?? "").trim(),
      qtymax: parseNum(raw["TonaseMax"] ?? raw["tonasemax"] ?? raw["Qty Max"] ?? raw["QtyMax"] ?? raw["qtymax"]),
      jbi: parseNum(raw["jbi"] ?? raw["JBI"]),
      beratkendaraan: parseNum(raw["BeratKendaraan"] ?? raw["beratkendaraan"] ?? raw["Berat Kendaraan"]),
      beratpenumpang: parseNum(raw["beratpenumpang"] ?? raw["BeratPenumpang"] ?? raw["Berat Penumpang"]),
      // kir: String(raw["kir"] ?? raw["KIR"] ?? "").trim(),
      tahun_pembuatan: parseNum(raw["tahun_pembuatan"] ?? raw["TahunPembuatan"] ?? raw["Tahun Pembuatan"] ?? raw["Tahun"]) as number | null,
      no_rangka_stnk: String(raw["no_rangka_stnk"] ?? raw["Rangka STNK"] ?? raw["No Rangka STNK"] ?? raw["NoRangkaSTNK"] ?? "").trim(),
      no_mesin_stnk: String(raw["no_mesin_stnk"] ?? raw["Mesin STNK"] ?? raw["No Mesin STNK"] ?? raw["NoMesinSTNK"] ?? "").trim(),
      masa_berlaku_kir,
      no_rangka_kir: String(raw["no_rangka_kir"] ?? raw["Rangka KIR"] ?? raw["No Rangka KIR"] ?? raw["NoRangkaKIR"] ?? "").trim(),
      no_mesin_kir: String(raw["no_mesin_kir"] ?? raw["Mesin KIR"] ?? raw["No Mesin KIR"] ?? raw["NoMesinKIR"] ?? "").trim(),
    };
    const errors = validateRow(base, today, sumbuMaster, tahunPembuatanEnabled);
    return { ...base, isValid: errors.length === 0, errors };
  });
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([EXCEL_COLUMNS]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "template_upload_armada.xlsx");
}

export default function ArmadaUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  const { apiJson, apiTable } = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeCompanyCode, companies } = useCompany();

  // Nama lengkap company aktif
  const activeCompanyName = companies.find((c) => c.company_code === activeCompanyCode)?.company ?? activeCompanyCode;

  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ArmadaRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  // Master data for validation
  const [sumbuMaster, setSumbuMaster] = useState<any[]>([]);
  const [tahunPembuatanEnabled, setTahunPembuatanEnabled] = useState(false);

  // Reset state saat company berubah agar data file lama tidak nyangkut
  const prevCompanyRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevCompanyRef.current !== null && prevCompanyRef.current !== activeCompanyCode) {
      setRows([]);
      setFileName("");
      setSubmitDone(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    prevCompanyRef.current = activeCompanyCode;
  }, [activeCompanyCode]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const sumbuRes = await apiTable('/api/Sumbu/DataTable', {
          start: 0,
          length: 10000,
          order: [{ column: 0, dir: "asc" }],
          columns: [{ data: "Id", name: "Id", searchable: "true", orderable: "true", search: { value: "", regex: "false" } }],
        });
        if (Array.isArray(sumbuRes?.data)) setSumbuMaster(sumbuRes.data);

        // Fetch plants config to check tahunpembuatan
        const plantRes = await fetch("/api/admin/plants");
        const plantJson = await plantRes.json();
        if (plantJson.success && Array.isArray(plantJson.data)) {
          const currentPlant = plantJson.data.find((p: any) => p.company_code === activeCompanyCode);
          if (currentPlant) {
            setTahunPembuatanEnabled(!!currentPlant.tahunpembuatan);
          }
        }
      } catch (err) {
        console.error("Failed to load master data", err);
      }
    };
    fetchMasterData();
  }, [activeCompanyCode, apiTable]);

  const allRoles: string[] = ((session?.user as any)?.roles as string[] | undefined) ?? [
    (session?.user as any)?.role,
  ].filter(Boolean);
  const canAccess = allRoles.some((r) => ALLOWED_ROLES.includes(normalizeRole(r)));


  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      addToast({ variant: "destructive", title: "Format salah", description: "Hanya file .xlsx atau .xls yang diterima." });
      return;
    }
    setFileName(file.name);
    setSubmitDone(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const parsed = parseExcelRows(data as any[], sumbuMaster, tahunPembuatanEnabled);
        setRows(parsed);
        if (parsed.length === 0) {
          addToast({ variant: "warning", title: "File kosong", description: "Tidak ada data yang bisa dibaca dari file." });
        }
      } catch (err: any) {
        addToast({ variant: "destructive", title: "Gagal membaca file", description: err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [addToast, sumbuMaster, tahunPembuatanEnabled]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    try {
      const records = validRows.map((r) => ({
        username: r.username,
        nopol: r.nopol,
        sumbu: r.sumbu,
        jeniskendaraan: r.jeniskendaraan,
        qtymax: r.qtymax,
        jbi: r.jbi,
        beratkendaraan: r.beratkendaraan,
        beratpenumpang: r.beratpenumpang,
        tahun_pembuatan: r.tahun_pembuatan,
        no_rangka_stnk: r.no_rangka_stnk,
        no_mesin_stnk: r.no_mesin_stnk,
        masa_berlaku_kir: r.masa_berlaku_kir,
        no_rangka_kir: r.no_rangka_kir,
        no_mesin_kir: r.no_mesin_kir,
      }));

      const json = await apiJson("/api/Armada/UploadBulk", {
        method: "POST",
        body: JSON.stringify(records),
      });

      if (json.success === false) {
        addToast({ variant: "destructive", title: "Gagal upload", description: json.error || "Terjadi kesalahan." });
        return;
      }

      const { inserted, failed, errors } = json;
      setSubmitDone(true);
      addToast({
        variant: inserted > 0 ? "success" : "warning",
        title: `Upload selesai`,
        description: `${inserted ?? 0} armada berhasil disimpan, ${failed ?? 0} gagal.`,
      });

      if (errors && errors.length > 0) {
        console.warn("Server-side errors:", errors);
        setRows((prev) =>
          prev.map((r) => {
            const errMatch = errors.find((e: any) => e.nopol === r.nopol);
            if (errMatch) {
              return { ...r, isValid: false, errors: [...r.errors, errMatch.error] };
            }
            return r;
          })
        );
      }
    } catch (err: any) {
      addToast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (session && !canAccess) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        Akses ditolak. Halaman ini hanya untuk Admin Armada, Admin, atau Superadmin.
      </div>
    );
  }

  const totalRows = rows.length;
  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = totalRows - validCount;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/armada">Armada</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Upload Armada</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Upload Armada</h1>
          <p className="text-sm text-muted-foreground">Import data armada baru dari file Excel</p>
        </div>
      </div>

      {/* Company indicator */}
      {activeCompanyCode && (
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 flex items-start gap-3 shadow-sm">
          <Info className="h-5 w-5 mt-0.5 shrink-0 text-blue-500" />
          <div>
            <p className="font-semibold text-sm">Plant Aktif</p>
            <p className="text-xs opacity-90 mt-0.5">
              Anda akan mengupload armada ke Plant{" "}
              <strong className="font-black text-blue-700 dark:text-blue-400">
                {activeCompanyName}
              </strong>
              {activeCompanyName !== activeCompanyCode && (
                <span className="ml-1 text-blue-500">({activeCompanyCode})</span>
              )}
              . Ganti plant melalui menu di pojok kanan atas.
            </p>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilih File Excel</CardTitle>
          <CardDescription>
            Format kolom: Username | Nopol | Sumbu | Jenis Kendaraan | Qty Max | JBI | Berat Kendaraan | Berat Penumpang | KIR | Tahun Pembuatan | No Rangka STNK | No Mesin STNK | Masa Berlaku KIR | No Rangka KIR | No Mesin KIR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {fileName ? (
              <div className="space-y-1">
                <p className="font-medium text-sm">{fileName}</p>
                <p className="text-xs text-muted-foreground">Klik atau drop file baru untuk mengganti</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium text-sm">Drag & drop file Excel di sini</p>
                <p className="text-xs text-muted-foreground">atau klik untuk memilih file (.xlsx, .xls)</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" />
              Download Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {totalRows > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Baris</p>
              <p className="text-lg font-bold">{totalRows}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3 border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Valid</p>
              <p className="text-lg font-bold text-green-700">{validCount}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3 border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">Tidak Valid</p>
              <p className="text-lg font-bold text-red-700">{invalidCount}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Table */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Preview Data</CardTitle>
              {!submitDone && (
                <div className="flex gap-3">
                  <Button variant="outline" className="h-10 px-4 font-bold border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg" onClick={() => { setRows([]); setFileName(""); }}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={validCount === 0 || isSubmitting}
                    className="h-10 px-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-lg shadow-md shadow-brand-500/20"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" />Simpan {validCount} Armada Valid</>
                    )}
                  </Button>
                </div>
              )}
              {submitDone && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setRows([]); setFileName(""); setSubmitDone(false); }}>
                    Upload Lagi
                  </Button>
                  <Button size="sm" onClick={() => router.push("/armada")}>
                    Ke Datatable Armada
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium w-8">#</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="p-2 text-left font-medium">Username</th>
                    <th className="p-2 text-left font-medium">Nopol</th>
                    <th className="p-2 text-left font-medium">No. Sumbu</th>
                    <th className="p-2 text-left font-medium">Sumbu</th>
                    <th className="p-2 text-left font-medium">Jenis</th>
                    <th className="p-2 text-right font-medium">Qty Max</th>
                    <th className="p-2 text-right font-medium">JBI</th>
                    <th className="p-2 text-right font-medium">Berat Kend.</th>
                    <th className="p-2 text-right font-medium">Berat Penump.</th>
                    <th className="p-2 text-right font-medium">Thn. Buat</th>
                    <th className="p-2 text-left font-medium">No Rangka STNK</th>
                    <th className="p-2 text-left font-medium">No Mesin STNK</th>
                    <th className="p-2 text-left font-medium">Masa Berlaku KIR</th>
                    <th className="p-2 text-left font-medium">No Rangka KIR</th>
                    <th className="p-2 text-left font-medium">No Mesin KIR</th>
                    <th className="p-2 text-left font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b ${row.isValid
                        ? "bg-green-50/30 dark:bg-green-950/10"
                        : "bg-red-50/50 dark:bg-red-950/20"
                        }`}
                    >
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2">
                        {row.isValid ? (
                          <Badge variant="outline" className="text-green-700 border-green-400 bg-green-50">Valid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-700 border-red-400 bg-red-50">Invalid</Badge>
                        )}
                      </td>
                      <td className="p-2">{row.username}</td>
                      <td className="p-2 font-mono">{row.nopol}</td>
                      <td className="p-2">{row.idsumbu ?? "-"}</td>
                      <td className="p-2">{row.sumbu}</td>
                      <td className="p-2">{row.jeniskendaraan}</td>
                      <td className="p-2 text-right">{row.qtymax ?? "-"}</td>
                      <td className="p-2 text-right">{row.jbi ?? "-"}</td>
                      <td className="p-2 text-right">{row.beratkendaraan ?? "-"}</td>
                      <td className="p-2 text-right">{row.beratpenumpang ?? "-"}</td>
                      <td className="p-2 text-right">{row.tahun_pembuatan ?? "-"}</td>
                      <td className="p-2 font-mono text-xs">{row.no_rangka_stnk}</td>
                      <td className="p-2 font-mono text-xs">{row.no_mesin_stnk}</td>
                      <td className="p-2">{row.masa_berlaku_kir ?? "-"}</td>
                      <td className="p-2 font-mono text-xs">{row.no_rangka_kir}</td>
                      <td className="p-2 font-mono text-xs">{row.no_mesin_kir}</td>
                      <td className="p-2 text-red-600 max-w-[200px]">
                        {row.errors.length > 0 && (
                          <ul className="space-y-0.5">
                            {row.errors.map((e, ei) => (
                              <li key={ei} className="flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                {e}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
