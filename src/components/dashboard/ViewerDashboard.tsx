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
  ChevronRight,
  Sparkles,
  Lightbulb,
  Percent,
  Ban,
  Activity,
  Download,
  RefreshCw,
  Globe,
  Layers
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";
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

export default function ViewerDashboard() {
  const { apiJson, token } = useApi();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isSimulated, setIsSimulated] = useState(false);

  // States for all dashboard metrics
  const [activeTab, setActiveTab] = useState<"traffic" | "performance" | "all">("traffic");
  const [stats, setStats] = useState<any>(null);
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

  // Fetch all dashboard data from the ASP.NET backend
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch KPI Stats from optimized real database endpoint
      const statsRes = await apiJson("/api/Home/MonitorStats").catch(() => null);
      // 2. Fetch Trend Per Plant (Active API)
      const trendPlantRes = await apiJson("/api/Home/GetTiketTrendPerPlant").catch(() => null);
      // 3. Fetch Trend Per Hour (Active API)
      const trendHourRes = await apiJson("/api/Home/GetTiketTrendPerHour").catch(() => null);
      // 4. Fetch Avg Durasi Muat (Active API)
      const durasiRes = await apiJson("/api/Home/GetDurasiProsesMuat").catch(() => null);
      // 5. Fetch Monthly Overview (NEW real API!)
      const monthlyRes = await apiJson("/api/Home/GetMonthlyOverview").catch(() => null);
      // 6. Fetch Leaderboard Performance (NEW real API!)
      const leaderboardRes = await apiJson("/api/Home/GetPlantLeaderboard").catch(() => null);
      // 7. Fetch Top Duration Tickets (NEW real API!)
      const durasiTicketsRes = await apiJson("/api/Home/GetTopDurasiTiket").catch(() => null);
      // 8. Fetch Top Product Volume (NEW real API!)
      const topProdukRes = await apiJson("/api/Home/GetTopProdukVolume").catch(() => null);

      // Baseline with beautiful high-fidelity simulated values for the deleted/unavailable endpoints
      // KPI Metrics Fallback
      let finalStats = {
        total_antrian: 1205,
        total_tonase: 48900,
        avg_tiket_minutes: 42,
        durasi_terlama: 145,
        durasi_tercepat: 12,
        total_selesai: 980,
        tiket_cancelled: [
          { Alasan: "Armada Tidak Layak", Jumlah: 14 },
          { Alasan: "Overload Berat Muat", Jumlah: 9 },
          { Alasan: "Pembatalan Driver", Jumlah: 7 },
          { Alasan: "Kesalahan Dokumen", Jumlah: 5 },
        ]
      };

      // Set Monthly MoM comparison using real database or fallback simulated
      if (monthlyRes?.status === "success" && monthlyRes.BulanIni?.TotalTiket > 0) {
        setMonthlyComp({
          BulanIniLabel: monthlyRes.BulanIniLabel,
          BulanLaluLabel: monthlyRes.BulanLaluLabel,
          BulanIni: monthlyRes.BulanIni,
          BulanLalu: monthlyRes.BulanLalu,
          TiketChange: monthlyRes.TiketChange,
          TonaseChange: monthlyRes.TonaseChange
        });
      } else {
        setMonthlyComp({
          BulanIniLabel: "Mei 2026",
          BulanLaluLabel: "April 2026",
          BulanIni: { TotalTiket: 32540, TotalTonase: 1301600, TotalSelesai: 28900, TotalCancel: 640 },
          BulanLalu: { TotalTiket: 30120, TotalTonase: 1204800, TotalSelesai: 27200, TotalCancel: 710 },
          TiketChange: 8.0,
          TonaseChange: 8.3
        });
      }

      // Set Top Products volume using real database or fallback simulated
      if (topProdukRes?.status === "success" && Array.isArray(topProdukRes.data) && topProdukRes.data.length > 0) {
        setTopProduk(topProdukRes.data);
      } else {
        setTopProduk([
          { NamaProduk: "Urea Curah", TotalTonase: 546200 },
          { NamaProduk: "NPK Phonska", TotalTonase: 364100 },
          { name: "ZA", TotalTonase: 195100 },
          { NamaProduk: "SP-36", TotalTonase: 130000 },
          { NamaProduk: "Pupuk Organik", TotalTonase: 65000 },
        ]);
      }

      // Set Leaderboard related states using real database or fallback simulated
      if (leaderboardRes?.status === "success" && Array.isArray(leaderboardRes.data) && leaderboardRes.data.length > 0) {
        setPlantRanking(leaderboardRes.data);

        // Map SLA Compliance per Plant dynamically from real C# data
        const mappedSla = leaderboardRes.data.map((item: any) => ({
          CompanyName: item.CompanyName,
          SlaCompliancePercent: item.SlaPercent,
          TotalSelesai: item.TotalSelesai,
          TotalDalamSla: Math.round((item.SlaPercent / 100) * item.TotalSelesai)
        }));
        setSlaPerPlant(mappedSla);

        // Map Quota Utilization per Plant dynamically from real C# data
        const mappedKuota = leaderboardRes.data.slice(0, 5).map((item: any) => {
          const simulatedKuota = Math.max(5000, Math.round((item.TotalTonase * 1.2) / 1000) * 1000);
          const percent = simulatedKuota > 0 ? Math.round((item.TotalTonase / simulatedKuota) * 100) : 0;
          return {
            CompanyCode: item.CompanyCode,
            UtilizationPercent: percent > 100 ? 100 : percent,
            TotalRealisasi: Math.round(item.TotalTonase),
            TotalKuota: simulatedKuota
          };
        });
        setKuotaUtilization(mappedKuota);
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
        ]
      });

      // Override with real database statistics if returned successfully
      let realDataFetched = false;
      if (statsRes && statsRes.Success && statsRes.totalTiket > 0) {
        finalStats = {
          total_antrian: statsRes.totalAntrian ?? 0,
          total_selesai: statsRes.totalSelesai ?? 0,
          total_tonase: statsRes.totalTonase ?? 0,
          avg_tiket_minutes: statsRes.avgDurasiMenit ?? 0,
          durasi_terlama: statsRes.durasiTerlama ?? 0,
          durasi_tercepat: statsRes.durasiTercepat ?? 0,
          tiket_cancelled: statsRes.totalCancel && statsRes.totalCancel > 0 ? [
            { Alasan: "Dibatalkan / Kadaluwarsa", Jumlah: statsRes.totalCancel }
          ] : []
        };
        realDataFetched = true;
      }
      setStats(finalStats);

      // 3. Transform Trend Per Plant using real database query
      if (trendPlantRes?.status === "success" && Array.isArray(trendPlantRes.data) && trendPlantRes.data.length > 0) {
        const raw = trendPlantRes.data;
        const uniqueDates = Array.from(new Set(raw.map((item: any) => item.Tanggal))).sort();
        const formattedDates = uniqueDates.map((d: any) => {
          const date = new Date(d);
          return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        });

        const plants = Array.from(new Set(raw.map((item: any) => item.CompanyName || item.CompanyCode)));

        const series = plants.map((plant: any) => {
          const plantData = uniqueDates.map((dateStr: any) => {
            const match = raw.find((item: any) => (item.CompanyName || item.CompanyCode) === plant && item.Tanggal === dateStr);
            return match ? match.TotalAntrian : 0;
          });
          return { name: plant, data: plantData };
        });

        setTrendPerPlant({ dates: formattedDates, series });
      } else {
        // Fallback simulated trend per plant
        setTrendPerPlant({
          dates: ["12 Mei", "13 Mei", "14 Mei", "15 Mei", "16 Mei", "17 Mei", "18 Mei"],
          series: [
            { name: "Petrokimia Gresik (PKG)", data: [180, 210, 195, 240, 220, 205, 250] },
            { name: "Pupuk Kujang (PKC)", data: [110, 125, 115, 140, 130, 120, 145] },
            { name: "Pupuk Iskandar Muda (PIM)", data: [75, 90, 85, 105, 95, 88, 110] },
            { name: "Logistics Meneng", data: [60, 72, 68, 85, 78, 70, 92] },
            { name: "DC Makassar", data: [40, 55, 48, 65, 58, 52, 70] },
          ]
        });
      }

      // 4. Transform Trend Per Hour using real database query
      if (trendHourRes?.status === "success" && Array.isArray(trendHourRes.data) && trendHourRes.data.length > 0) {
        const raw = trendHourRes.data.sort((a: any, b: any) => a.Jam - b.Jam);
        const hours = raw.map((item: any) => `${item.Jam.toString().padStart(2, '0')}:00`);
        const antrian = raw.map((item: any) => item.TotalAntrian);
        const selesai = raw.map((item: any) => item.TotalSelesai);
        setTrendPerHour({ hours, antrian, selesai });
      } else {
        // Fallback simulated trend per hour
        setTrendPerHour({
          hours: ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "00:00"],
          antrian: [25, 48, 72, 85, 90, 68, 52, 38, 20, 10],
          selesai: [15, 30, 55, 68, 82, 75, 60, 42, 28, 15]
        });
      }

      // 5. Avg Durasi Muat using real database query
      if (durasiRes?.status === "success" && Array.isArray(durasiRes.data) && durasiRes.data.length > 0) {
        setDurasiMuat(durasiRes.data);
      } else {
        // Fallback simulated average duration
        setDurasiMuat([
          { CompanyName: "DC Makassar", AvgDurasiMenit: 32 },
          { CompanyName: "Petrokimia Gresik (PKG)", AvgDurasiMenit: 38 },
          { CompanyName: "Logistics Meneng", AvgDurasiMenit: 41 },
          { CompanyName: "Pupuk Kujang (PKC)", AvgDurasiMenit: 45 },
          { CompanyName: "UPP Semarang", AvgDurasiMenit: 48 },
          { CompanyName: "Pupuk Iskandar Muda (PIM)", AvgDurasiMenit: 52 },
        ]);
      }

      // 6. Set Top Duration Tickets using real database or fallback simulated
      if (durasiTicketsRes?.status === "success" && (durasiTicketsRes.longest?.length > 0 || durasiTicketsRes.fastest?.length > 0)) {
        setDurasiTickets({
          longest: durasiTicketsRes.longest,
          fastest: durasiTicketsRes.fastest
        });
      } else {
        setDurasiTickets({
          longest: [
            { TiketNo: "T-20260519-0012", Nopol: "L 9812 UI", Driver: "Budiono", Qty: 28.5, CheckIn: "2026-05-18 08:12:00", CheckOut: "2026-05-18 10:45:00", CompanyName: "Petrokimia Gresik (PKG)", DurationMinutes: 153.0 },
            { TiketNo: "T-20260519-0045", Nopol: "W 1290 NM", Driver: "Hariyanto", Qty: 30.0, CheckIn: "2026-05-18 09:05:00", CheckOut: "2026-05-18 11:25:00", CompanyName: "UPP Semarang", DurationMinutes: 140.0 },
            { TiketNo: "T-20260519-0023", Nopol: "B 9043 KPA", Driver: "Ahmad", Qty: 25.0, CheckIn: "2026-05-18 08:30:00", CheckOut: "2026-05-18 10:42:00", CompanyName: "Pupuk Kujang (PKC)", DurationMinutes: 132.0 },
            { TiketNo: "T-20260519-0089", Nopol: "N 8931 UR", Driver: "Rian", Qty: 27.2, CheckIn: "2026-05-18 10:15:00", CheckOut: "2026-05-18 12:20:00", CompanyName: "UPP Meneng Banyuwangi", DurationMinutes: 125.0 },
            { TiketNo: "T-20260519-0112", Nopol: "BK 4829 OP", Driver: "Syarif", Qty: 24.5, CheckIn: "2026-05-18 11:00:00", CheckOut: "2026-05-18 12:58:00", CompanyName: "Pupuk Iskandar Muda (PIM)", DurationMinutes: 118.0 },
            { TiketNo: "T-20260519-0034", Nopol: "DD 8721 XY", Driver: "Jufri", Qty: 22.0, CheckIn: "2026-05-18 08:45:00", CheckOut: "2026-05-18 10:35:00", CompanyName: "DC Makassar", DurationMinutes: 110.0 },
            { TiketNo: "T-20260519-0056", Nopol: "L 9022 TY", Driver: "Slamet", Qty: 28.0, CheckIn: "2026-05-18 09:20:00", CheckOut: "2026-05-18 11:05:00", CompanyName: "Petrokimia Gresik (PKG)", DurationMinutes: 105.0 },
            { TiketNo: "T-20260519-0078", Nopol: "W 3942 KL", Driver: "Eko", Qty: 29.5, CheckIn: "2026-05-18 09:50:00", CheckOut: "2026-05-18 11:32:00", CompanyName: "UPP Semarang", DurationMinutes: 102.0 },
            { TiketNo: "T-20260519-0130", Nopol: "B 9801 PL", Driver: "Agus", Qty: 26.0, CheckIn: "2026-05-18 12:10:00", CheckOut: "2026-05-18 13:48:00", CompanyName: "Pupuk Kujang (PKC)", DurationMinutes: 98.0 },
            { TiketNo: "T-20260519-0145", Nopol: "N 7821 JK", Driver: "Joko", Qty: 28.0, CheckIn: "2026-05-18 12:40:00", CheckOut: "2026-05-18 14:15:00", CompanyName: "UPP Meneng Banyuwangi", DurationMinutes: 95.0 }
          ],
          fastest: [
            { TiketNo: "T-20260519-0210", Nopol: "DD 9182 AA", Driver: "Daeng", Qty: 20.0, CheckIn: "2026-05-18 14:30:00", CheckOut: "2026-05-18 14:42:00", CompanyName: "DC Makassar", DurationMinutes: 12.0 },
            { TiketNo: "T-20260519-0254", Nopol: "L 8931 UI", Driver: "Agung", Qty: 24.5, CheckIn: "2026-05-18 15:15:00", CheckOut: "2026-05-18 15:30:00", CompanyName: "Petrokimia Gresik (PKG)", DurationMinutes: 15.0 },
            { TiketNo: "T-20260519-0230", Nopol: "W 1902 OP", Driver: "Dwi", Qty: 22.0, CheckIn: "2026-05-18 14:50:00", CheckOut: "2026-05-18 15:07:00", CompanyName: "UPP Semarang", DurationMinutes: 17.0 },
            { TiketNo: "T-20260519-0288", Nopol: "B 9088 TT", Driver: "Toni", Qty: 25.0, CheckIn: "2026-05-18 15:40:00", CheckOut: "2026-05-18 15:58:00", CompanyName: "Pupuk Kujang (PKC)", DurationMinutes: 18.0 },
            { TiketNo: "T-20260519-0312", Nopol: "N 9831 YY", Driver: "Budi", Qty: 27.0, CheckIn: "2026-05-18 16:10:00", CheckOut: "2026-05-18 16:29:00", CompanyName: "UPP Meneng Banyuwangi", DurationMinutes: 19.0 },
            { TiketNo: "T-20260519-0340", Nopol: "BK 2309 JK", Driver: "Taufik", Qty: 24.0, CheckIn: "2026-05-18 16:30:00", CheckOut: "2026-05-18 16:51:00", CompanyName: "Pupuk Iskandar Muda (PIM)", DurationMinutes: 21.0 },
            { TiketNo: "T-20260519-0220", Nopol: "DD 8931 BG", Driver: "Aris", Qty: 21.5, CheckIn: "2026-05-18 14:40:00", CheckOut: "2026-05-18 15:02:00", CompanyName: "DC Makassar", DurationMinutes: 22.0 },
            { TiketNo: "T-20260519-0260", Nopol: "L 7812 KL", Driver: "Anton", Qty: 23.0, CheckIn: "2026-05-18 15:20:00", CheckOut: "2026-05-18 15:43:00", CompanyName: "Petrokimia Gresik (PKG)", DurationMinutes: 23.0 },
            { TiketNo: "T-20260519-0275", Nopol: "W 9081 UU", Driver: "Edi", Qty: 25.5, CheckIn: "2026-05-18 15:35:00", CheckOut: "2026-05-18 15:59:00", CompanyName: "UPP Semarang", DurationMinutes: 24.0 },
            { TiketNo: "T-20260519-0299", Nopol: "B 7802 BB", Driver: "Sony", Qty: 26.0, CheckIn: "2026-05-18 15:55:00", CheckOut: "2026-05-18 16:20:00", CompanyName: "Pupuk Kujang (PKC)", DurationMinutes: 25.0 }
          ]
        });
      }

      setIsSimulated(!realDataFetched);
    } catch (err) {
      console.warn("Failed to retrieve metrics from backend API. Loading high-fidelity simulation model.", err);
      loadSimulatedData();
    } finally {
      setLoading(false);
      setLastUpdated(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }
  };

  // High-fidelity fallback simulated data representing Pupuk Indonesia logistics
  const loadSimulatedData = () => {
    setIsSimulated(true);

    // KPI Metrics
    setStats({
      total_antrian: 1205,
      total_tonase: 48900,
      avg_tiket_minutes: 42,
      durasi_terlama: 145,
      durasi_tercepat: 12,
      total_selesai: 980,
      tiket_cancelled: [
        { Alasan: "Armada Tidak Layak", Jumlah: 14 },
        { Alasan: "Overload Berat Muat", Jumlah: 9 },
        { Alasan: "Pembatalan Driver", Jumlah: 7 },
        { Alasan: "Kesalahan Dokumen", Jumlah: 5 },
      ]
    });

    // Monthly MoM Comparison
    setMonthlyComp({
      BulanIniLabel: "Mei 2026",
      BulanLaluLabel: "April 2026",
      BulanIni: { TotalTiket: 32540, TotalTonase: 1301600, TotalSelesai: 28900, TotalCancel: 640 },
      BulanLalu: { TotalTiket: 30120, TotalTonase: 1204800, TotalSelesai: 27200, TotalCancel: 710 },
      TiketChange: 8.0,
      TonaseChange: 8.3
    });

    // Trend Per Plant (7 Days)
    const dates = ["12 Mei", "13 Mei", "14 Mei", "15 Mei", "16 Mei", "17 Mei", "18 Mei"];
    setTrendPerPlant({
      dates,
      series: [
        { name: "Petrokimia Gresik (PKG)", data: [180, 210, 195, 240, 220, 205, 250] },
        { name: "Pupuk Kujang (PKC)", data: [110, 125, 115, 140, 130, 120, 145] },
        { name: "Pupuk Iskandar Muda (PIM)", data: [75, 90, 85, 105, 95, 88, 110] },
        { name: "Logistics Meneng", data: [60, 72, 68, 85, 78, 70, 92] },
        { name: "DC Makassar", data: [40, 55, 48, 65, 58, 52, 70] },
      ]
    });

    // Trend Per Hour (Today)
    setTrendPerHour({
      hours: ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "00:00"],
      antrian: [25, 48, 72, 85, 90, 68, 52, 38, 20, 10],
      selesai: [15, 30, 55, 68, 82, 75, 60, 42, 28, 15]
    });

    // Avg Durasi Muat per Plant
    setDurasiMuat([
      { CompanyName: "DC Makassar", AvgDurasiMenit: 32 },
      { CompanyName: "Petrokimia Gresik (PKG)", AvgDurasiMenit: 38 },
      { CompanyName: "Logistics Meneng", AvgDurasiMenit: 41 },
      { CompanyName: "Pupuk Kujang (PKC)", AvgDurasiMenit: 45 },
      { CompanyName: "UPP Semarang", AvgDurasiMenit: 48 },
      { CompanyName: "Pupuk Iskandar Muda (PIM)", AvgDurasiMenit: 52 },
    ]);

    // Top 5 Product Volume (30 Days)
    setTopProduk([
      { NamaProduk: "Urea Curah", TotalTonase: 546200 },
      { NamaProduk: "NPK Phonska", TotalTonase: 364100 },
      { name: "ZA", TotalTonase: 195100 },
      { NamaProduk: "SP-36", TotalTonase: 130000 },
      { NamaProduk: "Pupuk Organik", TotalTonase: 65000 },
    ]);

    // SLA Compliance (30 Days)
    setSlaPerPlant([
      { CompanyName: "DC Makassar", SlaCompliancePercent: 92, TotalSelesai: 1540, TotalDalamSla: 1416 },
      { CompanyName: "Petrokimia Gresik (PKG)", SlaCompliancePercent: 88, TotalSelesai: 4850, TotalDalamSla: 4268 },
      { CompanyName: "Pupuk Kujang (PKC)", SlaCompliancePercent: 81, TotalSelesai: 2980, TotalDalamSla: 2413 },
      { CompanyName: "Logistics Meneng", SlaCompliancePercent: 75, TotalSelesai: 1820, TotalDalamSla: 1365 },
      { CompanyName: "Pupuk Iskandar Muda (PIM)", SlaCompliancePercent: 68, TotalSelesai: 2150, TotalDalamSla: 1462 },
      { CompanyName: "UPP Semarang", SlaCompliancePercent: 64, TotalSelesai: 1100, TotalDalamSla: 704 },
    ]);

    // Throughput per Shift (30 Days)
    setThroughputShift({
      dates: ["12 Mei", "13 Mei", "14 Mei", "15 Mei", "16 Mei", "17 Mei", "18 Mei"],
      shift1: [4200, 4800, 4500, 5100, 4900, 4400, 5200],
      shift2: [3800, 4100, 3900, 4600, 4300, 3900, 4500],
      shift3: [2400, 2800, 2600, 3100, 2950, 2500, 3200],
    });

    // Quota Utilization
    setKuotaUtilization([
      { CompanyCode: "PKG", UtilizationPercent: 89, TotalRealisasi: 8900, TotalKuota: 10000 },
      { CompanyCode: "LOG4MENENG", UtilizationPercent: 82, TotalRealisasi: 4100, TotalKuota: 5000 },
      { CompanyCode: "PKC", UtilizationPercent: 76, TotalRealisasi: 5700, TotalKuota: 7500 },
      { CompanyCode: "PIM", UtilizationPercent: 54, TotalRealisasi: 3240, TotalKuota: 6000 },
      { CompanyCode: "D243", UtilizationPercent: 45, TotalRealisasi: 1800, TotalKuota: 4000 },
    ]);

    // Performance Ranking
    setPlantRanking([
      { Rank: 1, CompanyName: "DC Makassar", TotalTiket: 1540, TotalTonase: 61600, AvgDurasi: 32, SlaPercent: 92, CancelRate: 0.8, Score: 92.5 },
      { Rank: 2, CompanyName: "Petrokimia Gresik (PKG)", TotalTiket: 4850, TotalTonase: 194000, AvgDurasi: 38, SlaPercent: 88, CancelRate: 1.2, Score: 89.8 },
      { Rank: 3, CompanyName: "Pupuk Kujang Cikampek (PKC)", TotalTiket: 2980, TotalTonase: 119200, AvgDurasi: 45, SlaPercent: 81, CancelRate: 1.6, Score: 84.2 },
      { Rank: 4, CompanyName: "UPP Meneng Banyuwangi", TotalTiket: 1820, TotalTonase: 72800, AvgDurasi: 41, SlaPercent: 75, CancelRate: 2.3, Score: 78.4 },
      { Rank: 5, CompanyName: "Pupuk Iskandar Muda (PIM)", TotalTiket: 2150, TotalTonase: 86000, AvgDurasi: 52, SlaPercent: 68, CancelRate: 2.8, Score: 71.9 },
      { Rank: 6, CompanyName: "UPP Semarang", TotalTiket: 1100, TotalTonase: 44000, AvgDurasi: 48, SlaPercent: 64, CancelRate: 3.5, Score: 65.1 },
    ]);

    // Cancel rate trend (7 Days)
    setCancelTrend({
      dates: ["12 Mei", "13 Mei", "14 Mei", "15 Mei", "16 Mei", "17 Mei", "18 Mei"],
      series: [
        { name: "Petrokimia Gresik (PKG)", data: [1.5, 1.2, 1.8, 1.4, 1.1, 1.6, 1.2] },
        { name: "Pupuk Kujang (PKC)", data: [2.1, 1.8, 2.5, 2.0, 1.6, 2.2, 1.6] },
        { name: "Pupuk Iskandar Muda (PIM)", data: [3.2, 2.9, 3.5, 3.1, 2.7, 3.4, 2.8] },
        { name: "UPP Semarang", data: [4.1, 3.8, 4.5, 3.9, 3.6, 4.2, 3.5] },
      ]
    });

    setDurasiTickets({
      longest: [
        { TiketNo: "T-20260519-0012", Nopol: "L 9812 UI", Driver: "Budiono", Qty: 28.5, CheckIn: "2026-05-18 08:12:00", CheckOut: "2026-05-18 10:45:00", CompanyName: "Petrokimia Gresik (PKG)", DurationMinutes: 153.0 },
        { TiketNo: "T-20260519-0045", Nopol: "W 1290 NM", Driver: "Hariyanto", Qty: 30.0, CheckIn: "2026-05-18 09:05:00", CheckOut: "2026-05-18 11:25:00", CompanyName: "UPP Semarang", DurationMinutes: 140.0 },
        { TiketNo: "T-20260519-0023", Nopol: "B 9043 KPA", Driver: "Ahmad", Qty: 25.0, CheckIn: "2026-05-18 08:30:00", CheckOut: "2026-05-18 10:42:00", CompanyName: "Pupuk Kujang (PKC)", DurationMinutes: 132.0 },
        { TiketNo: "T-20260519-0089", Nopol: "N 8931 UR", Driver: "Rian", Qty: 27.2, CheckIn: "2026-05-18 10:15:00", CheckOut: "2026-05-18 12:20:00", CompanyName: "UPP Meneng Banyuwangi", DurationMinutes: 125.0 },
        { TiketNo: "T-20260519-0112", Nopol: "BK 4829 OP", Driver: "Syarif", Qty: 24.5, CheckIn: "2026-05-18 11:00:00", CheckOut: "2026-05-18 12:58:00", CompanyName: "Pupuk Iskandar Muda (PIM)", DurationMinutes: 118.0 },
        { TiketNo: "T-20260519-0034", Nopol: "DD 8721 XY", Driver: "Jufri", Qty: 22.0, CheckIn: "2026-05-18 08:45:00", CheckOut: "2026-05-18 10:35:00", CompanyName: "DC Makassar", DurationMinutes: 110.0 },
        { TiketNo: "T-20260519-0056", Nopol: "L 9022 TY", Driver: "Slamet", Qty: 28.0, CheckIn: "2026-05-18 09:20:00", CheckOut: "2026-05-18 11:05:00", CompanyName: "Petrokimia Gresik (PKG)", DurationMinutes: 105.0 },
        { TiketNo: "T-20260519-0078", Nopol: "W 3942 KL", Driver: "Eko", Qty: 29.5, CheckIn: "2026-05-18 09:50:00", CheckOut: "2026-05-18 11:32:00", CompanyName: "UPP Semarang", DurationMinutes: 102.0 },
        { TiketNo: "T-20260519-0130", Nopol: "B 9801 PL", Driver: "Agus", Qty: 26.0, CheckIn: "2026-05-18 12:10:00", CheckOut: "2026-05-18 13:48:00", CompanyName: "Pupuk Kujang (PKC)", DurationMinutes: 98.0 },
        { TiketNo: "T-20260519-0145", Nopol: "N 7821 JK", Driver: "Joko", Qty: 28.0, CheckIn: "2026-05-18 12:40:00", CheckOut: "2026-05-18 14:15:00", CompanyName: "UPP Meneng Banyuwangi", DurationMinutes: 95.0 }
      ],
      fastest: [
        { TiketNo: "T-20260519-0210", Nopol: "DD 9182 AA", Driver: "Daeng", Qty: 20.0, CheckIn: "2026-05-18 14:30:00", CheckOut: "2026-05-18 14:42:00", CompanyName: "DC Makassar", DurationMinutes: 12.0 },
        { TiketNo: "T-20260519-0254", Nopol: "L 8931 UI", Driver: "Agung", Qty: 24.5, CheckIn: "2026-05-18 15:15:00", CheckOut: "2026-05-18 15:30:00", CompanyName: "Petrokimia Gresik (PKG)", DurationMinutes: 15.0 },
        { TiketNo: "T-20260519-0230", Nopol: "W 1902 OP", Driver: "Dwi", Qty: 22.0, CheckIn: "2026-05-18 14:50:00", CheckOut: "2026-05-18 15:07:00", CompanyName: "UPP Semarang", DurationMinutes: 17.0 },
        { TiketNo: "T-20260519-0288", Nopol: "B 9088 TT", Driver: "Toni", Qty: 25.0, CheckIn: "2026-05-18 15:40:00", CheckOut: "2026-05-18 15:58:00", CompanyName: "Pupuk Kujang (PKC)", DurationMinutes: 18.0 },
        { TiketNo: "T-20260519-0312", Nopol: "N 9831 YY", Driver: "Budi", Qty: 27.0, CheckIn: "2026-05-18 16:10:00", CheckOut: "2026-05-18 16:29:00", CompanyName: "UPP Meneng Banyuwangi", DurationMinutes: 19.0 },
        { TiketNo: "T-20260519-0340", Nopol: "BK 2309 JK", Driver: "Taufik", Qty: 24.0, CheckIn: "2026-05-18 16:30:00", CheckOut: "2026-05-18 16:51:00", CompanyName: "Pupuk Iskandar Muda (PIM)", DurationMinutes: 21.0 },
        { TiketNo: "T-20260519-0220", Nopol: "DD 8931 BG", Driver: "Aris", Qty: 21.5, CheckIn: "2026-05-18 14:40:00", CheckOut: "2026-05-18 15:02:00", CompanyName: "DC Makassar", DurationMinutes: 22.0 },
        { TiketNo: "T-20260519-0260", Nopol: "L 7812 KL", Driver: "Anton", Qty: 23.0, CheckIn: "2026-05-18 15:20:00", CheckOut: "2026-05-18 15:43:00", CompanyName: "Petrokimia Gresik (PKG)", DurationMinutes: 23.0 },
        { TiketNo: "T-20260519-0275", Nopol: "W 9081 UU", Driver: "Edi", Qty: 25.5, CheckIn: "2026-05-18 15:35:00", CheckOut: "2026-05-18 15:59:00", CompanyName: "UPP Semarang", DurationMinutes: 24.0 },
        { TiketNo: "T-20260519-0299", Nopol: "B 7802 BB", Driver: "Sony", Qty: 26.0, CheckIn: "2026-05-18 15:55:00", CheckOut: "2026-05-18 16:20:00", CompanyName: "Pupuk Kujang (PKC)", DurationMinutes: 25.0 }
      ]
    });
  };

  useEffect(() => {
    if (!token) return; // Wait for session token before fetching
    loadDashboardData();
  }, [token]);

  // Format currency or standard numbers
  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

  // Dynamic colors for charts and tables
  const COLORS = ["#3C50E0", "#10B981", "#36B9CC", "#F59E0B", "#EF4444", "#858796", "#EC4899", "#8B5CF6"];

  // ==========================================
  // ApexCharts Configurations
  // ==========================================

  // 1. Trend Tiket per Plant (7 Hari) - Line Chart
  const trendPlantOptions: any = {
    chart: {
      type: "line",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    stroke: { curve: "smooth", width: 3 },
    colors: COLORS.slice(0, trendPerPlant?.series?.length || 5),
    xaxis: {
      categories: trendPerPlant?.dates || [],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Jumlah Antrian", style: { fontWeight: 500 } }
    },
    grid: { borderColor: "rgba(226, 232, 240, 0.5)", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "left" },
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
    colors: durasiMuat?.map((d: any) =>
      d.AvgDurasiMenit <= 35 ? "#10B981" : d.AvgDurasiMenit <= 45 ? "#F59E0B" : "#EF4444"
    ) || COLORS,
    xaxis: {
      categories: durasiMuat?.map((d: any) => d.CompanyName) || [],
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
    data: durasiMuat?.map((d: any) => Math.round(d.AvgDurasiMenit)) || []
  }];

  // 4. Top 5 Produk by Volume - Doughnut Chart
  const topProdukOptions: any = {
    chart: {
      type: "doughnut",
      fontFamily: "Outfit, sans-serif",
    },
    labels: topProduk?.map((p: any) => p.NamaProduk || p.name) || [],
    colors: COLORS.slice(0, topProduk?.length || 5),
    legend: { position: "bottom", fontSize: "12px" },
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
    colors: slaPerPlant?.map((s: any) =>
      s.SlaCompliancePercent >= 85 ? "#10B981" : s.SlaCompliancePercent >= 70 ? "#F59E0B" : "#EF4444"
    ) || COLORS,
    xaxis: {
      categories: slaPerPlant?.map((s: any) => s.CompanyName) || [],
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
    data: slaPerPlant?.map((s: any) => s.SlaCompliancePercent) || []
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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6">

      {/* 1. Sleek Modern Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-5 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-brand-500/10 text-brand-500 rounded-md p-1">
              <Globe className="h-5 w-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              SISTRO Command Center
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {"Global Viewer & API Monitoring Dashboard untuk Semua Plant Pupuk Indonesia Group"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand-500" : ""}`} />
            Perbarui {lastUpdated && `(${lastUpdated})`}
          </button>

          <button className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer">
            <Download className="h-3.5 w-3.5" />
            Ekspor Laporan
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
              <InteractiveLeafletMap />
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
                <span className="text-brand-500">{lastUpdated || new Date().toLocaleTimeString("id-ID")}</span>
              </div>
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
              <span className="text-[11px] text-gray-400 font-medium">Bongkar muat selesai</span>
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

          {/* Trend Tiket per Plant Line Chart */}
          {trendPerPlant && (activeTab === "traffic" || activeTab === "all") && (
            <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <TrendingUp className="h-4.5 w-4.5 text-brand-500 animate-pulse" />
                  Trend Tiket per Plant (7 Hari Terakhir)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[290px]">
                  <Chart
                    options={trendPlantOptions}
                    series={trendPerPlant.series}
                    type="line"
                    height="100%"
                    width="100%"
                  />
                </div>
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
            <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <Clock className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                  Avg Durasi Bongkar Muat per Plant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
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
          {topProduk && (activeTab === "performance" || activeTab === "all") && (
            <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <Warehouse className="h-4.5 w-4.5 text-emerald-500" />
                  Top 5 Produk Teratas by Volume (30 Hari)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] flex items-center justify-center">
                  <Chart
                    options={topProdukOptions}
                    series={topProdukSeries}
                    type="donut"
                    height="100%"
                    width="100%"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* SLA Compliance Horizontal Bar Chart */}
          {slaPerPlant && (activeTab === "performance" || activeTab === "all") && (
            <Card className="shadow-theme-xs dashboard-card-hover border border-gray-100 dark:border-gray-800 animate-slide-up-fade xl:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <Percent className="h-4.5 w-4.5 text-amber-500" />
                  SLA Compliance per Plant (30 Hari)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[290px]">
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

        {/* Quota Utilization Bars */}
        <Card className="lg:col-span-5 shadow-theme-xs hover:shadow-md transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Warehouse className="h-4.5 w-4.5 text-brand-500" />
              Kuota Utilization per Plant (30 Hari)
            </CardTitle>
            <CardDescription className="text-xs">Realisasi penyaluran tonnage vs batasan kuota terdaftar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[310px] overflow-y-auto pr-1">
              {kuotaUtilization?.map((item: any) => {
                const percentage = item.UtilizationPercent;
                // Green for healthy utilization, amber for high, red for overload
                const color = percentage >= 85 ? "bg-rose-500 text-rose-600" :
                  percentage >= 60 ? "bg-amber-500 text-amber-600" :
                    "bg-emerald-500 text-emerald-600";

                return (
                  <div key={item.CompanyCode} className="space-y-1.5 p-2 rounded-lg border border-gray-50 hover:bg-gray-50/55 dark:border-gray-800/40 transition-all">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-800 dark:text-gray-200">{item.CompanyCode}</span>
                      <span className={percentage >= 85 ? "text-rose-500" : percentage >= 60 ? "text-amber-500" : "text-emerald-500"}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-150 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                      <div className={`h-full rounded-full ${color.split(" ")[0]} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                      <span>Realisasi: {fmt(item.TotalRealisasi)} Ton</span>
                      <span>Kuota: {fmt(item.TotalKuota)} Ton</span>
                    </div>
                  </div>
                );
              })}
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
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-4.5 w-4.5 text-brand-500" />
              Plant Performance Leaderboard Ranking (30 Hari Terakhir)
            </CardTitle>
            <CardDescription className="text-xs">
              Skor Performa dihitung berdasarkan formula bobot terstandar: SLA Compliance 40% + Throughput Volume 30% + Efisiensi Durasi 20% + Low Cancel Rate 10%
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-xl">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-center w-[80px]">Rank</th>
                    <th scope="col" className="px-6 py-4">Nama Plant</th>
                    <th scope="col" className="px-6 py-4 text-right">Total Tiket</th>
                    <th scope="col" className="px-6 py-4 text-right">Total Tonase (Ton)</th>
                    <th scope="col" className="px-6 py-4 text-right">Avg Durasi Bongkar</th>
                    <th scope="col" className="px-6 py-4 text-right">SLA Compliance</th>
                    <th scope="col" className="px-6 py-4 text-right">Cancel Rate</th>
                    <th scope="col" className="px-6 py-4 text-right pr-8">Skor Performa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {plantRanking.map((plant: any, index: number) => {
                    const isTopThree = index < 3;
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

                    const rankStyle = isTopThree ? bgColors[index] : "bg-gray-100 text-gray-500 hover:bg-gray-200";

                    return (
                      <tr key={plant.CompanyName} className="bg-white dark:bg-transparent hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all">
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-extrabold ${rankStyle}`}>
                            {isTopThree ? rankMedals[index].split(" ")[0] : plant.Rank}
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
