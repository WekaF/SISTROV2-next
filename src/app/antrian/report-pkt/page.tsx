"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Truck, ChevronDown, ChevronUp, Search } from "lucide-react";
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
  const color = truck.Color || "gray";

  const detailRows: { label: string; value: string }[] = [
    { label: "Booking", value: truck.KodeBooking },
    { label: "Tanggal Muat", value: parseTanggalMuat(truck.TanggalMuat) },
    { label: "Produk", value: truck.Produk },
    { label: "POSTO", value: truck.NoPosto },
    { label: "Kabupaten Tujuan", value: truck.NamaKabupaten || truck.Kabupaten },
    { label: "Gudang Tujuan", value: truck.GudangTujuanDesk },
    { label: "Tonase", value: `${Number(truck.Tonase).toLocaleString("id-ID")} kg` },
  ];

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border-2 overflow-hidden flex-shrink-0"
      style={{ width: 250, borderColor: color }}
    >
      {/* Icon badge + nopol header */}
      <div
        className="flex items-center gap-3 px-3 py-2.5"
        style={{ backgroundColor: color + "18" }}
      >
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 44, height: 44, backgroundColor: color }}
        >
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div className="overflow-hidden">
          <p
            className="text-[13px] font-black font-mono uppercase tracking-widest leading-none"
            style={{ color }}
          >
            {truck.NoPol}
          </p>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate mt-0.5">
            {truck.Sopir}
          </p>
        </div>
      </div>

      {/* Detail table */}
      <div className="px-3 py-2 space-y-1">
        {detailRows.map((row) => (
          <div key={row.label} className="grid grid-cols-2 gap-1 items-start">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-relaxed">
              {row.label}
            </span>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 text-right leading-relaxed break-words">
              {row.value || "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckpointAccordion({
  name,
  trucks,
  defaultOpen = true,
}: {
  name: string;
  trucks: TruckItem[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Accordion header */}
      <button
        className="w-full flex items-center justify-between px-5 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <Truck className="h-4 w-4 text-slate-400" />
          <span className="text-[12px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            {name}
          </span>
          <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            {trucks.length} truk
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {/* Truck cards row */}
      {open && (
        <div className="bg-slate-50 dark:bg-slate-950 px-5 py-4">
          {trucks.length === 0 ? (
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-6">
              Tidak ada truk di checkpoint ini
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {trucks.map((truck, idx) => (
                <TruckCard key={`${truck.NoPol}-${idx}`} truck={truck} />
              ))}
            </div>
          )}
        </div>
      )}
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
      <div className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest py-10">
        Belum ada data.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {totalTrucks} truk aktif
        </span>
        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
      </div>
      {checkpoints.map((cp) => (
        <CheckpointAccordion key={cp} name={cp} trucks={data[cp] ?? []} defaultOpen />
      ))}
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
      if (res.Success) {
        setRealtimeData(res.data || {});
        setRealtimeDate(res.Date || "");
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
      if (res.Success) {
        setHistoryData(res.data || {});
        setHistoryDate(res.Date || "");
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
    <div className="space-y-8">
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
    </div>
  );
}
