"use client";
import { useState, useEffect, useCallback } from "react";
import {
  MapPin, Search, RefreshCw, Plus, Loader2,
  Trash2, FileEdit, Settings2, ShieldCheck,
  Calendar, CheckCircle2, Warehouse,
  Info, TriangleAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useCompany } from "@/context/CompanyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable, DataTableColumn, DataTableParams } from "@/components/ui/DataTable";
import { MultiSelect, MultiSelectOption } from "@/components/ui/MultiSelect";
import { normalizeRole } from "@/lib/role-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// Types based on legacy API
interface MappingData {
  number?: number;
  id: number;
  companycode: string;
  tujuan: string;
  tujuanString: string;
  startdatetimeString: string;
  enddatetimeString: string;
  action: string;
}

interface WarehouseOption {
  idgudang: string;
  namagudang: string;
}

export default function MappingZeroOdolPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role?.toLowerCase();
  const { apiFetch, apiJson } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();
  const queryClient = useQueryClient();

  const [selectedTujuan, setSelectedTujuan] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    id: 0,
    startdatetime: "",
    enddatetime: "",
    tujuan: "",
  });
  const [deleteMappingTarget, setDeleteMappingTarget] = useState<number | null>(null);
  const [showOdolConfirm, setShowOdolConfirm] = useState(false);
  const [showPercepatanConfirm, setShowPercepatanConfirm] = useState(false);

  const handleDeleteMappingConfirm = () => {
    if (deleteMappingTarget == null) return;
    deleteMappingMutation.mutate(deleteMappingTarget);
    setDeleteMappingTarget(null);
  };

  const allRoles: string[] = ((session?.user as any)?.roles as string[] | undefined) ?? [
    (session?.user as any)?.role,
  ].filter(Boolean);
  const canManage = allRoles.some((r) =>
    ["superadmin", "staffarea", "pod", "admin", "candal", "ti"].includes(normalizeRole(r))
  );

  // Queries
  const { data: odolStatus, isLoading: isLoadingOdol } = useQuery({
    queryKey: ["odol-status", activeCompanyCode],
    queryFn: async () => {
      const res = await apiFetch("/api/MappingZeroOdol/DataChangeODOL");
      return res.json();
    },
    enabled: !!activeCompanyCode,
  });

  const { data: percepatanStatus, isLoading: isLoadingPercepatan } = useQuery({
    queryKey: ["percepatan-status", activeCompanyCode],
    queryFn: async () => {
      const res = await apiFetch("/api/MappingZeroOdol/DataChangePercepatan");
      return res.json();
    },
    enabled: !!activeCompanyCode,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouse-options", activeCompanyCode],
    queryFn: async () => {
      const data = await apiJson<WarehouseOption[]>("/api/MappingZeroOdol/DataGudang");
      return (data || []).map(w => ({
        value: w.idgudang,
        label: `${w.idgudang} - ${w.namagudang}`
      }));
    },
    enabled: !!activeCompanyCode,
  });

  // Mutations
  const toggleOdolMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const fd = new URLSearchParams();
      fd.append("tujuan", active ? "true" : "false");
      const res = await apiFetch("/api/MappingZeroOdol/PostChangeODOL", {
        method: "POST",
        body: fd.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odol-status"] });
      addToast({ title: "Berhasil", description: "Status ZERO ODOL diperbarui", variant: "success" });
    },
    onError: (err: any) => addToast({ title: "Gagal", description: err.message, variant: "destructive" })
  });

  const togglePercepatanMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const fd = new URLSearchParams();
      fd.append("tujuan", active ? "true" : "false");
      const res = await apiFetch("/api/MappingZeroOdol/PostChangePercepatan", {
        method: "POST",
        body: fd.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["percepatan-status"] });
      addToast({ title: "Berhasil", description: "Status PERCEPATAN diperbarui", variant: "success" });
    },
    onError: (err: any) => addToast({ title: "Gagal", description: err.message, variant: "destructive" })
  });

  const addMappingMutation = useMutation({
    mutationFn: async () => {
      if (selectedTujuan.length === 0 || !startDate || !endDate) {
        throw new Error("Mohon lengkapi form");
      }
      
      const formatDate = (d: string) => d.split("-").reverse().join("/"); // yyyy-mm-dd -> dd/mm/yyyy

      const payload = {
        tujuan: selectedTujuan,
        startdatetime: formatDate(startDate),
        enddatetime: formatDate(endDate)
      };
      const res = await apiFetch("/api/MappingZeroOdol/PostData", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-zeroodol-list"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-options"] });
      setSelectedTujuan([]);
      setStartDate("");
      setEndDate("");
      addToast({ title: "Berhasil", description: "Mapping berhasil ditambahkan", variant: "success" });
    },
    onError: (err: any) => addToast({ title: "Gagal", description: err.message, variant: "destructive" })
  });

  const updateMappingMutation = useMutation({
    mutationFn: async (data: typeof editFormData) => {
      // Ensure data is sent in legacy format if needed
      const res = await apiFetch("/api/MappingZeroOdol/UpdateData", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-zeroodol-list"] });
      setIsEditModalOpen(false);
      addToast({ title: "Berhasil", description: "Mapping diperbarui", variant: "success" });
    },
    onError: (err: any) => addToast({ title: "Gagal", description: err.message, variant: "destructive" })
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const fd = new URLSearchParams();
      fd.append("id", String(id));
      const res = await apiFetch("/api/MappingZeroOdol/Delete", {
        method: "POST",
        body: fd.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mapping-zeroodol-list"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-options"] });
      addToast({ title: "Berhasil", description: "Mapping dihapus", variant: "success" });
    },
    onError: (err: any) => addToast({ title: "Gagal", description: err.message, variant: "destructive" })
  });

  const fetchDetail = async (id: number) => {
    try {
      const res = await apiFetch("/api/MappingZeroOdol/DetailData", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setEditData(data);
      setEditFormData({
        id: data.id,
        startdatetime: data.startdatetimeString,
        enddatetime: data.enddatetimeString,
        tujuan: data.tujuan,
      });
      setIsEditModalOpen(true);
    } catch (err: any) {
      addToast({ title: "Error", description: "Gagal mengambil detail data", variant: "destructive" });
    }
  };

  const columns: DataTableColumn<MappingData>[] = [
    {
      header: "No.",
      key: "number",
    },
    {
      header: "Company",
      key: "companycode",
      render: (f) => <span className="font-bold">{f.companycode}</span>
    },
    {
      header: "Tujuan",
      key: "tujuanString",
      render: (f) => (
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium">{f.tujuanString}</span>
        </div>
      )
    },
    {
      header: "Awal Periode",
      key: "startdatetimeString",
      render: (f) => (
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{f.startdatetimeString}</span>
        </div>
      )
    },
    {
      header: "Akhir Periode",
      key: "enddatetimeString",
      render: (f) => (
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{f.enddatetimeString}</span>
        </div>
      )
    },
    {
      header: "Action",
      key: "id",
      className: "text-right",
      render: (f) => {
        // Legacy regex check
        const editMatch = f.action?.match(/editItemProcess\('([^']+)'\)/);
        const deleteMatch = f.action?.match(/deleteItemProcess\('([^']+)'\)/);
        
        const id = editMatch ? parseInt(editMatch[1]) : (deleteMatch ? parseInt(deleteMatch[1]) : f.id);

        return (
          <div className="flex items-center justify-end gap-2">
            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                  onClick={() => fetchDetail(id)}
                >
                  <FileEdit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                  onClick={() => setDeleteMappingTarget(id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        );
      }
    }
  ];

  const fetcher = async (params: DataTableParams) => {
    const payload = new URLSearchParams();
    payload.append("draw", String(params.draw));
    payload.append("start", String(params.start));
    payload.append("length", String(params.length));
    payload.append("search[value]", params.search || "");
    payload.append("order[0][column]", "0");
    payload.append("order[0][dir]", "asc");
    payload.append("columns[0][name]", "id");

    const res = await apiFetch("/api/MappingZeroOdol/Datatable", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
    });
    return res.json();
  };

  const isOdolActive = odolStatus?.value === "true";
  const isPercepatanActive = percepatanStatus?.value === "true";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-brand-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
              Mapping By Pass ODOL
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola pengecualian kebijakan ODOL per gudang tujuan dan periode tertentu.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["mapping-zeroodol-list"] })}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card */}
        <div className="lg:col-span-8">
          <Card className="shadow-theme-xs overflow-hidden">
            <CardHeader className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-brand-500" />
                <CardTitle className="text-base font-bold">Form Mapping</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Awal Periode</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      className="pl-10 h-11"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Akhir Periode</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      className="pl-10 h-11"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Gudang Tujuan</label>
                  <MultiSelect
                    options={warehouses}
                    selected={selectedTujuan}
                    onChange={setSelectedTujuan}
                    placeholder="Pilih Gudang Tujuan (Bisa pilih banyak)"
                  />
                </div>
              </div>
              <div className="mt-8">
                <Button
                  className={cn(
                    "w-full h-11 bg-brand-500 hover:bg-brand-600 text-white font-bold shadow-lg shadow-brand-500/20",
                    !canManage && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => addMappingMutation.mutate()}
                  disabled={addMappingMutation.isPending || !canManage}
                >
                  {addMappingMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  TAMBAH MAPPING
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-theme-xs">
            <CardHeader className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-base font-bold">Status Aktivasi</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Zero ODOL Switch */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">ZERO ODOL</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Global Policy</p>
                </div>
                <button
                  onClick={() => setShowOdolConfirm(true)}
                  disabled={toggleOdolMutation.isPending || !canManage}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isOdolActive ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700",
                    canManage ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isOdolActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Percepatan Switch */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tighter">Percepatan</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Priority Flow</p>
                </div>
                <button
                  onClick={() => setShowPercepatanConfirm(true)}
                  disabled={togglePercepatanMutation.isPending || !canManage}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isPercepatanActive ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700",
                    canManage ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isPercepatanActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          <div className="p-5 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-2xl flex items-start gap-3 shadow-theme-xs">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <p className="font-bold mb-1 uppercase tracking-wider">Informasi Kebijakan:</p>
              Pengecualian ODOL hanya berlaku untuk gudang tujuan yang terdaftar dalam periode aktif yang telah ditentukan.
            </div>
          </div>
        </div>
      </div>

      {/* List Table */}
      <Card className="shadow-theme-xs overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-white/5">
          <CardTitle className="text-lg">List Data Mapping</CardTitle>
          <CardDescription>Daftar gudang yang memiliki pengecualian bypass kebijakan ODOL.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            queryKey={["mapping-zeroodol-list"]}
            columns={columns}
            fetcher={fetcher}
            rowKey={(f) => f.number || f.id}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-gray-50 dark:bg-white/[0.02] border-b dark:border-white/5">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-brand-500" />
              Edit Mapping Kuota
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-400">Awal Periode</label>
                <Input
                  type="date"
                  className="h-11"
                  value={editFormData.startdatetime ? editFormData.startdatetime.split('/').reverse().join('-') : ""}
                  onChange={(e) => setEditFormData({ ...editFormData, startdatetime: e.target.value.split('-').reverse().join('/') })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-400">Akhir Periode</label>
                <Input
                  type="date"
                  className="h-11"
                  value={editFormData.enddatetime ? editFormData.enddatetime.split('/').reverse().join('-') : ""}
                  onChange={(e) => setEditFormData({ ...editFormData, enddatetime: e.target.value.split('-').reverse().join('/') })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-400">Gudang Tujuan</label>
              <select
                className="w-full h-11 rounded-none border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.02] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                value={editFormData.tujuan}
                onChange={(e) => setEditFormData({ ...editFormData, tujuan: e.target.value })}
              >
                {warehouses.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="p-6 bg-gray-50 dark:bg-white/[0.02] border-t dark:border-white/5 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white px-8 font-bold"
              onClick={() => updateMappingMutation.mutate(editFormData)}
              disabled={updateMappingMutation.isPending}
            >
              {updateMappingMutation.isPending ? "Updating..." : "UPDATE DATA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteMappingTarget !== null}
        onOpenChange={(open) => !open && setDeleteMappingTarget(null)}
        title="Hapus Mapping"
        description="Apakah Anda yakin ingin menghapus mapping ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDeleteMappingConfirm}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />

      <ConfirmDialog
        open={showOdolConfirm}
        onOpenChange={setShowOdolConfirm}
        title="Ubah Status ZERO ODOL"
        description={`Apakah Anda yakin ingin ${isOdolActive ? 'menonaktifkan' : 'mengaktifkan'} ZERO ODOL?`}
        onConfirm={() => toggleOdolMutation.mutate(!isOdolActive)}
        confirmText="Ya, Ubah"
        cancelText="Batal"
        variant="warning"
      />

      <ConfirmDialog
        open={showPercepatanConfirm}
        onOpenChange={setShowPercepatanConfirm}
        title="Ubah Status PERCEPATAN"
        description={`Apakah Anda yakin ingin ${isPercepatanActive ? 'menonaktifkan' : 'mengaktifkan'} PERCEPATAN?`}
        onConfirm={() => togglePercepatanMutation.mutate(!isPercepatanActive)}
        confirmText="Ya, Ubah"
        cancelText="Batal"
        variant="warning"
      />
    </div>
  );
}
