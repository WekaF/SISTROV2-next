"use client";
import React, { useState } from "react";
import { 
  BarChart3, 
  Search, 
  MapPin, 
  Filter, 
  Clock, 
  RefreshCw,
  History
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AntrianPage() {
  const [search, setSearch] = useState("");
  
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["antrian"],
    queryFn: async () => {
      const res = await fetch("/api/antrian");
      if (!res.ok) throw new Error("Failed to fetch antrian");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const antrianData = data?.data || [];
  const summaryData = data?.summary || [];

  const filteredData = antrianData.filter((item: any) => 
    item.ticketID?.toLowerCase().includes(search.toLowerCase()) ||
    item.StorageName?.toLowerCase().includes(search.toLowerCase()) ||
    item.ProductName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Antrian Truk</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring antrian real-time di unit plant.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading || isFetching}>
             <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> 
             Refresh
           </Button>
           <Button size="sm"><BarChart3 className="h-4 w-4 mr-2" /> Daily Report</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : summaryData.length > 0 ? (
          summaryData.map((storage: any) => (
            <Card key={storage.StorageID} className="hover:border-brand-500 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-brand-50 rounded-lg dark:bg-brand-500/10">
                    <MapPin className="h-5 w-5 text-brand-500" />
                  </div>
                  <Badge color="primary" size="sm">Active</Badge>
                </div>
                <div className="mt-4">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">{storage.StorageName}</h3>
                  <div className="flex items-end gap-2 mt-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{storage.QueueCount}</span>
                    <span className="text-sm text-gray-400 pb-1">Truk mengantri</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-gray-500">
              Tidak ada antrian aktif saat ini.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Rincian Antrian Real-time</CardTitle>
              <CardDescription>Daftar tiket yang berada dalam antrian gudang saat ini.</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10" 
                placeholder="Cari Tiket / Gudang..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
             <Table>
               <TableHeader className="bg-gray-50 dark:bg-white/[0.02]">
                 <TableRow>
                   <TableHead>Ticket ID</TableHead>
                   <TableHead>Storage / Gudang</TableHead>
                   <TableHead>Produk</TableHead>
                   <TableHead>Waktu Masuk</TableHead>
                   <TableHead className="text-right">Durasi Tunggu</TableHead>
                   <TableHead className="text-center">Status</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoading ? (
                   Array(5).fill(0).map((_, i) => (
                     <TableRow key={i}>
                       <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                     </TableRow>
                   ))
                 ) : filteredData.length > 0 ? (
                   filteredData.map((item: any) => (
                     <TableRow key={item.id}>
                       <TableCell className="font-medium">{item.ticketID}</TableCell>
                       <TableCell>{item.StorageName}</TableCell>
                       <TableCell>{item.ProductName || "-"}</TableCell>
                       <TableCell>{new Date(item.EntryTime).toLocaleString()}</TableCell>
                       <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-2 text-sm">
                           <Clock className="h-4 w-4 text-gray-400" />
                           {item.WaitMinutes} Menit
                         </div>
                       </TableCell>
                       <TableCell className="text-center">
                         <Badge color={item.Status ? "info" : "warning"} variant="solid" size="sm">
                           {item.Status || "ANTRI"}
                         </Badge>
                       </TableCell>
                     </TableRow>
                   ))
                 ) : (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                       Data antrian tidak ditemukan.
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
