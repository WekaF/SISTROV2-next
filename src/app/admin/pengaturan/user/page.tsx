"use client";
import React, { useState } from "react";
import {
  Users, Search, ShieldCheck, UserCheck, Edit, X, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

const RESTRICTED_ROLES = ["ti", "superadmin"];

export default function AdminUserPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);

  const companyCode = (session?.user as any)?.companyCode || "";

  const emptyForm = {
    id: "", username: "", fullName: "", email: "",
    isActive: true, roles: [] as string[],
  };
  const [formData, setFormData] = useState(emptyForm);

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedUser(null);
    setCurrentRoles([]);
  };

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["plant-users", companyCode],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/plant");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch users");
      return (data || []) as any[];
    },
    enabled: !!companyCode,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["admin-roles-plant"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      const data = await res.json() as any[];
      return data.filter((r: any) =>
        !RESTRICTED_ROLES.includes((r.code || r.name || "").toLowerCase())
      );
    },
  });

  const users = usersData || [];
  const availableRoles = rolesData || [];

  const filteredUsers = users.filter((u: any) =>
    (u.fullname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter((u: any) => u.isactive).length,
    rolesCount: new Set(users.flatMap((u: any) => u.roles || [])).size,
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users/plant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success && !res.ok) throw new Error(data.error || "Update failed");
      return data;
    },
    onSuccess: (data: any) => {
      const desc = data.roleErrors?.length
        ? `Profil disimpan. Peringatan: ${data.roleErrors.join("; ")}`
        : "Data pengguna berhasil diperbarui.";
      addToast({
        title: "User Diperbarui",
        description: desc,
        variant: data.roleErrors?.length ? "warning" : "success",
      });
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["plant-users"] });
    },
    onError: (err: any) =>
      addToast({ title: "Gagal Update", description: err.message, variant: "destructive" }),
  });

  const openEdit = (user: any) => {
    const roles = user.roles || [];
    setFormData({
      id: user.id,
      username: user.username || "",
      fullName: user.fullname || "",
      email: user.email || "",
      isActive: user.isactive ?? true,
      roles,
    });
    setCurrentRoles(roles);
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.fullName.trim()) {
      addToast({ title: "Validasi", description: "Nama lengkap wajib diisi.", variant: "warning" });
      return;
    }
    updateMutation.mutate({
      id: formData.id,
      fullName: formData.fullName,
      email: formData.email,
      isActive: formData.isActive,
      roles: formData.roles,
      currentRoles,
    });
  };

  const toggleRole = (roleName: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleName)
        ? prev.roles.filter((r) => r !== roleName)
        : [...prev.roles, roleName],
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Management User</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plant: <span className="font-semibold">{companyCode || "—"}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total User</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">User Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.rolesCount}</p>
                <p className="text-xs text-muted-foreground">Jenis Role</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Cari user"
          placeholder="Cari nama, username, atau email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Nama Lengkap</th>
                    <th className="px-4 py-3 text-left font-medium">Username</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada user ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{u.fullname || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.username}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(u.roles || []).slice(0, 3).map((r: string) => (
                              <Badge key={r} variant="light" color="info" className="text-xs">
                                {r}
                              </Badge>
                            ))}
                            {(u.roles || []).length > 3 && (
                              <Badge variant="light" color="light" className="text-xs">
                                +{u.roles.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="light" color={u.isactive ? "success" : "light"}>
                            {u.isactive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Edit User</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowModal(false); resetForm(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Username</label>
                <Input value={formData.username} disabled className="mt-1 bg-muted" />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="fullName">Nama Lengkap *</label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                  className="mt-1"
                  placeholder="Nama lengkap"
                />
              </div>

              <div>
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1"
                  placeholder="email@example.com"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium" htmlFor="isActive">Status Aktif</label>
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {availableRoles.map((role: any) => {
                    const roleName = role.code || role.name || role;
                    const isChecked = formData.roles.includes(roleName);
                    return (
                      <label key={roleName} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRole(roleName)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{roleName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
