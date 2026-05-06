"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge/Badge";
import { 
  Search, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  LogOut, 
  ArrowRight,
  Clock,
  Truck,
  Package,
  Warehouse,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface DashboardStats {
  TiketHariIni: number;
  SecurityIn: number;
  SecurityOut: number;
}

interface TicketData {
  data: {
    bookingno: string;
    tiketno: string;
    nopol: string;
    driver: string;
    transportir: string;
    jenis_kendaraan?: string;
    posto: string;
    produkString: string;
    qty: number;
    asal: string;
    tujuan: string;
    gudangtujuan?: string;
    percepatan?: string;
    position: string;
    positionString: string;
    company: string;
    emergencystatus?: string;
    wilayah?: string;
    tanggalString?: string;
    shift?: string;
    transportString?: string;
  };
  log: Array<{
    positionString: string;
    tanggal: string;
  }>;
}

export default function SecurityScanPage() {
  const { apiFetch } = useApi();
  const { activeCompanyCode } = useCompany();
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ticketInput, setTicketInput] = useState("");
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch Dashboard Stats
  const fetchStats = useCallback(async () => {
    if (!activeCompanyCode) return;
    try {
      const res = await apiFetch("/api/Tiket/DashboardTiket", {
        method: "POST",
        body: JSON.stringify({ companyCode: activeCompanyCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      // Fail silently as per requirement
      console.error("Failed to fetch dashboard stats", err);
    }
  }, [activeCompanyCode, apiFetch]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Search Ticket Detail
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ticketInput.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setTicketData(null);

    try {
      const res = await apiFetch("/api/Tiket/DetailData", {
        method: "POST",
        body: JSON.stringify({ bookingno: ticketInput.trim() }),
      });

      if (res.status === 400) {
        const text = await res.text();
        setErrorMsg(text || "Terjadi kesalahan pada server");
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error("Gagal mengambil data tiket");
      }

      const data = await res.json();
      if (data.log) {
        data.log.sort((a: any, b: any) => new Date(b.updatedon).getTime() - new Date(a.updatedon).getTime());
      }
      setTicketData(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat mencari tiket");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Security In / Checkin
  const handleVerify = async () => {
    if (!ticketData) return;
    setIsChecking(true);

    try {
      const res = await apiFetch("/api/Tiket/CheckinDW1_GP", {
        method: "POST",
        body: JSON.stringify({ bookingno: ticketData.data.bookingno }),
      });

      const result = await res.json();

      if (result.status === "success") {
        toast({
          title: "Berhasil",
          description: result.text,
        });
        
        // Refresh detail data to get updated position and tiketno
        const refreshRes = await apiFetch("/api/Tiket/DetailData", {
          method: "POST",
          body: JSON.stringify({ bookingno: ticketData.data.bookingno }),
        });
        if (refreshRes.ok) {
          const newData = await refreshRes.json();
          setTicketData(newData);
        }
      } else if (result.status === "warning") {
        toast({
          variant: "warning",
          title: "Peringatan",
          description: result.text,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Gagal",
          description: result.text || "Terjadi kesalahan",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Gagal melakukan verifikasi",
      });
    } finally {
      setIsChecking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Security Out / Checkout
  const handleCheckout = async () => {
    if (!ticketData) return;
    setIsChecking(true);

    try {
      const res = await apiFetch("/api/Tiket/CheckinDW1_GP", {
        method: "POST",
        body: JSON.stringify({ bookingno: ticketData.data.bookingno }),
      });

      const result = await res.json();

      if (result.status === "success") {
        toast({
          title: "Berhasil",
          description: result.text,
        });
        
        // Refresh detail data
        const refreshRes = await apiFetch("/api/Tiket/DetailData", {
          method: "POST",
          body: JSON.stringify({ bookingno: ticketData.data.bookingno }),
        });
        if (refreshRes.ok) {
          const newData = await refreshRes.json();
          setTicketData(newData);
        }

        // Auto clear after 1500ms
        setTimeout(() => {
          setTicketData(null);
          setTicketInput("");
          inputRef.current?.focus();
        }, 1500);

      } else {
        toast({
          variant: "destructive",
          title: "Gagal",
          description: result.text || "Terjadi kesalahan",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Gagal melakukan checkout",
      });
    } finally {
      setIsChecking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleReset = () => {
    setTicketData(null);
    setTicketInput("");
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  const handlePrint = () => {
    if (!ticketData?.data?.tiketno) return;

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
    iframe.src = `/security/print?bookingno=${ticketData.data.tiketno}`;
  };

  const getPositionBadge = (pos: string) => {
    switch (pos) {
      case "00":
        return <Badge color="warning" variant="solid" className="text-sm px-4 py-1">Belum Security In</Badge>;
      case "06":
        return <Badge className="bg-purple-600 text-white text-sm px-4 py-1 hover:bg-purple-700">Siap Security Out</Badge>;
      case "07":
        return <Badge color="success" variant="solid" className="text-sm px-4 py-1">Selesai</Badge>;
      default:
        return <Badge color="info" variant="solid" className="text-sm px-4 py-1">{ticketData?.data.positionString || "Dalam Proses"}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-muted-foreground">Tiket Hari Ini</p>
            <p className="text-3xl font-bold">{stats?.TiketHariIni ?? "--"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-muted-foreground">Security In</p>
            <p className="text-3xl font-bold text-green-600">{stats?.SecurityIn ?? "--"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-muted-foreground">Security Out</p>
            <p className="text-3xl font-bold text-red-600">{stats?.SecurityOut ?? "--"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Area */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Nomor Tiket / Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                placeholder="Scan atau ketik nomor di sini..."
                className="text-2xl h-14 font-mono uppercase"
                disabled={isLoading || isChecking}
                autoFocus
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 px-8" 
                disabled={isLoading || isChecking || !ticketInput}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2" />}
                Cari
              </Button>
            </div>
            {errorMsg && (
              <p className="text-red-500 font-medium px-1 animate-in fade-in slide-in-from-top-1">
                {errorMsg}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {ticketData && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Logo Strip */}
          <div className="w-full bg-white rounded-lg shadow-sm border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/images/logo/logosistro.png" alt="Sistro Logo" width={80} height={36} className="object-contain" />
              <div className="h-8 w-px bg-slate-200" />
              <Image src="/images/logo/logocompany.png" alt="Pupuk Indonesia Logo" width={90} height={36} className="object-contain" />
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Logistics</div>
              <div className="text-xs font-black text-primary">SISTRO V2.0</div>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Col: Transportir */}
            <Card className="shadow-sm border-t-4 border-t-primary">
              <CardHeader className="bg-muted/30 py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-4 h-4" /> Data Transportir
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase">No Booking</span>
                  <span className="text-xl font-mono font-bold">{ticketData.data.bookingno}</span>
                  {ticketData.data.tiketno && ticketData.data.tiketno !== ticketData.data.bookingno && (
                    <span className="text-sm font-mono text-muted-foreground">Tiket: {ticketData.data.tiketno}</span>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase">Nopol</span>
                    <Badge className="bg-black text-white font-mono text-base px-3 py-0.5 rounded-sm">
                      {ticketData.data.nopol}
                    </Badge>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase">Driver</span>
                    <span className="text-base font-bold uppercase">{ticketData.data.driver}</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase">Transportir</span>
                  <span className="text-base">{ticketData.data.transportir}</span>
                  {ticketData.data.jenis_kendaraan && (
                    <span className="text-sm text-muted-foreground italic">{ticketData.data.jenis_kendaraan}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Col: Delivery */}
            <Card className="shadow-sm border-t-4 border-t-blue-500">
              <CardHeader className="bg-muted/30 py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" /> Data Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase">POSTO</span>
                    <span className="text-lg font-bold">{ticketData.data.posto}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted-foreground uppercase">Produk & Qty</span>
                    <span className="text-lg font-bold">{ticketData.data.produkString} — {ticketData.data.qty} Ton</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 p-2 bg-muted/50 rounded flex flex-col items-center">
                    <span className="text-[10px] text-muted-foreground uppercase">Asal</span>
                    <span className="text-sm font-semibold">{ticketData.data.asal}</span>
                  </div>
                  <ArrowRight className="text-muted-foreground w-4 h-4" />
                  <div className="flex-1 p-2 bg-muted/50 rounded flex flex-col items-center border border-blue-100">
                    <span className="text-[10px] text-muted-foreground uppercase">GP Tujuan</span>
                    <span className="text-sm font-semibold">{ticketData.data.tujuan}</span>
                  </div>
                </div>

                {ticketData.data.gudangtujuan && (
                  <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-2 rounded border border-blue-100">
                    <Warehouse className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Gudang Muat:</span>
                    <span className="text-sm font-bold">{ticketData.data.gudangtujuan}</span>
                  </div>
                )}

                {ticketData.data.percepatan && (
                  <div className="flex gap-2">
                    <Badge color={ticketData.data.percepatan === "PERCEPATAN" ? "success" : "blue"} variant="solid">
                      {ticketData.data.percepatan}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Full Width Status Bar */}
          <div className="w-full bg-white rounded-lg shadow-sm border p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">STATUS TIKET:</span>
              {getPositionBadge(ticketData.data.position)}
            </div>
            {ticketData.data.emergencystatus && (
              <Badge color="error" variant="solid" className="animate-pulse px-4 py-1">EMERGENCY</Badge>
            )}
          </div>

          {/* Log Timeline */}
          <Card className="shadow-xl border-none bg-slate-50/50">
            <CardHeader className="pb-4 border-b bg-white">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                Log Perjalanan Tiket
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {ticketData.log.map((item, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-4 p-4 transition-colors ${
                        isLatest ? 'bg-white border-l-4 border-l-primary shadow-sm' : 'bg-transparent'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 mt-1">
                        <div className={`h-3 w-3 rounded-full ${
                          isLatest ? 'bg-primary ring-4 ring-primary/20' : 'bg-slate-300'
                        }`} />
                        {idx !== ticketData.log.length - 1 && (
                          <div className="w-0.5 h-full min-h-[20px] bg-slate-100" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className={`text-sm font-bold tracking-tight uppercase ${
                            isLatest ? 'text-primary' : 'text-slate-600'
                          }`}>
                            {item.positionString}
                          </span>
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-400 shadow-sm whitespace-nowrap">
                            <Clock className="h-3.3 w-3.3" />
                            {item.tanggal ? format(new Date(item.tanggal), "dd MMM yyyy, HH:mm", { locale: id }) : "-"}
                          </div>
                        </div>
                        {isLatest && (
                          <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Lokasi terakhir armada
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 items-center justify-center pt-4">
            {/* Position 00: Belum Masuk */}
            {ticketData.data.position === "00" && (
              <>
                <Button 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 h-16 px-10 text-lg shadow-lg"
                  onClick={handleVerify}
                  disabled={isChecking}
                >
                  {isChecking ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                  ✓ Security In — Verifikasi Masuk
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-red-500 text-red-500 hover:bg-red-50 h-16 px-10 text-lg"
                  onClick={handleReset}
                  disabled={isChecking}
                >
                  <XCircle className="mr-2 h-6 w-6" />
                  ✕ Tidak Cocok — Tolak
                </Button>
              </>
            )}

            {/* Position 06: Siap Checkout */}
            {ticketData.data.position === "06" && (
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 h-16 px-10 text-lg shadow-lg"
                onClick={handleCheckout}
                disabled={isChecking}
              >
                {isChecking ? <Loader2 className="animate-spin mr-2" /> : <LogOut className="mr-2 h-6 w-6" />}
                → Security Out — Checkout
              </Button>
            )}

            {/* Print Button (Position 01+ or after verification success) */}
            {(ticketData.data.position !== "00" || (ticketData.data.position === "01" && !isChecking)) && (
               <Button 
                variant="outline"
                size="lg" 
                className="h-16 px-10 text-lg border-slate-400"
                onClick={handlePrint}
                disabled={isChecking || !ticketData.data.tiketno}
              >
                <Printer className="mr-2 h-6 w-6" />
                🖨 Print Security Pass
              </Button>
            )}

            {/* No actions for other positions */}
            {!["00", "01", "06", "07"].includes(ticketData.data.position) && (
              <div className="text-center p-4 bg-muted rounded-lg border w-full">
                <p className="text-muted-foreground font-medium italic">
                  Tiket ini sedang dalam proses. Tidak ada aksi yang tersedia.
                </p>
              </div>
            )}
            
            {ticketData.data.position === "07" && (
              <div className="text-center p-4 bg-green-50 text-green-700 rounded-lg border border-green-100 w-full">
                <p className="font-bold">
                  Tiket sudah SELESAI.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
