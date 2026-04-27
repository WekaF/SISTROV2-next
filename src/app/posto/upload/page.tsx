"use client";
import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, Table as TableIcon, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';

export default function PostoUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  
  const [wilayahOptions, setWilayahOptions] = useState<any[]>([]);
  const [selectedWilayah, setSelectedWilayah] = useState<any>(null);
  
  const [validationData, setValidationData] = useState<any>(null); // { records, summary, context }
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await fetch('/api/pod/posto/upload/options');
        const json = await res.json();
        if (json.success) {
          setWilayahOptions(json.data.wilayah || []);
        }
      } catch (err) {
        console.error("Failed to load options", err);
      }
    }
    fetchOptions();
  }, []);

  const handleDownloadTemplate = () => {
    // Define the headers based on the requested template
    const headers = [
      "NoPOSTO", "TglPOSTO", "Asal", "Tujuan", "Trans", "Produk", 
      "Qty", "status", "tglakhir", "tgljatuhtempo", "charter", 
      "percepatan", "grup truk"
    ];
    
    // Sample data to guide the user
    const sampleData = [
      headers,
      ["5320069457", "4/7/2026", "D205", "D3GO", "1000000859", "1000036", "150", "1", "4/18/2026", "4/18/2026", "0", "0", "0"],
      ["5320069458", "4/7/2026", "D205", "D3GO", "1000002513", "1000036", "150", "1", "4/18/2026", "4/18/2026", "0", "0", "0"]
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sampleData);

    // Auto-size columns slightly for better readability
    const colWidths = headers.map(h => ({ wch: Math.max(h.length, 12) }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Template POSTO");
    
    // Download the file
    XLSX.writeFile(wb, "Template_Upload_POSTO.xlsx");
  };

  const currentMappingPayload = {
    wilayah: selectedWilayah?.abbrev
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidating(true);
    setValidationData(null);
    setSuccess(false);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      // Note: defval ensures missing cells are returned as empty strings
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (json.length === 0) {
        alert("File kosong atau tidak memiliki data.");
        setValidating(false);
        return;
      }
      
      const res = await fetch("/api/pod/posto/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", records: json, mapping: currentMappingPayload })
      });
      
      const resData = await res.json();
      
      if (resData.success) {
        setValidationData(resData.data);
      } else {
        alert("Gagal memvalidasi data: " + resData.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error parsing file.");
    } finally {
      setValidating(false);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!validationData || validationData.summary.valid === 0) return;
    
    setUploading(true);
    try {
      const res = await fetch("/api/pod/posto/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "submit", 
          records: validationData.records,
          mapping: currentMappingPayload
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setSuccessMsg(data.message);
        setValidationData(null);
      } else {
        alert("Gagal submit POSTO: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat submit data.");
    } finally {
      setUploading(false);
    }
  };

  const isFormIncomplete = !selectedWilayah;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Dokumen POSTO</h1>
        <p className="text-sm text-gray-500">Impor data pesanan pemuatan (POSTO) dari template Excel atau CSV dengan validasi duplikasi dan tagging tipe company.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>Pilih file template yang berisi data POSTO untuk divalidasi sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            {wilayahOptions.length > 0 && (
               <div className="space-y-2">
                 <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
                   Pilih Wilayah (Wajib)
                 </label>
                 <select 
                   className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                   onChange={(e) => {
                     const selected = wilayahOptions.find(b => b.abbrev === e.target.value);
                     setSelectedWilayah(selected || null);
                     setValidationData(null);
                   }}
                   value={selectedWilayah?.abbrev || ""}
                 >
                   <option value="" disabled>-- Pilih Wilayah --</option>
                   {wilayahOptions.map(opt => (
                     <option key={`wil-${opt.abbrev}`} value={opt.abbrev}>{opt.keterangan}</option>
                   ))}
                 </select>
               </div>
            )}
          </div>
          {isFormIncomplete && (
            <div className="flex items-center gap-2 mb-4 text-xs text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Silakan pilih Wilayah terlebih dahulu sebelum mengupload file.
            </div>
          )}

          <div className={`transition-all ${isFormIncomplete ? "opacity-50 pointer-events-none grayscale" : ""}`}>
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-white/[0.01]">
               <div className="p-4 bg-brand-50 rounded-full dark:bg-brand-500/10 mb-4 text-brand-500">
                  {validating ? <Loader2 className="h-10 w-10 animate-spin" /> : <Upload className="h-10 w-10" />}
               </div>
               
               {validating ? (
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Memvalidasi data...</p>
               ) : (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Pilih file untuk diupload</p>
                  <p className="text-xs text-gray-400 mb-6">Support .xlsx, .xls</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    id="posto-file" 
                    ref={fileInputRef}
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                  />
                  <Button variant="outline" onClick={() => document.getElementById('posto-file')?.click()} disabled={isFormIncomplete}>
                     Browse File
                  </Button>
                </>
             )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-400">
                   <p className="font-bold mb-1 border-b border-blue-200 dark:border-blue-500/20 pb-1">Panduan & Mapping Otomatis:</p>
                   <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Pastikan menggunakan format dari Download Template.</li>
                      <li>POSTO yang sudah ada di database akan ditandai <span className="text-red-500 font-bold">MERAH</span>.</li>
                      <li>Data otomatis dimapping ke company Anda (e.g., POSTO PKG/Cluster).</li>
                   </ul>
                </div>
             </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
           <Button variant="ghost" className="text-gray-500" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
           </Button>
        </CardFooter>
      </Card>

      {/* Validation Result Table */}
      {validationData && (
        <Card className="animate-in fade-in slide-in-from-bottom-4">
           <CardHeader className="border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-lg flex items-center gap-2">
                     <TableIcon className="h-5 w-5 text-gray-400" />
                     Preview Data POSTO
                   </CardTitle>
                   <CardDescription>
                      Ditemukan <strong className="text-emerald-600">{validationData.summary.valid} data valid</strong> dan <strong className="text-red-500">{validationData.summary.duplicates} duplikat</strong>
                      {validationData.context.tipe && (
                        <span className="ml-2 font-bold text-brand-500 uppercase">
                          {`[Tag: POSTO ${validationData.context.tipe}]`}
                        </span>
                      )}
                   </CardDescription>
                </div>
                {validationData.summary.valid > 0 && (
                   <Button onClick={handleSubmit} disabled={uploading} className="bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20">
                     {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                     Submit {validationData.summary.valid} POSTO
                   </Button>
                )}
              </div>
           </CardHeader>
           <CardContent className="p-0">
             <div className="overflow-x-auto max-h-[500px]">
               <table className="w-full text-left text-sm relative">
                  <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">No POSTO</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Tgl POSTO</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Asal</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Tujuan</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Trans</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap">Produk</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 whitespace-nowrap text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {validationData.records.map((r: any, idx: number) => (
                      <tr key={idx} className={r.isDuplicate ? "bg-red-50 dark:bg-red-900/20" : "hover:bg-gray-50/50"}>
                        <td className="px-4 py-2 whitespace-nowrap">
                           {r.isDuplicate ? (
                             <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950 px-2 py-1 rounded">
                               Duplikat
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-1 rounded">
                               <CheckCircle2 className="h-3 w-3" /> Valid
                             </span>
                           )}
                        </td>
                        <td className={`px-4 py-2 font-mono font-bold ${r.isDuplicate ? "text-red-700 dark:text-red-300" : ""}`}>{r.NoPOSTO}</td>
                        <td className="px-4 py-2 text-gray-500">{r.TglPOSTO}</td>
                        <td className="px-4 py-2">{r.Asal}</td>
                        <td className="px-4 py-2">{r.Tujuan}</td>
                        <td className="px-4 py-2">{r.Trans}</td>
                        <td className="px-4 py-2">{r.Produk}</td>
                        <td className="px-4 py-2 text-right font-bold">{r.Qty}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
           </CardContent>
        </Card>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
           <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                 {successMsg || "Proses upload POSTO berhasil diselesaikan!"}
              </span>
           </div>
           <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100" onClick={() => window.location.href='/posto'}>
              Lihat Data POSTO
           </Button>
        </div>
      )}
    </div>
  );
}
