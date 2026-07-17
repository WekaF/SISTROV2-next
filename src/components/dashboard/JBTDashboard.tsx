"use client";
import React, { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useStaffAreaStream } from "@/hooks/use-staffarea-stream";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  Scale, ClipboardCheck, Printer, AlertCircle,
  Clock, CheckCircle2, FileText, ArrowRightLeft 
} from "lucide-react";
import Badge from "@/components/ui/badge/Badge";
import { useApi } from "@/hooks/use-api";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";

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

export default function JBTDashboard() {
  const { activeCompanyCode } = useCompany();
  const { data: streamData, status: streamStatus } = useStaffAreaStream(activeCompanyCode);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"tara" | "bruto" | "completed">("tara");

  const { apiTable, token } = useApi();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetcher = async (params: DataTableParams) => {
    if (!token) return { data: [], recordsTotal: 0, recordsFiltered: 0 };
    // Map tab to ticket position
    const position = activeTab === "tara" ? "01" : activeTab === "bruto" ? "05" : "07";
    
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
          { data: "tanggal", name: "tanggal", searchable: false, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: params.columnFilters?.bookingno || "" } },
          { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: params.columnFilters?.nopol || "" } },
          { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: params.columnFilters?.driver || "" } },
          { data: "produkString", name: "idproduk", searchable: true, orderable: true, search: { value: params.columnFilters?.produkString || "" } },
        ]
      });

      return {
        data: result?.data ?? [],
        recordsTotal: result?.recordsTotal ?? 0,
        recordsFiltered: result?.recordsFiltered ?? result?.recordsTotal ?? 0,
      };
    } catch (error) {
      console.error("JBT Tickets Fetch Error:", error);
      return { data: [], recordsTotal: 0, recordsFiltered: 0 };
    }
  };

  const columns: DataTableColumn<TicketData>[] = [
    {
      key: "bookingno",
      header: "No Booking / Tiket",
      searchable: true,
      render: (t) => (
        <div className="flex flex-col font-mono text-xs">
          <span className="font-bold text-gray-900 dark:text-white">{t.bookingno}</span>
          {t.tiketno && <span className="text-[10px] text-gray-400">{t.tiketno}</span>}
        </div>
      ),
    },
    {
      key: "nopol",
      header: "Plat Nomor",
      searchable: true,
      render: (t) => <span className="font-bold font-mono text-gray-900 dark:text-white text-xs">{t.nopol}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      searchable: true,
      render: (t) => <span className="text-gray-600 dark:text-gray-400 text-xs">{t.driver}</span>,
    },
    {
      key: "produkString",
      header: "Produk",
      searchable: true,
      render: (t) => <span className="text-gray-500 text-xs">{t.produkString}</span>,
    },
    {
      key: "transportString",
      header: "Transportir",
      render: (t) => <span className="text-gray-500 text-[11px] truncate block max-w-[120px]">{t.transportString}</span>,
    },
    {
      key: "qty",
      header: "Qty (Ton)",
      render: (t) => <span className="font-mono font-bold text-xs">{(t.qty ?? 0).toLocaleString("id-ID")} T</span>,
    },
    {
      key: "position",
      header: "Status Timbang",
      render: (t) => {
        const isTara = t.position === "01";
        const isBruto = t.position === "05";
        return (
          <div className="flex justify-end gap-1.5 items-center">
            {isTara ? (
              <Badge color="warning" size="sm">Timbang Tara</Badge>
            ) : isBruto ? (
              <Badge color="info" size="sm">Timbang Bruto</Badge>
            ) : (
              <Badge color="success" size="sm">Selesai</Badge>
            )}
          </div>
        );
      },
    },
  ];

  if (!mounted) return null;

  const antriAktif = streamData?.antriAktif ?? 0;
  const proses = streamData?.proses ?? 0;
  const selesai = streamData?.selesai ?? 0;
  const totalTonase = streamData?.totalTonase ?? 0;
  const overdueCount = streamData?.overdueCount ?? 0;
  const avgDurasiMenit = streamData?.avgDurasiMenit ?? 0;
  const shiftBreakdown = streamData?.shiftBreakdown ?? { pagi: 0, siang: 0, malam: 0 };

  return (
    <div className="space-y-6">
      {/* Real-time Status Banner */}
      <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-100 rounded-2xl dark:bg-teal-900/10 dark:border-teal-900/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-teal-900 dark:text-teal-300">Weighbridge (JBT) Station Monitor</h3>
            <p className="text-xs text-teal-700 dark:text-teal-400">
              Measuring Bruto, Tara, Netto weights per vehicle. Stream:{" "}
              <span className={`font-semibold capitalize ${streamStatus === "live" ? "text-emerald-600" : "text-amber-500"}`}>
                {streamStatus}
              </span>
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Sensor State: <span className="text-emerald-600 font-bold">ONLINE (CALIBRATED)</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Antri Timbang Kosong</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{antriAktif}</h2>
              <div className="pt-0.5">
                {antriAktif >= 5 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-100/50 dark:border-rose-900/30">
                    Antrian Padat (~{antriAktif * 3} m)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-900/30">
                    Lancar (~2 m)
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl dark:bg-amber-900/20 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Antri Timbang Isi</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{proses}</h2>
              <div className="pt-0.5">
                {proses >= 5 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-100/50 dark:border-rose-900/30">
                    Timbangan Padat
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100/50 dark:border-blue-900/30">
                    Normal
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-900/20 dark:text-blue-400">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selesai Ditimbang</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{selesai}</h2>
              <p className="text-[10px] text-gray-400">Armada ditimbang hari ini</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl dark:bg-emerald-900/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Netto Muatan</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">
                {totalTonase.toLocaleString("id-ID")} <span className="text-sm font-bold text-gray-500">T</span>
              </h2>
              <p className="text-[10px] text-gray-400">Total berat bersih keluar</p>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl dark:bg-teal-900/20">
              <Scale className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weighing Activity */}
        <Card className="lg:col-span-2 border-gray-200 dark:border-gray-800">
          <CardHeader className="py-4 px-5 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Recent Penimbangan Logs</CardTitle>
              <CardDescription className="text-xs text-gray-400">Catatan penimbangan bruto, tara, dan netto teraktual</CardDescription>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/[0.04] p-1 rounded-lg self-start">
              <button
                onClick={() => setActiveTab("tara")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  activeTab === "tara" 
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                }`}
              >
                Timbang Tara
              </button>
              <button
                onClick={() => setActiveTab("bruto")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  activeTab === "bruto" 
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                }`}
              >
                Timbang Bruto
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  activeTab === "completed" 
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" 
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                }`}
              >
                Selesai
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <DataTable
              key={activeTab} // Forces table re-render when changing tabs
              columns={columns}
              queryKey={["jbt-tickets", activeCompanyCode, activeTab]}
              fetcher={fetcher}
              defaultPageSize={5}
              rowKey={(t) => t.bookingno}
              searchPlaceholder="Cari Plat No, Driver, atau Booking No..."
            />
          </CardContent>
        </Card>

        {/* Weighing station calibration / alert warnings */}
        <div className="space-y-6">
          {overdueCount > 0 && (
            <Card className="border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-300 shadow-sm animate-in fade-in duration-300">
              <CardContent className="p-4 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide">Pemberitahuan Overdue</span>
                  <p className="text-xs text-red-700/90 dark:text-red-400/90">
                    Ada <strong>{overdueCount} armada</strong> tertahan di area timbang lebih dari 2 jam.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader className="py-4 px-5 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-brand-500" /> Weighing Alerts & Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 flex gap-3 text-xs">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <span className="font-bold">Zero ODOL Compliance</span>
                  <p className="mt-0.5 text-amber-600/80 dark:text-amber-400/80">
                    Netto weight exceeding the maximum allowed capacity for truck class will block ticket sign-off and exit gate checkout.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 flex gap-3 text-xs">
                <ClipboardCheck className="h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-bold">Daily Calibration Check</span>
                  <p className="mt-0.5 text-blue-600/80 dark:text-blue-400/80">
                    Scale calibration verified at 06:00 UTC. Next verification at 22:00 UTC. Zero point balance is stable.
                  </p>
                </div>
              </div>

              {/* Shift Stats & Average Duration */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durasi Rata-rata</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {avgDurasiMenit} Menit
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Armada Per Shift (Today)</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-gray-800/50 rounded">
                      <span className="block text-[9px] text-gray-400 uppercase">Shift 1</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{shiftBreakdown.pagi}</span>
                    </div>
                    <div className="py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-gray-800/50 rounded">
                      <span className="block text-[9px] text-gray-400 uppercase">Shift 2</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{shiftBreakdown.siang}</span>
                    </div>
                    <div className="py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-gray-800/50 rounded">
                      <span className="block text-[9px] text-gray-400 uppercase">Shift 3</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{shiftBreakdown.malam}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
