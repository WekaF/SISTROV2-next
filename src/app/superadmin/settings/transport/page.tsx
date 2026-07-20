"use client";
import React, { useState } from "react";
import {
  Truck,
  Mail,
  UserCheck,
  Search,
  Plus,
  Pencil,
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building,
  Eye,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
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

interface TransportData {
  ID: number;
  number?: number;
  username?: string;
  kode: string;
  nama: string;
  singkatan?: string;
  email?: string;
  isCharter?: boolean;
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce<(number | "...")[]>((acc, p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800">
      <p className="text-xs text-gray-500">
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} dari {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`e-${idx}`} className="px-2 text-gray-400 text-xs">…</span>
          ) : (
            <Button
              key={p}
              variant="ghost"
              size="sm"
              className={`w-8 h-8 p-0 text-xs ${page === p ? "bg-brand-500 text-white hover:bg-brand-600 hover:text-white" : ""}`}
              onClick={() => onPage(p as number)}
            >
              {p}
            </Button>
          )
        )}
        <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function TransportMasterPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  React.useEffect(() => { setPage(1); }, [debouncedSearch]);

  const [selected, setSelected] = useState<TransportData | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<Partial<TransportData>>({});

  const { data: transportsResult, isLoading, isFetching } = useQuery({
    queryKey: ["transports", debouncedSearch, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/transport?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${limit}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed");
      return data;
    },
  });

  const { data: usersResult } = useQuery({
    queryKey: ["transport-users-count"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/transport/users?page=1&limit=1`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<TransportData>) => {
      const res = await fetch("/api/admin/transport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      addToast({ title: "Transportir ditambahkan", variant: "success" });
      setIsFormOpen(false);
      setFormData({});
      queryClient.invalidateQueries({ queryKey: ["transports"] });
    },
    onError: (e: any) => addToast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TransportData>) => {
      const res = await fetch("/api/admin/transport", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      addToast({ title: "Transportir diperbarui", variant: "success" });
      setIsFormOpen(false);
      setFormData({});
      queryClient.invalidateQueries({ queryKey: ["transports"] });
    },
    onError: (e: any) => addToast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const transports = transportsResult?.data || [];
  const pagination = transportsResult?.pagination || { total: 0, totalPages: 0 };
  const userTotal = usersResult?.pagination?.total ?? 0;
  const charterCount = transports.filter((t: TransportData) => t.isCharter).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            Master Data Transport
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manajemen vendor transportir dan akun pengguna di ekosistem SISTRO.
          </p>
        </div>
        <Button
          className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          onClick={() => { setFormMode("add"); setFormData({}); setIsFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Vendor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-brand-500 text-white border-none shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold opacity-80 uppercase">Total Vendor</p>
              <h3 className="text-2xl font-black">{isLoading ? "—" : pagination.total}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-theme-xs bg-white dark:bg-white/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Regular</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {isLoading ? "—" : pagination.total - charterCount}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-theme-xs bg-white dark:bg-white/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl dark:bg-amber-500/10">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Charter</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {isLoading ? "—" : charterCount}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-theme-xs bg-white dark:bg-white/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl dark:bg-indigo-500/10">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">User Akun</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{userTotal}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Table */}
      <Card className="shadow-theme-xs border-none bg-white dark:bg-white/[0.02] overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Cari kode atau nama transportir..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">No.</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Transportir</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Kode SAP</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Username</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Tipe</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                        <span className="text-gray-400 text-sm italic">Memuat data transportir...</span>
                      </div>
                    </td>
                  </tr>
                ) : transports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                      Tidak ada vendor ditemukan.
                    </td>
                  </tr>
                ) : (
                  transports.map((t: TransportData, i: number) => (
                    <tr
                      key={t.ID ?? i}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group"
                    >
                      <td className="px-6 py-4 text-gray-400 text-sm">{(page - 1) * limit + i + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110">
                            <Building className="h-4 w-4 text-gray-400" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-sm">{t.nama}</div>
                            {t.singkatan && (
                              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.singkatan}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-brand-500 tracking-widest bg-brand-50 dark:bg-brand-500/10 px-2 py-1 rounded-lg">
                          {t.kode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {t.username ? (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                            <UserCheck className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                            {t.username}
                          </div>
                        ) : (
                          <span className="text-xs italic text-gray-400">Tidak ada akun</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {t.isCharter ? (
                          <Badge color="warning" variant="light" size="sm">Charter</Badge>
                        ) : (
                          <span className="text-xs text-gray-400 font-semibold">Regular</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                            onClick={() => { setSelected(t); setIsViewOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            onClick={() => { setFormMode("edit"); setFormData({ ...t }); setIsFormOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={limit}
            onPage={setPage}
          />
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{formMode === "add" ? "Tambah Transportir" : "Edit Transportir"}</DialogTitle>
            <DialogDescription>
              {formMode === "add" ? "Masukkan data vendor transportir baru." : "Perbarui data vendor transportir."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Transportir</label>
              <Input className="mt-1" placeholder="Nama lengkap transportir" value={formData.nama || ""} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode SAP</label>
                <Input className="mt-1" placeholder="Kode SAP" value={formData.kode || ""} onChange={(e) => setFormData({ ...formData, kode: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Singkatan</label>
                <Input className="mt-1" placeholder="Singkatan" value={formData.singkatan || ""} onChange={(e) => setFormData({ ...formData, singkatan: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Username (Login)</label>
                <Input
                  className="mt-1 disabled:opacity-60"
                  placeholder="Username"
                  value={formData.username || ""}
                  disabled={formMode === "edit"}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                <Input className="mt-1" type="email" placeholder="Email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isCharter || false}
                onChange={(e) => setFormData({ ...formData, isCharter: e.target.checked })}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Transportir Charter</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600"
              disabled={(formMode === "add" ? createMutation.isPending : updateMutation.isPending) || !formData.nama || !formData.kode}
              onClick={() => formMode === "add" ? createMutation.mutate(formData) : updateMutation.mutate(formData)}
            >
              {(formMode === "add" ? createMutation.isPending : updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-50 dark:bg-brand-500/10 text-brand-500 rounded-2xl">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="uppercase tracking-tight">{selected?.nama}</DialogTitle>
                <DialogDescription className="font-mono tracking-widest text-[11px]">
                  {selected?.kode}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">ID</p>
                <p className="text-xs font-bold">{selected?.ID ?? "—"}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Singkatan</p>
                <p className="text-xs font-bold text-brand-500">{selected?.singkatan || "—"}</p>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Username</p>
              {selected?.username ? (
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-brand-500" />
                  <span className="text-xs font-bold">{selected.username}</span>
                </div>
              ) : (
                <span className="text-xs italic text-gray-400">Tidak ada akun</span>
              )}
            </div>
            {selected?.email && (
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Email</p>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-semibold">{selected.email}</span>
                </div>
              </div>
            )}
            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Tipe</p>
              {selected?.isCharter ? (
                <Badge color="warning" variant="light" size="sm">Charter</Badge>
              ) : (
                <span className="text-xs text-gray-500 font-semibold">Regular</span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
