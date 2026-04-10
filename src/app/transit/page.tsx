"use client";
import React from "react";
import { 
  Truck, 
  MapPin, 
  Clock, 
  Navigation, 
  Search,
  ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function TransitPage() {
  const transitData = [
    { id: "TR-001", truck: "W 1122 SS", driver: "Bambang", origin: "Plant Gresik", destination: "Gudang Tuban", progress: 65, status: "On Schedule" },
    { id: "TR-002", truck: "B 9900 KK", driver: "Slamet", origin: "Plant Kujang", destination: "DC Karawang", progress: 30, status: "Late 15m" },
    { id: "TR-003", truck: "BG 4455 LL", driver: "Joko", origin: "Plant Pusri", destination: "Hub Palembang", progress: 90, status: "Arriving" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resume In Transit</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring pengiriman barang yang sedang dalam perjalanan.</p>
        </div>
        <div className="relative w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
           <Input className="pl-10" placeholder="Cari No. Truck / Driver" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Shipments</CardTitle>
            <CardDescription>Daftar armada yang sedang melakukan perjalanan antar lokasi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {transitData.map((item) => (
               <div key={item.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-50 rounded-lg dark:bg-brand-500/10 text-brand-500">
                           <Truck className="h-5 w-5" />
                        </div>
                        <div>
                           <h4 className="font-bold text-gray-900 dark:text-white">{item.truck}</h4>
                           <p className="text-xs text-gray-500">{item.driver} • {item.id}</p>
                        </div>
                     </div>
                     <Badge color={item.status.includes("Late") ? "error" : "success" as any}>{item.status}</Badge>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-sm mb-6">
                     <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Origin</p>
                        <p className="font-medium text-gray-900 dark:text-white">{item.origin}</p>
                     </div>
                     <ArrowRight className="h-4 w-4 text-gray-300" />
                     <div className="flex-1 text-right">
                        <p className="text-xs text-gray-400 mb-1 justify-end flex items-center gap-1">Destination <Navigation className="h-3 w-3" /></p>
                        <p className="font-medium text-gray-900 dark:text-white">{item.destination}</p>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Delivery Progress</span>
                        <span className="font-bold text-brand-500">{item.progress}%</span>
                     </div>
                     <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="bg-brand-500 h-full transition-all duration-1000" style={{ width: `${item.progress}%` }} />
                     </div>
                  </div>
               </div>
             ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="text-lg">Route Overview</CardTitle>
             <CardDescription>Distribusi pengiriman saat ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl">
                <Navigation className="h-10 w-10 text-gray-300 mb-2" />
                <span className="text-sm text-gray-400">Route Map Integration Pending</span>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                   <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Avg. Transit Time</span>
                   </div>
                   <span className="font-bold text-gray-900 dark:text-white">4.2 Hours</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                   <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Active Shipments</span>
                   </div>
                   <span className="font-bold text-gray-900 dark:text-white">128 Trucks</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
