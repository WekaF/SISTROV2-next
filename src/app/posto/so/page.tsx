"use client";
import { useState } from "react";
import {
  Eye, Trash2, Calendar, Package, Ticket,
  TrendingDown, TrendingUp, Scissors, Ship,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useSession } from "next-auth/react";
import { useCompany } from "@/context/CompanyContext";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";

export default function SOPage() {
  const { data: session } = useSession();
  const { apiFetch, apiTable } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const role = (session?.user as any)?.role;
  const { activeCompanyCode } = useCompany();
  const companyCode = activeCompanyCode ?? undefined;
  const isRekanan = role === "rekanan" || role === "transport";

  const [dateFilter, setDateFilter] = useState("");
  const [selectedSO, setSelectedSO] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const fetcher = async (params: DataTableParams) => {
    const payload: any = {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: params.search || "",
      order: [{ column: 0, dir: "desc" }],
      SD: dateFilter || "",
      tipe: "SO",
      columns: [
        { data: "charter", name: "charter", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "numberString", name: "numberString", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "wilayah", name: "wilayah", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "tanggalString", name: "tglposto", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "noposto", name: "noposto", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "tglakhirString", name: "tglakhir", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "asalString", name: "asal", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "tujuanString", name: "tujuan", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "bagian", name: "bagian", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "transportString", name: "transport", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "produkString", name: "produk", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "qty", name: "qty", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "qtyrencana", name: "qtyrencana", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "qtysisaBooking", name: "qtysisaBooking", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "qtyrealisasi", name: "qtyrealisasi", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "qtysisaRealisasi", name: "qtysisaRealisasi", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "cutoff", name: "cutoff", searchable: true, orderable: false, search: { value: "", regex: "false" } },
        { data: "kapal", name: "kapal", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "kotatujuan", name: "kotatujuan", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "updatedby", name: "updatedby", searchable: true, orderable: false, search: { value: "", regex: "false" } },
        { data: "tanggaljatuhtempoString", name: "tgljatuhtempo", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "action", name: "", searchable: false, orderable: false },
      ],
    };

    if (companyCode) payload.companyCode = companyCode;

    try {
      const result = await apiTable("/api/SO/DataTableFilter", payload);
      if (typeof result === "string") throw new Error(result);
      return {
        data: result.data ?? [],
        recordsTotal: result.recordsTotal ?? 0,
        recordsFiltered: result.recordsFiltered ?? result.recordsTotal ?? 0,
      };
    } catch (error: any) {
      addToast({ title: "Backend Error", description: error.message || "Gagal memuat data SO", variant: "destructive" });
      throw error;
    }
  };

  const handleView = async (noposto: string) => {
    try {
      const res = await apiTable("/api/POSTO/DetailData", {
        guid: noposto,
        noposto,
        cmd: "refresh",
      });
      const data = res?.response || (res?.noposto ? res : res?.data) || res;
      setSelectedSO({ ...data, guid: data.guid || noposto });
      setIsViewOpen(true);
    } catch {
      addToast({ title: "Error", description: "Gagal memuat detail SO", variant: "destructive" });
    }
  };

  const handleDelete = async (noposto: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus SO ${noposto}?`)) return;
    try {
      const res = await apiFetch("/api/POSTO/DeleteData", {
        method: "POST",
        body: JSON.stringify({ noposto }),
      });
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["so"] });
    } catch {
      addToast({ title: "Error", description: "Error saat menghapus data SO", variant: "destructive" });
    }
  };

  const getCutoffBadge = (cutoff: string) => {
    if (!cutoff || cutoff === "Belum Cut Off") return { color: "light" as const, label: "Belum Cut Off" };
    return { color: "error" as const, label: cutoff };
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("aktif")) return "success";
    if (s.includes("non")) return "error";
    return "default";
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "noposto",
      header: "No SO",
      render: (p) => (
        <div>
          <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{p.noposto}</span>
          {p.charter === "1" && (
            <span className="ml-2 text-[9px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
              Charter
            </span>
          )}
        </div>
      ),
    },
    {
      key: "tanggalString",
      header: "Tgl SO",
      render: (p) => (
        <div className="text-xs font-mono text-gray-500">
          <div>{p.tanggalString}</div>
          {p.tglakhirString && (
            <div className="text-[10px] text-gray-400">s/d {p.tglakhirString}</div>
          )}
        </div>
      ),
    },
    {
      key: "transportString",
      header: "Transportir",
      render: (p) => (
        <div>
          <div className="text-sm font-medium">{p.transportString || "-"}</div>
          {p.distributorString && (
            <div className="text-[10px] text-gray-400">Dist: {p.distributorString}</div>
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
      header: "Kuantitas",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div className="text-right space-y-0.5">
          <div className="text-sm font-bold">{(p.qty || 0).toLocaleString()} T</div>
          <div className="text-[10px] text-gray-400">Rencana</div>
        </div>
      ),
    },
    {
      key: "qtyrencana",
      header: "Booking",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div className="text-right space-y-0.5">
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{(p.qtyrencana || 0).toLocaleString()} T</div>
          <div className="text-[10px] text-gray-400 flex items-center justify-end gap-1">
            <TrendingDown className="h-3 w-3" />
            Sisa {(p.qtysisaBooking ?? 0).toLocaleString()} T
          </div>
        </div>
      ),
    },
    {
      key: "qtyrealisasi",
      header: "Realisasi",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div className="text-right space-y-0.5">
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{(p.qtyrealisasi || 0).toLocaleString()} T</div>
          <div className="text-[10px] text-gray-400 flex items-center justify-end gap-1">
            <TrendingUp className="h-3 w-3" />
            Sisa {(p.qtysisaRealisasi ?? 0).toLocaleString()} T
          </div>
        </div>
      ),
    },
    {
      key: "asalString",
      header: "Asal / Tujuan",
      render: (p) => (
        <div className="text-xs">
          <div className="font-medium">{p.asalString || p.asal || "-"}</div>
          <div className="text-gray-400">→ {p.tujuanString || p.tujuan || "-"}</div>
        </div>
      ),
    },
    {
      key: "bagian",
      header: "Area",
      render: (p) => (
        <div className="text-xs">
          <div className="font-medium">{p.wilayah || "-"}</div>
          <div className="text-gray-400">{p.bagian || "-"}</div>
        </div>
      ),
    },
    {
      key: "cutoff",
      header: "Cut Off",
      headerClassName: "text-center",
      className: "text-center",
      render: (p) => {
        const co = getCutoffBadge(p.cutoff);
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge color={co.color} size="sm">
              {co.label !== "Belum Cut Off" ? (
                <><Scissors className="h-2.5 w-2.5 mr-1" />{co.label}</>
              ) : co.label}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "statusString",
      header: "Status",
      headerClassName: "text-center",
      className: "text-center",
      render: (p) => (
        <Badge color={getStatusBadge(p.statusString || p.status) as any} size="sm">
          {p.statusString || p.status || "-"}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => {
        const noposto = p.noposto;
        return (
          <div className="flex items-center justify-end gap-2">
            {isRekanan && (
              <Button
                size="sm"
                className="bg-[#003473] hover:bg-[#002855] text-white rounded-none shadow-lg shadow-blue-900/20 px-4 h-8 font-black uppercase text-[10px] tracking-widest"
                onClick={() => (window.location.href = `/tiket/booking?noposto=${noposto}`)}
              >
                <Ticket className="h-3.5 w-3.5 mr-1.5" /> Booking
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="bg-brand-50 text-brand-500 border-brand-200 hover:bg-brand-100 rounded-none h-8 font-bold text-[10px] uppercase tracking-wider dark:bg-brand-900/20 dark:border-brand-800"
              onClick={() => handleView(noposto)}
            >
              <Eye className="h-4 w-4 mr-1" /> Detail
            </Button>
            {!isRekanan && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50 rounded-none h-8 dark:border-red-900 dark:hover:bg-red-900/20"
                onClick={() => handleDelete(noposto)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Hapus
              </Button>
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
          <div className="flex items-center gap-2">
            <Ship className="h-6 w-6 text-brand-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data SO</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sales Order — daftar pesanan pemuatan dengan tipe SO (noposto diawali angka 3).
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["so", companyCode, dateFilter]}
            fetcher={fetcher}
            rowKey={(p) => p.noposto || p.id}
            searchPlaceholder="Cari No SO, Transportir, Produk..."
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
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {isViewOpen && selectedSO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-none shadow-2xl">
            <CardHeader className="border-b dark:border-white/10 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Ship className="h-5 w-5 text-brand-500" />
                  Detail SO: {selectedSO.noposto}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsViewOpen(false)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black mb-2">Informasi Dokumen SO</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>No SO</span><span className="font-bold font-mono">{selectedSO.noposto}</span></div>
                      <div className="flex justify-between text-sm"><span>Tanggal SO</span><span className="font-bold">{selectedSO.tanggalString}</span></div>
                      <div className="flex justify-between text-sm"><span>Berlaku Hingga</span><span className="font-bold">{selectedSO.tglakhirString || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Jatuh Tempo</span><span className="font-bold">{selectedSO.tanggaljatuhtempoString || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Status</span>
                        <Badge color={getStatusBadge(selectedSO.statusString) as any} size="sm">{selectedSO.statusString}</Badge>
                      </div>
                      <div className="flex justify-between text-sm"><span>Cut Off</span>
                        <Badge color={getCutoffBadge(selectedSO.cutoff).color} size="sm">{getCutoffBadge(selectedSO.cutoff).label}</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black mb-2">Area & Lokasi</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span>Asal</span><span className="font-bold">{selectedSO.asalString || selectedSO.asal || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Tujuan</span><span className="font-bold">{selectedSO.tujuanString || selectedSO.tujuan || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Wilayah</span><span className="font-bold">{selectedSO.wilayah || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Bagian</span><span className="font-bold">{selectedSO.bagian || "-"}</span></div>
                      {selectedSO.kapal && <div className="flex justify-between text-sm"><span>Kapal</span><span className="font-bold">{selectedSO.kapal}</span></div>}
                      {selectedSO.kotatujuan && <div className="flex justify-between text-sm"><span>Kota Tujuan</span><span className="font-bold">{selectedSO.kotatujuan}</span></div>}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black mb-2">Transportir & Produk</p>
                    <div className="space-y-2">
                      <div className="text-sm font-bold text-brand-500">{selectedSO.transportString || "-"}</div>
                      {selectedSO.distributorString && (
                        <div className="text-xs text-gray-400">Distributor: {selectedSO.distributorString}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Package className="h-4 w-4 text-brand-500" />
                        <span className="text-sm font-bold">{selectedSO.produkString || "-"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase font-black mb-3">Ringkasan Kuantitas</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-gray-500">Qty SO</p>
                        <p className="text-lg font-bold">{(selectedSO.qty || 0).toLocaleString()} T</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">Booking</p>
                        <p className="text-lg font-bold text-blue-600">{(selectedSO.qtyrencana || 0).toLocaleString()} T</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">Realisasi</p>
                        <p className="text-lg font-bold text-emerald-600">{(selectedSO.qtyrealisasi || 0).toLocaleString()} T</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">Sisa Realisasi</p>
                        <p className="text-lg font-bold text-amber-600">{(selectedSO.qtysisaRealisasi || 0).toLocaleString()} T</p>
                      </div>
                    </div>
                  </div>
                  {selectedSO.updatedby && (
                    <div className="text-xs text-gray-400">
                      Diperbarui oleh: <span className="font-medium text-gray-600 dark:text-gray-300">{selectedSO.updatedby}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket History */}
              <div className="border-t dark:border-white/10 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg text-brand-500">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Riwayat Tiket</h3>
                    <p className="text-[10px] text-slate-400">Daftar muatan yang menggunakan SO ini</p>
                  </div>
                  <Link
                    href={`/tiket?posto=${selectedSO?.guid || selectedSO?.noposto}`}
                    className="text-[10px] font-bold text-brand-500 hover:text-brand-600 uppercase tracking-wider flex items-center gap-1 border-b border-brand-500/30 pb-0.5"
                  >
                    Lihat Lengkap
                  </Link>
                </div>
                <div className="rounded-xl border dark:border-white/10 overflow-hidden">
                  <DataTable
                    queryKey={["so-tickets", selectedSO?.guid || selectedSO?.noposto]}
                    fetcher={async (params) => {
                      const guidValue = selectedSO?.guid || selectedSO?.noposto;
                      return apiTable("/api/Tiket/DataTablePeriodeTiket", {
                        draw: params.draw,
                        start: params.start,
                        length: params.length,
                        search: params.search || "",
                        order: [{ column: 1, dir: "desc" }],
                        posto: guidValue,
                        cmd: "refresh",
                        columns: [
                          { data: "action", name: "", searchable: false, orderable: false },
                          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
                          { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
                          { data: "shift", name: "idshift", searchable: true, orderable: true },
                          { data: "nopol", name: "nopol", searchable: true, orderable: true },
                          { data: "driver", name: "driver", searchable: true, orderable: true },
                          { data: "qty", name: "qty", searchable: true, orderable: true },
                        ],
                      });
                    }}
                    rowKey={(r: any) => r.bookingno}
                    columns={[
                      { key: "bookingno", header: "No Booking", render: (r: any) => <span className="font-bold font-mono">{r.bookingno}</span> },
                      { key: "tanggalString", header: "Tanggal", render: (r: any) => <span className="text-xs text-gray-500 font-mono">{r.tanggalString}</span> },
                      { key: "shift", header: "Shift", render: (r: any) => <span className="text-xs">{r.shift}</span> },
                      { key: "nopol", header: "Nopol", render: (r: any) => <Badge color="dark" size="sm" className="font-mono">{r.nopol}</Badge> },
                      { key: "driver", header: "Driver", render: (r: any) => <span className="text-sm">{r.driver}</span> },
                      { key: "qty", header: "Qty", headerClassName: "text-right", className: "text-right", render: (r: any) => <span className="font-bold text-emerald-600">{r.qty?.toLocaleString()}</span> },
                    ]}
                  />
                </div>
              </div>
            </CardContent>
            <CardHeader className="border-t dark:border-white/10 pt-4">
              <Button variant="secondary" className="w-full" onClick={() => setIsViewOpen(false)}>Tutup</Button>
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
