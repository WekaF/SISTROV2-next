"use client";
import { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useStaffAreaStream } from "@/hooks/use-staffarea-stream";
import {
  AlertTriangle, CheckCircle2, ClipboardList, RefreshCw,
  Timer, TrendingDown, Weight, Zap, TicketCheck, Truck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";
import OverdueTicketsModal from "@/components/dashboard/OverdueTicketsModal";
import NetworkStatusBadge from "@/components/header/NetworkStatusBadge";

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

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("id-ID");

export default function StaffAreaDashboard() {
  const { activeCompanyCode } = useCompany();
  const [mounted, setMounted] = useState(false);

  const { data: streamData, status: streamStatus, lastUpdated: streamLastUpdated } = useStaffAreaStream(activeCompanyCode);

  const stats = streamData as CompanyStats | null;
  const loading = !stats && streamStatus === "connecting";
  const error = streamStatus === "error" && !stats ? "Gagal menghubungkan ke server stream." : null;

  const [overdueModalOpen, setOverdueModalOpen] = useState(false);

  // 30-day realisasi chart
  const [produkList, setProdukList] = useState<{ id: string; nama: string }[]>([]);
  const [selectedProduk, setSelectedProduk] = useState("all");
  const [chartData, setChartData] = useState<{
    json: { kuota: number; shift1: number; shift2: number; shift3: number }[];
    date: string[];
  } | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load product filter list once per company
  useEffect(() => {
    const qs = activeCompanyCode ? `?companyCode=${encodeURIComponent(activeCompanyCode)}` : "";
    fetch(`/api/staffarea/produk-filter${qs}`)
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch product filter");
        return r.json();
      })
      .then(d => setProdukList(d?.products ?? []))
      .catch(() => setProdukList([]));
  }, [activeCompanyCode]);

  // Load chart data when company or product filter changes
  useEffect(() => {
    setChartLoading(true);
    const params = new URLSearchParams({ idproduk: selectedProduk });
    if (activeCompanyCode) params.set("companyCode", activeCompanyCode);
    fetch(`/api/staffarea/realisasi-chart?${params.toString()}`)
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch realisasi chart");
        return r.json();
      })
      .then(d => {
        if (d && Array.isArray(d.json) && Array.isArray(d.date)) {
          setChartData(d);
        } else {
          setChartData(null);
        }
      })
      .catch(() => setChartData(null))
      .finally(() => setChartLoading(false));
  }, [activeCompanyCode, selectedProduk]);

  const totalToday = (stats?.antriAktif ?? 0) + (stats?.selesai ?? 0) + (stats?.proses ?? 0) + (stats?.cancel ?? 0);
  const completionRate = totalToday > 0 ? Math.round(((stats?.selesai ?? 0) / totalToday) * 100) : 0;

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

  // 30-day realisasi mixed chart (area kuota + stacked bars per shift)
  const realisasiOptions: any = {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: false },
    },
    plotOptions: { bar: { columnWidth: "60%", borderRadius: 2 } },
    colors: ["#3C50E0", "#1cc88a", "#f6c23e", "#ef4444"],
    xaxis: {
      categories: Array.isArray(chartData?.date) ? chartData.date : [],
      labels: { style: { fontSize: "10px" }, rotate: -30 },
      tickAmount: 10,
    },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    legend: { position: "top", fontSize: "11px" },
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false },
    stroke: { width: [3, 0, 0, 0], curve: "smooth" },
    fill: {
      type: ["gradient", "solid", "solid", "solid"],
      gradient: { shade: "light", type: "vertical", opacityFrom: 0.7, opacityTo: 0.1 },
    },
    grid: { borderColor: "#f1f5f9" },
  };
  const realisasiSeries = chartData && Array.isArray(chartData.json)
    ? [
        { name: "Kuota",   type: "area", data: chartData.json.map(d => d?.kuota ?? 0)  },
        { name: "Shift 1", type: "bar",  data: chartData.json.map(d => d?.shift1 ?? 0) },
        { name: "Shift 2", type: "bar",  data: chartData.json.map(d => d?.shift2 ?? 0) },
        { name: "Shift 3", type: "bar",  data: chartData.json.map(d => d?.shift3 ?? 0) },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-5 p-1 animate-pulse">
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="lg:col-span-4 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">Gagal memuat data dashboard</p>
          <p className="text-sm text-red-500 mt-1 font-mono">{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-150 pb-4 dark:border-gray-800">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Operasional{stats?.companyCode ? ` — ${stats.companyCode}` : ""}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <NetworkStatusBadge />
            {mounted && streamLastUpdated && (
              <span className="text-xs text-gray-400">Update: {streamLastUpdated.toLocaleTimeString("id-ID")}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Overdue alert ──────────────────────────────────────────────────── */}
      {(stats?.overdueCount ?? 0) > 0 && (
        <button
          onClick={() => setOverdueModalOpen(true)}
          className="w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold">Eskalasi Diperlukan — <strong>{stats?.overdueCount}</strong> tiket &gt;2 jam belum selesai</p>
            <p className="text-xs font-normal mt-0.5 text-red-500">
              Klik untuk lihat daftar tiket · Koordinasikan dengan Gudang segera.
            </p>
          </div>
        </button>
      )}

      <OverdueTicketsModal
        open={overdueModalOpen}
        onClose={() => setOverdueModalOpen(false)}
        companyCode={activeCompanyCode ?? stats?.companyCode}
      />

      {/* ── Ringkasan Harian hero ──────────────────────────────────────────── */}
      <Card className="shadow-theme-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <h5 className="font-bold text-gray-800 dark:text-white text-sm">Ringkasan Harian</h5>
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
            <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Total Tonase Tiket (Hari Ini)</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-emerald-500 leading-none tabular-nums">
                  {fmt(stats?.totalTonase ?? 0)}
                </span>
                <span className="text-lg font-bold text-emerald-400 mb-1">Ton</span>
              </div>
              <p className="text-xs text-gray-400 mt-3">{totalToday} tiket masuk hari ini</p>
            </div>
            <div className="flex flex-col justify-center py-6 px-6">
              <p className="text-xs text-gray-400 font-semibold mb-4">Aktivitas Tiket Hari Ini:</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <TicketCheck className="h-6 w-6 text-blue-500" />
                  <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{fmt(totalToday)}</span>
                  <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">Total Tiket</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums">{fmt(stats?.selesai ?? 0)}</span>
                  <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">Selesai</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl">
                  <Truck className="h-6 w-6 text-amber-500" />
                  <span className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
                    {fmt((stats?.antriAktif ?? 0) + (stats?.proses ?? 0))}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">Dalam Proses</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Antrian Aktif",
            value: fmt(stats?.antriAktif ?? 0),
            sub: stats ? `${stats.proses} sedang proses` : "",
            icon: ClipboardList, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/20",
            alert: (stats?.antriAktif ?? 0) > 15,
          },
          {
            label: "Avg Durasi Bongkar",
            value: stats ? `${stats.avgDurasiMenit} mnt` : "—",
            sub: stats
              ? stats.avgDurasiMenit <= 35 ? "Efisien" : stats.avgDurasiMenit <= 45 ? "Sedang" : "Perlu perhatian"
              : "",
            icon: Zap, color: "text-sky-500", bg: "bg-sky-50 dark:bg-sky-950/20",
            alert: (stats?.avgDurasiMenit ?? 0) > 45,
          },
          {
            label: "Cancel Rate (7 Hari)",
            value: stats ? `${stats.cancelRate}%` : "—",
            sub: (stats?.cancelRate ?? 0) > 5 ? "Di atas target >5%" : "Dalam batas",
            icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20",
            alert: (stats?.cancelRate ?? 0) > 5,
          },
          {
            label: "Completion Rate",
            value: `${completionRate}%`,
            sub: completionRate >= 70 ? "Target tercapai" : "Di bawah 70%",
            icon: Timer, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/20",
            alert: completionRate < 70 && totalToday > 0,
          },
        ].map(kpi => (
          <Card key={kpi.label} className={`shadow-theme-xs ${kpi.alert ? "ring-1 ring-red-300 dark:ring-red-800" : ""}`}>
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{kpi.label}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5 tabular-nums">{kpi.value}</p>
              <p className={`text-xs mt-1 font-medium ${kpi.alert ? "text-red-500" : "text-gray-400"}`}>
                {kpi.alert && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
                {kpi.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Gudang + Shift charts ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Antrian per Gudang</CardTitle>
                <CardDescription>Jumlah tiket antri aktif per lokasi gudang hari ini.</CardDescription>
              </div>
              <Weight className="h-4 w-4 text-gray-400" />
            </div>
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

        <Card className="lg:col-span-4 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Distribusi Shift</CardTitle>
            <CardDescription>Tiket masuk berdasarkan shift hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              {shiftSeries.some(v => v > 0) ? (
                <Chart options={shiftOptions} series={shiftSeries} type="donut" height="100%" width="100%" />
              ) : (
                <p className="text-sm text-gray-400">Belum ada tiket hari ini.</p>
              )}
            </div>
            {shiftSeries.some(v => v > 0) && (
              <div className="grid grid-cols-3 text-center mt-2 gap-2">
                {[
                  { label: "Pagi",  val: shiftSeries[0], color: "text-amber-500" },
                  { label: "Siang", val: shiftSeries[1], color: "text-blue-500" },
                  { label: "Malam", val: shiftSeries[2], color: "text-slate-600 dark:text-slate-300" },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg py-2">
                    <span className={`block text-base font-black tabular-nums ${s.color}`}>{s.val}</span>
                    <span className="text-[10px] text-gray-400">{s.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Grafik Realisasi Tiket 30 Hari Terakhir ────────────────────────── */}
      <Card className="shadow-theme-xs">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Grafik Realisasi Tiket 30 Hari Terakhir</CardTitle>
              <CardDescription>Kuota vs realisasi per shift selama 30 hari.</CardDescription>
            </div>
            <select
              value={selectedProduk}
              onChange={e => setSelectedProduk(e.target.value)}
              className="w-full sm:w-48 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="all">All Produk</option>
              {produkList.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <div className="h-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
          ) : realisasiSeries.length > 0 ? (
            <div className="h-80">
              <Chart
                options={realisasiOptions}
                series={realisasiSeries}
                type="bar"
                height="100%"
                width="100%"
              />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              Tidak ada data untuk periode ini.
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
