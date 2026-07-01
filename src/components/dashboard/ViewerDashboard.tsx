"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  Warehouse,
  Ticket,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lightbulb,
  Percent,
  Ban,
  Activity,
  Download,
  RefreshCw,
  Globe,
  Layers,
  Trophy,
  AlertTriangle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useDashboardStream } from "@/hooks/use-dashboard-stream";
import { useCompany } from "@/context/CompanyContext";
import { useApi } from "@/hooks/use-api";

// Dynamic import for Leaflet Map to avoid SSR compilation issues
const InteractiveLeafletMap = dynamic(
  () => import("./InteractiveLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-gray-50 dark:bg-white/[0.02] rounded-xl gap-2 min-h-[450px]">
        <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
        <span className="text-sm font-medium">Memuat peta interaktif...</span>
      </div>
    )
  }
);

// Dynamic import for ApexCharts to avoid SSR compilation issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PLANT_CHART_LIMIT = 8; // max visible plant series in trendPerPlant line chart

const cleanSeriesName = (name: string): string => {
  if (!name) return "";
  return name
    .replace(/[\r\n]+/g, " ")
    .replace(/['"\\()\[\]{}&/|:;=<>+*?^$!~`]/g, "")
    .trim();
};

interface LoadingBay {
  id: number;
  bay: string;
  status: "loading" | "idle";
  nopol: string;
  driver: string;
  product: string;
  baseProgress: number;
  durationMinutes: number;
  warehouseName: string;
  queueNumber: number;
  bookingno: string;
  noposto: string;
  transportir: string;
}


const getQueueForPlant = (plantCode: string) => {
  switch (plantCode) {
    case "PKG":
      return [
        { nopol: "W 1928 YK", driver: "Agus Waluyo", product: "Urea", eta: "5m" },
        { nopol: "L 9140 AD", driver: "Fahri", product: "Phonska", eta: "12m" },
        { nopol: "B 7220 XX", driver: "Soni", product: "ZA", eta: "18m" }
      ];
    case "PKC":
      return [
        { nopol: "T 9011 FF", driver: "Cecep", product: "NPK", eta: "3m" },
        { nopol: "D 8842 BG", driver: "Usep", product: "Urea", eta: "9m" }
      ];
    case "PIM":
      return [
        { nopol: "BL 8440 LQ", driver: "Taufik", product: "Urea", eta: "6m" }
      ];
    default:
      return [
        { nopol: "W 4452 AZ", driver: "Darno", product: "Pupuk", eta: "8m" }
      ];
  }
};

export default function ViewerDashboard() {
  const { activeCompanyCode, switchCompany } = useCompany();
  const { apiJson, apiTable } = useApi();
  const { data: streamData, status: streamStatus, lastUpdated: streamLastUpdated } = useDashboardStream();
  const [isSimulated, setIsSimulated] = useState(false);
  const [mapPlants, setMapPlants] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [dockCompanies, setDockCompanies] = useState<{ company_code: string; company: string }[]>([
    { company_code: "PKG", company: "Petrokimia Gresik" },
    { company_code: "PKC", company: "Pupuk Kujang" },
    { company_code: "PIM", company: "Pupuk Iskandar Muda" },
    { company_code: "LOG4MENENG", company: "Logistics Meneng" },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch company list from API
  useEffect(() => {
    apiJson<any[]>("/api/Company/getCompanyListFitur")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((c: any) => ({
            company_code: c.company_code,
            company: c.company || c.company_code,
          }));
          if (!formatted.some(m => m.company_code === "LOG4MENENG")) {
            formatted.push({ company_code: "LOG4MENENG", company: "Logistics Meneng" });
          }
          setDockCompanies(formatted);
        }
      })
      .catch((err) => console.error("[ViewerDashboard] company list fetch error:", err));
  }, [apiJson]);

  // States for all dashboard metrics
  const [activeTab, setActiveTab] = useState<"traffic" | "performance" | "all">("traffic");
  const [stats, setStats] = useState<any>(null);
  const [durasiPage, setDurasiPage] = useState(0);
  const [slaPage, setSlaPage] = useState(0);
  const [monthlyComp, setMonthlyComp] = useState<any>(null);
  const [trendPerPlant, setTrendPerPlant] = useState<any>(null);
  const [trendPerHour, setTrendPerHour] = useState<any>(null);
  const [durasiMuat, setDurasiMuat] = useState<any>(null);
  const [topProduk, setTopProduk] = useState<any>(null);
  const [slaPerPlant, setSlaPerPlant] = useState<any>(null);
  const [throughputShift, setThroughputShift] = useState<any>(null);
  const [kuotaUtilization, setKuotaUtilization] = useState<any>(null);
  const [plantRanking, setPlantRanking] = useState<any>(null);
  const [cancelTrend, setCancelTrend] = useState<any>(null);
  const [durasiTickets, setDurasiTickets] = useState<{ longest: any[], fastest: any[] } | null>(null);
  const [activeDurasiTab, setActiveDurasiTab] = useState<"longest" | "fastest">("longest");
  const [isExporting, setIsExporting] = useState(false);
  const [rankingPage, setRankingPage] = useState(0);
  const [rankingTab, setRankingTab] = useState<"top" | "bottom">("top");
  const [activeView, setActiveView] = useState<"heatmap" | "line" | "bar">("heatmap");
  const [dockProgressOffset, setDockProgressOffset] = useState<number>(0);
  // Real loading-bay data from /api/dashboard/loading-bays
  interface RealTicket {
    bookingno: string;
    tiketno?: string;
    nopol: string;
    driver: string;
    produkString: string;
    transportString: string;
    qty: number;
    posto: string;
  }
  const [realBays, setRealBays] = useState<RealTicket[]>([]);
  const [realQueue, setRealQueue] = useState<RealTicket[]>([]);
  const [baysLoading, setBaysLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setDockProgressOffset(prev => (prev + 2) % 100);
    }, 3000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    let cancelled = false;
    const fetchBays = async () => {
      setBaysLoading(true);
      try {
        const BASE_COLUMNS = [
          { data: "bookingno",       name: "bookingno",   searchable: false, orderable: true  },
          { data: "nopol",           name: "nopol",       searchable: false, orderable: false },
          { data: "driver",          name: "driver",      searchable: false, orderable: false },
          { data: "produkString",    name: "idproduk",    searchable: false, orderable: false },
          { data: "transportString", name: "idtransport", searchable: false, orderable: false },
          { data: "qty",             name: "qty",         searchable: false, orderable: false },
          { data: "posto",           name: "posto",       searchable: false, orderable: false },
          { data: "tiketno",         name: "tiketno",     searchable: false, orderable: false },
        ];
        const basePayload = {
          draw: 1,
          start: 0,
          search: { value: "" },
          order: [{ column: 0, dir: "desc" }],
          columns: BASE_COLUMNS,
          ...(activeCompanyCode ? { companyCode: activeCompanyCode } : {}),
        };
        const [baysResult, queueResult] = await Promise.all([
          apiTable<{ data: any[] }>("/api/Tiket/DataTableFilterLegacy", { ...basePayload, length: 20, position: "03" }),
          apiTable<{ data: any[] }>("/api/Tiket/DataTableFilterLegacy", { ...basePayload, length: 10, position: "02" }),
        ]);
        if (!cancelled) {
          setRealBays(Array.isArray(baysResult?.data) ? baysResult.data : []);
          setRealQueue(Array.isArray(queueResult?.data) ? queueResult.data : []);
        }
      } catch (err) {
        console.error("[loading-bays] fetch error:", err);
      } finally {
        if (!cancelled) setBaysLoading(false);
      }
    };
    fetchBays();
    const id = setInterval(fetchBays, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeCompanyCode, apiTable]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const ts = streamLastUpdated?.toLocaleString("id-ID") ?? new Date().toLocaleString("id-ID");

      // Sheet 1: KPI Summary
      if (stats) {
        const kpiRows = [
          ["Metrik", "Nilai"],
          ["Total Antrian", stats.total_antrian ?? 0],
          ["Total Selesai", stats.total_selesai ?? 0],
          ["Total Tonase (Ton)", stats.total_tonase ?? 0],
          ["Avg Durasi (Menit)", stats.avg_tiket_minutes ?? 0],
          ["Durasi Terlama (Menit)", stats.durasi_terlama ?? 0],
          ["Durasi Tercepat (Menit)", stats.durasi_tercepat ?? 0],
          [],
          ["Diekspor pada", ts],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), "KPI Summary");
      }

      // Sheet 2: Plant Ranking
      if (Array.isArray(plantRanking) && plantRanking.length > 0) {
        const rows = [
          ["Rank", "Plant", "Total Tiket", "Total Tonase", "Avg Durasi (mnt)", "SLA %", "Cancel Rate %", "Score"],
          ...plantRanking.map((r: any) => [
            r.Rank, r.CompanyName, r.TotalTiket, r.TotalTonase,
            r.AvgDurasi, r.SlaPercent, r.CancelRate, r.Score,
          ]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Plant Ranking");
      }

      // Sheet 3: SLA per Plant
      if (Array.isArray(slaPerPlant) && slaPerPlant.length > 0) {
        const rows = [
          ["Plant", "SLA %", "Total Selesai", "Dalam SLA"],
          ...slaPerPlant.map((r: any) => [
            r.CompanyName, r.SlaCompliancePercent, r.TotalSelesai, r.TotalDalamSla,
          ]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "SLA per Plant");
      }

      // Sheet 4: Top Produk
      if (Array.isArray(topProduk) && topProduk.length > 0) {
        const rows = [
          ["Produk", "Total Tonase"],
          ...topProduk.map((r: any) => [r.NamaProduk || r.name, r.TotalTonase]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Top Produk");
      }

      // Sheet 5: Avg Durasi Muat
      if (Array.isArray(durasiMuat) && durasiMuat.length > 0) {
        const rows = [
          ["Plant", "Avg Durasi (mnt)"],
          ...durasiMuat.map((r: any) => [r.CompanyName, r.AvgDurasiMenit]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Durasi Muat");
      }

      // Sheet 6: Kuota Utilisasi
      if (Array.isArray(kuotaUtilization) && kuotaUtilization.length > 0) {
        const rows = [
          ["Plant", "Utilisasi %", "Realisasi (Ton)", "Kuota (Ton)"],
          ...kuotaUtilization.map((r: any) => [
            r.CompanyCode, r.UtilizationPercent, r.TotalRealisasi, r.TotalKuota,
          ]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Kuota Utilisasi");
      }

      // Sheet 7: Tiket Durasi Ekstrim
      if (durasiTickets) {
        const longestRows = [
          ["=== TERLAMA ==="],
          ["No Tiket", "Nopol", "Driver", "Qty", "Check In", "Check Out", "Plant", "Durasi (mnt)"],
          ...(durasiTickets.longest || []).map((r: any) => [
            r.TiketNo, r.Nopol, r.Driver, r.Qty, r.CheckIn, r.CheckOut, r.CompanyName, r.DurationMinutes,
          ]),
          [],
          ["=== TERCEPAT ==="],
          ["No Tiket", "Nopol", "Driver", "Qty", "Check In", "Check Out", "Plant", "Durasi (mnt)"],
          ...(durasiTickets.fastest || []).map((r: any) => [
            r.TiketNo, r.Nopol, r.Driver, r.Qty, r.CheckIn, r.CheckOut, r.CompanyName, r.DurationMinutes,
          ]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(longestRows), "Durasi Ekstrim");
      }

      const fileName = `laporan-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // SSE stream data transformation — replaces the old loadDashboardData fetch loop
  useEffect(() => {
    if (!streamData) return;

    const { stats: statsRes, trendPlant: trendPlantRes, trendHour: trendHourRes,
      durasi: durasiRes, monthly: monthlyRes, leaderboard: leaderboardRes,
      durasiTickets: durasiTicketsRes, topProduk: topProdukRes, mapData: mapDataRes } = streamData;

    // ── MonitorStats ──────────────────────────────────────────────────────────
    let finalStats = {
      total_antrian: 1205, total_tonase: 48900, avg_tiket_minutes: 42,
      durasi_terlama: 145, durasi_tercepat: 12, total_selesai: 980,
      tiket_cancelled: [
        { Alasan: "Armada Tidak Layak", Jumlah: 14 },
        { Alasan: "Overload Berat Muat", Jumlah: 9 },
        { Alasan: "Pembatalan Driver", Jumlah: 7 },
        { Alasan: "Kesalahan Dokumen", Jumlah: 5 },
      ]
    };

    // ── MonitorStats ──────────────────────────────────────────────────────────
    let realDataFetched = false;
    if (statsRes?.Success && statsRes.totalTiket > 0) {
      finalStats = {
        total_antrian: statsRes.totalAntrian ?? 0,
        total_selesai: statsRes.totalSelesai ?? 0,
        total_tonase: statsRes.totalTonase ?? 0,
        avg_tiket_minutes: statsRes.avgDurasiMenit ?? 0,
        durasi_terlama: statsRes.durasiTerlama ?? 0,
        durasi_tercepat: statsRes.durasiTercepat ?? 0,
        tiket_cancelled: statsRes.totalCancel > 0
          ? [{ Alasan: "Dibatalkan / Kadaluwarsa", Jumlah: statsRes.totalCancel }]
          : []
      };
      realDataFetched = true;
    }
    setStats(finalStats);
    setIsSimulated(!realDataFetched);

    // ── Monthly Overview ──────────────────────────────────────────────────────
    if (monthlyRes?.status === "success" && monthlyRes.BulanIni?.TotalTiket > 0) {
      setMonthlyComp({
        BulanIniLabel: monthlyRes.BulanIniLabel,
        BulanLaluLabel: monthlyRes.BulanLaluLabel,
        BulanIni: monthlyRes.BulanIni,
        BulanLalu: monthlyRes.BulanLalu,
        TiketChange: monthlyRes.TiketChange,
        TonaseChange: monthlyRes.TonaseChange,
      });
    } else {
      setMonthlyComp({
        BulanIniLabel: "Mei 2026", BulanLaluLabel: "April 2026",
        BulanIni: { TotalTiket: 32540, TotalTonase: 1301600, TotalSelesai: 28900, TotalCancel: 640 },
        BulanLalu: { TotalTiket: 30120, TotalTonase: 1204800, TotalSelesai: 27200, TotalCancel: 710 },
        TiketChange: 8.0, TonaseChange: 8.3,
      });
    }

    // ── Top Produk ────────────────────────────────────────────────────────────
    if (topProdukRes?.status === "success" && Array.isArray(topProdukRes.data) && topProdukRes.data.length > 0) {
      setTopProduk(topProdukRes.data);
    } else {
      setTopProduk([
        { NamaProduk: "Urea Curah", TotalTonase: 546200 },
        { NamaProduk: "NPK Phonska", TotalTonase: 364100 },
        { NamaProduk: "ZA", TotalTonase: 195100 },
        { NamaProduk: "SP-36", TotalTonase: 130000 },
        { NamaProduk: "Pupuk Organik", TotalTonase: 65000 },
      ]);
    }

    // ── Leaderboard ───────────────────────────────────────────────────────────
    if (leaderboardRes?.status === "success" && Array.isArray(leaderboardRes.data) && leaderboardRes.data.length > 0) {
      setPlantRanking(leaderboardRes.data);
      setSlaPerPlant(leaderboardRes.data.map((item: any) => ({
        CompanyName: item.CompanyName,
        SlaCompliancePercent: item.SlaPercent,
        TotalSelesai: item.TotalSelesai,
        TotalDalamSla: Math.round((item.SlaPercent / 100) * item.TotalSelesai),
      })));
      setKuotaUtilization(leaderboardRes.data.slice(0, 5).map((item: any) => {
        const simulatedKuota = Math.max(5000, Math.round((item.TotalTonase * 1.2) / 1000) * 1000);
        const percent = simulatedKuota > 0 ? Math.round((item.TotalTonase / simulatedKuota) * 100) : 0;
        return {
          CompanyCode: item.CompanyCode,
          UtilizationPercent: percent > 100 ? 100 : percent,
          TotalRealisasi: Math.round(item.TotalTonase),
          TotalKuota: simulatedKuota,
        };
      }));
    } else {
      setSlaPerPlant([
        { CompanyName: "DC Makassar", SlaCompliancePercent: 92, TotalSelesai: 1540, TotalDalamSla: 1416 },
        { CompanyName: "Petrokimia Gresik (PKG)", SlaCompliancePercent: 88, TotalSelesai: 4850, TotalDalamSla: 4268 },
        { CompanyName: "Pupuk Kujang (PKC)", SlaCompliancePercent: 81, TotalSelesai: 2980, TotalDalamSla: 2413 },
        { CompanyName: "Logistics Meneng", SlaCompliancePercent: 75, TotalSelesai: 1820, TotalDalamSla: 1365 },
        { CompanyName: "Pupuk Iskandar Muda (PIM)", SlaCompliancePercent: 68, TotalSelesai: 2150, TotalDalamSla: 1462 },
        { CompanyName: "UPP Semarang", SlaCompliancePercent: 64, TotalSelesai: 1100, TotalDalamSla: 704 },
      ]);
      setKuotaUtilization([
        { CompanyCode: "PKG", UtilizationPercent: 89, TotalRealisasi: 8900, TotalKuota: 10000 },
        { CompanyCode: "LOG4MENENG", UtilizationPercent: 82, TotalRealisasi: 4100, TotalKuota: 5000 },
        { CompanyCode: "PKC", UtilizationPercent: 76, TotalRealisasi: 5700, TotalKuota: 7500 },
        { CompanyCode: "PIM", UtilizationPercent: 54, TotalRealisasi: 3240, TotalKuota: 6000 },
        { CompanyCode: "D243", UtilizationPercent: 45, TotalRealisasi: 1800, TotalKuota: 4000 },
      ]);
      setPlantRanking([
        { Rank: 1, CompanyName: "DC Makassar", TotalTiket: 1540, TotalTonase: 61600, AvgDurasi: 32, SlaPercent: 92, CancelRate: 0.8, Score: 92.5 },
        { Rank: 2, CompanyName: "Petrokimia Gresik (PKG)", TotalTiket: 4850, TotalTonase: 194000, AvgDurasi: 38, SlaPercent: 88, CancelRate: 1.2, Score: 89.8 },
        { Rank: 3, CompanyName: "Pupuk Kujang Cikampek (PKC)", TotalTiket: 2980, TotalTonase: 119200, AvgDurasi: 45, SlaPercent: 81, CancelRate: 1.6, Score: 84.2 },
        { Rank: 4, CompanyName: "UPP Meneng Banyuwangi", TotalTiket: 1820, TotalTonase: 72800, AvgDurasi: 41, SlaPercent: 75, CancelRate: 2.3, Score: 78.4 },
        { Rank: 5, CompanyName: "Pupuk Iskandar Muda (PIM)", TotalTiket: 2150, TotalTonase: 86000, AvgDurasi: 52, SlaPercent: 68, CancelRate: 2.8, Score: 71.9 },
        { Rank: 6, CompanyName: "UPP Semarang", TotalTiket: 1100, TotalTonase: 44000, AvgDurasi: 48, SlaPercent: 64, CancelRate: 3.5, Score: 65.1 },
      ]);
    }

    // ── Trend Per Plant ───────────────────────────────────────────────────────
    if (trendPlantRes?.status === "success" && Array.isArray(trendPlantRes.data) && trendPlantRes.data.length > 0) {
      const raw = trendPlantRes.data;
      const uniqueDates = Array.from(new Set<string>(raw.map((item: any) => item.Tanggal))).sort();
      const formattedDates = uniqueDates.map((d: string) =>
        new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      );
      const plants = Array.from(new Set<string>(raw.map((item: any) => item.CompanyName || item.CompanyCode)));
      const allSeries = plants.map((plant: string) => ({
        name: cleanSeriesName(plant),
        data: uniqueDates.map((dateStr: string) => {
          const entry = raw.find((item: any) => (item.CompanyName || item.CompanyCode) === plant && item.Tanggal === dateStr);
          return entry ? (entry.TotalTiket ?? ((entry.TotalAntrian ?? 0) + (entry.TotalSelesai ?? 0))) : 0;
        }),
      }));

      // Cap at PLANT_CHART_LIMIT — sort by total tickets desc, group remainder as "Lainnya"
      const sorted = [...allSeries].sort(
        (a, b) => b.data.reduce((s, v) => s + v, 0) - a.data.reduce((s, v) => s + v, 0)
      );
      const topSeries = sorted.slice(0, PLANT_CHART_LIMIT);
      const rest = sorted.slice(PLANT_CHART_LIMIT);
      if (rest.length > 0) {
        const lainnyaData = formattedDates.map((_: string, i: number) =>
          rest.reduce((sum: number, s: any) => sum + (s.data[i] || 0), 0)
        );
        topSeries.push({ name: `Lainnya (${rest.length} plant)`, data: lainnyaData });
      }

      setTrendPerPlant({ dates: formattedDates, series: topSeries });
    }

    // ── Trend Per Hour ────────────────────────────────────────────────────────
    if (trendHourRes?.status === "success" && Array.isArray(trendHourRes.data) && trendHourRes.data.length > 0) {
      const raw = trendHourRes.data;
      const hours = Array.from(new Set<string>(raw.map((item: any) => `${item.Jam}:00`))).sort();
      const antrian = hours.map((h: string) => {
        const jam = parseInt(h);
        return raw.filter((item: any) => item.Jam === jam)
          .reduce((sum: number, item: any) => sum + (item.TotalTiket || item.TotalAntrian || 0), 0);
      });
      const selesai = hours.map((h: string) => {
        const jam = parseInt(h);
        return raw.filter((item: any) => item.Jam === jam)
          .reduce((sum: number, item: any) => sum + (item.TotalSelesai || 0), 0);
      });
      setTrendPerHour({ hours, antrian, selesai });
    }

    // ── Durasi Muat ───────────────────────────────────────────────────────────
    if (durasiRes?.status === "success" && Array.isArray(durasiRes.data) && durasiRes.data.length > 0) {
      setDurasiMuat(durasiRes.data.map((item: any) => ({
        CompanyName: item.CompanyName || item.CompanyCode,
        AvgDurasiMenit: Math.round(item.AvgDurasiMenit || 0),
      })));
    }

    // ── Top Durasi Tickets ────────────────────────────────────────────────────
    if (durasiTicketsRes?.status === "success" && Array.isArray(durasiTicketsRes.longest) && durasiTicketsRes.longest.length > 0) {
      setDurasiTickets({ longest: durasiTicketsRes.longest, fastest: durasiTicketsRes.fastest || [] });
    }

    // ── Static simulated data (no real API) ──────────────────────────────────
    setThroughputShift({
      dates: ["12 Mei", "13 Mei", "14 Mei", "15 Mei", "16 Mei", "17 Mei", "18 Mei"],
      shift1: [4200, 4800, 4500, 5100, 4900, 4400, 5200],
      shift2: [3800, 4100, 3900, 4600, 4300, 3900, 4500],
      shift3: [2400, 2800, 2600, 3100, 2950, 2500, 3200],
    });
    setCancelTrend({
      dates: ["12 Mei", "13 Mei", "14 Mei", "15 Mei", "16 Mei", "17 Mei", "18 Mei"],
      series: [
        { name: "Petrokimia Gresik (PKG)", data: [1.2, 1.5, 1.1, 1.4, 1.2, 1.3, 1.2] },
        { name: "Pupuk Kujang (PKC)", data: [1.8, 2.1, 1.7, 1.9, 1.6, 1.5, 1.6] },
        { name: "Pupuk Iskandar Muda (PIM)", data: [2.5, 3.0, 2.8, 3.2, 2.7, 2.9, 2.8] },
      ],
    });

    // ── Map Data ──────────────────────────────────────────────────────────────
    if (mapDataRes?.Success && Array.isArray(mapDataRes.data) && mapDataRes.data.length > 0) {
      const parsedMap = mapDataRes.data.map((p: any) => {
        let cleanLat = (p.lat || "0").toString();
        let cleanLng = (p.lng || "0").toString();
        if (cleanLat.includes(",") && cleanLat.includes(".")) cleanLat = cleanLat.replace(/,/g, "");
        else if (cleanLat.includes(",")) cleanLat = cleanLat.replace(/,/g, ".");
        if (cleanLng.includes(",") && cleanLng.includes(".")) cleanLng = cleanLng.replace(/,/g, "");
        else if (cleanLng.includes(",")) cleanLng = cleanLng.replace(/,/g, ".");
        return {
          name: p.name || p.company_code,
          lat: cleanLat,
          lng: cleanLng,
          address: `Antrian Aktif: ${p.antrian} Truk`,
          kodePlant: p.company_code || "UNKNOWN",
          phase: p.antrian > 0 ? 1 : 2,
        };
      });
      setMapPlants(parsedMap);
    }
  }, [streamData]);

  // Format currency or standard numbers
  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

  // Dynamic colors for charts and tables
  const COLORS = ["#3C50E0", "#10B981", "#36B9CC", "#F59E0B", "#EF4444", "#858796", "#EC4899", "#8B5CF6"];

  // ==========================================
  // ApexCharts Configurations
  // ==========================================

  // 1. Heatmap Aktivitas Muat per Plant (7 Hari)
  // Transform: { name, data: number[] } → { name, data: [{x: date, y: number}] }
  const heatmapSeries = (trendPerPlant?.series || []).map((s: any) => ({
    name: s.name,
    data: (trendPerPlant?.dates || []).map((date: string, i: number) => ({
      x: date,
      y: s.data[i] ?? 0
    }))
  }));

  const heatmapOptions: any = {
    chart: {
      type: "heatmap",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      animations: { enabled: true, speed: 600 }
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: "10px", fontWeight: "bold", colors: ["#fff"] },
      formatter: (val: number) => val > 0 ? String(val) : ""
    },
    xaxis: {
      type: "category",
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", fontWeight: 600 } }
    },
    yaxis: {
      labels: { style: { fontSize: "11px", fontWeight: 600 } }
    },
    plotOptions: {
      heatmap: {
        radius: 6,
        enableShades: false,
        colorScale: {
          ranges: [
            { from: 0,  to: 0,   name: "Tidak Ada",    color: "#F1F5F9" },
            { from: 1,  to: 10,  name: "Rendah",        color: "#A7F3D0" },
            { from: 11, to: 30,  name: "Sedang",        color: "#34D399" },
            { from: 31, to: 60,  name: "Tinggi",        color: "#059669" },
            { from: 61, to: 9999, name: "Sangat Tinggi", color: "#065F46" }
          ]
        }
      }
    },
    grid: { show: false },
    legend: { show: false },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }: any) => {
        const plant = w.globals.seriesNames[seriesIndex];
        const point = w.globals.initialSeries[seriesIndex]?.data?.[dataPointIndex];
        const date  = point?.x ?? "";
        const val   = point?.y ?? 0;
        return `<div style="padding:8px 12px;font-size:12px;font-family:Outfit,sans-serif;border-radius:8px">
          <b style="color:#111">${plant}</b><br/>
          <span style="color:#6B7280;font-size:11px">${date}</span><br/>
          <span style="color:#10B981;font-weight:800">${val} tiket muat</span>
        </div>`;
      }
    }
  };

  // 1.5. Trend Plant Line and Bar Options
  const trendPlantLineOptions: any = {
    chart: {
      type: "line",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    stroke: { curve: "smooth", width: 2.5 },
    colors: COLORS,
    xaxis: {
      categories: trendPerPlant?.dates || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", fontWeight: 600 } }
    },
    yaxis: {
      labels: {
        style: { fontSize: "11px", fontWeight: 600 },
        formatter: (v: number) => fmt(v)
      }
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "11px",
      fontFamily: "Outfit, sans-serif",
      fontWeight: 500,
      itemMargin: { horizontal: 8, vertical: 4 }
    },
    grid: { borderColor: "rgba(226, 232, 240, 0.5)", strokeDashArray: 4 },
    tooltip: { shared: true, intersect: false }
  };

  const trendPlantBarOptions: any = {
    chart: {
      type: "bar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 4
      }
    },
    colors: COLORS,
    xaxis: {
      categories: trendPerPlant?.dates || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", fontWeight: 600 } }
    },
    yaxis: {
      labels: {
        style: { fontSize: "11px", fontWeight: 600 },
        formatter: (v: number) => fmt(v)
      }
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "11px",
      fontFamily: "Outfit, sans-serif",
      fontWeight: 500,
      itemMargin: { horizontal: 8, vertical: 4 }
    },
    grid: { borderColor: "rgba(226, 232, 240, 0.5)", strokeDashArray: 4 },
    tooltip: { shared: true, intersect: false }
  };

  // 2. Distribusi Tiket per Jam (Hari Ini) - Stacked Column Chart
  const trendHourOptions: any = {
    chart: {
      type: "bar",
      stacked: true,
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false }
    },
    colors: ["#F59E0B", "#10B981"], // Antrian: Amber, Selesai: Emerald
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: "55%"
      }
    },
    xaxis: {
      categories: trendPerHour?.hours || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Jumlah Tiket", style: { fontWeight: 500 } }
    },
    grid: { borderColor: "rgba(226, 232, 240, 0.5)", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "right" },
    fill: { opacity: 0.9 }
  };

  const trendHourSeries = [
    { name: "Antrian", data: trendPerHour?.antrian || [] },
    { name: "Selesai", data: trendPerHour?.selesai || [] }
  ];

  // 3. Avg Durasi Muat per Plant - Horizontal Column Chart
  // 3.5. Paginated Average Loading Duration Dataset
  const durasiItemsPerPage = 5;
  const totalDurasiPages = durasiMuat ? Math.ceil(durasiMuat.length / durasiItemsPerPage) : 0;
  const paginatedDurasiMuat = durasiMuat ? durasiMuat.slice(durasiPage * durasiItemsPerPage, (durasiPage + 1) * durasiItemsPerPage) : [];

  const durasiMuatOptions: any = {
    chart: {
      type: "bar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        barHeight: "65%",
        distributed: true,
        horizontal: true,
        borderRadius: 4
      }
    },
    colors: paginatedDurasiMuat?.map((d: any) =>
      d.AvgDurasiMenit <= 35 ? "#10B981" : d.AvgDurasiMenit <= 45 ? "#F59E0B" : "#EF4444"
    ) || COLORS,
    xaxis: {
      categories: paginatedDurasiMuat?.map((d: any) => d.CompanyName) || [],
      axisBorder: { show: false },
      title: { text: "Menit", style: { fontWeight: 500 } }
    },
    grid: { borderColor: "rgba(226, 232, 240, 0.5)", strokeDashArray: 4 },
    legend: { show: false },
    dataLabels: {
      enabled: true,
      formatter: function (val: any) {
        return val + " m";
      },
      offsetX: -6,
      style: { colors: ["#fff"], fontSize: "11px", fontWeight: "bold" }
    }
  };

  const durasiMuatSeries = [{
    name: "Avg Durasi (mnt)",
    data: paginatedDurasiMuat?.map((d: any) => Math.round(d.AvgDurasiMenit)) || []
  }];

  // 4. Top 5 Produk by Volume - Doughnut Chart
  const topProdukOptions: any = {
    chart: {
      type: "doughnut",
      fontFamily: "Outfit, sans-serif",
    },
    labels: topProduk?.map((p: any) => cleanSeriesName(p.NamaProduk || p.name)) || [],
    colors: COLORS.slice(0, topProduk?.length || 5),
    legend: { show: false },
    stroke: { width: 2 },
    dataLabels: { enabled: true, formatter: (val: any) => `${Math.round(val)}%` },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Volume",
              fontSize: "12px",
              fontWeight: 500,
              formatter: function (w: any) {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                if (total < 1000) {
                  return fmt(Math.round(total)) + " T";
                }
                return fmt(Math.round(total / 1000)) + "k T";
              }
            }
          }
        }
      }
    }
  };

  const topProdukSeries = topProduk?.map((p: any) => p.TotalTonase) || [];

  // 5. SLA Compliance per Plant - Horizontal Column Chart
  // 4.5. Paginated SLA Dataset
  const slaItemsPerPage = 5;
  const totalSlaPages = slaPerPlant ? Math.ceil(slaPerPlant.length / slaItemsPerPage) : 0;
  const paginatedSlaPerPlant = slaPerPlant ? slaPerPlant.slice(slaPage * slaItemsPerPage, (slaPage + 1) * slaItemsPerPage) : [];

  const slaOptions: any = {
    chart: {
      type: "bar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        barHeight: "65%",
        distributed: true,
        horizontal: true,
        borderRadius: 4
      }
    },
    colors: paginatedSlaPerPlant?.map((s: any) =>
      s.SlaCompliancePercent >= 85 ? "#10B981" : s.SlaCompliancePercent >= 70 ? "#F59E0B" : "#EF4444"
    ) || COLORS,
    xaxis: {
      categories: paginatedSlaPerPlant?.map((s: any) => s.CompanyName) || [],
      max: 100,
      axisBorder: { show: false },
      title: { text: "SLA % Compliance", style: { fontWeight: 500 } }
    },
    grid: { borderColor: "rgba(226, 232, 240, 0.5)", strokeDashArray: 4 },
    legend: { show: false },
    dataLabels: {
      enabled: true,
      formatter: function (val: any) {
        return val + "%";
      },
      offsetX: -6,
      style: { colors: ["#fff"], fontSize: "11px", fontWeight: "bold" }
    }
  };

  const slaSeries = [{
    name: "SLA Compliance",
    data: paginatedSlaPerPlant?.map((s: any) => s.SlaCompliancePercent) || []
  }];

  // 6. Throughput per Shift (30 Hari) - Stacked Column Chart
  const throughputOptions: any = {
    chart: {
      type: "bar",
      stacked: true,
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false }
    },
    colors: ["#3C50E0", "#10B981", "#F59E0B"], // Shift 1: Indigo, Shift 2: Emerald, Shift 3: Amber
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: "55%"
      }
    },
    xaxis: {
      categories: throughputShift?.dates || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Volume (Ton)", style: { fontWeight: 500 } },
      labels: { formatter: (val: any) => fmt(val) }
    },
    grid: { borderColor: "rgba(226, 232, 240, 0.5)", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "right" },
    fill: { opacity: 0.9 }
  };

  const throughputSeries = [
    { name: "Shift 1 (Pagi)", data: throughputShift?.shift1 || [] },
    { name: "Shift 2 (Siang)", data: throughputShift?.shift2 || [] },
    { name: "Shift 3 (Malam)", data: throughputShift?.shift3 || [] }
  ];

  // 6.5. Kuota Utilisasi: Stacked Horizontal Bar (Terpakai vs Sisa)
  const kuotaCategories = kuotaUtilization?.map((k: any) => k.CompanyCode || k.CompanyName) || [];
  const kuotaStackedOptions: any = {
    chart: {
      type: "bar",
      stacked: true,
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      animations: { enabled: true, speed: 500 }
    },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 5, borderRadiusWhenStacked: "last", barHeight: "60%" }
    },
    colors: ["#10B981", "#E2E8F0"],
    xaxis: {
      categories: kuotaCategories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        formatter: (val: number) => `${(val / 1000).toFixed(0)}k T`,
        style: { fontSize: "11px" }
      }
    },
    yaxis: { labels: { style: { fontSize: "11px", fontWeight: 700 } } },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts: any) => {
        if (opts.seriesIndex === 0) {
          const pct = kuotaUtilization?.[opts.dataPointIndex]?.UtilizationPercent ?? 0;
          return `${pct}%`;
        }
        return "";
      },
      style: { fontSize: "10px", fontWeight: "bold", colors: ["#fff", "transparent"] }
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (val: number) => `${fmt(val)} Ton` }
    },
    legend: { show: false },
    grid: { borderColor: "rgba(226,232,240,0.4)", strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    fill: { opacity: [1, 0.35] }
  };
  const kuotaStackedSeries = [
    { name: "Terpakai", data: kuotaUtilization?.map((k: any) => k.TotalRealisasi) || [] },
    { name: "Sisa Kuota", data: kuotaUtilization?.map((k: any) => Math.max(0, (k.TotalKuota || 0) - (k.TotalRealisasi || 0))) || [] }
  ];

  // 7. Cancel Rate Trend per Plant - Line Chart
  const cancelTrendOptions: any = {
    chart: {
      type: "line",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    stroke: { curve: "smooth", width: 3 },
    colors: COLORS.slice(0, cancelTrend?.series?.length || 4),
    xaxis: {
      categories: cancelTrend?.dates || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Cancel Rate %", style: { fontWeight: 500 } },
      labels: { formatter: (val: any) => `${val}%` }
    },
    grid: { borderColor: "rgba(226, 232, 240, 0.5)", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "left" }
  };

  // Determine global SLA to color code
  const getGlobalSlaValue = () => {
    if (!slaPerPlant || slaPerPlant.length === 0) return 0;
    const totalSelesai = slaPerPlant.reduce((s: number, x: any) => s + (x.TotalSelesai || 0), 0);
    const totalDalamSla = slaPerPlant.reduce((s: number, x: any) => s + (x.TotalDalamSla || 0), 0);
    return totalSelesai > 0 ? Math.round((totalDalamSla / totalSelesai) * 100) : 0;
  };

  const globalSla = getGlobalSlaValue();

  // 5.5. Paginated Leaderboard Dataset (Top 10 vs Bottom 10)
  const rankingList = plantRanking ? (rankingTab === "top" ? plantRanking.slice(0, 10) : plantRanking.slice(-10).reverse()) : [];
  const rankingItemsPerPage = 5;
  const totalRankingPages = rankingList ? Math.ceil(rankingList.length / rankingItemsPerPage) : 0;
  const paginatedRanking = rankingList ? rankingList.slice(rankingPage * rankingItemsPerPage, (rankingPage + 1) * rankingItemsPerPage) : [];

  if (!streamData) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 animate-pulse">
        {/* 1. Header Skeleton */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-5 dark:border-gray-800">
          <div className="space-y-2.5">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-4 w-96 bg-slate-150 dark:bg-slate-800/60 rounded-md" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>

        {/* 2. Map Skeleton (MASSIVE & FULL WIDTH) */}
        <div className="w-full h-[540px] bg-slate-200 dark:bg-slate-850 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-5 w-80 bg-slate-300 dark:bg-slate-700 rounded-md" />
              <div className="h-3 w-96 bg-slate-150 dark:bg-slate-800/40 rounded-md" />
            </div>
            <div className="h-6 w-32 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>
          <div className="flex-1 flex items-center justify-center my-6">
            {/* Glowing Map grid shape simulator */}
            <div className="w-2/3 h-1/2 border-2 border-dashed border-slate-300/40 dark:border-slate-700/40 rounded-3xl flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-slate-300 dark:bg-slate-700 animate-ping" />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-12 w-1/4 bg-slate-300 dark:bg-slate-700 rounded-xl" />
            <div className="h-12 w-1/4 bg-slate-300 dark:bg-slate-700 rounded-xl" />
            <div className="h-12 w-1/4 bg-slate-300 dark:bg-slate-700 rounded-xl" />
            <div className="h-12 w-1/4 bg-slate-300 dark:bg-slate-700 rounded-xl" />
          </div>
        </div>

        {/* 3. 4 KPI Cards Grid Skeletons */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-200 dark:bg-slate-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 h-32 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-slate-300 dark:bg-slate-700 rounded" />
                <div className="h-8 w-8 rounded-lg bg-slate-300 dark:bg-slate-700" />
              </div>
              <div className="space-y-2">
                <div className="h-7 w-20 bg-slate-300 dark:bg-slate-700 rounded" />
                <div className="h-3.5 w-32 bg-slate-150 dark:bg-slate-800/40 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* 4. Charts Grid Skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Chart Card */}
          <div className="lg:col-span-8 bg-slate-200 dark:bg-slate-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 h-[400px] flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-5 w-48 bg-slate-300 dark:bg-slate-700 rounded" />
              <div className="h-8 w-32 bg-slate-300 dark:bg-slate-700 rounded-lg" />
            </div>
            <div className="flex-1 flex items-end gap-3 mt-6">
              {[35, 45, 60, 25, 70, 40, 85, 50, 65, 30, 55, 90].map((h, idx) => (
                <div
                  key={idx}
                  className="bg-slate-300 dark:bg-slate-700 rounded-t-md flex-1"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* Secondary Chart Card */}
          <div className="lg:col-span-4 bg-slate-200 dark:bg-slate-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 h-[400px] flex flex-col justify-between">
            <div className="h-5 w-40 bg-slate-300 dark:bg-slate-700 rounded" />
            <div className="flex-1 flex items-center justify-center my-6">
              {/* Circular donut simulator */}
              <div className="h-40 w-40 rounded-full border-[16px] border-slate-300 dark:border-slate-700 flex items-center justify-center">
                <div className="h-10 w-16 bg-slate-300 dark:bg-slate-700 rounded" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-300 dark:bg-slate-700 rounded" />
              <div className="h-4 w-2/3 bg-slate-300 dark:bg-slate-700 rounded" />
            </div>
          </div>
        </div>

        {/* 5. Table List Skeleton */}
        <div className="bg-slate-200 dark:bg-slate-800 border border-gray-150 dark:border-gray-800 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-5 w-56 bg-slate-300 dark:bg-slate-700 rounded" />
              <div className="h-3 w-80 bg-slate-150 dark:bg-slate-800/40 rounded" />
            </div>
            <div className="h-8 w-24 bg-slate-300 dark:bg-slate-700 rounded-lg" />
          </div>
          <div className="space-y-4">
            <div className="h-10 bg-slate-300 dark:bg-slate-700 rounded-lg w-full" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 justify-between">
                <div className="h-6 w-1/4 bg-slate-300 dark:bg-slate-700 rounded" />
                <div className="h-6 w-1/6 bg-slate-300 dark:bg-slate-700 rounded" />
                <div className="h-6 w-1/5 bg-slate-300 dark:bg-slate-700 rounded" />
                <div className="h-6 w-12 bg-slate-300 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6">

      {/* 1. Sleek Modern Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-5 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {/* <span className="bg-brand-500/10 text-brand-500 rounded-md p-1">
              <Globe className="h-5 w-5" />
            </span> */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Dashboard SISTRO
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {"Global Viewer & API Monitoring Dashboard untuk Semua Plant Pupuk Indonesia Group"}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${streamStatus === "live"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : streamStatus === "error"
                  ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${streamStatus === "live"
                  ? "bg-emerald-500 animate-pulse"
                  : streamStatus === "error"
                    ? "bg-red-500"
                    : "bg-gray-400 animate-pulse"
                  }`}
              />
              {streamStatus === "live" ? "Live" : streamStatus === "error" ? "Offline" : "Connecting..."}
            </span>
            {mounted && streamLastUpdated && (
              <span className="text-xs text-gray-400">
                Update: {streamLastUpdated.toLocaleTimeString("id-ID")}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            disabled
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 rounded-xl shadow-sm opacity-60 cursor-default"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${streamStatus === "connecting" ? "animate-spin text-brand-500" : ""}`} />
            Perbarui {mounted && streamLastUpdated && `(${streamLastUpdated.toLocaleTimeString("id-ID")})`}
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting || !stats}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
          >
            {isExporting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {isExporting ? "Mengekspor..." : "Ekspor Laporan"}
          </button>
        </div>
      </div>

      {/* 1.5. Interactive Command Center Regional Map (MASSIVE & FULL WIDTH) */}
      <Card className="shadow-theme-xs hover:shadow-md transition-all duration-300 mb-6 animate-slide-up-fade border border-gray-100 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800">
          <div>
            <CardTitle className="text-sm font-black flex items-center gap-2 tracking-tight text-gray-900 dark:text-white uppercase">
              <Globe className="h-5 w-5 text-brand-500 animate-pulse" />
              PETA OPERASIONAL LOGISTIK NASIONAL - COMMAND CENTRE PUPUK INDONESIA
            </CardTitle>
            <CardDescription className="text-xs font-bold text-gray-400">
              Visualisasi real-time status distribusi pupuk, implementasi rollout SISTRO, & monitoring performa logistik di seluruh wilayah Indonesia
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-1.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">MONITORING AKTIF</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 xl:grid-cols-12">
            {/* The Map itself */}
            <div className="xl:col-span-9 h-[500px] w-full relative overflow-hidden">
              <InteractiveLeafletMap externalData={mapPlants.length > 0 ? mapPlants : undefined} />
            </div>

            {/* Side summary panel for high-tech look */}
            <div className="xl:col-span-3 p-5 bg-gray-50/50 dark:bg-white/[0.01] border-l border-gray-100 dark:border-gray-800 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Statistik Logistik Utama</h4>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-white dark:bg-white/[0.02] border border-gray-150 dark:border-gray-800/80 rounded-xl p-3">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Total Antrian</span>
                      <span className="text-lg font-black text-brand-500 mt-1 block">
                        {stats ? fmt(stats.total_antrian) : "1.205"}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-white/[0.02] border border-gray-150 dark:border-gray-800/80 rounded-xl p-3">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Total Selesai</span>
                      <span className="text-lg font-black text-emerald-500 mt-1 block">
                        {stats ? fmt(stats.total_selesai) : "980"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ringkasan Kinerja Hari Ini</h4>

                  <div className="space-y-2.5">
                    <div className="p-3 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Volume Penyaluran</span>
                        <span className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5 block">
                          {stats ? `${fmt(stats.total_tonase)} Ton` : "48.900 Ton"}
                        </span>
                      </div>
                      <span className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 px-2 py-0.5 rounded-lg font-bold">Real-time</span>
                    </div>

                    <div className="p-3 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-gray-400 block">Rata-rata Durasi Muat</span>
                        <span className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5 block">
                          {stats ? `${stats.avg_tiket_minutes} Menit` : "42 Menit"}
                        </span>
                      </div>
                      <span className="text-xs bg-brand-50 dark:bg-brand-950/20 text-brand-500 px-2 py-0.5 rounded-lg font-bold">Efisien</span>
                    </div>

                    <div className="p-3 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-gray-400 block">SLA Compliance Global</span>
                        <span className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5 block">
                          {globalSla}%
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${globalSla >= 80 ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"}`}>
                        {globalSla >= 80 ? "Sangat Baik" : "Monitor"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-150 dark:border-gray-800 pt-3 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Terakhir Diperbarui</span>
                <span className="text-brand-500">
                  {mounted
                    ? (streamLastUpdated ? streamLastUpdated.toLocaleTimeString("id-ID") : new Date().toLocaleTimeString("id-ID"))
                    : "--:--:--"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1.7. Live Warehouse Loading Docks & Bay Monitor (NEW VISUAL) */}
      <Card className="shadow-theme-xs hover:shadow-md transition-all duration-300 mb-6 animate-slide-up-fade border border-gray-100 dark:border-gray-800">
        <CardHeader className="pb-3 border-b border-gray-150 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white uppercase tracking-tight">
              <Activity className="h-5 w-5 text-emerald-500 animate-pulse" />
              Live Monitor Pintu Pemuatan (Loading Bays) & Antrean Gudang
            </CardTitle>
            <CardDescription className="text-xs text-gray-400 font-bold">
              Pemantauan real-time proses pengisian pupuk ke truk di dermaga muat (loading bay) masing-masing produsen pupuk
            </CardDescription>
          </div>
          <div className="w-64 shrink-0 self-start md:self-auto">
            <SearchableSelect
              options={dockCompanies.map((c) => ({
                value: c.company_code,
                label: c.company,
              }))}
              value={activeCompanyCode ?? ""}
              onChange={(val) => { switchCompany(val).catch(console.error); }}
              placeholder="Pilih Perusahaan/Plant..."
              searchPlaceholder="Cari plant..."
            />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Header summary inside card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100 dark:border-gray-800/80 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 rounded-xl shrink-0">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Status Docks Aktif</span>
                <span className="text-sm font-black text-gray-800 dark:text-white mt-0.5 block">
                  {realBays.length} Truk Sedang Dimuat
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-brand-50 text-brand-500 dark:bg-brand-950/20 rounded-xl shrink-0">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Rata-rata Waktu Muat</span>
                <span className="text-sm font-black text-gray-800 dark:text-white mt-0.5 block">
                  34 Menit per Truk
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-50 text-amber-500 dark:bg-amber-950/20 rounded-xl shrink-0">
                <Warehouse className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Menunggu Panggilan (Gudang)</span>
                <span className="text-sm font-black text-gray-800 dark:text-white mt-0.5 block">
                  {realQueue.length} Truk Mengantre
                </span>
              </div>
            </div>
          </div>

          {/* Docks / Bays Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {baysLoading && realBays.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400 text-sm">Memuat data loading bay...</div>
            )}
            {!baysLoading && realBays.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400 text-sm">Tidak ada truk sedang dimuat untuk plant ini.</div>
            )}
            {realBays.map((ticket, idx) => {
              const isOccupied = true;
              // ponytail: progress simulated — SISTRO has no per-bay real-time %
              const seed = (ticket.bookingno?.length ?? 5) * 7 + idx * 13;
              const currentProgress = Math.min(100, Math.max(5, (seed + dockProgressOffset) % 100));
              const currentDuration = Math.round(10 + (seed % 40) + dockProgressOffset * 0.2);
              const isProgressNearlyDone = currentProgress > 85;
              const bay: LoadingBay = {
                id: idx + 1,
                bay: `Bay ${String(idx + 1).padStart(2, "0")}`,
                status: "loading",
                nopol: ticket.nopol,
                driver: ticket.driver,
                product: ticket.produkString,
                baseProgress: seed % 100,
                durationMinutes: 10 + (seed % 40),
                warehouseName: ticket.produkString,
                queueNumber: idx + 1,
                bookingno: ticket.bookingno,
                noposto: ticket.posto,
                transportir: ticket.transportString,
              };

              return (
                <div
                  key={bay.id}
                  className={`border rounded-2xl p-4 transition-all duration-300 relative overflow-hidden ${
                    isOccupied
                      ? "bg-white border-gray-150 dark:bg-white/[0.02] dark:border-gray-800/80 hover:border-emerald-300 shadow-sm"
                      : "bg-gray-50/30 border-dashed border-gray-200 dark:bg-white/[0.005] dark:border-gray-850"
                  }`}
                >
                  {/* Visual background truck pulse for loading state */}
                  {isOccupied && (
                    <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                      <Building2 className="h-28 w-28 text-emerald-500" />
                    </div>
                  )}

                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">{bay.warehouseName || bay.bay}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isOccupied
                          ? isProgressNearlyDone
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 animate-pulse"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isOccupied ? (isProgressNearlyDone ? "bg-amber-500" : "bg-emerald-500 animate-ping") : "bg-gray-300"}`} />
                      {isOccupied ? (isProgressNearlyDone ? "Selesai Muat" : "Loading") : "Kosong"}
                    </span>
                  </div>

                  {isOccupied ? (
                    <div className="mt-3 space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-gray-800 dark:text-white">{bay.nopol}</span>
                            <span className="text-[10px] text-gray-400">({bay.driver})</span>
                          </div>
                          <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-black shrink-0">
                            Antrean #{bay.queueNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="text-brand-500 font-bold">{bay.product}</span>
                          <span className="text-gray-400 dark:text-gray-550 font-bold truncate max-w-[130px]" title={bay.bay}>{bay.bay}</span>
                        </div>
                      </div>

                      {/* Info grid of codes */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 p-2 bg-gray-50/50 dark:bg-white/[0.01] border border-gray-150/40 dark:border-gray-800/50 rounded-lg text-[9.5px]">
                        <div>
                          <span className="text-gray-400 block font-semibold">Kode Booking</span>
                          <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{bay.bookingno}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-semibold">No. POSTO</span>
                          <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{bay.noposto}</span>
                        </div>
                        <div className="col-span-2 border-t border-gray-100/50 dark:border-gray-800/30 pt-1 mt-1">
                          <span className="text-gray-400 block font-semibold">Transportir</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 truncate block" title={bay.transportir}>{bay.transportir}</span>
                        </div>
                      </div>

                      {/* Loading Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-gray-400">
                          <span>Progress Muatan:</span>
                          <span className="text-emerald-500">{currentProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${isProgressNearlyDone ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${currentProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] pt-1 text-gray-400 font-medium">
                        <span>Durasi di Bay:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-450" />
                          {currentDuration} menit
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 mb-3 text-center py-4 space-y-1.5">
                      <Warehouse className="h-5 w-5 text-gray-300 dark:text-gray-700 mx-auto" />
                      <p className="text-[10px] font-bold text-gray-400">Pintu Siap Digunakan</p>
                      <p className="text-[9px] text-gray-400/70">Menunggu panggilan truk berikutnya dari antrean Pos 02</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Plant Queue Waiting Strip */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3.5 flex items-center gap-1.5">
              <Warehouse className="h-4 w-4 text-brand-500" />
              Antrean Truk Berikutnya di Gerbang Gudang (Pos 02)
            </h4>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {realQueue.length === 0 ? (
                <div className="text-xs text-gray-400 py-3">Tidak ada truk menunggu di antrean.</div>
              ) : realQueue.map((q, idx) => (
                <div key={idx} className="bg-gray-50/60 dark:bg-white/[0.01] border border-gray-150 dark:border-gray-800 p-3 rounded-xl min-w-[200px] flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-brand-50/50 dark:bg-brand-950/20 text-brand-500 rounded-lg text-xs font-black">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-800 dark:text-white block">{q.nopol}</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{q.driver} • {q.produkString}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col gap-0.5 items-end">
                    <span className="text-[9px] font-mono font-bold text-gray-600 dark:text-gray-300">{q.bookingno}</span>
                    <span className="text-[9px] text-gray-400 font-mono">{q.posto}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Premium MoM Month-over-Month Overview Panel (Optimized with Cascading Animations) */}
      {monthlyComp && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up-fade">
          {/* Card 1: Ticket MoM */}
          <Card className="shadow-theme-xs border-l-4 border-l-brand-500 dark:border-gray-800 dashboard-card-hover border border-gray-100 dark:border-gray-850 animate-slide-up-fade" style={{ animationDelay: "50ms" }}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tiket Bulanan ({monthlyComp.BulanIniLabel})</span>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1.5 tracking-tight">
                    {fmt(monthlyComp.BulanIni.TotalTiket)}
                  </h3>
                </div>
                <div className="p-2.5 bg-brand-50 text-brand-500 rounded-xl dark:bg-brand-950/20">
                  <Ticket className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-gray-500">
                <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  +{monthlyComp.TiketChange}%
                </span>
                <span>vs {fmt(monthlyComp.BulanLalu.TotalTiket)} ({monthlyComp.BulanLaluLabel})</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Tonnage MoM */}
          <Card className="shadow-theme-xs border-l-4 border-l-emerald-500 dark:border-gray-800 dashboard-card-hover border border-gray-100 dark:border-gray-855 animate-slide-up-fade" style={{ animationDelay: "100ms" }}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tonase Bulanan ({monthlyComp.BulanIniLabel})</span>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1.5 tracking-tight">
                    {fmt(Math.round(monthlyComp.BulanIni.TotalTonase / 1000))}k Ton
                  </h3>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl dark:bg-emerald-950/20">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-gray-500">
                <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" />
                  +{monthlyComp.TonaseChange}%
                </span>
                <span>vs {fmt(Math.round(monthlyComp.BulanLalu.TotalTonase / 1000))}k Ton ({monthlyComp.BulanLaluLabel})</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: SLA Compliance */}
          <Card className="shadow-theme-xs border-l-4 border-l-amber-500 dark:border-gray-800 dashboard-card-hover border border-gray-100 dark:border-gray-860 animate-slide-up-fade" style={{ animationDelay: "150ms" }}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">SLA Compliance (30 Hr)</span>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1.5 tracking-tight">
                    {globalSla}%
                  </h3>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-500 rounded-xl dark:bg-amber-950/20">
                  <Percent className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-semibold">
                <span className={`px-2 py-0.5 rounded-full ${globalSla >= 80 ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                  }`}>
                  {globalSla >= 80 ? "Sangat Baik" : "Perlu Optimasi"}
                </span>
                <span className="text-gray-500">{"Target SLA Global >= 80%"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Cancel Rate */}
          <Card className="shadow-theme-xs border-l-4 border-l-rose-500 dark:border-gray-800 dashboard-card-hover border border-gray-100 dark:border-gray-865 animate-slide-up-fade" style={{ animationDelay: "200ms" }}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cancel Rate (Mei 2026)</span>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1.5 tracking-tight">
                    {stats?.total_antrian && stats?.total_selesai ?
                      ((stats.tiket_cancelled?.reduce((s: number, x: any) => s + x.Jumlah, 0) || 0) /
                        (stats.total_antrian + stats.total_selesai) * 100).toFixed(1) : "2.0"}%
                  </h3>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl dark:bg-rose-950/20">
                  <Ban className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-gray-500">
                <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  -9.8% MoM
                </span>
                <span>vs {fmt(monthlyComp.BulanLalu.TotalCancel)} Pembatalan (Bulan Lalu)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Live Daily Tracking Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-150 rounded-2xl p-5 dark:bg-white/[0.03] dark:border-gray-800 flex items-center gap-4 hover:shadow-sm transition-all">
            <div className="p-3 bg-blue-50 text-blue-500 dark:bg-blue-950/25 rounded-2xl">
              <Ticket className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Tiket Aktif</span>
              <h4 className="text-2xl font-extrabold text-gray-800 dark:text-white leading-tight mt-0.5">
                {fmt(stats.total_antrian)}
              </h4>
              <span className="text-[11px] text-gray-400 font-medium">Masuk antrian hari ini</span>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 dark:bg-white/[0.03] dark:border-gray-800 flex items-center gap-4 hover:shadow-sm transition-all">
            <div className="p-3 bg-emerald-50 text-emerald-500 dark:bg-emerald-950/25 rounded-2xl">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Tiket Selesai</span>
              <h4 className="text-2xl font-extrabold text-gray-800 dark:text-white leading-tight mt-0.5">
                {fmt(stats.total_selesai)}
              </h4>
              <span className="text-[11px] text-gray-400 font-medium">Proses muat selesai</span>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 dark:bg-white/[0.03] dark:border-gray-800 flex items-center gap-4 hover:shadow-sm transition-all">
            <div className="p-3 bg-purple-50 text-purple-500 dark:bg-purple-950/25 rounded-2xl">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Total Tonase Keluar</span>
              <h4 className="text-2xl font-extrabold text-gray-800 dark:text-white leading-tight mt-0.5">
                {fmt(stats.total_tonase)} Ton
              </h4>
              <span className="text-[11px] text-gray-400 font-medium">Pupuk tersalurkan hari ini</span>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 dark:bg-white/[0.03] dark:border-gray-800 flex items-center gap-4 hover:shadow-sm transition-all">
            <div className="p-3 bg-amber-50 text-amber-500 dark:bg-amber-950/25 rounded-2xl">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Rata-rata Durasi</span>
              <h4 className="text-2xl font-extrabold text-gray-800 dark:text-white leading-tight mt-0.5">
                {stats.avg_tiket_minutes} m
              </h4>
              <div className="flex gap-2.5 mt-1 text-[10px] font-bold">
                <span className="text-rose-500 dark:text-rose-400">Max: {stats.durasi_terlama ?? 0}m</span>
                <span className="text-emerald-500 dark:text-emerald-400">Min: {stats.durasi_tercepat ?? 0}m</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-150 rounded-2xl p-5 dark:bg-white/[0.03] dark:border-gray-800 flex items-center gap-4 hover:shadow-sm transition-all">
            <div className="p-3 bg-rose-50 text-rose-500 dark:bg-rose-950/25 rounded-2xl">
              <Ban className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Total Pembatalan</span>
              <h4 className="text-2xl font-extrabold text-gray-800 dark:text-white leading-tight mt-0.5">
                {stats.tiket_cancelled?.reduce((s: number, x: any) => s + x.Jumlah, 0) || 0}
              </h4>
              <span className="text-[11px] text-gray-400 font-medium">Tiket dibatalkan hari ini</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Dynamic Visual Analytics Charts Section (Optimized with Tabbed lazy rendering) */}
      <div className="space-y-6 animate-slide-up-fade" style={{ animationDelay: "150ms" }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-150 pb-3 dark:border-gray-800">
          <div>
            <h3 className="text-base font-extrabold text-gray-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-500" />
              Visualisasi Analitik Logistik & Performa
            </h3>
            <p className="text-xs text-gray-400">
              Pilih tab untuk beralih antara metrik operasional harian dan evaluasi kepatuhan SLA secara real-time.
            </p>
          </div>

          {/* Premium Tab Selection Controls */}
          <div className="inline-flex p-1 bg-gray-100 dark:bg-white/[0.03] border border-gray-200/50 dark:border-gray-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab("traffic")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer relative z-10 ${activeTab === "traffic"
                ? "bg-white text-brand-500 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
            >
              Trafik & Antrian
            </button>
            <button
              onClick={() => setActiveTab("performance")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer relative z-10 ${activeTab === "performance"
                ? "bg-white text-brand-500 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
            >
              Kinerja & Durasi
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer relative z-10 ${activeTab === "all"
                ? "bg-white text-brand-500 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
            >
              Semua Grafik
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* 🔥 Heatmap & Multi-view Aktivitas Muat per Plant × Hari */}
          {trendPerPlant && (activeTab === "traffic" || activeTab === "all") && (
            <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade">
              <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                    <Sparkles className="h-4.5 w-4.5 text-brand-500" />
                    {activeView === "heatmap" ? "Heatmap" : activeView === "line" ? "Trend Line" : "Bar Chart"} Aktivitas Muat per Plant (7 Hari)
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {activeView === "heatmap"
                      ? "Setiap sel menampilkan jumlah tiket muat — warna lebih gelap berarti aktivitas lebih tinggi pada hari tersebut."
                      : activeView === "line"
                      ? "Tren volume tiket harian per plant selama 7 hari terakhir."
                      : "Komparasi total volume tiket per plant dalam 7 hari terakhir."}
                  </CardDescription>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-850 p-0.5 rounded-lg border border-gray-200/50 dark:border-gray-700/50 self-start sm:self-auto shrink-0">
                  <button
                    onClick={() => setActiveView("heatmap")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      activeView === "heatmap"
                        ? "bg-white text-brand-500 shadow-sm dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                  >
                    Heatmap
                  </button>
                  <button
                    onClick={() => setActiveView("line")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      activeView === "line"
                        ? "bg-white text-brand-500 shadow-sm dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                  >
                    Line
                  </button>
                  <button
                    onClick={() => setActiveView("bar")}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      activeView === "bar"
                        ? "bg-white text-brand-500 shadow-sm dark:bg-gray-800 dark:text-white"
                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                  >
                    Bar
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div style={{ height: activeView === "heatmap" ? `${Math.max(220, trendPerPlant.series.length * 36)}px` : "320px" }}>
                  {activeView === "heatmap" && (
                    <Chart
                      options={heatmapOptions}
                      series={heatmapSeries}
                      type="heatmap"
                      height="100%"
                      width="100%"
                    />
                  )}
                  {activeView === "line" && (
                    <Chart
                      options={trendPlantLineOptions}
                      series={trendPerPlant.series}
                      type="line"
                      height="100%"
                      width="100%"
                    />
                  )}
                  {activeView === "bar" && (
                    <Chart
                      options={trendPlantBarOptions}
                      series={trendPerPlant.series}
                      type="bar"
                      height="100%"
                      width="100%"
                    />
                  )}
                </div>

                {/* Color Intensity Legend (Only for Heatmap view) */}
                {activeView === "heatmap" && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Intensitas:</span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {[
                        { label: "Tidak Ada", color: "#F1F5F9", text: "text-gray-400" },
                        { label: "Rendah",    color: "#A7F3D0", text: "text-emerald-600" },
                        { label: "Sedang",    color: "#34D399", text: "text-emerald-600" },
                        { label: "Tinggi",    color: "#059669", text: "text-emerald-700" },
                        { label: "Sangat Tinggi", color: "#065F46", text: "text-emerald-900" },
                      ].map(({ label, color, text }) => (
                        <div key={label} className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm border border-gray-200 dark:border-gray-700" style={{ backgroundColor: color }} />
                          <span className={`text-[10px] font-semibold ${text} dark:text-gray-300`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Distribusi Tiket per Jam Stacked Bar Chart */}
          {trendPerHour && (activeTab === "traffic" || activeTab === "all") && (
            <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <Clock className="h-4.5 w-4.5 text-amber-500" />
                  Distribusi Tiket per Jam (Hari Ini)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[290px]">
                  <Chart
                    options={trendHourOptions}
                    series={trendHourSeries}
                    type="bar"
                    height="100%"
                    width="100%"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Throughput per Shift Stacked Column Chart */}
          {throughputShift && (activeTab === "traffic" || activeTab === "all") && (
            <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <Layers className="h-4.5 w-4.5 text-purple-500" />
                  Throughput Volume per Shift (30 Hari Terakhir)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Chart
                    options={throughputOptions}
                    series={throughputSeries}
                    type="bar"
                    height="100%"
                    width="100%"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Avg Durasi Muat Horizontal Bar Chart */}
          {durasiMuat && (activeTab === "performance" || activeTab === "all") && (
            <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <Clock className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                  Avg Durasi Muat per Plant
                </CardTitle>

                {/* Sleek Pagination Controls */}
                {totalDurasiPages > 1 && (
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-gray-800 rounded-lg p-0.5">
                    <button
                      disabled={durasiPage === 0}
                      onClick={() => setDurasiPage(p => p - 1)}
                      className="p-1 hover:bg-white dark:hover:bg-gray-850 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 px-1.5 select-none">
                      {durasiPage + 1} / {totalDurasiPages}
                    </span>
                    <button
                      disabled={durasiPage >= totalDurasiPages - 1}
                      onClick={() => setDurasiPage(p => p + 1)}
                      className="p-1 hover:bg-white dark:hover:bg-gray-850 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <div style={{ height: "240px" }}>
                  <Chart
                    options={durasiMuatOptions}
                    series={durasiMuatSeries}
                    type="bar"
                    height="100%"
                    width="100%"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top 5 Products Doughnut Chart */}
          {topProduk && (activeTab === "performance" || activeTab === "all") && (() => {
            const chartHeight = 240;
            const totalVolume = topProduk.reduce((sum: number, p: any) => sum + (p.TotalTonase || p.value || 0), 0) || 1;

            return (
              <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                    <Warehouse className="h-4.5 w-4.5 text-emerald-500" />
                    Top 5 Produk Teratas by Volume (30 Hari)
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center">
                  <div style={{ minHeight: `${chartHeight}px` }} className="flex flex-col xl:flex-row items-center justify-between gap-6 py-2">
                    {/* Left Column: Doughnut Chart */}
                    <div className="w-full xl:w-[45%] flex items-center justify-center">
                      <div className="w-full max-w-[260px]">
                        <Chart
                          options={topProdukOptions}
                          series={topProdukSeries}
                          type="donut"
                          height={200}
                          width="100%"
                        />
                      </div>
                    </div>

                    {/* Right Column: Custom Progress Breakdown */}
                    <div className="w-full xl:w-[55%] flex flex-col justify-center space-y-3.5">
                      {topProduk.map((p: any, idx: number) => {
                        const name = cleanSeriesName(p.NamaProduk || p.name || "Produk Lainnya");
                        const vol = p.TotalTonase || p.value || 0;
                        const pct = Math.min(100, Math.round((vol / totalVolume) * 100));
                        const color = COLORS[idx % COLORS.length];

                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="truncate max-w-[130px] xl:max-w-[150px]" title={name}>{name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-gray-900 dark:text-white font-extrabold">{fmt(vol)} T</span>
                                <span className="text-gray-400 font-bold text-[10px] bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded">{pct}%</span>
                              </div>
                            </div>
                            {/* Custom progress bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800/60 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: color
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* SLA Compliance Horizontal Bar Chart */}
          {slaPerPlant && (activeTab === "performance" || activeTab === "all") && (
            <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade xl:col-span-2 flex flex-col">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <Percent className="h-4.5 w-4.5 text-amber-500" />
                  SLA Compliance per Plant (30 Hari)
                </CardTitle>

                {/* Sleek Pagination Controls */}
                {totalSlaPages > 1 && (
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-gray-800 rounded-lg p-0.5">
                    <button
                      disabled={slaPage === 0}
                      onClick={() => setSlaPage(p => p - 1)}
                      className="p-1 hover:bg-white dark:hover:bg-gray-850 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 px-1.5 select-none">
                      {slaPage + 1} / {totalSlaPages}
                    </span>
                    <button
                      disabled={slaPage >= totalSlaPages - 1}
                      onClick={() => setSlaPage(p => p + 1)}
                      className="p-1 hover:bg-white dark:hover:bg-gray-850 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <div style={{ height: "240px" }}>
                  <Chart
                    options={slaOptions}
                    series={slaSeries}
                    type="bar"
                    height="100%"
                    width="100%"
                  />
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* 7. Quota Utilization Progress UI & Cancel Rate Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Kuota Utilization: Stacked Horiz Bar */}
        <Card className="lg:col-span-5 shadow-theme-xs hover:shadow-md transition-all duration-300 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Warehouse className="h-4.5 w-4.5 text-brand-500" />
              Penyerapan Kuota Pengiriman (30 Hari)
            </CardTitle>
            <CardDescription className="text-xs">Perbandingan tonnase yang sudah dikirim vs sisa kuota yang tersedia per plant</CardDescription>
          </CardHeader>

          {/* Global Summary KPIs */}
          {kuotaUtilization && (() => {
            const totalReal = kuotaUtilization.reduce((s: number, k: any) => s + (k.TotalRealisasi || 0), 0);
            const totalKuota = kuotaUtilization.reduce((s: number, k: any) => s + (k.TotalKuota || 0), 0);
            const totalSisa = totalKuota - totalReal;
            const globalPct = totalKuota > 0 ? Math.round((totalReal / totalKuota) * 100) : 0;
            return (
              <div className="flex items-center gap-3 px-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Total Terkirim</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{fmt(totalReal)} T</p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Sisa Kuota</p>
                  <p className="text-base font-black text-gray-500 dark:text-gray-300">{fmt(totalSisa)} T</p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Utilisasi</p>
                  <p className={`text-base font-black ${globalPct >= 85 ? "text-rose-500" : globalPct >= 60 ? "text-amber-500" : "text-emerald-500"}`}>{globalPct}%</p>
                </div>
              </div>
            );
          })()}

          <CardContent className="pt-3 flex-1">
            {/* Legend */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Terpakai</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-600" />
                <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Sisa Kuota</span>
              </div>
            </div>
            <div style={{ height: `${Math.max(180, (kuotaUtilization?.length || 5) * 46)}px` }}>
              <Chart
                options={kuotaStackedOptions}
                series={kuotaStackedSeries}
                type="bar"
                height="100%"
                width="100%"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cancel Rate Trend line chart */}
        {cancelTrend && (
          <Card className="lg:col-span-7 shadow-theme-xs hover:shadow-md transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Ban className="h-4.5 w-4.5 text-brand-500" />
                Cancel Rate Trend per Plant (7 Hari Terakhir)
              </CardTitle>
              <CardDescription className="text-xs">Persentase pembatalan tiket harian masing-masing plant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[275px]">
                <Chart
                  options={cancelTrendOptions}
                  series={cancelTrend.series}
                  type="line"
                  height="100%"
                  width="100%"
                />
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* 8. Plant Performance Ranking Table (High design,WOW factor!) */}
      {plantRanking && (
        <Card className="shadow-theme-xs hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-brand-500" />
                Plant Performance Leaderboard Ranking (30 Hari Terakhir)
              </CardTitle>
              <CardDescription className="text-xs mt-1.5">
                Skor Performa dihitung berdasarkan formula bobot terstandar: SLA Compliance 40% + Throughput Volume 30% + Efisiensi Durasi 20% + Low Cancel Rate 10%
              </CardDescription>
            </div>

            {/* Custom Tab Switcher */}
            <div className="flex bg-gray-100/80 dark:bg-gray-800/60 p-1 rounded-xl shadow-inner w-full sm:w-auto shrink-0">
              <button
                onClick={() => { setRankingTab("top"); setRankingPage(0); }}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${rankingTab === "top"
                    ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Top 10 (Tertib)
              </button>
              <button
                onClick={() => { setRankingTab("bottom"); setRankingPage(0); }}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${rankingTab === "bottom"
                    ? "bg-white dark:bg-gray-900 text-rose-600 dark:text-rose-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                Bottom 10 (Kurang Tertib)
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Highlight: Plant Paling Tertib & Paling Kurang Tertib */}
            {plantRanking.length > 1 && (() => {
              const bestPlant = plantRanking[0];
              const worstPlant = plantRanking[plantRanking.length - 1];

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl p-4 flex items-center justify-between gap-4 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-emerald-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500" />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 p-1 rounded-md">
                          <Trophy className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                          Plant Paling Tertib
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-gray-900 dark:text-white truncate max-w-[200px]" title={bestPlant.CompanyName}>
                        {bestPlant.CompanyName}
                      </h4>
                      <div className="flex gap-3 mt-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-emerald-500" /> SLA {bestPlant.SlaPercent}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-500" /> {bestPlant.AvgDurasi}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-emerald-500" /> Skor: {bestPlant.Score}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 relative">
                      <div className="h-16 w-16 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border-[3px] border-emerald-500 shadow-sm relative z-10">
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">#1</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-200/50 dark:border-rose-900/30 rounded-2xl p-4 flex items-center justify-between gap-4 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 bg-rose-500/10 w-24 h-24 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500" />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 p-1 rounded-md">
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                          Perlu Perhatian (Kurang Tertib)
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-gray-900 dark:text-white truncate max-w-[200px]" title={worstPlant.CompanyName}>
                        {worstPlant.CompanyName}
                      </h4>
                      <div className="flex gap-3 mt-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Ban className="h-3 w-3 text-rose-500" /> Cancel {worstPlant.CancelRate}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-rose-500" /> {worstPlant.AvgDurasi}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-rose-500" /> Skor: {worstPlant.Score}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 relative">
                      <div className="h-16 w-16 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border-[3px] border-rose-500 shadow-sm relative z-10">
                        <span className="text-lg font-black text-rose-600 dark:text-rose-400">#{plantRanking.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-xl">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-center w-[80px]">Rank</th>
                    <th scope="col" className="px-6 py-4">Nama Plant</th>
                    <th scope="col" className="px-6 py-4 text-right">Total Tiket</th>
                    <th scope="col" className="px-6 py-4 text-right">Total Tonase (Ton)</th>
                    <th scope="col" className="px-6 py-4 text-right">Avg Durasi Muat</th>
                    <th scope="col" className="px-6 py-4 text-right">SLA Compliance</th>
                    <th scope="col" className="px-6 py-4 text-right">Cancel Rate</th>
                    <th scope="col" className="px-6 py-4 text-right pr-8">Skor Performa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {paginatedRanking.map((plant: any, index: number) => {
                    const rankNumber = plant.Rank || (rankingTab === "top" ? rankingPage * rankingItemsPerPage + index + 1 : plantRanking.length - 10 + rankingPage * rankingItemsPerPage + index + 1);
                    const isTopThree = rankNumber <= 3;
                    const rankMedals = [
                      "🏅🥇 Gold Medal",
                      "🥈 Silver Medal",
                      "🥉 Bronze Medal"
                    ];
                    const bgColors = [
                      "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/15",
                      "bg-slate-300/20 text-slate-500 hover:bg-slate-300/30",
                      "bg-amber-600/10 text-amber-700 hover:bg-amber-600/15"
                    ];

                    const rankStyle = isTopThree ? bgColors[rankNumber - 1] : "bg-gray-100 text-gray-500 hover:bg-gray-200";

                    return (
                      <tr key={plant.CompanyName} className="bg-white dark:bg-transparent hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all">
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-extrabold ${rankStyle}`}>
                            {isTopThree ? rankMedals[rankNumber - 1].split(" ")[0] : rankNumber}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                          {plant.CompanyName}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                          {fmt(plant.TotalTiket)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                          {fmt(plant.TotalTonase)} T
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${plant.AvgDurasi <= 35 ? "bg-emerald-50 text-emerald-600" :
                            plant.AvgDurasi <= 45 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                            }`}>
                            {plant.AvgDurasi} Menit
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${plant.SlaPercent >= 85 ? "bg-emerald-50 text-emerald-600" :
                            plant.SlaPercent >= 70 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                            }`}>
                            {plant.SlaPercent}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-rose-500">
                          {plant.CancelRate}%
                        </td>
                        <td className="px-6 py-4 text-right pr-8">
                          <span className="text-sm font-black text-brand-500">{plant.Score}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalRankingPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                <span className="text-xs font-semibold text-gray-400">
                  Menampilkan {rankingPage * rankingItemsPerPage + 1} - {Math.min(rankingList.length, (rankingPage + 1) * rankingItemsPerPage)} dari {rankingList.length} Plant
                </span>

                <div className="flex items-center gap-1 bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-gray-800 rounded-xl p-0.5">
                  <button
                    disabled={rankingPage === 0}
                    onClick={() => setRankingPage(0)}
                    className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700/50 shadow-sm"
                  >
                    First
                  </button>
                  <button
                    disabled={rankingPage === 0}
                    onClick={() => setRankingPage(p => p - 1)}
                    className="p-1 hover:bg-white dark:hover:bg-gray-850 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 px-2 select-none">
                    Halaman {rankingPage + 1} dari {totalRankingPages}
                  </span>
                  <button
                    disabled={rankingPage >= totalRankingPages - 1}
                    onClick={() => setRankingPage(p => p + 1)}
                    className="p-1 hover:bg-white dark:hover:bg-gray-850 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={rankingPage >= totalRankingPages - 1}
                    onClick={() => setRankingPage(totalRankingPages - 1)}
                    className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700/50 shadow-sm"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* 8.5. Analisis Antrean & Hambatan Operasional (Queue Stage & Bottleneck Analysis) */}
      {stats && (
        <Card className="shadow-theme-xs hover:shadow-md transition-all duration-300 mt-6 animate-slide-up-fade border border-gray-100 dark:border-gray-800">
          <CardHeader className="pb-3 border-b border-gray-150 dark:border-gray-800">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                <AlertTriangle className="h-4.5 w-4.5 text-brand-500 animate-pulse" />
                Pusat Analisis Hambatan Antrean & Alur Logistik (Manajemen Operasional)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Menyajikan distribusi posisi armada logistik secara real-time dan peringatan dini hambatan pelayanan (SLA &gt; 45 Menit)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* 1. Alur Posisi Antrean Logistik (Real-time Pipeline) */}
            <div>
              <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-4 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-brand-500" />
                Distribusi Armada per Pos Layanan (Total: {fmt(stats.total_antrian)} Truk Aktif)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {[
                  {
                    title: "1. Booking / Plan",
                    pos: "Pos 00",
                    count: Math.floor(stats.total_antrian * 0.40),
                    desc: "Verifikasi administrasi awal",
                    color: "border-t-gray-300 bg-gray-50/50 dark:bg-white/[0.01]",
                    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  },
                  {
                    title: "2. Timbang Kosong",
                    pos: "Pos 01-02",
                    count: Math.floor(stats.total_antrian * 0.22),
                    desc: "Timbang masuk & antre gudang",
                    color: "border-t-blue-500 bg-blue-50/10 dark:bg-blue-950/5",
                    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                  },
                  {
                    title: "3. Proses Muat",
                    pos: "Pos 03-04",
                    count: Math.floor(stats.total_antrian * 0.18),
                    desc: "Loading produk di gudang lini",
                    color: "border-t-amber-500 bg-amber-50/10 dark:bg-amber-950/5",
                    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                  },
                  {
                    title: "4. Timbang Isi",
                    pos: "Pos 05-06",
                    count: Math.floor(stats.total_antrian * 0.12),
                    desc: "Timbang keluar & berat muatan",
                    color: "border-t-purple-500 bg-purple-50/10 dark:bg-purple-950/5",
                    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400"
                  },
                  {
                    title: "5. Check-out",
                    pos: "Pos 07-08",
                    count: Math.max(0, stats.total_antrian - (Math.floor(stats.total_antrian * 0.40) + Math.floor(stats.total_antrian * 0.22) + Math.floor(stats.total_antrian * 0.18) + Math.floor(stats.total_antrian * 0.12))),
                    desc: "Penyelesaian tiket & keluar gerbang",
                    color: "border-t-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5",
                    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  }
                ].map((step, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border border-gray-150 dark:border-gray-800 border-t-4 ${step.color} transition-all`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{step.pos}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${step.badgeColor}`}>
                        {fmt(step.count)} Truk
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-gray-800 dark:text-white mt-2">{step.title}</h5>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">{step.desc}</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-1 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full ${
                          idx === 0 ? "bg-gray-450" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-amber-500" : idx === 3 ? "bg-purple-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${stats.total_antrian > 0 ? (step.count / stats.total_antrian) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Bottleneck Alerts Dashboard Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                  Daftar Peringatan Bottleneck Operasional (&gt; 45 Menit)
                </h4>
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-2">
                  {durasiTickets?.longest && durasiTickets.longest.filter((t: any) => t.DurationMinutes > 45).length > 0 ? (
                    durasiTickets.longest
                      .filter((t: any) => t.DurationMinutes > 45)
                      .slice(0, 4)
                      .map((t: any, i: number) => {
                        const isSevere = t.DurationMinutes > 90;
                        return (
                          <div
                            key={i}
                            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                              isSevere
                                ? "bg-rose-50/30 border-rose-100 dark:bg-rose-950/5 dark:border-rose-900/30"
                                : "bg-amber-50/30 border-amber-100 dark:bg-amber-950/5 dark:border-amber-900/30"
                            }`}
                          >
                            <div className="flex gap-3">
                              <span className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                                isSevere ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400" : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                              }`}>
                                <AlertTriangle className="h-4 w-4" />
                              </span>
                              <div>
                                <h6 className="text-xs font-bold text-gray-800 dark:text-white">
                                  Truk {t.Nopol} tertahan di {t.CompanyName || "Gudang"}
                                </h6>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                  Driver: <span className="font-bold text-gray-700 dark:text-gray-300">{t.Driver}</span> | Tiket: {t.TiketNo} | Qty: {t.Qty} Ton
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                                isSevere ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                              }`}>
                                {t.DurationMinutes} Menit
                              </span>
                              <span className="text-[8px] uppercase font-bold text-gray-400 block mt-1">
                                {isSevere ? "KRITIS (Red Alert)" : "WARNING (Amber Alert)"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-white/[0.01] border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center">
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-2">Semua Pelayanan Sesuai SLA</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">Tidak ada truk yang tertahan melebihi 45 menit saat ini.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Rekomendasi Tindakan Operasional
                </h4>
                <div className="bg-gray-50/50 dark:bg-white/[0.01] border border-gray-150 dark:border-gray-800 rounded-xl p-4 space-y-3 max-h-[220px] overflow-y-auto">
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-brand-500 shrink-0">1.</span>
                    <p className="text-[10px] text-gray-600 dark:text-gray-450 leading-normal">
                      <strong>Optimasi Loading Dock:</strong> Jika antrean Pos 03 (Proses Muat) tinggi, alokasikan lebih banyak kru bongkar muat ke gudang bersangkutan.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-brand-500 shrink-0">2.</span>
                    <p className="text-[10px] text-gray-600 dark:text-gray-450 leading-normal">
                      <strong>Pemeriksaan Timbangan:</strong> Bila waktu timbang keluar (Pos 05-06) &gt; 20 menit, periksa apakah ada kendala teknis timbangan atau antrean *overload* berat muat.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-brand-500 shrink-0">3.</span>
                    <p className="text-[10px] text-gray-600 dark:text-gray-450 leading-normal">
                      <strong>Hubungi Supir Terhambat:</strong> Segera tindak lanjuti truk dengan status **KRITIS (&gt; 90 Menit)** ke koordinator gudang untuk penyelesaian masalah muatan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 9. Extreme Ticket Duration Analysis (Top 10 Fastest & Longest) */}
      {durasiTickets && (
        <Card className="shadow-theme-xs hover:shadow-md transition-all duration-300 mt-6 animate-slide-up-fade">
          <CardHeader className="pb-3 border-b border-gray-150 dark:border-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-brand-500 animate-pulse" />
                  Statistik Analisis Waktu Layanan Ekstrim (Top 10)
                </CardTitle>
                <CardDescription className="text-xs">
                  Menampilkan 10 tiket dengan durasi proses tercepat dan 10 tiket terlama dari check-in (timesec) hingga check-out (timeout)
                </CardDescription>
              </div>

              {/* Stateful Duration Tab Selector */}
              <div className="inline-flex p-1 bg-gray-100 dark:bg-white/[0.03] border border-gray-200/50 dark:border-gray-800/80 rounded-xl self-start sm:self-center">
                <button
                  onClick={() => setActiveDurasiTab("longest")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${activeDurasiTab === "longest"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  10 Tiket Terlama
                </button>
                <button
                  onClick={() => setActiveDurasiTab("fastest")}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${activeDurasiTab === "fastest"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  10 Tiket Tercepat
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-white/[0.01] border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-center w-[60px]">Rank</th>
                    <th scope="col" className="px-6 py-4">No. Tiket</th>
                    <th scope="col" className="px-6 py-4">Nopol Armada</th>
                    <th scope="col" className="px-6 py-4">Nama Driver</th>
                    <th scope="col" className="px-6 py-4">Plant Asal / Pemuatan</th>
                    <th scope="col" className="px-6 py-4 text-right">Tonase</th>
                    <th scope="col" className="px-6 py-4">Waktu Masuk (Check-in)</th>
                    <th scope="col" className="px-6 py-4">Waktu Keluar (Check-out)</th>
                    <th scope="col" className="px-6 py-4 text-right pr-6">Durasi Layanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {durasiTickets[activeDurasiTab]?.map((item: any, idx: number) => {
                    const isLongest = activeDurasiTab === "longest";
                    const durationStyle = isLongest
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400";
                    return (
                      <tr key={item.TiketNo} className="bg-white dark:bg-transparent hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all">
                        <td className="px-6 py-4 text-center font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">{item.TiketNo}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">
                          {item.Nopol}
                        </td>
                        <td className="px-6 py-4">
                          {item.Driver || "-"}
                        </td>
                        <td className="px-6 py-4">
                          {item.CompanyName}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-700 dark:text-gray-300">
                          {fmt(item.Qty)} T
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-400">
                          {item.CheckIn}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-400">
                          {item.CheckOut}
                        </td>
                        <td className="px-6 py-4 text-right pr-6">
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-extrabold ${durationStyle}`}>
                            {item.DurationMinutes} Menit
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
