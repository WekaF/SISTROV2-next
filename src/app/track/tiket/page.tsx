"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
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
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  RefreshCw, 
  Share2, 
  Printer, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Truck,
  MapPin,
  Calendar,
  User,
  Package,
  Weight,
  History,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

// Interfaces based on API Documentation
interface TrackLog {
  id: number;
  bookingno: string;
  positioncode: string;
  position: string;
  updatedon: string;
}

interface LogChange {
  id: number;
  bookingno: string;
  before: string;
  after: string;
  detail: string;
  updatedon: string;
  updatedby: string;
  alasan: string | null;
}

interface TicketData {
  id: number;
  bookingno: string;
  tiketno: string;
  posto: string;
  shift: string;
  tanggal: string;
  tanggalString: string;
  transportString: string;
  produkString: string;
  asal: string;
  tujuan: string;
  nopol: string;
  driver: string;
  qty: number;
  qtyPOSTO: number;
  statuspemuatan: string;
  position: string;
  positionString: string;
  timesec: string | null;
  timekosong: string | null;
  timegudang: string | null;
  timemuat: string | null;
  timeisi: string | null;
  updatedby: string;
  updatedon: string;
  updatedonString: string;
  revised: string | null;
  validsecurity: string | null;
  validisi: string | null;
  emergencystatus: string | null;
  statusticket: string | null;
  holdreason: string | null;
  deletereason: string | null;
  pic: string | null;
  gudangtujuan: string;
  postowilayah: string;
  postobagian: string;
  nomorantrian: string;
  labelantrian: string;
  company: string;
  percepatan: string;
  jeniskendaraan: string;
  tipe: string | null;
}

interface TrackResponse {
  data: TicketData;
  log: TrackLog[];
  logChanges: LogChange[];
}

// Position Mapping Helper
const getPositionInfo = (code: string) => {
  switch (code) {
    case "00": return { label: "Belum Masuk", color: "bg-slate-500", text: "text-slate-500", border: "border-slate-200 dark:border-slate-800", icon: Clock };
    case "01": return { label: "Security In", color: "bg-blue-600", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-900", icon: ShieldCheck };
    case "02": return { label: "Tiba di Gudang", color: "bg-blue-500", text: "text-blue-500 dark:text-blue-400", border: "border-blue-200 dark:border-blue-900", icon: MapPin };
    case "03": return { label: "Mulai Muat", color: "bg-amber-500", text: "text-amber-500 dark:text-amber-400", border: "border-amber-200 dark:border-amber-900", icon: Package };
    case "04": return { label: "Selesai Muat", color: "bg-amber-600", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-900", icon: CheckCircle2 };
    case "05": return { label: "Timbang Isi", color: "bg-purple-600", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-900", icon: Weight };
    case "06": return { label: "Siap Keluar", color: "bg-orange-500", text: "text-orange-500 dark:text-orange-400", border: "border-orange-200 dark:border-orange-900", icon: Zap };
    case "07": return { label: "Selesai/Keluar", color: "bg-green-600", text: "text-green-600 dark:text-green-400", border: "border-green-200 dark:border-green-900", icon: CheckCircle2 };
    case "12": return { label: "Charter Return", color: "bg-teal-600", text: "text-teal-600 dark:text-teal-400", border: "border-teal-200 dark:border-teal-900", icon: Truck };
    case "21": return { label: "Charter Selesai", color: "bg-green-600", text: "text-green-600 dark:text-green-400", border: "border-green-200 dark:border-green-900", icon: CheckCircle2 };
    default: return { label: "Unknown", color: "bg-slate-400", text: "text-slate-400", border: "border-slate-200 dark:border-slate-800", icon: Clock };
  }
};

const formatDT = (iso: string | null) => {
  if (!iso) return "--";
  return new Date(iso).toLocaleString('id-ID', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function TrackingContent() {
  const searchParams = useSearchParams();
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputValue, setInputValue] = useState("");
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [logs, setLogs] = useState<TrackLog[]>([]);
  const [logChanges, setLogChanges] = useState<LogChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const handleSearch = async (val?: string) => {
    const query = val || inputValue.trim();
    if (!query) return;

    setIsLoading(true);
    setInputError(null);

    try {
      const res = await apiFetch("/api/Tiket/TrackData", {
        method: "POST",
        body: JSON.stringify({ bookingno: query })
      });

      if (!res.ok) {
        const errorText = await res.text();
        setInputError(errorText || "Nomor tiket tidak dikenali");
        setTicketData(null);
        return;
      }

      const responseData: TrackResponse = await res.json();
      setTicketData(responseData.data);
      setLogs(responseData.log);
      setLogChanges(responseData.logChanges);
    } catch (error) {
      console.error("Track error:", error);
      setInputError("Gagal mengambil data. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      setInputValue(idParam);
      handleSearch(idParam);
    }
  }, [searchParams]);

  const handleRefresh = () => {
    if (ticketData?.bookingno) {
      handleSearch(ticketData.bookingno);
    }
  };

  const handleShare = () => {
    if (!ticketData?.bookingno) return;
    const url = `${window.location.origin}/track/tiket?id=${ticketData.bookingno}`;
    navigator.clipboard.writeText(url);
    addToast({
      title: "Berhasil",
      description: "Link tracking disalin ke clipboard",
      variant: "success"
    });
  };

  const handlePrint = () => {
    if (!ticketData?.tiketno) return;
    window.open(`/security/print?bookingno=${ticketData.tiketno}`);
  };

  // Progress Stepper Config
  const steps = [
    { code: "00", label: "booking" },
    { code: "01", label: "security in" },
    { code: "01.5", label: "timbangan in" },
    { code: "02", label: "gudang in" },
    { code: "04", label: "gudang out" },
    { code: "05", label: "timbangan out" },
    { code: "07", label: "security out" }
  ];

  const currentPosInt = parseFloat(ticketData?.position || "00");
  const isCharter = ticketData?.position === "12" || ticketData?.position === "21";
  
  // Custom check for "done" status based on timestamps
  const isStepDone = (code: string) => {
    if (!ticketData) return false;
    const pos = parseFloat(ticketData.position || "00");
    const codeVal = parseFloat(code);

    if (code === "00") return true;
    if (code === "01") return ticketData.timesec !== null || pos >= 1;
    if (code === "01.5") return ticketData.timekosong !== null || pos >= 2;
    if (code === "02") return ticketData.timegudang !== null || pos >= 3;
    if (code === "04") return ticketData.timeisi !== null || pos >= 4;
    if (code === "05") return ticketData.timeisi !== null || pos >= 5;
    if (code === "07") return pos >= 7;
    
    return pos >= codeVal;
  };

  const isStepActive = (code: string) => {
    if (!ticketData) return false;
    const pos = ticketData.position || "00";
    if (pos === code) return true;
    
    // Mapping for intermediate steps
    if (code === "01.5" && pos === "01" && ticketData.timesec && !ticketData.timekosong) return true;
    if (code === "04" && pos === "03") return true;
    if (code === "05" && pos === "04" && ticketData.timeisi === null) return true;
    
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] pb-20 transition-colors duration-300">
      {/* Header & Search */}
      <div className="bg-white/80 dark:bg-gray-dark/80 backdrop-blur-xl border-b dark:border-slate-800 overflow-hidden relative">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-brand-500/5 rounded-full blur-[100px] -z-10" />
        
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col items-center text-center mb-6 relative">
            <h1 className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-slate-900 dark:text-white uppercase">
              Track <span className="text-primary italic">Tiket</span>
            </h1>
          </div>

          <div className="max-w-2xl mx-auto relative group animate-in zoom-in-95 duration-700">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-brand-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex gap-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  ref={inputRef}
                  placeholder="Masukkan Nomor Booking / Tiket..."
                  className="pl-12 h-14 text-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary shadow-sm rounded-xl transition-all font-bold"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  autoFocus
                />
              </div>
              <Button 
                onClick={() => handleSearch()} 
                className="h-14 px-8 text-sm font-black rounded-xl bg-slate-900 dark:bg-primary text-white hover:bg-slate-800 dark:hover:bg-primary/90 shadow-sm active:scale-[0.98] transition-all duration-200 uppercase tracking-widest gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Lacak
                  </>
                )}
              </Button>
            </div>
            {inputError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4" />
                {inputError}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        {!ticketData && !isLoading && !inputError && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-600">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 opacity-20" />
              <div className="relative bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-xl border dark:border-slate-700 mb-6">
                <Search className="h-16 w-16" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Siap melacak armada Anda?</h3>
            <p className="text-center max-w-xs">Silakan masukkan nomor tiket atau booking pada kolom pencarian di atas.</p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
            <div className="lg:col-span-8 space-y-8">
              <div className="h-48 bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700" />
              <div className="h-96 bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700" />
              <div className="h-48 bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700" />
            </div>
            <div className="lg:col-span-4">
              <div className="h-[600px] bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700" />
            </div>
          </div>
        )}

        {ticketData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Card 1: Hero Status Bar */}
              <Card className="overflow-hidden border-none shadow-xl bg-white dark:bg-gray-dark rounded-3xl">
                <div className="bg-white dark:bg-slate-800 p-1">
                  {ticketData.emergencystatus && (
                    <div className="bg-red-600 text-white px-6 py-3 flex items-center gap-3 font-black animate-pulse">
                      <AlertTriangle className="h-6 w-6" />
                      ⚠ EMERGENCY STATUS DETECTED: {ticketData.emergencystatus}
                    </div>
                  )}
                  {ticketData.holdreason && (
                    <div className="bg-amber-500 text-white px-6 py-3 flex items-center gap-3 font-black">
                      <AlertCircle className="h-6 w-6" />
                      ⚠ FLEET ON HOLD: {ticketData.holdreason}
                    </div>
                  )}
                  {ticketData.deletereason && (
                    <div className="bg-red-500 text-white px-6 py-3 flex items-center gap-3 font-black text-center justify-center uppercase tracking-widest">
                      <AlertTriangle className="h-6 w-6" />
                      ✕ TICKET CANCELLED: {ticketData.deletereason}
                    </div>
                  )}
                </div>
                
                <CardContent className="p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Status Saat Ini</div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={cn(
                          "flex items-center gap-2 text-xl font-black px-5 py-2 rounded-2xl border-2 shadow-sm transition-all", 
                          getPositionInfo(ticketData.position).color,
                          "bg-opacity-10 dark:bg-opacity-20",
                          getPositionInfo(ticketData.position).text,
                          getPositionInfo(ticketData.position).border
                        )}>
                          {React.createElement(getPositionInfo(ticketData.position).icon, { className: "h-6 w-6" })}
                          {ticketData.positionString}
                        </div>
                        {ticketData.revised === "1" && (
                          <Badge className="bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/50 rounded-lg px-3 py-1 font-bold">
                            Revised
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-left sm:text-right space-y-1">
                      <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Data Per:</div>
                      <div className="text-slate-900 dark:text-white font-black text-lg">{ticketData.updatedonString}</div>
                    </div>
                  </div>

                  {/* Stepper */}
                  {!isCharter ? (
                    <div className="relative pt-6 pb-2">
                      {/* Line Background */}
                      <div className="absolute top-10 left-[4%] w-[92%] h-1 bg-slate-100 dark:bg-slate-800 -z-10 rounded-full" />
                      
                      <div className="flex justify-between items-start">
                        {steps.map((step, idx) => {
                          const isActive = isStepActive(step.code);
                          const isDone = isStepDone(step.code);
                          
                          return (
                            <div key={step.code} className="flex flex-col items-center flex-1 group">
                              <div 
                                className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center border-[3px] transition-all duration-500 relative shadow-sm",
                                  isDone ? "bg-green-600 border-green-100 dark:border-green-900 text-white scale-110" : 
                                  isActive ? "bg-white dark:bg-slate-900 border-primary text-primary scale-125 shadow-xl shadow-primary/20 ring-4 ring-primary/10" : 
                                  "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300 group-hover:border-slate-300 dark:group-hover:border-slate-600"
                                )}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : isActive ? (
                                  <RefreshCw className="h-5 w-5 animate-spin-slow" />
                                ) : (
                                  <span className="text-sm font-black">{idx + 1}</span>
                                )}
                              </div>
                              <span className={cn(
                                "text-[10px] font-black uppercase mt-4 text-center tracking-tighter sm:tracking-widest transition-colors duration-300 max-w-[60px] sm:max-w-none px-1",
                                isActive ? "text-primary scale-105" : isDone ? "text-green-600" : "text-slate-400 dark:text-slate-600"
                              )}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 flex flex-col items-center border-2 border-dashed rounded-3xl border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/20 group">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-md mb-4 group-hover:scale-110 transition-transform">
                        <Truck className="h-10 w-10 text-teal-600" />
                      </div>
                      <div className="text-teal-700 dark:text-teal-400 font-black text-xl uppercase tracking-[0.2em] mb-1">Charter Trip</div>
                      <div className="text-teal-600 dark:text-teal-500 text-sm font-bold">Layanan Khusus: {ticketData.positionString}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Data Transportir */}
              <Card className="border-none shadow-xl bg-white dark:bg-gray-dark rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-800/50 pb-6 border-b dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-black">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      Detail Armada & Logistik
                    </CardTitle>
                    <Badge variant="outline" className="font-mono text-sm bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 px-3 py-1 text-slate-600 dark:text-slate-400">
                      {ticketData.company}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="group">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1 group-hover:text-primary transition-colors">Nomor Booking</div>
                        <div className="font-mono text-2xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-2">
                          {ticketData.bookingno}
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        </div>
                      </div>
                      {ticketData.tiketno !== ticketData.bookingno && (
                        <div>
                          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Nomor Tiket</div>
                          <div className="font-mono text-lg font-bold text-slate-600 dark:text-slate-400">{ticketData.tiketno}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Plat Nomor (Nopol)</div>
                        <div className="inline-flex flex-col items-center justify-center bg-slate-900 dark:bg-slate-950 text-white font-mono text-2xl px-6 py-2 rounded-xl border-4 border-slate-700 dark:border-slate-800 shadow-xl group hover:scale-105 transition-transform cursor-default">
                          <span className="font-black tracking-widest">{ticketData.nopol}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                          <div className="p-3 bg-white dark:bg-slate-700 rounded-xl shadow-sm text-slate-600 dark:text-slate-300">
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Driver</div>
                            <div className="font-black text-slate-800 dark:text-slate-200 uppercase">{ticketData.driver}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                          <div className="p-3 bg-white dark:bg-slate-700 rounded-xl shadow-sm text-slate-600 dark:text-slate-300">
                            <Truck className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transportir</div>
                            <div className="font-black text-slate-800 dark:text-slate-200">{ticketData.transportString}</div>
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-500">{ticketData.jeniskendaraan}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Status POSTO</div>
                          <div className="font-black text-slate-800 dark:text-slate-200 text-lg leading-tight">{ticketData.posto}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 text-right">Mekanisme</div>
                          <Badge className={cn(
                            "px-4 py-1.5 rounded-full font-black tracking-widest text-[10px]",
                            ticketData.percepatan === "1" ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" : "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          )}>
                            {ticketData.percepatan === "1" ? "PERCEPATAN" : "ZERO ODOL"}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/30 dark:to-slate-900/10 border dark:border-slate-800">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-4 h-4 rounded-full border-2 border-primary bg-white dark:bg-slate-900" />
                            <div className="w-0.5 h-6 bg-slate-200 dark:bg-slate-700" />
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div>
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Pemuatan (Asal)</div>
                              <div className="text-sm font-black text-slate-700 dark:text-slate-300">{ticketData.asal}</div>
                            </div>
                            <div>
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Destinasi (Tujuan)</div>
                              <div className="text-sm font-black text-slate-700 dark:text-slate-300">{ticketData.tujuan}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {ticketData.gudangtujuan && (
                        <div className="p-4 bg-primary/5 dark:bg-primary/10 border-2 border-primary/20 rounded-2xl flex items-center gap-4 animate-in zoom-in-95 duration-500">
                          <div className="p-3 bg-primary text-white rounded-xl shadow-lg">
                            <MapPin className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">Gudang Muat Aktif</div>
                            <div className="font-black text-primary text-lg">{ticketData.gudangtujuan}</div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border dark:border-slate-800">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No. Antrian</div>
                          <div className="font-black text-slate-800 dark:text-slate-200 text-xl tracking-tight">{ticketData.labelantrian || "--"}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border dark:border-slate-800">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Tonase</div>
                          <div className="font-black text-slate-800 dark:text-slate-200 text-xl tracking-tight flex items-baseline gap-1">
                            {ticketData.qty}
                            <span className="text-xs font-bold text-slate-500 uppercase">Ton</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Produk & Jadwal Pengiriman</div>
                        <div className="font-black text-slate-800 dark:text-slate-200">{ticketData.produkString}</div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {ticketData.tanggalString}
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">Shift {ticketData.shift}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Timestamp Perjalanan */}
              <Card className="border-none shadow-xl bg-white dark:bg-gray-dark rounded-3xl overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-800/50 pb-6 border-b dark:border-slate-800">
                  <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-black">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    Log Milestone Perjalanan
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    {[
                      { label: "Security In", value: ticketData.timesec, icon: ShieldCheck },
                      { label: "Timbang Kosong", value: ticketData.timekosong, icon: Weight },
                      { label: "Tiba Gudang", value: ticketData.timegudang, icon: MapPin },
                      { label: "Mulai Muat", value: ticketData.timemuat, icon: Package },
                      { label: "Timbang Isi", value: ticketData.timeisi, icon: Weight },
                      { label: "Update Terakhir", value: ticketData.updatedon, isHighlight: true, icon: RefreshCw },
                    ].map((item, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all group hover:scale-[1.02] cursor-default",
                          item.value ? "bg-white dark:bg-slate-900 border-green-200 dark:border-green-900/50" : "bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800 border-dashed opacity-60",
                          item.isHighlight && item.value && "border-primary/30 dark:border-primary/30 bg-primary/5 dark:bg-primary/5 opacity-100"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={cn(
                            "text-[10px] font-black uppercase tracking-widest transition-colors",
                            item.value ? "text-slate-400 dark:text-slate-500 group-hover:text-primary" : "text-slate-300 dark:text-slate-600"
                          )}>
                            {item.label}
                          </div>
                          {item.value && React.createElement(item.icon, { className: cn("h-4 w-4", item.isHighlight ? "text-primary animate-spin-slow" : "text-green-500") })}
                        </div>
                        <div className={cn(
                          "text-[13px] font-black leading-snug",
                          item.value ? "text-slate-900 dark:text-white" : "text-slate-300 dark:text-slate-700 italic"
                        )}>
                          {formatDT(item.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Log Perubahan Data */}
              {logChanges.length > 0 && (
                <Card className="border-none shadow-xl bg-white dark:bg-gray-dark rounded-3xl overflow-hidden">
                  <CardHeader className="bg-slate-50 dark:bg-slate-800/50 pb-6 border-b dark:border-slate-800 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-slate-200 font-black">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <History className="h-5 w-5 text-primary" />
                      </div>
                      Riwayat Perubahan Data
                    </CardTitle>
                    <Badge className="bg-primary/10 text-primary border-none font-black px-3 py-1">
                      {logChanges.length} EVENTS
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(showAllLogs ? logChanges : logChanges.slice(0, 3)).map((log, idx) => (
                        <div key={log.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group animate-in fade-in slide-in-from-top-2" style={{ animationDelay: `${idx * 50}ms` }}>
                          <div className="flex justify-between items-start mb-3">
                            <div className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-primary" />
                              {log.detail}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDT(log.updatedon)}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
                            {log.before && (
                              <span className="text-slate-400 dark:text-slate-500 line-through font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">{log.before}</span>
                            )}
                            {log.before && <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-700" />}
                            {log.after && (
                              <span className="text-green-600 dark:text-green-400 font-black px-3 py-1 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-100 dark:border-green-900/50">{log.after}</span>
                            )}
                          </div>
                          {log.alasan && (
                            <div className="text-xs text-amber-700 dark:text-amber-400 font-bold italic bg-amber-50 dark:bg-amber-500/10 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/50 mb-4 flex gap-2">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              Reason: {log.alasan}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest flex items-center gap-2">
                            <div className="w-4 h-0.5 bg-slate-200 dark:bg-slate-800" />
                            Modified By: <span className="text-slate-600 dark:text-slate-400 font-black">{log.updatedby}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {logChanges.length > 3 && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-center border-t dark:border-slate-800">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary font-black hover:bg-white dark:hover:bg-slate-800 tracking-widest text-[10px] uppercase gap-2"
                          onClick={() => setShowAllLogs(!showAllLogs)}
                        >
                          {showAllLogs ? "Collapse History" : `Show All ${logChanges.length} Events`}
                          <ChevronRight className={cn("h-4 w-4 transition-transform", showAllLogs ? "-rotate-90" : "rotate-90")} />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-6">
                <Button variant="outline" className="flex-1 sm:flex-none h-12 gap-3 bg-white dark:bg-slate-900 border-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 transition-all" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button variant="outline" className="flex-1 sm:flex-none h-12 gap-3 bg-white dark:bg-slate-900 border-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:scale-105 active:scale-95 transition-all" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Bagikan Link
                </Button>
                {parseInt(ticketData.position) >= 1 && (
                  <Button variant="outline" className="flex-1 sm:flex-none h-12 gap-3 bg-white dark:bg-slate-900 border-primary dark:border-primary text-primary hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white border-2 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                    Cetak Tiket
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column - Timeline */}
            <div className="lg:col-span-4 lg:sticky lg:top-8 space-y-8">
              <Card className="border-none shadow-2xl bg-white dark:bg-gray-dark rounded-[2.5rem] overflow-hidden group">
                <CardHeader className="bg-gradient-to-br from-primary via-primary to-brand-600 text-white p-8 pb-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 group-hover:scale-175 transition-transform duration-700">
                    <Truck className="h-32 w-32" />
                  </div>
                  <div className="relative z-10 space-y-2">
                    <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                      Timeline Perjalanan
                    </CardTitle>
                    <CardDescription className="text-white/80 font-bold">Riwayat pergerakan armada secara real-time</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-8 -mt-6 bg-white dark:bg-gray-dark rounded-t-[2rem] relative z-10">
                  <div className="relative pt-2">
                    {/* Line */}
                    <div className="absolute left-[1.125rem] top-6 bottom-6 w-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
                    
                    <div className="space-y-10">
                      {[...logs]
                        .sort((a, b) => new Date(b.updatedon).getTime() - new Date(a.updatedon).getTime())
                        .map((log, idx) => {
                          const info = getPositionInfo(log.positioncode);
                          return (
                            <div key={log.id} className="relative pl-12 group/item animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 150}ms` }}>
                              <div className={cn(
                                "absolute left-0 top-1 w-10 h-10 rounded-2xl flex items-center justify-center ring-4 ring-white dark:ring-gray-dark z-10 transition-all duration-300 group-hover/item:scale-125 shadow-lg",
                                info.color
                              )}>
                                {React.createElement(info.icon, { className: "h-5 w-5 text-white" })}
                              </div>
                              <div className="space-y-1">
                                <div className={cn("font-black text-sm uppercase tracking-wider group-hover/item:text-primary transition-colors", info.text)}>{log.position}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-500 font-bold flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  {formatDT(log.updatedon)} WIB
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <Separator className="my-10 dark:bg-slate-800" />

                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator PIC</span>
                      <span className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight">{ticketData.updatedby}</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Terakhir</span>
                      <Badge className={cn("font-black text-[9px] uppercase tracking-widest border-none shadow-sm", getPositionInfo(ticketData.position).color)}>
                        {ticketData.positionString}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Help/Contact Info */}
              <div className="relative group cursor-pointer overflow-hidden p-8 rounded-[2rem] bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 dark:border-primary/20 transition-all hover:border-primary/40 active:scale-95 shadow-xl shadow-primary/5">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-50 group-hover:bg-primary/20 transition-all" />
                <h4 className="font-black text-primary mb-3 flex items-center gap-3">
                  <div className="p-2 bg-primary text-white rounded-xl shadow-lg">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  Pusat Bantuan
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-bold">
                  Mengalami kendala pelacakan? Hubungi operasional atau kunjungi pos security terdekat untuk validasi manual tiket Anda.
                </p>
                <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest group-hover:gap-4 transition-all">
                  Hubungi Helpdesk <ChevronRight className="h-4 w-4" />
                </div>
              </div>

              {/* Security Banner */}
              <div className="flex items-center justify-center gap-4 py-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                <ShieldCheck className="h-5 w-5 text-slate-400" />
                <div className="h-1 w-1 bg-slate-300 rounded-full" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Secure Data Transfer</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0f172a]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-2xl" />
            <Truck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="font-black text-primary animate-pulse tracking-widest uppercase text-xs">Menyiapkan Sistem Lacak...</div>
        </div>
      </div>
    }>
      <TrackingContent />
    </Suspense>
  );
}
