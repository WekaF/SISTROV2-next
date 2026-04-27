"use client";
import React, { useState } from "react";
import { 
  Truck, 
  Building2, 
  Mail, 
  Phone, 
  UserCheck, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  RefreshCw, 
  Loader2,
  X,
  MapPin,
  ShieldCheck,
  Building
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
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
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface TransportData {
  VendorCode: string;
  Name: string;
  singkatan?: string;
  username?: string;
  ID?: number;
  Address?: string;
  Email?: string;
  Phone?: string;
  IsActive: boolean;
  isCharter?: boolean;
  startCharter?: string;
  endCharter?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export default function TransportMasterPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page to 1 when search changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Modal states
  const [selectedTransport, setSelectedTransport] = useState<TransportData | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<TransportData>>({});

  const { data: transportsResult, isLoading, isFetching } = useQuery({
    queryKey: ['transports', debouncedSearch, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/transport?search=${debouncedSearch}&page=${page}&limit=${limit}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch transports");
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<TransportData>) => {
      const res = await fetch('/api/admin/transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);
      return resData;
    },
    onSuccess: () => {
      addToast({ title: "Success", description: "Transport created successfully", variant: "success" });
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ['transports'] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TransportData>) => {
      const res = await fetch('/api/admin/transport', { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);
      return resData;
    },
    onSuccess: () => {
      addToast({ title: "Success", description: "Transport updated successfully", variant: "success" });
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['transports'] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (vendorCode: string) => {
      const res = await fetch(`/api/admin/transport?vendorCode=${vendorCode}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Success", description: "Transport deleted successfully", variant: "success" });
      setIsDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['transports'] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleAction = (action: 'view' | 'edit' | 'delete', transport: TransportData) => {
    setSelectedTransport(transport);
    if (action === 'view') setIsViewOpen(true);
    if (action === 'edit') {
      setFormData(transport);
      setIsEditOpen(true);
    }
    if (action === 'delete') setIsDeleteOpen(true);
  };

  const transports = transportsResult?.data || [];
  const pagination = transportsResult?.pagination || { total: 0, totalPages: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Master Data Transport</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Manajemen vendor transportir dan pemetaan ke akun pengguna.</p>
        </div>
        <Button 
          className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          onClick={() => { setFormData({}); setIsAddOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Transport
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl dark:bg-brand-500/10">
                     <Truck className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Total Vendor</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">{isLoading ? '...' : pagination.total}</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
                     <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Active Vendors</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                        {isLoading ? '...' : transports.filter((t: any) => t.IsActive).length}
                     </h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl dark:bg-amber-500/10">
                     <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 uppercase font-black">Global Mapping</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">Enabled</h3>
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
                placeholder="Cari Vendor Code atau Nama..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['transports'] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Vendor</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Username</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Code</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Type</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                        Memuat data transport...
                      </div>
                    </td>
                  </tr>
                ) : transports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">Data transport tidak ditemukan.</td>
                  </tr>
                ) : transports.map((t: TransportData) => (
                  <tr key={t.VendorCode} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center border border-gray-100 dark:bg-white/5 dark:border-gray-800 transition-transform group-hover:rotate-12">
                          <Building className="h-5 w-5" />
                        </div>
                        <div className="max-w-[250px]">
                          <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm truncate">
                             {t.Name} {t.singkatan ? `(${t.singkatan})` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                         <UserCheck className="h-3.5 w-3.5 text-brand-500" />
                         {t.username || <span className="italic text-gray-400 font-normal">No account</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="light" color="info" className="font-mono text-[10px] tracking-widest uppercase">
                        {t.VendorCode}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {t.isCharter ? (
                         <div className="flex flex-col gap-1">
                            <Badge color="warning" variant="light" size="sm" className="w-fit">Charter</Badge>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                               Exp: {t.endCharter ? new Date(t.endCharter).toLocaleDateString() : '-'}
                            </span>
                         </div>
                      ) : (
                         <Badge color="default" variant="light" size="sm" className="w-fit text-gray-400">Regular</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={t.IsActive ? 'success' : 'error'} variant="light" className="text-[10px] uppercase font-bold">
                        {t.IsActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="hover:text-brand-500" onClick={() => handleAction('view', t)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-indigo-500" onClick={() => handleAction('edit', t)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-rose-500" onClick={() => handleAction('delete', t)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="text-xs text-gray-500">
                Showing <span className="font-bold text-gray-900 dark:text-white">{(page - 1) * limit + 1}</span> to <span className="font-bold text-gray-900 dark:text-white">{Math.min(page * limit, pagination.total)}</span> of <span className="font-bold text-gray-900 dark:text-white">{pagination.total}</span> entries
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <span className="sr-only">Previous page</span>
                  {'<'}
                </Button>
                
                <div className="flex items-center gap-1 px-2">
                   {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                     let pageNum = page;
                     if (pagination.totalPages <= 5) {
                       pageNum = i + 1;
                     } else {
                       if (page <= 3) pageNum = i + 1;
                       else if (page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                       else pageNum = page - 2 + i;
                     }
                     
                     return (
                        <Button
                           key={pageNum}
                           variant={page === pageNum ? "default" : "outline"}
                           size="sm"
                           className={`h-8 w-8 p-0 ${page === pageNum ? 'bg-brand-500 text-white' : ''}`}
                           onClick={() => setPage(pageNum)}
                        >
                           {pageNum}
                        </Button>
                     );
                   })}
                   
                   {pagination.totalPages > 5 && page < pagination.totalPages - 2 && (
                     <>
                        <span className="text-gray-400 px-1">...</span>
                        <Button
                           variant="outline"
                           size="sm"
                           className="h-8 w-8 p-0"
                           onClick={() => setPage(pagination.totalPages)}
                        >
                           {pagination.totalPages}
                        </Button>
                     </>
                   )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                >
                  <span className="sr-only">Next page</span>
                  {'>'}
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Vendor Transport</DialogTitle>
            <DialogDescription>Masukkan informasi vendor transport baru.</DialogDescription>
          </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Vendor Code (SAP)</label>
                  <Input 
                     value={formData?.VendorCode || ''} 
                     onChange={(e) => setFormData({...formData, VendorCode: e.target.value})}
                     placeholder="V12345"
                     className="rounded-xl font-bold h-11"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ID (External)</label>
                  <Input 
                     type="number"
                     value={formData?.ID || ''} 
                     onChange={(e) => setFormData({...formData, ID: Number(e.target.value)})}
                     className="rounded-xl font-bold h-11"
                  />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Username (Login)</label>
                  <Input 
                     value={formData?.username || ''} 
                     onChange={(e) => setFormData({...formData, username: e.target.value})}
                     className="rounded-xl font-bold h-11"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Singkatan</label>
                  <Input 
                     value={formData?.singkatan || ''} 
                     onChange={(e) => setFormData({...formData, singkatan: e.target.value})}
                     className="rounded-xl font-bold h-11"
                  />
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nama Vendor</label>
               <Input 
                  value={formData?.Name || ''} 
                  onChange={(e) => setFormData({...formData, Name: e.target.value})}
                  className="rounded-xl font-bold h-11"
               />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email</label>
                  <Input 
                     value={formData?.Email || ''} 
                     onChange={(e) => setFormData({...formData, Email: e.target.value})}
                     className="rounded-xl font-bold h-11"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Phone</label>
                  <Input 
                     value={formData?.Phone || ''} 
                     onChange={(e) => setFormData({...formData, Phone: e.target.value})}
                     className="rounded-xl font-bold h-11"
                  />
               </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl space-y-4">
               <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Charter Mode</label>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase">{formData?.isCharter ? 'On' : 'Off'}</span>
                     <input 
                        type="checkbox" 
                        checked={formData?.isCharter || false} 
                        onChange={(e) => setFormData({...formData, isCharter: e.target.checked})}
                        className="w-4 h-4 accent-brand-500"
                     />
                  </div>
               </div>
               {formData?.isCharter && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">Start</label>
                        <Input 
                           type="date"
                           value={formData?.startCharter || ''} 
                           onChange={(e) => setFormData({...formData, startCharter: e.target.value})}
                           className="h-9 text-xs rounded-lg"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">End</label>
                        <Input 
                           type="date"
                           value={formData?.endCharter || ''} 
                           onChange={(e) => setFormData({...formData, endCharter: e.target.value})}
                           className="h-9 text-xs rounded-lg"
                        />
                     </div>
                  </div>
               )}
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button className="bg-brand-500" onClick={() => createMutation.mutate(formData)}>Simpan Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vendor Transport</DialogTitle>
            <DialogDescription>Perbarui informasi vendor transport.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2 opacity-50">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Vendor Code (Locked)</label>
                  <Input value={formData?.VendorCode || ''} disabled className="rounded-xl font-bold h-11" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">ID (External)</label>
                  <Input 
                     type="number"
                     value={formData?.ID || ''} 
                     onChange={(e) => setFormData({...formData, ID: Number(e.target.value)})}
                     className="rounded-xl font-bold h-11"
                  />
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Username (Login)</label>
                  <Input 
                     value={formData?.username || ''} 
                     onChange={(e) => setFormData({...formData, username: e.target.value})}
                     className="rounded-xl font-bold h-11"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Singkatan</label>
                  <Input 
                     value={formData?.singkatan || ''} 
                     onChange={(e) => setFormData({...formData, singkatan: e.target.value})}
                     className="rounded-xl font-bold h-11"
                  />
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nama Vendor</label>
               <Input 
                  value={formData?.Name || ''} 
                  onChange={(e) => setFormData({...formData, Name: e.target.value})}
                  className="rounded-xl font-bold h-11"
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Alamat</label>
               <Input 
                  value={formData?.Address || ''} 
                  onChange={(e) => setFormData({...formData, Address: e.target.value})}
                  className="rounded-xl font-bold h-11"
               />
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl space-y-4">
               <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Charter Mode</label>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-gray-400 uppercase">{formData?.isCharter ? 'On' : 'Off'}</span>
                     <input 
                        type="checkbox" 
                        checked={formData?.isCharter || false} 
                        onChange={(e) => setFormData({...formData, isCharter: e.target.checked})}
                        className="w-4 h-4 accent-brand-500"
                     />
                  </div>
               </div>
               {formData?.isCharter && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">Start</label>
                        <Input 
                           type="date"
                           value={formData?.startCharter ? new Date(formData.startCharter).toISOString().split('T')[0] : ''} 
                           onChange={(e) => setFormData({...formData, startCharter: e.target.value})}
                           className="h-9 text-xs rounded-lg"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-gray-400">End</label>
                        <Input 
                           type="date"
                           value={formData?.endCharter ? new Date(formData.endCharter).toISOString().split('T')[0] : ''} 
                           onChange={(e) => setFormData({...formData, endCharter: e.target.value})}
                           className="h-9 text-xs rounded-lg"
                        />
                     </div>
                  </div>
               )}
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-white/5 rounded-xl">
              <input 
                type="checkbox" 
                checked={formData?.IsActive} 
                onChange={(e) => setFormData({...formData, IsActive: e.target.checked})}
                id="active-check-edit"
                className="w-4 h-4 accent-brand-500"
              />
              <label htmlFor="active-check-edit" className="text-xs font-black uppercase text-gray-600 dark:text-gray-400 tracking-widest">Vendor Aktif</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button className="bg-brand-500" onClick={() => updateMutation.mutate(formData)}>Update Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="uppercase tracking-tight text-xl">{selectedTransport?.Name}</DialogTitle>
                <DialogDescription>Vendor Code: {selectedTransport?.VendorCode}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
               <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                 <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">ID</p>
                 <p className="text-xs font-bold mt-1">{selectedTransport?.ID || '-'}</p>
               </div>
               <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                 <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Login</p>
                 <p className="text-xs font-bold mt-1 truncate">{selectedTransport?.username || '-'}</p>
               </div>
               <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                 <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Nick</p>
                 <p className="text-xs font-bold mt-1 text-brand-500">{selectedTransport?.singkatan || '-'}</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-brand-100 dark:border-brand-900/20">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Status</p>
                <Badge color={selectedTransport?.IsActive ? 'success' : 'error'} size="sm" className="mt-1">
                  {selectedTransport?.IsActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Type</p>
                <Badge color={selectedTransport?.isCharter ? 'warning' : 'default'} variant="light" size="sm" className="mt-1 uppercase italic">
                  {selectedTransport?.isCharter ? 'Charter' : 'Regular'}
                </Badge>
              </div>
            </div>
            {selectedTransport?.isCharter && (
               <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                  <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-2">Charter Period</p>
                  <div className="flex justify-between items-center">
                     <div className="text-xs font-bold">{selectedTransport.startCharter ? new Date(selectedTransport.startCharter).toLocaleDateString() : '-'}</div>
                     <div className="text-[10px] text-amber-400 font-black px-2">TO</div>
                     <div className="text-xs font-bold">{selectedTransport.endCharter ? new Date(selectedTransport.endCharter).toLocaleDateString() : '-'}</div>
                  </div>
               </div>
            )}
            <div className="space-y-3 pt-2 bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-2xl">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                   <Mail className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <span className="font-bold text-xs">{selectedTransport?.Email || '-'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                   <Phone className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <span className="font-bold text-xs">{selectedTransport?.Phone || '-'}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm mt-1 shrink-0">
                   <MapPin className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <span className="font-bold text-xs leading-relaxed">{selectedTransport?.Address || 'No address provided.'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {selectedTransport && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onConfirm={() => deleteMutation.mutate(selectedTransport.VendorCode)}
          title="Hapus Vendor?"
          description={`Anda yakin ingin menghapus vendor ${selectedTransport.Name} (${selectedTransport.VendorCode})? Tindakan ini tidak dapat dibatalkan.`}
          variant="danger"
        />
      )}
    </div>
  );
}
