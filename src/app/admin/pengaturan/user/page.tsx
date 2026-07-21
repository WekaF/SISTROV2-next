"use client";
import React, { useState } from "react";
import {
  Users, Edit, X, Loader2, Mail, Check, Lock, Building,
  ShieldCheck, Fingerprint, Activity, Plus, UserCheck, Eye, EyeOff,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";

export default function AdminUserPage() {
  const { activeCompanyCode } = useCompany();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const emptyCreateForm = {
    username: "", password: "", fullName: "", email: "",
    companyCode: "", roles: [] as string[],
  };
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const resetCreateForm = () => { setCreateForm(emptyCreateForm); setShowCreatePassword(false); };

  const { data: rolesData } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      return res.json() as Promise<any[]>;
    },
  });
  const availableRoles = rolesData || [];

  const { data: companiesData } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const res = await fetch("/api/admin/companies");
      const json = await res.json();
      return (json.data || []) as { code: string; name: string }[];
    },
  });
  const availableCompanies = companiesData || [];

  const toggleCreateRole = (code: string) => {
    setCreateForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(code) ? prev.roles.filter((r) => r !== code) : [...prev.roles, code],
    }));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      const res = await fetch("/api/admin/users/plant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Gagal membuat user");
      return data;
    },
    onSuccess: () => {
      addToast({ title: "User Dibuat", description: "Akun pengguna baru berhasil dibuat.", variant: "success" });
      setShowCreateModal(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["plant-users"] });
    },
    onError: (err: any) => addToast({ title: "Gagal Buat User", description: err.message, variant: "destructive" }),
  });

  const handleCreateSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!createForm.username.trim()) return addToast({ title: "Validasi Gagal", description: "Username diperlukan.", variant: "destructive" });
    if (!createForm.password || createForm.password.length < 8) return addToast({ title: "Validasi Gagal", description: "Password minimal 8 karakter.", variant: "destructive" });
    if (!createForm.fullName.trim()) return addToast({ title: "Validasi Gagal", description: "Nama lengkap diperlukan.", variant: "destructive" });
    // Plant/Unit is intentionally optional — leaving it blank creates a
    // user with no company_code (the backend and the listing endpoint
    // already handle that case correctly).
    createMutation.mutate(createForm);
  };

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  const companyCode = activeCompanyCode || "";

  const emptyForm = {
    id: "",
    username: "",
    fullName: "",
    email: "",
    companyCode: "",
    deskripsi: "",
    isIdentik: false,
    mfaRemember: false,
  };
  const [formData, setFormData] = useState(emptyForm);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<{ username: string; guid: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const resetForm = () => {
    setFormData(emptyForm);
    setAdminPassword("");
  };

  // Fetch users for stats
  const { data: allUsers } = useQuery({
    queryKey: ["plant-users-all", companyCode],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/plant");
      const data = await res.json();
      return (data || []) as any[];
    },
    enabled: !!companyCode,
  });

  const stats = {
    total: allUsers?.length || 0,
    active: allUsers?.length || 0, // In this context, all returned users are considered active for now
  };

  // DataTable Fetcher
  const fetcher = async (params: DataTableParams) => {
    const res = await fetch("/api/admin/users/plant");
    const allData = await res.json();
    if (!res.ok) throw new Error(allData.error || "Failed to fetch users");
    
    // Client-side filtering as the legacy API doesn't support server-side params
    const filtered = (allData || []).filter((u: any) => {
      const s = params.search.toLowerCase();
      return (
        (u.username || u.UserName || "").toLowerCase().includes(s) ||
        (u.email || u.Email || "").toLowerCase().includes(s) ||
        (u.company_code || "").toLowerCase().includes(s)
      );
    });

    const start = params.start || 0;
    const length = params.length || 25;
    const paginated = filtered.slice(start, start + length);

    return {
      data: paginated,
      recordsTotal: allData.length,
      recordsFiltered: filtered.length,
    };
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "no",
      header: "No.",
      headerClassName: "w-16 text-center",
      className: "text-center",
      render: (_, index) => (
        <span className="text-[10px] font-black text-gray-300">
          {(index + 1).toString().padStart(2, '0')}
        </span>
      ),
    },
    {
      key: "username",
      header: "Username",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-500 border border-gray-100 dark:border-white/5">
            {(u.username || u.UserName || "US").substring(0, 2).toUpperCase()}
          </div>
          <span className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {u.username || u.UserName}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email Address",
      render: (u) => (
        <div className="flex items-center gap-2 text-gray-500 font-bold">
          <Mail className="h-3 w-3 opacity-40" />
          {u.email || u.Email || "-"}
        </div>
      ),
    },
    {
      key: "company_code",
      header: "Unit",
      headerClassName: "text-center",
      className: "text-center",
      render: (u) => (
        <Badge variant="light" color="info" className="font-mono text-[10px] px-2 py-0.5 rounded-none border border-blue-100">
          {u.company_code}
        </Badge>
      ),
    },
    {
      key: "isIdentik",
      header: "Identik",
      render: (u) => {
        const isIdentik = u.IsIdentik === true || u.isidentik === true;
        return isIdentik ? (
          <div className="flex items-center gap-1.5 text-emerald-500 font-black uppercase text-[9px] tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 border border-emerald-100 dark:border-emerald-500/20 w-fit">
            <Fingerprint className="h-3 w-3" />
            Verified
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-gray-400 font-black uppercase text-[9px] tracking-widest bg-gray-50 dark:bg-white/5 px-2 py-1 border border-gray-100 dark:border-white/5 w-fit">
            Standard
          </div>
        );
      },
    },
    {
      key: "deskripsi",
      header: "Deskripsi",
      render: (u) => (
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight opacity-70">
          {u.deskripsi || "-"}
        </span>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right",
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(u)}
            className="text-gray-300 hover:text-brand-500 hover:bg-brand-500/5 rounded-none h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openPasswordModal(u)}
            className="text-gray-300 hover:text-amber-500 hover:bg-amber-500/5 rounded-none h-8 w-8 p-0"
          >
            <Lock className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users/plant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Update failed");
      return data;
    },
    onSuccess: () => {
      addToast({ title: "User Diperbarui", description: "Data pengguna berhasil diperbarui.", variant: "success" });
      setShowModal(false);
      setShowConfirmModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["plant-users"] });
    },
    onError: (err: any) =>
      addToast({ title: "Gagal Update", description: err.message, variant: "destructive" }),
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ guid, newpassword }: { guid: string; newpassword: string }) => {
      const res = await fetch("/api/admin/transport/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guid, newpassword }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Password Diperbarui", description: "Password pengguna berhasil diganti.", variant: "success" });
      setShowPasswordModal(false);
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmNewPassword("");
    },
    onError: (err: any) => addToast({ title: "Gagal Ganti Password", description: err.message, variant: "destructive" }),
  });

  const openPasswordModal = async (user: any) => {
    const username = user.username || user.UserName;
    try {
      const res = await fetch(`/api/admin/users/plant?username=${encodeURIComponent(username)}`, { method: 'PATCH' });
      const detail = await res.json();
      const guid = detail?.data?.Id || detail?.data?.id;
      if (!detail.success || !guid) throw new Error(detail.message || "Gagal mengambil data pengguna");
      setPasswordTarget({ username, guid });
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordModal(true);
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const openEdit = async (user: any) => {
    try {
      const res = await fetch(`/api/admin/users/plant?username=${user.username || user.UserName}`, { method: 'PATCH' });
      const detail = await res.json();
      
      if (!detail.success || !detail.data) {
        throw new Error(detail.message || "Gagal mengambil detail user");
      }
      
      const d = detail.data;
      setFormData({
        id: d.Id || d.id,
        username: d.username || d.UserName,
        fullName: d.fullname || d.FullName || "",
        email: d.email || d.Email || "",
        companyCode: d.company_code || "",
        deskripsi: d.deskripsi || "",
        isIdentik: d.IsIdentik === true,
        mfaRemember: d.MfaRemember === true,
      });
      setShowModal(true);
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveAttempt = () => {
    if (!formData.email.trim()) {
      addToast({ title: "Validasi", description: "Email wajib diisi.", variant: "warning" });
      return;
    }
    setShowConfirmModal(true);
  };

  const executeSave = () => {
    if (!adminPassword) {
      addToast({ title: "Validasi", description: "Password konfirmasi wajib diisi.", variant: "warning" });
      return;
    }
    updateMutation.mutate({
      ...formData,
      adminPassword
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            User Management
          </h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
            SISTRO NEXT &bull; ADMINISTRASI SISTEM
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            className="bg-brand-500 hover:bg-brand-600 rounded-none font-black uppercase tracking-widest text-[10px] h-10 px-6"
            onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah User Baru
          </Button>

        <div className="flex gap-4">
          <Card className="rounded-none border-gray-100 dark:border-white/5 shadow-none bg-white dark:bg-white/[0.02] py-3 px-6 flex items-center gap-4 min-w-[160px]">
             <div className="p-2 bg-brand-50 dark:bg-brand-500/10 text-brand-500">
                <Users className="h-5 w-5" />
             </div>
             <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Users</p>
                <p className="text-xl font-black tracking-tighter leading-none">{stats.total}</p>
             </div>
          </Card>

          <Card className="rounded-none border-gray-100 dark:border-white/5 shadow-none bg-white dark:bg-white/[0.02] py-3 px-6 flex items-center gap-4 min-w-[160px]">
             <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
                <Activity className="h-5 w-5" />
             </div>
             <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Active Now</p>
                <p className="text-xl font-black tracking-tighter leading-none">{stats.active}</p>
             </div>
          </Card>
        </div>
        </div>
      </div>

      {/* DataTable Integration */}
      <div className="bg-white dark:bg-white/[0.02] border-none">
        <DataTable
          columns={columns}
          queryKey={["plant-users", companyCode]}
          fetcher={fetcher}
          rowKey={(u) => u.id || u.username || Math.random()}
          searchPlaceholder="Cari username atau email..."
          emptyText="Belum ada data pengguna ditemukan."
          borderless={true}
          defaultPageSize={25}
        />
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl rounded-none border-none bg-white dark:bg-[#1a1c1e] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
            <CardHeader className="border-b dark:border-white/5 pb-6 bg-gray-50/50 dark:bg-white/[0.02] p-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Tambah User Baru</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-brand-500 mt-1">Buat akun pengguna baru untuk plant manapun</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="rounded-none hover:bg-gray-200 dark:hover:bg-white/10" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="overflow-y-auto flex-1 p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Username <span className="text-rose-500">*</span></label>
                    <Input
                      placeholder="john.doe"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.trim() })}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Password <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Input
                        type={showCreatePassword ? "text" : "password"}
                        placeholder="Min. 8 karakter"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowCreatePassword((s) => !s)}>
                        {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Nama Lengkap <span className="text-rose-500">*</span></label>
                    <Input value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Email Address</label>
                    <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400">Plant / Unit (Opsional)</label>
                  <select
                    value={createForm.companyCode}
                    onChange={(e) => setCreateForm({ ...createForm, companyCode: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent text-sm rounded-none"
                  >
                    <option value="">Tanpa Plant</option>
                    {availableCompanies.map((c) => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400">Role Selection</label>
                  <div className="flex flex-wrap gap-2">
                    {availableRoles.map((role: any, idx: number) => {
                      const code = role.code || role.Code || role.name || role.Name;
                      if (!code) return null;
                      const isSelected = createForm.roles.includes(code);
                      return (
                        <button key={`create-role-${code}-${idx}`} type="button" onClick={() => toggleCreateRole(code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${isSelected ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10'}`}>
                          {isSelected && <Check className="h-3 w-3" />}
                          {role.name || role.Name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <CardFooter className="border-t dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 flex justify-end gap-2">
                <Button variant="ghost" type="button" className="rounded-none font-black uppercase tracking-widest text-[10px] h-10 px-6" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>Batal</Button>
                <Button type="submit" className="bg-brand-500 hover:bg-brand-600 rounded-none font-black uppercase tracking-widest text-[10px] h-10 px-6 min-w-[130px]" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Buat Akun
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl rounded-none border-none bg-white dark:bg-[#1a1c1e] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
            <CardHeader className="border-b dark:border-white/5 pb-6 bg-gray-50/50 dark:bg-white/[0.02] p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-500 text-white shadow-xl shadow-brand-500/20">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Otorisasi Profil</CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest text-brand-500 mt-1">{formData.username}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-none hover:bg-gray-200 dark:hover:bg-white/10" onClick={() => { setShowModal(false); resetForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>

            <div className="overflow-y-auto flex-1 p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Username</label>
                  <Input value={formData.username} disabled className="bg-gray-100/50 dark:bg-white/5 border-gray-100 dark:border-white/5 font-mono text-xs h-10 rounded-none px-4" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-brand-500 tracking-widest">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="pl-10 h-10 border-gray-100 dark:border-white/5 focus:ring-brand-500/20 font-bold text-xs rounded-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Kode Unit</label>
                  <Input value={formData.companyCode} disabled className="bg-gray-100/50 dark:bg-white/5 border-gray-100 dark:border-white/5 font-mono text-xs h-10 rounded-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Deskripsi Perusahaan</label>
                  <Input value={formData.deskripsi} disabled className="bg-gray-100/50 dark:bg-white/5 border-gray-100 dark:border-white/5 text-xs font-bold h-10 rounded-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Otorisasi Identik</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="isIdentik" 
                        checked={formData.isIdentik} 
                        onChange={() => setFormData({...formData, isIdentik: true})}
                        className="w-4 h-4 text-brand-500" 
                      />
                      <span className={`text-[10px] font-black transition-all ${formData.isIdentik ? 'text-brand-500' : 'text-gray-400'}`}>AKTIF</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="isIdentik" 
                        checked={!formData.isIdentik} 
                        onChange={() => setFormData({...formData, isIdentik: false})}
                        className="w-4 h-4 text-brand-500" 
                      />
                      <span className={`text-[10px] font-black transition-all ${!formData.isIdentik ? 'text-rose-500' : 'text-gray-400'}`}>NON-AKTIF</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4 border-l dark:border-white/5 pl-6">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Session Persistence</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formData.mfaRemember}
                        onChange={(e) => setFormData((p) => ({ ...p, mfaRemember: e.target.checked }))}
                        className="sr-only"
                      />
                      <div className={`block w-10 h-6 transition-all duration-300 ${formData.mfaRemember ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 transition-transform duration-300 ${formData.mfaRemember ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase">Remember MFA</span>
                  </label>
                </div>
              </div>

            </div>

            <CardFooter className="flex justify-end gap-4 p-8 border-t dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
              <Button variant="ghost" className="font-black uppercase tracking-widest text-[10px] text-gray-500 h-10 px-6 rounded-none" onClick={() => { setShowModal(false); resetForm(); }}>
                DISCARD
              </Button>
              <Button 
                onClick={handleSaveAttempt} 
                className="bg-brand-500 hover:bg-brand-600 font-black uppercase tracking-widest text-[10px] px-10 h-10 shadow-xl shadow-brand-500/30 rounded-none transition-all active:scale-95"
              >
                COMMIT CHANGES
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm rounded-none border-none bg-white dark:bg-[#1a1c1e] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <CardHeader className="border-b dark:border-white/5 pb-6 bg-gray-50/50 dark:bg-white/[0.02] p-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Ganti Password</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-brand-500 mt-1">{passwordTarget?.username}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="rounded-none hover:bg-gray-200 dark:hover:bg-white/10" onClick={() => setShowPasswordModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Password Baru</label>
                <Input type="password" placeholder="Min. 8 karakter" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-10 rounded-none" autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ulangi Password</label>
                <Input type="password" placeholder="Ulangi password baru" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="h-10 rounded-none" autoComplete="new-password" />
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className="text-[11px] text-rose-500 font-semibold">Password tidak cocok.</p>
                )}
              </div>
            </div>
            <CardFooter className="flex justify-end gap-4 p-8 border-t dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
              <Button variant="ghost" className="font-black uppercase tracking-widest text-[10px] text-gray-500 h-10 px-6 rounded-none" onClick={() => setShowPasswordModal(false)}>
                BATAL
              </Button>
              <Button
                className="bg-brand-500 hover:bg-brand-600 font-black uppercase tracking-widest text-[10px] px-10 h-10 rounded-none"
                disabled={passwordMutation.isPending || !newPassword || newPassword.length < 8 || newPassword !== confirmNewPassword}
                onClick={() => passwordTarget && passwordMutation.mutate({ guid: passwordTarget.guid, newpassword: newPassword })}
              >
                {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "SIMPAN"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Admin Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-sm rounded-none border-none bg-white dark:bg-[#1a1c1e] text-center p-10 animate-in zoom-in duration-300">
            <div className="mx-auto w-16 h-16 bg-brand-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-brand-500/50">
              <Lock className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Security Check</h3>
            <p className="text-[10px] font-black text-gray-400 mb-8 uppercase tracking-widest">Enter administrator password to authorize changes.</p>
            
            <div className="space-y-4">
              <Input 
                type="password"
                placeholder="••••••••"
                className="text-center font-mono py-6 text-xl border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 focus:ring-brand-500/20 placeholder:tracking-[0.5em] rounded-none"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && executeSave()}
              />
              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  onClick={executeSave}
                  className="w-full bg-brand-500 hover:bg-brand-600 h-12 font-black uppercase tracking-widest text-xs rounded-none shadow-xl shadow-brand-500/40"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "AUTHORIZE"}
                </Button>
                <Button variant="ghost" onClick={() => setShowConfirmModal(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-500 transition-colors">
                  ABORT
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
