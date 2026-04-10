"use client";
import React from "react";
import { 
  Home, 
  MapPin, 
  Search, 
  Plus, 
  ArrowRightLeft, 
  Warehouse, 
  Navigation,
  Globe,
  Settings2,
  Table as TableIcon
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function WarehouseMasterPage() {
  const warehouses = [
    { code: "WH-GRS-01", name: "Gudang Utama A", type: "Loading", parent: "Plant Gresik", capacity: "50,000 T", status: "Active" },
    { code: "WH-GRS-02", name: "Gudang Utama B", type: "Loading", parent: "Plant Gresik", capacity: "40,000 T", status: "Active" },
    { code: "WH-SOL-01", name: "Gudang Penyangga Solo", type: "Destination", parent: "Puskud Jateng", capacity: "12,000 T", status: "Active" },
    { code: "WH-SMG-01", name: "Gudang Semarang Barat", type: "Destination", parent: "Puskud Jateng", capacity: "15,000 T", status: "Maintenance" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Gudang & Mapping</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Konfigurasi gudang muat dan gudang tujuan serta mapping rute distribusi.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2">
              <Navigation className="h-4 w-4" />
              Route Mapping
           </Button>
           <Button className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Gudang
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="p-4 border-gray-100 dark:border-gray-800 shadow-theme-xs flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center mb-2 dark:bg-brand-500/10">
               <Warehouse className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">12</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Loading Points</div>
         </Card>
         <Card className="p-4 border-gray-100 dark:border-gray-800 shadow-theme-xs flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-2 dark:bg-indigo-500/10">
               <MapPin className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">214</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Destinations</div>
         </Card>
         <Card className="p-4 border-gray-100 dark:border-gray-800 shadow-theme-xs flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-2 dark:bg-emerald-500/10">
               <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">482</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Active Routes</div>
         </Card>
         <Card className="p-4 border-gray-100 dark:border-gray-800 shadow-theme-xs flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mb-2 dark:bg-rose-500/10">
               <Globe className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">12</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Provinsi</div>
         </Card>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
         <CardHeader className="border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-10" placeholder="Cari kode atau nama gudang..." />
               </div>
               <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="text-gray-500"><TableIcon className="h-4 w-4 mr-2" /> Export CSV</Button>
               </div>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-white/[0.01]">
                     <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Warehouse Info</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Type</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Company / Plant</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Capacity</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {warehouses.map((wh) => (
                        <tr key={wh.code} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center border border-gray-100 dark:bg-white/5 dark:border-gray-800 transition-transform group-hover:rotate-12">
                                    <Home className="h-5 w-5" />
                                 </div>
                                 <div>
                                    <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm">{wh.name}</div>
                                    <div className="text-[10px] font-mono text-gray-400 font-bold tracking-widest">#{wh.code}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <Badge color={wh.type === 'Loading' ? 'info' : 'warning'} variant="light" size="sm" className="font-black italic">
                                 {wh.type}
                              </Badge>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{wh.parent}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs font-bold text-brand-600">{wh.capacity}</span>
                           </td>
                           <td className="px-6 py-4 text-center">
                              <div className={`inline-flex h-2 w-2 rounded-full ${wh.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'} shadow-[0_0_8px_rgba(16,185,129,0.4)] mr-2`} />
                              <span className="text-xs font-medium">{wh.status}</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                 <Button variant="ghost" size="icon-sm" className="text-gray-400 hover:text-brand-500"><Settings2 className="h-4 w-4" /></Button>
                                 <Button variant="ghost" size="icon-sm" className="text-gray-400 hover:text-rose-500"><Plus className="h-4 w-4" /></Button>
                              </div>
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
