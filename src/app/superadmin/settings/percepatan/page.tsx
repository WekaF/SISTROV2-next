"use client";
import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2,
  Weight,
  Loader2,
  X,
  ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Percepatan {
  KodePlant: string;
  IdGrupTruk: number;
  IdSumbu: number;
  MuatanPercepatan: number;
  TanggalAwal: string;
  TanggalAkhir: string;
  sumbuNama: string;
  axleType: string;
  plantName: string;
}

interface Plant {
  code: string;
  name: string;
}

interface Sumbu {
  Id: number;
  nama: string;
  jenistruk: string;
}

export default function PercepatanPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: percepatanData, isLoading: loading } = useQuery({
    queryKey: ['percepatan'],
    queryFn: async () => {
      const res = await fetch('/api/admin/percepatan');
      console.log("Percepatan GET Response:", res.status);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Percepatan[];
    }
  });

  const { data: plants } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const res = await fetch('/api/admin/plants');
      const data = await res.json();
      return data.data as Plant[];
    }
  });

  const { data: sumbuList } = useQuery({
    queryKey: ['sumbu'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sumbu');
      const data = await res.json();
      return data.data as Sumbu[];
    }
  });

  const filteredData = (percepatanData || []).filter(p => 
    p.plantName?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    p.sumbuNama?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.KodePlant?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetItem, setTargetItem] = useState<Percepatan | null>(null);
  
  const [formData, setFormData] = useState({
    kodePlant: "",
    idGrupTruk: 0,
    idSumbu: 0,
    muatanPercepatan: 0,
    tanggalAwal: "2026-04-01",
    tanggalAkhir: "2026-04-30"
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      window.alert("DEBUG: POST /api/admin/percepatan\nPayload: " + JSON.stringify(payload));
      console.log("POST /api/admin/percepatan", payload);
      const res = await fetch('/api/admin/percepatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Gagal menyimpan data");
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Konfigurasi Berhasil Disimpan", variant: "success" });
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['percepatan'] });
    },
    onError: (err: any) => {
      console.error("Save Percepatan Error:", err);
      addToast({ title: "Gagal Menyimpan", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: Percepatan) => {
      const res = await fetch(`/api/admin/percepatan?plant=${item.KodePlant.trim()}&sumbu=${item.IdSumbu}&grup=${item.IdGrupTruk}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Konfigurasi Dihapus", variant: "success" });
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['percepatan'] });
    },
    onError: (err: any) => addToast({ title: "Gagal Menghapus", description: err.message, variant: "destructive" })
  });

  const handleEdit = (p: Percepatan) => {
    setFormData({
      kodePlant: p.KodePlant.trim(),
      idGrupTruk: p.IdGrupTruk,
      idSumbu: p.IdSumbu,
      muatanPercepatan: Number(p.MuatanPercepatan),
      tanggalAwal: p.TanggalAwal ? new Date(p.TanggalAwal).toISOString().split('T')[0] : "2026-04-01",
      tanggalAkhir: p.TanggalAkhir ? new Date(p.TanggalAkhir).toISOString().split('T')[0] : "2026-04-30"
    });
    setIsEditing(true);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Master Percepatan Tonase</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Konfigurasi limit muatan khusus untuk status percepatan per plant.</p>
        </div>
        <Button 
          className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
          onClick={() => {
            setIsEditing(false);
            setFormData({ kodePlant: "", idGrupTruk: 0, idSumbu: 0, muatanPercepatan: 0, tanggalAwal: "2026-04-01", tanggalAkhir: "2026-04-30" });
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Aturan
        </Button>
      </div>

      <Card className="shadow-theme-xs border-none bg-white dark:bg-white/[0.02] overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-10" placeholder="Cari plant atau jenis truk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Plant / Company</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Truck Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Muatan Percepatan</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Periode Berlaku</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" /></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Belum ada aturan percepatan</td></tr>
                ) : filteredData.map((p, idx) => (
                  <tr key={`${p.KodePlant}-${p.IdSumbu}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center font-bold dark:bg-emerald-500/10"><Building2 className="h-5 w-5" /></div>
                        <div><div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{p.plantName || p.KodePlant}</div><div className="text-[10px] text-gray-400 font-mono font-bold tracking-widest">CODE: {p.KodePlant}</div></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-sm text-gray-900 dark:text-white">{p.sumbuNama || `Sumbu #${p.IdSumbu}`}</span>
                          <span className="text-[10px] text-gray-400 font-mono uppercase">{p.axleType}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/5 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                          <Weight className="h-3 w-3 text-emerald-500" />
                          <span className="font-black text-emerald-600 dark:text-emerald-400">{Number(p.MuatanPercepatan).toLocaleString()} <span className="text-[9px] uppercase">KG</span></span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-500">
                          <span>{p.TanggalAwal ? new Date(p.TanggalAwal).toLocaleDateString() : '-'}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{p.TanggalAkhir ? new Date(p.TanggalAkhir).toLocaleDateString() : '-'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => { setTargetItem(p); setShowDeleteConfirm(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-[#1a1c1e] border-none shadow-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b dark:border-white/5 pb-4 mb-4">
               <CardTitle>{isEditing ? "Edit Aturan" : "Tambah Aturan"}</CardTitle>
               <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <form onSubmit={(e) => { 
                e.preventDefault(); 
                window.alert("DEBUG: onSubmit triggered for Percepatan. isEditing=" + isEditing);
                saveMutation.mutate(formData); 
            }}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Plant / Company</label>
                      <select 
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-sm"
                        value={formData.kodePlant}
                        onChange={(e) => setFormData({...formData, kodePlant: e.target.value})}
                        required
                        disabled={isEditing}
                      >
                         <option value="">Pilih Plant...</option>
                         {plants?.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Jenis Truk / Sumbu</label>
                      <select 
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-sm"
                        value={formData.idSumbu}
                        onChange={(e) => setFormData({...formData, idSumbu: parseInt(e.target.value)})}
                        required
                        disabled={isEditing}
                      >
                         <option value="0">Pilih Jenis...</option>
                         {sumbuList?.map(s => <option key={s.Id} value={s.Id}>{s.nama} ({s.jenistruk})</option>)}
                      </select>
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Muatan Percepatan (KG)</label>
                   <Input type="number" value={formData.muatanPercepatan} onChange={(e) => setFormData({...formData, muatanPercepatan: Number(e.target.value)})} required />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Tanggal Awal Berlaku</label>
                      <Input type="date" value={formData.tanggalAwal} onChange={(e) => setFormData({...formData, tanggalAwal: e.target.value})} required />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Tanggal Akhir Berlaku</label>
                      <Input type="date" value={formData.tanggalAkhir} onChange={(e) => setFormData({...formData, tanggalAkhir: e.target.value})} required />
                   </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-4 border-t dark:border-white/5">
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Batal</Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={saveMutation.isPending}>
                   {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {isEditing ? "Update Aturan" : "Simpan Aturan"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <ConfirmDialog 
        open={showDeleteConfirm} 
        onOpenChange={setShowDeleteConfirm} 
        title="Hapus Aturan" 
        description={`Apakah Anda yakin ingin menghapus aturan percepatan untuk plant ${targetItem?.plantName || targetItem?.KodePlant}? Tindakan ini tidak dapat dibatalkan.`} 
        onConfirm={() => { if (targetItem) deleteMutation.mutate(targetItem); }} 
        variant="danger" 
        isLoading={deleteMutation.isPending} 
      />
    </div>
  );
}
