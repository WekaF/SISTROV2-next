"use client";
import React from "react";
import { 
  Package, 
  MapPin, 
  Search, 
  Plus, 
  ArrowRightLeft, 
  Tag, 
  Database,
  Layers,
  Edit,
  Trash2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function ProductMasterPage() {
  const products = [
    { code: "PRD001", name: "Urea Bersubsidi", category: "Pupuk", plants: ["Gresik", "Solo", "Semarang"], status: "Active" },
    { code: "PRD002", name: "NPK Phonska", category: "Pupuk", plants: ["Gresik", "Cilacap"], status: "Active" },
    { code: "PRD003", name: "ZA (Amonium Sulfat)", category: "Pupuk", plants: ["Gresik"], status: "Active" },
    { code: "PRD004", name: "SP-36", category: "Pupuk", plants: ["Gresik", "Banyuwangi"], status: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Produk & Mapping</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola katalog produk global dan tentukan ketersediaan produk di masing-masing plant.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Mapping Bulk
           </Button>
           <Button className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Produk
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl dark:bg-brand-500/10">
                     <Package className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Total Products</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">24</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl dark:bg-indigo-500/10">
                     <Layers className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Mappings Active</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">86</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
                     <Database className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Sync Status</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">UP TO DATE</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <Card className="shadow-theme-xs">
         <CardHeader className="border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-10" placeholder="Cari nama atau kode produk..." />
               </div>
               <div className="flex gap-2">
                  <Badge color="info" className="gap-1 px-3">
                     <Tag className="h-3 w-3" />
                     Category: All
                  </Badge>
               </div>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-white/[0.01]">
                     <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Product Info</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Category</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Mapped Plants</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Status</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {products.map((prd) => (
                        <tr key={prd.code} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center dark:bg-indigo-500/10 transition-transform group-hover:scale-105">
                                    <Package className="h-5 w-5" />
                                 </div>
                                 <div>
                                    <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{prd.name}</div>
                                    <div className="text-[10px] font-mono text-gray-400 tracking-widest">{prd.code}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 italic">{prd.category}</span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                 {prd.plants.map((p, i) => (
                                    <span key={i} className="flex items-center gap-1 text-[9px] font-black uppercase bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                                       <MapPin className="h-2 w-2" />
                                       {p}
                                    </span>
                                 ))}
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <Badge color={prd.status === 'Active' ? 'success' : 'error'} size="sm" variant="light">
                                 {prd.status}
                              </Badge>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                 <Button variant="ghost" size="sm" title="Mapping Data" className="text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10">
                                    <ArrowRightLeft className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                    <Edit className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="sm" className="text-gray-400 hover:text-rose-500">
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
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
