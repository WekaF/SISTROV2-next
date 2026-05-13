"use client";
import React, { useState, useMemo } from "react";
import {
  Users, Search, Edit, Trash2, X, Loader2, Shield, Eye, EyeOff,
  Building2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const PAGE_SIZE = 15;

export default function AllUsersPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Table state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "", username: "", email: "",
    companyCode: "", companyDesc: "",
    isIdentik: false, mfaRemember: false, password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  // Confirm password modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Fetch all users
  const { data: usersPayload, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/all");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal fetch users");
      return data as { data: any[]; total: number };
    },
  });

  const allUsers: any[] = usersPayload?.data || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.company_code || "").toLowerCase().includes(q) ||
        (u.deskripsi || "").toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openEdit = async (username: string) => {
    setEditLoading(true);
    setShowEdit(true);
    setEditForm({ id: "", username, email: "", companyCode: "", companyDesc: "", isIdentik: false, mfaRemember: false, password: "" });
    setShowPassword(false);

    try {
      const res = await fetch(`/api/admin/users/detail?username=${encodeURIComponent(username)}`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.message || "Gagal load detail");
      const d = payload.data;
      setEditForm({
        id:          d.Id || "",
        username:    d.username || "",
        email:       d.email || "",
        companyCode: d.company_code || "",
        companyDesc: d.deskripsi || "",
        isIdentik:   d.IsIdentik ?? false,
        mfaRemember: d.MfaRemember ?? false,
        password:    "",
      });
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
      setShowEdit(false);
    } finally {
      setEditLoading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (currentPassword: string) => {
      const res = await fetch("/api/admin/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:              editForm.id,
          username:        editForm.username,
          email:           editForm.email,
          password:        editForm.password,
          isIdentik:       editForm.isIdentik,
          mfaRemember:     editForm.mfaRemember,
          currentPassword,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Gagal menyimpan");
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Data pengguna berhasil diperbarui.", variant: "success" });
      setShowConfirm(false);
      setShowEdit(false);
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
    },
    onError: (err: any) => {
      addToast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveClick = () => {
    if (!editForm.email.trim()) {
      addToast({ title: "Validasi", description: "Email wajib diisi.", variant: "warning" });
      return;
    }
    setConfirmPassword("");
    setShowConfirmPw(false);
    setShowConfirm(true);
  };

  const handleConfirmSave = () => {
    if (!confirmPassword.trim()) {
      addToast({ title: "Validasi", description: "Password konfirmasi kosong.", variant: "warning" });
      return;
    }
    saveMutation.mutate(confirmPassword);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Semua Pengguna</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola akses dan informasi semua pengguna sistem</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-400 text-white border-0">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-3">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Total Pengguna</p>
                <p className="text-3xl font-bold">{isLoading ? "—" : allUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-400 text-white border-0">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-3">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Jumlah Plant</p>
                <p className="text-3xl font-bold">
                  {isLoading ? "—" : new Set(allUsers.map((u) => u.company_code).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-600 to-violet-400 text-white border-0">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-3">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Hasil Filter</p>
                <p className="text-3xl font-bold">{isLoading ? "—" : filtered.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Cari pengguna"
          placeholder="Cari username, email, company..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Sinkronisasi data...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide w-12">No.</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Username</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Kode Unit</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Perusahaan</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                          Tidak ada pengguna ditemukan
                        </td>
                      </tr>
                    ) : (
                      paginated.map((u, idx) => (
                        <tr key={u.username} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground text-center">
                            <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium">
                              {(page - 1) * PAGE_SIZE + idx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold">{u.username}</td>
                          <td className="px-4 py-3 text-muted-foreground">{u.email || "-"}</td>
                          <td className="px-4 py-3">
                            <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 rounded px-2 py-0.5 text-xs font-mono font-semibold">
                              {u.company_code || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{u.deskripsi || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEdit(u.username)}
                                className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-colors flex items-center justify-center"
                                title="Edit"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => addToast({ title: "Info", description: "Fitur hapus dalam pengembangan.", variant: "warning" })}
                                className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                title="Hapus"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                  <span>
                    {filtered.length} pengguna · halaman {page} dari {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 p-6 border-b">
              <div className="bg-indigo-600 text-white rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
                <Edit className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold">Edit Pengguna</h2>
                <p className="text-sm text-muted-foreground truncate">{editForm.username}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowEdit(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {editLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Mengambil data...</span>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Username</label>
                    <Input value={editForm.username} disabled className="mt-1 bg-muted" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Email *</label>
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                      className="mt-1"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kode Unit</label>
                    <Input value={editForm.companyCode} disabled className="mt-1 bg-muted" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deskripsi Perusahaan</label>
                    <Input value={editForm.companyDesc} disabled className="mt-1 bg-muted" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground block mb-2">Otorisasi Identik</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isIdentik"
                          checked={editForm.isIdentik === true}
                          onChange={() => setEditForm((p) => ({ ...p, isIdentik: true }))}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <span className="text-sm">Aktif</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isIdentik"
                          checked={editForm.isIdentik === false}
                          onChange={() => setEditForm((p) => ({ ...p, isIdentik: false }))}
                          className="h-4 w-4 accent-indigo-600"
                        />
                        <span className="text-sm">Non-Aktif</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <input
                      id="mfaRemember"
                      type="checkbox"
                      checked={editForm.mfaRemember}
                      onChange={(e) => setEditForm((p) => ({ ...p, mfaRemember: e.target.checked }))}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <label htmlFor="mfaRemember" className="text-sm font-medium cursor-pointer">Ingat Sesi Login</label>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-4">
                  <label className="text-xs font-semibold text-red-600 uppercase tracking-wide block mb-1">
                    Ganti Password (Opsional)
                  </label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={editForm.password}
                      onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Kosongkan jika tidak ingin mengubah"
                      className="pr-10 bg-white dark:bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!editLoading && (
              <div className="flex justify-end gap-3 p-6 border-t">
                <Button variant="outline" onClick={() => setShowEdit(false)}>Batalkan</Button>
                <Button onClick={handleSaveClick} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Simpan Perubahan
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Password Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="text-amber-500 mb-4">
              <Shield className="h-14 w-14 mx-auto" />
            </div>
            <h3 className="text-lg font-bold mb-1">Konfirmasi Admin</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Masukkan password Anda untuk memvalidasi perubahan data pengguna.
            </p>
            <div className="relative mb-6">
              <Input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="text-center pr-10"
                onKeyDown={(e) => e.key === "Enter" && handleConfirmSave()}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleConfirmSave}
                disabled={saveMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Konfirmasi
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground text-sm"
                onClick={() => { setShowConfirm(false); setConfirmPassword(""); }}
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
