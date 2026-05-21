"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Ticket, CheckCircle, Ban, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
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

interface ManagerStats {
  companyCode: string;
  totalTiket: number;
  realisasi: number;
  cancel: number;
  aktif: number;
  tonase: number;
  rasio: number;
  overdue: number;
  trend: { tanggal: string; total: number; selesai: number; dibatalkan: number }[];
}

function KpiCard({
  label, value, sub, icon, color,
}: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboardPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<Period>("today");

  const { data: stats, isLoading, error } = useQuery<ManagerStats>({
    queryKey: ["manager-stats", period],
    queryFn: async () => {
      const res = await fetch(`/api/manager/stats?period=${period}`);
      if (!res.ok) throw new Error("Gagal memuat data");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const companyCode = (session?.user as any)?.companyCode || stats?.companyCode || "";

  const trendOptions: ApexCharts.ApexOptions = {
    chart: { type: "line", toolbar: { show: false }, animations: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    xaxis: { categories: stats?.trend.map(t => t.tanggal) || [] },
    colors: ["#3b82f6", "#22c55e", "#ef4444"],
    legend: { position: "top" },
    tooltip: { shared: true, intersect: false },
    yaxis: { min: 0 },
  };

  const trendSeries = [
    { name: "Total Tiket", data: stats?.trend.map(t => t.total) || [] },
    { name: "Realisasi",   data: stats?.trend.map(t => t.selesai) || [] },
    { name: "Dibatalkan",  data: stats?.trend.map(t => t.dibatalkan) || [] },
  ];

  const rasioOptions: ApexCharts.ApexOptions = {
    chart: { type: "radialBar" },
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: { show: true, offsetY: -10 },
          value: { fontSize: "22px", formatter: (v) => `${v}%` },
        },
      },
    },
    colors: ["#22c55e"],
    labels: ["Realisasi"],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Dashboard Pimpinan</h1>
            <p className="text-sm text-muted-foreground">
              {companyCode} — {PERIOD_LABELS[period]}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
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

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive">Gagal memuat data dashboard.</div>
      )}

      {stats && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Tiket"
              value={stats.totalTiket.toLocaleString()}
              icon={<Ticket className="w-4 h-4 text-blue-500" />}
              color="text-blue-600"
            />
            <KpiCard
              label="Realisasi"
              value={stats.realisasi.toLocaleString()}
              sub={`${stats.tonase.toLocaleString()} ton`}
              icon={<CheckCircle className="w-4 h-4 text-green-500" />}
              color="text-green-600"
            />
            <KpiCard
              label="Dibatalkan"
              value={stats.cancel.toLocaleString()}
              icon={<Ban className="w-4 h-4 text-red-500" />}
              color="text-red-600"
            />
            <KpiCard
              label="Overdue (>2 jam)"
              value={stats.overdue}
              icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
              color={stats.overdue > 0 ? "text-yellow-600" : "text-foreground"}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rasio Realisasi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Rasio Realisasi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Chart
                  type="radialBar"
                  series={[stats.rasio]}
                  options={rasioOptions}
                  height={200}
                />
                <p className="text-center text-sm text-muted-foreground">
                  {stats.realisasi} dari {stats.totalTiket} tiket selesai
                </p>
              </CardContent>
            </Card>

            {/* Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Trend Tiket</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.trend.length > 0 ? (
                  <Chart
                    type="line"
                    series={trendSeries}
                    options={trendOptions}
                    height={200}
                  />
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-8">Tidak ada data trend</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
