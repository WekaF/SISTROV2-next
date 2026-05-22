"use client";
import React from "react";
import dynamic from "next/dynamic";
import {
  BarChart3,
  Loader2,
  Truck,
  CheckCircle,
  Ban,
  AlertTriangle,
  Clock,
  Layers,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

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

function StatusBadge({ count, variant }: { count: number; variant: "blue" | "indigo" | "green" | "red" | "yellow" | "gray" }) {
  const styles: Record<string, string> = {
    blue:   "bg-blue-100 text-blue-700 border-blue-200",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
    green:  "bg-green-100 text-green-700 border-green-200",
    red:    "bg-red-100 text-red-700 border-red-200",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
    gray:   "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold border ${styles[variant]}`}>
      {count}
    </span>
  );
}

export default function ManagerAntrianPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.aspnetToken as string;

  const { data: stats, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery<GetStatsResult>({
    queryKey: ["manager-antrian-stats"],
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

  const updatedTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const gudangOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, animations: { speed: 400 } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: "right" } } },
    colors: ["#6366f1"],
    dataLabels: {
      enabled: true,
      formatter: (v: number) => (v > 0 ? `${v} truk` : ""),
      style: { fontSize: "11px", fontWeight: "600" },
      offsetX: 4,
    },
    xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { fontSize: "12px" } } },
    grid: { show: false },
    tooltip: { y: { formatter: (v: number) => `${v} truk` } },
  };

  const gudangSeries = [{
    name: "Truk",
    data: stats?.gudangBreakdown.map(g => ({ x: g.gudang, y: g.count })) || [],
  }];

  const totalAntri = stats ? stats.antriAktif + stats.proses : 0;

  const kpis = [
    { label: "Menunggu di Gate", value: stats?.antriAktif ?? "—", icon: <Truck className="w-4 h-4 text-blue-500" />, variant: "blue" as const },
    { label: "Dalam Proses Muat", value: stats?.proses ?? "—", icon: <Layers className="w-4 h-4 text-indigo-500" />, variant: "indigo" as const },
    { label: "Selesai Hari Ini", value: stats?.selesai ?? "—", icon: <CheckCircle className="w-4 h-4 text-green-500" />, variant: "green" as const },
    { label: "Dibatalkan", value: stats?.cancel ?? "—", icon: <Ban className="w-4 h-4 text-red-500" />, variant: "red" as const },
    { label: "Total Aktif", value: stats ? totalAntri : "—", icon: <Clock className="w-4 h-4 text-muted-foreground" />, variant: "gray" as const },
    { label: "Overdue >2 jam", value: stats?.overdueCount ?? "—", icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, variant: (stats && stats.overdueCount > 0 ? "yellow" : "gray") as "yellow" | "gray" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Monitor Antrian</h1>
            <p className="text-sm text-muted-foreground">
              {stats?.companyCode ?? "—"} — Status real-time antrian truk
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && <Loader2 className="w-3 h-3 animate-spin" />}
          {updatedTime && <span>Update: {updatedTime}</span>}
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Refresh manual"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Memuat data antrian...
        </div>
      )}

      {stats && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((k) => (
              <Card key={k.label}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
                    <div className="p-1.5 rounded-lg bg-muted shrink-0">{k.icon}</div>
                  </div>
                  {typeof k.value === "number" ? (
                    <StatusBadge count={k.value} variant={k.variant} />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">—</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overdue alert */}
          {stats.overdueCount > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800">
                  {stats.overdueCount} truk telah menunggu lebih dari 2 jam
                </p>
                <p className="text-sm text-yellow-700">Segera lakukan pemeriksaan antrian untuk menghindari keterlambatan.</p>
              </div>
            </div>
          )}

          {/* Horizontal gudang lanes */}
          {stats.gudangBreakdown.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Antrian per Gudang — Live
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {stats.gudangBreakdown
                  .slice()
                  .sort((a, b) => b.count - a.count)
                  .map((g) => {
                    const max = Math.max(...stats.gudangBreakdown.map((x) => x.count), 1);
                    const pct = Math.round((g.count / max) * 100);
                    const intensity =
                      g.count === 0 ? "border-border bg-muted/40 text-muted-foreground"
                      : pct >= 75 ? "border-red-300 bg-red-50 text-red-700"
                      : pct >= 40 ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                      : "border-indigo-300 bg-indigo-50 text-indigo-700";
                    return (
                      <div
                        key={g.gudang}
                        className={`shrink-0 flex flex-col items-center rounded-xl border-2 px-5 py-4 min-w-[110px] ${intensity}`}
                      >
                        <span className="text-3xl font-bold">{g.count}</span>
                        <span className="text-xs font-medium mt-1 text-center leading-tight">{g.gudang}</span>
                        <span className="text-[10px] mt-1.5 opacity-60">truk</span>
                      </div>
                    );
                  })}

                {/* Total tile */}
                <div className="shrink-0 flex flex-col items-center rounded-xl border-2 border-dashed border-border bg-background px-5 py-4 min-w-[110px]">
                  <span className="text-3xl font-bold text-foreground">{totalAntri}</span>
                  <span className="text-xs font-medium mt-1 text-muted-foreground">Total Aktif</span>
                  <span className="text-[10px] mt-1.5 opacity-60">truk</span>
                </div>
              </div>
            </div>
          )}

          {/* Gudang Breakdown chart + Shift + Tonase */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gudang chart — takes 2 cols */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Antrian per Gudang</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.gudangBreakdown.length > 0 ? (
                  <Chart
                    type="bar"
                    series={gudangSeries}
                    options={gudangOptions}
                    height={Math.max(stats.gudangBreakdown.length * 42 + 20, 120)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <CheckCircle className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Tidak ada antrian aktif di gudang</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shift + Tonase column */}
            <div className="space-y-4">
              {/* Shift breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribusi Shift</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Pagi (06–14)", value: stats.shiftBreakdown.pagi, color: "bg-amber-500", text: "text-amber-700" },
                      { label: "Siang (14–22)", value: stats.shiftBreakdown.siang, color: "bg-blue-500", text: "text-blue-700" },
                      { label: "Malam (22–06)", value: stats.shiftBreakdown.malam, color: "bg-violet-500", text: "text-violet-700" },
                    ].map((s) => {
                      const total = stats.shiftBreakdown.pagi + stats.shiftBreakdown.siang + stats.shiftBreakdown.malam;
                      const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                      return (
                        <div key={s.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{s.label}</span>
                            <span className={`font-semibold ${s.text}`}>{s.value} truk</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${s.color} transition-all duration-700`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Tonase */}
              <Card>
                <CardContent className="pt-5 pb-5">
                  <p className="text-xs text-muted-foreground mb-1">Total Tonase Selesai</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.totalTonase.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">ton hari ini</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Gudang detail table */}
          {stats.gudangBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detail Antrian per Gudang</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left py-2">Gudang</th>
                        <th className="text-right py-2">Jumlah Truk</th>
                        <th className="text-right py-2">% dari Total</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {stats.gudangBreakdown
                        .slice()
                        .sort((a, b) => b.count - a.count)
                        .map((row) => {
                          const pct = totalAntri > 0 ? Math.round((row.count / totalAntri) * 100) : 0;
                          return (
                            <tr key={row.gudang} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="py-2 font-medium">{row.gudang || "—"}</td>
                              <td className="text-right py-2">
                                <StatusBadge count={row.count} variant="indigo" />
                              </td>
                              <td className="text-right py-2 text-muted-foreground">{pct}%</td>
                              <td className="py-2 pl-4 w-32">
                                <div className="w-full bg-muted rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full bg-indigo-400 transition-all duration-700"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold bg-muted/20">
                        <td className="py-2">Total</td>
                        <td className="text-right py-2">{totalAntri} truk</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!isLoading && !stats && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Tidak ada data antrian tersedia</p>
        </div>
      )}
    </div>
  );
}
