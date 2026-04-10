"use client";
import React from "react";
import { 
  FileText, 
  BarChart3, 
  Truck, 
  Warehouse, 
  Package, 
  Layers, 
  Download,
  Calendar,
  Filter,
  ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PodReportsPage() {
  const reports = [
    { title: "Laporan Tiket", desc: "Detail pergerakan dan status tiket harian/bulanan.", icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Laporan Antrian", desc: "Analisis waktu tunggu dan distribusi antrian gudang.", icon: BarChart3, color: "text-orange-500", bg: "bg-orange-50" },
    { title: "Laporan Armada", desc: "Data ketersediaan dan utilisasi armada rekanan.", icon: Truck, color: "text-purple-500", bg: "bg-purple-50" },
    { title: "Laporan Gudang", desc: "Monitoring stok dan produktivitas setiap unit gudang.", icon: Warehouse, color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "Laporan POSTO", desc: "Status realisasi pemuatan berdasarkan dokumen POSTO.", icon: Package, color: "text-amber-500", bg: "bg-amber-50" },
    { title: "Laporan Statistik", desc: "Kumpulan metrik KPI dan performa operasional plant.", icon: Layers, color: "text-indigo-500", bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reporting Center (POD)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Akses seluruh laporan operasional plant Anda di satu tempat.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Pilih Periode
           </Button>
           <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter Plant
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.title} className="hover:shadow-theme-md transition-all cursor-pointer group hover:border-brand-500">
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                 <div className={`p-3 rounded-xl ${report.bg} ${report.color}`}>
                    <report.icon className="h-6 w-6" />
                 </div>
                 <div className="flex-grow">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription className="text-xs">{report.desc}</CardDescription>
                 </div>
              </div>
            </CardHeader>
            <CardContent>
               <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col">
                     <span className="text-[10px] text-gray-400 uppercase font-bold">Last Generated</span>
                     <span className="text-xs text-gray-500">Tadi Siang, 14:20</span>
                  </div>
                  <Button variant="ghost" size="sm" className="group-hover:text-brand-500">
                     Generate <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
              <div>
                 <CardTitle>Recent Downloads</CardTitle>
                 <CardDescription>File laporan terakhir yang Anda unduh.</CardDescription>
              </div>
              <Button variant="outline" size="sm">Clear History</Button>
           </div>
        </CardHeader>
        <CardContent>
           <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-white/[0.01]">
                   <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                         <p className="text-sm font-bold">Daily_Ticket_Summary_Plant_Gresik_2026-04-10.xlsx</p>
                         <p className="text-xs text-gray-500">2.4 MB • Unduh 10 Menit yang lalu</p>
                      </div>
                   </div>
                   <Button variant="ghost" size="icon-sm"><Download className="h-4 w-4" /></Button>
                </div>
              ))}
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
