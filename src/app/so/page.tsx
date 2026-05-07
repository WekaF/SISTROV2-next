"use client";
import React, { useState } from "react";
import { Eye, FileEdit, Trash2, Package, Ticket, History } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable, type DataTableColumn, type DataTableParams, type DataTableResult } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─────────────── Types ────────────────────────────────────────────────────────

interface SOItem {
  id: number;
  guid: string;
  noposto: string;
  tglposto: string;
  tanggalString: string;
  tgljatuhtempo: string;
  tanggaljatuhtempoString: string;
  asalString: string;
  tujuanString: string;
  transportString: string;
  distributorString: string;
  produkString: string;
  qty: number;
  qtyrencana: number;
  qtyrealisasi: number;
  qtysisaBooking: number;
  qtysisaRealisasi: number;
  wilayah: string;
  bagian: string;
  updatedby: string;
  numberString: string;
}

// ─────────────── Page Component ──────────────────────────────────────────────

export default function SOPage() {
  const { data: session } = useSession();
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const role = (session?.user as any)?.role?.toLowerCase();
  const isRekanan = role === "rekanan" || role === "transport";

  // ── Modal States ──
  const [selectedSO, setSelectedSO] = useState<SOItem | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("34");
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ qty: "", tglakhir: "", tgljatuhtempo: "" });

  // ── Fetcher — bypass apiTable to avoid double-flattening ──
  const fetcher = async (params: DataTableParams): Promise<DataTableResult<SOItem>> => {
    const form = new URLSearchParams();
    form.set("draw", String(params.draw));
    form.set("start", String(params.start));
    form.set("length", String(params.length));
    form.set("search[value]", params.search || "");
    form.set("search[regex]", "false");
    form.set("tipe", "SO");
    form.set("order[0][column]", "3");
    form.set("order[0][dir]", "desc");

    const colNames = [
      "charter","action","wilayah","tanggalString","noposto","tglakhirString",
      "asalString","tujuanString","bagian","transportString","produkString",
      "qty","qtyrencana","qtysisaBooking","qtyrealisasi","qtysisaRealisasi",
      "cutoff","kapal","kotatujuan","updatedby","tanggaljatuhtempoString"
    ];
    colNames.forEach((name, i) => {
      form.set(`columns[${i}][name]`, name);
      form.set(`columns[${i}][searchable]`, "true");
      form.set(`columns[${i}][orderable]`, "true");
      form.set(`columns[${i}][search][value]`, "");
      form.set(`columns[${i}][search][regex]`, "false");
    });

    const colIndices: Record<string, number> = {
      wilayah: 2, tanggalString: 3, noposto: 4, asalString: 6,
      tujuanString: 7, bagian: 8, transportString: 9, produkString: 10,
    };
    if (params.columnFilters) {
      Object.entries(params.columnFilters).forEach(([key, val]) => {
        const idx = colIndices[key];
        if (idx !== undefined && val) form.set(`columns[${idx}][search][value]`, val);
      });
    }

    const res = await apiFetch("/api/SO/DataTableFilter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) throw new Error(`[${res.status}]`);
    return res.json() as Promise<DataTableResult<SOItem>>;
  };

  // ── View ──
  const handleView = async (noposto: string) => {
    try {
      const res = await apiFetch("/api/POSTO/DetailData", {
        method: "POST",
        body: JSON.stringify({ noposto }),
      });
      const data = await res.json();
      setSelectedSO(data?.noposto ? data : data?.data ?? null);
      setIsViewOpen(true);
    } catch {
      addToast({ title: "Error", description: "Gagal memuat detail SO", variant: "destructive" });
    }
  };

  // ── Edit ──
  const handleEditInit = async (noposto: string) => {
    try {
      const res = await apiFetch("/api/POSTO/DetailData", {
        method: "POST",
        body: JSON.stringify({ noposto }),
      });
      const item = await res.json();
      const data = item?.noposto ? item : item?.data ?? item;
      setSelectedSO(data);
      setEditForm({
        qty: String(data.qty ?? ""),
        tglakhir: data.tglakhir2 ? data.tglakhir2.replace(/\//g, "-") : "",
        tgljatuhtempo: data.tgljatuhtempo ? data.tgljatuhtempo.split("T")[0] : "",
      });
      setIsEditOpen(true);
    } catch {
      addToast({ title: "Error", description: "Gagal memuat data SO", variant: "destructive" });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSO) return;
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/POSTO/UpdateData", {
        method: "POST",
        body: JSON.stringify({
          noposto: selectedSO.noposto,
          qty: parseFloat(editForm.qty),
          tglakhir: editForm.tglakhir,
          tgljatuhtempo: editForm.tgljatuhtempo || null,
        }),
      });
      if (res.ok) {
        addToast({ title: "Sukses", description: "Data SO berhasil diperbarui" });
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: ["so-list"] });
      } else {
        const msg = await res.text();
        addToast({ title: "Gagal", description: msg || "Terjadi kesalahan", variant: "destructive" });
      }
    } catch {
      addToast({ title: "Error", description: "Gagal memperbarui data", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/POSTO/DeleteData", {
        method: "POST",
        body: JSON.stringify({ noposto: deleteTarget, uploadcode: deleteReason }),
      });
      if (res.ok) {
        addToast({ title: "Sukses", description: "Data SO berhasil dihapus" });
        setIsDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: ["so-list"] });
      } else {
        const msg = await res.text();
        addToast({ title: "Gagal", description: msg || "Gagal menghapus data", variant: "destructive" });
      }
    } catch {
      addToast({ title: "Error", description: "Gagal menghapus data", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Columns — same style as POSTO ──
  const columns: DataTableColumn<SOItem>[] = [
    {
      key: "noposto",
      header: "NO SO",
      render: (p) => <span className="font-mono font-bold text-brand-600">{p.noposto}</span>,
    },
    {
      key: "tanggalString",
      header: "Tanggal",
      render: (p) => <span className="text-gray-500 font-mono text-xs">{p.tanggalString}</span>,
    },
    {
      key: "transportString",
      header: "Transportir",
      render: (p) => (
        <div>
          <div className="text-sm font-medium">{p.transportString || "-"}</div>
          {p.distributorString && (
            <div className="text-[10px] text-gray-400 font-mono">{p.distributorString}</div>
          )}
        </div>
      ),
    },
    {
      key: "produkString",
      header: "Produk",
      render: (p) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-brand-500 shrink-0" />
          <span className="text-sm font-bold">{p.produkString || "-"}</span>
        </div>
      ),
    },
    {
      key: "qty",
      header: "Qty (Ton)",
      headerClassName: "text-right",
      className: "text-right font-bold",
      render: (p) => (p.qty || 0).toLocaleString(),
    },
    {
      key: "qtysisaBooking",
      header: "Sisa Booking",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div>
          <div className={cn("text-sm font-bold", (p.qtysisaBooking || 0) <= 0 ? "text-red-500" : "text-emerald-600")}>
            {(p.qtysisaBooking || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-400 uppercase">Ton</div>
        </div>
      ),
    },
    {
      key: "qtyrealisasi",
      header: "Realisasi",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div>
          <div className="text-sm font-bold text-emerald-600">{(p.qtyrealisasi || 0).toLocaleString()}</div>
          <div className="text-[10px] text-gray-400 uppercase">Ton</div>
        </div>
      ),
    },
    { key: "asalString", header: "Asal", render: (p) => p.asalString || "-" },
    { key: "tujuanString", header: "Tujuan", render: (p) => p.tujuanString || "-" },
    { key: "wilayah", header: "Wilayah", render: (p) => <span className="font-medium">{p.wilayah || "-"}</span> },
    { key: "updatedby", header: "PIC", render: (p) => <span className="text-[10px] uppercase font-bold text-gray-400">{p.updatedby || "-"}</span> },
    {
      key: "action",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-brand-50 text-brand-500 border-brand-200 hover:bg-brand-100 rounded-none h-8 font-bold text-[10px] uppercase tracking-wider"
            onClick={() => handleView(p.noposto)}
          >
            <Eye className="h-4 w-4 mr-1" /> View
          </Button>
          {!isRekanan && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-amber-500 border-amber-200 hover:bg-amber-50 rounded-none h-8"
                onClick={() => handleEditInit(p.noposto)}
              >
                <FileEdit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50 rounded-none h-8"
                onClick={() => { setDeleteTarget(p.noposto); setDeleteReason("34"); setIsDeleteOpen(true); }}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Hapus
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Order (SO)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor dan kelola semua Sales Order dari database.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["so-list"]}
            fetcher={fetcher}
            rowKey={(p) => p.noposto || String(p.id)}
            searchPlaceholder="Cari No SO, Transportir, Produk..."
            striped
            rowClassName={(row) => {
              if (row.tgljatuhtempo) {
                const now = new Date();
                const exp = new Date(row.tgljatuhtempo);
                if (now > exp) return "bg-red-50/30 dark:bg-red-500/5";
              }
              return "";
            }}
          />
        </CardContent>
      </Card>

      {/* View Modal */}
      {isViewOpen && selectedSO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-none shadow-2xl">
            <CardHeader className="border-b dark:border-white/10 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center justify-between">
                <CardTitle>Detail SO: {selectedSO.noposto}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsViewOpen(false)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Info SO</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm"><span>No SO</span><span className="font-bold font-mono">{selectedSO.noposto}</span></div>
                      <div className="flex justify-between text-sm"><span>Tanggal</span><span className="font-bold">{selectedSO.tanggalString}</span></div>
                      <div className="flex justify-between text-sm"><span>Jatuh Tempo</span><span className="font-bold">{selectedSO.tanggaljatuhtempoString || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Wilayah</span><span className="font-bold">{selectedSO.wilayah || "-"}</span></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Lokasi</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm"><span>Asal</span><span className="font-bold">{selectedSO.asalString || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Tujuan</span><span className="font-bold">{selectedSO.tujuanString || "-"}</span></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Transportir & Produk</p>
                    <div className="mt-2">
                      <div className="text-sm border-b pb-1 font-bold text-brand-500">{selectedSO.transportString || "-"}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-brand-500" />
                        <span className="text-sm font-bold">{selectedSO.produkString || "-"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Ringkasan Kuota</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div><p className="text-[10px] text-gray-500">Total</p><p className="text-lg font-bold">{(selectedSO.qty || 0).toLocaleString()} T</p></div>
                      <div><p className="text-[10px] text-gray-500">Booking</p><p className="text-lg font-bold text-amber-500">{(selectedSO.qtyrencana || 0).toLocaleString()} T</p></div>
                      <div><p className="text-[10px] text-gray-500">Realisasi</p><p className="text-lg font-bold text-emerald-600">{(selectedSO.qtyrealisasi || 0).toLocaleString()} T</p></div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-none border-brand-200 text-brand-500 hover:bg-brand-50 font-bold uppercase text-[10px]"
                      onClick={() => window.open(`/track/tiket?filter=posto&param=${selectedSO.noposto}`, "_blank")}
                    >
                      <History className="h-4 w-4 mr-2" /> Lihat Riwayat Tiket
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardHeader className="border-t pt-4">
              <Button variant="secondary" className="w-full" onClick={() => setIsViewOpen(false)}>Tutup</Button>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedSO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white dark:bg-gray-900 border-none shadow-2xl">
            <CardHeader className="border-b dark:border-white/10">
              <CardTitle>Edit SO: {selectedSO.noposto}</CardTitle>
            </CardHeader>
            <form onSubmit={handleUpdate}>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-white/10 p-3 rounded-lg border border-gray-100 dark:border-gray-800 italic">
                  <div>Produk: <strong>{selectedSO.produkString}</strong></div>
                  <div>Transport: <strong>{selectedSO.transportString}</strong></div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Kuantitas (Ton)</label>
                  <Input type="number" value={editForm.qty} onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Tanggal Akhir</label>
                  <Input type="date" value={editForm.tglakhir} onChange={(e) => setEditForm({ ...editForm, tglakhir: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Tanggal Jatuh Tempo</label>
                  <Input type="date" value={editForm.tgljatuhtempo} onChange={(e) => setEditForm({ ...editForm, tgljatuhtempo: e.target.value })} />
                </div>
              </CardContent>
              <CardHeader className="border-t pt-4 flex flex-row gap-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsEditOpen(false)}>Batal</Button>
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </CardHeader>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={(o) => !o && setIsDeleteOpen(false)}>
        <DialogContent className="max-w-md rounded-none border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-red-600 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Hapus Sales Order
            </DialogTitle>
            <DialogDescription className="text-[11px] font-bold text-gray-500 mt-2">
              Konfirmasi penghapusan SO <span className="text-red-600 font-black">{deleteTarget}</span>. Tindakan ini akan dicatat dalam audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Alasan Penghapusan</label>
            <select
              className="w-full h-11 px-4 rounded-none border border-gray-100 bg-gray-50/50 text-xs font-bold outline-none focus:ring-1 focus:ring-red-500"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            >
              <option value="34">DATA DOUBLE / GANDA</option>
              <option value="99">PEMBATALAN DARI PUSAT</option>
              <option value="REVISI">REVISI DATA INPUT</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-none font-bold text-xs" onClick={() => setIsDeleteOpen(false)}>BATAL</Button>
            <Button variant="destructive" className="rounded-none px-8 font-black uppercase text-[10px]" onClick={handleDeleteConfirm} disabled={isSaving}>
              {isSaving ? "Menghapus..." : "KONFIRMASI HAPUS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
