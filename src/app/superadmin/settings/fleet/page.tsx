"use client";
import React from "react";
import { 
  Truck, 
  Search, 
  Plus, 
  Filter, 
  History, 
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Table as TableIcon
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function FleetMasterPage() {
  const fleets = [
    { nopol: "W 9876 AB", transporter: "Siba Surya", type: "Truk GP", axle: "Sumbu 3", status: "Verified", expiry: "2027-10-12" },
    { nopol: "L 1234 XY", transporter: "Puninar", type: "Container 40ft", axle: "Sumbu 5", status: "Verified", expiry: "2026-05-20" },
    { nopol: "B 5555 JKL", transporter: "Local Vendor", type: "Truk GP", axle: "Sumbu 2", status: "Pending", expiry: "-" },
    { nopol: "W 1111 BC", transporter: "Siba Surya", type: "Truk GP", axle: "Sumbu 3", status: "Expired", expiry: "2026-01-01" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Armada (Global)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pusat autentikasi dan validasi data armada untuk seluruh ekosistem logistik.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2">
              <History className="h-4 w-4" />
              Audit Log
           </Button>
           <Button className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20">
              <Plus className="h-4 w-4 mr-2" />
              Entry Armada
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl dark:bg-brand-500/10">
                     <Truck className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Total Fleet</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">1,248</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs border-emerald-100 dark:border-emerald-900/10">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
                     <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Verified Units</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">92%</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs border-rose-100 dark:border-rose-900/10">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl dark:bg-rose-500/10">
                     <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Expired Access</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">14</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
         <CardHeader className="border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-10" placeholder="Cari Nopol atau Transporter..." />
               </div>
               <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
                  <Button variant="outline" size="sm"><TableIcon className="h-4 w-4 mr-2" /> CSV</Button>
               </div>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-white/[0.01]">
                     <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">NO. POLISI</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">TRANSPORTER</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">VEHICLE SPECS</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">VERIFICATION</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest text-right">ACTION</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {fleets.map((f, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="bg-gray-900 text-white px-3 py-1.5 rounded-md font-mono text-sm font-bold shadow-sm ring-1 ring-white/20">
                                    {f.nopol}
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">{f.transporter}</span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{f.type}</span>
                                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{f.axle}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <Badge 
                                    color={f.status === 'Verified' ? 'success' : f.status === 'Pending' ? 'warning' : 'error'} 
                                    size="sm" 
                                    variant="light"
                                 >
                                    {f.status}
                                 </Badge>
                                 <span className="text-[10px] text-gray-400">{f.expiry !== '-' && `Exp: ${f.expiry}`}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-brand-500"><CheckCircle2 className="h-4 w-4" /></Button>
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
