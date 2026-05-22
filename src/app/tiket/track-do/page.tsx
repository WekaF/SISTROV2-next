"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
// Using native client fetch to route through Next.js API proxy routes
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  Map, 
  Clock, 
  CheckCircle2, 
  Navigation, 
  AlertCircle, 
  X,
  Truck,
  Building,
  Calendar,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import Leaflet map to disable SSR clashing
const LeafletRouteMap = dynamic(
  () => import("@/components/map/LeafletRouteMap"),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-2xl gap-3 animate-pulse">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm font-bold text-slate-400">Memuat Peta Interaktif...</span>
      </div>
    )
  }
);

interface IntegratedTicket {
  NoTiket: string;
  NoPosto: string;
  Tanggal: string;
  Nopol: string;
  Driver: string;
  DoNumber: string;
}

interface DOTrackingData {
  no_do: string;
  transpoter: string;
  trackLat: string;
  trackLng: string;
  latAsal: string;
  lngAsal: string;
  latTujuan: string;
  lngTujuan: string;
  namaAsalPlant: string;
  namaTujuanPlant: string;
  status: number; // 0 = Selesai, 1 = Proses
  start_time: string;
  gr_time: string;
  last_update: string;
  status_close: string;
}

export default function TrackDoPage() {
  const [tickets, setTickets] = useState<IntegratedTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<IntegratedTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedDo, setCopiedDo] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Tracking Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trackingData, setTrackingData] = useState<DOTrackingData | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [activeNopol, setActiveNopol] = useState("");

  // SSE Real-time Stream states and refs
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [streamLastUpdated, setStreamLastUpdated] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load integrated tickets list
  const fetchTickets = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/tiket/integrated");
      if (!res.ok) {
        throw new Error(`Gagal mengambil data tiket terintegrasi (${res.status})`);
      }
      const result = await res.json();
      if (result.status === "success" && result.data && result.data.list) {
        setTickets(result.data.list);
        setFilteredTickets(result.data.list);
      } else {
        setTickets([]);
        setFilteredTickets([]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal menghubungkan ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time EventSource SSE Stream Connection
  useEffect(() => {
    const connect = () => {
      if (esRef.current) {
        esRef.current.close();
      }

      setStreamStatus("connecting");
      const es = new EventSource("/api/stream/tiket-integrasi");
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.status === "success" && parsed.data && parsed.data.list) {
            setTickets(parsed.data.list);
          } else {
            setTickets([]);
          }
          setStreamStatus("live");
          setStreamLastUpdated(new Date());
          setIsLoading(false);
        } catch (err) {
          console.error("Failed to parse SSE payload:", err);
        }
      };

      es.onerror = () => {
        setStreamStatus("error");
        es.close();
        esRef.current = null;
        clearTimeout(retryTimeoutRef.current ?? undefined);
        // Auto-reconnect after 5 seconds
        retryTimeoutRef.current = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeoutRef.current ?? undefined);
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  // Reset page strictly when searchTerm changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Filter list on search or tickets update
  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFilteredTickets(tickets);
      return;
    }

    const filtered = tickets.filter(ticket => 
      (ticket.NoTiket || "").toLowerCase().includes(term) ||
      (ticket.NoPosto || "").toLowerCase().includes(term) ||
      (ticket.Nopol || "").toLowerCase().includes(term) ||
      (ticket.Driver || "").toLowerCase().includes(term) ||
      (ticket.DoNumber || "").toLowerCase().includes(term)
    );
    setFilteredTickets(filtered);
  }, [searchTerm, tickets]);

  // Paginate list
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredTickets.length / pageSize);

  // Copy to clipboard helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDo(text);
    setTimeout(() => setCopiedDo(null), 2000);
  };

  // Fetch DO tracking coordinate data
  const handleTrack = async (doNumber: string, nopol: string) => {
    setIsTrackingLoading(true);
    setTrackingError(null);
    setTrackingData(null);
    setActiveNopol(nopol);
    setIsModalOpen(true);

    try {
      const res = await fetch("/api/tiket/track-do", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nomorDO: doNumber })
      });

      if (!res.ok) {
        throw new Error("Gagal melacak posisi armada.");
      }

      const result = await res.json();
      if (result.status === "success" && result.data) {
        setTrackingData(result.data);
      } else {
        throw new Error(result.message || "Data rute DO tidak ditemukan.");
      }
    } catch (err: any) {
      console.error(err);
      setTrackingError(err.message || "Gagal menghubungi modul GPS.");
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Helper formatting dates
  const formatTgl = (dateString: string | null) => {
    if (!dateString) return "-";
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString;

    return dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  const formatTglWaktu = (dateString: string | null) => {
    if (!dateString) return "-";
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return dateString;

    return dateObj.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " WIB";
  };

  // Metrics calculations
  const totalTickets = tickets.length;
  const totalArmada = new Set(tickets.map(t => t.Nopol).filter(Boolean)).size;
  const totalDrivers = new Set(tickets.map(t => t.Driver).filter(Boolean)).size;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Track Tiket Integrasi DO</h1>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Daftar tiket Sistro yang terintegrasi dengan Nomor DO dari sistem DPCS PT Pupuk Indonesia
          </p>
          
          {/* SSE Real-time Status indicator */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 border-t border-slate-100 dark:border-slate-800/60 pt-2">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "h-2 w-2 rounded-full",
                streamStatus === "live" && "bg-emerald-500 animate-pulse",
                streamStatus === "connecting" && "bg-amber-500 animate-pulse",
                streamStatus === "error" && "bg-rose-500"
              )} />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {streamStatus === "live" && "Koneksi Real-time Aktif"}
                {streamStatus === "connecting" && "Menghubungkan Aliran Data..."}
                {streamStatus === "error" && "Koneksi Terputus (Reconnecting)"}
              </span>
            </div>
            
            {streamLastUpdated && (
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                Pembaruan: {streamLastUpdated.toLocaleTimeString("id-ID")} WIB
              </span>
            )}
          </div>
        </div>
        <Button 
          onClick={fetchTickets}
          disabled={isLoading}
          variant="outline"
          className="rounded-2xl border-2 font-bold text-xs uppercase tracking-widest gap-2 bg-slate-50 dark:bg-slate-800"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* KPI Metric Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Truck className="h-24 w-24 text-slate-300 dark:text-slate-700" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[10px] tracking-widest">
              Total Tiket Terintegrasi
            </CardDescription>
            <CardTitle className="text-4xl font-black text-slate-800 dark:text-slate-100">
              {isLoading ? "--" : totalTickets}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
              Data Tahun Berjalan
            </span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Navigation className="h-24 w-24 text-sky-300 dark:text-sky-700" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[10px] tracking-widest">
              Armada Unik Terkoneksi
            </CardDescription>
            <CardTitle className="text-4xl font-black text-sky-600 dark:text-sky-400">
              {isLoading ? "--" : totalArmada}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xs font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-lg">
              GPS & Plat Terdaftar
            </span>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-3xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="h-24 w-24 text-violet-300 dark:text-violet-700" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[10px] tracking-widest">
              Driver Aktif
            </CardDescription>
            <CardTitle className="text-4xl font-black text-violet-600 dark:text-violet-400">
              {isLoading ? "--" : totalDrivers}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-xs font-bold text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-lg">
              Sopir Pengiriman DO
            </span>
          </CardContent>
        </Card>

      </div>

      {/* Main Grid: Filters and Datatable */}
      <Card className="border-none shadow-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-black text-slate-800 dark:text-slate-200">Daftar Tiket Terintegrasi</CardTitle>
              <CardDescription className="font-medium text-xs">Cari tiket berdasarkan nomor booking, posto, nopol, driver, atau DO</CardDescription>
            </div>
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Cari Tiket..."
                className="pl-11 h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus-visible:ring-primary rounded-xl font-semibold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          
          {errorMsg && (
            <div className="m-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {errorMsg}
            </div>
          )}

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="h-10 w-10 text-primary animate-spin" />
              <span className="font-extrabold text-sm tracking-wider uppercase">Mengambil data tiket...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                <Search className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="font-black text-slate-700 dark:text-slate-300 text-lg mb-1">Tiket Tidak Ditemukan</h3>
              <p className="text-sm font-medium text-center max-w-xs">Tidak ada tiket terintegrasi yang cocok dengan pencarian Anda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    <th className="py-4 px-6">No. Tiket / POSTO</th>
                    <th className="py-4 px-6">Tanggal Booking</th>
                    <th className="py-4 px-6">Nopol & Driver</th>
                    <th className="py-4 px-6">DO Number</th>
                    <th className="py-4 px-6 text-center">Aksi Pelacakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {paginatedTickets.map((ticket, idx) => (
                    <tr 
                      key={idx}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors font-medium"
                    >
                      {/* Ticket & POSTO Code */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {ticket.NoTiket || "-"}
                        </div>
                        <div className="text-xs font-semibold text-slate-400 mt-0.5">
                          POSTO: {ticket.NoPosto || "-"}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {formatTgl(ticket.Tanggal)}
                        </div>
                      </td>

                      {/* Fleet Plate & Driver */}
                      <td className="py-4 px-6">
                        <span className="inline-block bg-slate-900 dark:bg-slate-950 text-white font-mono text-xs font-bold px-2 py-0.5 rounded border border-slate-700">
                          {ticket.Nopol || "-"}
                        </span>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase">
                          {ticket.Driver || "No Driver"}
                        </div>
                      </td>

                      {/* DO Number click-to-copy */}
                      <td className="py-4 px-6">
                        {ticket.DoNumber ? (
                          <div className="flex items-center gap-2 group">
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                              {ticket.DoNumber}
                            </span>
                            <button
                              onClick={() => handleCopy(ticket.DoNumber)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded text-slate-500"
                              title="Copy DO Number"
                            >
                              {copiedDo === ticket.DoNumber ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No DO</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-4 px-6 text-center">
                        {ticket.DoNumber ? (
                          <Button
                            onClick={() => handleTrack(ticket.DoNumber, ticket.Nopol)}
                            className="bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl font-extrabold text-xs uppercase tracking-wider py-1.5 h-auto"
                          >
                            <Map className="h-3.5 w-3.5 mr-1.5" />
                            Lacak Rute
                          </Button>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">Tidak Terlacak</span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>

              {/* High-Fidelity Premium Pagination Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/5">
                <div className="text-xs font-bold text-slate-500">
                  Menampilkan <span className="text-slate-800 dark:text-slate-200">{filteredTickets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> - <span className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredTickets.length)}</span> dari <span className="text-slate-800 dark:text-slate-200">{filteredTickets.length}</span> data
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Page Size Selection */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Baris:</span>
                    <select 
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-100 dark:bg-slate-800 border-none outline-none font-bold text-xs px-2 py-1 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {[10, 25, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nav Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-3 rounded-lg font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                    >
                      Sebelumnya
                    </Button>
                    
                    <span className="text-xs font-black text-slate-600 dark:text-slate-400 px-2 min-w-[45px] text-center">
                      {currentPage} / {totalPages || 1}
                    </span>

                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="h-8 px-3 rounded-lg font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </CardContent>
      </Card>

      {/* Modern Glassmorphic Map Tracking Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Blur Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Navigation className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Posisi Terkini Armada</h3>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plat Nomor: {activeNopol}</div>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white rounded-xl text-slate-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              
              {isTrackingLoading ? (
                <div className="h-[400px] flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                  <span className="font-extrabold text-sm uppercase tracking-widest">Menghubungi Sistem GPS PIHC...</span>
                </div>
              ) : trackingError ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 gap-3">
                  <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-full text-rose-500">
                    <AlertCircle className="h-10 w-10" />
                  </div>
                  <h4 className="font-black text-slate-800 dark:text-slate-200">Koneksi Pelacakan Gagal</h4>
                  <p className="text-sm font-medium text-slate-500 max-w-sm">{trackingError}</p>
                </div>
              ) : trackingData ? (
                <div className="space-y-6">
                  
                  {/* Status Banner */}
                  <div className={cn(
                    "flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border-2 font-bold gap-3",
                    trackingData.status === 0 
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-950 text-emerald-700 dark:text-emerald-400"
                      : "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-950 text-sky-700 dark:text-sky-400"
                  )}>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest block opacity-75">Status Perjalanan</span>
                      <span className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                        {trackingData.status === 0 ? <CheckCircle2 className="h-5 w-5" /> : <Navigation className="h-5 w-5 animate-pulse" />}
                        {trackingData.status === 0 ? "PERJALANAN SELESAI" : "DALAM PROSES PENGIRIMAN"}
                      </span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-black tracking-widest block opacity-75">Nomor DO</span>
                      <span className="font-mono text-base font-black tracking-wide">{trackingData.no_do}</span>
                    </div>
                  </div>

                  {/* Leaflet Dynamic Interactive Map */}
                  <div className="h-[400px] w-full relative">
                    <LeafletRouteMap
                      latAsal={parseFloat(trackingData.latAsal)}
                      lngAsal={parseFloat(trackingData.lngAsal)}
                      latTruk={parseFloat(trackingData.trackLat)}
                      lngTruk={parseFloat(trackingData.trackLng)}
                      latTujuan={parseFloat(trackingData.latTujuan)}
                      lngTujuan={parseFloat(trackingData.lngTujuan)}
                      namaAsal={trackingData.namaAsalPlant}
                      namaTujuan={trackingData.namaTujuanPlant}
                      nopol={activeNopol}
                    />
                  </div>

                  {/* Route & Times Milestone Panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                    
                    {/* Plant Origin and Destination */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Detail Rute Pemuatan</h4>
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-full border-[3px] border-emerald-500 bg-white dark:bg-slate-950 shrink-0" />
                          <div className="w-0.5 h-8 bg-slate-200 dark:bg-slate-800" />
                          <div className="w-3.5 h-3.5 rounded-full border-[3px] border-rose-500 bg-white dark:bg-slate-950 shrink-0" />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Pabrik / Asal Muat</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{trackingData.namaAsalPlant || "Origin Plant"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Gudang / Destinasi</span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{trackingData.namaTujuanPlant || "Destination Plant"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TimeLogs */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Milestone Waktu</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Berangkat</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 block leading-tight">
                            {formatTglWaktu(trackingData.start_time)}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Tiba di Tujuan</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 block leading-tight">
                            {formatTglWaktu(trackingData.gr_time)}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-sky-500/5 rounded-2xl border border-sky-500/10 flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-500">Update Terakhir GPS</span>
                        <span className="text-sky-600 dark:text-sky-400 font-black">{formatTglWaktu(trackingData.last_update)}</span>
                      </div>
                    </div>

                  </div>

                </div>
              ) : null}

            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/10 flex justify-end gap-3 rounded-b-[2rem]">
              <Button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest px-6 py-2.5"
              >
                Tutup
              </Button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
