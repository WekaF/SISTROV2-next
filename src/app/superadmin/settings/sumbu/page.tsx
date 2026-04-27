"use client";
import React, { useState, useEffect } from "react";
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Weight,
  Loader2,
  X
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Sumbu {
  Id: number;
  jenistruk: string;
  nama: string;
  tahun: string;
  muatan: number;
  updatedon: string;
  updatedby: string;
  IdGrupTruk: number;
}

export default function SumbuPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: sumbuData, isLoading: loading } = useQuery({
    queryKey: ['sumbu'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sumbu');
      console.log("Sumbu GET Response:", res.status);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Sumbu[];
    }
  });

  const filteredData = (sumbuData || []).filter(s => 
    s.nama?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    s.jenistruk?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetSumbu, setTargetSumbu] = useState<Sumbu | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: 0,
    nama: "",
    jenistruk: "",
    tahun: "2026",
    muatan: 0,
    idGrupTruk: 0
  });

  const resetForm = () => {
    setFormData({ id: 0, nama: "", jenistruk: "", tahun: "2026", muatan: 0, idGrupTruk: 0 });
    setIsEditing(false);
    setTargetSumbu(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/sumbu?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Berhasil Dihapus", variant: "success" });
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['sumbu'] });
    },
    onError: (err: any) => addToast({ title: "Gagal Hapus", description: err.message, variant: "destructive" })
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      window.alert(`DEBUG: Direct Fetch ${method} /api/admin/sumbu\nPayload: ` + JSON.stringify(formData));
      
      const res = await fetch('/api/admin/sumbu', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      window.alert(`DEBUG: Server Response: ` + JSON.stringify(data));
      
      if (data.success) {
        addToast({ title: isEditing ? "Sumbu Updated" : "Sumbu Created", variant: "success" });
        setShowModal(false);
        resetForm();
        queryClient.invalidateQueries({ queryKey: ['sumbu'] });
      } else {
        throw new Error(data.error || "Gagal menyimpan data");
      }
    } catch (err: any) {
      console.error("Save Error:", err);
      addToast({ title: "Operation Failed", description: err.message, variant: "destructive" });
      window.alert("DEBUG: Catch Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (s: Sumbu) => {
    setFormData({
      id: s.Id,
      nama: s.nama,
      jenistruk: s.jenistruk,
      tahun: s.tahun,
      muatan: Number(s.muatan),
      idGrupTruk: s.IdGrupTruk
    });
    setIsEditing(true);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Master Sumbu Kendaraan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Konfigurasi jenis truk dan tonase muatan standar.</p>
        </div>
        <Button 
          className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          onClick={() => { resetForm(); setShowModal(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Sumbu
        </Button>
      </div>

      <Card className="shadow-theme-xs border-none bg-white dark:bg-white/[0.02] overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-10" placeholder="Cari jenis truk atau sumbu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Jenis Truk</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Tipe Sumbu</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Standar Muatan</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-500" /></td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">Data tidak ditemukan</td></tr>
                ) : filteredData.map((s) => (
                  <tr key={s.Id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center font-bold dark:bg-brand-500/10"><Truck className="h-5 w-5" /></div>
                        <div><div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{s.nama}</div><div className="text-[10px] text-gray-400 font-mono">ID: {s.Id}</div></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <Badge color="info" variant="light" size="sm" className="font-mono">{s.jenistruk}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-1.5 font-black text-gray-900 dark:text-white">
                          <Weight className="h-3 w-3 text-brand-500" />
                          {Number(s.muatan).toLocaleString()} <span className="text-[10px] text-gray-400 uppercase">KG</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => { setTargetSumbu(s); setShowDeleteConfirm(true); }}><Trash2 className="h-4 w-4" /></Button>
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
          <Card className="w-full max-w-md bg-white dark:bg-[#1a1c1e] border-none shadow-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b dark:border-white/5 pb-4 mb-4">
              <CardTitle>{isEditing ? "Edit Sumbu" : "Tambah Sumbu"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Jenis Truk / Nama Kendaraan</label><Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} placeholder="Contoh: Colt Diesel (CDD)" required /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Tipe Sumbu (Konfigurasi)</label><Input value={formData.jenistruk} onChange={(e) => setFormData({...formData, jenistruk: e.target.value})} placeholder="Contoh: 1.1 atau 1.2" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Muatan Standar (KG)</label><Input type="number" value={formData.muatan} onChange={(e) => setFormData({...formData, muatan: Number(e.target.value)})} required /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Tahun</label><Input value={formData.tahun} onChange={(e) => setFormData({...formData, tahun: e.target.value})} /></div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-4 border-t dark:border-white/5">
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Batal</Button>
                <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Update" : "Simpan"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <ConfirmDialog 
        open={showDeleteConfirm} 
        onOpenChange={setShowDeleteConfirm} 
        title="Hapus Sumbu" 
        description={`Yakin ingin menghapus ${targetSumbu?.nama}?`} 
        onConfirm={() => { if (targetSumbu) deleteMutation.mutate(targetSumbu.Id); }} 
        variant="danger" 
        isLoading={deleteMutation.isPending} 
      />
    </div>
  );
}
