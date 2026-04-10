"use client";
import React, { useState, useEffect } from "react";
import { 
  CalendarCheck, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Eye, 
  FileEdit, 
  Trash2,
  Calendar,
  Package,
  ArrowUpDown,
  TrendingUp,
  BarChart3,
  Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";

export default function QuotaSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [quotaData, setQuotaData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalDailyQuota: 0,
    totalBooked: 0,
    totalRealization: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/pod/kuota');
        const data = await res.json();
        if (data.success) {
          setQuotaData(data.data);
          setMetrics(data.metrics);
        }
      } catch (error) {
        console.error("Failed to fetch quota data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "info";
      case "Warning": return "warning";
      case "Completed": return "success";
      case "Expired": return "error";
      default: return "light";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-serif">Penjadwalan Kuota (Level 1)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola alokasi tonase harian dan periode untuk setiap produk.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
           </Button>
           <Button size="sm" onClick={() => window.location.href='/kuota/schedule/new'}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Kuota
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-500 shadow-theme-xs">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-lg text-brand-500">
                 <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Kuota (All Data)</p>
                 <p className="text-xl font-bold">{metrics.totalDailyQuota.toLocaleString('id-ID')} <span className="text-xs font-normal">Ton</span></p>
              </div>
           </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500 shadow-theme-xs">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-500">
                 <Package className="h-5 w-5" />
              </div>
              <div>
                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Terpesan (Booked)</p>
                 <p className="text-xl font-bold text-blue-600">{metrics.totalBooked.toLocaleString('id-ID')} <span className="text-xs font-normal">Ton</span></p>
              </div>
           </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500 shadow-theme-xs">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-orange-500">
                 <Clock className="h-5 w-5" />
              </div>
              <div>
                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Proses Muat (In)</p>
                 <p className="text-xl font-bold text-orange-600">0 <span className="text-xs font-normal">Ton</span></p>
              </div>
           </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500 shadow-theme-xs">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg text-green-500">
                 <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                 <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Realisasi (Out)</p>
                 <p className="text-xl font-bold text-green-600">{metrics.totalRealization.toLocaleString('id-ID')} <span className="text-xs font-normal">Ton</span></p>
              </div>
           </div>
        </Card>
      </div>

      <Card className="shadow-theme-xs">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-10 h-9" placeholder="Cari berdasarkan produk..." />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-sm text-gray-500 font-medium bg-gray-50 dark:bg-white/5 py-1.5 px-3 rounded-lg border border-gray-100 dark:border-white/10">
                 <Calendar className="h-4 w-4 text-brand-500" />
                 <span>April 2026</span>
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
             <table className="w-full text-left min-w-[1000px]">
               <thead className="bg-gray-50 dark:bg-white/[0.02]">
                 <tr className="border-b border-gray-100 dark:border-gray-800">
                   <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider">No.</th>
                   <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider">Tanggal</th>
                   <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider">Produk</th>
                   <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider text-center">Kuota (Ton)</th>
                   <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider text-center text-blue-500">Terpesan</th>
                   <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider text-center text-orange-500">Masuk</th>
                   <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider text-center text-green-500">Keluar</th>
                   <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider">Status</th>
                   <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400 tracking-wider text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                         <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-gray-500 italic">Memuat data kuota...</p>
                         </div>
                      </td>
                    </tr>
                  ) : quotaData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-500 italic">
                         Belum ada jadwal kuota yang dibuat.
                      </td>
                    </tr>
                  ) : (
                    quotaData.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">{(idx + 1).toString().padStart(2, '0')}</td>
                        <td className="px-6 py-4 text-sm font-semibold">{item.date}</td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-brand-50 rounded-lg text-brand-500 dark:bg-brand-500/10">
                                 <Package className="h-4 w-4" />
                              </div>
                              <span className="font-bold text-gray-900 dark:text-white">{item.product || "Unknown Product"}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-900 dark:text-white">{(item.quota || 0).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-center font-semibold text-blue-600 bg-blue-50/10 dark:bg-blue-500/5">{(item.booked || 0).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-center font-semibold text-orange-600 bg-orange-50/10 dark:bg-orange-500/5">{(item.incoming || 0).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-center font-semibold text-green-600 bg-green-50/10 dark:bg-green-500/5">{(item.outgoing || 0).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4">
                           <Badge 
                              color={getStatusColor(item.status) as any} 
                              size="sm"
                              variant="light"
                           >
                              {item.status || "Active"}
                           </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon-sm" title="View Detail" className="hover:text-brand-500"><Eye className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon-sm" title="Edit Shift Allocation" className="hover:text-blue-500"><CalendarCheck className="h-4 w-4" /></Button>
                             <Button variant="ghost" size="icon-sm" title="Delete" className="text-red-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
               </tbody>
             </table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
