"use client";
import React, { useState } from "react";
import {
  Ticket,
  Search,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Filter,
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

interface TiketRow {
  id: number;
  bookingno: string;
  tiketno: string;
  nopol: string;
  tanggal: string;
  status: string;
  plantcode: string;
  driver: string;
}

export default function ForceDeleteTiketPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [plant, setPlant] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const [deleteTarget, setDeleteTarget] = useState<TiketRow | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const params = new URLSearchParams({
    page: String(page), limit: String(limit),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(plant && { plant }),
    ...(status && { status }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-tiket", debouncedSearch, plant, status, dateFrom, dateTo, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tiket?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to fetch");
      return json;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await fetch(`/api/admin/tiket?force=true`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: (_, vars) => {
      addToast({ title: "Tiket Dihapus Paksa", description: `ID ${vars.id} permanently deleted.`, variant: "success" });
      setDeleteTarget(null);
      setDeleteReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-tiket"] });
    },
    onError: (err: any) => addToast({ title: "Gagal Hapus", description: err.message, variant: "destructive" }),
  });

  const tikets: TiketRow[] = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 0 };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (!deleteReason.trim()) {
      addToast({ title: "Alasan diperlukan", description: "Masukkan alasan sebelum menghapus.", variant: "destructive" });
      return;
    }
    deleteMutation.mutate({ id: deleteTarget.id, reason: deleteReason });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-rose-500" />
          Force Delete Tiket
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hapus permanen tiket dari database. Tindakan ini tidak dapat dibatalkan.</p>
      </div>

      <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Peringatan: Operasi Destruktif</p>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">Force Delete akan menghapus tiket secara permanen dari database dan tidak dapat dibatalkan. Gunakan hanya jika benar-benar diperlukan.</p>
        </div>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10" placeholder="Cari bookingno atau nopol..." value={search} onChange={e => setSearch(e.target.value)} />
              {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <Input className="w-36" placeholder="Plant Code" value={plant} onChange={e => { setPlant(e.target.value); setPage(1); }} />
            <Input className="w-32" placeholder="Status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} />
            <Input type="date" className="w-36" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            <Input type="date" className="w-36" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-tiket"] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-xs font-black uppercase text-gray-500">Booking No</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-gray-500">Nopol</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-gray-500">Tanggal</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-gray-500">Plant</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-xs font-black uppercase text-gray-500 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                      <span className="text-sm text-gray-500">Memuat data tiket...</span>
                    </div>
                  </td></tr>
                ) : tikets.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic text-sm">
                    <Ticket className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    Tidak ada tiket ditemukan.
                  </td></tr>
                ) : tikets.map(t => (
                  <tr key={t.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-500/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-bold text-gray-900 dark:text-white">{t.bookingno}</div>
                      <div className="text-[10px] text-gray-400">{t.tiketno}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-sm">{t.nopol || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{t.tanggal ? new Date(t.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                    <td className="px-4 py-3">
                      <Badge color="info" variant="light" className="font-mono text-[10px]">{t.plantcode || '-'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={t.status ? 'success' : 'warning'} variant="light" size="sm">{t.status || 'N/A'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10 text-xs font-bold gap-1"
                        onClick={() => { setDeleteTarget(t); setDeleteReason(""); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Force Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50">
              <span className="text-xs text-gray-500">
                Total: <strong>{pagination.total}</strong> tiket
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)}>{"<"}</Button>
                <span className="text-xs px-2 font-bold">{page} / {pagination.totalPages}</span>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>{">"}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) { setDeleteTarget(null); setDeleteReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-500/10 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-rose-500" />
              </div>
              <div>
                <DialogTitle className="text-rose-600">Force Delete Tiket</DialogTitle>
                <DialogDescription>Tiket akan dihapus permanen — tidak dapat dibatalkan.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl space-y-1">
              <p className="text-[10px] font-black uppercase text-gray-400">Tiket yang akan dihapus</p>
              <p className="font-mono font-bold text-sm">{deleteTarget?.bookingno}</p>
              <p className="text-xs text-gray-500">{deleteTarget?.nopol} — {deleteTarget?.plantcode}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                Alasan Force Delete <span className="text-rose-500">*</span>
              </label>
              <textarea
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400"
                rows={3}
                placeholder="Masukkan alasan yang jelas mengapa tiket ini perlu dihapus paksa..."
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
              />
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Force Delete — Tidak Dapat Dibatalkan</p>
              <p className="text-xs text-rose-500 mt-1">Data tiket akan hilang selamanya dari database.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteReason(""); }}>Batal</Button>
            <Button
              className="bg-rose-500 hover:bg-rose-600 text-white"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending || !deleteReason.trim()}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ya, Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
