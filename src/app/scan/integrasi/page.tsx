"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Scan, Search, Loader2, ArrowRight, CheckCircle2,
  History, Truck, User, Info, Package, MapPin,
  Building2, Timer, Zap, QrCode, XCircle,
  Database, RefreshCw, AlertTriangle
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

// Types matching Backend
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
  donumber: string;
  tanggalString: string;
}

interface TicketLog {
  id: number;
  bookingno: string;
  positioncode: string;
  position: string;
  updatedon: string;
}

interface DoData {
  do_number: string;
  do_date: string;
  source_plant: string;
  dest_plant: string;
  transporter: string;
  transport_mode: string;
  plate_number: string;
  driver_name: string;
}

export default function IntegrasiTiketPage() {
  // States
  const [bookingNo, setBookingNo] = useState("");
  const [doNo, setDoNo] = useState("");
  const [ticketData, setTicketData] = useState<TicketDetailData | null>(null);
  const [doData, setDoData] = useState<DoData | null>(null);

  const [isTicketLoading, setIsTicketLoading] = useState(false);
  const [isDoLoading, setIsDoLoading] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false);

  const [ticketStatus, setTicketStatus] = useState<"pending" | "success" | "error">("pending");
  const [doStatus, setDoStatus] = useState<"pending" | "success" | "error">("pending");

  const ticketInputRef = useRef<HTMLInputElement>(null);
  const doInputRef = useRef<HTMLInputElement>(null);

  const { apiFetch } = useApi();
  const { addToast } = useToast();

  // Mode scanning
  const [activeScanField, setActiveScanField] = useState<"ticket" | "do" | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Auto-focus first input
  useEffect(() => {
    ticketInputRef.current?.focus();
  }, []);

  // Scanner Logic
  const startScanner = async (field: "ticket" | "do") => {
    setActiveScanField(field);
    try {
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (field === "ticket") {
            setBookingNo(decodedText);
            handleVerifyTicket(decodedText);
          } else {
            setDoNo(decodedText);
            handleVerifyDo(decodedText);
          }
          stopScanner();
        },
        () => { }
      );
    } catch (err) {
      addToast({ title: "Scanner Error", description: "Gagal mengaktifkan kamera", variant: "destructive" });
      setActiveScanField(null);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
      setActiveScanField(null);
    }
  };

  // API Call: Verify Ticket
  const handleVerifyTicket = async (val?: string) => {
    const target = val || bookingNo;
    if (!target) return;

    setIsTicketLoading(true);
    setTicketStatus("pending");
    try {
      const res = await apiFetch("/api/GudangLini3/DetailDataVerifikasi", {
        method: "POST",
        body: JSON.stringify({ bookingno: target })
      });

      const result = await res.json();
      if (res.ok && result.tipe === "success") {
        setTicketData(result.data);
        setTicketStatus("success");
        addToast({ title: "Tiket Valid", description: "Data SISTRO ditemukan.", variant: "success" });
        doInputRef.current?.focus();
      } else {
        setTicketStatus("error");
        addToast({
          title: "Tiket Gagal",
          description: result.responseJson || "Data tidak valid atau sudah terintegrasi.",
          variant: "destructive"
        });
      }
    } catch (err) {
      setTicketStatus("error");
    } finally {
      setIsTicketLoading(false);
    }
  };

  // API Call: Verify DO
  const handleVerifyDo = async (val?: string) => {
    const target = val || doNo;
    if (!target) return;

    setIsDoLoading(true);
    setDoStatus("pending");
    try {
      const res = await apiFetch("/api/GudangLini3/DetailDataVerifikasiDo", {
        method: "POST",
        body: JSON.stringify({ do_number: target })
      });

      const result = await res.json();
      if (res.ok) {
        setDoData(result.data);
        setDoStatus("success");
        addToast({ title: "DO Valid", description: "Data DO ditemukan.", variant: "success" });
      } else {
        setDoStatus("error");
        addToast({ title: "DO Gagal", description: "Data DO tidak ditemukan atau sudah terintegrasi.", variant: "destructive" });
      }
    } catch (err) {
      setDoStatus("error");
    } finally {
      setIsDoLoading(false);
    }
  };

  // API Call: Final Integration
  const handleIntegrate = async () => {
    if (!ticketData || !doData) return;

    setIsIntegrating(true);
    try {
      const res = await apiFetch("/api/GudangLini3/Verifikasi", {
        method: "POST",
        body: JSON.stringify({
          bookingno: ticketData.bookingno,
          donumber: doData.do_number
        })
      });

      const result = await res.json();
      if (res.ok && result.validasi === "success") {
        addToast({ title: "Integrasi Berhasil", description: result.text, variant: "success" });
        handleReset();
      } else {
        addToast({ title: "Integrasi Gagal", description: result.text || "Terjadi kesalahan.", variant: "destructive" });
      }
    } catch (err) {
      addToast({ title: "Error", description: "Gagal menghubungi server.", variant: "destructive" });
    } finally {
      setIsIntegrating(false);
    }
  };

  const handleReset = () => {
    setBookingNo("");
    setDoNo("");
    setTicketData(null);
    setDoData(null);
    setTicketStatus("pending");
    setDoStatus("pending");
    ticketInputRef.current?.focus();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 space-y-6">

        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/">SISTRO</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Integrasi Tiket SISTRO & DO</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col lg:flex-row gap-6">

          <div className="flex-1 space-y-6">
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <Database className="h-7 w-7 text-primary" />
              Integrasi Tiket SISTRO & DO
            </h1>

            {activeScanField && (
              <Card className="border-2 border-primary ring-4 ring-primary/10 overflow-hidden animate-in zoom-in-95">
                <div id="reader" className="bg-black aspect-video"></div>
                <div className="p-4 bg-primary text-white flex items-center justify-between">
                  <span className="font-bold flex items-center gap-2">
                    <Scan className="h-5 w-5 animate-pulse" />
                    Memindai {activeScanField === "ticket" ? "Tiket SISTRO" : "Nomor DO"}...
                  </span>
                  <Button variant="ghost" size="sm" onClick={stopScanner} className="text-white hover:bg-white/20">
                    BATAL
                  </Button>
                </div>
              </Card>
            )}

            <Card className={`transition-all border-2 ${ticketStatus === 'success' ? 'border-emerald-500/30' : 'border-slate-200'}`}>
              <CardHeader className="bg-slate-50/50 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${ticketStatus === 'success' ? 'bg-emerald-500' : 'bg-slate-800'} text-white`}>
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base uppercase">Tiket SISTRO</CardTitle>
                      <CardDescription>Inputkan Nomor Booking SISTRO</CardDescription>
                    </div>
                  </div>
                  {ticketStatus === 'success' && (
                    <Badge color="success" size="lg" className="px-3 py-1 animate-in slide-in-from-right-4">
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> VALID
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-2 mb-6">
                  <div className="relative flex-1">
                    <input
                      ref={ticketInputRef}
                      type="text"
                      placeholder="BOOKINGNO / SCAN..."
                      className="w-full h-12 pl-4 pr-12 text-lg font-mono font-bold tracking-wider uppercase bg-slate-100 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-primary transition-all"
                      value={bookingNo}
                      onChange={(e) => setBookingNo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyTicket()}
                      disabled={isTicketLoading}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                      onClick={() => startScanner("ticket")}
                    >
                      <Scan className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleVerifyTicket()}
                    disabled={isTicketLoading || !bookingNo}
                    className="h-12 px-6 rounded-xl font-bold gap-2"
                  >
                    {isTicketLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    CEK
                  </Button>
                </div>

                {ticketData && (
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 animate-in fade-in">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Transportir</span>
                      <div className="text-sm font-bold text-slate-700 truncate">{ticketData.transportString}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Armada / Driver</span>
                      <div className="text-sm font-bold text-slate-700 truncate">{ticketData.nopol} - {ticketData.driver}</div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Detail Muatan</span>
                      <div className="text-sm font-bold text-slate-700">
                        {ticketData.produkString} ({ticketData.qty} TON) - {ticketData.tujuan}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={`transition-all border-2 ${doStatus === 'success' ? 'border-emerald-500/30' : 'border-slate-200'}`}>
              <CardHeader className="bg-slate-50/50 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${doStatus === 'success' ? 'bg-emerald-500' : 'bg-slate-800'} text-white`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base uppercase">Nomor DO</CardTitle>
                      <CardDescription>Inputkan Nomor Delivery Order</CardDescription>
                    </div>
                  </div>
                  {doStatus === 'success' && (
                    <Badge color="success" size="lg" className="px-3 py-1 animate-in slide-in-from-right-4">
                      <CheckCircle2 className="h-4 w-4 mr-1.5" /> VALID
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex gap-2 mb-6">
                  <div className="relative flex-1">
                    <input
                      ref={doInputRef}
                      type="text"
                      placeholder="NOMOR DO / SCAN..."
                      className="w-full h-12 pl-4 pr-12 text-lg font-mono font-bold tracking-wider uppercase bg-slate-100 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-primary transition-all"
                      value={doNo}
                      onChange={(e) => setDoNo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyDo()}
                      disabled={isDoLoading}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
                      onClick={() => startScanner("do")}
                    >
                      <Scan className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleVerifyDo()}
                    disabled={isDoLoading || !doNo}
                    className="h-12 px-6 rounded-xl font-bold gap-2"
                  >
                    {isDoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    CEK
                  </Button>
                </div>

                {doData && (
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 animate-in fade-in">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">No DO</span>
                      <div className="text-sm font-bold text-slate-700 truncate">{doData.do_number}</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tanggal</span>
                      <div className="text-sm font-bold text-slate-700 truncate">{doData.do_date || "-"}</div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Rute DO</span>
                      <div className="text-sm font-bold text-slate-700">
                        {doData.source_plant} → {doData.dest_plant}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="w-full lg:w-80 space-y-6">
            <Card className="shadow-lg border-none bg-slate-900 text-white overflow-hidden">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-sm uppercase tracking-widest text-slate-400 font-black">Status Integrasi</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${ticketStatus === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                      <span className="text-xs font-bold uppercase tracking-tight text-slate-300">Tiket SISTRO</span>
                    </div>
                    {ticketStatus === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-500 opacity-50" />
                    )}
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${doStatus === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                      <span className="text-xs font-bold uppercase tracking-tight text-slate-300">Nomor DO</span>
                    </div>
                    {doStatus === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-rose-500 opacity-50" />
                    )}
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${ticketStatus === 'success' && doStatus === 'success' ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-700'}`} />
                      <span className="text-xs font-bold uppercase tracking-tight text-slate-300">Kesiapan Integrasi</span>
                    </div>
                    {ticketStatus === 'success' && doStatus === 'success' ? (
                      <RefreshCw className="h-5 w-5 text-amber-500 animate-spin-slow" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-slate-700" />
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-3 bg-white/5">
                  <Button
                    onClick={handleIntegrate}
                    disabled={ticketStatus !== 'success' || doStatus !== 'success' || isIntegrating}
                    className="w-full h-16 text-lg font-black uppercase tracking-tighter gap-3 bg-emerald-600 hover:bg-emerald-700 shadow-xl disabled:bg-slate-800 disabled:text-slate-600 transition-all active:scale-95"
                  >
                    {isIntegrating ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-6 w-6" />
                    )}
                    Integrasi Tiket
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    className="w-full text-slate-400 hover:text-white hover:bg-white/5 font-bold uppercase text-xs tracking-widest"
                  >
                    Scan Ulang
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-blue-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-tight">
                  <Info className="h-4 w-4" /> Bantuan
                </div>
                <p className="text-[11px] text-blue-600 leading-relaxed">
                  Lakukan pemindaian atau input manual pada kedua kolom di kiri.
                  Sistem akan melakukan verifikasi real-time ke database SISTRO dan APG.
                  Setelah kedua data valid, tombol integrasi akan aktif untuk menghubungkan Tiket dengan Nomor DO.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

      </main>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

// Custom Icons
function FileText(props: any) {
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
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

function ArrowRightLeft(props: any) {
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
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  );
}
