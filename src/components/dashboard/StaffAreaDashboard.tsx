"use client";
import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Weight,
  Timer,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CompanyStats {
  antriAktif: number;
  selesai: number;
  proses: number;
  totalTonase: number;
  avgDurasiMenit: number;
  cancelRate: number;
  overdueCount: number;
  gudangBreakdown: { gudang: string; count: number }[];
  shiftBreakdown: { pagi: number; siang: number; malam: number };
}

export default function StaffAreaDashboard() {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/staffarea/dashboard");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("[StaffAreaDashboard]", e);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const kpis = [
    {
      label: "Antrian Aktif",
      value: stats?.antriAktif ?? "—",
      icon: ClipboardList,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      alert: (stats?.antriAktif ?? 0) > 15,
      alertMsg: "Antrian tinggi!",
    },
    {
      label: "Selesai Hari Ini",
      value: stats?.selesai ?? "—",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      alert: false,
      alertMsg: "",
    },
    {
      label: "Sedang Proses",
      value: stats?.proses ?? "—",
      icon: Timer,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      alert: false,
      alertMsg: "",
    },
    {
      label: "Total Tonase",
      value: stats ? `${stats.totalTonase.toLocaleString("id-ID")} Ton` : "—",
      icon: Weight,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/20",
      alert: false,
      alertMsg: "",
    },
    {
      label: "Avg Durasi Bongkar",
      value: stats ? `${stats.avgDurasiMenit} Mnt` : "—",
      icon: Timer,
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-950/20",
      alert: (stats?.avgDurasiMenit ?? 0) > 90,
      alertMsg: "Durasi rata-rata tinggi",
    },
    {
      label: "Cancel Rate (7 Hari)",
      value: stats ? `${stats.cancelRate}%` : "—",
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950/20",
      alert: (stats?.cancelRate ?? 0) > 5,
      alertMsg: "Cancel rate >5%",
    },
  ];

  const gudangCategories = stats?.gudangBreakdown.map((g) => g.gudang) ?? [];
  const gudangData = stats?.gudangBreakdown.map((g) => g.count) ?? [];
  const gudangChartOptions: any = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
    colors: ["#3C50E0", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#36B9CC", "#858796"],
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Memuat data dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(stats?.overdueCount ?? 0) > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{stats?.overdueCount}</strong> tiket sudah &gt;2 jam belum selesai — perlu perhatian segera.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-theme-xs">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{kpi.value}</p>
              {kpi.alert && (
                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {kpi.alertMsg}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Antrian per Gudang</CardTitle>
            <CardDescription>Jumlah tiket antri aktif per lokasi gudang hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            {gudangCategories.length > 0 ? (
              <div style={{ height: `${Math.max(200, gudangCategories.length * 44)}px` }}>
                <Chart
                  options={gudangChartOptions}
                  series={[{ name: "Antri", data: gudangData }]}
                  type="bar"
                  height="100%"
                  width="100%"
                />
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
              {shiftSeries.some((v) => v > 0) ? (
                <Chart
                  options={shiftOptions}
                  series={shiftSeries}
                  type="donut"
                  height="100%"
                  width="100%"
                />
              ) : (
                <p className="text-sm text-gray-400">Belum ada tiket hari ini.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
