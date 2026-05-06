"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Scan, Search, Loader2, ArrowRight, CheckCircle2, 
  LogOut, AlertCircle, History, Truck, User, Info, 
  Package, MapPin, Building2, Timer, Zap, QrCode,
  Printer, XCircle, Camera, Keyboard, Bluetooth
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Types
interface TicketDetailData {
  id: number;
  bookingno: string;
  tiketno: string;
  posto: string;
  position: string;
  positionString: string;
  nopol: string;
  driver: string;
  transportString: string;
  asal: string;
  tujuan: string;
  produkString: string;
  qty: number;
  jeniskendaraan: string;
  gudangtujuan: string;
  percepatan: string;
  postowilayah: string;
  nomorantrian: string;
  labelantrian: string;
  statuspemuatan: string;
  tipe: string;
  company: string;
  shift: string;
}

interface TicketLog {
  id: number;
  bookingno: string;
  positioncode: string;
  position: string;
  updatedon: string;
}

interface TicketResponse {
  data: TicketDetailData;
  log: TicketLog[];
}

interface ActionResponse {
  role: string;
  text: string;
  gudangtujuan: string;
  validasi: "success" | "warning" | "error";
  position: string;
  log: TicketLog[];
}

export default function ScanTiketPage() {
  const [bookingNo, setBookingNo] = useState("");
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [logs, setLogs] = useState<TicketLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"manual" | "camera">("manual");
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const { data: session } = useSession();

  // Handle camera toggle
  useEffect(() => {
    if (scanMode === "camera" && !isCameraActive) {
      startScanner();
    } else if (scanMode !== "camera" && isCameraActive) {
      stopScanner();
    }

    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
  }, [scanMode]);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      setIsCameraActive(true);
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setBookingNo(decodedText);
          handleSearch(undefined, decodedText);
          stopScanner();
          setScanMode("manual");
        },
        () => {
          // Failure callback, usually ignored to keep scanning
        }
      );
    } catch (err) {
      console.error("Camera error:", err);
      addToast({
        title: "Gagal Kamera",
        description: "Pastikan izin kamera diberikan.",
        variant: "destructive"
      });
      setScanMode("manual");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsCameraActive(false);
      } catch (err) {
        console.error("Stop error:", err);
      }
    }
  };

  // Auto-focus input on mount and after actions
  useEffect(() => {
    if (scanMode === "manual") {
      inputRef.current?.focus();
    }
  }, [ticket, isActionLoading, scanMode]);

  const handleSearch = async (e?: React.FormEvent, overrideNo?: string) => {
    e?.preventDefault();
    const cleanBookingNo = (overrideNo || bookingNo).trim();
    if (!cleanBookingNo) return;

    setIsLoading(true);
    setSearchError(null);
    setTicket(null);
    setLogs([]);

    try {
      const res = await apiFetch("/api/Tiket/DetailData", {
        method: "POST",
        body: JSON.stringify({ bookingno: cleanBookingNo })
      });

      if (res.ok) {
        const result: TicketResponse = await res.json();
        setTicket(result.data);

        // Sort logs: latest first
        const sortedLogs = [...(result.log || [])].sort((a, b) =>
          new Date(b.updatedon).getTime() - new Date(a.updatedon).getTime()
        );
        setLogs(sortedLogs);
      } else {
        const errorText = await res.text();
        setSearchError(errorText || "Tiket tidak ditemukan.");
      }
    } catch (err: any) {
      setSearchError("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async () => {
    if (!ticket) return;

    setIsActionLoading(true);
    try {
      const res = await apiFetch("/api/Tiket/CheckinDW1_GP", {
        method: "POST",
        body: JSON.stringify({ bookingno: ticket.bookingno })
      });

      const result: ActionResponse = await res.json();

      if (result.validasi === "success") {
        addToast({
          title: "Berhasil",
          description: result.text,
          variant: "success",
        });

        // Update local ticket with new position and logs from result
        if (ticket) {
          setTicket({
            ...ticket,
            position: result.position,
            positionString: result.text.includes("Security In") ? "Security In" :
              result.text.includes("Security Out") ? "Security Out / Selesai" :
                ticket.positionString
          });
        }
        const sortedLogs = [...(result.log || [])].sort((a, b) =>
          new Date(b.updatedon).getTime() - new Date(a.updatedon).getTime()
        );
        setLogs(sortedLogs);
        setBookingNo("");
      } else if (result.validasi === "warning") {
        addToast({
          title: "Peringatan",
          description: result.text,
          variant: "warning",
        });
      } else {
        addToast({
          title: "Gagal",
          description: result.text,
          variant: "destructive",
        });
      }
    } catch (err) {
      addToast({
        title: "Kesalahan",
        description: "Gagal memproses aksi scan.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePrint = () => {
    if (!ticket?.tiketno) return;

    // Create hidden iframe if it doesn't exist
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    // Load print page into iframe
    iframe.src = `/security/print?bookingno=${ticket.tiketno}`;
  };

  // Helper for position color
  const getPositionBadge = (pos: string, text: string) => {
    if (pos === "00") return <Badge color="warning">{text}</Badge>;
    if (pos === "06") return <Badge color="indigo">{text}</Badge>;
    if (pos === "07") return <Badge color="success">{text}</Badge>;
    return <Badge color="info">{text}</Badge>;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 space-y-6">

        {/* Breadcrumbs inside main content */}
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">SISTRO</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Scan Tiket</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Input Section */}
        <Card className="shadow-lg border-2 border-primary/10 overflow-hidden">
          <CardHeader className="bg-white border-b pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" /> Scan Tiket
              </CardTitle>
              <CardDescription>Masukkan Kode Booking Sistro.</CardDescription>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setScanMode("manual")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${scanMode === "manual" ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Keyboard className="h-4 w-4" /> MANUAL / BT
              </button>
              <button 
                onClick={() => setScanMode("camera")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${scanMode === "camera" ? 'bg-white shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Camera className="h-4 w-4" /> KAMERA
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {scanMode === "camera" ? (
              <div className="space-y-4">
                <div id="reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 min-h-[300px]"></div>
                <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shadow-sm animate-pulse">
                  <Camera className="h-5 w-5" />
                  <span className="text-sm font-black uppercase tracking-widest">Kamera Aktif - Dekatkan Kode QR</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="BOOKINGNO / SCAN QR..."
                      className="w-full h-14 pl-4 pr-12 text-xl font-mono font-bold tracking-wider uppercase bg-slate-100 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      value={bookingNo}
                      onChange={(e) => setBookingNo(e.target.value)}
                      disabled={isLoading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Bluetooth className="h-6 w-6 opacity-30" />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="h-14 px-8 rounded-xl font-bold gap-2"
                    disabled={isLoading || !bookingNo.trim()}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    CARI
                  </Button>
                </form>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <Info className="h-3 w-3" />
                  Bluetooth scanner akan otomatis mengisi input di atas saat aktif
                </div>
              </div>
            )}

            {searchError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-5 w-5 shrink-0" />
                {searchError}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        {ticket && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="shadow-xl border-none overflow-hidden">
              {/* Logo & Header */}
              <div className="bg-white px-6 py-4 flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                  <Image src="/images/logo/logosistro.png" alt="Sistro Logo" width={80} height={36} className="object-contain" />
                  <div className="h-8 w-px bg-slate-200" />
                  <Image src="/images/logo/logocompany.png" alt="Pupuk Indonesia Logo" width={90} height={36} className="object-contain" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Logistics</div>
                  <div className="text-xs font-black text-primary">SISTRO V2.0</div>
                </div>
              </div>

              {/* Info Header: Antrian & Status */}
              <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">No. Antrian</span>
                    <div className="text-xl font-black leading-tight">{ticket.nomorantrian || "-"}</div>
                  </div>
                  <div className="h-8 w-px bg-slate-700" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status Pemuatan</span>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${ticket.statuspemuatan === 'progress' ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`} />
                      <span className="text-sm font-bold uppercase">{ticket.statuspemuatan || "Pending"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Label Antrian</span>
                  <div className="text-xs font-bold text-primary-foreground opacity-80">{ticket.labelantrian || "-"}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">

                {/* Left: Transportir */}
                <div className="p-6 bg-white border-r border-slate-100">
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <Truck className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Data Transportir</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">No. Booking</div>
                      <div className="text-xl font-mono font-black text-primary">{ticket.bookingno}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Nopol</div>
                        <Badge className="text-lg font-mono px-3 py-1 bg-slate-900 text-white rounded-md border-none">{ticket.nopol}</Badge>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Jenis</div>
                        <div className="font-bold text-slate-700">{ticket.jeniskendaraan}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Driver / Pengemudi</div>
                      <div className="flex items-center gap-2 font-black text-slate-800 uppercase">
                        <User className="h-4 w-4 text-slate-300" />
                        {ticket.driver || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Perusahaan</div>
                      <div className="font-bold text-slate-700">{ticket.transportString}</div>
                    </div>
                  </div>
                </div>

                {/* Right: Delivery */}
                <div className="p-6 bg-slate-50/30">
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <Package className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Data Pengiriman</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">POSTO / Order</div>
                        <div className="font-mono font-bold text-slate-600">{ticket.posto}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Tipe</div>
                        <div className="text-xs font-black text-slate-600">{ticket.tipe}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Produk</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-slate-800">{ticket.produkString}</span>
                        <span className="text-sm font-bold text-slate-400">{ticket.qty} TON</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Asal</div>
                        <div className="text-xs font-bold text-slate-700 truncate" title={ticket.asal}>{ticket.asal}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                      <div className="flex-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Tujuan</div>
                        <div className="text-xs font-bold text-slate-700 truncate" title={ticket.tujuan}>{ticket.tujuan}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center pt-1 flex-wrap">
                      {ticket.gudangtujuan && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-black uppercase">
                          <Building2 className="h-3 w-3" />
                          {ticket.gudangtujuan}
                        </div>
                      )}
                      {ticket.company && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-black uppercase">
                          <MapPin className="h-3 w-3" />
                          {ticket.company}
                        </div>
                      )}
                      {ticket.percepatan && ticket.percepatan !== "0" && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-black uppercase">
                          <Zap className="h-3 w-3" />
                          PERCEPATAN
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Action Bar */}
              <div className="px-6 py-4 bg-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</div>
                  {getPositionBadge(ticket.position, ticket.positionString)}
                </div>

                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Print Button - ONLY for Position 01 */}
                  {ticket.position === "01" && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-14 px-6 border-slate-300 font-bold gap-2 text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                      onClick={handlePrint}
                      disabled={isActionLoading || !ticket.tiketno}
                    >
                      <Printer className="h-5 w-5" />
                      PRINT PASS
                    </Button>
                  )}

                  {/* Main Action Button (Verifikasi) */}
                  {!["07"].includes(ticket.position) && (
                    <Button
                      size="lg"
                      className="h-14 px-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg gap-3 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] transition-all transform active:scale-95"
                      onClick={handleAction}
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                      VERIFIKASI
                    </Button>
                  )}

                  {/* Tolak Button */}
                  {!["07"].includes(ticket.position) && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-14 px-8 border-rose-500 text-rose-500 hover:bg-rose-50 font-bold text-lg gap-3 transition-all"
                      onClick={() => {
                        setTicket(null);
                        setBookingNo("");
                        inputRef.current?.focus();
                      }}
                      disabled={isActionLoading}
                    >
                      <XCircle className="h-6 w-6" />
                      TOLAK
                    </Button>
                  )}

                  {ticket.position === "07" && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-sm animate-in zoom-in-95">
                      <CheckCircle2 className="h-6 w-6" />
                      <span className="font-black text-sm uppercase tracking-wider">Tiket Selesai</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Timeline Logs */}
            <Card className="shadow-xl border-none bg-slate-50/50">
              <CardHeader className="pb-4 border-b bg-white">
                <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  Riwayat Status Tiket
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {logs.length > 0 ? (
                    logs.map((log, idx) => {
                      const isLatest = idx === 0;
                      return (
                        <div
                          key={log.id}
                          className={`flex items-start gap-4 p-4 transition-colors ${isLatest ? 'bg-white border-l-4 border-l-primary shadow-sm' : 'bg-transparent'
                            }`}
                        >
                          <div className="flex flex-col items-center gap-1 mt-1">
                            <div className={`h-3 w-3 rounded-full ${isLatest ? 'bg-primary ring-4 ring-primary/20' : 'bg-slate-300'
                              }`} />
                            {idx !== logs.length - 1 && (
                              <div className="w-0.5 h-full min-h-[20px] bg-slate-100" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className={`text-sm font-bold tracking-tight uppercase ${isLatest ? 'text-primary' : 'text-slate-600'
                                }`}>
                                {log.position}
                              </span>
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-400 shadow-sm whitespace-nowrap">
                                <Timer className="h-3.3 w-3.3" />
                                {format(new Date(log.updatedon), "dd MMM yyyy, HH:mm", { locale: id })}
                              </div>
                            </div>
                            {isLatest && (
                              <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                Status terbaru saat ini
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <History className="h-12 w-12 opacity-10 mb-2" />
                      <p className="text-sm font-medium italic">Belum ada riwayat status tiket.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </main>
    </div>
  );
}
