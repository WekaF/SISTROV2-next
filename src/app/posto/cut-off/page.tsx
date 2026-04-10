"use client";
import React from "react";
import { Scissors, Calendar, Clock, AlertTriangle, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function PostoCutOffPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cut-Off Dokumen POSTO</h1>
        <p className="text-sm text-gray-500">Berikan batas waktu pengurusan tiket untuk dokumen POSTO tertentu.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Pengaturan Masa Aktif</CardTitle>
            <CardDescription>Pencarian dokumen POSTO yang akan diberlakukan jam cut-off.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <label className="text-sm font-medium">Nomor POSTO / Kode Rekanan</label>
                <div className="flex gap-2">
                   <Input placeholder="Contoh: P-2026-04-001" />
                   <Button variant="outline">Cari POSTO</Button>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="space-y-2">
                   <label className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Tanggal Cut-off</label>
                   <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Jam Cut-off</label>
                   <Input type="time" defaultValue="16:00" />
                </div>
             </div>
          </CardContent>
          <CardHeader className="pt-0">
             <Button className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Simpan Pengaturan Cut-off
             </Button>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="text-lg">Recent Cut-offs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {[1, 2, 3].map((i) => (
               <div key={i} className="p-3 border border-gray-100 dark:border-gray-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between font-bold text-sm">
                     <span>POSTO-00{i}</span>
                     <Badge color="error" size="sm">Closed</Badge>
                  </div>
                  <p className="text-xs text-gray-500">Expired: 2026-04-0{i} 17:00</p>
               </div>
             ))}
          </CardContent>
        </Card>
      </div>

      <div className="p-4 bg-orange-50 border border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20 rounded-xl flex items-start gap-3">
         <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
         <div className="text-sm text-orange-700 dark:text-orange-400">
            <p className="font-bold mb-1">Peringatan:</p>
            <p>Mengaktifkan Cut-off akan mencegah Rekanan membuat Tiket Booking setelah waktu yang ditentukan. Proses yang sudah check-in gate tetap dapat berlanjut.</p>
         </div>
      </div>
    </div>
  );
}
