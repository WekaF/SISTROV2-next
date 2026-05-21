"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Ticket, Loader2, Clock, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

type Period = "today" | "week" | "month";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hari Ini", week: "7 Hari", month: "30 Hari",
};

interface ManagerStats {
  totalTiket: number; realisasi: number; cancel: number; aktif: number;
  tonase: number; rasio: number; overdue: number;
  trend: { tanggal: string; total: number; selesai: number; dibatalkan: number }[];
}

interface KuotaProgress {
  progress: { shift: string; kuota: number; realisasi: number; antriAktif: number; persen: number }[];
}

export default function ManagerTiketPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<Period>("today");

  const token = (session?.user as any)?.aspnetToken as string;

  const { data: stats, isLoading } = useQuery<ManagerStats>({
    queryKey: ["manager-stats-tiket", period],
    queryFn: async () => {
      const res = await fetch(`/api/manager/stats?period=${period}`);
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
  });

  const { data: kuota } = useQuery<KuotaProgress>({
    queryKey: ["manager-kuota-progress"],
    queryFn: async () => {
      const res = await fetch("/aspnet-proxy/api/CompanyDashboard/GetKuotaProgress", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal memuat kuota");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 60_000,
  });

  const statusDonutOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut" },
    labels: ["Aktif", "Selesai", "Dibatalkan"],
    colors: ["#3b82f6", "#22c55e", "#ef4444"],
    legend: { position: "bottom" },
    dataLabels: { enabled: true },
  };

  const statusSeries = stats
    ? [stats.aktif, stats.realisasi, stats.cancel]
    : [0, 0, 0];

  const kuotaBarOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: "50%" } },
    colors: ["#6366f1", "#22c55e"],
    xaxis: { categories: kuota?.progress.map(p => `Shift ${p.shift}`) || [] },
    legend: { position: "top" },
    dataLabels: { enabled: false },
  };

  const kuotaSeries = [
    { name: "Kuota",     data: kuota?.progress.map(p => p.kuota) || [] },
    { name: "Realisasi", data: kuota?.progress.map(p => p.realisasi) || [] },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Dashboard Tiket</h1>
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

      {isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Memuat...</div>}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Donut */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" /> Status Tiket — {PERIOD_LABELS[period]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Chart type="donut" series={statusSeries} options={statusDonutOptions} height={280} />
            </CardContent>
          </Card>

          {/* Kuota vs Realisasi per Shift */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Kuota vs Realisasi (Hari Ini)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kuota && kuota.progress.length > 0 ? (
                <>
                  <Chart type="bar" series={kuotaSeries} options={kuotaBarOptions} height={220} />
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left py-1">Shift</th>
                        <th className="text-right py-1">Kuota</th>
                        <th className="text-right py-1">Realisasi</th>
                        <th className="text-right py-1">%</th>
                        <th className="text-right py-1">Aktif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kuota.progress.map((row) => (
                        <tr key={row.shift} className="border-b last:border-0">
                          <td className="py-1.5 font-medium">Shift {row.shift}</td>
                          <td className="text-right py-1.5">{row.kuota}</td>
                          <td className="text-right py-1.5 text-green-600">{row.realisasi}</td>
                          <td className={`text-right py-1.5 font-medium ${row.persen >= 80 ? "text-green-600" : row.persen >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                            {row.persen}%
                          </td>
                          <td className="text-right py-1.5 text-blue-600">{row.antriAktif}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-8">Tidak ada data kuota hari ini</p>
              )}
            </CardContent>
          </Card>

          {/* Overdue Alert */}
          {stats.overdue > 0 && (
            <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10 lg:col-span-2">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                      {stats.overdue} kendaraan overdue (&gt;2 jam)
                    </p>
                    <p className="text-xs text-yellow-600">Kendaraan yang sudah menunggu lebih dari 2 jam</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
