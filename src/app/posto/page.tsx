"use client";
import React, { useState } from "react";
import { Plus, Eye, FileEdit, Trash2, Calendar, Package, Ticket } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";

export default function PostoPage() {
  const { data: session } = useSession();
  const { apiJson, apiFetch, apiTable } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const role = (session?.user as any)?.role;
  const companyCode = (session?.user as any)?.companyCode as string | undefined;
  const isRekanan = role === "rekanan" || role === "transport";

  const [dateFilter, setDateFilter] = useState("");

  // Modal States
  const [selectedPosto, setSelectedPosto] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ date: "", qty: 0, expiryDate: "" });

  const fetcher = async (params: DataTableParams) => {
    const payload: any = {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: params.search || "",
      order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
      SD: dateFilter || "",
      columns: [
        { data: "noposto", name: "noposto", searchable: true, orderable: true },
        { data: "tanggalString", name: "tglposto", searchable: true, orderable: true },
        { data: "transportString", name: "transport", searchable: true, orderable: true },
        { data: "produkString", name: "produk", searchable: true, orderable: true },
        { data: "qty", name: "qty", searchable: true, orderable: true },
        { data: "qtyrealisasi", name: "qtyrealisasi", searchable: true, orderable: true },
        { data: "asalString", name: "asal", searchable: true, orderable: true },
        { data: "tujuanString", name: "tujuan", searchable: true, orderable: true },
        { data: "wilayah", name: "wilayah", searchable: true, orderable: true },
        { data: "bagian", name: "bagian", searchable: true, orderable: true },
        { data: "statusString", name: "status", searchable: true, orderable: true },
        { data: "action", name: "", searchable: false, orderable: false }
      ]
    };

    if (companyCode) payload.companyCode = companyCode;

    try {
      const result = await apiTable("/api/POSTO/DataTableFilter", payload);

      if (typeof result === "string") {
        throw new Error(result);
      }

      return {
        data: result.data ?? [],
        recordsTotal: result.recordsTotal ?? 0,
        recordsFiltered: result.recordsFiltered ?? result.recordsTotal ?? 0,
      };
    } catch (error: any) {
      console.error("POSTO API CRASH:", error);
      addToast({ title: "Backend Error", description: error.message || "Gagal menghubungi ASP.NET", variant: "destructive" });
      throw error;
    }
  };

  const handleView = async (id: string) => {
    try {
      const res = await apiTable("/api/POSTO/DetailData", { guid: id, posto: id, cmd: 'refresh' });
      const data = res?.response || (res?.noposto ? res : res?.data) || res;
      
      // Ensure guid is preserved from the 'id' parameter if missing in response
      const enrichedData = {
        ...data,
        guid: data.guid || data.Guid || id
      };
      
      setSelectedPosto(enrichedData);
      setIsViewOpen(true);
    } catch (error: any) {
      console.error("Detail Fetch Error:", error);
      addToast({ title: "Error", description: "Gagal memuat detail POSTO", variant: "destructive" });
    }
  };

  const handleEditInit = async (id: string) => {
    try {
      const res = await apiJson("/api/POSTO/DetailData", { method: "POST", body: JSON.stringify({ id }) });
      const item = res?.data ?? res;
      setSelectedPosto(item);
      setEditForm({ date: item.TglPOSTO || "", qty: item.Qty || 0, expiryDate: item.tgljatuhtempo || "" });
      setIsEditOpen(true);
    } catch {
      addToast({ title: "Error", description: "Gagal memuat data POSTO", variant: "destructive" });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosto) return;
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/POSTO/UpdateData", {
        method: "POST",
        body: JSON.stringify({
          id: selectedPosto.NoPOSTO || selectedPosto.id,
          date: editForm.date,
          qty: editForm.qty,
          expiryDate: editForm.expiryDate,
        }),
      });
      if (res.ok) {
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: ["posto"] });
      } else {
        addToast({ title: "Error", description: "Gagal menyimpan perubahan", variant: "destructive" });
      }
    } catch {
      addToast({ title: "Error", description: "Error saat menyimpan perubahan", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus POSTO ${id}?`)) return;
    try {
      const res = await apiFetch("/api/POSTO/DeleteData", { method: "POST", body: JSON.stringify({ id }) });
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["posto"] });
    } catch {
      addToast({ title: "Error", description: "Error saat menghapus data", variant: "destructive" });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("active")) return "info";
    if (s.includes("progress")) return "warning";
    if (s.includes("complete")) return "success";
    if (s.includes("cancel")) return "error";
    return "default";
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "noposto",
      header: "POSTO ID",
      render: (p) => <span className="font-mono font-bold">{p.noposto || p.id}</span>,
    },
    {
      key: "tanggalString",
      header: "Date",
      render: (p) => <span className="text-gray-500 font-mono text-xs">{p.tanggalString || p.date}</span>,
    },
    {
      key: "transportString",
      header: "Transportir",
      render: (p) => (
        <div>
          <div className="text-sm font-medium">{p.transportString || p.transportir || p.TransName}</div>
          <div className="text-[10px] text-gray-400 font-mono">{p.transport || p.transportirId || p.Trans}</div>
        </div>
      ),
    },
    {
      key: "produkString",
      header: "Product",
      render: (p) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-brand-500 shrink-0" />
          <span className="text-sm font-bold">{p.produkString || p.product || p.Produk}</span>
        </div>
      ),
    },
    {
      key: "qty",
      header: "Qty (Ton)",
      headerClassName: "text-right",
      className: "text-right font-bold",
      render: (p) => (p.qty || p.Qty || 0).toLocaleString(),
    },
    {
      key: "qtyrealisasi",
      header: "Realisasi",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div>
          <div className="text-sm font-bold text-emerald-600">{(p.qtyrealisasi || p.RE_TON || 0).toLocaleString()}</div>
          <div className="text-[10px] text-gray-400 uppercase">Ton</div>
        </div>
      ),
    },
    { key: "asalString", header: "Asal", render: (p) => p.asalString || p.asal || p.Asal || "-" },
    { key: "tujuanString", header: "Tujuan", render: (p) => p.tujuanString || p.tujuan || p.Tujuan || "-" },
    { key: "wilayah", header: "Wilayah", render: (p) => <span className="font-medium">{p.wilayah || p.Wilayah || "-"}</span> },
    { key: "bagian", header: "Bagian", render: (p) => p.bagian || p.Bagian || "-" },
    {
      key: "statusString",
      header: "Status",
      headerClassName: "text-center",
      className: "text-center",
      render: (p) => (
        <Badge color={getStatusBadgeColor(p.statusString || p.status || p.Status) as any} size="sm">
          {p.statusString || p.status || p.Status}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => {
        const id = p.guid;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-brand-50 text-brand-500 border-brand-200 hover:bg-brand-100"
              onClick={() => handleView(id)}
            >
              <Eye className="h-4 w-4 mr-1" /> {isRekanan ? "Riwayat & Detail" : "View"}
            </Button>

            {!isRekanan && (
              <>
                <Button variant="outline" size="sm" className="text-amber-500 border-amber-200 hover:bg-amber-50" onClick={() => handleEditInit(id)}>
                  <FileEdit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Hapus
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POSTO Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor and manage all Distribution Orders (POSTO) from Database.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["posto", companyCode, dateFilter]}
            fetcher={fetcher}
            rowKey={(p) => p.noposto || p.NoPOSTO || p.id}
            searchPlaceholder="Search No POSTO or Transportir..."
            toolbar={
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <Input
                    type="date"
                    className="h-8 w-40 text-xs"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                  {dateFilter && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500" onClick={() => setDateFilter("")}>
                      ✕
                    </Button>
                  )}
                </div>
                {!isRekanan && (
                  <Button size="sm" onClick={() => (window.location.href = "/posto/upload")}>
                    <Plus className="h-4 w-4 mr-2" />
                    New POSTO
                  </Button>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* View Modal */}
      {isViewOpen && selectedPosto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-none shadow-2xl">
            <CardHeader className="border-b dark:border-white/10 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center justify-between">
                <CardTitle>Detail POSTO: {selectedPosto.noposto || selectedPosto.NoPOSTO || selectedPosto.id}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsViewOpen(false)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Distribution Info</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm"><span>No Posto</span><span className="font-bold">{selectedPosto.noposto || selectedPosto.NoPOSTO || selectedPosto.id}</span></div>
                      <div className="flex justify-between text-sm"><span>Tanggal Posto</span><span className="font-bold">{selectedPosto.tanggalString || selectedPosto.TglPOSTO || selectedPosto.date}</span></div>
                      <div className="flex justify-between text-sm"><span>Jatuh Tempo</span><span className="font-bold">{selectedPosto.tanggaljatuhtempoString || selectedPosto.tgljatuhtempo || selectedPosto.expiryDate || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Status</span><Badge color="info" size="sm">{selectedPosto.statusString || selectedPosto.Status || selectedPosto.status}</Badge></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Area {"&"} Location</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm"><span>Asal</span><span className="font-bold">{selectedPosto.asalString || selectedPosto.Asal || selectedPosto.asal || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Tujuan</span><span className="font-bold">{selectedPosto.tujuanString || selectedPosto.Tujuan || selectedPosto.tujuan || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Wilayah</span><span className="font-bold">{selectedPosto.wilayah || selectedPosto.Wilayah || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Bagian</span><span className="font-bold">{selectedPosto.bagian || selectedPosto.Bagian || "-"}</span></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Transportir {"&"} Product</p>
                    <div className="mt-2 space-y-2">
                      <div className="text-sm border-b pb-1 font-bold text-brand-500">{selectedPosto.transportString || selectedPosto.TransName || selectedPosto.transportir}</div>
                      <div className="text-[10px] text-gray-400">ID: {selectedPosto.transport || selectedPosto.Trans || selectedPosto.transportirId}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-brand-500" />
                        <span className="text-sm font-bold">{selectedPosto.produkString || selectedPosto.Produk || selectedPosto.product}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Quantity Summary</p>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div><p className="text-[10px] text-gray-500">Plan</p><p className="text-lg font-bold">{(selectedPosto.qty || selectedPosto.Qty || 0).toLocaleString()} T</p></div>
                      <div><p className="text-[10px] text-gray-500">Realization</p><p className="text-lg font-bold text-emerald-600">{(selectedPosto.qtyrealisasi || selectedPosto.RE_TON || selectedPosto.realization || 0).toLocaleString()} T</p></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket History Section */}
              <div className="border-t pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand-50 rounded-lg text-brand-500">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Riwayat Tiket</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Daftar muatan yang menggunakan POSTO ini</p>
                  </div>
                  <Link 
                    href={`/tiket?posto=${selectedPosto?.guid || selectedPosto?.Guid || selectedPosto?.noposto}`}
                    className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wider flex items-center gap-1 border-b border-brand-500/30 pb-0.5 transition-colors"
                  >
                    Lihat Riwayat Lengkap
                  </Link>
                </div>

                <div className="rounded-xl border dark:border-white/10 overflow-hidden">
                  <DataTable
                    queryKey={['posto-tickets-history', selectedPosto?.guid || selectedPosto?.Guid || selectedPosto?.noposto]}
                    fetcher={async (params) => {
                      const guidValue = selectedPosto?.guid || selectedPosto?.Guid || selectedPosto?.noposto || selectedPosto?.NoPOSTO;
                      const payload: any = {
                        draw: params.draw,
                        start: params.start,
                        length: params.length,
                        search: params.search || "",
                        order: params.order?.length ? params.order : [{ column: 1, dir: "desc" }],
                        posto: guidValue,
                        cmd: 'refresh',
                        columns: [
                          { data: "action", name: "", searchable: false, orderable: false },
                          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
                          { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
                          { data: "shift", name: "idshift", searchable: true, orderable: true },
                          { data: "nopol", name: "nopol", searchable: true, orderable: true },
                          { data: "driver", name: "driver", searchable: true, orderable: true },
                          { data: "qty", name: "qty", searchable: true, orderable: true },
                          { data: "updatedonString", name: "updatedon", searchable: true, orderable: true }
                        ]
                      };
                      return apiTable(`/api/Tiket/DataTablePeriodeTiket`, payload);
                    }}
                    rowKey={(row: any) => row.bookingno}
                    columns={[
                      {
                        key: "bookingno",
                        header: "Booking No",
                        render: (row: any) => <span className="font-bold text-gray-900 dark:text-white font-mono">{row.bookingno}</span>
                      },
                      {
                        key: "tanggalString",
                        header: "Tanggal",
                        render: (row: any) => <span className="text-gray-500 font-mono text-xs">{row.tanggalString}</span>
                      },
                      {
                        key: "shift",
                        header: "Shift",
                        render: (row: any) => <span className="text-xs">{row.shift}</span>
                      },
                      {
                        key: "nopol",
                        header: "Nopol",
                        render: (row: any) => <Badge color="default" size="sm" className="font-mono">{row.nopol}</Badge>
                      },
                      {
                        key: "driver",
                        header: "Driver",
                        render: (row: any) => <span className="text-sm font-medium">{row.driver}</span>
                      },
                      {
                        key: "qty",
                        header: "Qty",
                        headerClassName: "text-right",
                        className: "text-right",
                        render: (row: any) => <span className="font-bold font-mono text-emerald-600">{row.qty?.toLocaleString()}</span>
                      }
                    ]}
                  />
                </div>
              </div>
            </CardContent>
            <CardHeader className="border-t pt-4">
              <Button variant="secondary" className="w-full" onClick={() => setIsViewOpen(false)}>Close Detail</Button>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedPosto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white dark:bg-gray-900 border-none shadow-2xl">
            <CardHeader className="border-b dark:border-white/10">
              <CardTitle>Edit POSTO: {selectedPosto.noposto || selectedPosto.NoPOSTO || selectedPosto.id}</CardTitle>
            </CardHeader>
            <form onSubmit={handleUpdate}>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-white/10 p-3 rounded-lg border border-gray-100 dark:border-gray-800 italic">
                  <div>Product: <strong>{selectedPosto.produkString || selectedPosto.Produk || selectedPosto.product}</strong></div>
                  <div>Vendor: <strong>{selectedPosto.transportString || selectedPosto.TransName || selectedPosto.transportir}</strong></div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Tanggal Posto</label>
                  <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Kuantitas (Ton)</label>
                  <Input type="number" value={editForm.qty} onChange={(e) => setEditForm({ ...editForm, qty: Number(e.target.value) })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Tanggal Jatuh Tempo</label>
                  <Input type="date" value={editForm.expiryDate} onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })} />
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
    </div>
  );
}
