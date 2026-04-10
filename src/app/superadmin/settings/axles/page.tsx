"use client";
import React from "react";
import { 
  ArrowRightLeft, 
  Search, 
  Plus, 
  Weight, 
  Truck,
  Building,
  AlertTriangle,
  Settings2,
  CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function AxleConfigPage() {
  const [activeTab, setActiveTab] = React.useState("global");

  const axleData = [
    { type: "Truk GP", s2: "12T", s3: "15T", s4: "20T", s5: "25T", status: "Active" },
    { type: "Container 20ft", s2: "10T", s3: "14T", s4: "18T", s5: "22T", status: "Active" },
    { type: "Container 40ft", s2: "12T", s3: "16T", s4: "20T", s5: "30T", status: "Warning" },
  ];

  const plantAxleData = [
    { plant: "Plant Gresik", type: "Truk GP", custom_s3: "14.5T", limit: "Overridden", updatedAt: "2026-04-01" },
    { plant: "Plant Cilacap", type: "Truk GP", custom_s3: "15T", limit: "Default", updatedAt: "2026-03-15" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Konfigurasi Master Sumbu</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pengaturan ambang batas tonase per sumbu kendaraan secara global maupun per plant.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => setActiveTab("global")} className={activeTab === 'global' ? 'bg-brand-50 border-brand-200 text-brand-600' : ''}>Global Master</Button>
           <Button variant="outline" size="sm" onClick={() => setActiveTab("plant")} className={activeTab === 'plant' ? 'bg-brand-50 border-brand-200 text-brand-600' : ''}>Plant Specific</Button>
        </div>
      </div>

      {activeTab === "global" ? (
        <Card className="shadow-theme-xs border-blue-100 dark:border-blue-900/20">
          <CardHeader className="bg-blue-50/30 dark:bg-blue-900/5">
             <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-blue-700 flex items-center gap-2">
                    <Weight className="h-5 w-5" />
                    Global Axle Limits
                  </CardTitle>
                  <CardDescription>Standar tonase global untuk seluruh company.</CardDescription>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><Settings2 className="h-4 w-4 mr-2" /> Sync All</Button>
             </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 dark:bg-white/[0.01] border-b border-gray-100 dark:border-gray-800">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Vehicle Type</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Sumbu 2</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Sumbu 3</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Sumbu 4</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Sumbu 5+</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {axleData.map((axle, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <Truck className="h-4 w-4 text-gray-400" />
                                 <span className="font-bold text-gray-900 dark:text-white uppercase text-xs">{axle.type}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 font-mono font-bold text-gray-600">{axle.s2}</td>
                           <td className="px-6 py-4 font-mono font-bold text-gray-600">{axle.s3}</td>
                           <td className="px-6 py-4 font-mono font-bold text-gray-600">{axle.s4}</td>
                           <td className="px-6 py-4 font-mono font-bold text-gray-600">{axle.s5}</td>
                           <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-brand-500">Edit</Button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-theme-xs border-emerald-100 dark:border-emerald-900/20">
          <CardHeader className="bg-emerald-50/30 dark:bg-emerald-900/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-emerald-700 flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Plant Specific Overrides
                  </CardTitle>
                  <CardDescription>Limit khusus yang diterapkan pada plant tertentu.</CardDescription>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-2" /> Add Override</Button>
             </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 dark:bg-white/[0.01] border-b border-gray-100 dark:border-gray-800">
                      <tr>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Plant Name</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Vehicle Type</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Custom Limit</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider">Rule Type</th>
                         <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {plantAxleData.map((pxle, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                           <td className="px-6 py-4">
                              <div className="font-bold text-gray-900 dark:text-white uppercase text-xs">{pxle.plant}</div>
                              <div className="text-[10px] text-gray-400 italic">Last Sync: {pxle.updatedAt}</div>
                           </td>
                           <td className="px-6 py-4 text-xs font-medium">{pxle.type}</td>
                           <td className="px-6 py-4">
                              <span className="font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-bold">{pxle.custom_s3}</span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                 {pxle.limit === 'Overridden' ? <AlertTriangle className="h-3 w-3 text-orange-500" /> : <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                 <span className="text-[10px] font-bold uppercase">{pxle.limit}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="sm">Modify</Button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
