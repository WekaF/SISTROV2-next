"use client";
import React, { useState } from "react";
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  DownloadCloud,
  Loader2,
  Table as TableIcon,
  BarChart2,
  Ticket,
  Truck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useQuery } from "@tanstack/react-query";

export default function RekananReportPage() {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const { data: reportResult, isLoading, isFetching } = useQuery({
    queryKey: ['rekanan-report', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/rekanan/tiket?start=${dateRange.start}&end=${dateRange.end}`);
      const data = await res.json();
      return data.data || [];
    }
  });

  const reports = reportResult || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Report Pemesanan Tiket</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Ekspor dan tinjau riwayat aktivitas pemesanan tiket armada Anda.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="gap-2">
              <DownloadCloud className="h-4 w-4" />
              Download PDF
           </Button>
           <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 gap-2">
              <TableIcon className="h-4 w-4" />
              Export Excel
           </Button>
        </div>
      </div>

      <Card className="shadow-theme-xs border-brand-100 dark:border-brand-900/10">
         <CardHeader>
            <div className="flex flex-col md:flex-row items-center gap-4">
               <div className="flex items-center gap-2 w-full md:w-auto">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <Input 
                    type="date" 
                    className="h-9 text-xs w-full md:w-40 rounded-lg" 
                    value={dateRange.start} 
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  />
                  <span className="text-gray-400">to</span>
                  <Input 
                    type="date" 
                    className="h-9 text-xs w-full md:w-40 rounded-lg" 
                    value={dateRange.end} 
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  />
               </div>
               <Button variant="secondary" size="sm" className="w-full md:w-auto font-bold">Tampilkan Data</Button>
            </div>
         </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl dark:bg-brand-500/10">
                     <Ticket className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Total Booked</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">{reports.length}</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl dark:bg-indigo-500/10">
                     <BarChart2 className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Utiliasi Posto</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">85%</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
                     <Truck className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Active Fleets</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">12</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Transaction Details</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Posto Reference</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Vehicle / Driver</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest text-right">Activity Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" /></td></tr>
                ) : reports.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-gray-500 italic">Data laporan tidak ditemukan untuk periode ini.</td></tr>
                ) : reports.map((r: any) => (
                  <tr key={r.bookingno} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white font-mono">{r.bookingno}</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">{r.status === '1' ? 'Issued' : 'Finished'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300">#{r.idposto}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{r.ProductName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold">{r.nopol}</div>
                      <div className="text-xs text-gray-500">{r.driver}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="text-xs font-bold text-gray-600 dark:text-gray-400">{new Date(r.createdat).toLocaleString()}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
