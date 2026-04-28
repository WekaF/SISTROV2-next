"use client";
import React, { useState } from "react";
import { 
  Ticket, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
  Truck,
  Package
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";

interface TicketData {
  bookingno: string;
  NoBooking?: string;
  idposto: string;
  NoPOSTO?: string;
  nopol: string;
  Nopol?: string;
  driver: string;
  DriverName?: string;
  ProductName?: string;
  Produk?: string;
  status: string;
  Status?: string;
  createdat: string;
  TglBooking?: string;
  JamMasuk?: string;
}

export default function RekananTicketPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const { apiTable } = useApi();

  const { data: ticketsResult, isLoading, isFetching } = useQuery({
    queryKey: ['rekanan-tickets', searchTerm],
    queryFn: async () => {
      const body = {
        draw: 1,
        start: 0,
        length: 100,
        search: { value: searchTerm },
        companyCode: (session?.user as any)?.companyCode
      };
      
      return apiTable('/api/Tiket/DataTableFilter', body);
    }
  });

  const tickets = ticketsResult?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Daftar Tiket Saya</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Monitoring status tiket dan kedatangan armada Anda.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['rekanan-tickets'] })}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
           </Button>
           <Button size="sm" onClick={() => window.location.href='/tiket/booking'} className="bg-brand-500 shadow-lg shadow-brand-500/20">
              <Plus className="h-4 w-4 mr-2" />
              Booking Baru
           </Button>
        </div>
      </div>

      <Card className="shadow-theme-xs">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <Input className="pl-10" placeholder="Cari No Booking atau Nopol..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-white/[0.02]">
                   <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Booking / POSTO</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Armada</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Driver</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest text-right">Activity</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                   {isLoading ? (
                      <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" /></td></tr>
                   ) : tickets.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-gray-500 italic">Belum ada tiket yang diterbitkan.</td></tr>
                   ) : tickets.map((t: TicketData) => (
                      <tr key={t.NoBooking || t.bookingno} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                         <td className="px-6 py-4">
                            <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">{t.NoBooking || t.bookingno}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase">Posto: {t.NoPOSTO || t.idposto}</div>
                         </td>
                         <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <div className="bg-gray-900 text-white px-2 py-1 rounded font-mono text-xs font-bold">{t.Nopol || t.nopol}</div>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">{t.Produk || t.ProductName}</div>
                         </td>
                         <td className="px-6 py-4">
                            <div className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">{t.DriverName || t.driver}</div>
                         </td>
                         <td className="px-6 py-4">
                            <Badge color={(t.JamMasuk || t.Status?.includes("Check")) ? 'success' : 'info'} size="sm" variant="light" className="italic font-bold">
                               {t.JamMasuk ? 'Check-in' : (t.Status || 'Booked')}
                            </Badge>
                         </td>
                         <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                               <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(t.TglBooking || t.createdat).toLocaleDateString()}
                               </div>
                               <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
                                  <Clock className="h-3 w-3" />
                                  {new Date(t.TglBooking || t.createdat).toLocaleTimeString()}
                               </div>
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
