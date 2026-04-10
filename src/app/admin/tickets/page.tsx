"use client";
import React from "react";
import { 
  Ticket, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  ArrowUpDown,
  MoreVertical 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";

export default function AdminTicketsPage() {
  const mockTickets = [
    { id: "T-89211", plant: "Gresik", truck: "W 1234 AB", product: "Urea Sub", date: "2026-04-10 10:20", status: "In Queue" },
    { id: "T-89212", plant: "Kujang", truck: "B 5678 CD", product: "NPK", date: "2026-04-10 10:25", status: "Loading" },
    { id: "T-89213", plant: "Pusri", truck: "BG 9012 EF", product: "Urea Non-Sub", date: "2026-04-10 10:30", status: "Completed" },
    { id: "T-89214", plant: "Petro", truck: "L 3456 GH", product: "Phonska", date: "2026-04-10 10:35", status: "Gate In" },
    { id: "T-89215", plant: "Gresik", truck: "N 7890 IJ", product: "Urea Sub", date: "2026-04-10 10:40", status: "In Queue" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "success";
      case "Loading": return "warning";
      case "In Queue": return "info";
      default: return "default";
    }
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
                <Input className="pl-10" placeholder="Search by Ticket ID, Truck, or Plant..." />
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
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
             <table className="w-full text-left min-w-[800px]">
               <thead className="bg-gray-50 dark:bg-white/[0.02]">
                 <tr className="border-b border-gray-100 dark:border-gray-800">
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-brand-500">
                        Ticket ID <ArrowUpDown className="h-3 w-3" />
                      </div>
                   </th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Plant</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">No. Truck</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Produk</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Status</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Timestamp</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {mockTickets.map((ticket) => (
                   <tr key={ticket.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                     <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{ticket.id}</td>
                     <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{ticket.plant}</td>
                     <td className="px-6 py-4 text-sm font-medium">{ticket.truck}</td>
                     <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{ticket.product}</td>
                     <td className="px-6 py-4">
                        <Badge color={getStatusColor(ticket.status) as any} size="sm">{ticket.status}</Badge>
                     </td>
                     <td className="px-6 py-4 text-sm text-gray-500">{ticket.date}</td>
                     <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" title="View Detail">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm">
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
              <p className="text-sm text-gray-500">Showing 1 to 5 of 1,280 entries</p>
              <div className="flex items-center gap-1">
                 <Button variant="outline" size="sm" disabled>Previous</Button>
                 <Button variant="outline" size="sm" className="bg-brand-50 text-brand-500 border-brand-500">1</Button>
                 <Button variant="outline" size="sm">2</Button>
                 <Button variant="outline" size="sm">3</Button>
                 <Button variant="outline" size="sm">Next</Button>
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
