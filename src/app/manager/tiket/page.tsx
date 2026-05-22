"use client";
import React from "react";
import dynamic from "next/dynamic";
import { Ticket, Loader2, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface KuotaShiftRow {
  shift: string;
  kuota: number;
  realisasi: number;
  antriAktif: number;
  persen: number;
}

interface KuotaProgress {
  companyCode: string;
  progress: KuotaShiftRow[];
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
      <div
        className={`h-4 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function shiftLabel(shift: string) {
  const map: Record<string, string> = {
    "1": "Shift 1 — Pagi (06:00–14:00)",
    "2": "Shift 2 — Siang (14:00–22:00)",
    "3": "Shift 3 — Malam (22:00–06:00)",
  };
  return map[shift] ?? `Shift ${shift}`;
}

function progressColor(persen: number) {
  if (persen >= 80) return "bg-green-500";
  if (persen >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function progressTextColor(persen: number) {
  if (persen >= 80) return "text-green-600";
  if (persen >= 50) return "text-yellow-600";
  return "text-red-600";
}

export default function ManagerTiketPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.aspnetToken as string;

  const { data: kuota, isLoading } = useQuery<KuotaProgress>({
    queryKey: ["manager-kuota-progress"],
    queryFn: async () => {
      const res = await fetch("/aspnet-proxy/api/CompanyDashboard/GetKuotaProgress", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Gagal memuat kuota");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const barOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: "45%", borderRadius: 4 } },
    colors: ["#6366f1", "#22c55e", "#3b82f6"],
    xaxis: { categories: kuota?.progress.map(p => `Shift ${p.shift}`) || [] },
    legend: { position: "top" },
    dataLabels: { enabled: false },
    yaxis: { min: 0 },
    tooltip: { shared: true },
  };

  const barSeries = [
    { name: "Kuota",      data: kuota?.progress.map(p => p.kuota) || [] },
    { name: "Realisasi",  data: kuota?.progress.map(p => p.realisasi) || [] },
    { name: "Aktif/Antri", data: kuota?.progress.map(p => p.antriAktif) || [] },
  ];

  const totalKuota     = kuota?.progress.reduce((s, p) => s + p.kuota, 0) ?? 0;
  const totalRealisasi = kuota?.progress.reduce((s, p) => s + p.realisasi, 0) ?? 0;
  const totalAktif     = kuota?.progress.reduce((s, p) => s + p.antriAktif, 0) ?? 0;
  const totalPersen    = totalKuota > 0 ? Math.round(totalRealisasi / totalKuota * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Ticket className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Dashboard Tiket</h1>
          <p className="text-sm text-muted-foreground">Realisasi kuota per shift — Update tiap 30 detik</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
        </div>
      )}

      {kuota && (
        <>
          {/* Summary KPI */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground mb-1">Total Kuota Hari Ini</p>
                <p className="text-3xl font-bold text-indigo-600">{totalKuota}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Realisasi</p>
                  <p className="text-3xl font-bold text-green-600">{totalRealisasi}</p>
                  <p className={`text-sm font-semibold mt-1 ${progressTextColor(totalPersen)}`}>
                    {totalPersen}% tercapai
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500 mt-1" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Aktif / Antri</p>
                  <p className="text-3xl font-bold text-blue-600">{totalAktif}</p>
                  <p className="text-xs text-muted-foreground mt-1">truk dalam antrian</p>
                </div>
                <Clock className="w-5 h-5 text-blue-500 mt-1" />
              </CardContent>
            </Card>
          </div>

          {/* Per-shift progress bars */}
          <div className="space-y-4">
            {kuota.progress.map((row) => {
              const sisa = Math.max(row.kuota - row.realisasi - row.antriAktif, 0);
              return (
                <Card key={row.shift}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold">{shiftLabel(row.shift)}</span>
                      <span className={`text-2xl font-bold ${progressTextColor(row.persen)}`}>
                        {row.persen}%
                      </span>
                    </div>

                    <ProgressBar value={row.realisasi} max={row.kuota} color={progressColor(row.persen)} />

                    <div className="grid grid-cols-4 gap-4 mt-4 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Kuota</div>
                        <div className="text-xl font-bold text-indigo-600">{row.kuota}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Realisasi</div>
                        <div className="text-xl font-bold text-green-600">{row.realisasi}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Aktif/Antri</div>
                        <div className="text-xl font-bold text-blue-600">{row.antriAktif}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Sisa Slot</div>
                        <div className="text-xl font-bold text-muted-foreground">{sisa}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Bar chart comparison */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Perbandingan Kuota vs Realisasi per Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <Chart type="bar" series={barSeries} options={barOptions} height={240} />
            </CardContent>
          </Card>
        </>
      )}

      {!isLoading && !kuota && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Tidak ada data kuota tersedia</p>
        </div>
      )}
    </div>
  );
}
