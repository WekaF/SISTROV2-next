"use client";
import React from "react";
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  ArrowUpDown,
  MoreVertical,
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";

export default function AdminTicketsPage() {
  const { apiTable } = useApi();
  const [searchTerm, setSearchTerm] = React.useState("");

  const { data: ticketsResult, isLoading } = useQuery({
    queryKey: ['admin-tickets', searchTerm],
    queryFn: async () => {
      const body = {
        draw: 1,
        start: 0,
        length: 25,
        search: { value: searchTerm }
      };
      return apiTable('/api/Tiket/DataTableFilter', body);
    }
  });

  const tickets = ticketsResult?.data || [];

  const getStatusColor = (status: string) => {
    if (!status) return "default";
    const s = status.toLowerCase();
    if (s.includes("complete") || s.includes("selesai")) return "success";
    if (s.includes("load") || s.includes("muat")) return "warning";
    if (s.includes("queue") || s.includes("antri")) return "info";
    if (s.includes("check")) return "success";
    return "default";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Ticket Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring seluruh tiket logistik dari semua plant dan company.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
           <Button size="sm">Create Manual Ticket</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-10" 
                  placeholder="Search by Ticket ID, Truck, or Plant..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
               <span className="text-sm text-gray-500">Show:</span>
               <select className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1 text-sm outline-none">
                 <option>10 lines</option>
                 <option>25 lines</option>
                 <option>50 lines</option>
               </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto min-h-[400px]">
             <table className="w-full text-left min-w-[800px]">
               <thead className="bg-gray-50 dark:bg-white/[0.02]">
                 <tr className="border-b border-gray-100 dark:border-gray-800">
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-brand-500">
                        Ticket ID <ArrowUpDown className="h-3 w-3" />
                      </div>
                   </th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Plant / Company</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">No. Truck</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Produk</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Status</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Timestamp</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {isLoading ? (
                   <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" /></td></tr>
                 ) : tickets.length === 0 ? (
                   <tr><td colSpan={7} className="py-20 text-center text-gray-500 italic">Data tidak ditemukan.</td></tr>
                 ) : tickets.map((ticket: any) => (
                   <tr key={ticket.NoBooking || ticket.bookingno} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                     <td className="px-6 py-4 font-bold text-gray-900 dark:text-white font-mono">{ticket.NoBooking || ticket.bookingno}</td>
                     <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{ticket.PlantName || ticket.NamaPlant || ticket.companyCode || "-"}</td>
                     <td className="px-6 py-4 text-sm font-medium">{ticket.Nopol || ticket.nopol}</td>
                     <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{ticket.Produk || ticket.ProductName}</td>
                     <td className="px-6 py-4">
                        <Badge color={getStatusColor(ticket.Status || ticket.status) as any} size="sm">{ticket.Status || ticket.status}</Badge>
                     </td>
                     <td className="px-6 py-4 text-sm text-gray-500">
                       {ticket.TglBooking || ticket.createdat ? new Date(ticket.TglBooking || ticket.createdat).toLocaleString('id-ID') : "-"}
                     </td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="View Detail" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
           
           <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500">
                Menampilkan {tickets.length} data.
              </p>
              <div className="flex items-center gap-1">
                 <Button variant="outline" size="sm" disabled>Previous</Button>
                 <Button variant="outline" size="sm" className="bg-brand-50 text-brand-500 border-brand-500">1</Button>
                 <Button variant="outline" size="sm">Next</Button>
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
