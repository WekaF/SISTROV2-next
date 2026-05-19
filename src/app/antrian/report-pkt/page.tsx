"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Truck, Search } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TruckItem {
  NoPol: string;
  Sopir: string;
  KodeBooking: string;
  Produk: string;
  Plant: string;
  NoPosto: string;
  NamaKabupaten: string;
  TanggalMuat: string;
  Kabupaten: string;
  GudangTujuanDesk: string;
  Tonase: string;
  TrafficStatus: string;
  Color: string;
}

interface ReportPKTResponse {
  Success: boolean;
  data: Record<string, TruckItem[]>;
  Date: string;
  Company: string;
}

function getBorderColor(color: string): string {
  switch (color?.toLowerCase()) {
    case "crimson":
      return "#DC143C";
    case "gold":
      return "#FFD700";
    case "darkcyan":
      return "#008B8B";
    case "royalblue":
      return "#4169E1";
    default:
      return "#9CA3AF";
  }
}

function getStatusLabel(color: string): string {
  switch (color?.toLowerCase()) {
    case "crimson":
      return "Merah";
    case "gold":
      return "Kuning";
    case "darkcyan":
      return "Hijau";
    case "royalblue":
      return "Biru";
    default:
      return "Normal";
  }
}

function parseTanggalMuat(val: string): string {
  if (!val) return "-";
  // .NET JSON date: /Date(1234567890123)/
  const match = val.match(/\/Date\((\d+)\)\//);
  if (match) {
    const ts = parseInt(match[1], 10);
    return new Date(ts).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  try {
    return new Date(val).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return val;
  }
}

function TruckCard({ truck }: { truck: TruckItem }) {
  const borderColor = getBorderColor(truck.Color);
  const statusLabel = getStatusLabel(truck.Color);

  const detailRows: { label: string; value: string }[] = [
    { label: "Booking", value: truck.KodeBooking },
    { label: "Tanggal Muat", value: parseTanggalMuat(truck.TanggalMuat) },
    { label: "Produk", value: truck.Produk },
    { label: "POSTO", value: truck.NoPosto },
    { label: "Tujuan", value: truck.NamaKabupaten || truck.Kabupaten || "-" },
    { label: "Gudang", value: truck.GudangTujuanDesk || "-" },
    { label: "Tonase", value: `${Number(truck.Tonase).toLocaleString("id-ID")} Ton` },
  ];

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden w-full flex-shrink-0"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor, borderLeftStyle: "solid" }}
    >
      <div className="p-3.5 space-y-2">
        {/* NoPol + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="inline-flex items-center px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[13px] font-mono font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
            {truck.NoPol}
          </div>
          <span
            className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ backgroundColor: borderColor + "22", color: borderColor }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Sopir */}
        <p className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase truncate">
          {truck.Sopir}
        </p>

        {/* Detail list */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-1">
          {detailRows.map((row) => (
            <div key={row.label} className="flex justify-between items-start gap-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex-shrink-0">
                {row.label}
              </span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 text-right leading-tight max-w-[170px] break-words">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportSection({
  label,
  data,
  isLoading,
  error,
}: {
  label: string;
  data: Record<string, TruckItem[]>;
  isLoading: boolean;
  error: string | null;
}) {
  const checkpoints = Object.keys(data);
  const totalTrucks = checkpoints.reduce((acc, cp) => acc + (data[cp]?.length ?? 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 font-bold uppercase tracking-widest animate-pulse text-[11px]">
        Memuat data {label}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (checkpoints.length === 0) {
    return (
      <div className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest py-10 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        Belum ada data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {totalTrucks} truk aktif
        </span>
        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
      </div>

      {/* Horizontal Kanban Grid */}
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {checkpoints.map((cp) => {
          const trucks = data[cp] ?? [];
          return (
            <div
              key={cp}
              className="w-[320px] flex-shrink-0 flex flex-col bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-[12px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                    {cp}
                  </span>
                </div>
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full flex-shrink-0">
                  {trucks.length}
                </span>
              </div>

              {/* Column Body - Vertical List of Cards */}
              <div className="p-3 flex flex-col gap-3 overflow-y-auto max-h-[65vh] custom-scrollbar">
                {trucks.length === 0 ? (
                  <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-8">
                    Kosong
                  </p>
                ) : (
                  trucks.map((truck, idx) => (
                    <TruckCard key={`${truck.NoPol}-${idx}`} truck={truck} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReportPKTPage() {
  const { apiJson } = useApi();

  // Realtime state
  const [realtimeData, setRealtimeData] = useState<Record<string, TruckItem[]>>({});
  const [realtimeDate, setRealtimeDate] = useState<string>("");
  const [isLoadingRealtime, setIsLoadingRealtime] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);

  // History state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [historyData, setHistoryData] = useState<Record<string, TruckItem[]>>({});
  const [historyDate, setHistoryDate] = useState<string>("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFetched, setHistoryFetched] = useState(false);

  const fetchRealtime = useCallback(async () => {
    setIsLoadingRealtime(true);
    setRealtimeError(null);
    try {
      const res = await apiJson<ReportPKTResponse>("/api/Antrian/ReportPKT");
      // Defensively support both uppercase and lowercase properties
      const isSuccess = res?.Success || (res as any)?.success || res?.data;
      if (isSuccess) {
        setRealtimeData(res.data || {});
        setRealtimeDate(res.Date || (res as any).date || "");
      } else {
        setRealtimeError("Server mengembalikan respons tidak berhasil.");
      }
    } catch (err: any) {
      setRealtimeError(err?.message || "Gagal mengambil data realtime.");
    } finally {
      setIsLoadingRealtime(false);
    }
  }, [apiJson]);

  useEffect(() => {
    fetchRealtime();
  }, [fetchRealtime]);

  const fetchHistory = useCallback(async () => {
    if (!startDate || !endDate) return;
    setIsLoadingHistory(true);
    setHistoryError(null);
    setHistoryFetched(false);
    try {
      const res = await apiJson<ReportPKTResponse>(
        `/api/Antrian/ReportPKTHistory?startDate=${startDate}&endDate=${endDate}`
      );
      // Defensively support both uppercase and lowercase properties
      const isSuccess = res?.Success || (res as any)?.success || res?.data;
      if (isSuccess) {
        setHistoryData(res.data || {});
        setHistoryDate(res.Date || (res as any).date || "");
        setHistoryFetched(true);
      } else {
        setHistoryError("Server mengembalikan respons tidak berhasil.");
      }
    } catch (err: any) {
      setHistoryError(err?.message || "Gagal mengambil data history.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [apiJson, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Report PKT
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-tight">
            Monitoring real-time checkpoint Pupuk Kalimantan Timur.
            {realtimeDate && (
              <span className="ml-2 text-slate-400">Per: {realtimeDate}</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 bg-white border-2 font-bold uppercase text-[10px] tracking-widest"
          onClick={fetchRealtime}
          disabled={isLoadingRealtime}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoadingRealtime ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Realtime section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
            Realtime
          </h2>
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
        </div>
        <ReportSection
          label="realtime"
          data={realtimeData}
          isLoading={isLoadingRealtime}
          error={realtimeError}
        />
      </section>

      {/* History section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
            History
          </h2>
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
        </div>

        {/* Date range picker */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 mb-5">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Tanggal Mulai
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-44"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Tanggal Selesai
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-44"
              />
            </div>
            <Button
              className="h-10 gap-2 bg-slate-900 dark:bg-brand-600 font-black uppercase text-[10px] tracking-widest"
              onClick={fetchHistory}
              disabled={isLoadingHistory || !startDate || !endDate}
            >
              <Search className="h-4 w-4" />
              Cari
            </Button>
          </div>
        </div>

        {/* History results */}
        {historyFetched || isLoadingHistory || historyError ? (
          <div>
            {historyDate && !isLoadingHistory && (
              <p className="text-[10px] text-slate-400 font-bold mb-3">
                Periode: {historyDate}
              </p>
            )}
            <ReportSection
              label="history"
              data={historyData}
              isLoading={isLoadingHistory}
              error={historyError}
            />
          </div>
        ) : (
          <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-10 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            Pilih rentang tanggal dan klik Cari untuk melihat history.
          </div>
        )}
      </section>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(107, 114, 128, 0.6);
        }
      `}</style>
    </div>
  );
}

