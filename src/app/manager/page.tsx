"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Truck, CheckCircle, Ban, AlertTriangle, Clock, Layers, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hari Ini",
  week:  "7 Hari",
  month: "30 Hari",
};

interface GetStatsResult {
  antriAktif: number;
  proses: number;
  selesai: number;
  cancel: number;
  totalTonase: number;
  overdueCount: number;
  gudangBreakdown: { gudang: string; count: number }[];
  shiftBreakdown: { pagi: number; siang: number; malam: number };
}

interface ManagerStats {
  trend: { tanggal: string; total: number; selesai: number; dibatalkan: number }[];
}

function KpiCard({ label, value, sub, icon, highlight }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  highlight?: "green" | "red" | "yellow" | "blue" | "indigo";
}) {
  const colors: Record<string, string> = {
    green: "text-green-600 dark:text-green-450", red: "text-red-600 dark:text-red-450", yellow: "text-yellow-600 dark:text-yellow-450",
    blue: "text-blue-600 dark:text-blue-450", indigo: "text-indigo-600 dark:text-indigo-455",
  };
  const color = highlight ? colors[highlight] : "text-foreground dark:text-gray-100";
  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm transition-all duration-300">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground dark:text-gray-400 mb-1 truncate">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted dark:bg-gray-700 shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const { theme } = useTheme();

  const { data, isLoading } = useQuery<{ stats: GetStatsResult; trend: ManagerStats; scopeLabel: string | null }>({
    queryKey: ["manager-dashboard-stats", period],
    queryFn: async () => {
      const res = await fetch(`/api/manager/dashboard-stats?period=${period}`);
      if (!res.ok) throw new Error("Gagal memuat data dashboard");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const liveStats = data?.stats;
  const trendStats = data?.trend;

  const gudangOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    colors: ["#6366f1"],
    dataLabels: { enabled: true, style: { fontSize: "11px" } },
    xaxis: { labels: { show: false } },
    tooltip: { y: { formatter: (v) => `${v} truk` } },
    grid: { show: false },
    theme: { mode: theme },
  };

  const gudangSeries = [{
    name: "Truk",
    data: liveStats?.gudangBreakdown.map(g => ({ x: g.gudang, y: g.count })) || [],
  }];

  const shiftOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut" },
    labels: ["Pagi (06–14)", "Siang (14–22)", "Malam (22–06)"],
    colors: ["#f59e0b", "#3b82f6", "#8b5cf6"],
    legend: { position: "bottom", labels: { colors: theme === "dark" ? "#cbd5e1" : "#475569" } },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: "60%" } } },
    theme: { mode: theme },
  };

  const shiftSeries = liveStats
    ? [liveStats.shiftBreakdown.pagi, liveStats.shiftBreakdown.siang, liveStats.shiftBreakdown.malam]
    : [0, 0, 0];

  const trendOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, animations: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    xaxis: {
      categories: trendStats?.trend.map(t => t.tanggal) || [],
      labels: { style: { colors: theme === "dark" ? "#cbd5e1" : "#475569" } }
    },
    colors: ["#3b82f6", "#22c55e", "#ef4444"],
    legend: { position: "top", labels: { colors: theme === "dark" ? "#cbd5e1" : "#475569" } },
    tooltip: { shared: true, intersect: false },
    yaxis: {
      min: 0,
      labels: { style: { colors: theme === "dark" ? "#cbd5e1" : "#475569" } }
    },
    theme: { mode: theme },
  };

  const trendSeries = [
    { name: "Total Tiket", data: trendStats?.trend.map(t => t.total) || [] },
    { name: "Realisasi",   data: trendStats?.trend.map(t => t.selesai) || [] },
    { name: "Dibatalkan",  data: trendStats?.trend.map(t => t.dibatalkan) || [] },
  ];

  const totalAntri = liveStats ? liveStats.antriAktif + liveStats.proses : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-primary dark:text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Pimpinan</h1>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              {data?.scopeLabel ?? "—"} — Update tiap 30 detik
            </p>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Memuat...
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground dark:text-gray-400 uppercase tracking-wider mb-3">Status Antrian Hari Ini</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Antri Gate" value={liveStats?.antriAktif ?? "—"}
            icon={<Truck className="w-4 h-4 text-blue-500" />} highlight="blue" />
          <KpiCard label="Dalam Proses" value={liveStats?.proses ?? "—"}
            icon={<Layers className="w-4 h-4 text-indigo-500" />} highlight="indigo" />
          <KpiCard label="Selesai" value={liveStats?.selesai ?? "—"}
            sub={liveStats ? `${liveStats.totalTonase.toLocaleString()} ton` : undefined}
            icon={<CheckCircle className="w-4 h-4 text-green-500" />} highlight="green" />
          <KpiCard label="Dibatalkan" value={liveStats?.cancel ?? "—"}
            icon={<Ban className="w-4 h-4 text-red-500" />} highlight="red" />
          <KpiCard label="Total Antri" value={liveStats ? totalAntri : "—"} sub="Antri + Proses"
            icon={<Clock className="w-4 h-4 text-muted-foreground dark:text-gray-400" />} />
          <KpiCard label="Overdue >2 jam" value={liveStats?.overdueCount ?? "—"}
            icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
            highlight={liveStats && liveStats.overdueCount > 0 ? "yellow" : undefined} />
        </div>
      </div>

      {liveStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white">Antrian per Gudang</CardTitle>
            </CardHeader>
            <CardContent>
              {liveStats.gudangBreakdown.length > 0 ? (
                <Chart
                  type="bar"
                  series={gudangSeries}
                  options={gudangOptions}
                  height={Math.max(liveStats.gudangBreakdown.length * 38 + 20, 120)}
                />
              ) : (
                <p className="text-center text-sm text-muted-foreground dark:text-gray-400 py-6">Tidak ada antrian aktif</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white">Tiket per Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <Chart type="donut" series={shiftSeries} options={shiftOptions} height={200} />
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                {[
                  { label: "Pagi", value: liveStats.shiftBreakdown.pagi, color: "text-amber-600 dark:text-amber-400" },
                  { label: "Siang", value: liveStats.shiftBreakdown.siang, color: "text-blue-600 dark:text-blue-400" },
                  { label: "Malam", value: liveStats.shiftBreakdown.malam, color: "text-violet-650 dark:text-violet-400" },
                ].map(s => (
                  <div key={s.label}>
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground dark:text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-gray-900 dark:text-white">Trend Tiket</CardTitle>
            <div className="flex gap-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                    period === p
                      ? "bg-primary text-primary-foreground border-primary dark:bg-indigo-600 dark:border-indigo-600 dark:text-white"
                      : "bg-background text-muted-foreground hover:text-foreground dark:bg-gray-700 dark:border-gray-650 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
            </div>
          )}
          {trendStats && trendStats.trend.length > 0 ? (
            <Chart type="area" series={trendSeries} options={trendOptions} height={220} />
          ) : !isLoading && (
            <p className="text-center text-sm text-muted-foreground dark:text-gray-400 py-8">Tidak ada data trend</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
