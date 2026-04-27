"use client";
import React, { useState } from "react";
import { 
  Home, 
  MapPin, 
  Search, 
  Plus, 
  ArrowRightLeft, 
  Warehouse, 
  Navigation,
  Globe,
  Settings2,
  Table as TableIcon,
  RefreshCw,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Target,
  Truck,
  CheckCircle2,
  X
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface WarehouseData {
  ID: string;
  Deskripsi: string;
  Alamat: string;
  Kecamatan: string;
  Kabupaten: string;
  Propinsi: string;
  TujuanCount?: number;
  MuatCount?: number;
}

export default function WarehouseMasterPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Modal states
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseData | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTujuanOpen, setIsTujuanOpen] = useState(false);
  const [isMuatOpen, setIsMuatOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<WarehouseData>>({});
  const [selectedCompany, setSelectedCompany] = useState("");
  const [activeMappings, setActiveMappings] = useState<any[]>([]);
  const [loadingMapData, setLoadingMapData] = useState(false);

  const { data: warehousesResult, isLoading, isFetching, error: queryError } = useQuery({
    queryKey: ['warehouses', debouncedSearch, page, limit],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/admin/gudang?search=${debouncedSearch}&page=${page}&limit=${limit}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to fetch warehouses");
        return data;
      } catch (err: any) {
        console.error("Fetch error:", err);
        throw err;
      }
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/gudang/sync', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      addToast({ title: "Sync Success", description: data.message, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (err: any) => {
      addToast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/gudang/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data: any) => {
      addToast({ title: "Deleted", description: data.message, variant: "success" });
      setIsDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (err: any) => {
      addToast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<WarehouseData>) => {
      const res = await fetch(`/api/admin/gudang/${data.ID}`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);
      return resData;
    },
    onSuccess: (data: any) => {
      addToast({ title: "Updated", description: data.message, variant: "success" });
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (err: any) => {
      addToast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  });

  // Query for plants/companies
  const { data: plantsData } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const res = await fetch('/api/admin/plants');
      return res.json();
    },
  });

  const plants = plantsData?.data || [];

  const fetchMappings = async (type: 'tujuan' | 'muat', warehouseId: string) => {
    setLoadingMapData(true);
    try {
      const res = await fetch(`/api/admin/gudang/mapping/${type}?warehouseId=${warehouseId}`);
      const data = await res.json();
      if (data.success) {
        setActiveMappings(data.data);
      }
    } catch (error) {
      console.error(`Failed to fetch ${type} mappings:`, error);
    } finally {
      setLoadingMapData(false);
    }
  };

  const addMappingMutation = useMutation({
    mutationFn: async ({ type, payload }: { type: 'tujuan' | 'muat', payload: any }) => {
      const res = await fetch(`/api/admin/gudang/mapping/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      addToast({ title: "Mapping Berhasil", description: "Gudang telah dipetakan ke company.", variant: "success" });
      setSelectedCompany("");
      if (selectedWarehouse) fetchMappings(variables.type, selectedWarehouse.ID);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (error: any) => {
      addToast({ title: "Gagal Mapping", description: error.message, variant: "destructive" });
    }
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'tujuan' | 'muat', id: number }) => {
      const res = await fetch(`/api/admin/gudang/mapping/${type}?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      addToast({ title: "Mapping Dihapus", variant: "success" });
      if (selectedWarehouse) fetchMappings(variables.type, selectedWarehouse.ID);
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (error: any) => {
      addToast({ title: "Gagal Menghapus", description: error.message, variant: "destructive" });
    }
  });

  const handleAction = (action: 'view' | 'edit' | 'delete' | 'tujuan' | 'muat', warehouse: WarehouseData) => {
    setSelectedWarehouse(warehouse);
    if (action === 'view') setIsViewOpen(true);
    if (action === 'edit') {
      setEditFormData(warehouse);
      setIsEditOpen(true);
    }
    if (action === 'delete') setIsDeleteOpen(true);
    if (action === 'tujuan') {
       setIsTujuanOpen(true);
       setSelectedCompany("");
       fetchMappings('tujuan', warehouse.ID);
    }
    if (action === 'muat') {
       setIsMuatOpen(true);
       setSelectedCompany("");
       fetchMappings('muat', warehouse.ID);
    }
  };

  const warehouses = warehousesResult?.data || [];
  const pagination = warehousesResult?.pagination || { total: 0, totalPages: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Master Gudang & Mapping</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Manajemen data gudang muat & tujuan serta konfigurasi mapping distribusi.</p>
        </div>
        <div className="flex gap-2">
           <Button 
            variant="outline" 
            className="gap-2 border-brand-200 text-brand-600 hover:bg-brand-50"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
           >
              {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync APG
           </Button>
           <Button className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Gudang
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="p-4 border-gray-100 dark:border-gray-800 shadow-theme-xs flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center mb-2 dark:bg-brand-500/10">
               <Warehouse className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">{pagination.total}</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Master Gudang</div>
         </Card>
         <Card className="p-4 border-gray-100 dark:border-gray-800 shadow-theme-xs flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-2 dark:bg-indigo-500/10">
               <Target className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">214</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gudang Tujuan (Active)</div>
         </Card>
         <Card className="p-4 border-gray-100 dark:border-gray-800 shadow-theme-xs flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center mb-2 dark:bg-emerald-500/10">
               <Truck className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">12</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gudang Muat (Active)</div>
         </Card>
         <Card className="p-4 border-gray-100 dark:border-gray-800 shadow-theme-xs flex flex-col items-center text-center">
            <div className="h-10 w-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center mb-2 dark:bg-rose-500/10">
               <Globe className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">12</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Wilayah Provinsi</div>
         </Card>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
         <CardHeader className="border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
               <div className="relative w-full md:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    className="pl-10" 
                    placeholder="Cari kode, nama, kabupaten..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
               </div>
               <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="text-gray-500"><TableIcon className="h-4 w-4 mr-2" /> Export CSV</Button>
               </div>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto min-h-[400px]">
               <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-gray-50 dark:bg-white/[0.02]">
                     <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Deskripsi / Alamat</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Kode Gudang</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Kabupaten</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Provinsi</th>
                        <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                     {isLoading ? (
                        <tr>
                           <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                 <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                                 Memuat data gudang...
                              </div>
                           </td>
                        </tr>
                     ) : queryError ? (
                        <tr>
                           <td colSpan={5} className="px-6 py-12 text-center text-rose-500">
                              <div className="flex flex-col items-center gap-2">
                                 <X className="h-8 w-8 text-rose-500" />
                                 <p className="font-bold">Gagal memuat data</p>
                                 <p className="text-xs">{(queryError as any).message}</p>
                                 <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['warehouses'] })} className="mt-2 text-rose-500 border-rose-200">Retry Fetch</Button>
                              </div>
                           </td>
                        </tr>
                     ) : warehouses.length === 0 ? (
                        <tr>
                           <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Data gudang tidak ditemukan.</td>
                        </tr>
                     ) : warehouses.map((wh: WarehouseData) => (
                        <tr key={wh.ID} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <div className="h-10 w-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center border border-gray-100 dark:bg-white/5 dark:border-gray-800 transition-transform group-hover:rotate-12">
                                    <Home className="h-5 w-5" />
                                 </div>
                                 <div className="max-w-[250px]">
                                    <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm truncate">{wh.Deskripsi}</div>
                                    <div className="text-[10px] text-gray-400 line-clamp-1">{wh.Alamat || '-'}</div>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <div className="text-[10px] font-mono text-gray-500 font-bold tracking-widest bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded w-fit italic">#{wh.ID}</div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">{wh.Kabupaten || '-'}</span>
                           </td>
                           <td className="px-6 py-4">
                               <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">{wh.Propinsi || '-'}</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                               <TooltipProvider>
                               <div className="flex items-center justify-end gap-1.5">
                                   <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-2 mr-1 gap-1">
                                      <Tooltip>
                                         <TooltipTrigger>
                                            <Button variant="ghost" size="icon-xs" className="text-gray-400 hover:text-brand-500 hover:bg-brand-50" onClick={() => handleAction('view', wh)}><Eye className="h-3.5 w-3.5" /></Button>
                                         </TooltipTrigger>
                                         <TooltipContent><p className="text-[10px]">View Detail</p></TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                         <TooltipTrigger>
                                            <Button variant="ghost" size="icon-xs" className="text-gray-400 hover:text-indigo-500 hover:bg-indigo-50" onClick={() => handleAction('edit', wh)}><Edit className="h-3.5 w-3.5" /></Button>
                                         </TooltipTrigger>
                                         <TooltipContent><p className="text-[10px]">Edit Data</p></TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                         <TooltipTrigger>
                                            <Button variant="ghost" size="icon-xs" className="text-gray-400 hover:text-rose-500 hover:bg-rose-50" onClick={() => handleAction('delete', wh)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                         </TooltipTrigger>
                                         <TooltipContent><p className="text-[10px]">Delete Warehouse</p></TooltipContent>
                                      </Tooltip>
                                  </div>
                                  <div className="flex items-center gap-1">
                                      <Tooltip>
                                         <TooltipTrigger>
                                            <Button 
                                             variant={wh.TujuanCount && wh.TujuanCount > 0 ? "default" : "outline"}
                                             size="sm" 
                                             className={`h-7 text-[10px] font-bold px-2.5 gap-1.5 ${wh.TujuanCount && wh.TujuanCount > 0 ? 'bg-indigo-600' : 'border-brand-100 text-brand-600 hover:bg-brand-50'}`}
                                             onClick={() => handleAction('tujuan', wh)}
                                            >
                                               <Target className="h-3 w-3" />
                                               Tujuan {wh.TujuanCount && wh.TujuanCount > 0 ? `(${wh.TujuanCount})` : ''}
                                            </Button>
                                         </TooltipTrigger>
                                         <TooltipContent><p className="text-[10px]">Mapping sebagai Gudang Tujuan</p></TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                         <TooltipTrigger>
                                            <Button 
                                             variant={wh.MuatCount && wh.MuatCount > 0 ? "default" : "outline"}
                                             size="sm" 
                                             className={`h-7 text-[10px] font-bold px-2.5 gap-1.5 ${wh.MuatCount && wh.MuatCount > 0 ? 'bg-emerald-600' : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'}`}
                                             onClick={() => handleAction('muat', wh)}
                                            >
                                               <Truck className="h-3 w-3" />
                                               Muat {wh.MuatCount && wh.MuatCount > 0 ? `(${wh.MuatCount})` : ''}
                                            </Button>
                                         </TooltipTrigger>
                                         <TooltipContent><p className="text-[10px]">Mapping sebagai Gudang Muat</p></TooltipContent>
                                      </Tooltip>
                                  </div>
                               </div>
                               </TooltipProvider>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* Pagination Controls */}
            {pagination.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 gap-4">
                <div className="flex items-center gap-4">
                   <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                     Showing <span className="text-gray-900">{(page - 1) * limit + 1}</span> - <span className="text-gray-900">{Math.min(page * limit, pagination.total)}</span> of <span className="text-gray-900">{pagination.total}</span>
                   </div>
                   <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Rows per page:</span>
                       <select 
                          className="h-7 text-[10px] font-bold border-gray-200 dark:border-gray-800 rounded bg-white dark:bg-gray-900 px-1 outline-none focus:ring-1 focus:ring-brand-500"
                          value={limit}
                          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                       >
                          {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                       </select>
                   </div>
                </div>
                
                <div className="flex gap-1.5">
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="h-8 text-[10px] font-black uppercase"
                     disabled={page === 1}
                     onClick={() => setPage(p => Math.max(1, p - 1))}
                   >
                     Prev
                   </Button>
                   <div className="flex items-center gap-1">
                     {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                       let pageNum;
                       if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                       } else {
                          // Dynamic range around current page
                          if (page <= 3) pageNum = i + 1;
                          else if (page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                          else pageNum = page - 2 + i;
                       }
                       
                       return (
                         <Button
                           key={pageNum}
                           variant={page === pageNum ? "default" : "ghost"}
                           size="sm"
                           className="w-8 h-8 p-0 text-[10px] font-black"
                           onClick={() => setPage(pageNum)}
                         >
                           {pageNum}
                         </Button>
                       );
                     })}
                     {pagination.totalPages > 5 && page < pagination.totalPages - 2 && (
                        <>
                           <span className="text-gray-400 px-1 text-[10px]">...</span>
                           <Button
                              variant="ghost"
                              size="sm"
                              className="w-8 h-8 p-0 text-[10px] font-black"
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
                     className="h-8 text-[10px] font-black uppercase"
                     disabled={page === pagination.totalPages}
                     onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                   >
                     Next
                   </Button>
                </div>
              </div>
            )}
         </CardContent>
      </Card>

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
               <div className="h-12 w-12 bg-brand-50 text-brand-500 rounded-2xl flex items-center justify-center dark:bg-brand-500/10 shadow-sm border border-brand-100">
                  <Warehouse className="h-6 w-6" />
               </div>
               <div>
                  <DialogTitle className="uppercase tracking-tight text-xl">{selectedWarehouse?.Deskripsi || 'Detail Gudang'}</DialogTitle>
                  <DialogDescription className="font-mono font-bold text-xs tracking-widest text-brand-500">ID: #{selectedWarehouse?.ID || '-'}</DialogDescription>
               </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kabupaten</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white uppercase">{selectedWarehouse?.Kabupaten || '-'}</div>
               </div>
               <div className="space-y-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Provinsi</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white uppercase">{selectedWarehouse?.Propinsi || '-'}</div>
               </div>
            </div>
            <div className="space-y-1">
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alamat Lengkap</div>
               <div className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-gray-800 italic">{selectedWarehouse?.Alamat || '-'}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)} className="rounded-xl font-bold">Close Detail</Button>
            <Button className="rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600" onClick={() => { setIsViewOpen(false); if (selectedWarehouse) handleAction('edit', selectedWarehouse); }}>Edit Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Informasi Gudang</DialogTitle>
            <DialogDescription>Perbarui informasi master gudang di bawah ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
               <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Nama / Deskripsi Gudang</label>
               <Input 
                  value={editFormData?.Deskripsi || ''} 
                  onChange={(e) => setEditFormData({...editFormData, Deskripsi: e.target.value})}
                  className="rounded-xl border-gray-100 font-bold h-11"
               />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Alamat Lengkap</label>
               <Input 
                  value={editFormData?.Alamat || ''} 
                  onChange={(e) => setEditFormData({...editFormData, Alamat: e.target.value})}
                  className="rounded-xl border-gray-100 font-bold h-11"
               />
            </div>
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Kabupaten</label>
                  <Input 
                     value={editFormData?.Kabupaten || ''} 
                     onChange={(e) => setEditFormData({...editFormData, Kabupaten: e.target.value})}
                     className="rounded-xl border-gray-100 font-bold h-11 uppercase"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Provinsi</label>
                  <Input 
                     value={editFormData?.Propinsi || ''} 
                     onChange={(e) => setEditFormData({...editFormData, Propinsi: e.target.value})}
                     className="rounded-xl border-gray-100 font-bold h-11 uppercase"
                  />
               </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl font-black italic">Batal</Button>
            <Button className="rounded-xl font-black italic bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20" onClick={() => updateMutation.mutate(editFormData)}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapping Tujuan Modal */}
      <Dialog open={isTujuanOpen} onOpenChange={setIsTujuanOpen}>
         <DialogContent className="max-w-lg shadow-2xl border-none">
            <DialogHeader>
               <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center dark:bg-indigo-500/10 shadow-sm border border-indigo-100">
                     <Target className="h-6 w-6" />
                  </div>
                  <div>
                     <DialogTitle className="uppercase tracking-tight text-xl">Mapping Gudang Tujuan</DialogTitle>
                     <DialogDescription className="font-bold text-xs text-indigo-500">{selectedWarehouse?.Deskripsi || 'Gudang'}</DialogDescription>
                  </div>
               </div>
            </DialogHeader>
            <div className="space-y-6 py-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Assign to Company / Plant</label>
                  <div className="flex gap-2">
                     <select 
                       className="flex-1 h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/5 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                       value={selectedCompany}
                       onChange={(e) => setSelectedCompany(e.target.value)}
                     >
                        <option value="">Pilih Company...</option>
                        {plants.map((p: any) => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
                     </select>
                     <Button 
                       className="bg-indigo-600 hover:bg-indigo-700 h-11 px-6 rounded-xl font-bold"
                       onClick={() => addMappingMutation.mutate({ 
                         type: 'tujuan', 
                         payload: { warehouseId: selectedWarehouse?.ID, companyCode: selectedCompany } 
                       })}
                       disabled={!selectedCompany || addMappingMutation.isPending}
                     >
                        {addMappingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                     </Button>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center justify-between ml-1">
                     <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Active Mappings
                     </span>
                     {loadingMapData && <Loader2 className="h-3 w-3 animate-spin" />}
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                     {activeMappings.length > 0 ? activeMappings.map((m) => (
                       <div key={m.Id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-gray-800 group hover:border-indigo-200 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="h-9 w-9 bg-white dark:bg-gray-800 text-indigo-500 rounded-xl flex items-center justify-center font-black text-xs shadow-sm shadow-indigo-500/10">
                                {m.CompanyName?.[0] || 'C'}
                             </div>
                             <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{m.CompanyName}</div>
                                <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-tighter">{m.CompanyCode}</div>
                             </div>
                          </div>
                          <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                           onClick={() => deleteMappingMutation.mutate({ type: 'tujuan', id: m.Id })}
                          >
                             <Trash2 className="h-4 w-4" />
                          </Button>
                       </div>
                     )) : !loadingMapData && (
                       <div className="text-center py-10 bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                          <p className="text-xs text-gray-400 font-medium italic">Belum ada mapping untuk gudang ini.</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
            <DialogFooter className="bg-gray-50 dark:bg-white/5 -mx-6 -mb-6 p-4 mt-2">
               <Button variant="outline" onClick={() => setIsTujuanOpen(false)} className="rounded-xl font-bold">Selesai</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Mapping Muat Modal */}
      <Dialog open={isMuatOpen} onOpenChange={setIsMuatOpen}>
         <DialogContent className="max-w-lg shadow-2xl border-none">
            <DialogHeader>
               <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center dark:bg-emerald-500/10 shadow-sm border border-emerald-100">
                     <Truck className="h-6 w-6" />
                  </div>
                  <div>
                     <DialogTitle className="uppercase tracking-tight text-xl">Mapping Gudang Muat</DialogTitle>
                     <DialogDescription className="font-bold text-xs text-emerald-500">{selectedWarehouse?.Deskripsi || 'Gudang'}</DialogDescription>
                  </div>
               </div>
            </DialogHeader>
            <div className="space-y-6 py-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Assign to Company / Plant</label>
                  <div className="flex gap-2">
                     <select 
                       className="flex-1 h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/5 font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                       value={selectedCompany}
                       onChange={(e) => setSelectedCompany(e.target.value)}
                     >
                        <option value="">Pilih Company...</option>
                        {plants.map((p: any) => <option key={p.code} value={p.code}>{p.name} ({p.code})</option>)}
                     </select>
                     <Button 
                       className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl font-bold"
                       onClick={() => addMappingMutation.mutate({ 
                         type: 'muat', 
                         payload: { warehouseId: selectedWarehouse?.ID, companyCode: selectedCompany } 
                       })}
                       disabled={!selectedCompany || addMappingMutation.isPending}
                     >
                        {addMappingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                     </Button>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center justify-between ml-1">
                     <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Active Mappings
                     </span>
                     {loadingMapData && <Loader2 className="h-3 w-3 animate-spin" />}
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                     {activeMappings.length > 0 ? activeMappings.map((m) => (
                       <div key={m.Id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-gray-800 group hover:border-emerald-200 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="h-9 w-9 bg-white dark:bg-gray-800 text-emerald-500 rounded-xl flex items-center justify-center font-black text-xs shadow-sm shadow-emerald-500/10">
                                {m.CompanyName?.[0] || 'C'}
                             </div>
                             <div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">{m.CompanyName}</div>
                                <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-tighter">{m.CompanyCode}</div>
                             </div>
                          </div>
                          <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                           onClick={() => deleteMappingMutation.mutate({ type: 'muat', id: m.Id })}
                          >
                             <Trash2 className="h-4 w-4" />
                          </Button>
                       </div>
                     )) : !loadingMapData && (
                       <div className="text-center py-10 bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                          <p className="text-xs text-gray-400 font-medium italic">Belum ada mapping untuk gudang ini.</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
            <DialogFooter className="bg-gray-50 dark:bg-white/5 -mx-6 -mb-6 p-4 mt-2">
               <Button variant="outline" onClick={() => setIsMuatOpen(false)} className="rounded-xl font-bold">Selesai</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {selectedWarehouse && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onConfirm={() => deleteMutation.mutate(selectedWarehouse.ID)}
          title="Hapus Gudang?"
          description={`Anda yakin ingin menghapus gudang ${selectedWarehouse.Deskripsi} (#${selectedWarehouse.ID})? Tindakan ini tidak dapat dibatalkan.`}
          variant="danger"
        />
      )}
    </div>
  );
}
