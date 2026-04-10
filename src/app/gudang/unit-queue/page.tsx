"use client";
import React from "react";
import { Layers, Warehouse, Clock, Users, BarChart3, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";

export default function UnitQueuePage() {
  const units = [
    { name: "Unit Pengantongan I", queue: 45, avgWait: "55m", status: "Optimal" },
    { name: "Unit Pengantongan II", queue: 120, avgWait: "1h 45m", status: "Congested" },
    { name: "Unit Muat Curah", queue: 12, avgWait: "15m", status: "Fast Track" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Antrian Per Unit Muat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring kepadatan antrian di setiap fasilitas pengantongan dan pemuatan.</p>
        </div>
        <Button variant="outline">
           <BarChart3 className="h-4 w-4 mr-2" />
           View Stats
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {units.map((unit) => (
          <Card key={unit.name} className={`relative overflow-hidden ${unit.status === "Congested" ? "border-red-200 dark:border-red-900/50" : ""}`}>
            {unit.status === "Congested" && (
              <div className="absolute top-0 right-0 p-2">
                 <Badge color="error" size="sm">High Alert</Badge>
              </div>
            )}
            <CardHeader className="pb-2">
               <div className="p-2 bg-gray-50 dark:bg-white/[0.05] w-fit rounded-lg mb-2">
                  <Warehouse className="h-5 w-5 text-gray-400" />
               </div>
               <CardTitle className="text-lg">{unit.name}</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex items-end justify-between mb-6">
                  <div>
                     <p className="text-3xl font-bold text-gray-900 dark:text-white">{unit.queue}</p>
                     <p className="text-xs text-gray-500 uppercase font-bold">Trucks Waiting</p>
                  </div>
                  <div className="text-right">
                     <div className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-white">
                        <Clock className="h-4 w-4 text-brand-500" />
                        {unit.avgWait}
                     </div>
                     <p className="text-[10px] text-gray-400 uppercase font-bold text-right italic">Avg. Wait Time</p>
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-gray-500">Service Status</span>
                     <Badge color={unit.status === "Congested" ? "error" : unit.status === "Optimal" ? "success" : "info" as any} variant="light" size="sm">
                        {unit.status}
                     </Badge>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                     <div className={`h-full rounded-full ${unit.status === "Congested" ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: unit.status === "Congested" ? "85%" : "45%" }} />
                  </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
         <CardHeader>
            <div className="flex items-center justify-between">
               <div>
                  <CardTitle>Peak Hour Distribution</CardTitle>
                  <CardDescription>Penyebaran kedatangan armada per jam untuk seluruh unit.</CardDescription>
               </div>
               <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
         </CardHeader>
         <CardContent>
            <div className="h-48 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-center text-gray-400 text-sm">
               Distribution Chart Widget Placeholder
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
