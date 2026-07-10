"use client";
import React, { useState, useEffect } from "react";
import { Truck, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Calendar, Tag, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { TicketActions } from "@/components/ticket/TicketActions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ArmadaItem {
  Nopol: string;
  AxleName?: string;
  IsVerified?: boolean;
  StatusArmada?: string;
}

interface TicketBookingDetailProps {
  guid: string;
}

export function TicketBookingDetail({ guid }: TicketBookingDetailProps) {
  const { apiJson, apiTable } = useApi();
  const { addToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [resolvedNoposto, setResolvedNoposto] = useState<string | undefined>(undefined);

  const [formData, setFormData] = useState({
    NoPosto: "",
    Nopol: "",
    DriverName: "",
    DriverPhone: "",
    ProductId: "",
    NoKuota: "",
    Qty: ""
  });

  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedShiftDetail, setSelectedShiftDetail] = useState<any>(null);
  const [loadingShiftDetail, setLoadingShiftDetail] = useState(false);
  const [armadaSearch, setArmadaSearch] = useState("");
  const [debouncedArmadaSearch, setDebouncedArmadaSearch] = useState("");
  const [isArmadaDropdownOpen, setIsArmadaDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedArmadaSearch(armadaSearch), 300);
    return () => clearTimeout(timer);
  }, [armadaSearch]);

  const { data: postoDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['posto-detail', guid],
    queryFn: () => apiTable(`/api/POSTO/DetailData`, {
      guid: guid,
      noposto: resolvedNoposto || guid,
      cmd: 'refresh'
    }),
    enabled: !!guid,
    refetchInterval: 10000,
  });

  const postoStats = postoDetails?.response || (postoDetails?.noposto ? postoDetails : {});

  const { data: armadaPaginationRaw, isLoading: loadingFleet } = useQuery({
    queryKey: ['armada-pagination', guid, postoStats.percepatan, debouncedArmadaSearch],
    queryFn: () => {
      const endpoint = postoStats.percepatan == "1"
        ? `/api/Armada/DataPaginationPercepatan`
        : `/api/Armada/DataPagination`;
      return apiJson(`${endpoint}?posto=${guid}&start=0&length=100&cmd=refresh&q=${debouncedArmadaSearch}`);
    },
    enabled: !!guid && !!postoStats.noposto,
    refetchInterval: 10000,
  });

  const verifiedFleet = Array.isArray(armadaPaginationRaw?.data)
    ? armadaPaginationRaw.data.map((f: any) => ({
      Nopol: f.nopol,
      AxleName: f.idsumbuString
    }))
    : [];

  const fetchShiftDetail = async (id: string, tanggal: string, shift: string) => {
    setLoadingShiftDetail(true);
    try {
      const rv = await apiTable('/api/KuotaLevel4/DetailData', { guid: id });
      const resp = rv.response || (rv.namaproduk ? rv : null);
      if (resp) {
        if (resp.sisakuota <= 0) {
          addToast({ title: "Kuota tidak mencukupi / habis", variant: "destructive" });
          return;
        }
        setSelectedShiftDetail(resp);
        setFormData(prev => ({ ...prev, NoKuota: resp.id, Qty: "" }));
        setSelectedSlot({ tanggal, shift });
        setIsBookingModalOpen(true);
      }
    } catch (err) {
      addToast({ title: "Gagal memuat detail shift", variant: "destructive" });
    } finally {
      setLoadingShiftDetail(false);
    }
  };

  useEffect(() => {
    const resp = postoDetails?.response || (postoDetails?.noposto ? postoDetails : null);
    if (resp) {
      setFormData(prev => ({
        ...prev,
        NoPosto: resp.noposto,
        ProductId: resp.produk || ""
      }));
      if (!resolvedNoposto) {
        setResolvedNoposto(resp.noposto);
      }
    }
  }, [postoDetails, resolvedNoposto]);

  const bookingMutation = useMutation({
    mutationFn: (payload: { posto: string; nopol: string; driver: string; qty: number; tiketno: string }) =>
      apiJson('/api/Tiket/PostData', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Tiket berhasil dibuat.", variant: "success" });
      setIsBookingModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['posto-tickets', guid] });
      queryClient.invalidateQueries({ queryKey: ['shift-quota', guid] });
      queryClient.invalidateQueries({ queryKey: ['posto-detail', guid] });
    },
    onError: (err: any) => {
      addToast({ title: "Gagal membuat tiket", description: err.message, variant: "destructive" });
    }
  });

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Hero / Header Section */}
      <div className="relative overflow-hidden rounded-none bg-gradient-to-br from-[#003473] to-[#001e42] p-10 md:p-14 text-white shadow-2xl shadow-brand-900/20">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-none bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-none bg-brand-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-white/10 border border-white/10 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.2em]">
              <div className="h-1.5 w-1.5 rounded-none bg-emerald-400 animate-pulse" />
              Pemesanan Tiket Aktif
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
              {postoStats.noposto || "..."}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-bold text-white/60 uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-brand-300" />
                {postoStats.produkString || "Memuat Produk..."}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-300" />
                {postoStats.tanggalString || "..."}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/tiket/booking')}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest transition-all"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke List POSTO
            </Button>
            <div className="h-12 w-[1px] bg-white/10 hidden md:block" />
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Rute Pengiriman</p>
              <p className="text-sm font-black text-white">{postoStats.asalString} → {postoStats.tujuanString}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="ring-0 border-0 shadow-2xl shadow-gray-200/30 dark:shadow-none bg-white dark:bg-gray-900 overflow-hidden relative group hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-none bg-brand-50 dark:bg-brand-500/10 text-brand-600">
                <Truck className="h-5 w-5" />
              </div>
              <div className="h-1.5 w-8 rounded-none bg-[#003473]" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">TOTAL TONASE</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                {postoStats.qty?.toLocaleString() || "-"}
              </h2>
              <span className="text-xs font-bold text-gray-400">TON</span>
            </div>
            <p className="text-[9px] font-bold text-gray-400 mt-6 uppercase tracking-widest flex items-center gap-1.5 opacity-40">
              <Tag className="h-2.5 w-2.5" /> ID: {postoStats.noposto}
            </p>
          </CardContent>
        </Card>

        <Card className="ring-0 border-0 shadow-2xl shadow-gray-200/30 dark:shadow-none bg-white dark:bg-gray-900 overflow-hidden relative group hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="h-1.5 w-8 rounded-xl bg-emerald-500" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">BOOKING / REALISASI</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-emerald-600 tracking-tighter">
                {postoStats.qtyrencana || 0}
              </h2>
              <span className="text-xs font-bold text-gray-400">/ {postoStats.qtyrealisasi || 0} TON</span>
            </div>
            <p className="text-[9px] font-bold text-gray-400 mt-6 uppercase tracking-widest opacity-40">
              Total muatan periode ini
            </p>
          </CardContent>
        </Card>

        <Card className="ring-0 border-0 shadow-2xl shadow-gray-200/30 dark:shadow-none bg-white dark:bg-gray-900 overflow-hidden relative group hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="h-1.5 w-8 rounded-xl bg-rose-500" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">SISA KUOTA</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-rose-600 tracking-tighter">
                {postoStats.qtysisaBooking || 0}
              </h2>
              <span className="text-xs font-bold text-gray-400">TON</span>
            </div>
            <p className="text-[9px] font-bold text-gray-400 mt-6 uppercase tracking-widest opacity-40">
              Slot tersedia untuk booking
            </p>
          </CardContent>
        </Card>

        <Card className="ring-0 border-0 shadow-2xl shadow-gray-200/30 dark:shadow-none bg-white dark:bg-gray-900 overflow-hidden relative group hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="p-8">
            <div className="flex justify-between items-center mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">PROGRESS MUAT</p>
              <span className="text-xl font-black text-brand-600 tracking-tighter">
                {(postoStats.prosentase || 0).toFixed(2)}%
              </span>
            </div>

            <div className="space-y-4">
              <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#003473] to-brand-500 transition-all duration-1000 ease-out"
                  style={{ width: `${postoStats.prosentase || 0}%` }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase truncate">
                  {postoStats.produkString}
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{postoStats.tanggalString}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-12">
        {/* Jadwal Pemuatan Card */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-[#003473] rounded-xl" />
              <div>
                <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Jadwal Pemuatan</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pilih shift muat yang tersedia</p>
              </div>
            </div>
          </div>

          <Card className="ring-0 border-0 shadow-3xl shadow-gray-200/50 dark:shadow-none bg-white dark:bg-gray-900 overflow-hidden rounded-xl">
            <CardContent className="p-0">
              <DataTable
                queryKey={['shift-quota', guid]}
                fetcher={(params) => apiTable(`/api/KuotaLevel4/PilihPeriodeData`, { ...params, posto: guid, cmd: 'refresh' })}
                rowKey={(row: any) => row.tanggalString}
                refetchInterval={10000}
                borderless={true}
                striped={true}
                columns={[
                  {
                    key: "tanggalString",
                    header: "Tanggal",
                    headerClassName: "text-center bg-gray-50/50 dark:bg-white/[0.02] py-3 text-sm",
                    render: (row: any) => (
                      <div className="flex flex-col items-center py-2">
                        <div className="font-black text-gray-900 dark:text-white font-mono text-sm tracking-tighter">{row.tanggalString}</div>
                        {row.hari && <div className="text-[9px] font-black text-brand-500 uppercase tracking-[0.25em] mt-0.5">{row.hari}</div>}
                      </div>
                    )
                  },
                  {
                    key: "action1",
                    header: "Shift 1",
                    headerClassName: "text-center bg-gray-50/50 dark:bg-white/[0.02] py-3 text-sm",
                    render: (row: any) => {
                      const match = row.action1?.match(/pilihItemProcess\('([^']+)'\)/);
                      const id = match ? match[1] : null;
                      const kuota = row.kuota1 ?? 0;
                      return (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <div className="px-3 py-1 rounded-lg bg-brand-50 dark:bg-brand-500/10">
                            <span className="text-[10px] font-black text-brand-600">{kuota.toLocaleString()} TON</span>
                          </div>
                          <Button
                            size="sm"
                            variant={kuota > 0 ? "default" : "outline"}
                            disabled={!id || kuota <= 0 || loadingShiftDetail}
                            className={`h-8 text-[9px] font-black uppercase tracking-widest px-4 rounded-lg shadow-md transition-all ${kuota > 0 ? 'bg-[#003473] hover:bg-[#002855] text-white hover:scale-105 active:scale-95' : 'opacity-50'}`}
                            onClick={() => id && fetchShiftDetail(id, row.tanggalString, "1")}
                          >
                            {loadingShiftDetail && selectedSlot?.tanggal === row.tanggalString && selectedSlot?.shift === "1" ? (
                              <Loader2 className="h-3 w-3 animate-spin text-white" />
                            ) : kuota > 0 ? "Pesan" : "Kosong"}
                          </Button>
                        </div>
                      );
                    }
                  },
                  {
                    key: "action2",
                    header: "Shift 2",
                    headerClassName: "text-center bg-gray-50/50 dark:bg-white/[0.02] py-3 text-sm",
                    render: (row: any) => {
                      const match = row.action2?.match(/pilihItemProcess\('([^']+)'\)/);
                      const id = match ? match[1] : null;
                      const kuota = row.kuota2 ?? 0;
                      return (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <div className="px-3 py-1 rounded-lg bg-brand-50 dark:bg-brand-500/10">
                            <span className="text-[10px] font-black text-brand-600">{kuota.toLocaleString()} TON</span>
                          </div>
                          <Button
                            size="sm"
                            variant={kuota > 0 ? "default" : "outline"}
                            disabled={!id || kuota <= 0 || loadingShiftDetail}
                            className={`h-8 text-[9px] font-black uppercase tracking-widest px-4 rounded-lg shadow-md transition-all ${kuota > 0 ? 'bg-[#003473] hover:bg-[#002855] text-white hover:scale-105 active:scale-95' : 'opacity-50'}`}
                            onClick={() => id && fetchShiftDetail(id, row.tanggalString, "2")}
                          >
                            {loadingShiftDetail && selectedSlot?.tanggal === row.tanggalString && selectedSlot?.shift === "2" ? (
                              <Loader2 className="h-3 w-3 animate-spin text-white" />
                            ) : kuota > 0 ? "Pesan" : "Kosong"}
                          </Button>
                        </div>
                      );
                    }
                  },
                  {
                    key: "action3",
                    header: "Shift 3",
                    headerClassName: "text-center bg-gray-50/50 dark:bg-white/[0.02] py-3 text-sm",
                    render: (row: any) => {
                      const match = row.action3?.match(/pilihItemProcess\('([^']+)'\)/);
                      const id = match ? match[1] : null;
                      const kuota = row.kuota3 ?? 0;
                      return (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <div className="px-3 py-1 rounded-lg bg-brand-50 dark:bg-brand-500/10">
                            <span className="text-[10px] font-black text-brand-600">{kuota.toLocaleString()} TON</span>
                          </div>
                          <Button
                            size="sm"
                            variant={kuota > 0 ? "default" : "outline"}
                            disabled={!id || kuota <= 0 || loadingShiftDetail}
                            className={`h-8 text-[9px] font-black uppercase tracking-widest px-4 rounded-lg shadow-md transition-all ${kuota > 0 ? 'bg-[#003473] hover:bg-[#002855] text-white hover:scale-105 active:scale-95' : 'opacity-50'}`}
                            onClick={() => id && fetchShiftDetail(id, row.tanggalString, "3")}
                          >
                            {loadingShiftDetail && selectedSlot?.tanggal === row.tanggalString && selectedSlot?.shift === "3" ? (
                              <Loader2 className="h-3 w-3 animate-spin text-white" />
                            ) : kuota > 0 ? "Pesan" : "Kosong"}
                          </Button>
                        </div>
                      );
                    }
                  }
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Tiket Saya Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-emerald-500 rounded-xl" />
              <div>
                <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Riwayat Tiket</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Status tiket terbaru</p>
              </div>
            </div>
          </div>
          <Card className="ring-0 border-0 shadow-3xl shadow-gray-200/50 dark:shadow-none bg-white dark:bg-gray-900 overflow-hidden rounded-xl">
            <CardContent className="p-0">
              <DataTable
                queryKey={['posto-tickets', guid]}
                fetcher={(params) => {
                  const p = params as any;
                  const payload: any = {
                    draw: p.draw,
                    start: p.start,
                    length: p.length,
                    search: p.search || "",
                    order: p.order?.length ? p.order : [{ column: 1, dir: "desc" }],
                    posto: guid,
                    cmd: 'refresh',
                    columns: [
                      { data: "action", name: "", searchable: false, orderable: false },
                      { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
                      { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
                      { data: "shift", name: "idshift", searchable: true, orderable: true },
                      { data: "nopol", name: "nopol", searchable: true, orderable: true },
                      { data: "driver", name: "driver", searchable: true, orderable: true },
                      { data: "qty", name: "qty", searchable: true, orderable: true },
                      { data: "updatedonString", name: "updatedon", searchable: true, orderable: true },
                      { data: "statuspemuatan", name: "statuspemuatan", searchable: false, orderable: false },
                      { data: "position", name: "position", searchable: false, orderable: false },
                      { data: "posto", name: "posto", searchable: false, orderable: false }
                    ]
                  };
                  return apiTable(`/api/Tiket/DataTablePeriodeTiket`, payload);
                }}
                rowKey={(row: any) => row.bookingno}
                refetchInterval={10000}
                borderless={true}
                striped={true}
                columns={[
                  {
                    key: "Action",
                    header: "Aksi",
                    headerClassName: "bg-gray-50/50 dark:bg-white/[0.02] py-6 text-center",
                    render: (row: any) => (
                      <div className="flex justify-center gap-3 py-2">
                      <TicketActions
                          bookingNo={row.bookingno}
                          statuspemuatan={row.statuspemuatan}
                          position={row.position}
                          currentNopol={row.nopol}
                          currentDriver={row.driver}
                          posto={row.posto || guid}
                          showDelete={true}
                        />
                        {row.Action && row.Action !== "-" && (
                          <div
                            className="flex gap-2 opacity-50 hover:opacity-100 transition-opacity"
                            dangerouslySetInnerHTML={{ __html: row.Action }}
                          />
                        )}
                      </div>
                    )
                  },
                  {
                    key: "bookingno",
                    header: "No. Booking",
                    headerClassName: "bg-gray-50/50 dark:bg-white/[0.02] py-6",
                    sortColumn: 1,
                    render: (row: any) => (
                      <div className="font-black text-brand-600 font-mono text-sm tracking-tighter">
                        {row.bookingno}
                      </div>
                    )
                  },
                  {
                    key: "tanggalString",
                    header: "Tanggal Muat",
                    headerClassName: "bg-gray-50/50 dark:bg-white/[0.02] py-6",
                    sortColumn: 2,
                    render: (row: any) => (
                      <div className="text-sm font-bold text-gray-600 dark:text-gray-400">
                        {row.tanggalString}
                      </div>
                    )
                  },
                  {
                    key: "shift",
                    header: "Shift",
                    headerClassName: "bg-gray-50/50 dark:bg-white/[0.02] py-6 text-center",
                    sortColumn: 3,
                    render: (row: any) => (
                      <div className="text-center font-black text-gray-900 dark:text-white">
                        {row.shift}
                      </div>
                    )
                  },
                  {
                    key: "nopol",
                    header: "Nopol",
                    headerClassName: "bg-gray-50/50 dark:bg-white/[0.02] py-6",
                    sortColumn: 4,
                    render: (row: any) => (
                      <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        {row.nopol}
                      </div>
                    )
                  },
                  {
                    key: "driver",
                    header: "Driver",
                    headerClassName: "bg-gray-50/50 dark:bg-white/[0.02] py-6",
                    sortColumn: 5,
                    render: (row: any) => (
                      <div className="text-sm font-bold text-gray-500 uppercase truncate max-w-[150px]">
                        {row.driver || "-"}
                      </div>
                    )
                  },
                  {
                    key: "qty",
                    header: "Qty",
                    headerClassName: "bg-gray-50/50 dark:bg-white/[0.02] py-6 text-right",
                    sortColumn: 6,
                    render: (row: any) => (
                      <div className="text-right font-black text-brand-600">
                        {row.qty} <span className="text-[9px] text-gray-400">TON</span>
                      </div>
                    )
                  },
                  {
                    key: "updatedonString",
                    header: "Tanggal Pesan",
                    headerClassName: "bg-gray-50/50 dark:bg-white/[0.02] py-6",
                    sortColumn: 7,
                    render: (row: any) => (
                      <div className="text-sm font-medium text-gray-400">
                        {row.updatedonString}
                      </div>
                    )
                  },
                  {
                    key: "positionString",
                    header: "Status",
                    headerClassName: "bg-gray-50/50 dark:bg-white/[0.02] py-6 text-right",
                    render: (row: any) => (
                      <div className="flex justify-end">
                        <div className="px-3 py-1 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest">
                          {row.positionString}
                        </div>
                      </div>
                    )
                  }
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Modal */}
      <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-none">
          <DialogHeader className="p-8 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
              Form Pemesanan Kuota
            </DialogTitle>
            <DialogDescription className="hidden" />
          </DialogHeader>

          <div className="p-8 space-y-8 bg-white dark:bg-gray-900">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PRODUK</p>
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate" title={selectedShiftDetail?.namaproduk}>
                  {selectedShiftDetail?.namaproduk || "..."}
                </p>
              </div>
              <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">TANGGAL</p>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {selectedShiftDetail?.tanggalString || "..."}
                </p>
              </div>
              <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">SHIFT</p>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {selectedShiftDetail?.shift || "..."}
                </p>
              </div>
              <div className="border-b border-rose-100 dark:border-rose-900 pb-2">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">SISA KUOTA</p>
                <p className="text-xs font-black text-rose-600 flex items-baseline gap-1">
                  {selectedShiftDetail?.sisakuota || 0} <span className="text-[8px] font-bold">TON</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  NO PLAT TRUK :
                </label>
                {postoStats.poso === "PO" && (postoStats.wilayah2 === "DW1_GP" || postoStats.wilayah2 === "DW2_INBAG") ? (
                  <div className="relative">
                    <div
                      className="w-full h-11 px-4 rounded-none font-bold bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer group hover:border-brand-500 transition-all"
                      onClick={() => setIsArmadaDropdownOpen(!isArmadaDropdownOpen)}
                    >
                      <span className={formData.Nopol ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                        {formData.Nopol || "Pilih Armada..."}
                      </span>
                      <Search className="h-4 w-4 text-gray-400 group-hover:text-brand-500" />
                    </div>

                    {isArmadaDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-none shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                          <Input
                            placeholder="Cari Plat No..."
                            value={armadaSearch}
                            onChange={(e) => setArmadaSearch(e.target.value.toUpperCase())}
                            className="h-9 bg-gray-50 dark:bg-gray-800 border-none font-bold"
                            autoFocus
                          />
                        </div>
                        <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
                          {loadingFleet ? (
                            <div className="p-4 text-center">
                              <Loader2 className="h-5 w-5 animate-spin text-brand-500 mx-auto" />
                            </div>
                          ) : verifiedFleet.length === 0 ? (
                            <p className="p-4 text-center text-xs font-bold text-gray-400 uppercase">Tidak ada data</p>
                          ) : (
                            verifiedFleet.map((a: any) => (
                              <div
                                key={a.Nopol}
                                className="p-3 rounded-none hover:bg-brand-50 dark:hover:bg-brand-500/10 cursor-pointer transition-colors group"
                                onClick={() => {
                                  setFormData({ ...formData, Nopol: a.Nopol });
                                  setIsArmadaDropdownOpen(false);
                                  setArmadaSearch("");
                                }}
                              >
                                <p className="text-xs font-black text-gray-900 dark:text-white group-hover:text-brand-600 uppercase">
                                  {a.Nopol}
                                </p>
                                {a.AxleName && (
                                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                    {a.AxleName}
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {isArmadaDropdownOpen && (
                      <div
                        className="fixed inset-0 z-[90]"
                        onClick={() => setIsArmadaDropdownOpen(false)}
                      />
                    )}
                  </div>
                ) : (
                  <Input
                    placeholder="Masukkan Plat No..."
                    value={formData.Nopol}
                    onChange={(e) => setFormData({ ...formData, Nopol: e.target.value.toUpperCase() })}
                    className="rounded-none font-bold h-11 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"
                  />
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  NAMA PENGEMUDI :
                </label>
                <Input
                  placeholder="Nama Driver..."
                  value={formData.DriverName}
                  onChange={(e) => setFormData({ ...formData, DriverName: e.target.value })}
                  className="rounded-none font-bold h-11 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  TONASE (TON) :
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={formData.Qty}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && parseFloat(val) < 0) return;
                    setFormData({ ...formData, Qty: val });
                  }}
                  className="rounded-none font-black h-11 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"
                />
              </div>
            </div>

            <div className="pt-8 flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setIsBookingModalOpen(false)}
                className="rounded-none px-6 font-bold uppercase text-[10px] tracking-widest h-12"
              >
                Batal
              </Button>
              <Button
                className="bg-[#003473] hover:bg-[#002855] text-white h-12 px-8 rounded-none text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                onClick={() => {
                  if (!formData.Nopol || !formData.DriverName || !formData.Qty) return;
                  bookingMutation.mutate({
                    posto: guid,
                    nopol: formData.Nopol,
                    driver: formData.DriverName,
                    qty: parseFloat(formData.Qty),
                    tiketno: String(formData.NoKuota),
                  });
                }}
                disabled={bookingMutation.isPending || !formData.Nopol || !formData.DriverName || !formData.Qty}
              >
                {bookingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  "Simpan Pemesanan"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
