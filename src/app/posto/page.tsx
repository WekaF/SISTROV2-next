"use client";
import React, { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  Eye, 
  FileEdit, 
  Trash2,
  Calendar,
  Package,
  ArrowUpDown,
  Ticket
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PostoPage() {
  const [loading, setLoading] = useState(true);
  const [postoData, setPostoData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const { data: session } = useSession();
  const { apiJson, apiFetch, apiTable } = useApi();
  const role = (session?.user as any)?.role;
  const isRekanan = role === 'rekanan' || role === 'transport';

  // Modal States
  const [selectedPosto, setSelectedPosto] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    date: "",
    qty: 0,
    expiryDate: ""
  });

  const fetchData = async (term = "", dt = "") => {
    try {
      setLoading(true);
      const body = {
        draw: 1,
        start: 0,
        length: 100,
        search: { value: term },
        extra_data: dt,
        companyCode: (session?.user as any)?.companyCode
      };
      
      const data = await apiTable(`/api/POSTO/DataTableFilter`, body);

      if (data && data.data) {
        setPostoData(data.data);
      } else if (Array.isArray(data)) {
        setPostoData(data);
      }
    } catch (error) {
      console.error("Failed to fetch posto data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(search, date);
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    fetchData(search, newDate);
  };

  // Actions
  const handleView = async (id: string) => {
    try {
      const data = await apiJson(`/api/POSTO/DetailData`, {
        method: "POST",
        body: JSON.stringify({ id })
      });
      if (data) {
        setSelectedPosto(data.data || data);
        setIsViewOpen(true);
      }
    } catch (error) {
       alert("Gagal memuat detail POSTO");
    }
  };

  const handleEditInit = async (id: string) => {
    try {
      const data = await apiJson(`/api/POSTO/DetailData`, {
        method: "POST",
        body: JSON.stringify({ id })
      });
      if (data) {
        const item = data.data || data;
        setSelectedPosto(item);
        setEditForm({
          date: item.TglPOSTO || "",
          qty: item.Qty || 0,
          expiryDate: item.tgljatuhtempo || ""
        });
        setIsEditOpen(true);
      }
    } catch (error) {
       alert("Gagal memuat data POSTO");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosto) return;

    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/POSTO/UpdateData`, {
        method: 'POST',
        body: JSON.stringify({
          id: selectedPosto.NoPOSTO || selectedPosto.id,
          date: editForm.date,
          qty: editForm.qty,
          expiryDate: editForm.expiryDate
        })
      });
      if (res.ok) {
        setIsEditOpen(false);
        fetchData(search, date);
      }
    } catch (error) {
      alert("Error saat menyimpan perubahan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus POSTO ${id}?`)) return;

    try {
      const res = await apiFetch(`/api/POSTO/DeleteData`, { 
        method: 'POST',
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchData(search, date);
      }
    } catch (error) {
      alert("Error saat menghapus data");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POSTO Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor and manage all Distribution Orders (POSTO) from Database.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => fetchData(search, date)}>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Refresh
           </Button>
           <Button size="sm" onClick={() => window.location.href='/posto/upload'}>
              <Plus className="h-4 w-4 mr-2" />
              New POSTO
           </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  className="pl-10" 
                  placeholder="Search No POSTO or Transportir..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">Search</Button>
            </form>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-sm text-gray-500">
                 <Calendar className="h-4 w-4" />
                 <Input 
                   type="date" 
                   className="h-8 w-40 text-xs" 
                   value={date}
                   onChange={(e) => handleDateChange(e.target.value)}
                 />
                 {date && (
                   <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500" onClick={() => handleDateChange("")}>X</Button>
                 )}
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto min-h-[400px]">
             {loading ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4">
                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
                 <p className="text-sm text-gray-500">Loading POSTO data...</p>
               </div>
             ) : (
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>POSTO ID</TableHead>
                     <TableHead>Date</TableHead>
                     <TableHead>Transportir</TableHead>
                     <TableHead>Product</TableHead>
                     <TableHead className="text-right">Qty (Ton)</TableHead>
                     <TableHead className="text-right">Realisasi</TableHead>
                     <TableHead>Asal</TableHead>
                     <TableHead>Tujuan</TableHead>
                     <TableHead>Wilayah</TableHead>
                     <TableHead>Bagian</TableHead>
                     <TableHead className="text-center">Status</TableHead>
                     <TableHead className="text-right">Action</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {postoData.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={12} className="h-24 text-center text-gray-500 italic">
                         Data tidak ditemukan.
                       </TableCell>
                     </TableRow>
                   ) : postoData.map((posto) => (
                     <TableRow key={posto.NoPOSTO || posto.id}>
                       <TableCell className="font-mono font-bold">{posto.NoPOSTO || posto.id}</TableCell>
                       <TableCell className="text-gray-500 font-mono">{posto.TglPOSTO || posto.date}</TableCell>
                       <TableCell>
                          <div className="text-sm font-medium">{posto.TransName || posto.transportir || posto.NAMA_VEND}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{posto.Trans || posto.transportirId}</div>
                       </TableCell>
                       <TableCell>
                          <div className="flex items-center gap-2">
                             <Package className="h-4 w-4 text-brand-500" />
                             <span className="text-sm font-bold">{posto.Produk || posto.product || posto.NAMA_BARANG}</span>
                          </div>
                       </TableCell>
                       <TableCell className="text-right font-bold">
                          {(posto.Qty || posto.qty || 0).toLocaleString()}
                       </TableCell>
                       <TableCell className="text-right">
                          <div className="text-sm font-bold text-emerald-600">{(posto.RE_TON || posto.realization || 0).toLocaleString()}</div>
                          <div className="text-[10px] text-gray-400 uppercase">Ton</div>
                       </TableCell>
                       <TableCell>{posto.Asal || posto.asal || "-"}</TableCell>
                       <TableCell>{posto.Tujuan || posto.tujuan || "-"}</TableCell>
                       <TableCell className="font-medium">{posto.Wilayah || posto.wilayah || "-"}</TableCell>
                       <TableCell>{posto.Bagian || posto.bagian || "-"}</TableCell>
                       <TableCell className="text-center">
                          <Badge 
                             color={getStatusBadgeColor(posto.Status || posto.status) as any} 
                             size="sm"
                          >
                             {posto.Status || posto.status}
                          </Badge>
                       </TableCell>
                        <TableCell className="text-right">
                           <div className="flex items-center justify-end gap-2">
                             {isRekanan ? (
                               <Link href={`/tiket/booking?posto=${posto.NoPOSTO || posto.id}`}>
                                 <Button variant="outline" size="sm" className="bg-brand-50 text-brand-500 border-brand-200 hover:bg-brand-100">
                                   <Ticket className="h-4 w-4 mr-1" />
                                   Booking
                                 </Button>
                               </Link>
                             ) : (
                               <>
                                 <Button variant="outline" size="sm" className="text-blue-500 border-blue-200 hover:bg-blue-50" onClick={() => handleView(posto.NoPOSTO || posto.id)}>
                                    <Eye className="h-4 w-4 mr-1" /> View
                                 </Button>
                                 <Button variant="outline" size="sm" className="text-amber-500 border-amber-200 hover:bg-amber-50" onClick={() => handleEditInit(posto.NoPOSTO || posto.id)}>
                                    <FileEdit className="h-4 w-4 mr-1" /> Edit
                                 </Button>
                                 <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDelete(posto.NoPOSTO || posto.id)}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Hapus
                                 </Button>
                               </>
                             )}
                           </div>
                        </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             )}
           </div>
        </CardContent>
      </Card>

      {/* View Modal */}
      {isViewOpen && selectedPosto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-none shadow-2xl">
            <CardHeader className="border-b dark:border-white/10">
              <div className="flex items-center justify-between">
                <CardTitle>Detail POSTO: {selectedPosto.NoPOSTO || selectedPosto.id}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsViewOpen(false)}>X</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <div>
                       <p className="text-[10px] text-gray-400 uppercase font-black">Distribution Info</p>
                       <div className="mt-2 space-y-2">
                          <div className="flex justify-between text-sm"><span>No Posto</span><span className="font-bold">{selectedPosto.NoPOSTO || selectedPosto.id}</span></div>
                          <div className="flex justify-between text-sm"><span>Tanggal Posto</span><span className="font-bold">{selectedPosto.TglPOSTO || selectedPosto.date}</span></div>
                          <div className="flex justify-between text-sm"><span>Jatuh Tempo</span><span className="font-bold">{selectedPosto.tgljatuhtempo || selectedPosto.expiryDate || "-"}</span></div>
                          <div className="flex justify-between text-sm"><span>Status</span><Badge color="info" size="sm">{selectedPosto.Status || selectedPosto.status}</Badge></div>
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] text-gray-400 uppercase font-black">Area & Location</p>
                       <div className="mt-2 space-y-2">
                          <div className="flex justify-between text-sm"><span>Asal</span><span className="font-bold">{selectedPosto.Asal || selectedPosto.asal || "-"}</span></div>
                          <div className="flex justify-between text-sm"><span>Tujuan</span><span className="font-bold">{selectedPosto.Tujuan || selectedPosto.tujuan || "-"}</span></div>
                          <div className="flex justify-between text-sm"><span>Wilayah</span><span className="font-bold">{selectedPosto.Wilayah || selectedPosto.wilayah || "-"}</span></div>
                          <div className="flex justify-between text-sm"><span>Bagian</span><span className="font-bold">{selectedPosto.Bagian || selectedPosto.bagian || "-"}</span></div>
                       </div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div>
                       <p className="text-[10px] text-gray-400 uppercase font-black">Transportir & Product</p>
                       <div className="mt-2 space-y-2">
                          <div className="text-sm border-b pb-1 font-bold text-brand-500">{selectedPosto.TransName || selectedPosto.transportir}</div>
                          <div className="text-[10px] text-gray-400">ID: {selectedPosto.Trans || selectedPosto.transportirId}</div>
                          <div className="mt-3 flex items-center gap-2">
                             <Package className="h-5 w-5 text-brand-500" />
                             <span className="text-sm font-bold">{selectedPosto.Produk || selectedPosto.product}</span>
                          </div>
                       </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                       <p className="text-[10px] text-gray-400 uppercase font-black">Quantity Summary</p>
                       <div className="mt-3 grid grid-cols-2 gap-4">
                          <div><p className="text-[10px] text-gray-500">Plan</p><p className="text-lg font-bold">{(selectedPosto.Qty || selectedPosto.qty || 0).toLocaleString()} T</p></div>
                          <div><p className="text-[10px] text-gray-500">Realization</p><p className="text-lg font-bold text-emerald-600">{(selectedPosto.RE_TON || selectedPosto.realization || 0).toLocaleString()} T</p></div>
                       </div>
                    </div>
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
              <CardTitle>Edit POSTO: {selectedPosto.NoPOSTO || selectedPosto.id}</CardTitle>
            </CardHeader>
            <form onSubmit={handleUpdate}>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-white/10 p-3 rounded-lg border border-gray-100 dark:border-gray-800 italic">
                   <div>Product: <strong>{selectedPosto.Produk || selectedPosto.product}</strong></div>
                   <div>Vendor: <strong>{selectedPosto.TransName || selectedPosto.transportir}</strong></div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Tanggal Posto</label>
                  <Input 
                    type="date" 
                    value={editForm.date}
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Kuantitas (Ton)</label>
                  <Input 
                    type="number" 
                    value={editForm.qty}
                    onChange={(e) => setEditForm({...editForm, qty: Number(e.target.value)})}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Tanggal Jatuh Tempo</label>
                  <Input 
                    type="date" 
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm({...editForm, expiryDate: e.target.value})}
                  />
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
