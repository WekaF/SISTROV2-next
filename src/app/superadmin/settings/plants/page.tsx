"use client";
import React, { useState, useEffect } from "react";
import { 
  Building2, 
  MapPin, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Globe,
  Activity,
  ArrowRight,
  Loader2,
  X,
  CheckCircle2,
  ShieldCheck,
  Scale,
  Warehouse,
  Zap,
  Truck,
  Calendar,
  FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Plant {
  Id: number;
  code: string;
  name: string;
  RegionId: number;
  regionName: string;
  has_security: boolean;
  timbangan: boolean;
  has_gudang: boolean;
  is_so: boolean;
  is_percepatan: boolean;
  is_status_plant: boolean;
  is_tahun_pembuatan: boolean;
  is_odol: boolean;
  posto_tipe?: string;
}

interface Region {
  Id: number;
  Code: string;
  Name: string;
}

export default function PlantConfigPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  
  // State for search
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Query for plants
  const { data: plantsData, isLoading: loading} = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const res = await fetch('/api/admin/plants');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Plant[];
    }
  });

  // Query for regions
  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/regions');
      const data = await res.json();
      return data.data as Region[];
    }
  });

  const allPlants = plantsData || [];
  const filteredPlants = allPlants.filter(p => 
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (p.regionName || "").toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetPlant, setTargetPlant] = useState<Plant | null>(null);
  
  const [formData, setFormData] = useState({
    id: 0,
    code: "",
    name: "",
    regionId: 0,
    hasSecurity: false,
    hasTimbangan: false,
    hasGudang: false,
    isSo: false,
    isPercepatan: false,
    isStatusPlant: false,
    isTahunPembuatan: false,
    isOdol: false,
    postoTipe: ""
  });

  const resetForm = () => {
    setFormData({
      id: 0,
      code: "",
      name: "",
      regionId: 0,
      hasSecurity: false,
      hasTimbangan: false,
      hasGudang: false,
      isSo: false,
      isPercepatan: false,
      isStatusPlant: false,
      isTahunPembuatan: false,
      isOdol: false,
      postoTipe: ""
    });
    setIsEditing(false);
    setTargetPlant(null);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Plant Created", variant: "success" });
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
    onError: (err: any) => addToast({ title: "Creation Failed", description: err.message, variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/admin/plants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Plant Updated", variant: "success" });
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
    onError: (err: any) => addToast({ title: "Update Failed", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/plants?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Plant Deleted", variant: "success" });
      setShowDeleteConfirm(false);
      setTargetPlant(null);
      queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
    onError: (err: any) => addToast({ title: "Deletion Failed", description: err.message, variant: "destructive" })
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (plant: Plant) => {
    setFormData({
      id: plant.Id,
      code: plant.code,
      name: plant.name,
      regionId: plant.RegionId,
      hasSecurity: plant.has_security,
      hasTimbangan: plant.timbangan,
      hasGudang: plant.has_gudang,
      isSo: plant.is_so,
      isPercepatan: plant.is_percepatan,
      isStatusPlant: plant.is_status_plant,
      isTahunPembuatan: plant.is_tahun_pembuatan,
      isOdol: plant.is_odol,
      postoTipe: plant.posto_tipe || ""
    });
    setIsEditing(true);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Konfigurasi Plant & Company</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola seluruh entitas plant dan unit bisnis di ekosistem SISTRO.</p>
        </div>
        <Button 
          className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Plant Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="bg-brand-500 text-white border-none shadow-xl shadow-brand-500/10">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                     <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Total Plants</p>
                     <h3 className="text-2xl font-black">{allPlants.length}</h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs border-none bg-white dark:bg-white/[0.02]">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl dark:bg-brand-500/10">
                     <Activity className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Western Region</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                        {allPlants.filter(p => p.RegionId === 1).length}
                     </h3>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="shadow-theme-xs border-none bg-white dark:bg-white/[0.02]">
            <CardContent className="p-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
                     <Globe className="h-6 w-6" />
                  </div>
                  <div>
                     <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Eastern Region</p>
                     <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                        {allPlants.filter(p => p.RegionId === 2).length}
                     </h3>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <Card className="shadow-theme-xs border-none bg-white dark:bg-white/[0.02] overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10" 
                placeholder="Cari plant atau company..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
               <Badge color="info" className="uppercase font-black text-[10px] tracking-widest">Global View</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Plant Info</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Region</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Flags & Status</th>
                   <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic font-medium">
                      <div className="flex flex-col items-center gap-2">
                         <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                         Loading plants data...
                      </div>
                    </td>
                  </tr>
                ) : filteredPlants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">No plants found matching your search.</td>
                  </tr>
                ) : filteredPlants.map((plant) => (
                  <tr key={plant.Id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center font-bold dark:bg-brand-500/10 transition-transform group-hover:scale-105">
                           {plant.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{plant.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono font-bold tracking-widest">#{plant.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Badge color={plant.RegionId === 1 ? 'info' : 'warning'} size="sm" variant="light" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {plant.regionName || "No Region"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {plant.has_security && <Badge color="success" size="xs" variant="outline"><ShieldCheck className="h-2 w-2 mr-1" />Security</Badge>}
                          {plant.timbangan && <Badge color="indigo" size="xs" variant="outline"><Scale className="h-2 w-2 mr-1" />Timbangan</Badge>}
                          {plant.has_gudang && <Badge color="blue" size="xs" variant="outline"><Warehouse className="h-2 w-2 mr-1" />Lini</Badge>}
                          {plant.is_so && <Badge color="warning" size="xs" variant="outline"><FileText className="h-2 w-2 mr-1" />SO</Badge>}
                          {plant.is_percepatan && <Badge color="emerald" size="xs" variant="outline"><Zap className="h-2 w-2 mr-1" />Percepatan</Badge>}
                          {plant.is_status_plant && <Badge color="info" size="xs" variant="outline"><Activity className="h-2 w-2 mr-1" />Status</Badge>}
                          {plant.is_tahun_pembuatan && <Badge color="amber" size="xs" variant="outline"><Calendar className="h-2 w-2 mr-1" />Thn Buat</Badge>}
                          {plant.is_odol && <Badge color="rose" size="xs" variant="outline"><Truck className="h-2 w-2 mr-1" />ODOL</Badge>}
                          {plant.posto_tipe && <Badge color="primary" size="sm" variant="solid" className="font-black px-2">{plant.posto_tipe}</Badge>}
                          {!plant.has_security && !plant.timbangan && !plant.has_gudang && !plant.is_so && !plant.is_percepatan && !plant.is_status_plant && !plant.is_tahun_pembuatan && !plant.is_odol && !plant.posto_tipe && <span className="text-xs text-gray-400">-</span>}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                          onClick={() => handleEdit(plant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          onClick={() => {
                            setTargetPlant(plant);
                            setShowDeleteConfirm(true);
                          }}
                        >
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border-none bg-white dark:bg-[#1a1c1e] overflow-hidden">
             <CardHeader className="flex flex-row items-center justify-between border-b dark:border-white/5 pb-4 mb-4">
                <div>
                  <CardTitle>{isEditing ? "Edit Config Plant" : "Tambah Plant Baru"}</CardTitle>
                  <CardDescription>Sesuaikan parameter konfigurasi dan fitur operasional plant.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="h-4 w-4" /></Button>
             </CardHeader>
             <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Plant Name</label>
                        <Input 
                          placeholder="Plant Gresik" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Plant Code</label>
                        <Input 
                          placeholder="PKG" 
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                          required
                          disabled={isEditing}
                        />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Region Area</label>
                      <select 
                        className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-sm"
                        value={formData.regionId}
                        onChange={(e) => setFormData({...formData, regionId: parseInt(e.target.value)})}
                      >
                         <option value="0">Pilih Region...</option>
                         {regions?.map(r => (
                           <option key={r.Id} value={r.Id}>{r.Name}</option>
                         ))}
                      </select>
                   </div>
                   
                   <div className="pt-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block">Operational Flags & Capabilities</label>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                               <ShieldCheck className="h-4 w-4 text-emerald-500" />
                               <span className="text-xs font-semibold">Security</span>
                            </div>
                            <input type="checkbox" checked={formData.hasSecurity} onChange={(e) => setFormData({...formData, hasSecurity: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                         </div>
                         <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                               <Scale className="h-4 w-4 text-brand-400" />
                               <span className="text-xs font-semibold">Weighbridge</span>
                            </div>
                            <input type="checkbox" checked={formData.hasTimbangan} onChange={(e) => setFormData({...formData, hasTimbangan: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                         </div>
                         <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                               <Warehouse className="h-4 w-4 text-blue-400" />
                               <span className="text-xs font-semibold">Warehouse</span>
                            </div>
                            <input type="checkbox" checked={formData.hasGudang} onChange={(e) => setFormData({...formData, hasGudang: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                         </div>
                         <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                               <FileText className="h-4 w-4 text-warning-500" />
                               <span className="text-xs font-semibold">Sales Order</span>
                            </div>
                            <input type="checkbox" checked={formData.isSo} onChange={(e) => setFormData({...formData, isSo: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                         </div>
                         <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                               <Zap className="h-4 w-4 text-emerald-500" />
                               <span className="text-xs font-semibold">Percepatan</span>
                            </div>
                            <input type="checkbox" checked={formData.isPercepatan} onChange={(e) => setFormData({...formData, isPercepatan: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                         </div>
                         <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                               <Activity className="h-4 w-4 text-info-500" />
                               <span className="text-xs font-semibold">Plant Status</span>
                            </div>
                            <input type="checkbox" checked={formData.isStatusPlant} onChange={(e) => setFormData({...formData, isStatusPlant: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                         </div>
                         <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                               <Calendar className="h-4 w-4 text-amber-500" />
                               <span className="text-xs font-semibold">Thn Produksi</span>
                            </div>
                            <input type="checkbox" checked={formData.isTahunPembuatan} onChange={(e) => setFormData({...formData, isTahunPembuatan: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                         </div>
                         <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                            <div className="flex items-center gap-2">
                               <Truck className="h-4 w-4 text-rose-500" />
                               <span className="text-xs font-semibold">Is ODOL</span>
                            </div>
                            <input type="checkbox" checked={formData.isOdol} onChange={(e) => setFormData({...formData, isOdol: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                         </div>
                      </div>
                   </div>
                   
                   <div className="pt-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block">Posto System Config</label>
                      <div className="space-y-1.5">
                         <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Default Posto Type (Bagian Logic)</label>
                         <select 
                           className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.02] text-sm"
                           value={formData.postoTipe}
                           onChange={(e) => setFormData({...formData, postoTipe: e.target.value})}
                         >
                            <option value="">None (Auto-map only)</option>
                            <option value="POALL">POALL (General Posto)</option>
                            <option value="POCLUSTER">POCLUSTER (Plant Specific)</option>
                         </select>
                         <p className="text-[10px] text-gray-400 italic">Tipe ini akan digunakan sebagai fallback jika pemetaan PO otomatis gagal.</p>
                      </div>
                   </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t dark:border-white/5 pt-4">
                   <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
                   <Button 
                    type="submit" 
                    className="bg-brand-500 hover:bg-brand-600"
                    disabled={createMutation.isPending || updateMutation.isPending}
                   >
                      {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditing ? "Update Config" : "Simpan Plant"}
                   </Button>
                </CardFooter>
             </form>
          </Card>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Hapus Plant"
        description={`Apakah Anda yakin ingin menghapus plant ${targetPlant?.name}? Tindakan ini akan menghapus data plant selamanya dari database.`}
        onConfirm={() => targetPlant && deleteMutation.mutate(targetPlant.Id)}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
