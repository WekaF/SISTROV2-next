"use client";
import React, { useState } from "react";
import { 
  Package, 
  Truck, 
  User, 
  Phone, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";

export default function TicketBookingPage() {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    NoPosto: "",
    Nopol: "",
    DriverName: "",
    DriverPhone: "",
    ProductId: ""
  });

  const { data: postoResult, isLoading: loadingPosto } = useQuery({
    queryKey: ['rekanan-postos'],
    queryFn: async () => {
      const res = await fetch('/api/pod/posto');
      const data = await res.json();
      return data.data || [];
    }
  });

  const { data: fleetResult, isLoading: loadingFleet } = useQuery({
    queryKey: ['rekanan-fleets'],
    queryFn: async () => {
      const res = await fetch('/api/rekanan/fleet');
      const data = await res.json();
      return (data.data || []).filter((f: any) => f.IsVerified);
    }
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/rekanan/tiket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);
      return resData;
    },
    onSuccess: (data) => {
      addToast({ title: "Berhasil", description: `Tiket ${data.data.bookingNo} berhasil dibuat`, variant: "success" });
      window.location.href = '/tiket';
    },
    onError: (err: any) => {
      addToast({ title: "Gagal", description: err.message, variant: "destructive" });
    }
  });

  const handlePostoChange = (val: string) => {
    const selected = (postoResult || []).find((p: any) => p.id === val);
    setFormData({
      ...formData,
      NoPosto: val,
      ProductId: selected?.productId || ""
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Booking Tiket Antrian</h1>
          <p className="text-sm text-gray-500 font-medium">Terbitkan tiket antrian berdasarkan order POSTO yang Anda miliki.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-theme-xs">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800">
               <CardTitle className="text-sm font-black uppercase tracking-widest text-brand-500">Informasi Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5 ml-1">
                    <Package className="h-3 w-3" /> Pilih Order POSTO
                  </label>
                  <select 
                    className="w-full h-11 px-3 border border-gray-100 rounded-xl bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500"
                    value={formData.NoPosto}
                    onChange={(e) => handlePostoChange(e.target.value)}
                  >
                     <option value="">-- Pilih Nomor Posto --</option>
                     {postoResult?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.id} - {p.product}</option>
                     ))}
                  </select>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5 ml-1">
                    <Truck className="h-3 w-3" /> Pilih Armada
                  </label>
                  <select 
                    className="w-full h-11 px-3 border border-gray-100 rounded-xl bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500"
                    value={formData.Nopol}
                    onChange={(e) => setFormData({...formData, Nopol: e.target.value})}
                  >
                     <option value="">-- Pilih Nopol Terverifikasi --</option>
                     {fleetResult?.map((f: any) => (
                        <option key={f.Nopol} value={f.Nopol}>{f.Nopol} ({f.AxleName})</option>
                     ))}
                  </select>
                  {fleetResult?.length === 0 && !loadingFleet && (
                    <p className="text-[10px] text-rose-500 font-bold">* Belum ada armada terverifikasi. Silakan ajukan armada terlebih dahulu.</p>
                  )}
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5 ml-1">
                       <User className="h-3 w-3" /> Nama Driver
                    </label>
                    <Input 
                      placeholder="Input nama lengkap driver" 
                      value={formData.DriverName}
                      onChange={(e) => setFormData({...formData, DriverName: e.target.value})}
                      className="rounded-xl font-bold h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex items-center gap-1.5 ml-1">
                       <Phone className="h-3 w-3" /> No. Telepon
                    </label>
                    <Input 
                      placeholder="Contoh: 0812345678" 
                      value={formData.DriverPhone}
                      onChange={(e) => setFormData({...formData, DriverPhone: e.target.value})}
                      className="rounded-xl font-bold h-11"
                    />
                  </div>
               </div>
            </CardContent>
            <CardHeader className="border-t border-gray-100 dark:border-gray-800 p-6 flex flex-row gap-4">
               <Button 
                 className="flex-grow bg-brand-500 hover:bg-brand-600 h-12 rounded-xl text-base font-bold shadow-lg shadow-brand-500/20"
                 onClick={() => bookingMutation.mutate(formData)}
                 disabled={bookingMutation.isPending || !formData.NoPosto || !formData.Nopol || !formData.DriverName}
               >
                  {bookingMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Terbitkan Tiket Sekarang"}
               </Button>
            </CardHeader>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="bg-brand-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Ticket className="h-24 w-24" />
              </div>
              <CardContent className="p-6 space-y-4">
                 <h3 className="font-black uppercase tracking-widest text-xs text-brand-300">Ketentuan Booking</h3>
                 <ul className="space-y-3">
                    <li className="flex gap-2 text-xs">
                       <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                       <span>Pastikan armada sudah terverifikasi oleh Admin untuk muncul di pilihan.</span>
                    </li>
                    <li className="flex gap-2 text-xs">
                       <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                       <span>Tiket hanya dapat diterbitkan selama kuota harian plant masih tersedia.</span>
                    </li>
                    <li className="flex gap-2 text-xs text-brand-200">
                       <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                       <span>Double booking untuk satu nopol di waktu yang sama akan ditolak sistem.</span>
                    </li>
                 </ul>
              </CardContent>
           </Card>

           <Card className="shadow-theme-xs">
              <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                 <CardTitle className="text-xs font-black uppercase text-gray-400 tracking-widest">Review Pilihan</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Posto:</span>
                    <span className="font-bold">{formData.NoPosto || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Produk:</span>
                    <span className="font-bold">{postoResult?.find((p: any) => p.id === formData.NoPosto)?.product || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Armada:</span>
                    <span className="font-bold">{formData.Nopol || '-'}</span>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

// Icon helper
function Ticket(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9V5.2a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2V9a2 2 0 0 0 0 6v3.8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V15a2 2 0 0 0 0-6z" />
      <path d="M15 3v18" />
      <path d="M8 3v18" />
    </svg>
  );
}
