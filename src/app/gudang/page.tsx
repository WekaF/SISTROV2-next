"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { hasGudangAccess, isReadOnlyRole } from "@/lib/role-utils";
import {
  Warehouse,
  Package,
  History,
  Plus,
  Search,
  Info,
  TrendingUp,
  Activity,
  ChevronRight,
  AlertTriangle,
  Clock,
  RefreshCw
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import Badge from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GudangData {
  id: string;
  namagudang: string;
  namaproduk: string;
  antrianproduk: number;
  antriangudang: number;
  stok: number;
  Aktif: string | boolean;
}

interface GudangDetail extends GudangData {
  idgudang: string;
  idproduk: string;
}

interface StokLog {
  number: number;
  gudang: string;
  stok: number;
  tipe: string;
  armada: string;
  tanggalString: string;
}

export default function GudangListPage() {
  const { data: session } = useSession();
  const { apiJson, apiTable } = useApi();
  const { activeCompanyCode } = useCompany();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Role detection
  const role = (session?.user as any)?.role;
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isReadOnly = isReadOnlyRole(role, roles);
  const isGudangFull = hasGudangAccess(role, roles);

  // Modal states
  const [selectedGudang, setSelectedGudang] = useState<GudangData | null>(null);
  const [gudangDetail, setGudangDetail] = useState<GudangDetail | null>(null);
  const [stokLogs, setStokLogs] = useState<StokLog[]>([]);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isTambahStokOpen, setIsTambahStokOpen] = useState(false);
  const [tambahanStok, setTambahanStok] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [stats, setStats] = useState({
    totalGudang: 0,
    totalAntrian: 0,
    stokTonase: 0,
    produkAktif: 0
  });

  // Helper to get real ID (some legacy APIs put it in the Action string if id is 0)
  const getRealId = (row: any) => {
    if (row.id && row.id !== 0 && row.id !== "0") return row.id;
    // Extract from Action string: ViewGudang('1234') or similar
    const match = row.Action?.match(/ViewGudang\('(\d+)'\)/);
    return match ? match[1] : row.id;
  };

  const fetchGudang = useCallback(async (params: any) => {
    const res = await apiTable("/api/Gudang/DataMapping", {
      ...params,
      cmd: "refresh",
      companyCode: activeCompanyCode
    });

    const data = res.data || [];
    
    // Calculate Stats
    const uniqueGudang = new Set(data.map((item: any) => item.idgudang));
    const gudangQueues: Record<string, number> = {};
    data.forEach((item: any) => {
      gudangQueues[item.idgudang] = item.antriangudang || 0;
    });
    const totalAntrian = Object.values(gudangQueues).reduce((a, b) => a + b, 0);
    const stokTonase = data.reduce((sum: number, item: any) => sum + (item.stok || 0), 0);
    const uniqueProduk = new Set(data.map((item: any) => item.namaproduk));

    setStats({
      totalGudang: uniqueGudang.size,
      totalAntrian: totalAntrian,
      stokTonase: stokTonase,
      produkAktif: uniqueProduk.size
    });

    return res;
  }, [apiTable, activeCompanyCode]);

  const handleOpenDetail = async (row: GudangData) => {
    const realId = getRealId(row);
    setSelectedGudang(row);
    setIsLoadingDetail(true);
    setIsDetailOpen(true);
    try {
      const res = await apiJson("/api/Gudang/DetailData", {
        method: "POST",
        body: JSON.stringify({ id: realId })
      });
      
      const detail = res.response || res;
      setGudangDetail(detail);

      const logsRes = await apiTable("/api/Gudang/LogStok", {
        draw: 1,
        start: 0,
        length: 20,
        idGudang: detail.idgudang,
        idProduk: detail.idproduk,
        companyCode: activeCompanyCode
      });
      setStokLogs(logsRes.response?.data || logsRes.data || []);
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengambil detail gudang", variant: "destructive" });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleOpenTambahStok = async (row: GudangData) => {
    const realId = getRealId(row);
    setSelectedGudang(row);
    setIsLoadingDetail(true);
    setIsTambahStokOpen(true);
    setTambahanStok(0);
    try {
      const res = await apiJson("/api/Gudang/DetailData", {
        method: "POST",
        body: JSON.stringify({ id: realId })
      });
      setGudangDetail(res.response || res);
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengambil detail gudang", variant: "destructive" });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSaveStok = async () => {
    if (!gudangDetail || tambahanStok < 0) return;
    setIsSaving(true);
    try {
      await apiJson("/api/Gudang/UpdateData", {
        method: "POST",
        body: JSON.stringify({ id: gudangDetail.id, value: tambahanStok })
      });
      addToast({ title: "Sukses", description: "Stok gudang berhasil ditambahkan", variant: "success" });
      setIsTambahStokOpen(false);
      queryClient.invalidateQueries({ queryKey: ["gudang-list"] });
    } catch (err) {
      addToast({ title: "Error", description: "Gagal memperbarui stok", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAktif = async (row: GudangData, currentAktif: boolean) => {
    const nextStatus = !currentAktif;
    if (!window.confirm(`Yakin mengubah status gudang ${row.namagudang} menjadi ${nextStatus ? 'Aktif' : 'Nonaktif'}?`)) {
      return;
    }

    try {
      await apiJson("/api/Gudang/GudangMuatSetting", {
        method: "POST",
        body: JSON.stringify({ id: row.id, aktif: nextStatus ? "true" : "false" })
      });
      addToast({ title: "Sukses", description: `Gudang ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gudang-list"] });
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengubah status gudang", variant: "destructive" });
    }
  };

  const columns: DataTableColumn<GudangData>[] = [
    { key: "number", header: "No", render: (_, i) => i + 1 },
    {
      key: "namagudang",
      header: "Gudang",
      render: (row) => <span className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{row.namagudang}</span>
    },
    {
      key: "namaproduk",
      header: "Produk",
      render: (row) => <span className="font-bold text-slate-500">{row.namaproduk}</span>
    },
    {
      key: "antrianproduk",
      header: "Antrian Produk",
      className: "text-center",
      render: (row) => <span className="font-bold">{row.antrianproduk} <span className="text-[10px] text-gray-400 font-bold">TRUK</span></span>
    },
    {
      key: "antriangudang",
      header: "Antrian Total",
      className: "text-center",
      render: (row) => <span className="font-bold">{row.antriangudang} <span className="text-[10px] text-gray-400 font-bold">TRUK</span></span>
    },
    {
      key: "stok",
      header: "Stok Tonase",
      className: "text-right",
      render: (row) => <span className="font-black text-brand-600 text-lg">{row.stok.toLocaleString()} <span className="text-[10px] uppercase">Ton</span></span>
    },
    {
      key: "Aktif",
      header: "Status",
      render: (row) => {
        // Detect active status from HTML badge string or standard boolean/string
        const aktifStr = String(row.Aktif || "").toLowerCase();
        const isAktif = 
          aktifStr.includes("badge-success") || 
          aktifStr.includes(">aktif<") || 
          row.Aktif === "1" || 
          row.Aktif === "True" || 
          row.Aktif === true;

        if (!isGudangFull) {
          return <Badge color={isAktif ? "success" : "error"} variant="light">{isAktif ? "Aktif" : "Nonaktif"}</Badge>;
        }
        return (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                isAktif ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"
              )}
              onClick={() => handleToggleAktif(row, isAktif)}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  isAktif ? "translate-x-5" : "translate-x-0"
                )}
              />
            </div>
            <span className={cn("text-[10px] font-black uppercase", isAktif ? "text-green-600" : "text-slate-400")}>
              {isAktif ? "On" : "Off"}
            </span>
          </div>
        );
      }
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => handleOpenDetail(row)}
          >
            Detail
          </Button>
          {isGudangFull && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => handleOpenTambahStok(row)}
            >
              Tambah Stok
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Daftar Gudang Gresik</h1>
            <Badge color={isGudangFull ? "success" : "info"} variant="solid" size="sm">
              {isGudangFull ? "Management Mode" : "Monitoring Mode"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">Kuota dalam satuan ton. Informasi stok tonase dan antrian truk real-time per gudang.</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-brand-500 text-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Warehouse className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Total Gudang</p>
              <h3 className="text-2xl font-black">{stats.totalGudang}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Antrian</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalAntrian} <span className="text-xs font-bold text-slate-400">TRUK</span></h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-500/10 text-green-600 rounded-2xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ketersediaan Stok</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.stokTonase.toLocaleString()} <span className="text-xs font-bold text-slate-400">TON</span></h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-2xl">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Produk Aktif</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.produkAktif}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            queryKey={["gudang-list", activeCompanyCode]}
            fetcher={fetchGudang}
            rowKey={(r) => r.id}
            striped
            compact
          />
        </CardContent>
      </Card>

      {/* Modal Detail Gudang */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Warehouse className="h-32 w-32" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <Badge color="info" variant="solid" size="sm">DETAIL GUDANG</Badge>
                {gudangDetail?.Aktif && <Badge color="success" variant="solid" size="sm">AKTIF</Badge>}
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight uppercase">{gudangDetail?.namagudang || "Loading..."}</h2>
                <p className="text-slate-400 font-bold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produk: {gudangDetail?.namaproduk}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50 dark:bg-slate-950">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stok Saat Ini</p>
                <div className="text-3xl font-black text-brand-600">
                  {gudangDetail?.stok?.toLocaleString() || "0"} <span className="text-xs">TON</span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Antrian Produk</p>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {gudangDetail?.antrianproduk} <span className="text-xs">TRUK</span>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Antrian Total</p>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  {gudangDetail?.antriangudang} <span className="text-xs">TRUK</span>
                </div>
              </div>
            </div>

            {/* Log Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-400" />
                  LOG STOK TERAKHIR
                </h4>
                <Badge color="light" size="sm">MAX 20 RECORDS</Badge>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">No</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Gudang</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Stok</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Keterangan</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Update By</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoadingDetail ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Memuat data...</td>
                      </tr>
                    ) : stokLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">Tidak ada data log.</td>
                      </tr>
                    ) : (
                      stokLogs.map((log, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 text-xs font-bold uppercase">{log.gudang}</td>
                          <td className="px-4 py-3 text-right font-black text-brand-600">{log.stok?.toLocaleString() || "0"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                log.tipe?.toLowerCase().includes('in') ? "bg-green-500" : "bg-blue-500"
                              )} />
                              <span className="text-xs font-bold">{log.tipe}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-black">{log.armada || "-"}</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold">{log.tanggalString}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Stok */}
      <Dialog open={isTambahStokOpen} onOpenChange={setIsTambahStokOpen}>
        <DialogContent className="max-w-xl p-0 border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-950">
          <div className="bg-brand-600 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Plus className="h-24 w-24" />
            </div>
            <div className="relative z-10 space-y-2">
              <Badge color="info" variant="solid" className="bg-white text-brand-600 font-black uppercase tracking-[0.2em] px-4 py-1">Operasional Stok</Badge>
              <div>
                <h2 className="text-3xl font-black tracking-tight uppercase">Tambah Stok Gudang</h2>
                <p className="text-brand-100 font-medium italic">Adjusting inventory for <span className="font-black text-white">{gudangDetail?.namagudang}</span></p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gudang</p>
                <p className="font-bold text-slate-900 dark:text-white uppercase truncate">{gudangDetail?.namagudang}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Produk</p>
                <p className="font-bold text-slate-900 dark:text-white truncate">{gudangDetail?.namaproduk}</p>
              </div>
            </div>

            <div className="bg-brand-50 dark:bg-brand-500/5 p-6 rounded-3xl border border-brand-100 dark:border-brand-500/20 flex justify-between items-center group hover:bg-brand-500/10 transition-all cursor-default">
              <div>
                <span className="text-xs font-black text-brand-700 dark:text-brand-400 uppercase tracking-[0.2em]">Stok Saat Ini</span>
                <p className="text-sm text-brand-600/60 font-bold">Terakhir diupdate hari ini</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-black text-brand-600">{gudangDetail?.stok?.toLocaleString() || "0"}</span>
                <span className="text-xs font-black text-brand-500 ml-1">TON</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Plus className="h-4 w-4 text-brand-600" />
                Tambahan Stok (Ton) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-4 border-r-2 border-slate-100 dark:border-slate-800">
                   <Plus className="h-5 w-5 text-brand-600" />
                </div>
                <Input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={tambahanStok}
                  onChange={(e) => setTambahanStok(Number(e.target.value))}
                  className="h-16 pl-20 text-2xl font-black border-2 focus:ring-brand-500 rounded-2xl bg-slate-50/50"
                  autoFocus
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/5 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex gap-4 items-start shadow-sm shadow-blue-500/5">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-xl text-blue-600">
                <Info className="h-5 w-5" />
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                <span className="font-black block mb-1 uppercase tracking-wider">Konfirmasi Input</span>
                Input stok akan menambah total tonase secara kumulatif. Tindakan ini akan dicatat dalam history log gudang.
              </p>
            </div>

            <div className="flex gap-4 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 h-14 font-bold rounded-2xl border-2 hover:bg-slate-50 transition-all" 
                onClick={() => setIsTambahStokOpen(false)} 
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button 
                className="flex-2 h-14 font-black bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20 rounded-2xl px-12 transition-all active:scale-95 disabled:opacity-50" 
                onClick={handleSaveStok} 
                disabled={isSaving || tambahanStok <= 0}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Memproses...
                  </div>
                ) : "SIMPAN STOK"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
