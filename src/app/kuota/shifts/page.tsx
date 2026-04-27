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
  const [loading, setLoading] = useState(true);
  const [shiftData, setShiftData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [currentShift, setCurrentShift] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const calculateActiveShift = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 1;
    if (hour >= 14 && hour < 22) return 2;
    return 3;
  };

  const getShiftTimeRange = (s: number) => {
    if (s === 1) return "06:00 - 14:00";
    if (s === 2) return "14:00 - 22:00";
    return "22:00 - 06:00";
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/kuota/shifts');
      const data = await res.json();
      if (data.success) {
        setShiftData(data.data);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch shift data", error);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    setCurrentShift(calculateActiveShift());
    fetchData();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monitoring Kuota Per-Shift</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pemantauan realisasi muat berdasarkan pembagian shift harian (Data Real Time).</p>
        </div>
        <div className="flex flex-col items-end gap-1">
           <div className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-brand-500/20">
              <Clock className="h-5 w-5 animate-pulse" />
              <div className="flex flex-col -space-y-1">
                 <span className="text-[10px] uppercase font-black opacity-80">Active Shift</span>
                 <span className="text-sm font-bold font-serif">Shift {currentShift} ({getShiftTimeRange(currentShift)})</span>
              </div>
           </div>
           <p className="text-[10px] text-gray-400">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Shift Performance Summary */}
         <Card className="lg:col-span-2">
            <CardHeader>
               <div className="flex items-center justify-between">
                  <CardTitle>Realisasi Per-Area</CardTitle>
                  <Button variant="ghost" size="sm" className="text-brand-500" onClick={fetchData}>Refresh Data</Button>
               </div>
               <CardDescription>Performa pemuatan dibandingkan dengan target alokasi shift hari ini.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-6">
                  {shiftData.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 italic">
                      Tidak ada data kuota ditemukan untuk hari ini.
                    </div>
                  ) : shiftData.map((item) => {
                    const progress = item.total > 0 ? (item.realization / item.total) * 100 : 0;
                    return (
                      <div key={item.abbrev} className="space-y-2">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <Warehouse className="h-4 w-4 text-brand-500" />
                             <div className="flex flex-col">
                                <span className="font-bold text-sm">{item.area || item.abbrev}</span>
                                <span className="text-[10px] text-gray-400 uppercase font-mono">{item.abbrev}</span>
                             </div>
                           </div>
                           <div className="text-sm">
                              <span className="font-bold">{item.realization.toLocaleString()}</span>
                              <span className="text-gray-400"> / {item.total.toLocaleString()} Ton</span>
                           </div>
                        </div>
                        <div className="relative w-full h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                           <div 
                              className={`absolute left-0 top-0 h-full transition-all duration-1000 ${
                                progress > 90 ? "bg-emerald-500" : progress > 50 ? "bg-brand-500" : progress > 0 ? "bg-orange-500" : "bg-gray-200 dark:bg-gray-800"
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                           />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                           <div className={`text-[10px] p-1.5 rounded-lg text-center border transition-all ${currentShift === 1 ? 'bg-brand-500 text-white border-brand-500 font-bold shadow-sm shadow-brand-500/20' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-500'}`}>
                              S1: {item.shift1}T
                           </div>
                           <div className={`text-[10px] p-1.5 rounded-lg text-center border transition-all ${currentShift === 2 ? 'bg-brand-500 text-white border-brand-500 font-bold shadow-sm shadow-brand-500/20' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-500'}`}>
                              S2: {item.shift2}T
                           </div>
                           <div className={`text-[10px] p-1.5 rounded-lg text-center border transition-all ${currentShift === 3 ? 'bg-brand-500 text-white border-brand-500 font-bold shadow-sm shadow-brand-500/20' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 text-gray-500'}`}>
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
                     {currentShift === 1 ? "Active" : "Last"} Shift Summary
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-white/[0.02] rounded-xl border border-emerald-100 dark:border-emerald-500/20 shadow-theme-xs">
                     <span className="text-xs text-gray-500">Total Out</span>
                     <span className="font-bold text-emerald-600">{summary[1]?.totalOut || 0} Ton</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-white/[0.02] rounded-xl border border-emerald-100 dark:border-emerald-500/20 shadow-theme-xs">
                     <span className="text-xs text-gray-500">Utilization</span>
                     <span className="font-bold text-emerald-600">{summary[1]?.utilization.toFixed(1) || 0}%</span>
                  </div>
               </CardContent>
            </Card>

            <Card className={currentShift === 2 ? "bg-brand-50/50 dark:bg-brand-500/5 border-brand-100 dark:border-brand-500/20" : ""}>
               <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                     <BarChart3 className="h-5 w-5 text-brand-500" />
                     Forecast Shift {currentShift === 3 ? 1 : currentShift + 1}
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                        <Truck className="h-4 w-4 text-gray-500" />
                     </div>
                     <div>
                        <p className="text-[10px] text-gray-400 uppercase font-black">Target Vol.</p>
                        <p className="text-sm font-bold">{summary[currentShift === 3 ? 1 : currentShift + 1]?.totalQuota || 0} Ton</p>
                     </div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 dark:bg-blue-500/5 dark:border-blue-500/20 rounded-xl flex gap-3 italic">
                     <Info className="h-4 w-4 text-blue-500 shrink-0" />
                     <p className="text-[10px] text-blue-700 dark:text-blue-400">Data estimasi muat akan diperbarui berdasarkan status antrian kendaraan saat ini.</p>
                  </div>
               </CardContent>
               <CardHeader className="pt-0">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href='/kuota/schedule'}>Manage Schedule</Button>
               </CardHeader>
            </Card>
         </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
