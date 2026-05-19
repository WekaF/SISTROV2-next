"use client";

import { useEffect, useState, useMemo } from "react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, AlertTriangle, CheckCircle, Heart, Truck, MapPin, Warehouse, FileText, ChevronRight, BarChart3, Ticket } from "lucide-react";
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
  },
} as const;

export default function ResumeClient() {
  const { apiJson } = useApi();
  const [summary, setSummary] = useState<ResumeSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [selectedKab, setSelectedKab] = useState<string | null>(null);
  const [selectedGudang, setSelectedGudang] = useState<string | null>(null);

  const [filterUrea, setFilterUrea] = useState<string>("all");
  const [filterNpk, setFilterNpk] = useState<string>("all");

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 600000); // refresh every 10m
    return () => clearInterval(interval);
  }, []);

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
    if (selectedStatus === status) return; // do nothing if already selected
    
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
    return detail.grup_tujuan.filter(g => g.kode_kabupaten === selectedKab || g.kabupaten_nama === selectedKab);
  }, [detail, selectedKab]);

  const activeTiketsUrea = useMemo(() => {
    if (!detail || !selectedGudang) return [];
    const gdg = detail.grup_tujuan.find(g => g.tujuan === selectedGudang);
    if (!gdg) return [];
    let t = gdg.tikets.filter(x => x.produk === "P01" || x.produk?.toLowerCase()?.includes("urea"));
    if (filterUrea !== "all") t = t.filter(x => x.position === filterUrea);
    return t;
  }, [detail, selectedGudang, filterUrea]);

  const activeTiketsNpk = useMemo(() => {
    if (!detail || !selectedGudang) return [];
    const gdg = detail.grup_tujuan.find(g => g.tujuan === selectedGudang);
    if (!gdg) return [];
    let t = gdg.tikets.filter(x => x.produk === "P02" || x.produk?.toLowerCase()?.includes("npk"));
    if (filterNpk !== "all") t = t.filter(x => x.position === filterNpk);
    return t;
  }, [detail, selectedGudang, filterNpk]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Memuat Data Resume Transit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-slate-100 dark:to-slate-400">
            Resume Transit
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
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
                isSelected ? `ring-2 ring-offset-2 ring-slate-400 border-transparent shadow-md` : `border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm`
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
                    <span>{count} Pengiriman</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail Section */}
      {selectedStatus && (
        <div className="bg-slate-50/50 dark:bg-slate-900/50 border rounded-xl p-2 md:p-4 mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className={`p-1.5 rounded-md bg-gradient-to-br ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].gradient} text-white`}>
               {(() => {
                 const Icon = STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].icon;
                 return <Icon className="h-4 w-4" />
               })()}
            </div>
            <h2 className="text-lg font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Detail Status <span className={STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].textClass}>{STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].desc}</span>
            </h2>
            {detailLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Column 1: Kabupaten */}
            <div className="lg:col-span-2 space-y-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur z-10 py-2">Kabupaten</h3>
              {!detailLoading && detail?.kabupaten?.length === 0 && (
                <div className="text-center p-4 border border-dashed rounded-lg text-muted-foreground text-sm">Tidak ada data</div>
              )}
              {detail?.kabupaten?.map((kab) => (
                <div 
                  key={kab.kab_kode}
                  onClick={() => { setSelectedKab(kab.kab_kode); setSelectedGudang(null); }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedKab === kab.kab_kode 
                    ? `bg-gradient-to-br ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].gradient} text-white shadow-md border-transparent` 
                    : `bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm`
                  }`}
                >
                  <p className="text-xs font-bold mb-1 truncate">{kab.kab_nama}</p>
                  <p className={`text-[10px] ${selectedKab === kab.kab_kode ? 'text-white/80' : 'text-slate-500'}`}>{kab.kab_kode}</p>
                </div>
              ))}
            </div>

            {/* Column 2: Gudang Tujuan */}
            <div className="lg:col-span-3 space-y-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2 sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur z-10 py-2">Gudang Tujuan</h3>
              
              {!detailLoading && activeGudangs.length === 0 && selectedKab && (
                <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground text-sm bg-white dark:bg-slate-800">
                  <Warehouse className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  Belum ada gudang
                </div>
              )}

              {activeGudangs.map((gdg) => (
                <div 
                  key={gdg.tujuan}
                  onClick={() => setSelectedGudang(gdg.tujuan)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all group ${
                    selectedGudang === gdg.tujuan 
                    ? `bg-white dark:bg-slate-800 ring-2 ring-${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].textClass.split(' ')[0].replace('text-', '')} shadow-md` 
                    : `bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm`
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">{gdg.tujuan} - {gdg.deskripsi}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-2">
                        <Ticket className="h-3 w-3" /> {gdg.count} Tiket &bull; {gdg.tonase} Ton
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 ${selectedGudang === gdg.tujuan ? STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].textClass : 'text-slate-300 group-hover:text-slate-500'}`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Column 3: Tickets UREA & NPK */}
            <div className="lg:col-span-7 space-y-6 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              
              {!selectedGudang ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MapPin className="h-12 w-12 mb-3 opacity-20" />
                  <p>Pilih Gudang Tujuan untuk melihat tiket</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  
                  {/* UREA SECTION */}
                  <Card className="border-t-4 border-t-sky-500 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                            UREA
                          </CardTitle>
                          <div className="flex gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                            <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded border">Qty: {activeTiketsUrea.reduce((a,b)=>a+b.qty,0)} Ton</span>
                            <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded border">Pengiriman: {activeTiketsUrea.length}</span>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto">
                          <select 
                            value={filterUrea} 
                            onChange={(e) => setFilterUrea(e.target.value)}
                            className="w-full sm:w-[250px] h-8 text-xs bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="all">All Positions</option>
                            <option value="00">Tiket Siap Dicetak</option>
                            <option value="01">Armada sampai di Security Pass</option>
                            <option value="02">Armada sampai di Timbang Kosong</option>
                            <option value="03">Armada tiba di Gudang</option>
                            <option value="04">Checkout Gudang Pemuatan</option>
                            <option value="05">Armada berada di Timbang Isi</option>
                            <option value="06">Checkout SPPT</option>
                            <option value="07">Checkout Security Pass</option>
                          </select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {activeTiketsUrea.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-50/30">Tidak ada tiket UREA</div>
                      ) : (
                        <div className="flex flex-nowrap overflow-x-auto gap-3 p-4 custom-scrollbar">
                          {activeTiketsUrea.map((t, idx) => (
                            <div key={idx} className={`flex-none w-[220px] rounded-lg border bg-gradient-to-br ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].gradient} p-3 text-white shadow-sm`}>
                              <div className="font-mono text-xs font-bold mb-1 opacity-90">{t.bookingno}</div>
                              <div className="flex items-center gap-2 text-[10px] mb-2 font-medium bg-white/10 w-fit px-1.5 py-0.5 rounded">
                                <Truck className="h-3 w-3" /> {t.nopol}
                              </div>
                              <div className="text-[10px] opacity-80 mt-2 truncate border-t border-white/20 pt-1">
                                {t.positionString}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* NPK SECTION */}
                  <Card className="border-t-4 border-t-rose-500 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            NPK
                          </CardTitle>
                          <div className="flex gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                            <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded border">Qty: {activeTiketsNpk.reduce((a,b)=>a+b.qty,0)} Ton</span>
                            <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded border">Pengiriman: {activeTiketsNpk.length}</span>
                          </div>
                        </div>
                        <div className="w-full sm:w-auto">
                          <select 
                            value={filterNpk} 
                            onChange={(e) => setFilterNpk(e.target.value)}
                            className="w-full sm:w-[250px] h-8 text-xs bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            <option value="all">All Positions</option>
                            <option value="00">Tiket Siap Dicetak</option>
                            <option value="01">Armada sampai di Security Pass</option>
                            <option value="02">Armada sampai di Timbang Kosong</option>
                            <option value="03">Armada tiba di Gudang</option>
                            <option value="04">Checkout Gudang Pemuatan</option>
                            <option value="05">Armada berada di Timbang Isi</option>
                            <option value="06">Checkout SPPT</option>
                            <option value="07">Checkout Security Pass</option>
                          </select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {activeTiketsNpk.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-50/30">Tidak ada tiket NPK</div>
                      ) : (
                        <div className="flex flex-nowrap overflow-x-auto gap-3 p-4 custom-scrollbar">
                          {activeTiketsNpk.map((t, idx) => (
                            <div key={idx} className={`flex-none w-[220px] rounded-lg border bg-gradient-to-br ${STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG].gradient} p-3 text-white shadow-sm`}>
                              <div className="font-mono text-xs font-bold mb-1 opacity-90">{t.bookingno}</div>
                              <div className="flex items-center gap-2 text-[10px] mb-2 font-medium bg-white/10 w-fit px-1.5 py-0.5 rounded">
                                <Truck className="h-3 w-3" /> {t.nopol}
                              </div>
                              <div className="text-[10px] opacity-80 mt-2 truncate border-t border-white/20 pt-1">
                                {t.positionString}
                              </div>
                            </div>
                          ))}
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

      {/* History Table Placeholder */}
      <Card className="mt-8 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">History Tiket</CardTitle>
          <CardDescription>*Rentang Tiket diambil 2 Minggu terakhir dengan status Checkout Security</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-slate-50 dark:bg-slate-900/50 p-12 text-center border-dashed">
             <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
             <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Data history tiket sedang diproses.</p>
             <p className="text-xs text-slate-500 mt-1">Harap pilih Filter atau sinkronisasi dengan Sistem Utama.</p>
          </div>
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
