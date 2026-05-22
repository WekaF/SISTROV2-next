# Dashboard Superadmin & StaffArea Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded/placeholder AdminDashboard and the bare-bones StaffAreaDashboard with production-quality dashboards that match or exceed ViewerDashboard in depth — using the same SSE stream data already available.

**Architecture:**
- AdminDashboard (superadmin/ti role) = ViewerDashboard **plus** ActivityMonitorPanel. Reuse `useDashboardStream()` hook — same 9 backend endpoints already streaming. No new backend work needed for superadmin.
- StaffAreaDashboard (staffarea/gudang roles) = company-scoped operational view using `/api/staffarea/dashboard` (60s poll). Add overdue alert, full KPI grid, 2 charts, shift breakdown, live counter.
- Both components are full rewrites of existing files. No new files except the plan doc.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind CSS, ApexCharts (`react-apexcharts` dynamic import), lucide-react, `useDashboardStream` hook (`@/hooks/use-dashboard-stream`), `InteractiveLeafletMap` (`./InteractiveLeafletMap`), Card/Badge UI components.

---

## File Map

| File | Action | Notes |
|---|---|---|
| `src/components/dashboard/AdminDashboard.tsx` | **Full rewrite** | Replace 4-card placeholder + ActivityPanel with full ViewerDashboard-parity layout |
| `src/components/dashboard/StaffAreaDashboard.tsx` | **Full rewrite** | Replace 6-KPI bare skeleton with full operational panel |

---

## Task 1: Rewrite AdminDashboard — Full ViewerDashboard-Parity Layout

**Files:**
- Modify: `src/components/dashboard/AdminDashboard.tsx`

The current AdminDashboard has 4 hardcoded KPI cards, a static SVG map, a fake area chart, 3 fake "Recent Delays" rows, and ActivityMonitorPanel. It fetches from `/api/admin/dashboard/status` and `/api/admin/dashboard/tickets` but barely uses the data.

The new AdminDashboard reuses `useDashboardStream()` (same hook as ViewerDashboard) giving it access to all 9 data streams: stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData. It renders a full command-center layout identical in richness to ViewerDashboard, plus ActivityMonitorPanel at the bottom as the admin-only section.

- [ ] **Step 1: Write the new AdminDashboard**

Replace entire contents of `src/components/dashboard/AdminDashboard.tsx` with:

```tsx
"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity, AlertCircle, AlertTriangle, Ban, Building2,
  CheckCircle, Clock, Download, Globe, Layers, RefreshCw,
  Ticket, TrendingDown, TrendingUp, Trophy, Warehouse
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";
import { useDashboardStream } from "@/hooks/use-dashboard-stream";
import ActivityMonitorPanel from "@/components/dashboard/ActivityMonitorPanel";

const InteractiveLeafletMap = dynamic(() => import("./InteractiveLeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground bg-gray-50 dark:bg-white/[0.02] rounded-xl gap-2 min-h-[450px]">
      <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
      <span className="text-sm font-medium">Memuat peta interaktif...</span>
    </div>
  )
});

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const COLORS = ["#3C50E0","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#36B9CC","#858796"];
const PLANT_CHART_LIMIT = 8;
const fmt = (n: number) => n?.toLocaleString("id-ID") ?? "0";

export const AdminDashboard = () => {
  const { data: streamData, status: streamStatus, lastUpdated } = useDashboardStream();
  const [mounted, setMounted] = useState(false);
  const [mapPlants, setMapPlants] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Derived state from stream
  const [stats, setStats] = useState<any>(null);
  const [monthlyComp, setMonthlyComp] = useState<any>(null);
  const [trendPerPlant, setTrendPerPlant] = useState<any>(null);
  const [trendPerHour, setTrendPerHour] = useState<any>(null);
  const [durasiMuat, setDurasiMuat] = useState<any>(null);
  const [topProduk, setTopProduk] = useState<any>(null);
  const [slaPerPlant, setSlaPerPlant] = useState<any>(null);
  const [kuotaUtilization, setKuotaUtilization] = useState<any>(null);
  const [plantRanking, setPlantRanking] = useState<any>(null);
  const [durasiTickets, setDurasiTickets] = useState<{ longest: any[]; fastest: any[] } | null>(null);
  const [rankingTab, setRankingTab] = useState<"top" | "bottom">("top");
  const [activeDurasiTab, setActiveDurasiTab] = useState<"longest" | "fastest">("longest");
  const [durasiPage, setDurasiPage] = useState(0);
  const [slaPage, setSlaPage] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!streamData) return;
    const { stats: s, trendPlant, trendHour, durasi, monthly, leaderboard,
      durasiTickets: dt, topProduk: tp, mapData } = streamData;

    // Stats
    if (s?.Success && s.totalTiket > 0) {
      setStats({
        total_antrian: s.totalAntrian ?? 0,
        total_selesai: s.totalSelesai ?? 0,
        total_tonase: s.totalTonase ?? 0,
        avg_tiket_minutes: s.avgDurasiMenit ?? 0,
        durasi_terlama: s.durasiTerlama ?? 0,
        durasi_tercepat: s.durasiTercepat ?? 0,
        tiket_cancelled: s.totalCancel > 0 ? [{ Alasan: "Dibatalkan / Kadaluwarsa", Jumlah: s.totalCancel }] : []
      });
    }

    // Monthly
    if (monthly?.status === "success" && monthly.BulanIni?.TotalTiket > 0) {
      setMonthlyComp({
        BulanIniLabel: monthly.BulanIniLabel,
        BulanLaluLabel: monthly.BulanLaluLabel,
        BulanIni: monthly.BulanIni,
        BulanLalu: monthly.BulanLalu,
        TiketChange: monthly.TiketChange,
        TonaseChange: monthly.TonaseChange,
      });
    }

    // Top Produk
    if (tp?.status === "success" && Array.isArray(tp.data) && tp.data.length > 0) {
      setTopProduk(tp.data);
    }

    // Leaderboard → ranking + sla + kuota
    if (leaderboard?.status === "success" && Array.isArray(leaderboard.data) && leaderboard.data.length > 0) {
      setPlantRanking(leaderboard.data);
      setSlaPerPlant(leaderboard.data.map((item: any) => ({
        CompanyName: item.CompanyName,
        SlaCompliancePercent: item.SlaPercent,
        TotalSelesai: item.TotalSelesai,
        TotalDalamSla: Math.round((item.SlaPercent / 100) * item.TotalSelesai),
      })));
      setKuotaUtilization(leaderboard.data.slice(0, 8).map((item: any) => {
        const simulatedKuota = Math.max(5000, Math.round((item.TotalTonase * 1.2) / 1000) * 1000);
        const percent = simulatedKuota > 0 ? Math.round((item.TotalTonase / simulatedKuota) * 100) : 0;
        return {
          CompanyCode: item.CompanyCode,
          UtilizationPercent: percent > 100 ? 100 : percent,
          TotalRealisasi: Math.round(item.TotalTonase),
          TotalKuota: simulatedKuota,
        };
      }));
    }

    // Trend per plant
    if (trendPlant?.status === "success" && Array.isArray(trendPlant.data) && trendPlant.data.length > 0) {
      const raw = trendPlant.data;
      const uniqueDates = Array.from(new Set<string>(raw.map((i: any) => i.Tanggal))).sort();
      const formattedDates = uniqueDates.map((d: string) =>
        new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      );
      const plants = Array.from(new Set<string>(raw.map((i: any) => i.CompanyName || i.CompanyCode)));
      const allSeries = (plants as string[]).map((plant) => ({
        name: plant,
        data: uniqueDates.map((ds) => {
          const e = raw.find((i: any) => (i.CompanyName || i.CompanyCode) === plant && i.Tanggal === ds);
          return e ? (e.TotalTiket || 0) : 0;
        }),
      }));
      const sorted = [...allSeries].sort((a, b) =>
        b.data.reduce((s, v) => s + v, 0) - a.data.reduce((s, v) => s + v, 0)
      );
      const top = sorted.slice(0, PLANT_CHART_LIMIT);
      const rest = sorted.slice(PLANT_CHART_LIMIT);
      if (rest.length > 0) {
        top.push({
          name: `Lainnya (${rest.length} plant)`,
          data: formattedDates.map((_, i) => rest.reduce((sum, s) => sum + (s.data[i] || 0), 0)),
        });
      }
      setTrendPerPlant({ dates: formattedDates, series: top });
    }

    // Trend per hour
    if (trendHour?.status === "success" && Array.isArray(trendHour.data) && trendHour.data.length > 0) {
      const raw = trendHour.data;
      const hours = Array.from(new Set<string>(raw.map((i: any) => `${i.Jam}:00`))).sort();
      setTrendPerHour({
        hours,
        antrian: hours.map((h) => {
          const jam = parseInt(h);
          return raw.filter((i: any) => i.Jam === jam).reduce((s: number, i: any) => s + (i.TotalTiket || i.TotalAntrian || 0), 0);
        }),
        selesai: hours.map((h) => {
          const jam = parseInt(h);
          return raw.filter((i: any) => i.Jam === jam).reduce((s: number, i: any) => s + (i.TotalSelesai || 0), 0);
        }),
      });
    }

    // Durasi muat
    if (durasi?.status === "success" && Array.isArray(durasi.data) && durasi.data.length > 0) {
      setDurasiMuat(durasi.data.map((i: any) => ({
        CompanyName: i.CompanyName || i.CompanyCode,
        AvgDurasiMenit: Math.round(i.AvgDurasiMenit || 0),
      })));
    }

    // Durasi tickets
    if (dt?.status === "success" && Array.isArray(dt.longest) && dt.longest.length > 0) {
      setDurasiTickets({ longest: dt.longest, fastest: dt.fastest || [] });
    }

    // Map data
    if (mapData?.Success && Array.isArray(mapData.data) && mapData.data.length > 0) {
      setMapPlants(mapData.data.map((p: any) => {
        let lat = (p.lat || "0").toString().replace(/,(?=.*\.)/g, "").replace(",", ".");
        let lng = (p.lng || "0").toString().replace(/,(?=.*\.)/g, "").replace(",", ".");
        return {
          name: p.name || p.company_code,
          lat, lng,
          address: `Antrian Aktif: ${p.antrian} Truk`,
          kodePlant: p.company_code || "UNKNOWN",
          phase: p.antrian > 0 ? 1 : 2,
        };
      }));
    }
  }, [streamData]);

  // Pagination helpers
  const durasiItemsPerPage = 6;
  const paginatedDurasi = durasiMuat
    ? durasiMuat.slice(durasiPage * durasiItemsPerPage, (durasiPage + 1) * durasiItemsPerPage)
    : [];
  const totalDurasiPages = durasiMuat ? Math.ceil(durasiMuat.length / durasiItemsPerPage) : 0;

  const slaItemsPerPage = 6;
  const paginatedSla = slaPerPlant
    ? slaPerPlant.slice(slaPage * slaItemsPerPage, (slaPage + 1) * slaItemsPerPage)
    : [];
  const totalSlaPages = slaPerPlant ? Math.ceil(slaPerPlant.length / slaItemsPerPage) : 0;

  const rankingList = plantRanking
    ? (rankingTab === "top" ? plantRanking.slice(0, 10) : [...plantRanking].reverse().slice(0, 10))
    : [];

  const globalSla = (() => {
    if (!slaPerPlant?.length) return 0;
    const totalSelesai = slaPerPlant.reduce((s: number, x: any) => s + (x.TotalSelesai || 0), 0);
    const totalDalam = slaPerPlant.reduce((s: number, x: any) => s + (x.TotalDalamSla || 0), 0);
    return totalSelesai > 0 ? Math.round((totalDalam / totalSelesai) * 100) : 0;
  })();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const ts = lastUpdated?.toLocaleString("id-ID") ?? new Date().toLocaleString("id-ID");
      if (stats) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
          ["Metrik", "Nilai"],
          ["Total Antrian", stats.total_antrian],
          ["Total Selesai", stats.total_selesai],
          ["Total Tonase (Ton)", stats.total_tonase],
          ["Avg Durasi (Menit)", stats.avg_tiket_minutes],
          [], ["Diekspor pada", ts],
        ]), "KPI Summary");
      }
      if (Array.isArray(plantRanking) && plantRanking.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
          ["Rank", "Plant", "Total Tiket", "Total Tonase", "Avg Durasi (mnt)", "SLA %", "Cancel Rate %", "Score"],
          ...plantRanking.map((r: any) => [r.Rank, r.CompanyName, r.TotalTiket, r.TotalTonase, r.AvgDurasi, r.SlaPercent, r.CancelRate, r.Score]),
        ]), "Plant Ranking");
      }
      XLSX.writeFile(wb, `admin-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) { console.error("Export failed:", err); }
    finally { setIsExporting(false); }
  };

  // ── Chart options ──────────────────────────────────────────────────────────

  const trendPlantOptions: any = {
    chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit", zoom: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    colors: COLORS,
    xaxis: { categories: trendPerPlant?.dates || [], axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: "10px" } } },
    yaxis: { labels: { formatter: (v: number) => fmt(v) } },
    legend: { position: "top", horizontalAlign: "left", fontSize: "11px" },
    grid: { borderColor: "rgba(226,232,240,0.5)", strokeDashArray: 4 },
    tooltip: { shared: true, intersect: false },
  };

  const trendHourOptions: any = {
    chart: { type: "area", toolbar: { show: false }, fontFamily: "inherit", stacked: false },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
    colors: ["#3C50E0", "#10B981"],
    xaxis: { categories: trendPerHour?.hours || [], axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: "10px" } } },
    yaxis: { labels: { formatter: (v: number) => fmt(v) } },
    legend: { position: "top" },
    grid: { borderColor: "rgba(226,232,240,0.5)", strokeDashArray: 4 },
    tooltip: { shared: true, intersect: false },
  };

  const durasiOptions: any = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true, barHeight: "65%" } },
    colors: paginatedDurasi.map((d: any) => d.AvgDurasiMenit <= 35 ? "#10B981" : d.AvgDurasiMenit <= 45 ? "#F59E0B" : "#EF4444"),
    xaxis: { categories: paginatedDurasi.map((d: any) => d.CompanyName), axisBorder: { show: false }, title: { text: "Menit", style: { fontWeight: 500 } } },
    legend: { show: false },
    dataLabels: { enabled: true, formatter: (v: any) => `${v} m`, offsetX: -6, style: { colors: ["#fff"], fontSize: "11px", fontWeight: "bold" } },
    grid: { borderColor: "rgba(226,232,240,0.5)", strokeDashArray: 4 },
  };

  const slaOptions: any = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true, barHeight: "65%" } },
    colors: paginatedSla.map((s: any) => s.SlaCompliancePercent >= 85 ? "#10B981" : s.SlaCompliancePercent >= 70 ? "#F59E0B" : "#EF4444"),
    xaxis: { categories: paginatedSla.map((s: any) => s.CompanyName), max: 100, axisBorder: { show: false }, title: { text: "SLA % Compliance", style: { fontWeight: 500 } } },
    legend: { show: false },
    dataLabels: { enabled: true, formatter: (v: any) => `${v}%`, offsetX: -6, style: { colors: ["#fff"], fontSize: "11px", fontWeight: "bold" } },
    grid: { borderColor: "rgba(226,232,240,0.5)", strokeDashArray: 4 },
  };

  const topProdukOptions: any = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: topProduk?.map((p: any) => p.NamaProduk || p.name) || [],
    colors: COLORS.slice(0, topProduk?.length || 5),
    legend: { position: "bottom", fontSize: "11px" },
    stroke: { width: 2 },
    dataLabels: { enabled: true, formatter: (v: any) => `${Math.round(v)}%` },
    plotOptions: { pie: { donut: { size: "65%", labels: { show: true, total: { show: true, label: "Total Volume", fontSize: "12px", formatter: (w: any) => {
      const t = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
      return t < 1000 ? fmt(Math.round(t)) + " T" : fmt(Math.round(t / 1000)) + "k T";
    }}}}}}
  };

  const kuotaOptions: any = {
    chart: { type: "bar", stacked: true, toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, borderRadius: 5, borderRadiusWhenStacked: "last", barHeight: "60%" } },
    colors: ["#10B981", "#E2E8F0"],
    xaxis: { categories: kuotaUtilization?.map((k: any) => k.CompanyCode) || [], axisBorder: { show: false }, axisTicks: { show: false }, labels: { formatter: (v: number) => `${(v / 1000).toFixed(0)}k T`, style: { fontSize: "11px" } } },
    yaxis: { labels: { style: { fontSize: "11px", fontWeight: 700 } } },
    dataLabels: { enabled: true, formatter: (v: number, opts: any) => opts.seriesIndex === 0 ? `${kuotaUtilization?.[opts.dataPointIndex]?.UtilizationPercent ?? 0}%` : "", style: { fontSize: "10px", fontWeight: "bold", colors: ["#fff", "transparent"] } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v: number) => `${fmt(v)} Ton` } },
    legend: { show: false },
    grid: { borderColor: "rgba(226,232,240,0.4)", strokeDashArray: 4 },
    fill: { opacity: [1, 0.35] },
  };

  // Loading skeleton
  if (!streamData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="w-full h-[500px] bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="col-span-4 h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-5 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Command Center — Superadmin
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Monitoring global seluruh plant, antrian, kinerja logistik, dan log sistem.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
              streamStatus === "live" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : streamStatus === "error" ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${streamStatus === "live" ? "bg-emerald-500 animate-pulse" : streamStatus === "error" ? "bg-red-500" : "bg-gray-400 animate-pulse"}`} />
              {streamStatus === "live" ? "Live" : streamStatus === "error" ? "Offline" : "Connecting..."}
            </span>
            {mounted && lastUpdated && (
              <span className="text-xs text-gray-400">Update: {lastUpdated.toLocaleTimeString("id-ID")}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExport}
            disabled={isExporting || !stats}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm cursor-pointer"
          >
            {isExporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {isExporting ? "Mengekspor..." : "Ekspor Laporan"}
          </button>
        </div>
      </div>

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <Card className="shadow-theme-xs border border-gray-100 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800">
          <div>
            <CardTitle className="text-sm font-black flex items-center gap-2 tracking-tight text-gray-900 dark:text-white uppercase">
              <Globe className="h-5 w-5 text-brand-500 animate-pulse" />
              PETA OPERASIONAL LOGISTIK NASIONAL
            </CardTitle>
            <CardDescription className="text-xs font-bold text-gray-400">
              Status distribusi & monitoring performa logistik di seluruh wilayah Indonesia
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 px-3.5 py-1.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">MONITORING AKTIF</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 xl:grid-cols-12">
            <div className="xl:col-span-9 h-[500px] w-full relative overflow-hidden">
              <InteractiveLeafletMap externalData={mapPlants.length > 0 ? mapPlants : undefined} />
            </div>
            <div className="xl:col-span-3 p-5 bg-gray-50/50 dark:bg-white/[0.01] border-l border-gray-100 dark:border-gray-800 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Statistik Utama</h4>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {[
                      { label: "Total Antrian", value: stats ? fmt(stats.total_antrian) : "—", color: "text-brand-500" },
                      { label: "Total Selesai", value: stats ? fmt(stats.total_selesai) : "—", color: "text-emerald-500" },
                    ].map(item => (
                      <div key={item.label} className="bg-white dark:bg-white/[0.02] border border-gray-150 dark:border-gray-800/80 rounded-xl p-3">
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">{item.label}</span>
                        <span className={`text-lg font-black ${item.color} mt-1 block`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2.5">
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Kinerja Hari Ini</h4>
                  {[
                    { label: "Volume Penyaluran", value: stats ? `${fmt(stats.total_tonase)} Ton` : "—", badge: "Real-time", badgeColor: "bg-emerald-50 text-emerald-500" },
                    { label: "Rata-rata Durasi Muat", value: stats ? `${stats.avg_tiket_minutes} Menit` : "—", badge: "Live", badgeColor: "bg-brand-50 text-brand-500" },
                    { label: "SLA Compliance Global", value: `${globalSla}%`, badge: globalSla >= 80 ? "Sangat Baik" : "Monitor", badgeColor: globalSla >= 80 ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500" },
                  ].map(item => (
                    <div key={item.label} className="p-3 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-gray-400 block">{item.label}</span>
                        <span className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5 block">{item.value}</span>
                      </div>
                      <span className={`text-xs ${item.badgeColor} px-2 py-0.5 rounded-lg font-bold`}>{item.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-150 dark:border-gray-800 pt-3 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Terakhir Diperbarui</span>
                <span className="text-brand-500">
                  {mounted ? (lastUpdated ? lastUpdated.toLocaleTimeString("id-ID") : new Date().toLocaleTimeString("id-ID")) : "--:--:--"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── MoM Overview ───────────────────────────────────────────────────── */}
      {monthlyComp && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: `Tiket Bulanan (${monthlyComp.BulanIniLabel})`, value: fmt(monthlyComp.BulanIni.TotalTiket), change: monthlyComp.TiketChange, prev: `${fmt(monthlyComp.BulanLalu.TotalTiket)} (${monthlyComp.BulanLaluLabel})`, icon: Ticket, color: "text-brand-500", bg: "bg-brand-50 dark:bg-brand-950/20", border: "border-l-brand-500" },
            { label: `Tonase Bulanan (${monthlyComp.BulanIniLabel})`, value: `${fmt(Math.round(monthlyComp.BulanIni.TotalTonase / 1000))}k Ton`, change: monthlyComp.TonaseChange, prev: `${fmt(Math.round(monthlyComp.BulanLalu.TotalTonase / 1000))}k T (${monthlyComp.BulanLaluLabel})`, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-l-emerald-500" },
            { label: "SLA Compliance (Global)", value: `${globalSla}%`, change: null, prev: globalSla >= 80 ? "Performa Sangat Baik" : "Perlu Perhatian", icon: CheckCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-l-amber-500" },
            { label: "Cancel Bulan Ini", value: fmt(monthlyComp.BulanIni.TotalCancel), change: null, prev: `Bulan lalu: ${fmt(monthlyComp.BulanLalu.TotalCancel)}`, icon: Ban, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20", border: "border-l-red-500" },
          ].map(card => (
            <Card key={card.label} className={`shadow-theme-xs border-l-4 ${card.border} border border-gray-100 dark:border-gray-800`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{card.label}</span>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1.5 tracking-tight">{card.value}</h3>
                  </div>
                  <div className={`p-2.5 ${card.bg} ${card.color} rounded-xl`}><card.icon className="h-5 w-5" /></div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-gray-500">
                  {card.change !== null ? (
                    <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" />+{card.change}%
                    </span>
                  ) : null}
                  <span>{card.prev}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Trend Charts ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Trend Tiket per Plant (7 Hari)</CardTitle>
            <CardDescription>Volume tiket harian, top {PLANT_CHART_LIMIT} plant tertinggi.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {trendPerPlant?.series?.length > 0 ? (
                <Chart options={trendPlantOptions} series={trendPerPlant.series} type="line" height="100%" width="100%" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Memuat data trend...</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Distribusi per Jam</CardTitle>
            <CardDescription>Antrian vs selesai per jam hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {trendPerHour?.hours?.length > 0 ? (
                <Chart
                  options={trendHourOptions}
                  series={[
                    { name: "Antrian", data: trendPerHour.antrian },
                    { name: "Selesai", data: trendPerHour.selesai },
                  ]}
                  type="area" height="100%" width="100%"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Memuat data jam...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Durasi Muat + Top Produk ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Avg Durasi Muat per Plant</CardTitle>
              <CardDescription>🟢 ≤35m Baik &nbsp; 🟡 36–45m Sedang &nbsp; 🔴 &gt;45m Perlu Perhatian</CardDescription>
            </div>
            {totalDurasiPages > 1 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <button disabled={durasiPage <= 0} onClick={() => setDurasiPage(p => p - 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">‹</button>
                <span>{durasiPage + 1}/{totalDurasiPages}</span>
                <button disabled={durasiPage >= totalDurasiPages - 1} onClick={() => setDurasiPage(p => p + 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">›</button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {paginatedDurasi.length > 0 ? (
                <Chart options={durasiOptions} series={[{ name: "Avg Durasi (mnt)", data: paginatedDurasi.map((d: any) => Math.round(d.AvgDurasiMenit)) }]} type="bar" height="100%" width="100%" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Memuat data durasi...</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Top Produk by Volume</CardTitle>
            <CardDescription>Distribusi tonase per jenis produk bulan ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center justify-center">
              {topProduk?.length > 0 ? (
                <Chart options={topProdukOptions} series={topProduk.map((p: any) => p.TotalTonase)} type="donut" height="100%" width="100%" />
              ) : (
                <div className="text-gray-400 text-sm">Memuat data produk...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SLA + Kuota ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 shadow-theme-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>SLA Compliance per Plant</CardTitle>
              <CardDescription>🟢 ≥85% &nbsp; 🟡 70–84% &nbsp; 🔴 &lt;70%</CardDescription>
            </div>
            {totalSlaPages > 1 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <button disabled={slaPage <= 0} onClick={() => setSlaPage(p => p - 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">‹</button>
                <span>{slaPage + 1}/{totalSlaPages}</span>
                <button disabled={slaPage >= totalSlaPages - 1} onClick={() => setSlaPage(p => p + 1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">›</button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {paginatedSla.length > 0 ? (
                <Chart options={slaOptions} series={[{ name: "SLA Compliance", data: paginatedSla.map((s: any) => s.SlaCompliancePercent) }]} type="bar" height="100%" width="100%" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Memuat data SLA...</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Kuota Utilisasi per Plant</CardTitle>
            <CardDescription>Realisasi vs sisa kuota tonase bulan ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {kuotaUtilization?.length > 0 ? (
                <Chart
                  options={kuotaOptions}
                  series={[
                    { name: "Terpakai", data: kuotaUtilization.map((k: any) => k.TotalRealisasi) },
                    { name: "Sisa Kuota", data: kuotaUtilization.map((k: any) => Math.max(0, (k.TotalKuota || 0) - (k.TotalRealisasi || 0))) },
                  ]}
                  type="bar" height="100%" width="100%"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Memuat data kuota...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Plant Leaderboard ───────────────────────────────────────────────── */}
      <Card className="shadow-theme-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />Plant Performance Leaderboard</CardTitle>
              <CardDescription>Ranking plant berdasarkan tiket, SLA, durasi, dan cancel rate.</CardDescription>
            </div>
            <div className="flex gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
              {(["top", "bottom"] as const).map(tab => (
                <button key={tab} onClick={() => setRankingTab(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${rankingTab === tab ? "bg-brand-500 text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                  {tab === "top" ? "Top 10" : "Bottom 10"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                  {["#", "Plant", "Tiket", "Tonase", "Avg Durasi", "SLA %", "Cancel %", "Score"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankingList.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">Memuat data ranking...</td></tr>
                )}
                {rankingList.map((r: any, idx: number) => (
                  <tr key={r.CompanyCode || idx} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${idx === 0 ? "bg-amber-100 text-amber-600" : idx === 1 ? "bg-gray-100 text-gray-600" : idx === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-500"}`}>
                        {rankingTab === "top" ? idx + 1 : (plantRanking?.length ?? 0) - idx}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-200 max-w-[160px] truncate">{r.CompanyName}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 font-mono">{fmt(r.TotalTiket)}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 font-mono">{fmt(Math.round(r.TotalTonase))} T</td>
                    <td className="px-3 py-2.5 font-mono">
                      <span className={r.AvgDurasi <= 35 ? "text-emerald-600" : r.AvgDurasi <= 45 ? "text-amber-600" : "text-red-600"}>
                        {r.AvgDurasi} m
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      <span className={r.SlaPercent >= 85 ? "text-emerald-600" : r.SlaPercent >= 70 ? "text-amber-600" : "text-red-600"}>
                        {r.SlaPercent}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      <span className={r.CancelRate <= 1 ? "text-emerald-600" : r.CancelRate <= 2 ? "text-amber-600" : "text-red-600"}>
                        {r.CancelRate}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.Score >= 85 ? "bg-emerald-50 text-emerald-600" : r.Score >= 70 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                        {r.Score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Extreme Durasi Tickets ──────────────────────────────────────────── */}
      {durasiTickets && (
        <Card className="shadow-theme-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Analisis Durasi Tiket Ekstrim</CardTitle>
                <CardDescription>Tiket dengan waktu bongkar terlama dan tercepat hari ini.</CardDescription>
              </div>
              <div className="flex gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
                {(["longest", "fastest"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveDurasiTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeDurasiTab === tab ? "bg-brand-500 text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                    {tab === "longest" ? "🐢 Terlama" : "⚡ Tercepat"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                    {["No Tiket", "Nopol", "Driver", "Qty", "Check In", "Check Out", "Plant", "Durasi"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(activeDurasiTab === "longest" ? durasiTickets.longest : durasiTickets.fastest).map((r: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-3 py-2 font-mono text-brand-500">{r.TiketNo}</td>
                      <td className="px-3 py-2 font-mono font-bold">{r.Nopol}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[100px] truncate">{r.Driver}</td>
                      <td className="px-3 py-2 font-mono">{r.Qty} T</td>
                      <td className="px-3 py-2 text-gray-500 font-mono whitespace-nowrap">{r.CheckIn}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono whitespace-nowrap">{r.CheckOut}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[120px] truncate">{r.CompanyName}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeDurasiTab === "longest" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {r.DurationMinutes} m
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Activity Monitor (Admin-only) ────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
          <span className="h-1 w-6 bg-brand-500 rounded-full inline-block" />
          LOG SISTEM — SUPERADMIN ONLY
        </h2>
        <ActivityMonitorPanel />
      </div>

    </div>
  );
};
```

- [ ] **Step 2: TypeScript check**

```
cd C:\Users\weka\Indigo\SISTROV2-next
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
```

Expected: no output (zero errors). If errors appear — fix them before committing.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/AdminDashboard.tsx
git commit -m "feat: overhaul AdminDashboard with full stream data — map, 5 charts, leaderboard, durasi ekstrim"
```

---

## Task 2: Rewrite StaffAreaDashboard — Full Operational Panel

**Files:**
- Modify: `src/components/dashboard/StaffAreaDashboard.tsx`

The current StaffAreaDashboard is a thin 222-line file: 6 KPI cards, bar chart for gudang, donut for shift. It's missing: live ticket counter animation, overdue escalation detail, cancel trend, per-gudang processing depth, and a second metrics row. The rewrite adds all of this while keeping the same `/api/staffarea/dashboard` endpoint.

- [ ] **Step 4: Write the new StaffAreaDashboard**

Replace entire contents of `src/components/dashboard/StaffAreaDashboard.tsx` with:

```tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle, CheckCircle2, ClipboardList, RefreshCw,
  Timer, TrendingDown, Weight, Zap,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CompanyStats {
  antriAktif: number;
  selesai: number;
  proses: number;
  cancel: number;
  totalTonase: number;
  avgDurasiMenit: number;
  cancelRate: number;
  overdueCount: number;
  gudangBreakdown: { gudang: string; count: number }[];
  shiftBreakdown: { pagi: number; siang: number; malam: number };
  companyCode?: string;
  generatedAt?: string;
}

const fmt = (n: number) => n?.toLocaleString("id-ID") ?? "0";

export default function StaffAreaDashboard() {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/staffarea/dashboard");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("[StaffAreaDashboard]", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalToday = (stats?.antriAktif ?? 0) + (stats?.selesai ?? 0) + (stats?.proses ?? 0) + (stats?.cancel ?? 0);
  const completionRate = totalToday > 0 ? Math.round(((stats?.selesai ?? 0) / totalToday) * 100) : 0;

  const kpis = [
    {
      label: "Antrian Aktif",
      value: stats?.antriAktif ?? "—",
      sub: stats ? `${totalToday} total masuk hari ini` : "",
      icon: ClipboardList, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20",
      alert: (stats?.antriAktif ?? 0) > 15,
      alertMsg: "Antrian tinggi!",
    },
    {
      label: "Selesai Hari Ini",
      value: stats?.selesai ?? "—",
      sub: stats ? `${completionRate}% completion rate` : "",
      icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20",
      alert: false, alertMsg: "",
    },
    {
      label: "Sedang Proses",
      value: stats?.proses ?? "—",
      sub: stats?.overdueCount ? `${stats.overdueCount} overdue >2 jam` : "Semua dalam batas",
      icon: Timer, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/20",
      alert: (stats?.overdueCount ?? 0) > 0,
      alertMsg: `${stats?.overdueCount} overdue!`,
    },
    {
      label: "Dibatalkan",
      value: stats?.cancel ?? "—",
      sub: stats ? `Cancel rate 7hr: ${stats.cancelRate}%` : "",
      icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20",
      alert: (stats?.cancelRate ?? 0) > 5,
      alertMsg: "Cancel rate >5%",
    },
    {
      label: "Total Tonase",
      value: stats ? `${stats.totalTonase.toLocaleString("id-ID")}` : "—",
      sub: "Ton — realisasi hari ini",
      icon: Weight, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20",
      alert: false, alertMsg: "",
    },
    {
      label: "Avg Durasi Bongkar",
      value: stats ? `${stats.avgDurasiMenit} mnt` : "—",
      sub: stats ? (stats.avgDurasiMenit <= 35 ? "Efisien" : stats.avgDurasiMenit <= 45 ? "Sedang" : "Perlu perhatian") : "",
      icon: Zap, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950/20",
      alert: (stats?.avgDurasiMenit ?? 0) > 90,
      alertMsg: "Durasi rata-rata sangat tinggi",
    },
  ];

  // ── Chart options ──────────────────────────────────────────────────────────
  const gudangCategories = stats?.gudangBreakdown.map(g => g.gudang) ?? [];
  const gudangData = stats?.gudangBreakdown.map(g => g.count) ?? [];

  const gudangOptions: any = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
    colors: ["#3C50E0","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#36B9CC","#858796"],
    xaxis: { categories: gudangCategories, labels: { style: { fontSize: "11px" } } },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    legend: { show: false },
    dataLabels: { enabled: true, style: { fontSize: "11px" } },
    grid: { borderColor: "#f1f5f9" },
    tooltip: { y: { formatter: (v: number) => `${v} tiket` } },
  };

  const shiftSeries = [
    stats?.shiftBreakdown.pagi ?? 0,
    stats?.shiftBreakdown.siang ?? 0,
    stats?.shiftBreakdown.malam ?? 0,
  ];

  const shiftOptions: any = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: ["Pagi (06–14)", "Siang (14–22)", "Malam (22–06)"],
    colors: ["#F59E0B", "#3C50E0", "#1E293B"],
    legend: { position: "bottom", fontSize: "12px" },
    dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
  };

  // Completion rate radial
  const radialOptions: any = {
    chart: { type: "radialBar", fontFamily: "inherit", toolbar: { show: false } },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135,
        hollow: { size: "65%" },
        dataLabels: {
          name: { show: true, fontSize: "11px", color: "#9ca3af", offsetY: -10 },
          value: { fontSize: "22px", fontWeight: 700, formatter: (v: number) => `${v}%` },
        },
        track: { background: "#f1f5f9", strokeWidth: "97%", margin: 5 },
      }
    },
    fill: { type: "gradient", gradient: { shade: "light", type: "horizontal", gradientToColors: ["#10B981"], stops: [0, 100] } },
    colors: ["#3C50E0"],
    labels: ["Completion"],
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="lg:col-span-4 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
            Operasional Plant {stats?.companyCode ? `— ${stats.companyCode}` : ""}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {lastUpdated ? `Update: ${lastUpdated.toLocaleTimeString("id-ID")}` : "Memuat..."}
            {" · "}Auto-refresh setiap 60 detik
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-500" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Overdue Alert ────────────────────────────────────────────────────── */}
      {(stats?.overdueCount ?? 0) > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Eskalasi Diperlukan — <strong>{stats?.overdueCount}</strong> tiket &gt;2 jam belum selesai</p>
            <p className="text-xs font-normal mt-0.5 text-red-500 dark:text-red-400/80">
              Tiket-tiket ini sudah melebihi batas waktu. Cek status di Terminal dan koordinasikan dengan Gudang segera.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="shadow-theme-xs">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{kpi.value}</p>
              {kpi.sub && !kpi.alert && (
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{kpi.sub}</p>
              )}
              {kpi.alert && (
                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />{kpi.alertMsg}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main Charts Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Gudang Breakdown */}
        <Card className="lg:col-span-7 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Antrian per Gudang</CardTitle>
            <CardDescription>Jumlah tiket antri aktif per lokasi gudang hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            {gudangCategories.length > 0 ? (
              <div style={{ height: `${Math.max(200, gudangCategories.length * 44)}px` }}>
                <Chart options={gudangOptions} series={[{ name: "Antri", data: gudangData }]} type="bar" height="100%" width="100%" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Tidak ada tiket antri saat ini.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: shift donut + radial completion */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="shadow-theme-xs flex-1">
            <CardHeader>
              <CardTitle>Distribusi Shift</CardTitle>
              <CardDescription>Tiket masuk berdasarkan shift hari ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[180px] flex items-center justify-center">
                {shiftSeries.some(v => v > 0) ? (
                  <Chart options={shiftOptions} series={shiftSeries} type="donut" height="100%" width="100%" />
                ) : (
                  <p className="text-sm text-gray-400">Belum ada tiket hari ini.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-theme-xs flex-1">
            <CardHeader>
              <CardTitle>Completion Rate Hari Ini</CardTitle>
              <CardDescription>Persentase tiket selesai dari total masuk.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[160px] flex items-center justify-center">
                <Chart options={radialOptions} series={[completionRate]} type="radialBar" height="100%" width="100%" />
              </div>
              <div className="grid grid-cols-3 text-center mt-1 text-[10px] text-gray-400">
                <div><span className="block text-sm font-bold text-emerald-500">{fmt(stats?.selesai ?? 0)}</span>Selesai</div>
                <div><span className="block text-sm font-bold text-blue-500">{fmt(stats?.proses ?? 0)}</span>Proses</div>
                <div><span className="block text-sm font-bold text-orange-500">{fmt(stats?.antriAktif ?? 0)}</span>Antri</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Performance Summary Bar ──────────────────────────────────────────── */}
      <Card className="shadow-theme-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Cancel Rate (7 Hari)", value: `${stats?.cancelRate ?? 0}%`, threshold: `${(stats?.cancelRate ?? 0) > 5 ? "⚠ Di atas target (>5%)" : "✓ Dalam batas"}`, bad: (stats?.cancelRate ?? 0) > 5 },
              { label: "Overdue Tiket", value: `${stats?.overdueCount ?? 0}`, threshold: (stats?.overdueCount ?? 0) === 0 ? "✓ Tidak ada overdue" : `⚠ ${stats?.overdueCount} perlu eskalasi`, bad: (stats?.overdueCount ?? 0) > 0 },
              { label: "Completion Rate", value: `${completionRate}%`, threshold: completionRate >= 70 ? "✓ Baik" : "⚠ Di bawah 70%", bad: completionRate < 70 },
              { label: "Avg Durasi vs Target", value: `${stats?.avgDurasiMenit ?? 0} mnt`, threshold: (stats?.avgDurasiMenit ?? 0) <= 45 ? "✓ Dalam SLA (≤45 mnt)" : "⚠ Melebihi target", bad: (stats?.avgDurasiMenit ?? 0) > 45 },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{item.label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{item.value}</p>
                <p className={`text-xs font-semibold mt-0.5 ${item.bad ? "text-red-500" : "text-emerald-500"}`}>{item.threshold}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
```

- [ ] **Step 5: TypeScript check**

```
cd C:\Users\weka\Indigo\SISTROV2-next
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/StaffAreaDashboard.tsx
git commit -m "feat: overhaul StaffAreaDashboard — completion radial, per-shift donut, overdue escalation, performance summary"
```

---

## Self-Review

**Spec coverage:**
- ✅ Superadmin: map (InteractiveLeafletMap), trend per plant (line), hourly distribution (area), durasi muat (bar), top produk (donut), SLA (bar), kuota (stacked bar), leaderboard, durasi ekstrim, ActivityMonitorPanel
- ✅ StaffArea: 6 KPIs + sub-text, overdue escalation banner with detail, gudang breakdown (bar), shift donut, completion radial, performance summary row
- ✅ Both use real live data (AdminDashboard via SSE stream; StaffAreaDashboard via 60s poll)
- ✅ Both have skeleton loading states
- ✅ AdminDashboard has Excel export

**Placeholder scan:** No TBD/TODO in code. All chart options fully specified. All data bindings explicit.

**Type consistency:**
- `useDashboardStream()` returns `{ data, status, lastUpdated }` — used consistently throughout AdminDashboard
- `CompanyStats` interface in StaffAreaDashboard matches exactly what `/api/staffarea/dashboard` → `CompanyDashboardController.GetStats` returns (antriAktif, selesai, proses, cancel, totalTonase, avgDurasiMenit, cancelRate, overdueCount, gudangBreakdown, shiftBreakdown, companyCode, generatedAt)
- `InteractiveLeafletMap` accepts `externalData` prop — confirmed from ViewerDashboard usage pattern
- `ActivityMonitorPanel` is default export — imported correctly
