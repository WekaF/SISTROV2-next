"use client";
import React, { useState } from "react";
import { 
  Truck, 
  Search, 
  Plus, 
  Filter, 
  History, 
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Table as TableIcon,
  RefreshCw,
  Loader2,
  Trash2,
  X,
  Calendar
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface FleetData {
  Nopol: string;
  VendorCode?: string;
  TransporterName?: string;
  NamaTransportir?: string;
  SumbuId?: number;
  AxleName?: string;
  NamaSumbu?: string;
  Type?: string;
  IsVerified: boolean | number;
  ExpiryDate?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export default function FleetMasterPage() {
  const { addToast } = useToast();
  const { apiJson, apiFetch } = useApi();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [selectedFleet, setSelectedFleet] = useState<FleetData | null>(null);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [verifyData, setVerifyData] = useState({ IsVerified: false, ExpiryDate: "" });

  const { data: fleetsResult, isLoading, isFetching } = useQuery({
    queryKey: ['admin-fleets', debouncedSearch],
    queryFn: async () => {
      const body = {
        draw: 1,
        start: 0,
        length: 25,
        search: { value: debouncedSearch }
      };
      const data = await apiTable("/api/Armada/DataTable", body);
      return data;
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/Armada/Verify', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Gagal verifikasi");
      return resData;
    },
    onSuccess: () => {
      addToast({ title: "Success", description: "Fleet status updated", variant: "success" });
      setIsVerifyOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-fleets'] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (nopol: string) => {
      const res = await apiFetch(`/api/Armada/DeleteData`, { 
        method: 'POST',
        body: JSON.stringify({ id: nopol })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      return data;
    },
    onSuccess: () => {
       addToast({ title: "Success", description: "Fleet record removed", variant: "success" });
       setIsDeleteOpen(false);
       queryClient.invalidateQueries({ queryKey: ['admin-fleets'] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleVerifyRequest = (fleet: FleetData) => {
    setSelectedFleet(fleet);
    setVerifyData({ 
      IsVerified: !!fleet.IsVerified, 
      ExpiryDate: fleet.ExpiryDate ? new Date(fleet.ExpiryDate).toISOString().split('T')[0] : "" 
    });
    setIsVerifyOpen(true);
  };

  const fleets = fleetsResult?.data || [];
  const totalUnits = fleets.length;
  const verifiedCount = fleets.filter((f: any) => f.IsVerified).length;
  const expiredCount = fleets.filter((f: any) => f.ExpiryDate && new Date(f.ExpiryDate) < new Date()).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Master Armada (Admin)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Validasi and verifikasi armada yang diajukan oleh transportir.</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-fleets'] })}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh Data
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl dark:bg-brand-500/10">
                     <Truck className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Total Registered</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">{totalUnits}</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs border-emerald-100 dark:border-emerald-900/10">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
                     <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Verified Units</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                        {totalUnits > 0 ? Math.round((verifiedCount / totalUnits) * 100) : 0}%
                     </h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs border-rose-100 dark:border-rose-900/10">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl dark:bg-rose-500/10">
                     <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Expired Access</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">{expiredCount}</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
         <CardHeader className="border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    className="pl-10" 
                    placeholder="Cari Nopol atau Transporter..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
               </div>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-white/[0.01]">
                     <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">NO. POLISI</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">TRANSPORTER</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">VEHICLE SPECS</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">VERIFICATION</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest text-right">ACTION</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {isLoading ? (
                        <tr>
                           <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                 <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                                 Memuat data armada...
                              </div>
                           </td>
                        </tr>
                     ) : fleets.length === 0 ? (
                        <tr>
                           <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Belum ada data armada terdaftar.</td>
                        </tr>
                     ) : fleets.map((f: FleetData, i: number) => (
                        <tr key={f.Nopol} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="bg-gray-900 text-white px-3 py-1.5 rounded-md font-mono text-sm font-bold shadow-sm ring-1 ring-white/20">
                                    {f.Nopol}
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <span className="text-sm font-bold text-gray-900 dark:text-white uppercase">{f.TransporterName || f.NamaTransportir || 'Unknown Vendor'}</span>
                                 <span className="text-[10px] font-mono text-gray-400">ID: {f.VendorCode}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex flex-col">
                                 <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{f.Type || 'General'}</span>
                                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{f.AxleName || f.NamaSumbu || 'Default Sumbu'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <Badge 
                                    color={f.IsVerified ? 'success' : 'warning'} 
                                    size="sm" 
                                    variant="light"
                                    className="uppercase font-bold"
                                 >
                                    {f.IsVerified ? 'Verified' : 'Pending'}
                                 </Badge>
                                 {f.ExpiryDate && (
                                    <span className={`text-[10px] font-bold ${new Date(f.ExpiryDate) < new Date() ? 'text-rose-500' : 'text-gray-400'}`}>
                                       Exp: {new Date(f.ExpiryDate).toLocaleDateString()}
                                    </span>
                                 )}
                              </div>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                 <Button variant="ghost" size="sm" className="text-gray-400 hover:text-brand-500" onClick={() => handleVerifyRequest(f)}>
                                    <CheckCircle2 className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="sm" className="text-gray-400 hover:text-rose-500" onClick={() => { setSelectedFleet(f); setIsDeleteOpen(true); }}>
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </CardContent>
      </Card>

      {/* Verify Modal */}
      <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
         <DialogContent className="max-w-md">
            <DialogHeader>
               <DialogTitle>Validasi & Verifikasi Armada</DialogTitle>
               <DialogDescription>Tentukan status verifikasi dan masa berlaku akses untuk unit {selectedFleet?.Nopol}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="verified-check" 
                    checked={verifyData.IsVerified}
                    onChange={(e) => setVerifyData({...verifyData, IsVerified: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <label htmlFor="verified-check" className="text-sm font-bold text-gray-900 dark:text-white">Verifikasi Unit (Verified)</label>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Masa Berlaku (Expiry Date)</label>
                  <div className="relative">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                     <Input 
                        type="date" 
                        value={verifyData.ExpiryDate}
                        onChange={(e) => setVerifyData({...verifyData, ExpiryDate: e.target.value})}
                        className="pl-10 rounded-xl font-bold"
                      />
                   </div>
                </div>
             </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => setIsVerifyOpen(false)}>Batal</Button>
                <Button className="bg-brand-500 font-bold" onClick={() => verifyMutation.mutate({ nopol: selectedFleet?.Nopol, ...verifyData })}>Simpan Verifikasi</Button>
             </DialogFooter>
          </DialogContent>
       </Dialog>
 
       {/* Delete Modal */}
       {selectedFleet && (
          <ConfirmDialog 
             open={isDeleteOpen}
             onOpenChange={setIsDeleteOpen}
             onConfirm={() => deleteMutation.mutate(selectedFleet.Nopol)}
             title="Hapus Record Armada?"
             description={`Anda yakin ingin menghapus data armada ${selectedFleet.Nopol}? Vendor harus mendaftarkan ulang unit ini jika nanti dibutuhkan.`}
             variant="danger"
          />
       )}
     </div>
   );
 }
