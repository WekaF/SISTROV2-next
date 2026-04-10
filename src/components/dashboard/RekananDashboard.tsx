"use client";
import React from "react";
import { 
  Package, 
  Truck, 
  Ticket, 
  TrendingUp, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const RekananDashboard = () => {
  // Mock data for initial view
  const metrics = [
    { name: "Order Aktif (Posto)", value: "24", trend: "+12%", color: "text-blue-500", icon: Package },
    { name: "Tiket Terbit", value: "156", trend: "+5%", color: "text-purple-500", icon: Ticket },
    { name: "Armada On-Duty", value: "18", trend: "0%", color: "text-emerald-500", icon: Truck },
    { name: "Selesai Hari Ini", value: "42", trend: "+8%", color: "text-orange-500", icon: CheckCircle2 },
  ];

  const historicalOptions: any = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    colors: ['#3C50E0'],
    dataLabels: { enabled: false },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0 } },
  };

  const statusOptions: any = {
    chart: { type: 'donut' },
    labels: ['Pending', 'Loading', 'In Transit', 'Completed'],
    colors: ['#F0950C', '#3C50E0', '#80CAEE', '#10B981'],
    legend: { position: 'bottom' }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {metrics.map((item) => (
          <Card key={item.name} className="shadow-theme-xs">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div className={`flex items-center text-xs font-medium ${item.trend.startsWith('+') ? 'text-emerald-500' : item.trend === '0%' ? 'text-gray-400' : 'text-red-500'}`}>
                  {item.trend}
                  {item.trend.startsWith('+') ? <ArrowUpRight className="h-4 w-4" /> : item.trend === '0%' ? null : <ArrowDownRight className="h-4 w-4" />}
                </div>
              </div>
              <div>
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</h4>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{item.name}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fulfillment History */}
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>History Pengiriman</CardTitle>
                <CardDescription>Volume pengiriman unit Anda dalam 7 hari terakhir.</CardDescription>
              </div>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
               <Chart options={historicalOptions} series={[{ name: "Shipments", data: [12, 18, 15, 22, 19, 25, 21] }]} type="area" height="100%" />
            </div>
          </CardContent>
        </Card>

        {/* Current Status Distribution */}
        <Card className="lg:col-span-4 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Status Armada</CardTitle>
            <CardDescription>Distribusi status armada saat ini.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[280px] w-full">
               <Chart options={statusOptions} series={[5, 8, 12, 18]} type="donut" height="100%" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Needed Section */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-theme-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Perhatian Diperlukan</CardTitle>
              <CardDescription>Item yang memerlukan tindakan segera dari Anda.</CardDescription>
            </div>
            <AlertCircle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "Posto Jatuh Tempo", desc: "3 Posto memerlukan pengajuan perpanjangan atau penyelesaian.", date: "Today", icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
                { title: "Armada Perlu Submit", desc: "5 Driver belum melampirkan berkas terbaru untuk tiket besok.", date: "Yesterday", icon: Truck, color: "text-blue-500", bg: "bg-blue-50" },
                { title: "Verifikasi Tiket", desc: "12 Tiket menunggu konfirmasi kedatangan di jembatan timbang.", date: "2 hours ago", icon: Ticket, color: "text-purple-500", bg: "bg-purple-50" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className={`p-2 rounded-lg ${item.bg}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h5 className="font-semibold text-gray-900 dark:text-white">{item.title}</h5>
                      <span className="text-xs text-gray-400">{item.date}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                    <button className="text-xs font-semibold text-brand-500 mt-2 hover:underline">Tindak Lanjut &rarr;</button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
