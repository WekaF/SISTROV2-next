"use client";
import React from "react";
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Globe,
  Activity,
  ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function PlantConfigPage() {
  const [plants, setPlants] = React.useState([
    { id: "P001", name: "Plant Gresik", company: "Petrokimia Gresik", region: "Jawa Timur", status: "Active", units: 12 },
    { id: "P002", name: "Plant Cilacap", company: "Pupuk Indonesia", region: "Jawa Tengah", status: "Active", units: 8 },
    { id: "P003", name: "Gudang Lini III Solo", company: "Pupuk Indonesia", region: "Jawa Tengah", status: "Inactive", units: 4 },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Konfigurasi Plant & Company</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola seluruh entitas plant dan unit bisnis di ekosistem SISTRO.</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Plant Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-brand-500 text-white border-none shadow-xl shadow-brand-500/10">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                     <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Companies</p>
                     <h3 className="text-2xl font-black">12</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl dark:bg-brand-500/10">
                     <Activity className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Active Plants</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">48</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
                     <Globe className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Regions Covered</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">8</h3>
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
              <Input className="pl-10" placeholder="Cari plant atau company..." />
            </div>
            <div className="flex items-center gap-2">
               <Badge color="info">Filter: Global View</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Plant Name</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Company</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Region</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Units</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {plants.map((plant) => (
                  <tr key={plant.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center font-bold dark:bg-brand-500/10 transition-transform group-hover:scale-110">
                           {plant.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">{plant.name}</div>
                          <div className="text-xs text-gray-400 font-mono italic">#{plant.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 italic">
                      {plant.company}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-brand-400" />
                        {plant.region}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="font-mono bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-xs font-bold">{plant.units} Units</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={plant.status === "Active" ? "success" : "error"} variant="light" size="sm">
                        {plant.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="hover:text-brand-500"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="hover:text-rose-500"><Trash2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="hover:text-amber-500"><ArrowRight className="h-4 w-4" /></Button>
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
