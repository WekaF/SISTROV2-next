"use client";
import React from "react";
import { Zap, ShieldAlert, ArrowUpCircle, Search, Clock, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function GudangBypassPage() {
  const queueData = [
    { id: "T-89211", truck: "W 1234 AB", driver: "Bambang", plant: "Gresik", warehouse: "Gudang I", waitTime: "2h 45m", status: "In Queue", pos: 12 },
    { id: "T-89212", truck: "B 5678 CD", driver: "Slamet", plant: "Gresik", warehouse: "Gudang I", waitTime: "1h 10m", status: "In Queue", pos: 25 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bypass Antrian Gudang</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Otoritas khusus POD untuk mendahulukan armada tertentu dalam antrian pemuatan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
               <CardTitle>Daftar Antrian Saat Ini</CardTitle>
               <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-10" placeholder="Cari Tiket / No. Truck..." />
               </div>
            </div>
            <CardDescription>Pilih tiket yang akan dipindahkan ke urutan teratas antrian (Priority 1).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-white/[0.02]">
                     <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Post.</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Truck / Ticket</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Wait Time</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {queueData.map((item) => (
                       <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <td className="px-6 py-4 font-bold text-brand-500">#{item.pos}</td>
                          <td className="px-6 py-4">
                             <div className="font-bold">{item.truck}</div>
                             <div className="text-xs text-gray-400">{item.id} • {item.driver}</div>
                          </td>
                          <td className="px-6 py-4 text-sm flex items-center gap-2">
                             <Clock className="h-4 w-4 text-orange-500" />
                             {item.waitTime}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <Button variant="outline" size="sm" className="text-orange-600 hover:bg-orange-50">
                                <ArrowUpCircle className="h-4 w-4 mr-2" />
                                Bypass to #1
                             </Button>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
           <Card className="bg-orange-50/50 border-orange-200 dark:bg-orange-500/5 dark:border-orange-500/20">
              <CardHeader>
                 <div className="flex items-center gap-2 text-orange-600">
                    <ShieldAlert className="h-5 w-5" />
                    <CardTitle className="text-lg">Policy Warning</CardTitle>
                 </div>
              </CardHeader>
              <CardContent className="text-sm text-orange-700 dark:text-orange-400 space-y-3">
                 <p>Gunakan fitur **Bypass** hanya untuk kebutuhan mendesak atau prioritas khusus dari manajemen.</p>
                 <p>Setiap tindakan bypass akan **dicatat dalam Activity Log** dan dapat diaudit oleh PKD atau Admin.</p>
              </CardContent>
           </Card>

           <Card>
              <CardHeader>
                 <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-500" /> Active Point</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Plant</p>
                    <p className="font-bold">Petrokimia Gresik</p>
                 </div>
                 <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Warehouse Section</p>
                    <p className="font-bold">Semua Gudang</p>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
