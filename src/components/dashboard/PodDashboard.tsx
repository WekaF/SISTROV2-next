"use client";
import React from "react";
import { 
  Building2, 
  Warehouse, 
  Ticket, 
  Clock, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Package,
  Truck,
  BarChart3,
  Timer
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const PodDashboard = () => {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/pod/dashboard/metrics");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("POD fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 1. Daily Summary Metrics
  const dailyMetrics = [
    { name: "Total Tonase Hari Ini", value: `${data?.tonnage?.toLocaleString() || '8,450'} Ton`, trend: "+12%", color: "text-blue-500", bg: "bg-blue-50" },
    { name: "Total Tiket", value: data?.totalTickets?.toLocaleString() || "1,280", trend: "+5%", color: "text-purple-500", bg: "bg-purple-50" },
    { name: "Selesai Muat", value: data?.completed?.toLocaleString() || "945", trend: "+8%", color: "text-emerald-500", bg: "bg-emerald-50" },
    { name: "Sedang Proses", value: data?.inProcess?.toLocaleString() || "335", trend: "-2%", color: "text-orange-500", bg: "bg-orange-50" },
  ];

  // 2. Charts Data
  const trendOptions: any = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['1 Mar', '5 Mar', '10 Mar', '15 Mar', '20 Mar', '25 Mar', '30 Mar'] },
    colors: ['#3C50E0'],
    dataLabels: { enabled: false },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0 } },
  };

  const transportirOptions: any = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: ['TIKI', 'JNE', 'Pos Logistik', 'Siba Surya', 'Puninar'] },
    colors: ['#3C50E0'],
  };

  const productOptions: any = {
    chart: { type: 'donut' },
    labels: ['Urea Sub', 'Urea Non-Sub', 'NPK Phonska', 'ZA', 'SP-36'],
    colors: ['#3C50E0', '#80CAEE', '#0FADCF', '#F0950C', '#6577F3'],
    legend: { position: 'bottom' }
  };

  return (
    <div className="space-y-6">
      {/* Daily Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {dailyMetrics.map((item) => (
          <Card key={item.name} className="shadow-theme-xs">
            <CardContent className="p-6">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.name}</span>
              <div className="flex items-center justify-between mt-2">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</h4>
                <div className={`flex items-center text-xs font-medium ${item.trend.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}`}>
                  {item.trend.startsWith('+') ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {item.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content: Trends and Stok */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Statistik Tiket (30 Hari)</CardTitle>
                <CardDescription>Volume pengeluaran barang per hari.</CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
               <Chart options={trendOptions} series={[{ name: "Ticket Volume", data: [450, 520, 490, 600, 580, 710, 680] }]} type="area" height="100%" />
            </div>
          </CardContent>
        </Card>

        {/* Stok Gudang Widget */}
        <Card className="lg:col-span-4 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Stock Gudang (Plant Assigned)</CardTitle>
            <CardDescription>Ketersediaan stok di unit Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { label: "Gudang I - Gresik", value: 85, color: "bg-brand-500" },
              { label: "Gudang II - Gresik", value: 62, color: "bg-purple-500" },
              { label: "Gudang Penyangga A", value: 34, color: "bg-orange-500" },
            ].map((stok) => (
              <div key={stok.label} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-600 dark:text-gray-400">{stok.label}</span>
                  <span className="text-gray-900 dark:text-white">{stok.value}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <div className={`h-full rounded-full ${stok.color}`} style={{ width: `${stok.value}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
               <div className="flex items-center gap-2 text-xs text-brand-500 font-medium cursor-pointer hover:underline">
                 Lihat Detail Semua Gudang <ArrowUpRight className="h-3 w-3" />
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings and Product Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-theme-xs">
          <CardHeader>
            <CardTitle>Transportir Paling Aktif</CardTitle>
            <CardDescription>Berdasarkan volume tiket yang diselesaikan.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[250px]">
                <Chart options={transportirOptions} series={[{ name: "Total Tiket", data: [440, 320, 210, 180, 150] }]} type="bar" height="100%" />
             </div>
          </CardContent>
        </Card>

        <Card className="shadow-theme-xs">
          <CardHeader>
            <CardTitle>Distribusi Produk</CardTitle>
            <CardDescription>Produk yang paling sering dipesan.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="h-[250px] flex items-center justify-center">
                <Chart options={productOptions} series={[44, 30, 15, 7, 4]} type="donut" height="100%" />
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Speed and Queue Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-12 shadow-theme-xs">
          <CardHeader>
             <CardTitle>Operational Performance (Speed & Queue)</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Speed Card */}
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      <Timer className="h-4 w-4 text-emerald-500" />
                      Ticket Speed Analytics
                   </div>
                   <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                         <span className="text-xs text-gray-500 uppercase">Fastest Loading</span>
                         <span className="text-sm font-bold text-emerald-500">28 Menit</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                         <span className="text-xs text-gray-500 uppercase">Slowest Loading</span>
                         <span className="text-sm font-bold text-red-500">2.5 Jam</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                         <span className="text-xs text-gray-500 uppercase">Average Process</span>
                         <span className="text-sm font-bold text-blue-500">45 Menit</span>
                      </div>
                   </div>
                </div>

                {/* Queue Distribution */}
                <div className="md:col-span-2 space-y-4">
                   <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                      <Users className="h-4 w-4 text-brand-500" />
                      Queue Distribution (Gate vs Warehouse)
                   </div>
                   <div className="h-[180px] w-full border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                      Detailed Queue Heatmap Visualization
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg text-center">
                         <p className="text-xs text-gray-500 mb-1">Gate Wait</p>
                         <p className="text-lg font-bold text-gray-900 dark:text-white">15m</p>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg text-center">
                         <p className="text-xs text-gray-500 mb-1">Warehouse Wait</p>
                         <p className="text-lg font-bold text-gray-900 dark:text-white">35m</p>
                      </div>
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
