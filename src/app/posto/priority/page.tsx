"use client";
import React from "react";
import { Zap, ArrowUp, ArrowDown, Search, Filter, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function PostoPriorityPage() {
  const postoList = [
    { id: "P-2026-001", transportir: "Siba Surya", product: "Urea Sub", priority: 1, color: "error" },
    { id: "P-2026-002", transportir: "Puninar", product: "NPK", priority: 2, color: "warning" },
    { id: "P-2026-003", transportir: "TIKI Logistik", product: "ZA", priority: 3, color: "info" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prioritas Tujuan Muat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Atur prioritas pemuatan untuk dokumen POSTO tertentu agar didahulukan di gudang.</p>
        </div>
        <Button>
           <Save className="h-4 w-4 mr-2" />
           Update Prioritas
        </Button>
      </div>

      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <CardTitle>Daftar Antrian Prioritas</CardTitle>
                 <CardDescription>Drag and drop atau gunakan panah untuk mengatur urutan prioritas.</CardDescription>
              </div>
              <div className="relative w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <Input className="pl-10" placeholder="Cari POSTO..." />
              </div>
           </div>
        </CardHeader>
        <CardContent>
           <div className="space-y-3">
              {postoList.map((item, index) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-white dark:bg-white/[0.01] hover:border-brand-500 transition-colors">
                   <div className="flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-gray-400">
                      <Button variant="ghost" size="icon-sm"><ArrowUp className="h-4 w-4" /></Button>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">{index + 1}</span>
                      <Button variant="ghost" size="icon-sm"><ArrowDown className="h-4 w-4" /></Button>
                   </div>
                   
                   <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                         <p className="text-xs text-gray-500 uppercase">Nomor POSTO</p>
                         <p className="font-bold">{item.id}</p>
                      </div>
                      <div>
                         <p className="text-xs text-gray-500 uppercase">Transportir</p>
                         <p className="text-sm">{item.transportir}</p>
                      </div>
                      <div>
                         <p className="text-xs text-gray-500 uppercase">Produk</p>
                         <div className="flex items-center gap-2">
                            <span className="text-sm">{item.product}</span>
                            <Badge color={item.color as any} size="sm">Priority {item.priority}</Badge>
                         </div>
                      </div>
                   </div>

                   <Button variant="ghost" size="sm" className="text-red-500">Remove</Button>
                </div>
              ))}

              <div className="p-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-center">
                 <Button variant="outline">
                    <Zap className="h-4 w-4 text-orange-500 mr-2" />
                    Tambah POSTO Prioritas Baru
                 </Button>
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
