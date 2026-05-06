"use client";

import React, { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, MapPin, Globe, Map, Navigation, Send, Package, Hash } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { hasGudangAccess } from "@/lib/role-utils";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface GudangTujuan {
  id: string;
  number: number;
  idgudang: string;
  namagudang: string;
  tipe: string | number;
  kabupaten: string;
  tonase: string | number;
  qty?: string | number;
  Action: string;
}

interface GudangDetail {
  namagudang: string;
  idgudang: string;
  tipe: string;
  alamat: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
}

export default function GudangTujuanBagianPage() {
  const { data: session } = useSession();
  const { apiJson, apiTable } = useApi();
  const { activeCompanyCode } = useCompany();
  const { addToast } = useToast();

  const role = (session?.user as any)?.role;
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isCandal = role?.toLowerCase() === "candalkuota" || roles.some(r => r.toLowerCase() === "candalkuota");
  const isGudangFull = hasGudangAccess(role, roles);

  const [detail, setDetail] = useState<GudangDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    namagudang: "",
    idwil: "",
    linigudang: "",
    alamat: "",
    kecamatan: "",
    kabupaten: "",
    provinsi: ""
  });

  const fetcher = useCallback(
    (params: any) =>
      apiTable("/api/Gudang/DataGudangTujuan", {
        ...params,
        cmd: "refresh",
        companyCode: activeCompanyCode,
      }),
    [apiTable, activeCompanyCode]
  );

  const handleOpenDetail = async (row: any) => {
    const match = row.Action?.match(/ViewGudang\('(\d+)'\)/);
    const storageID = match ? match[1] : (row.id || row.idgudang);

    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    try {
      console.log("[DetailDataTujuan] Fetching for storageID:", storageID);
      const res = await apiJson("/api/Gudang/DetailDataTujuan", {
        method: "POST",
        body: JSON.stringify({ 
          storageID: storageID,
          StorageID: storageID,
          storageid: storageID,
          id: storageID
        })
      });
      console.log("[DetailDataTujuan] Response:", res);
      const data = res.response || res;
      setDetail(data);
    } catch (err) {
      console.error("[DetailDataTujuan] Error:", err);
      addToast({ title: "Error", description: "Gagal memuat detail gudang", variant: "destructive" });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSave = async () => {
    if (!formData.code || !formData.namagudang || !formData.linigudang) {
      addToast({ title: "Gagal", description: "Mohon lengkapi form", variant: "warning" });
      return;
    }

    setIsSaving(true);
    try {
      await apiJson("/api/Gudang/PostData", {
        method: "POST",
        body: JSON.stringify({
          ID: formData.code,
          Deskripsi: formData.namagudang,
          Tipe: formData.linigudang,
          Wil: formData.idwil || (activeCompanyCode === "PKC" ? "JAWA" : activeCompanyCode === "LOG4MENENG" ? "POJATIM" : "POALL"),
          Alamat: formData.alamat,
          Kecamatan: formData.kecamatan,
          Kabupaten: formData.kabupaten,
          Propinsi: formData.provinsi
        })
      });
      addToast({ title: "Sukses", description: "Gudang tujuan berhasil ditambahkan", variant: "success" });
      setIsAddOpen(false);
      setFormData({
        code: "", namagudang: "", idwil: "", linigudang: "",
        alamat: "", kecamatan: "", kabupaten: "", provinsi: ""
      });
    } catch {
      addToast({ title: "Error", description: "Gagal menyimpan data", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getJenisGudangOptions = () => {
    if (activeCompanyCode === "PKC") return [{ value: "JAWA", label: "PO STO Pupuk Kujang" }];
    if (activeCompanyCode === "LOG4MENENG") return [
      { value: "POJATIM", label: "PO STO Meneng" },
      { value: "POPELABUHAN", label: "PO STO Pelabuhan Meneng" },
      { value: "SOJATIM", label: "SO Meneng" }
    ];
    if (activeCompanyCode === "D243") return [
      { value: "POSULSEL", label: "PO STO Makassar" },
      { value: "SOSULSEL", label: "SO Makassar" }
    ];
    return [
      { value: "POALL", label: "POALL" },
      { value: "SOALL", label: "SOALL" }
    ];
  };

  const columns: DataTableColumn<GudangTujuan>[] = [
    { key: "number", header: "No", className: "w-12 text-center", render: (_, i) => <span className="text-xs font-bold text-slate-400">{i + 1}</span> },
    { key: "idgudang", header: "Code", className: "font-mono font-bold text-xs" },
    { key: "namagudang", header: "Gudang Tujuan", className: "font-black uppercase text-slate-800 dark:text-white text-sm tracking-tight" },
    { key: "tipe", header: "Tipe", className: "text-center font-bold text-slate-500", render: (row) => row.tipe || row.id },
    { key: "kabupaten", header: "Kabupaten", className: "text-xs font-medium" },
    { 
      key: "tonase", 
      header: "Tonase", 
      className: "text-right",
      render: (row) => <span className="font-black text-brand-600">{row.qty || row.tonase || row.id} <span className="text-[10px] uppercase">Ton</span></span>
    },
    {
      key: "Action",
      header: "Aksi",
      className: "text-center",
      render: (row) => (
        <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest border-blue-200 hover:bg-blue-50 px-3" onClick={() => handleOpenDetail(row)}>
          Detail
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Gudang Tujuan Bagian</h1>
            <Badge color="success" variant="solid" size="sm">KUOTA TONASE</Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">* Kuota dalam satuan ton. Daftar pemetaan gudang tujuan pemuatan.</p>
        </div>
        {isCandal && (
          <Button className="bg-green-600 hover:bg-green-700 text-white font-black px-6 gap-2 h-11 shadow-lg shadow-green-500/20" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" /> TAMBAH GUDANG
          </Button>
        )}
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            queryKey={["gudang-tujuan-bagian", activeCompanyCode]}
            fetcher={fetcher}
            rowKey={(r) => r.idgudang + r.number}
            striped
            compact
            searchPlaceholder="Cari kode / gudang / kabupaten..."
          />
        </CardContent>
      </Card>

      {/* Modal Detail */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
           <div className="bg-slate-900 p-8 text-white relative">
             <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
               <MapPin className="h-32 w-32" />
             </div>
             <div className="relative z-10 space-y-2">
               <Badge color="info" variant="solid" className="font-black px-3 py-0.5">DETAIL GUDANG</Badge>
               <h2 className="text-3xl font-black tracking-tight uppercase leading-none">{detail?.namagudang || "Loading..."}</h2>
               <p className="text-slate-400 font-bold flex items-center gap-2 text-sm">
                 <Hash className="h-4 w-4" /> KODE GUDANG: {detail?.idgudang}
               </p>
             </div>
           </div>

           <div className="p-8 bg-slate-50 dark:bg-slate-950">
             {isLoadingDetail ? (
               <div className="py-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest text-xs">Memuat data detail...</div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"><Package className="h-5 w-5 text-brand-600" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gudang Lini</p>
                        <p className="font-bold text-slate-900 dark:text-white uppercase">{detail?.tipe || "-"} Ton</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"><Navigation className="h-5 w-5 text-blue-600" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</p>
                        <p className="font-bold text-slate-900 dark:text-white">{detail?.alamat || "-"}</p>
                      </div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"><Map className="h-5 w-5 text-orange-600" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan / Kabupaten</p>
                        <p className="font-bold text-slate-900 dark:text-white uppercase">{detail?.kecamatan || "-"} / {detail?.kabupaten || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800"><Globe className="h-5 w-5 text-green-600" /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provinsi</p>
                        <p className="font-bold text-slate-900 dark:text-white uppercase">{detail?.provinsi || "-"}</p>
                      </div>
                    </div>
                 </div>
               </div>
             )}
             <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
               <Button variant="outline" className="px-8 font-bold rounded-xl" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
             </div>
           </div>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
          <div className="bg-green-600 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none"><Plus className="h-24 w-24" /></div>
            <Badge color="info" variant="solid" className="bg-white text-green-600 font-black uppercase tracking-[0.2em] px-3 py-1 mb-3">Master Gudang</Badge>
            <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Tambah Gudang Tujuan</h2>
            <p className="text-green-100 font-medium mt-2">Lengkapi form untuk mendaftarkan gudang tujuan baru di wilayah kerja.</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Gudang</label>
                <Input placeholder="Contoh: G123" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="h-12 font-bold bg-slate-50 dark:bg-slate-900 border-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Gudang</label>
                <Input placeholder="Nama lengkap gudang" value={formData.namagudang} onChange={(e) => setFormData({...formData, namagudang: e.target.value})} className="h-12 font-bold bg-slate-50 dark:bg-slate-900 border-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Gudang</label>
                <select 
                  className="w-full h-12 px-4 rounded-lg bg-slate-50 dark:bg-slate-900 font-bold outline-none focus:ring-2 focus:ring-green-500 border-none"
                  value={formData.idwil}
                  onChange={(e) => setFormData({...formData, idwil: e.target.value})}
                >
                  <option value="">Pilih Jenis...</option>
                  {getJenisGudangOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gudang Lini</label>
                <Input type="number" placeholder="Kapasitas Tonase" value={formData.linigudang} onChange={(e) => setFormData({...formData, linigudang: e.target.value})} className="h-12 font-bold bg-slate-50 dark:bg-slate-900 border-none" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
                <span className="bg-white dark:bg-slate-950 px-4 text-slate-400">Informasi Lokasi</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat Lengkap</label>
                <Input placeholder="Alamat jalan, nomor, dll" value={formData.alamat} onChange={(e) => setFormData({...formData, alamat: e.target.value})} className="h-12 font-bold bg-slate-50 dark:bg-slate-900 border-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kecamatan</label>
                <Input placeholder="Nama kecamatan" value={formData.kecamatan} onChange={(e) => setFormData({...formData, kecamatan: e.target.value})} className="h-12 font-bold bg-slate-50 dark:bg-slate-900 border-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kabupaten</label>
                <Input placeholder="Nama kabupaten" value={formData.kabupaten} onChange={(e) => setFormData({...formData, kabupaten: e.target.value})} className="h-12 font-bold bg-slate-50 dark:bg-slate-900 border-none" />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provinsi</label>
                <Input placeholder="Nama provinsi" value={formData.provinsi} onChange={(e) => setFormData({...formData, provinsi: e.target.value})} className="h-12 font-bold bg-slate-50 dark:bg-slate-900 border-none" />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setIsAddOpen(false)}>Batal</Button>
              <Button className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-black gap-2 rounded-xl shadow-lg shadow-green-500/20" onClick={handleSave} disabled={isSaving}>
                <Send className="h-4 w-4" /> {isSaving ? "MEMPROSES..." : "TAMBAH GUDANG"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
