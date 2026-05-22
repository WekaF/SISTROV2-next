"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Truck, CheckCircle, Ban, AlertTriangle, Clock, Layers, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hari Ini",
  week:  "7 Hari",
  month: "30 Hari",
};

interface GetStatsResult {
  companyCode: string;
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
  companyCode: string;
  trend: { tanggal: string; total: number; selesai: number; dibatalkan: number }[];
}

function KpiCard({ label, value, sub, icon, highlight }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  highlight?: "green" | "red" | "yellow" | "blue" | "indigo";
}) {
  const colors: Record<string, string> = {
    green: "text-green-600", red: "text-red-600", yellow: "text-yellow-600",
    blue: "text-blue-600", indigo: "text-indigo-600",
  };
  const color = highlight ? colors[highlight] : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboardPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<Period>("week");
  const token = (session?.user as any)?.aspnetToken as string;
  const companyCode = (session?.user as any)?.companyCode || "";

  const { data: liveStats, isLoading: liveLoading } = useQuery<GetStatsResult>({
    queryKey: ["manager-live-stats"],
    queryFn: async () => {
      const res = await fetch("/aspnet-proxy/api/CompanyDashboard/GetStats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal memuat data antrian");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const { data: trendStats, isLoading: trendLoading } = useQuery<ManagerStats>({
    queryKey: ["manager-trend", period],
    queryFn: async () => {
      const res = await fetch(`/api/manager/stats?period=${period}`);
      if (!res.ok) throw new Error("Gagal memuat trend");
      return res.json();
    },
  });

  const gudangOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    colors: ["#6366f1"],
    dataLabels: { enabled: true, style: { fontSize: "11px" } },
    xaxis: { labels: { show: false } },
    tooltip: { y: { formatter: (v) => `${v} truk` } },
    grid: { show: false },
  };

  const gudangSeries = [{
    name: "Truk",
    data: liveStats?.gudangBreakdown.map(g => ({ x: g.gudang, y: g.count })) || [],
  }];

  const shiftOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut" },
    labels: ["Pagi (06–14)", "Siang (14–22)", "Malam (22–06)"],
    colors: ["#f59e0b", "#3b82f6", "#8b5cf6"],
    legend: { position: "bottom" },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: "60%" } } },
  };

  const shiftSeries = liveStats
    ? [liveStats.shiftBreakdown.pagi, liveStats.shiftBreakdown.siang, liveStats.shiftBreakdown.malam]
    : [0, 0, 0];

  const trendOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, animations: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    xaxis: { categories: trendStats?.trend.map(t => t.tanggal) || [] },
    colors: ["#3b82f6", "#22c55e", "#ef4444"],
    legend: { position: "top" },
    tooltip: { shared: true, intersect: false },
    yaxis: { min: 0 },
  };

  const trendSeries = [
    { name: "Total Tiket", data: trendStats?.trend.map(t => t.total) || [] },
    { name: "Realisasi",   data: trendStats?.trend.map(t => t.selesai) || [] },
    { name: "Dibatalkan",  data: trendStats?.trend.map(t => t.dibatalkan) || [] },
  ];

  const totalAntri = liveStats ? liveStats.antriAktif + liveStats.proses : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Dashboard Pimpinan</h1>
            <p className="text-sm text-muted-foreground">{companyCode} — Update tiap 30 detik</p>
          </div>
        </div>
        {liveLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" /> Memuat...
          </div>
        )}
      </div>

      {/* KPI Antrian Real-time */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status Antrian Hari Ini</p>
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
            icon={<Clock className="w-4 h-4 text-muted-foreground" />} />
          <KpiCard label="Overdue >2 jam" value={liveStats?.overdueCount ?? "—"}
            icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
            highlight={liveStats && liveStats.overdueCount > 0 ? "yellow" : undefined} />
        </div>
      </div>

      {/* Gudang + Shift Breakdown */}
      {liveStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Antrian per Gudang</CardTitle>
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
                <p className="text-center text-sm text-muted-foreground py-6">Tidak ada antrian aktif</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tiket per Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <Chart type="donut" series={shiftSeries} options={shiftOptions} height={200} />
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                {[
                  { label: "Pagi", value: liveStats.shiftBreakdown.pagi, color: "text-amber-600" },
                  { label: "Siang", value: liveStats.shiftBreakdown.siang, color: "text-blue-600" },
                  { label: "Malam", value: liveStats.shiftBreakdown.malam, color: "text-violet-600" },
                ].map(s => (
                  <div key={s.label}>
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Trend Tiket</CardTitle>
            <div className="flex gap-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trendLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
            </div>
          )}
          {trendStats && trendStats.trend.length > 0 ? (
            <Chart type="area" series={trendSeries} options={trendOptions} height={220} />
          ) : !trendLoading && (
            <p className="text-center text-sm text-muted-foreground py-8">Tidak ada data trend</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
