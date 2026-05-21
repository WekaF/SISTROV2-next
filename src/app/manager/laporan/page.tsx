"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { FileText, Loader2, Package, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

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

export default function ManagerLaporanPage() {
  const [period, setPeriod] = useState<Period>("month");

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

  const topBarOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true } },
    colors: ["#22c55e"],
    xaxis: { labels: { formatter: (v) => `${Number(v).toFixed(0)} ton` } },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (v) => `${v.toFixed(2)} ton` } },
  };

  const topSeries = [{
    name: "Tonase",
    data: produkData?.top.map(p => ({ x: p.namaProduk, y: Math.round(p.totalTonase) })) || [],
  }];

  const bottomBarOptions: ApexCharts.ApexOptions = {
    ...topBarOptions,
    colors: ["#f59e0b"],
  };

  const bottomSeries = [{
    name: "Tonase",
    data: produkData?.bottom.slice(0, 5).map(p => ({ x: p.namaProduk, y: Math.round(p.totalTonase) })) || [],
  }];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Laporan Pimpinan</h1>
            <p className="text-sm text-muted-foreground">Statistik produk &amp; POSTO</p>
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

      {/* POSTO Summary */}
      {postoData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total POSTO", value: postoData.total, color: "text-foreground" },
            { label: "POSTO Aktif", value: postoData.aktif, color: "text-green-600" },
            { label: "POSTO Expired", value: postoData.expired, color: "text-red-600" },
            { label: "Total Tonase", value: `${postoData.tonase.toLocaleString()} ton`, color: "text-blue-600" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" /> Top Produk (Tonase)
            </CardTitle>
            <CardDescription>{PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {produkLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Memuat...</div>}
            {produkData && produkData.top.length > 0 ? (
              <Chart type="bar" series={topSeries} options={topBarOptions} height={280} />
            ) : !produkLoading && (
              <p className="text-center text-muted-foreground text-sm py-8">Tidak ada data</p>
            )}
          </CardContent>
        </Card>

        {/* Bottom Produk */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-yellow-500" /> Produk Volume Kecil
            </CardTitle>
            <CardDescription>Perlu perhatian — {PERIOD_LABELS[period]}</CardDescription>
          </CardHeader>
          <CardContent>
            {produkData && produkData.bottom.length > 0 ? (
              <>
                <Chart type="bar" series={bottomSeries} options={bottomBarOptions} height={200} />
                <div className="mt-3 space-y-1">
                  {produkData.bottom.slice(0, 5).map((p) => (
                    <div key={p.idProduk} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[180px]">{p.namaProduk}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{p.jumlahTiket} tiket</Badge>
                        <span className="font-medium">{p.totalTonase.toFixed(1)} ton</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : !produkLoading && (
              <p className="text-center text-muted-foreground text-sm py-8">Tidak ada data</p>
            )}
          </CardContent>
        </Card>

        {/* POSTO by Produk */}
        {postoData && postoData.byProduk.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" /> POSTO per Produk
              </CardTitle>
              <CardDescription>{PERIOD_LABELS[period]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2">Produk</th>
                      <th className="text-right py-2">Jumlah POSTO</th>
                      <th className="text-right py-2">Total Tonase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postoData.byProduk.map((row) => (
                      <tr key={row.produk} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2">{row.produk || "—"}</td>
                        <td className="text-right py-2">{row.count.toLocaleString()}</td>
                        <td className="text-right py-2 font-medium">{row.tonase.toFixed(2)} ton</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
