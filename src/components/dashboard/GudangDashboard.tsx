"use client";
import React, { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useStaffAreaStream } from "@/hooks/use-staffarea-stream";
import { useApi } from "@/hooks/use-api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  Building2, History, Package, Play, 
  CheckCircle2, Clock, BarChart3, ListOrdered, Ticket 
} from "lucide-react";
import dynamic from "next/dynamic";
import Badge from "@/components/ui/badge/Badge";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface TicketData {
  bookingno: string;
  tiketno?: string;
  nopol: string;
  driver: string;
  produkString: string;
  transportString: string;
  qty?: number;
  position: string;
  positionString?: string;
  tanggalString: string;
}

export default function GudangDashboard() {
  const { activeCompanyCode } = useCompany();
  const { data: streamData, status: streamStatus } = useStaffAreaStream(activeCompanyCode);
  const { apiTable, token } = useApi();
  const [mounted, setMounted] = useState(false);
  
  // Tabs: "waiting" (02 = Gudang Queue), "loading" (03 = Pemuatan/Muat), "completed" (07/08 = Selesai)
  const [activeTab, setActiveTab] = useState<"waiting" | "loading" | "completed">("waiting");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const antriAktif = streamData?.antriAktif ?? 0;
  const proses = streamData?.proses ?? 0;
  const selesai = streamData?.selesai ?? 0;
  const totalTonase = streamData?.totalTonase ?? 0;

  // Gudang Breakdown Chart options
  const gudangCategories = streamData?.gudangBreakdown?.map((g: any) => g.gudang) ?? [];
  const gudangData = streamData?.gudangBreakdown?.map((g: any) => g.count) ?? [];
  const chartOptions: any = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
    colors: ["#3C50E0", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#36B9CC"],
    xaxis: { categories: gudangCategories, labels: { style: { fontSize: "11px" } } },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    legend: { show: false },
    grid: { borderColor: "#E2E8F0", strokeDashArray: 4 },
  };
  const chartSeries = [{ name: "Antrian", data: gudangData }];

  const fetcher = async (params: DataTableParams) => {
    if (!token) return { data: [], recordsTotal: 0, recordsFiltered: 0 };
    // Map tab to ticket position
    const position = activeTab === "waiting" ? "02" : activeTab === "loading" ? "03" : "04";
    
    try {
      const result = await apiTable("/api/Tiket/DataTableFilterLegacy", {
        draw: params.draw,
        start: params.start,
        length: params.length,
        search: { value: params.search },
        companyCode: activeCompanyCode ?? undefined,
        position,
        order: [{ column: 0, dir: "desc" }],
        columns: [
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "produkString", name: "idproduk", searchable: true, orderable: true },
        ]
      });

      return {
        data: result?.data ?? [],
        recordsTotal: result?.recordsTotal ?? 0,
        recordsFiltered: result?.recordsFiltered ?? result?.recordsTotal ?? 0,
      };
    } catch (error) {
      console.error("Gudang Tickets Fetch Error:", error);
      return { data: [], recordsTotal: 0, recordsFiltered: 0 };
    }
  };

  const columns: DataTableColumn<TicketData>[] = [
    {
      key: "bookingno",
      header: "No Booking / Tiket",
      render: (t) => (
        <div className="flex flex-col">
          <span className="font-mono font-bold text-gray-900 dark:text-white">{t.bookingno}</span>
          {t.tiketno && <span className="text-[10px] text-gray-400 font-mono">{t.tiketno}</span>}
        </div>
      ),
    },
    {
      key: "nopol",
      header: "Plat Nomor",
      render: (t) => <span className="font-bold font-mono text-gray-800 dark:text-gray-200">{t.nopol}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      render: (t) => <span className="text-gray-600 dark:text-gray-400">{t.driver}</span>,
    },
    {
      key: "produkString",
      header: "Produk",
      render: (t) => <span className="font-semibold text-brand-600 dark:text-brand-400">{t.produkString}</span>,
    },
    {
      key: "transportString",
      header: "Transportir",
      render: (t) => <span className="text-gray-500 text-xs">{t.transportString}</span>,
    },
    {
      key: "qty",
      header: "Qty (Ton)",
      render: (t) => <span className="font-mono font-bold">{(t.qty ?? 0).toLocaleString("id-ID")} T</span>,
    },
    {
      key: "positionString",
      header: "Status Posisi",
      render: (t) => (
        <Badge 
          color={
            t.position === "04" || t.position === "08" || t.position === "07" ? "success" 
            : t.position === "03" ? "info" 
            : "warning"
          } 
          size="sm"
        >
          {t.positionString || (t.position === "03" ? "Sedang Dimuat" : t.position === "02" ? "Menunggu Antrian" : t.position === "04" ? "Checkout Gudang" : "Selesai")}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live status info */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl dark:bg-blue-900/10 dark:border-blue-900/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900 dark:text-brand-300">Warehouse Loading Status</h3>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Monitoring loader efficiency & queue by product. Stream:{" "}
              <span className={`font-semibold capitalize ${streamStatus === "live" ? "text-emerald-600" : "text-amber-500"}`}>
                {streamStatus}
              </span>
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Shift Active: {new Date().getHours() >= 14 && new Date().getHours() < 22 ? "Shift 2 (Siang)" : new Date().getHours() >= 22 || new Date().getHours() < 6 ? "Shift 3 (Malam)" : "Shift 1 (Pagi)"}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Antri Gudang</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{antriAktif}</h2>
              <p className="text-[10px] text-gray-400">Truk menunggu dimuat</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl dark:bg-amber-900/20">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sedang Dimuat</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{proses}</h2>
              <p className="text-[10px] text-gray-400">Truk aktif di loading line</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-900/20">
              <Play className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selesai Dimuat</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{selesai}</h2>
              <p className="text-[10px] text-gray-400">Truk selesai muat hari ini</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl dark:bg-emerald-900/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Tonase</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">
                {totalTonase.toLocaleString("id-ID")} <span className="text-sm font-bold text-gray-500">T</span>
              </h2>
              <p className="text-[10px] text-gray-400">Tonase terealisasi hari ini</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl dark:bg-indigo-900/20">
              <Package className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Loading Bays & Tickets list */}
        <Card className="lg:col-span-2 border-gray-200 dark:border-gray-800">
          <CardHeader className="py-4 px-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Daftar Pemuatan Truk</CardTitle>
                <CardDescription className="text-xs text-gray-400">Manajemen antrian pemuatan, truk aktif, dan riwayat selesai</CardDescription>
              </div>
              
              {/* Tab Switcher */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/[0.04] p-1 rounded-lg self-start">
                <button
                  onClick={() => setActiveTab("waiting")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activeTab === "waiting" 
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" 
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                  }`}
                >
                  Menunggu Dimuat
                </button>
                <button
                  onClick={() => setActiveTab("loading")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activeTab === "loading" 
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" 
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                  }`}
                >
                  Sedang Dimuat
                </button>
                <button
                  onClick={() => setActiveTab("completed")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    activeTab === "completed" 
                      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" 
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                  }`}
                >
                  Selesai Dimuat
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <DataTable
              key={activeTab} // Forces table re-render when changing tabs
              columns={columns}
              queryKey={["gudang-tickets", activeCompanyCode, activeTab]}
              fetcher={fetcher}
              defaultPageSize={5}
              rowKey={(t) => t.bookingno}
              searchPlaceholder="Cari Plat No, Driver, atau Booking No..."
            />
          </CardContent>
        </Card>

        {/* Queue chart */}
        <Card className="border-gray-200 dark:border-gray-800">
          <CardHeader className="py-4 px-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand-500" /> Antrian Per Gudang
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {gudangData.length > 0 ? (
              <Chart 
                options={chartOptions} 
                series={chartSeries} 
                type="bar" 
                height={260} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <ListOrdered className="h-10 w-10 mb-2 opacity-50" />
                <span className="text-xs">Tidak ada antrian aktif di gudang.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
