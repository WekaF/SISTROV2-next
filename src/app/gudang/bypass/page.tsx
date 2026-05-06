"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeftRight, Zap, Weight, Package, ShieldCheck, Filter, RefreshCw, AlertCircle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { hasGudangAccess } from "@/lib/role-utils";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import Badge from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AntrianData {
  id: string;
  posto: string;
  bookingno: string;
  tanggalString: string;
  shift: string;
  nopol: string;
  driver: string;
  produkString: string;
  qty: number;
  position: string;
  positionString: string;
  gudangMuat: string;
}

const POSITION_LABELS: Record<string, string> = {
  "00": "Menunggu",
  "01": "Security In",
  "02": "Timbang Kosong",
  "03": "Tiba di Gudang",
  "04": "Selesai Muat",
  "05": "Transit",
  "06": "Timbang Isi",
  "07": "Keluar Security",
};

const getPosColor = (pos: string): any => {
  const map: any = { "00": "warning", "01": "info", "02": "info", "03": "info", "04": "warning", "05": "indigo", "06": "indigo", "07": "success" };
  return map[pos] || "primary";
};

export default function TtrafikAntrianPage() {
  const { data: session } = useSession();
  const { apiJson, apiTable } = useApi();
  const { activeCompanyCode } = useCompany();
  const { addToast } = useToast();

  const role = (session?.user as any)?.role;
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isGudangFull = hasGudangAccess(role, roles);

  const [selectedRow, setSelectedRow] = useState<AntrianData | null>(null);
  const [isBypassOpen, setIsBypassOpen] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [filterGudang, setFilterGudang] = useState("");
  const [gudangOptions, setGudangOptions] = useState<{ idgudang: string; namagudang: string }[]>([]);

  useEffect(() => {
    apiJson("/api/Gudang/ListGudang").then((d) => setGudangOptions(d || [])).catch(() => {});
  }, [apiJson]);

  const fetcher = useCallback(
    (params: any) =>
      apiTable("/api/Antrian/DataTable", {
        ...params,
        cmd: "refresh",
        storage: filterGudang,
        mode: "aktif",
        companyCode: activeCompanyCode,
      }),
    [apiTable, filterGudang, activeCompanyCode]
  );

  const handleBypass = async (tujuan: string) => {
    if (!selectedRow) return;
    if (!alasan.trim()) {
      addToast({ title: "Peringatan", description: "Alasan bypass harus diisi", variant: "warning" });
      return;
    }
    setIsSaving(true);
    try {
      await apiJson("/api/Antrian/ByPassProcess", {
        method: "POST",
        body: JSON.stringify({
          bookingno: selectedRow.bookingno,
          tiketno: alasan,
          posto: tujuan,
          idtransport: selectedRow.position,
        }),
      });
      addToast({ title: "Sukses", description: "Bypass berhasil diproses", variant: "success" });
      setIsBypassOpen(false);
      setAlasan("");
    } catch {
      addToast({ title: "Error", description: "Gagal memproses bypass", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const posAsal = selectedRow ? parseFloat(selectedRow.position) : 0;

  const columns: DataTableColumn<AntrianData>[] = [
    { key: "no", header: "No", className: "text-center", headerClassName: "text-center", render: (_, i) => <span className="text-xs text-slate-400 font-bold">{i + 1}</span> },
    {
      key: "bookingno",
      header: "Booking",
      render: (row) => <span className="font-mono font-bold text-brand-600 text-sm">{row.bookingno}</span>,
    },
    {
      key: "nopol",
      header: "Nopol",
      className: "text-center",
      headerClassName: "text-center",
      render: (row) => (
        <div className="inline-flex items-center justify-center min-w-[90px] px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest shadow-sm">
          {row.nopol}
        </div>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      render: (row) => <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{row.driver}</span>,
    },
    { key: "produkString", header: "Produk", render: (row) => <span className="text-xs font-bold text-slate-600">{row.produkString}</span> },
    {
      key: "positionString",
      header: "Posisi",
      className: "text-center",
      headerClassName: "text-center",
      render: (row) => (
        <Badge color={getPosColor(row.position)} variant="light" size="sm" className="font-bold">
          {row.positionString || POSITION_LABELS[row.position] || row.position}
        </Badge>
      ),
    },
    {
      key: "gudangMuat",
      header: "Gudang",
      render: (row) => <span className="font-bold text-brand-600 text-xs">{row.gudangMuat || "—"}</span>,
    },
    { key: "tanggalString", header: "Tanggal", render: (row) => <span className="text-xs font-medium text-slate-500">{row.tanggalString}</span> },
    {
      key: "aksi",
      header: "Aksi",
      className: "text-center",
      headerClassName: "text-center",
      render: (row) => {
        if (!isGudangFull) return null;
        return (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] font-black uppercase tracking-widest border-orange-200 hover:bg-orange-50 gap-1 px-3"
            onClick={() => { setSelectedRow(row); setAlasan(""); setIsBypassOpen(true); }}
          >
            <Zap className="h-3 w-3" />
            Bypass
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Trafik Antrian Gudang</h1>
            <Badge color={isGudangFull ? "success" : "info"} variant="solid" size="sm">
              {isGudangFull ? "Full Access" : "Read Only"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">Monitoring alur trafik armada aktif dan proses bypass posisi antrian.</p>
        </div>
      </div>

      {/* Filter Gudang */}
      <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5 min-w-[220px]">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Filter Gudang</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={filterGudang}
                onChange={(e) => setFilterGudang(e.target.value)}
              >
                <option value="">Semua Gudang</option>
                {gudangOptions.map((g) => (
                  <option key={g.idgudang} value={g.idgudang}>{g.namagudang}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            queryKey={["gudang-trafik", filterGudang, activeCompanyCode]}
            fetcher={fetcher}
            rowKey={(r) => r.id || r.bookingno}
            striped
            compact
            searchPlaceholder="Cari booking / nopol / driver..."
          />
        </CardContent>
      </Card>

      <Dialog open={isBypassOpen} onOpenChange={setIsBypassOpen}>
        <DialogContent className="max-w-xl p-0 border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-950">
          <div className="bg-orange-600 p-6 text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
              <Zap className="h-24 w-24" />
            </div>
            <div className="relative z-10 space-y-2">
              <Badge color="warning" variant="solid" className="bg-white text-orange-600 font-black uppercase tracking-[0.2em] px-3 py-0.5 text-[10px]">Otorisasi Bypass</Badge>
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">{selectedRow?.bookingno}</h2>
                <p className="text-orange-100 text-[11px] font-medium mt-1">Bypassing for <span className="font-black text-white">{selectedRow?.nopol}</span></p>
              </div>
            </div>
          </div>          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Posisi Asal</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{selectedRow?.positionString || "POSISI AWAL"}</span>
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-500/5 p-3 rounded-xl border border-orange-100 dark:border-orange-500/20">
                <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Target</p>
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-orange-500" />
                  <span className="text-xs font-black text-orange-600 uppercase">Titik Tujuan Baru</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Alasan Bypass (Wajib diisi)
              </label>
              <Input 
                placeholder="Berikan alasan logis untuk pencatatan log sistem..." 
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                className="h-14 border-2 focus:ring-orange-500 text-lg font-medium px-6 rounded-2xl transition-all"
                autoFocus
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pilih Titik Tujuan</h4>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: "02", label: "Timbang Kosong", icon: Weight, available: posAsal <= 1 },
                  { id: "04", label: "Selesai Muat", icon: Package, available: posAsal <= 3 },
                  { id: "06", label: "Timbang Isi", icon: Weight, available: posAsal <= 4 },
                  { id: "07", label: "Keluar Security", icon: ShieldCheck, available: posAsal <= 6 },
                ].map((pos) => (
                  <button 
                    key={pos.id}
                    disabled={!pos.available || isSaving}
                    onClick={() => handleBypass(pos.id)}
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-3xl border-2 transition-all duration-300 text-left group relative overflow-hidden",
                      pos.available 
                        ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 active:scale-95" 
                        : "bg-slate-50 dark:bg-slate-900 opacity-40 cursor-not-allowed border-transparent"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-2xl group-hover:scale-110 transition-transform",
                      pos.available ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    )}>
                      {React.createElement(pos.icon, { className: "h-6 w-6" })}
                    </div>
                    <div>
                      <div className={cn("font-black uppercase tracking-tight", pos.available ? "text-slate-900 dark:text-white" : "text-slate-400")}>{pos.label}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pos.available ? "Klik untuk proses" : "Tidak tersedia"}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 text-slate-400 p-6 rounded-3xl flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-xl text-orange-500 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium leading-relaxed">
                <span className="text-white font-bold block mb-1">Catatan Keamanan</span>
                Setiap tindakan bypass akan dicatat oleh sistem atas nama <span className="text-orange-400 font-bold">{session?.user?.name || "User Aktif"}</span>.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
