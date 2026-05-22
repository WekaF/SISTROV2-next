"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, AlertTriangle, CheckCircle, Heart, Truck, MapPin, Warehouse, FileText, ChevronRight, BarChart3, Ticket, ArrowRight, Search, ChevronLeft } from "lucide-react";
import { id } from "date-fns/locale";
import { format } from "date-fns";

interface SummaryItem {
  kab_kode: string;
  kab_nama: string;
  status: string;
  produk: string;
  tiket_count: number;
  tonase: number;
}
interface ResumeSummary {
  merah: number; kuning: number; hijau: number; biru: number;
  tonase_merah: number; tonase_kuning: number; tonase_hijau: number; tonase_biru: number;
  total_tiket: number;
  data: SummaryItem[];
}

interface KabupatenDetail {
  kab_kode: string;
  kab_nama: string;
  count: number;
  tonase: number;
}
interface TiketDetail {
  bookingno: string;
  nopol: string;
  driver: string;
  produk: string; 
  qty: number;
  position: string;
  positionString: string;
}
interface GudangDetail {
  tujuan: string;
  deskripsi: string;
  kabupaten_nama: string;
  kode_kabupaten: string;
  count: number;
  tonase: number;
  tikets: TiketDetail[];
}
interface DetailData {
  status: string;
  total: number;
  tonase_total: number;
  kabupaten: KabupatenDetail[];
  grup_tujuan: GudangDetail[];
  tikets?: GudangDetail[]; // fallback
}

const STATUS_CONFIG = {
  merah: {
    label: "Urgent",
    desc: "Merah",
    gradient: "from-rose-500 to-red-600",
    bgLight: "bg-red-50 dark:bg-red-950/20",
    textClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-rose-200 dark:border-rose-800",
    icon: AlertCircle,
    colorCode: "#C80036",
    badge: "destructive" as const,
  },
  kuning: {
    label: "Warning",
    desc: "Kuning",
    gradient: "from-amber-400 to-yellow-500",
    bgLight: "bg-amber-50 dark:bg-amber-950/20",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800",
    icon: AlertTriangle,
    colorCode: "#F3CA52",
    badge: "outline" as const,
  },
  hijau: {
    label: "Stable",
    desc: "Hijau",
    gradient: "from-emerald-400 to-green-500",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
    textClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle,
    colorCode: "#41B06E",
    badge: "outline" as const,
  },
  biru: {
    label: "Idle",
    desc: "Biru",
    gradient: "from-sky-400 to-blue-500",
    bgLight: "bg-sky-50 dark:bg-sky-950/20",
    textClass: "text-sky-600 dark:text-sky-400",
    borderClass: "border-sky-200 dark:border-sky-800",
    icon: Heart,
    colorCode: "#5BBCFF",
    badge: "outline" as const,
  },
} as const;

const POSITION_MAP: Record<string, { bg: string, text: string, label: string }> = {
  "00": { bg: "bg-slate-100 dark:bg-slate-800/80", text: "text-slate-600 dark:text-slate-400", label: "Siap Cetak" },
  "01": { bg: "bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/40", text: "text-indigo-600 dark:text-indigo-400", label: "Security Pass" },
  "02": { bg: "bg-amber-50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/40", text: "text-amber-600 dark:text-amber-400", label: "Timbang Kosong" },
  "03": { bg: "bg-orange-50 dark:bg-orange-950/30 border border-orange-100/50 dark:border-orange-900/40", text: "text-orange-600 dark:text-orange-400", label: "Gudang Pemuatan" },
  "04": { bg: "bg-teal-50 dark:bg-teal-950/30 border border-teal-100/50 dark:border-teal-900/40", text: "text-teal-600 dark:text-teal-400", label: "Checkout Gudang" },
  "05": { bg: "bg-blue-50 dark:bg-blue-950/30 border border-blue-100/50 dark:border-blue-900/40", text: "text-blue-600 dark:text-blue-400", label: "Timbang Isi" },
  "06": { bg: "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/50 dark:border-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400", label: "Checkout SPPT" },
  "07": { bg: "bg-green-50 dark:bg-green-950/30 border border-green-100/50 dark:border-green-900/40", text: "text-green-600 dark:text-green-400", label: "Checkout Security" }
};

const getPositionBadge = (pos: string) => {
  return POSITION_MAP[pos] || { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", label: `Posisi ${pos}` };
};

export default function ResumeTransitClient() {
  const { apiJson, apiTable } = useApi();
  const [summary, setSummary] = useState<ResumeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [selectedKab, setSelectedKab] = useState<string | null>(null);
  const [selectedGudang, setSelectedGudang] = useState<string | null>(null);

  const [filterUrea, setFilterUrea] = useState<string>("all");
  const [filterNpk, setFilterNpk] = useState<string>("all");

  const [historyTikets, setHistoryTikets] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Real-time EventSource Stream states and refs
  const [streamStatus, setStreamStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [streamLastUpdated, setStreamLastUpdated] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      if (esRef.current) {
        esRef.current.close();
      }

      setStreamStatus("connecting");
      const es = new EventSource("/api/stream/resume-transit");
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setSummary(parsed);
          setStreamStatus("live");
          setStreamLastUpdated(new Date());
          setLoading(false);
        } catch (err) {
          console.error("Failed to parse SSE payload:", err);
        }
      };

      es.onerror = () => {
        setStreamStatus("error");
        es.close();
        esRef.current = null;
        clearTimeout(retryTimeoutRef.current ?? undefined);
        // Auto-reconnect after 5s
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

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setHistorySearch(searchInput);
      setHistoryPage(0); // reset page on search
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!selectedGudang) {
      setHistoryTikets([]);
      setHistoryTotal(0);
      return;
    }

    let isMounted = true;
    async function fetchHistory() {
      setHistoryLoading(true);
      try {
        const res = await apiTable<any>(
          `/api/Resume/DataTableFilter1`,
          {
            kodeG: selectedGudang,
            start: historyPage * 10,
            length: 10,
            search: { value: historySearch, regex: "false" }
          }
        );
        if (isMounted) {
          if (res && res.data) {
            setHistoryTikets(res.data);
            setHistoryTotal(res.recordsFiltered || res.recordsTotal || 0);
          } else {
            setHistoryTikets([]);
            setHistoryTotal(0);
          }
        }
      } catch (err) {
        console.error("Error fetching history tickets:", err);
        if (isMounted) {
          setHistoryTikets([]);
          setHistoryTotal(0);
        }
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    }

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [selectedGudang, historyPage, historySearch, apiTable]);

  async function fetchSummary() {
    try {
      const data = await apiJson<ResumeSummary>("/api/ResumeApi/Summary");
      setSummary(data);
    } catch (err) {
      console.error(err);
      // Mock data temporarily to test UI layout if backend returns 404
      if (!summary) {
        setSummary({
          merah: 5, kuning: 3, hijau: 12, biru: 0,
          tonase_merah: 125.5, tonase_kuning: 45.0, tonase_hijau: 320.0, tonase_biru: 0,
          total_tiket: 20,
          data: []
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusClick(status: string) {
    if (selectedStatus === status) {
      setSelectedStatus(null);
      setDetail(null);
      setSelectedKab(null);
      setSelectedGudang(null);
      return;
    }
    
    setSelectedStatus(status);
    setDetailLoading(true);
    setSelectedKab(null);
    setSelectedGudang(null);
    setDetail(null);
    setFilterUrea("all");
    setFilterNpk("all");

    try {
      const data = await apiJson<DetailData>(`/api/ResumeApi/DetailStatus?status=${status}`);
      setDetail(data);
      if (data?.kabupaten?.length > 0) {
        setSelectedKab(data.kabupaten[0].kab_kode);
      }
    } catch (err) {
      console.error(err);
      // Mock data for UI testing if API fails
      const mockDetail: DetailData = {
        status,
        total: 10,
        tonase_total: 250,
        kabupaten: [
          { kab_kode: "KAB01", kab_nama: "KAB. GRESIK", count: 5, tonase: 100 },
          { kab_kode: "KAB02", kab_nama: "KAB. LAMONGAN", count: 5, tonase: 150 },
        ],
        grup_tujuan: [
          { tujuan: "G001", deskripsi: "Gudang Penyangga A", kabupaten_nama: "KAB. GRESIK", kode_kabupaten: "KAB01", count: 3, tonase: 60, tikets: [
            { bookingno: "BK001", nopol: "W 1234 XX", driver: "Budi", produk: "P01", qty: 20, position: "02", positionString: "Armada sampai di Timbang Kosong" },
            { bookingno: "BK002", nopol: "W 5678 YY", driver: "Andi", produk: "P02", qty: 40, position: "05", positionString: "Armada berada di Timbang Isi" }
          ]},
          { tujuan: "G002", deskripsi: "Gudang Lini 3", kabupaten_nama: "KAB. GRESIK", kode_kabupaten: "KAB01", count: 2, tonase: 40, tikets: []},
        ]
      };
      setDetail(mockDetail);
      setSelectedKab(mockDetail.kabupaten[0].kab_kode);
    } finally {
      setDetailLoading(false);
    }
  }

  const dateNowStr = format(new Date(), "dd MMMM yyyy", { locale: id });
  const totalTonaseStr = ((summary?.tonase_merah ?? 0) + (summary?.tonase_kuning ?? 0) + (summary?.tonase_hijau ?? 0) + (summary?.tonase_biru ?? 0)).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Filtering Logic
  const activeGudangs = useMemo(() => {
    if (!detail || !selectedKab) return [];
    const groups = detail.grup_tujuan || detail.tikets || [];
    return groups.filter(g => g.kode_kabupaten === selectedKab || g.kabupaten_nama === selectedKab || g.kabupaten_nama?.toLowerCase() === selectedKab?.toLowerCase());
  }, [detail, selectedKab]);

  const activeTiketsUrea = useMemo(() => {
    if (!detail || !selectedGudang) return [];
    const groups = detail.grup_tujuan || detail.tikets || [];
    const gdg = groups.find(g => g.tujuan === selectedGudang);
    if (!gdg) return [];
    let t = (gdg.tikets || []).filter(x => x.produk === "P01" || x.produk?.toLowerCase()?.includes("urea"));
    if (filterUrea !== "all") t = t.filter(x => x.position === filterUrea);
    return t;
  }, [detail, selectedGudang, filterUrea]);

  const activeTiketsNpk = useMemo(() => {
    if (!detail || !selectedGudang) return [];
    const groups = detail.grup_tujuan || detail.tikets || [];
    const gdg = groups.find(g => g.tujuan === selectedGudang);
    if (!gdg) return [];
    let t = (gdg.tikets || []).filter(x => x.produk === "P02" || x.produk?.toLowerCase()?.includes("npk"));
    if (filterNpk !== "all") t = t.filter(x => x.position === filterNpk);
    return t;
  }, [detail, selectedGudang, filterNpk]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
        <p className="text-muted-foreground animate-pulse font-medium">Memuat Data Resume Transit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-slate-100 dark:to-slate-400">
              Resume Transit
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                streamStatus === "live"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30"
                  : streamStatus === "error"
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-455 border border-rose-200 dark:border-rose-900/30"
                    : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  streamStatus === "live"
                    ? "bg-emerald-500 animate-pulse"
                    : streamStatus === "error"
                      ? "bg-rose-500"
                      : "bg-slate-400 animate-pulse"
                }`}
              />
              {streamStatus === "live" ? "Live Realtime" : streamStatus === "error" ? "Offline" : "Connecting..."}
            </span>
            {streamLastUpdated && (
              <span className="text-[10px] text-slate-400 font-medium">
                Update: {streamLastUpdated.toLocaleTimeString("id-ID")}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-brand-500" />
            Transaksi Tiket Hari ini: <span className="font-semibold text-slate-700 dark:text-slate-200">{dateNowStr}</span>
          </p>
          <div className="mt-3 inline-flex">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-normal">
              *Nilai tiket dan total tonase akan terus berubah dikarenakan adanya pergerakan di setiap Anper dan Plant
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-4 md:gap-8 items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border">
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Tiket</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{summary?.total_tiket ?? 0}</p>
          </div>
          <div className="w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
          <div className="text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Tonase</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{totalTonaseStr} <span className="text-base font-medium text-slate-500">Ton</span></p>
          </div>
        </div>
      </div>

      {/* 4 Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {(["merah", "kuning", "hijau", "biru"] as const).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const count = summary?.[status] ?? 0;
          const tonase = (summary?.[`tonase_${status}` as keyof ResumeSummary] as number) ?? 0;
          const isSelected = selectedStatus === status;

          return (
            <Card
              key={status}
              onClick={() => handleStatusClick(status)}
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg border-2 ${
                isSelected ? `ring-2 ring-offset-2 ring-brand-500 border-transparent shadow-md` : `border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm`
              }`}
            >
              <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${cfg.gradient}`}></div>
              <div className={`absolute -right-4 -top-4 opacity-[0.03] transform rotate-12`}>
                <cfg.icon className="w-32 h-32" />
              </div>
              <CardContent className={`p-5 flex flex-col justify-between h-full relative z-10 ${isSelected ? cfg.bgLight : 'bg-white dark:bg-slate-900'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${cfg.gradient} text-white shadow-sm`}>
                    <cfg.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className={`${cfg.textClass} ${cfg.borderClass} font-semibold uppercase tracking-wider text-[10px]`}>
                    {cfg.desc}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">{tonase.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-medium text-slate-500">Ton</span></h3>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{cfg.label}</p>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-md">
                    <span>{count} Kabupaten</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* DPCS Flag Status Tag Info Section */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-6 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500 mt-0.5">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200 flex items-center gap-2">
              Informasi Tagging Bendera DPCS
              <Badge className="bg-brand-500 text-white text-[9px] hover:bg-brand-650 px-1.5 py-0 border-none font-bold">Standardisasi Pupuk Indonesia</Badge>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Status warna in-transit disinkronisasi berdasarkan data <strong>Bendera DPCS (Distribution Planning & Control System)</strong> untuk memantau kecukupan stok pupuk subsidi di setiap wilayah kabupaten.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          {(["merah", "kuning", "hijau", "biru"] as const).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const descriptions: Record<string, string> = {
              merah: "Stok Kritis / Urgent",
              kuning: "Stok Rendah / Warning",
              hijau: "Stok Aman / Stable",
              biru: "Stok Melimpah / Idle"
            };
            return (
              <div 
                key={status}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-extrabold ${cfg.bgLight} ${cfg.borderClass} ${cfg.textClass} shadow-2xs`}
              >
                <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${cfg.gradient} shadow-sm animate-pulse`}></span>
                <span>{cfg.desc}:</span>
                <span className="opacity-80 font-bold">{descriptions[status]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Section */}
      {selectedStatus && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Accent Color Band */}
          <div className={`h-2 w-full bg-gradient-to-r ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].gradient}`}></div>
          
          {/* Header Panel */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].gradient} text-white shadow-lg shadow-brand-500/10`}>
                 {(() => {
                   const Icon = STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].icon;
                   return <Icon className="h-5 w-5 animate-pulse" />
                 })()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Detail Status Kabupaten <span className={STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].textClass}>{STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].desc}</span>
                  </h2>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-brand-500"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-550"></span>
                  </span>
                </div>
                <p className="text-xs text-slate-450 mt-0.5">Ringkasan operasional dan segmentasi logistik real-time</p>
              </div>
            </div>

            {/* Quick KPI Dashboard */}
            <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto bg-white/80 dark:bg-slate-950/40 p-2 rounded-xl border dark:border-slate-800/80">
              <div className="px-3 py-1.5 text-center rounded-lg bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 shadow-xs min-w-[85px]">
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Kabupaten</p>
                <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">{detailLoading ? '...' : (detail?.kabupaten?.length || 0)}</p>
              </div>
              <div className="px-3 py-1.5 text-center rounded-lg bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 shadow-xs min-w-[85px]">
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Gudang</p>
                <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">{detailLoading ? '...' : (detail?.grup_tujuan?.length || 0)}</p>
              </div>
              <div className="px-3 py-1.5 text-center rounded-lg bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 shadow-xs min-w-[100px]">
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Tonase</p>
                <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {detailLoading ? '...' : (detail?.tonase_total ? detail.tonase_total.toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "0")} <span className="text-[9px] font-medium text-slate-400">T</span>
                </p>
              </div>
              <div className="px-3 py-1.5 text-center rounded-lg bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 shadow-xs min-w-[85px]">
                <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Tiket</p>
                <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">{detailLoading ? '...' : (detail?.total || 0)}</p>
              </div>
              {detailLoading && <Loader2 className="h-4 w-4 animate-spin text-brand-500 ml-1" />}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800/80">
            
            {/* Column 1: Kabupaten */}
            <div className="lg:col-span-3 p-5 space-y-3 h-[600px] overflow-y-auto custom-scrollbar bg-slate-50/20 dark:bg-slate-950/5">
              <h3 className="font-bold text-xs text-slate-450 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-450" />
                Kabupaten ({detail?.kabupaten?.length || 0})
              </h3>
              
              {!detailLoading && detail?.kabupaten?.length === 0 && (
                <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-xs bg-white dark:bg-slate-900">
                  Tidak ada data kabupaten
                </div>
              )}
              
              {detail?.kabupaten?.map((kab, idx) => (
                <div 
                  key={`${kab.kab_kode}-${selectedStatus}-${idx}`}
                  onClick={() => { setSelectedKab(kab.kab_kode); setSelectedGudang(null); }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 transform hover:scale-[1.01] hover:shadow-md ${
                    selectedKab === kab.kab_kode 
                    ? `bg-gradient-to-br ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].gradient} text-white shadow-lg border-transparent` 
                    : `bg-white dark:bg-slate-850 hover:border-slate-350 dark:hover:border-slate-700 shadow-sm border-slate-100 dark:border-slate-800`
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${selectedKab === kab.kab_kode ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'} text-xs font-bold`}>
                        <MapPin className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold truncate max-w-[110px]">{kab.kab_nama}</p>
                        <p className={`text-[9px] ${selectedKab === kab.kab_kode ? 'text-white/70' : 'text-slate-400'}`}>{kab.kab_kode}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-[8px] font-extrabold uppercase px-1.5 py-0 border ${
                        selectedKab === kab.kab_kode 
                        ? 'bg-white/20 border-white/30 text-white hover:bg-white/30' 
                        : `${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].bgLight} ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].borderClass} ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].textClass}`
                      }`}
                    >
                      DPCS {STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].desc}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center mt-3 border-t border-current/10 pt-2 text-[10px]">
                    <span className="flex items-center gap-1 font-medium">
                      <Ticket className="h-3 w-3" /> {kab.count} Tiket
                    </span>
                    <span className="font-bold">
                      {kab.tonase?.toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ton
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Column 2: Gudang Tujuan */}
            <div className="lg:col-span-4 p-5 space-y-3 h-[600px] overflow-y-auto custom-scrollbar">
              <h3 className="font-bold text-xs text-slate-450 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Warehouse className="h-3.5 w-3.5 text-slate-450" />
                Gudang Tujuan ({activeGudangs.length})
              </h3>
              
              {!detailLoading && activeGudangs.length === 0 && selectedKab && (
                <div className="text-center p-12 border border-dashed rounded-xl text-muted-foreground text-xs bg-slate-50/50 dark:bg-slate-900/50">
                  <Warehouse className="h-8 w-8 mx-auto mb-2 opacity-20 text-slate-450" />
                  Belum ada gudang terdaftar
                </div>
              )}

              {activeGudangs.map((gdg, idx) => (
                <div 
                  key={`${gdg.tujuan}-${idx}`}
                  onClick={() => setSelectedGudang(gdg.tujuan)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 group hover:shadow-md hover:scale-[1.01] ${
                    selectedGudang === gdg.tujuan 
                    ? `bg-white dark:bg-slate-800 ring-2 ring-${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].textClass.split(' ')[0].replace('text-', '')} shadow-lg shadow-brand-500/5 border-transparent` 
                    : `bg-white dark:bg-slate-855 hover:border-slate-350 dark:hover:border-slate-700 shadow-sm border-slate-100 dark:border-slate-800`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-brand-500 transition-colors mt-0.5">
                        <Warehouse className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-500 transition-colors leading-tight">{gdg.tujuan}</p>
                        <p className="text-[10px] text-slate-450 line-clamp-2 mt-0.5">{gdg.deskripsi}</p>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 mt-0.5 ${selectedGudang === gdg.tujuan ? STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].textClass : 'text-slate-300'}`} />
                  </div>
                  
                  <div className="mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                      <span className="flex items-center gap-1 font-semibold">
                        <Ticket className="h-3.5 w-3.5 text-brand-500" /> {gdg.count} Tiket
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{gdg.tonase?.toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ton</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].gradient}`}
                        style={{ width: `${Math.min(100, (gdg.tonase / (detail?.tonase_total || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Column 3: Tickets UREA & NPK */}
            <div className="lg:col-span-5 p-5 space-y-6 h-[600px] overflow-y-auto custom-scrollbar bg-slate-50/10 dark:bg-slate-950/10">
              
              {!selectedGudang ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                  <MapPin className="h-10 w-10 mb-3 opacity-20 animate-bounce" />
                  <p className="text-xs font-semibold text-slate-500">Pilih Gudang Tujuan</p>
                  <p className="text-[10px] text-slate-400 mt-1">Gudang tujuan di Kabupaten terpilih untuk memuat tiket.</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  
                  {/* Selected Gudang Info Header Card */}
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].gradient} text-white shadow-md`}>
                      <Warehouse className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Warehouse</p>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedGudang}</h4>
                      <p className="text-[10px] text-slate-450 line-clamp-1 mt-0.5">
                        {activeGudangs.find(g => g.tujuan === selectedGudang)?.deskripsi}
                      </p>
                    </div>
                  </div>

                  {/* UREA SECTION */}
                  <Card className="border-t-4 border-t-sky-500 shadow-md rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-sky-600 dark:text-sky-400">
                            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                            UREA PRODUCT
                          </CardTitle>
                          <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500 font-medium">
                            <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800/80">
                              Qty: <strong className="text-slate-800 dark:text-slate-200">{activeTiketsUrea.reduce((a,b)=>a+b.qty,0).toLocaleString("id-ID")} T</strong>
                            </span>
                            <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800/80">
                              Armada: <strong className="text-slate-800 dark:text-slate-200">{activeTiketsUrea.length}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto">
                          <select 
                            value={filterUrea} 
                            onChange={(e) => setFilterUrea(e.target.value)}
                            className="w-full sm:w-[180px] h-7 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-600 dark:text-slate-350"
                          >
                            <option value="all">Semua Posisi</option>
                            <option value="00">Tiket Siap Dicetak</option>
                            <option value="01">Security Pass</option>
                            <option value="02">Timbang Kosong</option>
                            <option value="03">Tiba di Gudang</option>
                            <option value="04">Checkout Gudang</option>
                            <option value="05">Timbang Isi</option>
                            <option value="06">Checkout SPPT</option>
                            <option value="07">Checkout Security</option>
                          </select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {activeTiketsUrea.length === 0 ? (
                        <div className="p-6 text-center text-[10px] text-slate-400 italic bg-slate-50/20">Tidak ada tiket UREA aktif</div>
                      ) : (
                        <div className="flex flex-nowrap overflow-x-auto gap-3.5 p-4 custom-scrollbar bg-slate-50/10 dark:bg-slate-950/20">
                          {activeTiketsUrea.map((t, idx) => {
                            const badge = getPositionBadge(t.position);
                            return (
                              <div key={`${t.bookingno}-${idx}`} className="flex-none w-[245px] rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.01] transition-all duration-300">
                                {/* Product Indicator Line */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-sky-500"></div>
                                
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="font-mono text-xs font-bold text-slate-850 dark:text-slate-100">{t.bookingno}</div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge className="bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 hover:bg-sky-50 border-sky-100 dark:border-sky-900/50 text-[9px] px-1.5 py-0 font-bold uppercase">Urea</Badge>
                                    <Badge 
                                      variant="outline" 
                                      className={`${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].bgLight} ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].borderClass} ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].textClass} text-[8px] font-extrabold uppercase px-1.5 py-0 border`}
                                    >
                                      DPCS: {STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].desc}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-[11px] font-semibold bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border dark:border-slate-800/80 mb-2">
                                  <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                    <Truck className="h-3.5 w-3.5 text-sky-500" /> {t.nopol}
                                  </span>
                                  <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-extrabold">{t.qty ? `${t.qty.toFixed(2)} T` : '0.00 T'}</span>
                                </div>
                                
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/50">
                                  <span className="font-semibold text-slate-400">Driver:</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{t.driver || "-"}</span>
                                </div>
                                
                                <div className="mt-3.5">
                                  <div className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md text-center ${badge.bg} ${badge.text}`}>
                                    {badge.label}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* NPK SECTION */}
                  <Card className="border-t-4 border-t-rose-500 shadow-md rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-rose-600 dark:text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                            NPK PRODUCT
                          </CardTitle>
                          <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500 font-medium">
                            <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800/80">
                              Qty: <strong className="text-slate-800 dark:text-slate-200">{activeTiketsNpk.reduce((a,b)=>a+b.qty,0).toLocaleString("id-ID")} T</strong>
                            </span>
                            <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800/80">
                              Armada: <strong className="text-slate-800 dark:text-slate-200">{activeTiketsNpk.length}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto">
                          <select 
                            value={filterNpk} 
                            onChange={(e) => setFilterNpk(e.target.value)}
                            className="w-full sm:w-[180px] h-7 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-600 dark:text-slate-350"
                          >
                            <option value="all">Semua Posisi</option>
                            <option value="00">Tiket Siap Dicetak</option>
                            <option value="01">Security Pass</option>
                            <option value="02">Timbang Kosong</option>
                            <option value="03">Tiba di Gudang</option>
                            <option value="04">Checkout Gudang</option>
                            <option value="05">Timbang Isi</option>
                            <option value="06">Checkout SPPT</option>
                            <option value="07">Checkout Security</option>
                          </select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {activeTiketsNpk.length === 0 ? (
                        <div className="p-6 text-center text-[10px] text-slate-400 italic bg-slate-50/20">Tidak ada tiket NPK aktif</div>
                      ) : (
                        <div className="flex flex-nowrap overflow-x-auto gap-3.5 p-4 custom-scrollbar bg-slate-50/10 dark:bg-slate-950/20">
                          {activeTiketsNpk.map((t, idx) => {
                            const badge = getPositionBadge(t.position);
                            return (
                              <div key={`${t.bookingno}-${idx}`} className="flex-none w-[245px] rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-850 p-4 shadow-sm relative overflow-hidden group hover:shadow-md hover:scale-[1.01] transition-all duration-300">
                                {/* Product Indicator Line */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                                
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="font-mono text-xs font-bold text-slate-850 dark:text-slate-100">{t.bookingno}</div>
                                  <div className="flex items-center gap-1.5">
                                    <Badge className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 border-rose-100 dark:border-rose-900/50 text-[9px] px-1.5 py-0 font-bold uppercase">Npk</Badge>
                                    <Badge 
                                      variant="outline" 
                                      className={`${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].bgLight} ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].borderClass} ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].textClass} text-[8px] font-extrabold uppercase px-1.5 py-0 border`}
                                    >
                                      DPCS: {STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].desc}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-[11px] font-semibold bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border dark:border-slate-800/80 mb-2">
                                  <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                    <Truck className="h-3.5 w-3.5 text-rose-500" /> {t.nopol}
                                  </span>
                                  <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-450 px-1.5 py-0.5 rounded font-extrabold">{t.qty ? `${t.qty.toFixed(2)} T` : '0.00 T'}</span>
                                </div>
                                
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/50">
                                  <span className="font-semibold text-slate-400">Driver:</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[130px]">{t.driver || "-"}</span>
                                </div>
                                
                                <div className="mt-3.5">
                                  <div className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md text-center ${badge.bg} ${badge.text}`}>
                                    {badge.label}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Table Section */}
      <Card className="mt-8 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Ticket className="h-5 w-5 text-brand-500" />
                History Tiket
              </CardTitle>
              <CardDescription>*Rentang Tiket diambil 2 Minggu terakhir dengan status Checkout Security</CardDescription>
            </div>
            {selectedGudang && (
              <div className="relative w-full sm:w-[300px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Cari Booking / Nopol / Driver..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-md outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!selectedGudang ? (
            <div className="p-12 text-center border-dashed">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3 opacity-60" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Silakan pilih Gudang Tujuan terlebih dahulu</p>
              <p className="text-xs text-slate-400 mt-1">Daftar history tiket akan ditampilkan setelah gudang dipilih.</p>
            </div>
          ) : (
            <div className="relative">
              {historyLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/55 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b">
                      <th className="px-6 py-4 w-[60px]">No.</th>
                      <th className="px-6 py-4">Booking Code</th>
                      <th className="px-6 py-4">POSTO</th>
                      <th className="px-6 py-4">Tanggal Muat</th>
                      <th className="px-6 py-4">Nopol</th>
                      <th className="px-6 py-4">Driver</th>
                      <th className="px-6 py-4 text-right">Qty (Ton)</th>
                      <th className="px-6 py-4">Produk</th>
                      <th className="px-6 py-4">Posisi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                    {historyTikets.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400 italic">
                          Tidak ada data tiket ditemukan
                        </td>
                      </tr>
                    ) : (
                      historyTikets.map((t, idx) => {
                        const isCharter = t.numberString?.includes("charter");
                        return (
                          <tr key={`${t.id || idx}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-xs text-slate-700 dark:text-slate-300 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-400">
                              {isCharter ? (
                                <div className="flex flex-col gap-1">
                                  <Badge className="bg-rose-500 text-white hover:bg-rose-600 px-1 py-0 text-[8px] uppercase tracking-wider font-bold w-fit">Charter</Badge>
                                  <span>{historyPage * 10 + idx + 1}</span>
                                </div>
                              ) : (
                                historyPage * 10 + idx + 1
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {t.bookingno}
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-500">
                              {t.posto}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {t.tanggalString}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                              {t.nopol}
                            </td>
                            <td className="px-6 py-4">
                              {t.driver}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-200">
                              {t.qty ? parseFloat(t.qty).toFixed(2) : "0.00"}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary" className="font-semibold text-[10px]">
                                {t.produkString}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-medium text-[10px]">
                                {t.positionString}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {historyTotal > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700 dark:text-slate-350">{historyPage * 10 + 1}</span> to{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-350">
                      {Math.min((historyPage + 1) * 10, historyTotal)}
                    </span>{" "}
                    of <span className="font-semibold text-slate-700 dark:text-slate-350">{historyTotal}</span> entries
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                      disabled={historyPage === 0 || historyLoading}
                      className="inline-flex items-center justify-center p-2 rounded-md border text-slate-600 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[50px] text-center">
                      Page {historyPage + 1} / {Math.ceil(historyTotal / 10)}
                    </span>
                    <button
                      onClick={() => setHistoryPage(p => p + 1)}
                      disabled={(historyPage + 1) * 10 >= historyTotal || historyLoading}
                      className="inline-flex items-center justify-center p-2 rounded-md border text-slate-600 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(107, 114, 128, 0.8);
        }
      `}</style>
    </div>
  );
}
