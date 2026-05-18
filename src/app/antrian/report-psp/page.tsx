"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Truck } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";

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

interface ReportPSPResponse {
  Success: boolean;
  data: Record<string, TruckItem[]>;
  Date: string;
  Company: string;
}

const PSP_CHECKPOINTS = [
  "POS 1B-IN",
  "POS 1B-OUT",
  "POS 16-IN",
  "POS 16-OUT",
  "POS 19B-IN",
  "POS 19B-OUT",
  "Timbangan Urea",
  "Timbangan NPK 1",
  "Gudang F",
  "Gudang BS3/4",
  "Gudang NPK1",
  "Gudang NPK2",
  "Gudang BS2",
  "Timbangan NPK 2",
  "Gudang UBS 2B",
];

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

function TruckCard({ truck }: { truck: TruckItem }) {
  const borderColor = getBorderColor(truck.Color);
  const statusLabel = getStatusLabel(truck.Color);

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor, borderLeftStyle: "solid" }}
    >
      <div className="p-3 space-y-1.5">
        {/* NoPol + Status */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="inline-flex items-center px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[13px] font-mono font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest"
          >
            {truck.NoPol}
          </div>
          <span
            className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ backgroundColor: borderColor + "22", color: borderColor }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Driver */}
        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase truncate">
          {truck.Sopir}
        </p>

        {/* Divider */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Booking</span>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 font-mono">{truck.KodeBooking}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Produk</span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[130px] text-right">{truck.Produk}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">POSTO</span>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">{truck.NoPosto}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tujuan</span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate max-w-[130px] text-right">
              {truck.GudangTujuanDesk || truck.Kabupaten || truck.NamaKabupaten}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tonase</span>
            <span className="text-[10px] font-black text-slate-800 dark:text-slate-200">
              {Number(truck.Tonase).toLocaleString("id-ID")} kg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckpointSection({
  name,
  trucks,
}: {
  name: string;
  trucks: TruckItem[];
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            {name}
          </span>
        </div>
        <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          {trucks.length} truk
        </span>
      </div>

      {/* Truck cards */}
      <div className="p-3 space-y-2">
        {trucks.length === 0 ? (
          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-4">
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
}

export default function ReportPSPPage() {
  const { apiJson } = useApi();
  const [data, setData] = useState<Record<string, TruckItem[]>>({});
  const [reportDate, setReportDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiJson<ReportPSPResponse>("/api/Antrian/ReportPSP");
      if (res.Success) {
        setData(res.data || {});
        setReportDate(res.Date || "");
      } else {
        setError("Server mengembalikan respons tidak berhasil.");
      }
    } catch (err: any) {
      setError(err?.message || "Gagal mengambil data.");
    } finally {
      setIsLoading(false);
    }
  }, [apiJson]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Total truck count
  const totalTrucks = PSP_CHECKPOINTS.reduce(
    (acc, cp) => acc + (data[cp]?.length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Report PSP
          </h1>
          <p className="text-sm text-slate-500 font-medium tracking-tight">
            Monitoring real-time checkpoint Pupuk Sriwidjaya Palembang.
            {reportDate && (
              <span className="ml-2 text-slate-400">
                Per: {reportDate}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            {totalTrucks} Truk Aktif
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-10 bg-white border-2 font-bold uppercase text-[10px] tracking-widest"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {PSP_CHECKPOINTS.map((cp) => (
            <div
              key={cp}
              className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-32"
            />
          ))}
        </div>
      )}

      {/* Checkpoint grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {PSP_CHECKPOINTS.map((cp) => (
            <CheckpointSection key={cp} name={cp} trucks={data[cp] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
