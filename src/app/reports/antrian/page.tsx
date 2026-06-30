"use client";

import React, { useState, useMemo } from "react";
import { useApiTable } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Truck, 
  MapPin, 
  Package, 
  RefreshCcw, 
  Hash, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface AntrianEntry {
  number: number;
  id: string;
  bookingno: string;
  tiketno: string;
  nopol: string;
  driver: string;
  produkString: string;
  tujuan: string;
  qty: number;
  statuspemuatan: string;
  positionString: string;
  updatedonString: string;
  posto: string;
  asal: string; // Kabupaten/Asal
}

export default function ReportAntrianPerGudang() {
  const { addToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // We fetch all active queues (status == null)
  // The API /api/Antrian/DataTable returns active queues for the company
  const { data, isLoading, refresh } = useApiTable({
    url: "/api/Antrian/DataTable",
    defaultLength: 1000, // Fetch as many as possible to group client-side
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
    addToast({ title: "Updated", description: "Data antrian telah diperbarui" });
  };

  // Group data by Loading Warehouse (gudangMuat)
  const groupedData = useMemo(() => {
    if (!data) return {};
    
    const groups: Record<string, AntrianEntry[]> = {};
    data.forEach((item: any) => {
      // Use gudangMuat for "Antrian Pemuatan" context
      const warehouse = item.gudangMuat || "Sektor Umum";
      if (!groups[warehouse]) {
        groups[warehouse] = [];
      }
      groups[warehouse].push(item);
    });

    // Sort warehouses alphabetically
    return Object.keys(groups)
      .sort()
      .reduce((obj, key) => {
        obj[key] = groups[key];
        return obj;
      }, {} as Record<string, AntrianEntry[]>);
  }, [data]);

  const warehouseCount = Object.keys(groupedData).length;
  const totalTrucks = data?.length || 0;

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-800 space-y-4 p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-slate-100 uppercase leading-none">
            Report Antrian Per Gudang
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-widest flex items-center">
            <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
            Live Monitoring System
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex gap-2 mr-2">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 flex flex-col items-center min-w-[80px]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none mb-1">Gudang</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-200 leading-none">{warehouseCount}</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 flex flex-col items-center min-w-[80px]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-none mb-1">Truk</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-200 leading-none">{totalTrucks}</span>
            </div>
          </div>
          <Button 
            variant="default" 
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="rounded-none bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold h-12 px-6"
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            SYNC
          </Button>
        </div>
      </div>

      {/* Main Content - Horizontal Scrollable Area */}
      <div className="flex-1 overflow-x-auto pb-6 custom-scrollbar">
        <div className="flex gap-6 h-full min-w-max pr-6">
          {isLoading && !data ? (
             Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 space-y-4 animate-pulse">
                  <div className="h-6 bg-gray-200 w-3/4"></div>
                  <div className="h-4 bg-gray-100 w-1/2"></div>
                  <div className="space-y-3 mt-8">
                    <div className="h-28 bg-gray-50 border border-gray-100"></div>
                    <div className="h-28 bg-gray-50 border border-gray-100"></div>
                  </div>
                </div>
             ))
          ) : warehouseCount === 0 ? (
            <div className="flex flex-col items-center justify-center w-full bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-600 py-24 opacity-60">
              <AlertCircle className="w-16 h-16 text-slate-400 dark:text-slate-500 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Tidak ada antrian aktif saat ini</p>
            </div>
          ) : (
            Object.entries(groupedData).map(([warehouse, trucks]) => (
              <div 
                key={warehouse} 
                className="w-[400px] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md overflow-hidden"
              >
                {/* Warehouse Header */}
                <div className="bg-slate-900 dark:bg-slate-950 p-5 border-b-4 border-blue-500">
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-white text-lg tracking-tighter leading-tight uppercase truncate mr-4" title={warehouse}>
                      {warehouse}
                    </h3>
                    <div className="bg-blue-500 text-white font-black text-sm px-2.5 py-0.5 shrink-0">
                      {trucks.length}
                    </div>
                  </div>
                  <div className="flex items-center mt-2">
                     <MapPin className="w-3 h-3 text-blue-500 mr-1.5" />
                     <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Pos Sektor Antrian</span>
                  </div>
                </div>

                {/* Trucks List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900 custom-scrollbar">
                  {trucks.map((truck, idx) => (
                    <div 
                      key={truck.id || idx} 
                      className="bg-white dark:bg-slate-900 border-l-4 border-blue-500 border-y border-r border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative"
                    >
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className="bg-slate-100 dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              <Truck className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none mb-1 uppercase">
                                {truck.nopol}
                              </div>
                              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                {truck.driver || "UNASSIGNED DRIVER"}
                              </div>
                            </div>
                          </div>
                          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 opacity-30">
                            #{truck.number}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="bg-slate-50 dark:bg-slate-900 p-3 border border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Hash className="w-3 h-3 text-slate-500 dark:text-slate-400 mr-2" />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Booking</span>
                              </div>
                              <span className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight">{truck.bookingno}</span>
                            </div>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center pt-1">
                                <Package className="w-3 h-3 text-slate-500 dark:text-slate-400 mr-2" />
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Produk</span>
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right max-w-[200px] leading-tight">{truck.produkString}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-slate-800 dark:bg-slate-700 p-2 px-3">
                             <div className="flex items-center text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                               <Calendar className="w-3 h-3 mr-2" />
                               {truck.updatedonString || "-"}
                             </div>
                             <div className="text-xs font-black text-white">
                               {truck.qty} <span className="text-blue-500">TON</span>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

function Building2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
