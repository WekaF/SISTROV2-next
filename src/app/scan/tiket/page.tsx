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
import { QRCodeCanvas } from "qrcode.react";
import JsBarcode from "jsbarcode";
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
  tanggalString?: string;
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
  const scannerPromiseRef = useRef<Promise<any> | null>(null);
  const printBarcodeRef = useRef<SVGSVGElement>(null);
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
      stopScanner();
    };
  }, [scanMode]);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      setIsCameraActive(true);

      const promise = scanner.start(
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
      scannerPromiseRef.current = promise;
      await promise;
    } catch (err) {
      console.error("Camera error:", err);
      addToast({
        title: "Gagal Kamera",
        description: "Pastikan izin kamera diberikan.",
        variant: "destructive"
      });
      setScanMode("manual");
      setIsCameraActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerPromiseRef.current) {
      try {
        await scannerPromiseRef.current;
      } catch (e) {
        // ignore start error during stop
      }
    }
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn("Stop error ignored:", err);
      } finally {
        scannerRef.current = null;
        setIsCameraActive(false);
      }
    }
  };

  // Auto-focus input on mount and after actions
  useEffect(() => {
    if (scanMode === "manual") {
      inputRef.current?.focus();
    }
  }, [ticket, isActionLoading, scanMode]);

  const fetchTicketDetail = async (cleanBookingNo: string): Promise<boolean> => {
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
        return true;
      } else {
        const errorText = await res.text();
        setSearchError(errorText || "Tiket tidak ditemukan.");
        return false;
      }
    } catch (err: any) {
      setSearchError("Terjadi kesalahan saat menghubungi server.");
      return false;
    }
  };

  const handleSearch = async (e?: React.FormEvent, overrideNo?: string) => {
    e?.preventDefault();
    const cleanBookingNo = (overrideNo || bookingNo).trim();
    if (!cleanBookingNo) return;

    setIsLoading(true);
    setSearchError(null);
    setTicket(null);
    setLogs([]);

    await fetchTicketDetail(cleanBookingNo);
    setIsLoading(false);
  };

  const handleAction = async () => {
    if (!ticket) return;

    setIsActionLoading(true);
    try {
      const res = await apiFetch("/api/Tiket/CheckinDW1_GP", {
        method: "POST",
        body: JSON.stringify({ bookingno: ticket.bookingno })
      });

      if (!res.ok) {
        // Backend bisa menolak dengan Content(BadRequest, "pesan string mentah")
        // yang TIDAK berbentuk {validasi, text}. Baca sebagai text dulu, coba
        // unwrap kalau ternyata JSON-quoted string, lalu tampilkan apa adanya.
        const rawBody = await res.text();
        let message = rawBody;
        try {
          const parsed = JSON.parse(rawBody);
          if (typeof parsed === "string") {
            message = parsed;
          } else if (parsed && typeof parsed.text === "string") {
            message = parsed.text;
          }
        } catch {
          // rawBody bukan JSON valid, pakai apa adanya
        }
        addToast({
          title: "Gagal",
          description: message || "Gagal memproses aksi scan.",
          variant: "destructive",
        });
        return;
      }

      const result: ActionResponse = await res.json();

      if (result.validasi === "success") {
        addToast({
          title: "Berhasil",
          description: result.text,
          variant: "success",
        });

        // Refetch full detail from server — response dari CheckinDW1_GP cuma bawa
        // kode posisi, bukan label/status lengkap. Jangan tebak di frontend.
        await fetchTicketDetail(ticket.bookingno);
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
    if (!ticket?.bookingno) return;
    // Generate barcode into hidden print area then trigger browser print
    setTimeout(() => {
      if (printBarcodeRef.current) {
        const code = ticket.tiketno || ticket.bookingno;
        JsBarcode(printBarcodeRef.current, code, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          margin: 0,
        });
      }
      window.print();
    }, 100);
  };

  // Helper for position color
  const getPositionBadge = (pos: string, text: string) => {
    if (pos === "00") return <Badge color="warning" className="dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/30">{text}</Badge>;
    if (pos === "06") return <Badge color="indigo" className="dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30">{text}</Badge>;
    if (pos === "07") return <Badge color="success" className="dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30">{text}</Badge>;
    return <Badge color="info" className="dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30">{text}</Badge>;
  };

  return (
    <>
      <div className="flex flex-col min-h-screen print:hidden">
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
            <CardHeader className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scan className="h-5 w-5 text-primary" /> Scan Tiket
                </CardTitle>
                <CardDescription>Masukkan Kode Booking Sistro.</CardDescription>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setScanMode("manual")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${scanMode === "manual" ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  <Keyboard className="h-4 w-4" /> MANUAL / BT
                </button>
                <button
                  onClick={() => setScanMode("camera")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all ${scanMode === "camera" ? 'bg-white dark:bg-slate-800 shadow-sm text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  <Camera className="h-4 w-4" /> KAMERA
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className={scanMode === "camera" ? "space-y-4 block" : "hidden"}>
                <div id="reader" className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 min-h-[300px]"></div>
                <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm animate-pulse">
                  <Camera className="h-5 w-5" />
                  <span className="text-sm font-black uppercase tracking-widest">Kamera Aktif - Dekatkan Kode QR</span>
                </div>
              </div>

              <div className={scanMode === "manual" ? "space-y-4 block" : "hidden"}>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="BOOKINGNO / SCAN QR..."
                      className="w-full h-14 pl-4 pr-12 text-xl font-mono font-bold tracking-wider uppercase bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
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
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  <Info className="h-3 w-3" />
                  Bluetooth scanner akan otomatis mengisi input di atas saat aktif
                </div>
              </div>

              {searchError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-1">
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
                <div className="bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between border-b dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Image src="/images/logo/logo-text1.png" alt="Sistro Logo" width={80} height={36} className="object-contain dark:brightness-0 dark:invert" />
                    <div className="h-8 w-px bg-slate-200 dark:bg-gray-700" />
                    <Image src="/images/logo/logopihd.png" alt="Pupuk Indonesia Logo" width={90} height={36} className="object-contain dark:brightness-0 dark:invert" />
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
                  <div className="p-6 bg-white dark:bg-gray-800 border-r border-slate-100 dark:border-gray-700">
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
                          <Badge className="text-lg font-mono px-3 py-1 bg-slate-900 dark:bg-slate-950 text-white rounded-md border-none">{ticket.nopol}</Badge>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Jenis</div>
                          <div className="font-bold text-slate-700 dark:text-slate-300">{ticket.jeniskendaraan}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Driver / Pengemudi</div>
                        <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-200 uppercase">
                          <User className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                          {ticket.driver || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Perusahaan</div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">{ticket.transportString}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Delivery */}
                  <div className="p-6 bg-slate-50/30 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2 mb-4 text-slate-400">
                      <Package className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Data Pengiriman</span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">POSTO / Order</div>
                          <div className="font-mono font-bold text-slate-600 dark:text-slate-400">{ticket.posto}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Tipe</div>
                          <div className="text-xs font-black text-slate-600 dark:text-slate-400">{ticket.tipe}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Produk</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-slate-800 dark:text-slate-200">{ticket.produkString}</span>
                          <span className="text-sm font-bold text-slate-400 dark:text-slate-500">{ticket.qty} TON</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Asal</div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={ticket.asal}>{ticket.asal}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        <div className="flex-1">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Tujuan</div>
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={ticket.posto?.startsWith('5') ? ticket.tujuan : ticket.transportString}>{ticket.posto?.startsWith('5') ? ticket.tujuan : ticket.transportString}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center pt-1 flex-wrap">
                        {ticket.gudangtujuan && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded text-[10px] font-black uppercase">
                            <Building2 className="h-3 w-3" />
                            {ticket.gudangtujuan}
                          </div>
                        )}
                        {ticket.company && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-black uppercase">
                            <MapPin className="h-3 w-3" />
                            {ticket.company}
                          </div>
                        )}
                        {ticket.percepatan && ticket.percepatan !== "0" && (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded text-[10px] font-black uppercase">
                            <Zap className="h-3 w-3" />
                            PERCEPATAN
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status & Action Bar */}
                <div className="px-6 py-4 bg-slate-100 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 dark:border-gray-700">
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
                        className="h-14 px-6 border-slate-300 dark:border-gray-700 font-bold gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all shadow-sm"
                        onClick={handlePrint}
                        disabled={isActionLoading}
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
                        className="h-14 px-8 border-rose-500 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold text-lg gap-3 transition-all"
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
                      <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm animate-in zoom-in-95">
                        <CheckCircle2 className="h-6 w-6" />
                        <span className="font-black text-sm uppercase tracking-wider">Tiket Selesai</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Timeline Logs */}
              <Card className="shadow-xl border-none bg-slate-50/50 dark:bg-gray-900/50">
                <CardHeader className="pb-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <History className="h-5 w-5 text-primary" />
                    </div>
                    Riwayat Status Tiket
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-gray-800">
                    {logs.length > 0 ? (
                      logs.map((log, idx) => {
                        const isLatest = idx === 0;
                        return (
                          <div
                            key={log.id}
                            className={`flex items-start gap-4 p-4 transition-colors ${isLatest ? 'bg-white dark:bg-gray-700/50 border-l-4 border-l-primary shadow-sm' : 'bg-transparent'
                              }`}
                          >
                            <div className="flex flex-col items-center gap-1 mt-1">
                              <div className={`h-3 w-3 rounded-full ${isLatest ? 'bg-primary ring-4 ring-primary/20' : 'bg-slate-300 dark:bg-slate-600'
                                }`} />
                              {idx !== logs.length - 1 && (
                                <div className="w-0.5 h-full min-h-[20px] bg-slate-100 dark:bg-slate-800" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className={`text-sm font-bold tracking-tight uppercase ${isLatest ? 'text-primary' : 'text-slate-600 dark:text-slate-400'
                                  }`}>
                                  {log.position}
                                </span>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded text-[10px] font-black text-slate-400 dark:text-gray-400 shadow-sm whitespace-nowrap">
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
          )}        </main>
      </div>

      {/* ===== INLINE SECURITY PASS PRINT AREA ===== */}
      {/* Hidden on screen, visible ONLY during window.print() via @media print CSS */}
      {ticket && (
        <div id="security-pass-print-area" className="hidden print:block">
          <table style={{ width: "80mm", fontFamily: "Arial, sans-serif", fontSize: "0.85em", color: "#000", borderCollapse: "collapse" }}>
            <tbody>
              {/* Logo Pupuk Indonesia */}
              <tr>
                <td colSpan={3} style={{ textAlign: "center", paddingTop: "5mm" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/logo/logopihd.png" style={{ width: "60mm", display: "block", margin: "auto" }} alt="logo" />
                </td>
              </tr>
              {/* Title */}
              <tr>
                <td colSpan={3} style={{ textAlign: "center", fontSize: "30px", paddingBottom: "4px", paddingTop: "4px" }}>
                  SECURITY PASS
                </td>
              </tr>
              {/* QR Code */}
              <tr>
                <td colSpan={3} style={{ textAlign: "center", paddingBottom: "8px" }}>
                  <QRCodeCanvas
                    value={ticket.tiketno || ticket.bookingno}
                    size={190}
                    level="H"
                    includeMargin={true}
                    style={{ display: "block", margin: "auto" }}
                  />
                </td>
              </tr>
              {/* Emergency */}
              {ticket.postowilayah === "EMERGENCY" && (
                <>
                  <tr><td colSpan={3} style={{ borderBottom: "1px solid #000" }}></td></tr>
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "red", fontWeight: "bold", fontSize: "x-large" }}>EMERGENCY</td>
                  </tr>
                  <tr><td colSpan={3} style={{ borderTop: "1px solid #000" }}></td></tr>
                </>
              )}
              {/* Data rows */}
              <tr>
                <td style={{ width: "30%", padding: "1px 0" }}>Nomor Tiket</td>
                <td style={{ width: "4%", padding: "1px 0" }}>:</td>
                <td style={{ width: "66%", padding: "1px 0" }}>{ticket.tiketno || ticket.bookingno}</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>Nomor Polisi</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0", fontSize: "16px", fontWeight: "bold" }}>{ticket.nopol}</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>Nama Driver</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0", fontSize: "16px", fontWeight: "bold" }}>{ticket.driver}</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>Moda</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0", fontWeight: "bold" }}>
                  {ticket.postowilayah === "DW2_KONTAINER" ? "* CONTAINER *"
                    : ticket.postowilayah === "DW1_GP" ? "* TRUK KE GP *"
                      : ticket.postowilayah === "DW2_INBAG" ? "* INBAG *"
                        : ticket.postowilayah || "-"}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>Qty (Ton)</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0" }}>{String(ticket.qty).replace(".", ",")}</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>Asal</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0" }}>{ticket.asal}</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>{ticket.posto?.startsWith('5') ? 'GP Tujuan' : 'Tujuan'}</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0" }}>{ticket.posto?.startsWith('5') ? ticket.tujuan : ticket.transportString}</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>Tgl (Shift)</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0" }}>{ticket.tanggalString || "-"} (Shift {ticket.shift})</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>Transport</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0" }}>{ticket.transportString}</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>POSTO</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0" }}>{ticket.posto}</td>
              </tr>
              <tr>
                <td style={{ padding: "1px 0" }}>Produk</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0" }}>{ticket.produkString}</td>
              </tr>
              {ticket.gudangtujuan && (
                <tr>
                  <td style={{ padding: "1px 0" }}>Gudang Muat</td>
                  <td style={{ padding: "1px 0" }}>:</td>
                  <td style={{ padding: "1px 0", fontSize: "14px", fontWeight: "bold" }}>{ticket.gudangtujuan}</td>
                </tr>
              )}
              {ticket.company === "PKC" && ticket.labelantrian && (
                <tr>
                  <td style={{ padding: "1px 0" }}>Antrian</td>
                  <td style={{ padding: "1px 0" }}>:</td>
                  <td style={{ padding: "1px 0", fontSize: "16px", fontWeight: "bold" }}>{ticket.labelantrian}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: "1px 0" }}>Pemuatan</td>
                <td style={{ padding: "1px 0" }}>:</td>
                <td style={{ padding: "1px 0", fontSize: "16px", fontWeight: "bold" }}>{ticket.percepatan === "1" ? "PERCEPATAN" : "ZERO ODOL"}</td>
              </tr>
              {/* Barcode */}
              <tr>
                <td colSpan={3} style={{ textAlign: "center", paddingTop: "15px" }}>
                  <svg ref={printBarcodeRef} style={{ display: "block", margin: "auto", width: "90%" }} />
                </td>
              </tr>
              {/* Footer logo */}
              <tr>
                <td colSpan={3} style={{ textAlign: "center", paddingTop: "3mm" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/logo/logosistro.png" style={{ width: "40mm", display: "block", margin: "auto" }} alt="sistro" />
                </td>
              </tr>
              {/* Timestamp */}
              <tr>
                <td colSpan={3} style={{ fontSize: "0.6rem", textAlign: "left", paddingTop: "2mm", paddingBottom: "2mm" }}>
                  Printed from sistro website v2 at {new Date().toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(" pukul ", " ")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Global CSS: hide everything except print area during window.print() */}
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body { margin: 0; padding: 0; background: white; }
          #security-pass-print-area {
            display: block !important;
            width: 80mm !important;
            background: white !important;
            padding: 2mm !important;
          }
        }
      `}</style>
    </>
  );
}
