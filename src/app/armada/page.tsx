"use client";
import React, { useState } from "react";
import { 
  Truck, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  X
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface FleetData {
  Nopol: string;
  VendorCode: string;
  TransporterName?: string;
  AxleName?: string;
  Type?: string;
  IsVerified: boolean;
  ExpiryDate?: string;
  CreatedAt: string;
}

export default function ArmadaPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const role = (session?.user as any)?.role;
  const isRekanan = role === 'rekanan';

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [formData, setFormData] = useState({ Nopol: "", SumbuId: "", Type: "" });

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: fleetsResult, isLoading, isFetching } = useQuery({
    queryKey: ['fleets', debouncedSearch, role],
    queryFn: async () => {
      const endpoint = isRekanan ? '/api/rekanan/fleet' : `/api/admin/fleet?search=${debouncedSearch}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    }
  });

  const { data: sumbuResult } = useQuery({
    queryKey: ['sumbu-list'],
    queryFn: async () => {
      const res = await fetch('/api/admin/sumbu');
      const data = await res.json();
      return data.data || [];
    },
    enabled: isSubmitOpen
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/rekanan/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);
      return resData;
    },
    onSuccess: () => {
      addToast({ title: "Success", description: "Armada berhasil diajukan untuk verifikasi", variant: "success" });
      setIsSubmitOpen(false);
      setFormData({ Nopol: "", SumbuId: "", Type: "" });
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const fleets = fleetsResult?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {isRekanan ? "Data Armada Saya" : "Manajemen Armada"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {isRekanan 
              ? "Daftar unit kendaraan Anda yang terdaftar di sistem SISTRO." 
              : "Kelola daftar kendaraan, perizinan, dan status operasional armada global."}
          </p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['fleets'] })}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
           </Button>
           {isRekanan && (
             <Button size="sm" onClick={() => setIsSubmitOpen(true)} className="bg-brand-500 shadow-lg shadow-brand-500/20">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Unit Baru
             </Button>
           )}
        </div>
      </div>

      <Card className="shadow-theme-xs">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10" 
                placeholder={isRekanan ? "Cari Nopol..." : "Cari Nopol atau Transporter..."} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {!isRekanan && (
              <Badge color="info" variant="light">Admin View</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto min-h-[400px]">
             <table className="w-full text-left min-w-[800px]">
               <thead className="bg-gray-50 dark:bg-white/[0.02]">
                 <tr className="border-b border-gray-100 dark:border-gray-800">
                   <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Nopol / ID</th>
                   {!isRekanan && <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Transportir</th>}
                   <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Vehicle Specs</th>
                   <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Status / Expiry</th>
                   <th className="px-6 py-4 text-xs font-black uppercase text-gray-400 tracking-widest text-right">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                 {isLoading ? (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" />
                     </td>
                   </tr>
                 ) : fleets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Data tidak ditemukan.</td>
                    </tr>
                 ) : fleets.map((f: FleetData) => (
                   <tr key={f.Nopol} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                     <td className="px-6 py-4">
                        <div className="bg-gray-900 text-white px-3 py-1.5 rounded-md font-mono text-sm font-bold inline-block shadow-sm">
                           {f.Nopol}
                        </div>
                     </td>
                     {!isRekanan && (
                        <td className="px-6 py-4">
                           <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">{f.TransporterName}</span>
                        </td>
                     )}
                     <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{f.Type || 'General'}</span>
                           <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{f.AxleName || 'Default'}</span>
                        </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                           <Badge color={f.IsVerified ? "success" : "warning"} size="sm" variant="light" className="w-fit italic font-bold">
                              {f.IsVerified ? "Verified" : "Pending Verification"}
                           </Badge>
                           {f.ExpiryDate && (
                              <span className="text-[10px] text-gray-400 font-bold">Exp: {new Date(f.ExpiryDate).toLocaleDateString()}</span>
                           )}
                        </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="hover:text-brand-500"><Eye className="h-4 w-4" /></Button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </CardContent>
      </Card>

      {/* Submission Modal for Rekanan */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
         <DialogContent className="max-w-md">
            <DialogHeader>
               <DialogTitle>Pengajuan Armada Baru</DialogTitle>
               <DialogDescription>Daftarkan unit kendaraan baru Anda untuk diverifikasi oleh admin.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Nomor Polisi</label>
                  <Input 
                    placeholder="Contoh: W 1234 AB" 
                    value={formData.Nopol}
                    onChange={(e) => setFormData({...formData, Nopol: e.target.value})}
                    className="font-bold uppercase h-11 rounded-xl"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Jenis Sumbu (Axle)</label>
                  <select 
                    className="w-full h-11 px-3 border border-gray-100 rounded-xl bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
                    value={formData.SumbuId}
                    onChange={(e) => setFormData({...formData, SumbuId: e.target.value})}
                  >
                     <option value="">Pilih Sumbu...</option>
                     {sumbuResult?.map((s: any) => (
                        <option key={s.Id} value={s.Id}>{s.nama}</option>
                     ))}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Tipe Kendaraan</label>
                  <Input 
                    placeholder="Contoh: Trailer 40ft" 
                    value={formData.Type}
                    onChange={(e) => setFormData({...formData, Type: e.target.value})}
                    className="font-bold h-11 rounded-xl"
                  />
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsSubmitOpen(false)}>Batal</Button>
               <Button className="bg-brand-500" onClick={() => submitMutation.mutate(formData)}>Ajukan Unit</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
