"use client";
import React from "react";
import { 
  Search, 
  Filter, 
  Eye, 
  Calendar,
  Package,
  ArrowUpDown,
  Truck,
  MapPin
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";

interface TicketListViewProps {
  title?: string;
  description?: string;
}

export const TicketListView: React.FC<TicketListViewProps> = ({ 
  title = "SISTRO Tickets", 
  description = "View only access to ticket records." 
}) => {
  const ticketData = [
    { id: "T-2026-04-001", truck: "W 1234 AB", product: "Urea Sub", qty: "50 Ton", date: "2026-04-10", status: "In Queue" },
    { id: "T-2026-04-002", truck: "B 5678 CD", product: "NPK Phonska", qty: "25 Ton", date: "2026-04-10", status: "Loading" },
    { id: "T-2026-04-003", truck: "L 9012 EF", product: "ZA", qty: "12 Ton", date: "2026-04-10", status: "Done" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input className="pl-10" placeholder="Search by Ticket ID or Truck Number..." />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-sm text-gray-500">
                 <Calendar className="h-4 w-4" />
                 <span>Filter: Today</span>
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
                         Ticket ID <ArrowUpDown className="h-3 w-3" />
                      </div>
                   </th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Truck / Driver</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Product / Qty</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Date</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Status</th>
                   <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {ticketData.map((ticket) => (
                   <tr key={ticket.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                     <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white uppercase">{ticket.id}</div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Truck className="h-4 w-4 text-gray-400" />
                           <div className="font-medium text-sm">{ticket.truck}</div>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <Package className="h-4 w-4 text-gray-400" />
                           <div>
                              <div className="text-sm font-bold">{ticket.product}</div>
                              <div className="text-xs text-gray-500">{ticket.qty}</div>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-sm text-gray-500 font-mono italic">{ticket.date}</td>
                     <td className="px-6 py-4">
                        <Badge 
                           color={
                               ticket.status === "In Queue" ? "warning" : 
                               ticket.status === "Loading" ? "info" : "success"
                           } 
                           size="sm"
                        >
                           {ticket.status}
                        </Badge>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon-sm" title="View Details"><Eye className="h-4 w-4" /></Button>
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
};
