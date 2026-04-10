"use client";
import React from "react";
import { Settings, Weight, ShieldCheck, AlertCircle, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function AxleSetupPage() {
  const axleConfigs = [
    { type: "Engkel", axles: 2, maxTonnage: "5 Ton", status: "Active" },
    { type: "Double", axles: 2, maxTonnage: "10 Ton", status: "Active" },
    { type: "Tronton", axles: 3, maxTonnage: "25 Ton", status: "Active" },
    { type: "Trailer (Low)", axles: 4, maxTonnage: "32 Ton", status: "Active" },
    { type: "Trailer (Full)", axles: 6, maxTonnage: "45 Ton", status: "Active" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pengaturan Sumbu Kendaraan</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Konfigurasi jenis sumbu dan batas tonase maksimal untuk validasi tiket pemuatan.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4">
           <CardHeader>
              <CardTitle>Add New Config</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
              <div className="space-y-2">
                 <label className="text-xs font-semibold uppercase text-gray-400">Tipe Kendaraan</label>
                 <Input placeholder="e.g. Trailer Heavy" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-semibold uppercase text-gray-400">Jumlah Sumbu</label>
                 <Input type="number" placeholder="e.g. 8" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-semibold uppercase text-gray-400">Max Tonnage (Ton)</label>
                 <Input type="number" placeholder="50" />
              </div>
           </CardContent>
           <CardFooter>
              <Button className="w-full">
                 <Save className="h-4 w-4 mr-2" />
                 Save Configuration
              </Button>
           </CardFooter>
        </Card>

        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader>
             <CardTitle>Existing Axle Configurations</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 dark:bg-white/[0.02]">
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                         <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Vehicle Type</th>
                         <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Axles</th>
                         <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Max Load</th>
                         <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {axleConfigs.map((config) => (
                        <tr key={config.type} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                           <td className="px-6 py-4 font-bold">{config.type}</td>
                           <td className="px-6 py-4 text-sm font-medium">
                              <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 rounded-full bg-brand-500" />
                                 {config.axles} Sumbu
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <Badge color="info" size="sm" startIcon={<Weight className="h-3 w-3" />}>
                                 {config.maxTonnage}
                              </Badge>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="sm" className="text-brand-500">Edit</Button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 bg-brand-50 border border-brand-100 dark:bg-brand-500/5 dark:border-brand-500/10 rounded-xl flex items-start gap-4">
         <AlertCircle className="h-6 w-6 text-brand-500 mt-1" />
         <div className="text-sm text-brand-700 dark:text-brand-400">
            <p className="font-bold mb-1">Penting:</p>
            <p>Konfigurasi ini akan divalidasi oleh sistem saat pemesanan tiket oleh Rekanan. Armada tidak akan dapat membuat tiket jika tonase yang diminta melebihi kapasitas sumbu yang terdaftar.</p>
         </div>
      </div>
    </div>
  );
}
