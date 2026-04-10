"use client";
import React from "react";
import { 
  Building2, 
  Warehouse, 
  Ticket, 
  Clock, 
  Users, 
  TrendingUp,
  AlertCircle,
  Map as MapIcon
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";
import dynamic from "next/dynamic";
import { IndonesiaMap } from "./IndonesiaMap";

// Dynamic import for ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export const AdminDashboard = () => {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, ticketRes] = await Promise.all([
          fetch("/api/admin/dashboard/status"),
          fetch("/api/admin/dashboard/tickets")
        ]);
        
        const statusData = await statusRes.json();
        const ticketData = await ticketRes.json();
        
        setData({ ...statusData, ...ticketData });
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Use fetched data or fallbacks
  const stats = [
    { 
      name: "Active Plants", 
      value: data?.activePlants?.toString() || "24", 
      subValue: `${data?.inactivePlants || 4} Inactive`, 
      icon: Building2, 
      color: "text-blue-500", 
      bg: "bg-blue-50" 
    },
    { 
      name: "Global Warehouses", 
      value: data?.totalWarehouses?.toString() || "156", 
      subValue: `Across ${data?.regions || 8} regions`, 
      icon: Warehouse, 
      color: "text-purple-500", 
      bg: "bg-purple-50" 
    },
    { 
      name: "Avg. Loading Time", 
      value: `${data?.avgLoadingTime || 42}m`, 
      subValue: data?.trend === "up" ? "+2m from avg" : "-5m from last week", 
      icon: Clock, 
      color: "text-emerald-500", 
      bg: "bg-emerald-50" 
    },
    { 
      name: "Current Total Queue", 
      value: data?.currentQueue?.toString() || "892", 
      subValue: "Units waiting", 
      icon: Users, 
      color: "text-orange-500", 
      bg: "bg-orange-50" 
    },
  ];

  const chartOptions: any = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100, 100, 100]
      }
    },
    dataLabels: { enabled: false },
    colors: ['#3C50E0'],
    xaxis: {
      categories: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '00:00'],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
    grid: { borderColor: '#f1f1f1', strokeDashArray: 4 },
    tooltip: { x: { show: false } },
  };

  const chartSeries = [{
    name: 'Units in Queue',
    data: [45, 120, 301, 250, 180, 90, 30]
  }];

  return (
    <div className="space-y-6">
      {/* 1. Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {stats.map((item) => (
          <Card key={item.name} className="shadow-theme-xs">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                  <item.icon className="h-6 w-6" />
                </div>
                {item.name === "Avg. Loading Time" && (
                  <Badge color="success" size="sm">Excellent</Badge>
                )}
              </div>
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {item.name}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {item.value}
                  </h4>
                  <span className="text-xs text-gray-400 font-normal">
                    {item.subValue}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 2. Map Section (Main Content) */}
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Regional Operations Map</CardTitle>
            <CardDescription>Visualizing plant activity across Indonesia.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full bg-gray-50 dark:bg-white/[0.02] rounded-xl flex items-center justify-center p-4">
               <IndonesiaMap />
            </div>
          </CardContent>
        </Card>

        {/* 3. Real-time Performance / Queue Stats */}
        <Card className="lg:col-span-4 shadow-theme-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Peak Queue Hours</CardTitle>
              <CardDescription>Live monitoring of arrival patterns.</CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-brand-500" />
          </CardHeader>
          <CardContent>
            <div className="h-[250px] -ml-4">
              <Chart
                options={chartOptions}
                series={chartSeries}
                type="area"
                height="100%"
                width="100%"
              />
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                  <span className="text-gray-600 dark:text-gray-400">System Capacity</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">82%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="bg-brand-500 h-full w-[82%]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Bottom Grid: Specific Operational Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-theme-xs">
          <CardHeader>
            <CardTitle className="text-lg">Recent Delays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {[1, 2, 3].map((i) => (
               <div key={i} className="flex items-center gap-4 p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                 <AlertCircle className="h-5 w-5 text-red-500" />
                 <div className="flex-grow">
                   <p className="text-sm font-medium text-gray-900 dark:text-white">Plant Gresik - Section B</p>
                   <p className="text-xs text-gray-500">Wait time exceeded 2 hours</p>
                 </div>
                 <Badge color="error" size="sm">High</Badge>
               </div>
             ))}
          </CardContent>
        </Card>
        
        {/* Placeholder for future detailed widgets */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 flex items-center justify-center text-gray-400">
           Additional Warehouse & Transit Stats Will Appear Here
        </div>
      </div>
    </div>
  );
};
