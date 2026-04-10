"use client";
import React, { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Label from "@/components/form/Label";

export default function PostoUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setSuccess(true);
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Dokumen POSTO</h1>
        <p className="text-sm text-gray-500">Impor data pesanan pemuatan (POSTO) dari template Excel atau CSV.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>File Upload</CardTitle>
          <CardDescription>Pilih file template yang berisi data POSTO untuk diunggah ke sistem.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-white/[0.01]">
             <div className="p-4 bg-brand-50 rounded-full dark:bg-brand-500/10 mb-4 text-brand-500">
                <Upload className="h-10 w-10" />
             </div>
             <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Drag and drop file here</p>
             <p className="text-xs text-gray-400 mb-6">Support .xlsx, .xls, or .csv up to 10MB</p>
             <input type="file" className="hidden" id="posto-file" />
             <Button variant="outline" onClick={() => document.getElementById('posto-file')?.click()}>
                Browse File
             </Button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
             <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
             <div className="text-sm text-blue-700 dark:text-blue-400">
                <p className="font-bold mb-1 border-b border-blue-200 dark:border-blue-500/20 pb-1">Panduan Upload:</p>
                <ul className="list-disc list-inside space-y-1">
                   <li>Pastikan kode rekanan sudah terdaftar di sistem.</li>
                   <li>Format tanggal harus YYYY-MM-DD.</li>
                   <li>Jumlah tonase tidak boleh melebihi kuota harian plant.</li>
                </ul>
             </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
           <Button variant="ghost" className="text-gray-500">
              <Download className="h-4 w-4 mr-2" />
              Download Template
           </Button>
           <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : "Mulai Upload"}
           </Button>
        </CardFooter>
      </Card>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
           <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Successfully uploaded 120 POSTO records!</span>
           </div>
           <Button size="sm" variant="outline" onClick={() => window.location.href='/posto'}>Lihat Data</Button>
        </div>
      )}
    </div>
  );
}
