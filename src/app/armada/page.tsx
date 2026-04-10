"use client";
import React from "react";
import { 
  Truck, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  MoreVertical 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";

export default function ArmadaPage() {
  const armadaData = [
    { id: "ARM-001", truck: "W 1234 AB", transportir: "Siba Surya", type: "Trailer (6-Axle)", status: "Active", reg: "2026-12-01" },
    { id: "ARM-002", truck: "B 5678 CD", transportir: "Puninar", type: "Tronton (3-Axle)", status: "Active", reg: "2026-10-15" },
    { id: "ARM-003", truck: "BG 9012 EF", transportir: "JNE Logistik", type: "Engkel", status: "Maintenance", reg: "2026-05-20" },
    { id: "ARM-004", truck: "L 3456 GH", transportir: "Siba Surya", type: "Trailer (6-Axle)", status: "Active", reg: "2026-11-28" },
    { id: "ARM-005", truck: "N 7890 IJ", transportir: "Pos Logistik", type: "Box Grand", status: "Inactive", reg: "2026-06-12" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Armada Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola daftar kendaraan, perizinan, dan status operasional armada.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
           </Button>
           <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Registrasi Armada
           </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-10" placeholder="Search by Plate, ID, or Transportir..." />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-sm text-gray-500">Status:</span>
                 <select className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1 text-sm outline-none">
                   <option>All Status</option>
                   <option>Active</option>
                   <option>Inactive</option>
                   <option>Maintenance</option>
                 </select>
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
             <table className="w-full text-left min-w-[800px]">
               <thead className="bg-gray-50 dark:bg-white/[0.02]">
                 <tr className="border-b border-gray-100 dark:border-gray-800">
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Vehicle / ID</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Transportir</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Type</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Status</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Reg. Expiration</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {armadaData.map((armada) => (
                   <tr key={armada.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                     <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{armada.truck}</div>
                        <div className="text-xs text-gray-400">{armada.id}</div>
                     </td>
                     <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-medium">{armada.transportir}</td>
                     <td className="px-6 py-4 text-sm">{armada.type}</td>
                     <td className="px-6 py-4">
                        <Badge color={armada.status === "Active" ? "success" : armada.status === "Maintenance" ? "warning" : "error" as any} size="sm">
                           {armada.status}
                        </Badge>
                     </td>
                     <td className="px-6 py-4 text-sm text-gray-500 font-mono italic">{armada.reg}</td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" title="View"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon-sm" title="Edit"><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon-sm" title="Delete" className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
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
