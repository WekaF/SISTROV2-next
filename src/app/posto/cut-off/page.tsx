"use client";
import { Fragment, useState, useRef } from "react";
import {
  AlertTriangle, Upload, Download, CheckCircle2,
  Loader2, X, Package, Calendar, Truck, MapPin, Save, Scissors,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useApi } from "@/hooks/use-api";
import * as XLSX from "xlsx";

type CutOffEntry = {
  NoPOSTO: string;
  Qty: number;
};

type ValidatedEntry = CutOffEntry & {
  tglPostoString?: string;
  batasString?: string;
  asalString?: string;
  tujuanString?: string;
  transportString?: string;
  produkString?: string;
  cekPosto?: number;
  found: boolean;
};

export default function PostoCutOffPage() {
  const { apiJson } = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatedData, setValidatedData] = useState<ValidatedEntry[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["NoPOSTO", "Qty"],
      ["5320069457", 120],
      ["5320069458", 80],
    ]);
    ws["!cols"] = [{ wch: 18 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, "Template CutOff");
    XLSX.writeFile(wb, "Template_CutOff_POSTO.xlsx");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

      const entries: CutOffEntry[] = rows
        .filter((r) => r["NoPOSTO"] && r["Qty"] !== "")
        .map((r) => ({
          NoPOSTO: String(r["NoPOSTO"]).trim(),
          Qty: Number(r["Qty"]) || 0,
        }));

      if (entries.length === 0) {
        setError("File tidak mengandung data yang valid. Pastikan kolom NoPOSTO dan Qty terisi.");
        setLoading(false);
        return;
      }

      const result = await apiJson<{ data: ValidatedEntry[] }>("/api/POSTO/CheckImportCutOff", {
        method: "POST",
        body: JSON.stringify({ postData: entries }),
      });

      const validated = (result?.data ?? []).map((d: any) => ({
        ...d,
        found: (d.cekPosto ?? 0) > 0,
      }));

      setValidatedData(validated);
      setStep("preview");
    } catch (err: any) {
      setError("Gagal memvalidasi data: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    const toSave = validatedData.filter((d) => d.found);
    if (toSave.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      await apiJson("/api/POSTO/simpanImportCutOff", {
        method: "POST",
        body: JSON.stringify({
          postData: toSave.map((d) => ({ NoPOSTO: d.NoPOSTO, Qty: d.Qty })),
        }),
      });
      setSavedCount(toSave.length);
      setStep("done");
    } catch (err: any) {
      setError("Gagal menyimpan cut-off: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setValidatedData([]);
    setError(null);
    setSavedCount(0);
  };

  const foundCount = validatedData.filter((d) => d.found).length;
  const notFoundCount = validatedData.filter((d) => !d.found).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cut Off Dokumen POSTO</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Import file Excel untuk memperbarui tonase cut-off dokumen POSTO secara massal.
          </p>
        </div>

        {/* Step indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
          {["Upload", "Preview", "Selesai"].map((label, i) => {
            const idx = ["upload", "preview", "done"].indexOf(step);
            return (
              <Fragment key={label}>
                {i > 0 && <div className={`w-6 h-px ${i <= idx ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${i === idx ? "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400" : i < idx ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`}>
                  {i < idx ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px]">{i + 1}</span>}
                  {label}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Upload File Excel</CardTitle>
                <CardDescription>
                  File harus memiliki kolom <strong>NoPOSTO</strong> dan <strong>Qty</strong> (tonase baru setelah cut-off).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  className="hidden"
                  id="cutoff-file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <div
                  className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-white/[0.01] cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
                  onClick={() => !loading && document.getElementById("cutoff-file")?.click()}
                >
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-full mb-4 text-orange-500">
                    {loading ? <Loader2 className="h-10 w-10 animate-spin" /> : <Upload className="h-10 w-10" />}
                  </div>
                  {loading ? (
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Memvalidasi data...</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Klik untuk pilih file</p>
                      <p className="text-xs text-gray-400">Format: .xlsx atau .xls</p>
                    </>
                  )}
                </div>

                {error && (
                  <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-gray-50/50 dark:bg-white/[0.02] flex justify-between">
                <Button variant="ghost" className="text-gray-500" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
                <Button variant="outline" onClick={() => document.getElementById("cutoff-file")?.click()} disabled={loading}>
                  Pilih File
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" /> Panduan
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                <p>1. Download template Excel.</p>
                <p>2. Isi kolom <strong>NoPOSTO</strong> dengan nomor POSTO yang akan di-cutoff.</p>
                <p>3. Isi kolom <strong>Qty</strong> dengan tonase baru (setelah cutoff).</p>
                <p>4. Upload file dan verifikasi preview.</p>
                <p>5. Klik <strong>Simpan Cut-Off</strong> untuk mengaplikasikan.</p>
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-400 text-[11px]">
                  <strong>Peringatan:</strong> Cut-off akan mengubah tonase POSTO secara permanen. Proses yang sudah dalam booking tetap berlanjut.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{foundCount}</p>
                  <p className="text-xs text-gray-500">POSTO Ditemukan</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-4 flex items-center gap-3">
                <X className="h-8 w-8 text-red-400 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-red-500">{notFoundCount}</p>
                  <p className="text-xs text-gray-500">Tidak Ditemukan</p>
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-1 col-span-2">
              <CardContent className="p-4 flex items-center gap-3">
                <Scissors className="h-8 w-8 text-orange-500 shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{validatedData.length}</p>
                  <p className="text-xs text-gray-500">Total Baris</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="border-b dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Preview Data Cut-Off</CardTitle>
                  <CardDescription>
                    Hanya baris <span className="text-emerald-600 font-bold">ditemukan</span> yang akan disimpan.
                    Baris <span className="text-red-500 font-bold">tidak ditemukan</span> akan dilewati.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={reset}>
                    <X className="h-4 w-4 mr-1" /> Batal
                  </Button>
                  <Button
                    size="sm"
                    disabled={foundCount === 0 || saving}
                    onClick={handleSave}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Simpan Cut-Off ({foundCount})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-sm text-left">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800 z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">No POSTO</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Tgl POSTO</div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Asal → Tujuan</div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Transportir</div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Produk</div>
                      </th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap text-right">Qty Baru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {validatedData.map((row, i) => (
                      <tr
                        key={i}
                        className={
                          row.found
                            ? "hover:bg-gray-50 dark:hover:bg-white/5"
                            : "bg-red-50 dark:bg-red-900/10 opacity-70"
                        }
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          {row.found ? (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-1 rounded">
                              <CheckCircle2 className="h-3 w-3" /> Ditemukan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950 px-2 py-1 rounded">
                              <X className="h-3 w-3" /> Tidak Ada
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-2.5 font-mono font-bold ${row.found ? "text-gray-900 dark:text-white" : "text-red-500"}`}>
                          {row.NoPOSTO}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{row.tglPostoString || "-"}</td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className="text-gray-700 dark:text-gray-300">{row.asalString || "-"}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-gray-700 dark:text-gray-300">{row.tujuanString || "-"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">{row.transportString || "-"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400">{row.produkString || "-"}</td>
                        <td className="px-4 py-2.5 text-right font-bold font-mono">
                          <span className={row.found ? "text-orange-600 dark:text-orange-400" : "text-gray-400"}>
                            {row.Qty.toLocaleString()} T
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-10 flex flex-col items-center text-center gap-4">
            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Cut-Off Berhasil!</h2>
              <p className="text-gray-500 dark:text-gray-400">
                <strong className="text-emerald-600">{savedCount}</strong> dokumen POSTO telah diperbarui tonase-nya.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={reset}>
                <Upload className="h-4 w-4 mr-2" /> Upload Lagi
              </Button>
              <Button onClick={() => (window.location.href = "/posto")}>
                Lihat Data POSTO
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning banner */}
      {step === "upload" && (
        <div className="p-4 bg-orange-50 border border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div className="text-sm text-orange-700 dark:text-orange-400">
            <p className="font-bold mb-1">Peringatan:</p>
            <p>
              Proses Cut-Off akan <strong>memperbarui tonase POSTO</strong> secara permanen dan menandai
              dokumen sebagai &quot;Cut Off&quot;. Rekanan yang sudah melakukan booking tidak dapat menambah muatan melebihi qty baru.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
