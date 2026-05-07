"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  RefreshCw,
  Filter,
  Warehouse,
  Zap,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Clock,
  MapPin,
  Weight,
  Package,
  AlertCircle,
  Truck,
  Activity
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { normalizeRole, hasGudangAccess, isReadOnlyRole } from "@/lib/role-utils";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AntrianData {
  id: string;
  number: number;
  posto: string;
  bookingno: string;
  tanggalString: string;
  shift: string;
  nopol: string;
  driver: string;
  produkString: string;
  transportString: string;
  tujuan: string;
  qty: number;
  position: string;
  positionString: string;
  gudangMuat: string;
  changestorage: string;
  pic: string;
}

interface GudangPilihan {
  idgudang: string;
  namagudang: string;
  namaproduk: string;
  antrianproduk: number;
  antriangudang: number;
  stok: number;
}

export default function AntrianPage() {
  const { data: session } = useSession();
  const { apiJson, apiTable } = useApi();
  const { activeCompanyCode } = useCompany();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Role detection
  const userRole = normalizeRole((session?.user as any)?.roleName || (session?.user as any)?.role);
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isSuperAdmin = userRole === "superadmin" || userRole === "ti";
  const isStaffArea = userRole === "staffarea";
  const isGudang = userRole === "gudang";
  
  const isGudangFull = isSuperAdmin || isStaffArea || isGudang || hasGudangAccess(userRole, roles);
  const isReadOnly = isReadOnlyRole(userRole, roles) && !isSuperAdmin && !isStaffArea;

  // Filters state
  const [filterSD, setFilterSD] = useState("");
  const [filterED, setFilterED] = useState("");
  const [filterProduk, setFilterProduk] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterGudang, setFilterGudang] = useState("");

  // Options state
  const [produkOptions, setProdukOptions] = useState<{ ID: string; Nama: string }[]>([]);
  const [gudangOptions, setGudangOptions] = useState<{ idgudang: string; namagudang: string }[]>([]);

  // Modal states
  const [selectedAntrian, setSelectedAntrian] = useState<AntrianData | null>(null);
  const [isPindahOpen, setIsPindahOpen] = useState(false);
  const [isBypassOpen, setIsBypassOpen] = useState(false);
  const [selectedGudang, setSelectedGudang] = useState<string>("");
  const [alasanBypass, setAlasanBypass] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [gudangList, setGudangList] = useState<any[]>([]);

  // Fetch options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const prodData = await apiJson("/api/Produk/Data");
        setProdukOptions(prodData || []);
      } catch (err) {
        console.error("Failed to fetch products", err);
      }
    };
    fetchOptions();
  }, [apiJson]);

  // Fetch Gudang Summary/Options
  const { data: gudangSummaryRaw, isLoading: isLoadingGudang } = useQuery({
    queryKey: ["gudang-summary", activeCompanyCode],
    queryFn: () => apiJson("/api/Gudang/ListGudang"),
    enabled: !!activeCompanyCode,
  });

  useEffect(() => {
    if (gudangSummaryRaw) {
      setGudangOptions(gudangSummaryRaw || []);
    }
  }, [gudangSummaryRaw]);

  const fetchAntrian = useCallback(async (params: any) => {
    return apiTable("/api/Antrian/DataTable", {
      ...params,
      cmd: "refresh",
      SD: filterSD,
      ED: filterED,
      produk: filterProduk,
      position: filterPosition,
      storage: filterGudang,
      mode: "aktif",
      companyCode: activeCompanyCode
    });
  }, [apiTable, filterSD, filterED, filterProduk, filterPosition, filterGudang, activeCompanyCode]);

  const handleOpenPindahGudang = async (antrian: AntrianData) => {
    setSelectedAntrian(antrian);
    setSelectedGudang("");
    setIsPindahOpen(true);
    try {
      const res = await apiJson("/api/Gudang/ListGudangPilihan", {
        method: "POST",
        body: JSON.stringify({ id: antrian.id })
      });
      setGudangList(res.data || []);
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengambil daftar gudang", variant: "destructive" });
    }
  };

  const handleSavePindah = async () => {
    if (!selectedAntrian || !selectedGudang) return;
    setIsSaving(true);
    try {
      await apiJson("/api/Gudang/UpdatePindahGudang", {
        method: "POST",
        body: JSON.stringify({ storageID: selectedGudang, id: selectedAntrian.id })
      });
      addToast({ title: "Berhasil", description: "Gudang muat berhasil dipindahkan", variant: "success" });
      setIsPindahOpen(false);
      queryClient.invalidateQueries({ queryKey: ["antrian-data"] });
    } catch (err) {
      addToast({ title: "Error", description: "Gagal memindahkan gudang", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBypass = async (tujuan: string) => {
    if (!selectedAntrian) return;
    if (!alasanBypass.trim()) {
      addToast({ title: "Peringatan", description: "Alasan bypass harus diisi", variant: "warning" });
      return;
    }
    setIsSaving(true);
    try {
      await apiJson("/api/Antrian/ByPassProcess", {
        method: "POST",
        body: JSON.stringify({
          bookingno: selectedAntrian.bookingno,
          tiketno: alasanBypass,
          posto: tujuan,
          idtransport: selectedAntrian.position
        })
      });
      addToast({ title: "Berhasil", description: "Bypass berhasil diproses", variant: "success" });
      setIsBypassOpen(false);
      setAlasanBypass("");
      queryClient.invalidateQueries({ queryKey: ["antrian-data"] });
    } catch (err) {
      addToast({ title: "Error", description: "Gagal memproses bypass", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getPosColor = (pos: string): any => {
    const map: any = {
      "00": "warning",
      "01": "info",
      "02": "info",
      "03": "info",
      "04": "warning",
      "05": "indigo",
      "06": "indigo",
      "07": "success",
    };
    return map[pos] || "primary";
  };

  const columns: DataTableColumn<AntrianData>[] = [
    {
      key: "number",
      header: "No",
      render: (_, i) => i + 1
    },
    {
      key: "posto",
      header: "PO STO",
      render: (row) => <span className="font-mono text-xs">{row.posto}</span>
    },
    {
      key: "bookingno",
      header: "Booking Code",
      render: (row) => <span className="font-mono font-bold text-brand-600">{row.bookingno}</span>
    },
    { key: "tanggalString", header: "Tanggal Muat" },
    {
      key: "shift",
      header: "Shift",
      render: (row) => <Badge size="sm" color="light">{row.shift}</Badge>
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
      )
    },
    {
      key: "driver",
      header: "Driver",
      render: (row) => <span className="uppercase font-bold text-slate-700 dark:text-slate-300">{row.driver}</span>
    },
    { key: "produkString", header: "Produk" },
    { key: "transportString", header: "Transport" },
    { key: "tujuan", header: "Tujuan" },
    {
      key: "qty",
      header: "Qty",
      className: "text-right",
      render: (row) => <span className="font-black text-slate-900 dark:text-white">{row.qty}</span>
    },
    {
      key: "positionString",
      header: "Posisi",
      render: (row) => <Badge color={getPosColor(row.position)} variant="light">{row.positionString}</Badge>
    },
    {
      key: "gudangMuat",
      header: "Gudang Muat",
      render: (row) => <span className="font-bold text-brand-600">{row.gudangMuat}</span>
    },
    {
      key: "pic",
      header: "Dipindah Oleh",
      render: (row) => <span className="text-[10px] text-gray-400 font-bold uppercase">{row.pic || "-"}</span>
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "text-center",
      headerClassName: "text-center",
      render: (row) => {
        if (!isGudangFull) return null;
        return (
          <div className="flex items-center justify-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] font-black uppercase tracking-widest border-blue-200 hover:bg-blue-50 gap-1 px-3"
              onClick={() => handleOpenPindahGudang(row)}
            >
              <Warehouse className="h-3 w-3" />
              Pindah
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] font-black uppercase tracking-widest border-orange-200 hover:bg-orange-50 gap-1 px-3"
              onClick={() => { setSelectedAntrian(row); setAlasanBypass(""); setIsBypassOpen(true); }}
            >
              <Zap className="h-3 w-3" />
              Bypass
            </Button>
          </div>
        );
      },
    }
  ];

  const posAsal = selectedAntrian ? parseFloat(selectedAntrian.position) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Management Antrian</h1>
            <Badge color={isGudangFull ? "success" : "info"} variant="solid" size="sm" className="font-black">
              {isGudangFull ? "ADMINISTRATIVE ACCESS" : "READ ONLY"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Monitoring pergerakan armada dan pengelolaan antrian gudang muat secara real-time.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button 
            variant="outline" 
            size="sm" 
            className="h-10 bg-white border-2 font-bold uppercase text-[10px] tracking-widest"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["antrian"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Antrian", value: "...", icon: Truck, color: "blue" },
          { label: "Security In", value: "...", icon: ShieldCheck, color: "orange" },
          { label: "Sedang Muat", value: "...", icon: Package, color: "indigo" },
          { label: "Selesai Muat", value: "...", icon: CheckCircle2, color: "emerald" },
        ].map((stat, i) => (
          <Card key={i} className="border-none ring-0 shadow-sm overflow-visible bg-white dark:bg-slate-900">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">--</p>
              </div>
              <div className={cn("p-3 rounded-2xl", 
                stat.color === "blue" ? "bg-blue-50 text-blue-600" :
                stat.color === "orange" ? "bg-orange-50 text-orange-600" :
                stat.color === "indigo" ? "bg-indigo-50 text-indigo-600" :
                "bg-emerald-50 text-emerald-600"
              )}>
                <stat.icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Warehouse Snapshots */}
      {gudangOptions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
              <Activity className="h-3 w-3" />
              Live Warehouse Snapshot
            </h3>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="flex gap-4 overflow-x-auto px-1 py-4 custom-scrollbar -mx-1">
            {gudangOptions.map((g: any) => (
              <Card key={g.idgudang} className="min-w-[200px] border-none ring-0 shadow-sm flex-shrink-0 bg-white dark:bg-slate-900 border-l-4 border-l-brand-500 overflow-visible">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase truncate max-w-[120px]">{g.namagudang}</span>
                    <Warehouse className="h-4 w-4 text-slate-300" />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Antrian</p>
                      <p className="text-xl font-black text-brand-600">{g.antriangudang ?? 0}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Status</p>
                       <Badge color={(g.antriangudang ?? 0) > 10 ? "warning" : "success"} size="sm" variant="light" className="px-1.5 py-0">
                        {(g.antriangudang ?? 0) > 10 ? "Padat" : "Lancar"}
                       </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tanggal Mulai</label>
              <Input type="date" value={filterSD} onChange={(e) => setFilterSD(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tanggal Selesai</label>
              <Input type="date" value={filterED} onChange={(e) => setFilterED(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Produk</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={filterProduk}
                onChange={(e) => setFilterProduk(e.target.value)}
              >
                <option value="">Semua Produk</option>
                {produkOptions.map(opt => <option key={opt.ID} value={opt.ID}>{opt.Nama}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Posisi</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
              >
                <option value="">Semua Posisi</option>
                <option value="01">Security In</option>
                <option value="02">Timbang Kosong</option>
                <option value="03">Tiba di Gudang</option>
                <option value="04">Selesai Muat</option>
                <option value="06">Timbang Isi</option>
                <option value="07">Keluar Security</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gudang</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={filterGudang}
                onChange={(e) => setFilterGudang(e.target.value)}
              >
                <option value="">Semua Gudang</option>
                {gudangOptions.map(opt => <option key={opt.idgudang} value={opt.idgudang}>{opt.namagudang}</option>)}
              </select>
            </div>
            <Button className="h-10 gap-2 bg-slate-900 dark:bg-brand-600">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            queryKey={["antrian", filterSD, filterED, filterProduk, filterPosition, filterGudang, activeCompanyCode]}
            fetcher={fetchAntrian}
            rowKey={(r) => r.id}
            striped
            compact
            searchPlaceholder="Cari nopol / booking / driver..."
          />
        </CardContent>
      </Card>

      {/* Modal Pindah Gudang */}
      <Dialog open={isPindahOpen} onOpenChange={setIsPindahOpen}>
        <DialogContent className="max-w-xl p-0 border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-950">
          <div className="bg-slate-900 p-6 text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Truck className="h-24 w-24" />
            </div>
            <div className="relative z-10 space-y-2">
              <Badge color="info" variant="solid" size="sm" className="bg-blue-600 text-white font-black uppercase tracking-[0.2em] px-3 py-0.5 text-[10px]">Pindah Lokasi</Badge>
              <div>
                <h2 className="text-2xl font-black tracking-tight uppercase leading-none">{selectedAntrian?.bookingno || "..."}</h2>
                <p className="text-slate-400 text-[11px] font-bold mt-1">Nopol: {selectedAntrian?.nopol}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Produk</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedAntrian?.produkString}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gudang Asal</p>
                <p className="text-xs font-bold text-brand-600 uppercase truncate">{selectedAntrian?.gudangMuat || "—"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pilih Gudang Baru</h4>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>

              {isLoadingGudang ? (
                <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse italic text-[11px]">Memuat daftar gudang...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {gudangList.map((g) => (
                    <button
                      key={g.idgudang}
                      className={cn(
                        "flex flex-col p-4 rounded-2xl border-2 transition-all group text-left",
                        selectedGudang === g.idgudang
                          ? "bg-brand-50 border-brand-500 shadow-lg shadow-brand-500/10"
                          : "bg-white border-slate-50 hover:border-slate-200"
                      )}
                      onClick={() => setSelectedGudang(g.idgudang)}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            selectedGudang === g.idgudang ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                          )}>
                            <Warehouse className="h-3.5 w-3.5" />
                          </div>
                          <span className={cn("font-black text-[13px] uppercase tracking-tight", selectedGudang === g.idgudang ? "text-brand-700" : "text-slate-700")}>{g.namagudang}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 w-full space-y-1.5">
                        <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Antrian {g.namaproduk}</span>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 dark:text-white">{g.antrianproduk}</span>
                            <span className="text-[9px] font-bold text-slate-400 ml-1 uppercase">Truk</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] items-center gap-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Antrian Total</span>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 dark:text-white">{g.antriangudang}</span>
                            <span className="text-[9px] font-bold text-slate-400 ml-1 uppercase">Truk</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] items-center gap-4 pt-1.5 mt-1 border-t border-dashed border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-black text-brand-600 uppercase tracking-tight">Stok Tersedia</span>
                          <div className="text-right">
                            <span className="text-sm font-black text-brand-600">{g.stok.toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-brand-500 ml-1 uppercase">Ton</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setIsPindahOpen(false)} disabled={isSaving}>Batal</Button>
              <Button className="flex-2 h-12 font-black bg-slate-900 hover:bg-slate-800 rounded-xl" onClick={handleSavePindah} disabled={isSaving || !selectedGudang}>PINDAH GUDANG</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Bypass */}
      <Dialog open={isBypassOpen} onOpenChange={setIsBypassOpen}>
        <DialogContent className="max-w-xl p-0 border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-950">
          <div className="bg-orange-600 p-6 text-white relative">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <Zap className="h-24 w-24" />
            </div>
            <div className="relative z-10 space-y-2">
              <Badge color="warning" variant="solid" className="bg-white text-orange-600 font-black uppercase tracking-[0.2em] px-3 py-0.5 text-[10px]">Otorisasi Bypass</Badge>
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">{selectedAntrian?.bookingno}</h2>
                <p className="text-orange-100 text-[11px] font-medium mt-1">Bypassing for <span className="font-black text-white">{selectedAntrian?.nopol}</span></p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Saat Ini</p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{selectedAntrian?.positionString || "POSISI AWAL"}</span>
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-500/5 p-3 rounded-xl border border-orange-100 dark:border-orange-500/20">
                <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Target</p>
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-orange-500" />
                  <span className="text-xs font-black text-orange-600">TITIK TUJUAN BARU</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Alasan Bypass <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Berikan alasan logis..."
                value={alasanBypass}
                onChange={(e) => setAlasanBypass(e.target.value)}
                className="h-12 border-2 focus:ring-orange-500 text-sm font-bold px-4 rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="h-px w-4 bg-slate-200" />
                Pilih Titik Tujuan
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
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
                      "flex items-center gap-4 p-5 rounded-3xl border-2 transition-all duration-300 text-left group",
                      pos.available 
                        ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 active:scale-95" 
                        : "bg-slate-50 dark:bg-slate-900 opacity-40 cursor-not-allowed border-transparent"
                    )}
                  >
                    <div className={cn(
                      "p-2.5 rounded-xl group-hover:scale-110 transition-transform",
                      pos.available ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                    )}>
                      {React.createElement(pos.icon, { className: "h-5 w-5" })}
                    </div>
                    <div>
                      <div className={cn("font-black uppercase tracking-tight text-xs", pos.available ? "text-slate-900 dark:text-white" : "text-slate-400")}>{pos.label}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{pos.available ? "Klik untuk proses" : "Terkunci"}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 text-slate-400 p-4 rounded-2xl flex items-start gap-3">
              <div className="p-1.5 bg-slate-800 rounded-lg text-orange-500 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-medium leading-relaxed italic">
                <span className="text-white font-black uppercase tracking-widest mr-2">Security:</span>
                Tindakan bypass dicatat atas nama <span className="text-orange-400 font-bold">{session?.user?.name}</span>.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

