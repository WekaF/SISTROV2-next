"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { FileText, Loader2, Package, TrendingUp, TrendingDown, Download, Printer } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Period = "today" | "week" | "month";
const PERIOD_LABELS: Record<Period, string> = { today: "Hari Ini", week: "7 Hari", month: "30 Hari" };

interface TopProdukData {
  top: { idProduk: string; namaProduk: string; jumlahTiket: number; totalTonase: number }[];
  bottom: { idProduk: string; namaProduk: string; jumlahTiket: number; totalTonase: number }[];
}

interface PostoData {
  total: number; aktif: number; expired: number; tonase: number;
  byProduk: { produk: string; count: number; tonase: number }[];
}

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ManagerLaporanPage() {
  const [period, setPeriod] = useState<Period>("month");
  const { theme } = useTheme();

  const { data: produkData, isLoading: produkLoading } = useQuery<TopProdukData>({
    queryKey: ["manager-produk", period],
    queryFn: async () => {
      const res = await fetch(`/api/manager/produk?period=${period}&top=10`);
      if (!res.ok) throw new Error("Gagal memuat data produk");
      return res.json();
    },
  });

  const { data: postoData, isLoading: postoLoading } = useQuery<PostoData>({
    queryKey: ["manager-posto", period],
    queryFn: async () => {
      const res = await fetch(`/api/manager/posto?period=${period}`);
      if (!res.ok) throw new Error("Gagal memuat data posto");
      return res.json();
    },
  });

  function handleExportExcel() {
    const tanggal = new Date().toLocaleDateString("id-ID");
    const rows: (string | number)[][] = [
      ["Laporan Pimpinan", `Periode: ${PERIOD_LABELS[period]}`, `Dicetak: ${tanggal}`],
      [],
      ["=== REKAP POSTO ==="],
      ["Total POSTO", postoData?.total ?? ""],
      ["POSTO Aktif", postoData?.aktif ?? ""],
      ["POSTO Expired", postoData?.expired ?? ""],
      ["Total Tonase (ton)", postoData?.tonase ?? ""],
      [],
      ["=== TOP PRODUK (TONASE) ==="],
      ["No", "Produk", "Jumlah Tiket", "Total Tonase (ton)"],
      ...(produkData?.top.map((p, i) => [i + 1, p.namaProduk, p.jumlahTiket, p.totalTonase]) ?? []),
      [],
      ["=== PRODUK VOLUME KECIL ==="],
      ["No", "Produk", "Jumlah Tiket", "Total Tonase (ton)"],
      ...(produkData?.bottom.slice(0, 10).map((p, i) => [i + 1, p.namaProduk, p.jumlahTiket, p.totalTonase]) ?? []),
      [],
      ["=== POSTO PER PRODUK ==="],
      ["Produk", "Jumlah POSTO", "Total Tonase (ton)", "Rata-rata Tonase"],
      ...(postoData?.byProduk.map(r => [
        r.produk || "—",
        r.count,
        r.tonase,
        r.count > 0 ? (r.tonase / r.count).toFixed(2) : "—",
      ]) ?? []),
    ];
    downloadCSV(rows, `Laporan_Pimpinan_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  const topBarOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    colors: ["#22c55e"],
    xaxis: { 
      labels: { 
        formatter: (v) => `${Number(v).toFixed(0)} ton`,
        style: { colors: theme === "dark" ? "#cbd5e1" : "#475569" }
      } 
    },
    yaxis: {
      labels: {
        style: { colors: theme === "dark" ? "#cbd5e1" : "#475569" }
      }
    },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (v) => `${v.toFixed(2)} ton` } },
    grid: { 
      xaxis: { lines: { show: true } }, 
      yaxis: { lines: { show: false } },
      borderColor: theme === "dark" ? "#374151" : "#e5e7eb"
    },
    theme: { mode: theme },
  };

  const topSeries = [{
    name: "Tonase",
    data: produkData?.top.map(p => ({ x: p.namaProduk, y: Math.round(p.totalTonase) })) || [],
  }];

  const bottomBarOptions: ApexCharts.ApexOptions = {
    ...topBarOptions,
    colors: ["#f59e0b"],
    theme: { mode: theme },
  };

  const bottomSeries = [{
    name: "Tonase",
    data: produkData?.bottom.slice(0, 8).map(p => ({ x: p.namaProduk, y: Math.round(p.totalTonase) })) || [],
  }];

  return (
    <div className="p-6 space-y-6 print:p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary dark:text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Laporan Pimpinan</h1>
            <p className="text-sm text-muted-foreground dark:text-gray-400">Statistik produk &amp; POSTO</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors cursor-pointer ${
                  period === p
                    ? "bg-primary text-primary-foreground border-primary dark:bg-indigo-600 dark:border-indigo-600 dark:text-white"
                    : "bg-background text-muted-foreground hover:text-foreground dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <Button
            variant="outline" size="sm"
            onClick={handleExportExcel}
            disabled={!produkData && !postoData}
            className="cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Excel
          </Button>
          <Button 
            variant="outline" size="sm" 
            onClick={() => window.print()}
            className="cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:text-gray-200"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-4 border-b pb-3 border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Laporan Pimpinan</h1>
        <p className="text-muted-foreground dark:text-gray-400">
          Periode: {PERIOD_LABELS[period]} — Dicetak: {new Date().toLocaleDateString("id-ID")}
        </p>
      </div>

      {/* POSTO Summary */}
      {(postoLoading || postoData) && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground dark:text-gray-400 uppercase tracking-wider mb-3">Rekap POSTO</p>
          {postoLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Memuat...</div>}
          {postoData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total POSTO", value: postoData.total.toLocaleString(), color: "text-gray-900 dark:text-white" },
                { label: "POSTO Aktif",   value: postoData.aktif.toLocaleString(),    color: "text-green-600 dark:text-green-400" },
                { label: "POSTO Expired", value: postoData.expired.toLocaleString(),  color: "text-red-600 dark:text-red-400" },
                { label: "Total Tonase",  value: `${postoData.tonase.toLocaleString()} ton`, color: "text-blue-600 dark:text-blue-400" },
              ].map((item) => (
                <Card key={item.label} className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm transition-all duration-300">
                  <CardContent className="pt-5 pb-4">
                    <p className="text-xs text-muted-foreground dark:text-gray-400 mb-1">{item.label}</p>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produk */}
        <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" /> Top 10 Produk (Tonase)
            </CardTitle>
            <CardDescription className="dark:text-gray-400">{PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {produkLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
              </div>
            )}
            {produkData && produkData.top.length > 0 ? (
              <>
                <Chart
                  type="bar"
                  series={topSeries}
                  options={topBarOptions}
                  height={Math.max(produkData.top.length * 32 + 20, 200)}
                />
                <table className="w-full text-xs mt-3 print:block text-gray-700 dark:text-gray-300">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-muted-foreground dark:text-gray-400">
                      <th className="text-left py-1">Produk</th>
                      <th className="text-right py-1">Tiket</th>
                      <th className="text-right py-1">Tonase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produkData.top.map((p, i) => (
                      <tr key={p.idProduk} className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-muted/10">
                        <td className="py-1">{i + 1}. {p.namaProduk}</td>
                        <td className="text-right py-1">{p.jumlahTiket}</td>
                        <td className="text-right py-1 font-medium">{p.totalTonase.toFixed(1)} ton</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : !produkLoading && (
              <p className="text-center text-muted-foreground dark:text-gray-400 text-sm py-8">Tidak ada data</p>
            )}
          </CardContent>
        </Card>

        {/* Bottom Produk */}
        <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-yellow-500" /> Produk Volume Kecil
            </CardTitle>
            <CardDescription className="dark:text-gray-400">Perlu perhatian — {PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {produkLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
              </div>
            )}
            {produkData && produkData.bottom.length > 0 ? (
              <>
                <Chart
                  type="bar"
                  series={bottomSeries}
                  options={bottomBarOptions}
                  height={Math.max(Math.min(produkData.bottom.length, 8) * 32 + 20, 180)}
                />
                <div className="mt-3 space-y-1.5">
                  {produkData.bottom.slice(0, 8).map((p) => (
                    <div key={p.idProduk} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground dark:text-gray-400 truncate max-w-[200px]">{p.namaProduk}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">{p.jumlahTiket} tiket</Badge>
                        <span className="font-medium w-20 text-right text-gray-900 dark:text-gray-200">{p.totalTonase.toFixed(1)} ton</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : !produkLoading && (
              <p className="text-center text-muted-foreground dark:text-gray-400 text-sm py-8">Tidak ada data</p>
            )}
          </CardContent>
        </Card>

        {/* POSTO per Produk table - full width */}
        {postoData && postoData.byProduk.length > 0 && (
          <Card className="lg:col-span-2 bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" /> Detail POSTO per Produk
              </CardTitle>
              <CardDescription className="dark:text-gray-400">{PERIOD_LABELS[period]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 dark:text-gray-300">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-muted-foreground dark:text-gray-400">
                      <th className="text-left py-2 font-semibold">Produk</th>
                      <th className="text-right py-2 font-semibold">Jumlah POSTO</th>
                      <th className="text-right py-2 font-semibold">Total Tonase</th>
                      <th className="text-right py-2 font-semibold">Rata-rata Tonase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postoData.byProduk.map((row) => (
                      <tr key={row.produk} className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-muted/30 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="py-2 font-medium text-gray-900 dark:text-white">{row.produk || "—"}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{row.count.toLocaleString()}</td>
                        <td className="text-right py-2 text-gray-900 dark:text-white">{row.tonase.toFixed(2)} ton</td>
                        <td className="text-right py-2 text-muted-foreground dark:text-gray-400">
                          {row.count > 0 ? (row.tonase / row.count).toFixed(2) : "—"} ton
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 dark:border-gray-755 font-semibold bg-muted/20 dark:bg-gray-850/50">
                      <td className="py-2 pl-2 text-gray-900 dark:text-white">Total</td>
                      <td className="text-right py-2 text-gray-900 dark:text-white">
                        {postoData.byProduk.reduce((s, r) => s + r.count, 0).toLocaleString()}
                      </td>
                      <td className="text-right py-2 text-gray-900 dark:text-white">
                        {postoData.byProduk.reduce((s, r) => s + r.tonase, 0).toFixed(2)} ton
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
