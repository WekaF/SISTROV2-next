"use client";
import React, { useState } from "react";
import {
  Users, Search, UserPlus, ShieldCheck, Mail, UserCheck,
  Key, Edit, Trash2, X, Loader2, Check, Eye, EyeOff,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { useSession } from "next-auth/react";
import { normalizeRole } from "@/lib/role-utils";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";

export default function UserConfigPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyCode } = useCompany();

  const userRole = session?.user ? normalizeRole((session.user as any).role) : null;
  const isSuperAdmin = userRole === "superadmin";

  if (session && !isSuperAdmin) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-black uppercase tracking-tight text-red-500">Akses Ditolak</h2>
          <p className="text-sm font-medium text-gray-500">Halaman ini hanya dapat diakses oleh SuperAdmin atau TI.</p>
        </div>
      </div>
    );
  }

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const emptyForm = {
    id: "", username: "", password: "", fullName: "", email: "",
    isActive: true, roles: [] as string[], sapVendorCode: ""
  };
  const [formData, setFormData] = useState(emptyForm);

  const resetForm = () => { setFormData(emptyForm); setIsEditing(false); setSelectedUser(null); setShowPassword(false); };

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", activeCompanyCode],
    queryFn: async () => {
      const url = activeCompanyCode
        ? `/api/admin/users?companyCode=${encodeURIComponent(activeCompanyCode)}`
        : "/api/admin/users";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch users");
      return (data || []) as any[];
    }
  });

  const { data: rolesData } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      return res.json() as Promise<any[]>;
    }
  });

  const users = usersData || [];
  const availableRoles = rolesData || [];

  const stats = {
    superadmins: users.filter((u: any) => (u.roles || []).some((r: string) => r.toLowerCase() === 'superadmin')).length,
    total: users.length,
    active: users.filter((u: any) => u.isactive).length,
    rolesCount: new Set(users.flatMap((u: any) => u.roles || [])).size
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "User Dibuat", description: "Akun pengguna baru berhasil dibuat.", variant: "success" });
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => addToast({ title: "Gagal Buat User", description: err.message, variant: "destructive" })
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success && !res.ok) throw new Error(data.error || "Update failed");
      return data;
    },
    onSuccess: () => {
      addToast({ title: "User Diperbarui", description: "Konfigurasi pengguna dan role berhasil disimpan.", variant: "success" });
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => addToast({ title: "Gagal Update", description: err.message, variant: "destructive" })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success && !res.ok) throw new Error(data.error || "Delete failed");
      return data;
    },
    onSuccess: () => {
      addToast({ title: "User Dihapus", description: "Pengguna telah dihapus dari sistem.", variant: "success" });
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => addToast({ title: "Gagal Hapus", description: err.message, variant: "destructive" })
  });

  const columns: DataTableColumn<any>[] = [
    {
      key: "fullname",
      header: "Full Name",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold dark:bg-gray-800 uppercase text-xs ring-2 ring-white dark:ring-gray-900 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
            {(u.fullname || u.username || '?').split(' ').map((n: any) => n[0]).join('').slice(0, 2)}
          </div>
          <span className="font-bold text-sm text-gray-900 dark:text-white">{u.fullname || u.username}</span>
        </div>
      ),
    },
    {
      key: "username",
      header: "Username",
      render: (u) => <span className="text-xs font-medium text-gray-900 dark:text-white">@{u.username}</span>,
    },
    {
      key: "companies",
      header: "Plant",
      render: (u) => <span className="text-sm text-muted-foreground">{(u.companies || []).join(", ") || "-"}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (u) => (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Mail className="h-3 w-3" />
          {u.email || '-'}
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {(u.roles || []).map((role: string, idx: number) => (
            <Badge key={`${role}-${idx}`} variant="light" color={role.toLowerCase() === 'superadmin' ? 'warning' : 'info'} className="uppercase font-black text-[10px]">{role}</Badge>
          ))}
          {(u.roles || []).length === 0 && <span className="text-xs text-gray-400">-</span>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${u.isactive ? 'bg-emerald-500' : 'bg-orange-500'}`} />
          <span className="text-xs font-medium">{u.isactive ? 'Active' : 'Inactive'}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="hover:text-brand-500 hover:bg-brand-50" onClick={() => handleEditClick(u)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-rose-500 hover:bg-rose-50" onClick={() => { setSelectedUser(u); setShowDeleteConfirm(true); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const fetcher = React.useCallback(async (params: DataTableParams) => {
    // Attempt to fetch from query client cache first to avoid duplicate network requests
    // if it's already fetching or cached, otherwise this performs the fetch.
    const allUsers = await queryClient.fetchQuery({
      queryKey: ["admin-users", activeCompanyCode],
      queryFn: async () => {
        const url = activeCompanyCode
          ? `/api/admin/users?companyCode=${encodeURIComponent(activeCompanyCode)}`
          : "/api/admin/users";
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch users");
        return (data || []) as any[];
      }
    });

    const searchStr = (params.search || "").toLowerCase();
    const filtered = allUsers.filter((u: any) => 
      (u.fullname || "").toLowerCase().includes(searchStr) ||
      (u.username || "").toLowerCase().includes(searchStr) ||
      (u.email || "").toLowerCase().includes(searchStr)
    );

    const start = params.start;
    const length = params.length;
    return {
      data: filtered.slice(start, start + length),
      recordsTotal: allUsers.length,
      recordsFiltered: filtered.length
    };
  }, [activeCompanyCode, queryClient]);

  const handleEditClick = (user: any) => {
    setSelectedUser(user);
    setFormData({
      id: user.id,
      username: user.username || "",
      password: "",
      fullName: user.fullname || "",
      email: user.email || "",
      isActive: user.isactive ?? true,
      roles: [...(user.roles || [])],
      sapVendorCode: user.sapvendorcode || ""
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!isEditing) {
      if (!formData.username.trim()) return addToast({ title: "Validasi Gagal", description: "Username diperlukan.", variant: "destructive" });
      if (!formData.password || formData.password.length < 8) return addToast({ title: "Validasi Gagal", description: "Password minimal 8 karakter.", variant: "destructive" });
      if (!formData.fullName.trim()) return addToast({ title: "Validasi Gagal", description: "Nama lengkap diperlukan.", variant: "destructive" });
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate({
        id: formData.id,
        fullName: formData.fullName,
        email: formData.email,
        isActive: formData.isActive,
        newRoles: formData.roles
      });
    }
  };

  const toggleRole = (code: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(code) ? prev.roles.filter(r => r !== code) : [...prev.roles, code]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-gray-500 font-medium">Memuat data pengguna...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Konfigurasi Pengguna</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola akses dan role pengguna.</p>
        </div>
        <Button
          className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          onClick={() => { resetForm(); setShowModal(true); }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Tambah User Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
          <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-2 dark:bg-brand-500/10"><ShieldCheck className="h-5 w-5" /></div>
          <div className="text-xl font-black">{stats.superadmins}</div>
          <div className="text-[10px] text-gray-400 uppercase font-black">Superadmins</div>
        </Card>
        <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
          <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-2 dark:bg-orange-500/10"><Users className="h-5 w-5" /></div>
          <div className="text-xl font-black">{stats.total}</div>
          <div className="text-[10px] text-gray-400 uppercase font-black">Total Users</div>
        </Card>
        <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2 dark:bg-emerald-500/10"><UserCheck className="h-5 w-5" /></div>
          <div className="text-xl font-black">{stats.active}</div>
          <div className="text-[10px] text-gray-400 uppercase font-black">Active Now</div>
        </Card>
        <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
          <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2 dark:bg-rose-500/10"><Key className="h-5 w-5" /></div>
          <div className="text-xl font-black">{stats.rolesCount}</div>
          <div className="text-[10px] text-gray-400 uppercase font-black">Role Types</div>
        </Card>
      </div>

      <Card className="shadow-theme-xs">
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["admin-users-table", activeCompanyCode]}
            fetcher={fetcher}
            rowKey={(u: any) => String(u.id)}
            searchPlaceholder="Cari nama, username, atau email..."
          />
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl shadow-2xl border-none bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>{isEditing ? "Edit Pengguna" : "Tambah User Baru"}</CardTitle>
                <CardDescription>{isEditing ? "Update profil dan role pengguna." : "Buat akun pengguna baru dengan role."}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setShowModal(false); resetForm(); }}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {!isEditing && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400">Username <span className="text-rose-500">*</span></label>
                      <Input
                        placeholder="john.doe"
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value.trim() })}
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400">Password <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Min. 8 karakter"
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(s => !s)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Nama Lengkap <span className="text-rose-500">*</span></label>
                    <Input value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Email Address</label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                </div>



                <div className="flex items-center gap-2">
                  <input type="checkbox" id="user-active" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  <label htmlFor="user-active" className="text-sm font-medium">Akun Aktif</label>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400">Role Selection</label>
                  <div className="flex flex-wrap gap-2">
                    {availableRoles.map((role: any, idx: number) => {
                      const code = role.Code || role.code || role.Name || role.name;
                      if (!code) return null;
                      const isSelected = formData.roles.includes(code);
                      return (
                        <button key={`role-${code}-${idx}`} type="button" onClick={() => toggleRole(code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${isSelected ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-200'}`}>
                          {isSelected && <Check className="h-3 w-3" />}
                          {role.Name || role.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-gray-50/50 p-4 flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => { setShowModal(false); resetForm(); }}>Batal</Button>
                <Button
                  type="submit"
                  className="bg-brand-500 hover:bg-brand-600 min-w-[130px]"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {isEditing ? "Simpan Perubahan" : "Buat Akun"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Hapus Pengguna"
        description={`Apakah Anda yakin ingin menghapus pengguna ${selectedUser?.fullname || selectedUser?.username}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={() => selectedUser && deleteMutation.mutate(selectedUser.id)}
        confirmText="Hapus Pengguna"
        cancelText="Batal"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
