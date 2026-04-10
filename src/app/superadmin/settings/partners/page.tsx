"use client";
import React from "react";
import { 
  Handshake, 
  Search, 
  Plus, 
  Building2, 
  ShieldCheck, 
  ExternalLink,
  MapPin,
  TrendingUp,
  Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function PartnerConfigPage() {
  const [partners, setPartners] = React.useState([
    { id: "V001", name: "PT Siba Surya", type: "Transportir", coverage: "Nasional", status: "Verified", joiningDate: "2024-01-10" },
    { id: "V002", name: "PT Puninar Logistik", type: "Transportir", coverage: "Jawa-Bali", status: "Verified", joiningDate: "2024-02-15" },
    { id: "V003", name: "Puskud Jatim", type: "Distributor", coverage: "Jawa Timur", status: "Active", joiningDate: "2024-03-20" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Konfigurasi Rekanan (Partner)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manajemen data mitra transportir dan pihak ketiga yang terintegrasi dengan SISTRO.</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Rekanan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="p-4 flex flex-col items-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center mb-2 dark:bg-brand-500/10">
               <Handshake className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">240</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Total Partners</div>
         </Card>
         <Card className="p-4 flex flex-col items-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-2 dark:bg-emerald-500/10">
               <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">218</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Verified Accounts</div>
         </Card>
         <Card className="p-4 flex flex-col items-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-2 dark:bg-indigo-500/10">
               <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">12</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">New Requests</div>
         </Card>
         <Card className="p-4 flex flex-col items-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center mb-2 dark:bg-blue-500/10">
               <Clock className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">99%</div>
            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">SLA Status</div>
         </Card>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <Input className="pl-10" placeholder="Cari rekanan..." />
              </div>
              <div className="flex items-center gap-2">
                 <Badge color="info">Role: Transportir</Badge>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.01]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Partner Identity</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Service Type</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Coverage Area</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {partners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 bg-brand-50 text-brand-500 border border-brand-100 rounded-xl flex items-center justify-center font-bold dark:bg-brand-500/10 dark:border-brand-500/20">
                            <Building2 className="h-5 w-5" />
                         </div>
                         <div>
                            <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{partner.name}</div>
                            <div className="text-[10px] font-mono text-gray-400 font-bold tracking-widest">ID: {partner.id}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium italic text-gray-600 dark:text-gray-400">
                      {partner.type}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                         <MapPin className="h-3 w-3 text-brand-400" />
                         {partner.coverage}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={partner.status === 'Verified' ? 'success' : 'info'} variant="light" size="sm" className="font-black italic">
                        {partner.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="icon-sm" className="text-gray-400 hover:text-brand-500">
                          <ExternalLink className="h-4 w-4" />
                       </Button>
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
