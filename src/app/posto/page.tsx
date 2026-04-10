"use client";
import React from "react";
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Eye, 
  FileEdit, 
  Trash2,
  Calendar,
  Package,
  ArrowUpDown
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";

export default function PostoPage() {
  const postoData = [
    { id: "P-2026-04-001", transportir: "Siba Surya", product: "Urea Sub", qty: "500 Ton", date: "2026-04-10", status: "Active" },
    { id: "P-2026-04-002", transportir: "Puninar", product: "NPK Phonska", qty: "250 Ton", date: "2026-04-10", status: "In Progress" },
    { id: "P-2026-04-003", transportir: "TIKI Logistik", product: "ZA", qty: "120 Ton", date: "2026-04-09", status: "Completed" },
    { id: "P-2026-04-004", transportir: "Pos Logistik", product: "Urea Non-Sub", qty: "800 Ton", date: "2026-04-09", status: "Active" },
    { id: "P-2026-04-005", transportir: "Siba Surya", product: "SP-36", qty: "300 Ton", date: "2026-04-08", status: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POSTO Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor and manage all Distribution Orders (POSTO).</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Data
           </Button>
           <Button size="sm" onClick={() => window.location.href='/posto/upload'}>
              <Plus className="h-4 w-4 mr-2" />
              New POSTO
           </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-10" placeholder="Search by POSTO ID or Transportir..." />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-sm text-gray-500">
                 <Calendar className="h-4 w-4" />
                 <span>Filter Date: Today</span>
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
             <table className="w-full text-left min-w-[800px]">
               <thead className="bg-gray-50 dark:bg-white/[0.02]">
                 <tr className="border-b border-gray-100 dark:border-gray-800">
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900 transition-colors">
                         POSTO ID <ArrowUpDown className="h-3 w-3" />
                      </div>
                   </th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Transportir</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Product / Qty</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Date</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Status</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {postoData.map((posto) => (
                   <tr key={posto.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                     <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{posto.id}</div>
                     </td>
                     <td className="px-6 py-4 text-sm font-medium">{posto.transportir}</td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Package className="h-4 w-4 text-gray-400" />
                           <div>
                              <div className="text-sm font-bold">{posto.product}</div>
                              <div className="text-xs text-gray-500">{posto.qty}</div>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-sm text-gray-500 font-mono italic">{posto.date}</td>
                     <td className="px-6 py-4">
                        <Badge 
                           color={
                              posto.status === "Active" ? "info" : 
                              posto.status === "In Progress" ? "warning" : 
                              posto.status === "Completed" ? "success" : "error" as any
                           } 
                           size="sm"
                        >
                           {posto.status}
                        </Badge>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" title="View"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon-sm" title="Edit"><FileEdit className="h-4 w-4" /></Button>
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
