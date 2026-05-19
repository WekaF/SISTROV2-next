"use client";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity, Ban, CheckCircle, Clock, Download,
  Globe, RefreshCw, Ticket, TrendingUp, Trophy, Weight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useDashboardStream } from "@/hooks/use-dashboard-stream";
import ActivityMonitorPanel from "@/components/dashboard/ActivityMonitorPanel";

const InteractiveLeafletMap = dynamic(() => import("./InteractiveLeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-white/[0.02] rounded-xl gap-2 min-h-[450px]">
      <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
      <span className="text-sm font-medium text-gray-400">Memuat peta interaktif...</span>
    </div>
  ),
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

    if (s?.Success && s.totalTiket > 0) {
      setStats({
        total_antrian: s.totalAntrian ?? 0,
        total_selesai: s.totalSelesai ?? 0,
        total_tonase: s.totalTonase ?? 0,
        avg_tiket_minutes: s.avgDurasiMenit ?? 0,
        total_cancel: s.totalCancel ?? 0,
      });
    }

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

    if (tp?.status === "success" && Array.isArray(tp.data) && tp.data.length > 0) {
      setTopProduk(tp.data);
    }

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
          UtilizationPercent: Math.min(percent, 100),
          TotalRealisasi: Math.round(item.TotalTonase),
          TotalKuota: simulatedKuota,
        };
      }));
    }

    if (trendPlant?.status === "success" && Array.isArray(trendPlant.data) && trendPlant.data.length > 0) {
      const raw = trendPlant.data;
      const uniqueDates = Array.from(new Set<string>(raw.map((i: any) => i.Tanggal as string))).sort();
      const formattedDates = uniqueDates.map((d) =>
        new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      );
      const plants = Array.from(new Set<string>(raw.map((i: any) => (i.CompanyName || i.CompanyCode) as string)));
      const allSeries = plants.map((plant) => ({
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

    if (trendHour?.status === "success" && Array.isArray(trendHour.data) && trendHour.data.length > 0) {
      const raw = trendHour.data;
      const hours = Array.from(new Set<string>(raw.map((i: any) => `${i.Jam}:00` as string))).sort();
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

    if (durasi?.status === "success" && Array.isArray(durasi.data) && durasi.data.length > 0) {
      setDurasiMuat(durasi.data.map((i: any) => ({
        CompanyName: i.CompanyName || i.CompanyCode,
        AvgDurasiMenit: Math.round(i.AvgDurasiMenit || 0),
      })));
    }

    if (dt?.status === "success" && Array.isArray(dt.longest) && dt.longest.length > 0) {
      setDurasiTickets({ longest: dt.longest, fastest: dt.fastest || [] });
    }

    if (mapData?.Success && Array.isArray(mapData.data) && mapData.data.length > 0) {
      setMapPlants(mapData.data.map((p: any) => {
        const cleanCoord = (v: string) => v.replace(/,(?=.*\.)/g, "").replace(",", ".");
        return {
          name: p.name || p.company_code,
          lat: cleanCoord((p.lat || "0").toString()),
          lng: cleanCoord((p.lng || "0").toString()),
          address: `Antrian Aktif: ${p.antrian} Truk`,
          kodePlant: p.company_code || "UNKNOWN",
          phase: p.antrian > 0 ? 1 : 2,
        };
      }));
    }
  }, [streamData]);

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
          ["Rank","Plant","Total Tiket","Total Tonase","Avg Durasi (mnt)","SLA %","Cancel Rate %","Score"],
          ...plantRanking.map((r: any) => [r.Rank,r.CompanyName,r.TotalTiket,r.TotalTonase,r.AvgDurasi,r.SlaPercent,r.CancelRate,r.Score]),
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
    chart: { type: "area", toolbar: { show: false }, fontFamily: "inherit" },
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
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true, label: "Total Volume", fontSize: "12px",
              formatter: (w: any) => {
                const t = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return t < 1000 ? fmt(Math.round(t)) + " T" : fmt(Math.round(t / 1000)) + "k T";
              },
            },
          },
        },
      },
    },
  };

  const kuotaOptions: any = {
    chart: { type: "bar", stacked: true, toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, borderRadius: 5, borderRadiusWhenStacked: "last", barHeight: "60%" } },
    colors: ["#10B981", "#E2E8F0"],
    xaxis: {
      categories: kuotaUtilization?.map((k: any) => k.CompanyCode) || [],
      axisBorder: { show: false }, axisTicks: { show: false },
      labels: { formatter: (v: number) => `${(v / 1000).toFixed(0)}k T`, style: { fontSize: "11px" } },
    },
    yaxis: { labels: { style: { fontSize: "11px", fontWeight: 700 } } },
    dataLabels: {
      enabled: true,
      formatter: (v: number, opts: any) =>
        opts.seriesIndex === 0 ? `${kuotaUtilization?.[opts.dataPointIndex]?.UtilizationPercent ?? 0}%` : "",
      style: { fontSize: "10px", fontWeight: "bold", colors: ["#fff", "transparent"] },
    },
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

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-5 dark:border-gray-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Command Center — Superadmin
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
            Monitoring global seluruh plant, antrian, kinerja logistik, dan log sistem.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
              streamStatus === "live" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : streamStatus === "error" ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                streamStatus === "live" ? "bg-emerald-500 animate-pulse"
                : streamStatus === "error" ? "bg-red-500" : "bg-gray-400 animate-pulse"
              }`} />
              {streamStatus === "live" ? "Live" : streamStatus === "error" ? "Offline" : "Connecting..."}
            </span>
            {mounted && lastUpdated && (
              <span className="text-xs text-gray-400">Update: {lastUpdated.toLocaleTimeString("id-ID")}</span>
            )}
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || !stats}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm cursor-pointer"
        >
          {isExporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {isExporting ? "Mengekspor..." : "Ekspor Laporan"}
        </button>
      </div>

      {/* Map */}
      <Card className="shadow-theme-xs border border-gray-100 dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-150 dark:border-gray-800">
          <div>
            <CardTitle className="text-sm font-black flex items-center gap-2 tracking-tight uppercase">
              <Globe className="h-5 w-5 text-brand-500 animate-pulse" />
              PETA OPERASIONAL LOGISTIK NASIONAL
            </CardTitle>
            <CardDescription className="text-xs font-bold text-gray-400">
              Status distribusi &amp; monitoring performa logistik di seluruh wilayah Indonesia
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

      {/* MoM Cards */}
      {monthlyComp && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: `Tiket Bulanan (${monthlyComp.BulanIniLabel})`, value: fmt(monthlyComp.BulanIni.TotalTiket), change: monthlyComp.TiketChange, prev: `${fmt(monthlyComp.BulanLalu.TotalTiket)} (${monthlyComp.BulanLaluLabel})`, icon: Ticket, color: "text-brand-500", bg: "bg-brand-50 dark:bg-brand-950/20", border: "border-l-brand-500" },
            { label: `Tonase Bulanan (${monthlyComp.BulanIniLabel})`, value: `${fmt(Math.round(monthlyComp.BulanIni.TotalTonase / 1000))}k Ton`, change: monthlyComp.TonaseChange, prev: `${fmt(Math.round(monthlyComp.BulanLalu.TotalTonase / 1000))}k T (${monthlyComp.BulanLaluLabel})`, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-l-emerald-500" },
            { label: "SLA Compliance (Global)", value: `${globalSla}%`, change: null as number | null, prev: globalSla >= 80 ? "Performa Sangat Baik" : "Perlu Perhatian", icon: CheckCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-l-amber-500" },
            { label: "Cancel Bulan Ini", value: fmt(monthlyComp.BulanIni.TotalCancel), change: null as number | null, prev: `Bulan lalu: ${fmt(monthlyComp.BulanLalu.TotalCancel)}`, icon: Ban, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20", border: "border-l-red-500" },
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
                  {card.change !== null && (
                    <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3" />+{card.change}%
                    </span>
                  )}
                  <span>{card.prev}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Trend Charts */}
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
                  series={[{ name: "Antrian", data: trendPerHour.antrian }, { name: "Selesai", data: trendPerHour.selesai }]}
                  type="area" height="100%" width="100%"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Memuat data jam...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Durasi + Top Produk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Avg Durasi Muat per Plant</CardTitle>
              <CardDescription>🟢 ≤35m &nbsp; 🟡 36–45m &nbsp; 🔴 &gt;45m</CardDescription>
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

      {/* SLA + Kuota */}
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

      {/* Plant Leaderboard */}
      <Card className="shadow-theme-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Plant Performance Leaderboard
              </CardTitle>
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
                  {["#","Plant","Tiket","Tonase","Avg Durasi","SLA %","Cancel %","Score"].map(h => (
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
                      <span className={r.AvgDurasi <= 35 ? "text-emerald-600" : r.AvgDurasi <= 45 ? "text-amber-600" : "text-red-600"}>{r.AvgDurasi} m</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      <span className={r.SlaPercent >= 85 ? "text-emerald-600" : r.SlaPercent >= 70 ? "text-amber-600" : "text-red-600"}>{r.SlaPercent}%</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      <span className={r.CancelRate <= 1 ? "text-emerald-600" : r.CancelRate <= 2 ? "text-amber-600" : "text-red-600"}>{r.CancelRate}%</span>
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

      {/* Extreme Durasi Tickets */}
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
                    {["No Tiket","Nopol","Driver","Qty","Check In","Check Out","Plant","Durasi"].map(h => (
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

      {/* Activity Monitor — admin only */}
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
