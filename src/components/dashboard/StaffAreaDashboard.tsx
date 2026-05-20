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

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("id-ID");

export default function StaffAreaDashboard() {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/staffarea/dashboard");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error ?? `HTTP ${res.status}`;
        const detail = body?.detail ? ` — ${body.detail}` : "";
        throw new Error(`${msg}${detail}`);
      }
      const data = await res.json();
      setStats(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error("[StaffAreaDashboard]", e.message);
      setError(e.message ?? "Unknown error");
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
      value: stats ? `${(stats.totalTonase ?? 0).toLocaleString("id-ID")}` : "—",
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
          onClick={() => load(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Coba Lagi
        </button>
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
