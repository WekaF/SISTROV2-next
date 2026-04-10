"use client";
import React from "react";
import { 
  BarChart3, 
  Search, 
  MapPin, 
  Filter, 
  Clock, 
  Truck 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";

export default function AntrianPage() {
  const mockPlants = [
    { name: "Plant Gresik", queue: 45, status: "Normal", color: "success" },
    { name: "Plant Kujang", queue: 120, status: "High Demand", color: "warning" },
    { name: "Plant Pusri", queue: 85, status: "Busy", color: "warning" },
    { name: "Plant Petro", queue: 12, status: "Low", color: "success" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Antrian Truk</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring antrian real-time di seluruh unit plant.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter Wilayah</Button>
           <Button size="sm"><BarChart3 className="h-4 w-4 mr-2" /> Daily Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockPlants.map((plant) => (
          <Card key={plant.name} className="hover:border-brand-500 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="p-2 bg-brand-50 rounded-lg dark:bg-brand-500/10">
                  <MapPin className="h-5 w-5 text-brand-500" />
                </div>
                <Badge color={plant.color as any} size="sm">{plant.status}</Badge>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-gray-900 dark:text-white">{plant.name}</h3>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{plant.queue}</span>
                  <span className="text-sm text-gray-400 pb-1">Truk mengantri</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Rincian Antrian Per Unit</CardTitle>
              <CardDescription>Detail status antrian di setiap tahapan (Security, Timbangan, Gudang).</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10" placeholder="Cari Nama Plant..." />
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-gray-50 dark:bg-white/[0.02]">
                 <tr className="border-b border-gray-100 dark:border-gray-800">
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Plant Unit</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-center">Security (Gate In)</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-center">Timbangan (JBT)</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-center">Gudang (Loading)</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Avg. Wait Time</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {mockPlants.map((plant) => (
                   <tr key={plant.name} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                     <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{plant.name}</td>
                     <td className="px-6 py-4 text-center">
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                         {Math.floor(plant.queue * 0.4)} Truk
                       </span>
                     </td>
                     <td className="px-6 py-4 text-center">
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                         {Math.floor(plant.queue * 0.3)} Truk
                       </span>
                     </td>
                     <td className="px-6 py-4 text-center">
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800">
                         {Math.floor(plant.queue * 0.3)} Truk
                       </span>
                     </td>
                     <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2 text-sm text-gray-600 dark:text-gray-400">
                         <Clock className="h-4 w-4" />
                         45 Menit
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
