"use client";
import React from "react";
import { 
  Clock, 
  Warehouse, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  BarChart3,
  Calendar
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";

export default function ShiftQuotaPage() {
  const currentShift = 2; // Mocking current shift
  
  const shiftData = [
    { area: "Area Jatim 1", shift1: 400, shift2: 450, shift3: 350, realization: 850, total: 1200 },
    { area: "Area Jatim 2", shift1: 300, shift2: 300, shift3: 200, realization: 550, total: 800 },
    { area: "Wilayah Barat", shift1: 200, shift2: 250, shift3: 150, realization: 400, total: 600 },
    { area: "Inbag Dermaga 1", shift1: 150, shift2: 150, shift3: 100, realization: 280, total: 400 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monitoring Kuota Per-Shift</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pemantauan realisasi muat berdasarkan pembagian shift harian.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-brand-500/20">
              <Clock className="h-5 w-5 animate-pulse" />
              <div className="flex flex-col -space-y-1">
                 <span className="text-[10px] uppercase font-black opacity-80">Active Shift</span>
                 <span className="text-sm font-bold font-serif">Shift {currentShift} (14:01 - 22:00)</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Shift Performance Summary */}
         <Card className="lg:col-span-2">
            <CardHeader>
               <div className="flex items-center justify-between">
                  <CardTitle>Realisasi Per-Area</CardTitle>
                  <Button variant="ghost" size="sm" className="text-brand-500">Lihat Detail <ArrowRight className="h-4 w-4 ml-2" /></Button>
               </div>
               <CardDescription>Performa pemuatan dibandingkan dengan target kuota per area.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-6">
                  {shiftData.map((item) => {
                    const progress = (item.realization / item.total) * 100;
                    return (
                      <div key={item.area} className="space-y-2">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <Warehouse className="h-4 w-4 text-gray-400" />
                             <span className="font-bold text-sm">{item.area}</span>
                           </div>
                           <div className="text-sm">
                              <span className="font-bold">{item.realization}</span>
                              <span className="text-gray-400"> / {item.total} Ton</span>
                           </div>
                        </div>
                        <div className="relative w-full h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                           <div 
                              className={`absolute left-0 top-0 h-full transition-all duration-1000 ${
                                progress > 90 ? "bg-emerald-500" : progress > 50 ? "bg-brand-500" : "bg-orange-500"
                              }`}
                              style={{ width: `${progress}%` }}
                           />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                           <div className={`text-[10px] p-1 rounded text-center border ${currentShift === 1 ? 'bg-brand-50 border-brand-200 font-bold' : 'border-gray-100 dark:border-white/5 text-gray-400'}`}>
                              S1: {item.shift1}T
                           </div>
                           <div className={`text-[10px] p-1 rounded text-center border ${currentShift === 2 ? 'bg-brand-50 border-brand-200 font-bold' : 'border-gray-100 dark:border-white/5 text-gray-400'}`}>
                              S2: {item.shift2}T
                           </div>
                           <div className={`text-[10px] p-1 rounded text-center border ${currentShift === 3 ? 'bg-brand-50 border-brand-200 font-bold' : 'border-gray-100 dark:border-white/5 text-gray-400'}`}>
                              S3: {item.shift3}T
                           </div>
                        </div>
                      </div>
                    );
                  })}
               </div>
            </CardContent>
         </Card>

         {/* Shift Statistics */}
         <div className="space-y-6">
            <Card className="bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20">
               <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-600">
                     <CheckCircle2 className="h-5 w-5" />
                     Shift 1 Summary
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-white/[0.02] rounded-xl border border-emerald-100 dark:border-emerald-500/20 shadow-theme-xs">
                     <span className="text-xs text-gray-500">Total Out</span>
                     <span className="font-bold text-emerald-600">1,050 Ton</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-white/[0.02] rounded-xl border border-emerald-100 dark:border-emerald-500/20 shadow-theme-xs">
                     <span className="text-xs text-gray-500">Utilization</span>
                     <span className="font-bold text-emerald-600">98.2%</span>
                  </div>
               </CardContent>
            </Card>

            <Card>
               <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                     <BarChart3 className="h-5 w-5 text-brand-500" />
                     Forecast Shift 3
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                        <Truck className="h-4 w-4 text-gray-500" />
                     </div>
                     <div>
                        <p className="text-[10px] text-gray-400 uppercase font-black">Est. Vehicles</p>
                        <p className="text-sm font-bold">42 Units</p>
                     </div>
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-100 dark:bg-orange-500/5 dark:border-orange-500/20 rounded-xl flex gap-3 italic">
                     <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                     <p className="text-[10px] text-orange-700 dark:text-orange-400">Dibutuhkan tambahan 15 unit armada untuk mengejar target Shift 3 (Wilayah Timur).</p>
                  </div>
               </CardContent>
               <CardHeader className="pt-0">
                  <Button variant="outline" size="sm" className="w-full">Download Shift Log</Button>
               </CardHeader>
            </Card>
         </div>
      </div>
    </div>
  );
}
