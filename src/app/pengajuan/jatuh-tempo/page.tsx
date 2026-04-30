"use client";
import { AlertCircle, Clock, Construction } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function PengajuanJatuhTempoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengajuan Jatuh Tempo</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Pengajuan perpanjangan POSTO yang mendekati atau telah melewati tanggal jatuh tempo.
        </p>
      </div>
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Construction className="h-5 w-5" />
            Halaman Dalam Pengembangan
          </CardTitle>
          <CardDescription className="text-amber-600 dark:text-amber-500">
            Fitur Pengajuan Jatuh Tempo sedang dalam proses migrasi dari sistem lama.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-white dark:bg-white/[0.04] rounded-xl border border-amber-100 dark:border-amber-500/20">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Sementara gunakan sistem lama</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Untuk sementara, fitur ini masih tersedia di SISTRO Classic. Halaman ini akan aktif setelah proses migrasi selesai.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
