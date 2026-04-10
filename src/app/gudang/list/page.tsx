"use client";
import React from "react";
import { Warehouse, MapPin, Package, Settings, Search, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function GudangListPage() {
  const warehouses = [
    { id: "G-001", name: "Gudang Utama A", location: "Sektor Barat", capacity: "10.000 Ton", stock: "6.500 Ton", status: "Open" },
    { id: "G-002", name: "Gudang Lini II", location: "Sektor Timur", capacity: "5.000 Ton", stock: "4.800 Ton", status: "Near Full" },
    { id: "G-003", name: "Gudang Penyangga", location: "Luar Plant", capacity: "8.000 Ton", stock: "2.100 Ton", status: "Open" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Master Data Gudang</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Daftar gudang yang terdaftar dan dikelola pada plant ini.</p>
        </div>
        <Button>
           <Plus className="h-4 w-4 mr-2" />
           Daftarkan Gudang Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((w) => (
          <Card key={w.id} className="hover:border-brand-500 transition-colors">
            <CardHeader>
               <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-lg text-brand-500">
                     <Warehouse className="h-5 w-5" />
                  </div>
                  <Badge color={w.status === "Open" ? "success" : "warning" as any}>{w.status}</Badge>
               </div>
               <CardTitle className="text-lg">{w.name}</CardTitle>
               <CardDescription className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {w.location}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <p className="text-[10px] text-gray-400 uppercase font-bold">Kapasitas</p>
                     <p className="text-sm font-bold">{w.capacity}</p>
                  </div>
                  <div>
                     <p className="text-[10px] text-gray-400 uppercase font-bold">Current Stock</p>
                     <p className="text-sm font-bold">{w.stock}</p>
                  </div>
               </div>
               
               <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <Button variant="ghost" size="sm">
                     <Settings className="h-4 w-4 mr-2" />
                     Configure
                  </Button>
                  <Button variant="ghost" size="sm" className="text-brand-500">
                     <Package className="h-4 w-4 mr-2" />
                     Stock Log
                  </Button>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
