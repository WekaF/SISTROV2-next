"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
  Truck, Ticket, Package, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Zap, Timer, AlertCircle, RefreshCw, ChevronDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtDuration(minutes: number) {
  if (minutes < 60) return `${minutes} mnt`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}j ${m}mnt` : `${h} jam`;
}

function statusLabel(position: string) {
  if (position === "07") return { label: "Selesai", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
  if (position === "00") return { label: "Booking", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
  return { label: "Proses", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
}

// ── API fetch ─────────────────────────────────────────────────────────────────
async function fetchDashboard(days: number) {
  const res = await fetch(`/api/transport/dashboard?days=${days}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <Card className="shadow-theme-xs">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PerformanceCard({ tiket, label, icon: Icon, color }: {
  tiket: any; label: string; icon: React.ElementType; color: string;
}) {
  if (!tiket) return (
    <Card className="shadow-theme-xs">
      <CardContent className="p-5 flex items-center justify-center h-28">
        <p className="text-sm text-gray-400">Data tidak tersedia</p>
      </CardContent>
    </Card>
  );
  return (
    <Card className="shadow-theme-xs">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className={`p-1.5 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtDuration(tiket.durasiMenit)}</p>
        <p className="text-xs text-gray-400 mt-1 font-mono">{tiket.bookingno}</p>
        {tiket.nopol && <p className="text-xs text-gray-400">{tiket.nopol}</p>}
      </CardContent>
    </Card>
  );
}

function TrendChart({ stats, days, onDaysChange }: { stats: any; days: number; onDaysChange: (d: number) => void }) {
  if (!stats) return null;

  const daily: any[] = Array.isArray(stats) ? stats : (stats.daily ?? stats.data ?? []);
  const cats = daily.map((d: any) => {
    const dt = new Date(d.tanggal ?? d.date ?? "");
    return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  });

  const barOpts: any = {
    chart: { id: "tiket-trend", type: "bar", toolbar: { show: false }, fontFamily: "inherit", stacked: false },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    colors: ["#10B981", "#3B82F6"],
    xaxis: { categories: cats, labels: { style: { fontSize: "11px" } } },
    yaxis: { labels: { formatter: (v: number) => String(Math.round(v)) } },
    legend: { position: "top" },
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false },
    grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
  };

  const areaOpts: any = {
    chart: { id: "tonase-trend", type: "area", toolbar: { show: false }, fontFamily: "inherit" },
    stroke: { curve: "smooth", width: 2 },
    colors: ["#8B5CF6"],
    fill: { type: "gradient", gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
    xaxis: { categories: cats, labels: { style: { fontSize: "11px" } } },
    yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}t` } },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (v: number) => `${v} ton` } },
    grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
  };

  return (
    <Card className="shadow-theme-xs lg:col-span-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trend Pengiriman</CardTitle>
            <CardDescription>Tiket selesai &amp; tonase harian</CardDescription>
          </div>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => onDaysChange(d)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${days === d
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                  }`}
              >
                {d}h
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[180px]">
          <Chart
            options={barOpts}
            series={[
              { name: "Selesai", data: daily.map((d: any) => d.totalDone ?? d.selesai ?? 0) },
              { name: "Dalam Proses", data: daily.map((d: any) => d.totalUndone ?? d.proses ?? 0) },
            ]}
            type="bar"
            height="100%"
          />
        </div>
        <div className="h-[160px]">
          <Chart
            options={areaOpts}
            series={[{ name: "Tonase (ton)", data: daily.map((d: any) => d.totalTonase ?? d.tonase ?? 0) }]}
            type="area"
            height="100%"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FleetHealth({ fleet }: { fleet: any }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!fleet) return null;

  const items = [
    {
      label: "KIR Habis", count: fleet.kirExpiredCount,
      color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20",
      details: fleet.kirExpired,
    },
    {
      label: "KIR < 30 Hari", count: fleet.kirNearExpiryCount,
      color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20",
      details: fleet.kirNearExpiry,
    },
    {
      label: "Usia > 20 Tahun", count: fleet.tooOldCount,
      color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20",
      details: [],
    },
    {
      label: "Menunggu Approve", count: fleet.pendingCount,
      color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20",
      details: fleet.pendingList,
      dateKey: "date",
    },
    {
      label: "Ditolak / Revisi", count: fleet.rejectedCount,
      color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20",
      details: fleet.rejectedList,
      dateKey: "date",
      showReason: true,
    },
  ];

  return (
    <Card className="shadow-theme-xs lg:col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-4 w-4" /> Fleet Health
        </CardTitle>
        <CardDescription>
          Total {fleet.totalArmada ?? 0} armada terdaftar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const isExpanded = expanded === item.label;
          const hasDetails = item.details?.length > 0;

          return (
            <div
              key={item.label}
              className={`rounded-xl transition-all duration-200 overflow-hidden ${item.bg} ${isExpanded ? "ring-1 ring-inset ring-black/5 dark:ring-white/10" : ""
                }`}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : item.label)}
                disabled={!hasDetails}
                className="w-full flex items-center justify-between p-3 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                  {hasDetails && (
                    <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                  )}
                </div>
                <span className={`text-xl font-bold ${item.color}`}>{item.count ?? 0}</span>
              </button>

              {isExpanded && hasDetails && (
                <div className="px-3 pb-3 pt-0 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  {item.details.map((d: any) => (
                    <div key={d.nopol} className="flex flex-col border-b border-black/5 pb-1 last:border-0 last:pb-0">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{d.nopol}</span>
                        <span>
                          {item.dateKey === "date"
                            ? (d.date ?? "-")
                            : d.kir ? new Date(d.kir).toLocaleDateString("id-ID") : "-"}
                        </span>
                      </div>
                      {item.showReason && d.reason && (
                        <div className="text-[10px] text-rose-500 italic mt-0.5 line-clamp-1" title={d.reason}>
                          Ket: {d.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PostoAnalytics({ postoAnalytics, postoSummary }: { postoAnalytics: any[]; postoSummary: any }) {
  if (!postoSummary) return null;

  const donutOpts: any = {
    chart: { type: "donut" },
    labels: ["Terealisasi", "Sisa"],
    colors: ["#10B981", "#E5E7EB"],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "72%", labels: {
            show: true, total: {
              show: true, label: "Termuat", fontSize: "13px",
              formatter: () => `${postoSummary.pctTermuatOverall}%`,
            }
          }
        }
      }
    },
  };

  const gapItems = (postoAnalytics ?? []).filter((p) => p.gap > 0).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Donut */}
        <Card className="shadow-theme-xs">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm">% POSTO Termuat</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pt-2">
            <div className="h-[160px] w-full">
              <Chart
                options={donutOpts}
                series={[postoSummary.totalPostoRealisasi ?? 0, Math.max((postoSummary.totalPostoQty ?? 0) - (postoSummary.totalPostoRealisasi ?? 0), 0)]}
                type="donut"
                height="100%"
              />
            </div>
          </CardContent>
        </Card>

        {/* Gap card */}
        <Card className="shadow-theme-xs">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gap Realisasi</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">POSTO Realisasi</span>
                <span className="font-bold text-gray-900 dark:text-white">{postoSummary.totalPostoRealisasi?.toLocaleString("id")} ton</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tiket Selesai</span>
                <span className="font-bold text-gray-900 dark:text-white">{postoSummary.totalTiketRealisasi?.toLocaleString("id")} ton</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Gap</span>
                <span className={`font-bold ${(postoSummary.totalGap ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {postoSummary.totalGap > 0 ? "+" : ""}{postoSummary.totalGap?.toLocaleString("id")} ton
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gap explanation */}
        <Card className="shadow-theme-xs bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Apa artinya gap?</p>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
              Gap positif = ton yang tercatat di POSTO namun tiket-nya belum selesai (position ≠ 07). Kemungkinan tiket masih dalam perjalanan.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-POSTO gap list */}
      {gapItems.length > 0 && (
        <Card className="shadow-theme-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              POSTO dengan Gap Realisasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gapItems.map((p: any) => (
                <div key={p.noposto} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono truncate">{p.noposto}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(p.pctTermuat, 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">{p.pctTermuat}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">Gap</p>
                    <p className="text-sm font-bold text-amber-600">+{p.gap?.toLocaleString("id")} t</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TiketTable({ tikets }: { tikets: any[] }) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  if (!tikets?.length) return (
    <Card className="shadow-theme-xs">
      <CardContent className="py-12 text-center text-gray-400">Tidak ada data tiket</CardContent>
    </Card>
  );

  const totalPages = Math.ceil(tikets.length / pageSize);
  const startIdx = (page - 1) * pageSize;
  const currentTikets = tikets.slice(startIdx, startIdx + pageSize);

  return (
    <Card className="shadow-theme-xs">
      <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Ticket className="h-4 w-4" /> Tiket Terbaru
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Hal {page} dari {totalPages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Booking No", "Nopol", "Qty (ton)", "Durasi", "Tanggal", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {currentTikets.map((t: any) => {
                const durasi = t.timesec && t.timeout
                  ? Math.round((new Date(t.timeout).getTime() - new Date(t.timesec).getTime()) / 60000)
                  : null;
                const { label, color } = statusLabel(t.position ?? "");
                return (
                  <tr key={t.bookingno} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 max-w-[160px] truncate">{t.bookingno}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{t.nopol ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.qty?.toLocaleString("id") ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500">{durasi !== null ? fmtDuration(durasi) : "-"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{t.tanggal ? new Date(t.tanggal).toLocaleDateString("id-ID") : "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export function TransportDashboard() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["transport-dashboard", days],
    queryFn: () => fetchDashboard(days),
    staleTime: 1000 * 60 * 3,
  });

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );

  if (isError) return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <p className="text-gray-500">Gagal memuat data dashboard. Pastikan koneksi ke server.</p>
      <button onClick={() => refetch()} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600">
        Coba Lagi
      </button>
    </div>
  );

  const c = data?.counts ?? {};
  const periode = c.periode ? `(${c.periode})` : "";
  const kpiCards = [
    { icon: Ticket, label: `Total Tiket ${periode}`, value: c.totalTiket ?? "-", color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20" },
    { icon: CheckCircle2, label: "Tiket Selesai", value: c.totalTiketDone ?? "-", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" },
    { icon: Clock, label: "Dalam Proses", value: c.totalTiketUndone ?? "-", color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20" },
    // { icon: TrendingUp,    label: "Total Tonase (ton)",      value: c.totalTonase       ?? "-", color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20"    },
    { icon: AlertTriangle, label: "Pending Approval", value: c.totalArmadaReview ?? "-", color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20" },
    { icon: AlertCircle, label: "Armada Ditolak", value: data?.fleet?.rejectedCount ?? "-", color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20" },
    { icon: Package, label: "POSTO Aktif", value: c.totalPosto ?? "-", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card) => <KpiCard key={card.label} {...card} />)}
      </div>

      {/* Row 2 — Trend chart + Fleet Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <TrendChart stats={data?.stats} days={days} onDaysChange={setDays} />
        <FleetHealth fleet={data?.fleet} />
      </div>

      {/* Row 3 — Tiket Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PerformanceCard
          tiket={data?.tiketTercepat}
          label="Tiket Tercepat"
          icon={Zap}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
        />
        <PerformanceCard
          tiket={data?.tiketTerlama}
          label="Tiket Terlama"
          icon={Timer}
          color="bg-red-50 text-red-600 dark:bg-red-900/20"
        />
      </div>

      {/* Row 4 — POSTO Analytics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" /> POSTO Analytics
        </h3>
        <PostoAnalytics
          postoAnalytics={data?.postoAnalytics ?? []}
          postoSummary={data?.postoSummary}
        />
      </div>

      {/* Row 5 — Tiket Table */}
      <TiketTable tikets={data?.tikets ?? []} />
    </div>
  );
}
