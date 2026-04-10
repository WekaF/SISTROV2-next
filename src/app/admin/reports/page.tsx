"use client";
import React from "react";
import { 
  FileText, 
  Calendar, 
  Download, 
  Search,
  PieChart as PieChartIcon,
  BarChart,
  LineChart
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ReportsPage() {
  const chartOptions: any = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    fill: { opacity: 1, colors: ['#3C50E0', '#80CAEE'] },
    tooltip: { y: { formatter: (val: number) => val + " Tiket" } },
  };

  const chartSeries = [
    { name: 'Gresik', data: [44, 55, 57, 56, 61, 58, 63] },
    { name: 'Kujang', data: [35, 41, 36, 26, 45, 48, 52] }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logistics Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Analisis data statistik tiket dan performa operasional.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" /> Apr 2026</Button>
           <Button size="sm"><Download className="h-4 w-4 mr-2" /> Download All</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
             <CardTitle>Ticket Volume Trends</CardTitle>
             <CardDescription>Perbandingan volume tiket antar plant minggu ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
               <Chart options={chartOptions} series={chartSeries} type="bar" height="100%" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle>Available Reports</CardTitle>
             <CardDescription>Daftar laporan yang dapat diunduh.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {[
               { name: "Daily Ticket Summary", desc: "Statistik harian seluruh plant", icon: FileText },
               { name: "Monthly Performance", desc: "KPI pencapaian bongkar muat", icon: BarChart },
               { name: "Vendor Analytics", desc: "Performa antrian per rekanan", icon: PieChartIcon },
             ].map((report) => (
               <div key={report.name} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer group transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-gray-100 rounded-lg dark:bg-gray-800 text-gray-400 group-hover:text-brand-500 group-hover:bg-brand-50 transition-colors">
                        <report.icon className="h-5 w-5" />
                     </div>
                     <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">{report.name}</h4>
                        <p className="text-xs text-gray-500">{report.desc}</p>
                     </div>
                  </div>
                  <Button variant="ghost" size="icon-sm">
                     <Download className="h-4 w-4" />
                  </Button>
               </div>
             ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
           <CardTitle>Data Table Perspective</CardTitle>
           <CardDescription>Rangkuman data mentah untuk audit.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl text-gray-400">
              Detailed Reporting Table Integration
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
