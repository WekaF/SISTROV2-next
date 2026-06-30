"use client";
import { useState, useEffect } from "react";
import {
  Zap, Plus, Search, RefreshCw, Loader2, X, Weight, Truck
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";

interface PercepatanRecord {
  KodePlant: string;
  IdSumbu: number;
  IdGrupTruk: number;
  MuatanPercepatan: number;
  TanggalAwal: string;
  TanggalAkhir: string;
  nama: string;
  jenistruk: string;
  muatan: number;
}

interface TarikItem {
  Id: number;
  IdGrupTruk: number;
  jenistruk: string;
  nama: string;
  muatan: number;
  muatanPercepatan: number | null;
}


export default function ArmadaPercepatanPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyCode } = useCompany();

  const sessionPlant: string = activeCompanyCode || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: percepatanData, isLoading } = useQuery({
    queryKey: ["armada-percepatan", sessionPlant],
    queryFn: async () => {
      const res = await fetch("/api/armada/percepatan");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as PercepatanRecord[];
    },
  });


  const filteredData = Array.isArray(percepatanData)
    ? percepatanData.filter(
        (p) =>
          p.jenistruk?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.nama?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          p.KodePlant?.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : [];

  const [showModal, setShowModal] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(sessionPlant);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [tarikItems, setTarikItems] = useState<(TarikItem & { inputValue: string })[]>([]);
  const [isTarikLoading, setIsTarikLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const openModal = () => {
    setSelectedPlant(sessionPlant);
    setValidFrom("");
    setValidTo("");
    setTarikItems([]);
    setShowModal(true);
  };

  const handleTarik = async () => {
    setIsTarikLoading(true);
    try {
      const res = await fetch("/api/armada/percepatan/tarik");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const items = Array.isArray(data.data) ? data.data : [];
      setTarikItems(
        items.map((item: TarikItem) => ({
          ...item,
          inputValue: item.muatanPercepatan ? String(item.muatanPercepatan) : "",
        }))
      );
    } catch (err: any) {
      addToast({ title: "Gagal memuat data sumbu", description: err.message, variant: "destructive" });
    } finally {
      setIsTarikLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPlant || !validFrom || !validTo) {
      addToast({
        title: "Lengkapi semua field",
        description: "Plant, tanggal awal, dan tanggal akhir wajib diisi",
        variant: "destructive",
      });
      return;
    }
    const payload = tarikItems
      .filter((item) => parseFloat(item.inputValue) > 0)
      .map((item) => ({
        kodePlant: selectedPlant,
        idGrupTruk: item.IdGrupTruk,
        idSumbu: item.Id,
        muatanPercepatan: parseFloat(item.inputValue),
        tanggalAwal: validFrom,
        tanggalAkhir: validTo,
      }));
    if (payload.length === 0) {
      addToast({
        title: "Tidak ada data",
        description: "Isi minimal satu tonase percepatan",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/armada/percepatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      addToast({ title: "Konfigurasi Disimpan", variant: "success" });
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["armada-percepatan", sessionPlant] });
    } catch (err: any) {
      addToast({ title: "Gagal Menyimpan", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            Konfigurasi Armada Percepatan
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Data tonase percepatan dalam satuan Ton</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20" onClick={openModal}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Data Percepatan
        </Button>
      </div>

      <Card className="shadow-theme-xs border-none bg-white dark:bg-white/[0.02] overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Cari plant atau jenis truk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Plant</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Jenis Kendaraan</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest text-center">Sumbu</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest text-center">Max Tonase</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest text-center">Tonase Percepatan</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest text-center">Valid From</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest text-center">Valid To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 italic">
                      Belum ada data percepatan
                    </td>
                  </tr>
                ) : (
                  filteredData.map((p, idx) => (
                    <tr
                      key={`${p.KodePlant}-${p.IdSumbu}-${idx}`}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-xs bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">
                          {p.KodePlant}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center dark:bg-emerald-500/10">
                            <Truck className="h-4 w-4 text-emerald-500" />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">{p.jenistruk}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge color="info" variant="light" size="sm" className="font-mono">
                          {p.nama}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm font-bold text-gray-700 dark:text-gray-300">
                          <Weight className="h-3 w-3 text-gray-400" />
                          {Number(p.muatan).toLocaleString()} Ton
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                          <Zap className="h-3 w-3 text-emerald-500" />
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {Number(p.MuatanPercepatan).toLocaleString()} Ton
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {p.TanggalAwal ? new Date(p.TanggalAwal).toLocaleDateString("id-ID") : "-"}
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {p.TanggalAkhir ? new Date(p.TanggalAkhir).toLocaleDateString("id-ID") : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-8 bg-white dark:bg-[#1a1c1e] rounded-2xl shadow-2xl overflow-hidden">
            <div
              className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5"
              style={{ background: "linear-gradient(135deg, #003473 0%, #00509d 100%)" }}
            >
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-white" />
                <h2 className="text-lg font-bold text-white">Konfigurasi Data Percepatan</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Kode Plant</label>
                  <Input value={selectedPlant} readOnly className="bg-gray-100 dark:bg-white/5 cursor-not-allowed font-mono font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      Tanggal Berlaku (Awal)
                    </label>
                    <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      Tanggal Berlaku (Akhir)
                    </label>
                    <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full bg-[#003473] hover:bg-[#00509d] text-white"
                  onClick={handleTarik}
                  disabled={isTarikLoading}
                >
                  {isTarikLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Tarik Data Sumbu Kendaraan
                </Button>
                {tarikItems.length === 0 && (
                  <p className="text-center text-xs text-gray-400">
                    * Klik tombol di atas untuk memuat daftar sumbu yang tersedia
                  </p>
                )}
              </div>

              {tarikItems.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-white/5">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-white/[0.02]">
                      <tr className="border-b border-gray-100 dark:border-white/5">
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                          Jenis Truk
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                          Sumbu
                        </th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest text-center">
                          Max (Ton)
                        </th>
                        <th
                          className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest text-center"
                          style={{ width: 180 }}
                        >
                          Tonase Percepatan
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {tarikItems.map((item, idx) => (
                        <tr key={item.Id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <td className="px-4 py-3 font-semibold text-sm text-gray-900 dark:text-white">
                            {item.jenistruk}
                          </td>
                          <td className="px-4 py-3">
                            <Badge color="info" variant="light" size="sm" className="font-mono">
                              {item.nama}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-300">
                            {Number(item.muatan).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={tarikItems[idx].inputValue}
                              onChange={(e) => {
                                const next = [...tarikItems];
                                next[idx] = { ...next[idx], inputValue: e.target.value };
                                setTarikItems(next);
                              }}
                              className="text-center font-bold"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a1c1e]">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleSave}
                disabled={isSaving || tarikItems.length === 0}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan Konfigurasi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
