"use client";
import React from "react";
import { Navigation, MapPin, Package, Settings, Search, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function GudangTargetsPage() {
  const routes = [
    { id: "R-01", destination: "Penyangga Jatim", type: "Distribution", priority: "High", status: "Active" },
    { id: "R-02", destination: "Penyangga Jateng", type: "Distribution", priority: "Normal", status: "Active" },
    { id: "R-03", destination: "Inter-Plant Transfer", type: "Operational", priority: "Low", status: "Inactive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gudang Tujuan Muat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Konfigurasi alamat dan titik koordinat gudang tujuan untuk tracking armada.</p>
        </div>
        <Button>
           <Navigation className="h-4 w-4 mr-2" />
           Daftarkan Tujuan Baru
        </Button>
      </div>

      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
              <div>
                 <CardTitle>Destination Registry</CardTitle>
                 <CardDescription>Daftar lokasi tujuan pemuatan yang sah di sistem.</CardDescription>
              </div>
              <div className="relative w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <Input className="pl-10" placeholder="Cari Nama Gudang..." />
              </div>
           </div>
        </CardHeader>
        <CardContent>
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-white/[0.02]">
                     <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Target ID</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Destination Name</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Category</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Priority</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {routes.map((route) => (
                       <tr key={route.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{route.id}</td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{route.destination}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{route.type}</td>
                          <td className="px-6 py-4">
                             <Badge color={route.priority === "High" ? "error" : route.priority === "Normal" ? "info" : "default" as any} size="sm">
                                {route.priority}
                             </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <Button variant="ghost" size="sm" className="text-brand-500">
                                <Settings className="h-4 w-4 mr-2" />
                                Edit
                             </Button>
                          </td>
                       </tr>
                     ))}
                  </tbody>
              </table>
           </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card className="bg-emerald-50/30 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center gap-2 text-emerald-600"><Package className="h-4 w-4" /> Ready for Loading</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-2xl font-bold">12 Destinations</p>
               <p className="text-xs text-emerald-600">Active and receiving shipments</p>
            </CardContent>
         </Card>
         <Card className="bg-red-50/30 border-red-100 dark:bg-red-500/5 dark:border-red-500/10">
            <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center gap-2 text-red-600"><Settings className="h-4 w-4" /> Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-2xl font-bold">3 Locations</p>
               <p className="text-xs text-red-600">Temporarily closed for reception</p>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
