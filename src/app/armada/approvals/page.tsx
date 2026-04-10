"use client";
import React from "react";
import { CheckCircle2, XCircle, Eye, Truck, Search, Calendar, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function ArmadaApprovalsPage() {
  const approvalData = [
    { id: "REQ-001", transportir: "Siba Surya", truck: "W 1122 SS", type: "Trailer", date: "2026-04-10", status: "Pending" },
    { id: "REQ-002", transportir: "Puninar", truck: "B 9900 KK", type: "Tronton", date: "2026-04-10", status: "Pending" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Persetujuan Armada Baru</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Verifikasi dan setujui pengajuan armada dari Rekanan/Transportir.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
           <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <CardTitle>Pending Approvals</CardTitle>
                 <CardDescription>Review dokumen dan spesifikasi kendaraan sebelum memberikan izin muat.</CardDescription>
              </div>
              <div className="relative w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <Input className="pl-10" placeholder="Cari No. Truck / Rekanan..." />
              </div>
           </div>
        </CardHeader>
        <CardContent>
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-white/[0.02]">
                     <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Request ID</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Transportir</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Vehicle Info</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Date</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {approvalData.map((item) => (
                       <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{item.id}</td>
                          <td className="px-6 py-4 text-sm font-medium">{item.transportir}</td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-gray-400" />
                                <div>
                                   <div className="text-sm font-bold">{item.truck}</div>
                                   <div className="text-xs text-gray-400">{item.type}</div>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{item.date}</td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon-sm" title="View Details"><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon-sm" className="text-emerald-500 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon-sm" className="text-red-500 hover:bg-red-50"><XCircle className="h-4 w-4" /></Button>
                             </div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
              </table>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card>
            <CardHeader>
               <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Stats</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] rounded-xl">
                  <div>
                     <p className="text-sm text-gray-500">Total Approved This Month</p>
                     <p className="text-2xl font-bold">142</p>
                  </div>
                  <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center">
                     <CheckCircle2 className="h-6 w-6" />
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card>
            <CardHeader>
               <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-brand-500" /> SLA</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] rounded-xl">
                  <div>
                     <p className="text-sm text-gray-500">Avg. Approval Time</p>
                     <p className="text-2xl font-bold">4.2 Hours</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-100 dark:bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center">
                     <Clock className="h-6 w-6" />
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
