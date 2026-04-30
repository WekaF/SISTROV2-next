"use client";
import React, { useState } from "react";
import {
  Search,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  Ticket,
  Package,
  Truck,
  Calendar,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

interface TiketData {
  BookingNo?: string;
  bookingno?: string;
  NoPOSTO?: string;
  posto?: string;
  Nopol?: string;
  nopol?: string;
  Driver?: string;
  driver?: string;
  NamaProduk?: string;
  productname?: string;
  NamaTransportir?: string;
  TransName?: string;
  StatusPemuatan?: string;
  statuspemuatan?: string;
  UpdatedOn?: string;
  updatedon?: string;
  Position?: string;
  position?: string;
}

const STATUS_MAP: Record<string, { label: string; color: "info" | "warning" | "success" | "error" | "default" }> = {
  "1": { label: "Booking",      color: "info" },
  "2": { label: "Antrian",      color: "warning" },
  "3": { label: "Masuk",        color: "warning" },
  "4": { label: "Muat",         color: "info" },
  "5": { label: "Selesai",      color: "success" },
  "7": { label: "Dibatalkan",   color: "error" },
};

function getStatus(code: string | undefined) {
  const s = String(code ?? "");
  return STATUS_MAP[s] ?? { label: s || "Unknown", color: "default" as const };
}

export default function TicketPage() {
  const { data: session } = useSession();
  const { apiTable, apiJson, apiFetch } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTiket, setSelectedTiket] = useState<TiketData | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const role = (session?.user as any)?.role as string | undefined;
  const companyCode = (session?.user as any)?.companyCode as string | undefined;
  const isRekanan = role === "rekanan" || role === "transport";

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["tiket-list", debouncedSearch, statusFilter, companyCode],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("draw", "1");
      params.append("start", "0");
      params.append("length", "100");
      params.append("search[value]", debouncedSearch);
      if (companyCode) params.append("companyCode", companyCode);
      if (statusFilter) params.append("statusPemuatan", statusFilter);

      const res = await apiFetch("/api/Tiket/DataTableFilter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      if (!res.ok) throw new Error(`[${res.status}] ${res.statusText}`);
      return res.json();
    },
    enabled: !!session,
  });

  const tikets: TiketData[] = data?.data ?? [];

  const handleView = async (bookingno: string) => {
    try {
      const res = await apiJson("/api/Tiket/Detail", {
        method: "POST",
        body: JSON.stringify({ bookingno }),
      });
      setSelectedTiket(res?.data ?? res);
      setIsViewOpen(true);
    } catch {
      addToast({ title: "Error", description: "Gagal memuat detail tiket", variant: "destructive" });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (bookingno: string) => {
      const res = await apiFetch("/api/Tiket/Delete", {
        method: "POST",
        body: JSON.stringify({ bookingno }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Tiket berhasil dihapus", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["tiket-list"] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleDelete = (bookingno: string) => {
    if (!confirm(`Hapus tiket ${bookingno}?`)) return;
    deleteMutation.mutate(bookingno);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            Manajemen Tiket
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {isRekanan
              ? "Daftar tiket pemuatan armada Anda."
              : "Monitor seluruh tiket pemuatan di sistem SISTRO."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["tiket-list"] })}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="shadow-theme-xs">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Cari Booking No, Nopol, Driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                className="h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-brand-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Booking No</th>
                  <th className="px-5 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">POSTO</th>
                  <th className="px-5 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Armada</th>
                  <th className="px-5 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Produk</th>
                  {!isRekanan && (
                    <th className="px-5 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Transportir</th>
                  )}
                  <th className="px-5 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Status</th>
                  <th className="px-5 py-4 text-xs font-black uppercase text-gray-400 tracking-widest">Tanggal</th>
                  <th className="px-5 py-4 text-xs font-black uppercase text-gray-400 tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={isRekanan ? 7 : 8} className="px-5 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" />
                    </td>
                  </tr>
                ) : tikets.length === 0 ? (
                  <tr>
                    <td colSpan={isRekanan ? 7 : 8} className="px-5 py-12 text-center text-gray-500 italic">
                      Tidak ada data tiket.
                    </td>
                  </tr>
                ) : tikets.map((t) => {
                  const bn = t.BookingNo ?? t.bookingno ?? "";
                  const st = getStatus(t.StatusPemuatan ?? t.statuspemuatan);
                  return (
                    <tr key={bn} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-sm text-gray-900 dark:text-white">{bn}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-sm">
                          <Ticket className="h-3.5 w-3.5 text-brand-500" />
                          <span className="font-medium">{t.NoPOSTO ?? t.posto ?? "-"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5 text-gray-400" />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{t.Nopol ?? t.nopol ?? "-"}</span>
                            <span className="text-[10px] text-gray-400">{t.Driver ?? t.driver ?? ""}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5 text-brand-500" />
                          <span className="text-sm font-medium">{t.NamaProduk ?? t.productname ?? "-"}</span>
                        </div>
                      </td>
                      {!isRekanan && (
                        <td className="px-5 py-4 text-sm font-medium">
                          {t.NamaTransportir ?? t.TransName ?? "-"}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <Badge color={st.color} size="sm" variant="light">
                          {st.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {t.UpdatedOn ?? t.updatedon
                            ? new Date(t.UpdatedOn ?? t.updatedon ?? "").toLocaleDateString("id-ID")
                            : "-"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Lihat Detail"
                            className="hover:text-brand-500"
                            onClick={() => handleView(bn)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(role === "admin" || role === "superadmin") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Hapus Tiket"
                              className="text-red-400 hover:text-red-600 hover:bg-red-50"
                              disabled={deleteMutation.isPending}
                              onClick={() => handleDelete(bn)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {isViewOpen && selectedTiket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-white dark:bg-gray-900 border-none shadow-2xl">
            <CardHeader className="border-b dark:border-white/10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-brand-500" />
                  Detail Tiket
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsViewOpen(false)}>✕</Button>
              </div>
              <CardDescription>
                {selectedTiket.BookingNo ?? selectedTiket.bookingno}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black">No POSTO</p>
                  <p className="font-bold mt-0.5">{selectedTiket.NoPOSTO ?? selectedTiket.posto ?? "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black">Status</p>
                  <div className="mt-0.5">
                    <Badge color={getStatus(selectedTiket.StatusPemuatan ?? selectedTiket.statuspemuatan).color} size="sm">
                      {getStatus(selectedTiket.StatusPemuatan ?? selectedTiket.statuspemuatan).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black">Nopol</p>
                  <p className="font-bold mt-0.5">{selectedTiket.Nopol ?? selectedTiket.nopol ?? "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black">Driver</p>
                  <p className="font-medium mt-0.5">{selectedTiket.Driver ?? selectedTiket.driver ?? "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black">Produk</p>
                  <p className="font-medium mt-0.5">{selectedTiket.NamaProduk ?? selectedTiket.productname ?? "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black">Transportir</p>
                  <p className="font-medium mt-0.5">{selectedTiket.NamaTransportir ?? selectedTiket.TransName ?? "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black">Tanggal Update</p>
                  <p className="font-medium mt-0.5">
                    {selectedTiket.UpdatedOn ?? selectedTiket.updatedon
                      ? new Date(selectedTiket.UpdatedOn ?? selectedTiket.updatedon ?? "").toLocaleString("id-ID")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black">Position</p>
                  <p className="font-medium mt-0.5">{selectedTiket.Position ?? selectedTiket.position ?? "-"}</p>
                </div>
              </div>
            </CardContent>
            <CardHeader className="border-t pt-4">
              <Button variant="secondary" className="w-full" onClick={() => setIsViewOpen(false)}>
                Tutup
              </Button>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
