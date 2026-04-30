"use client";
import React, { useState, useEffect, Suspense } from "react";
import { Printer, Truck, User, Phone, Loader2, ArrowLeft, CheckCircle2, AlertCircle, Calendar, Check, Tag, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { TicketActions } from "@/components/ticket/TicketActions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PostoItem {
  NoPOSTO?: string;
  id?: string;
  noposto?: string;
  NamaProduk?: string;
  product?: string;
  ProductName?: string;
  IdProduk?: string;
  productId?: string;
}

interface ArmadaItem {
  Nopol: string;
  AxleName?: string;
  IsVerified?: boolean;
  StatusArmada?: string;
}

function TicketBookingContent() {
  const { data: session } = useSession();
  const { apiJson, apiTable } = useApi();
  const { addToast } = useToast();
  const router = useRouter();
  const companyCode = (session?.user as any)?.companyCode;
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    NoPosto: "",
    Nopol: "",
    DriverName: "",
    DriverPhone: "",
    ProductId: "",
    NoKuota: "",
    Qty: ""
  });

  const postoList: PostoItem[] = []; // Removed redundant query

  const [step, setStep] = useState(1);
  const [selectedPosto, setSelectedPosto] = useState<any>(null);
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

  useEffect(() => {
    const guid = searchParams.get('guid');
    const noposto = searchParams.get('noposto');
    const produk = searchParams.get('produk');

    if (guid) {
      setSelectedPosto({ guid });
      setStep(2);
    }
  }, [searchParams]);


  const { data: postoDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['posto-detail', selectedPosto?.guid],
    queryFn: () => apiTable(`/api/POSTO/DetailData`, {
      guid: selectedPosto?.guid,
      posto: selectedPosto?.guid,
      cmd: 'refresh'
    }),
    enabled: !!selectedPosto?.guid,
    refetchInterval: 10000,
  });

  const postoStats = postoDetails?.response || (postoDetails?.noposto ? postoDetails : {});

  // Use DataPagination or DataPaginationPercepatan based on the percepatan flag
  const { data: armadaPaginationRaw, isLoading: loadingFleet } = useQuery({
    queryKey: ['armada-pagination', selectedPosto?.guid, postoStats.percepatan, debouncedArmadaSearch],
    queryFn: () => {
      const endpoint = postoStats.percepatan == "1"
        ? `/api/Armada/DataPaginationPercepatan`
        : `/api/Armada/DataPagination`;
      return apiJson(`${endpoint}?posto=${selectedPosto?.guid}&start=0&length=100&cmd=refresh&q=${debouncedArmadaSearch}`);
    },
    enabled: !!selectedPosto?.guid && !!postoStats.noposto,
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
      if (!selectedPosto?.noposto) {
        setSelectedPosto(prev => ({ ...prev, noposto: resp.noposto }));
      }
    }
  }, [postoDetails, selectedPosto?.noposto]);

  const bookingMutation = useMutation({
    mutationFn: (payload: any) =>
      apiJson('/api/Tiket/PostData', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Tiket berhasil dibuat.", variant: "success" });
      router.push('/tiket');
    },
    onError: (err: any) => {
      addToast({ title: "Gagal membuat tiket", description: err.message, variant: "destructive" });
    }
  });

  const handlePostoSelect = (row: any) => {
    setSelectedPosto(row);
    setFormData({
      ...formData,
      NoPosto: row.noposto,
      ProductId: row.produk || ""
    });
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step === 2) setStep(1);
              else router.back();
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
              {step === 1 ? "Booking Tiket Antrian" : `Pilih Periode: ${postoStats.noposto || "..."}`}
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              {step === 1
                ? "Terbitkan tiket antrian berdasarkan order POSTO yang Anda miliki."
                : "Pilih shift pemuatan yang tersedia dan lengkapi detail armada."}
            </p>
          </div>
        </div>
        {step === 2 && (
          <Button
            variant="outline"
            className="rounded-xl font-bold uppercase text-[10px] tracking-widest border-gray-200"
            onClick={() => setStep(1)}
          >
            <ArrowLeft className="h-3 w-3 mr-2" /> Ganti Order
          </Button>
        )}
      </div>

      {step === 1 ? (
        /* Step 1: Available POSTO Table */
        <Card className="shadow-theme-xs overflow-hidden border-none bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/40 dark:shadow-none">
          <CardHeader className="border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-brand-500 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-none bg-brand-500 animate-pulse" />
              List Order Tersedia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              queryKey={['available-posto']}
              fetcher={(params) => apiTable('/api/POSTO/AvailableBaru', { ...params, cmd: 'refresh' })}
              rowKey={(row: any) => row.id || row.noposto}
              refetchInterval={10000}
              columns={[
                {
                  key: "number",
                  header: "No",
                  headerClassName: "w-[40px] text-center",
                  render: (_: any, index: number) => (
                    <div className="font-mono text-xs text-gray-400 text-center font-bold">
                      {index + 1}
                    </div>
                  )
                },
                {
                  key: "action",
                  header: "Action",
                  headerClassName: "w-[150px] text-center",
                  render: (row: any) => (
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant={formData.NoPosto === row.noposto ? "default" : "outline"}
                        className="h-8 text-[10px] font-bold px-3 rounded-lg shadow-sm"
                        onClick={() => {
                          const url = `/tiket/booking?guid=${row.guid || row.id}`;
                          window.open(url, '_blank');
                        }}
                      >
                        Pesan Tiket
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[10px] font-bold px-3 border-gray-200 text-gray-400 hover:bg-gray-50 rounded-lg shadow-sm"
                        onClick={() => {
                          window.open(`/posto/print/${row.guid || row.id}`, '_blank');
                        }}
                      >
                        <Printer className="h-3 w-3 mr-1" /> Print
                      </Button>
                    </div>
                  )
                },
                {
                  key: "plant",
                  header: "Plant",
                  render: (row: any) => (
                    <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight whitespace-nowrap">
                      {row.plant}
                    </div>
                  )
                },
                // {
                //   key: "wilayah",
                //   header: "Wilayah",
                //   render: (row: any) => (
                //     <div className="font-bold text-gray-500 font-mono text-xs uppercase whitespace-nowrap bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                //       {row.wilayah || "-"}
                //     </div>
                //   )
                // },
                {
                  key: "tanggalString",
                  header: "Tanggal",
                  render: (row: any) => (
                    <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight whitespace-nowrap">
                      {row.tanggalString}
                    </div>
                  )
                },
                {
                  key: "noposto",
                  header: "No POSTO",
                  render: (row: any) => (
                    <div className="flex flex-col">
                      <div className="font-bold text-brand-600 dark:text-brand-400 font-mono text-sm tracking-tight">
                        {row.noposto}
                      </div>
                      {row.charter === "1" && (
                        <div className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                          <Tag className="h-2 w-2" /> Charter
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: "tglakhirString",
                  header: "Exp",
                  render: (row: any) => (
                    <div className="font-bold text-rose-500 font-mono text-xs whitespace-nowrap">
                      {row.tglakhirString}
                    </div>
                  )
                },
                {
                  key: "tujuanString",
                  header: "Tujuan",
                  render: (row: any) => (
                    <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight uppercase max-w-[200px] truncate" title={row.tujuanString}>
                      {row.tujuanString}
                    </div>
                  )
                },
                {
                  key: "transportString",
                  header: "Transport",
                  render: (row: any) => (
                    <div className="font-bold text-gray-500 font-mono text-xs uppercase whitespace-nowrap bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                      {row.transportString || "-"}
                    </div>
                  )
                },
                {
                  key: "produkString",
                  header: "Produk",
                  render: (row: any) => (
                    <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight uppercase whitespace-nowrap">
                      {row.produkString}
                    </div>
                  )
                },
                {
                  key: "qty",
                  header: "Qty",
                  headerClassName: "text-right",
                  className: "text-right",
                  render: (row: any) => (
                    <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
                      {row.qty?.toLocaleString()}
                    </div>
                  )
                },
                {
                  key: "qtyrencana",
                  header: "Qty Pesan",
                  headerClassName: "text-right",
                  className: "text-right",
                  render: (row: any) => (
                    <div className="font-bold text-amber-600 font-mono text-sm tracking-tight">
                      {row.qtyrencana?.toLocaleString()}
                    </div>
                  )
                },
                {
                  key: "qtysisaBooking",
                  header: "Qty Sisa",
                  headerClassName: "text-right",
                  className: "text-right",
                  render: (row: any) => (
                    <div className="font-bold text-emerald-600 font-mono text-sm tracking-tight">
                      {row.qtysisaBooking?.toLocaleString()}
                    </div>
                  )
                },
                {
                  key: "gruptruk",
                  header: "Grup Truk",
                  render: (row: any) => {
                    const getGrupTrukName = (id: number) => {
                      switch (id) {
                        case 1: return "Colt Diesel (CDD)";
                        case 2: return "Engkel/Fuso";
                        case 3: return "Trintin";
                        case 4: return "Tronton";
                        case 5: return "Gandengan";
                        case 6: return "Trinton";
                        case 7: return "Trintin Gandengan";
                        case 8:
                        case 9: return "Trailler 20 Ft";
                        case 10:
                        case 11: return "Trailler 40 Ft";
                        default: return row.gruptruk || "All Grup";
                      }
                    };
                    return (
                      <div className="font-bold text-gray-400 font-mono text-[10px] whitespace-nowrap uppercase">
                        {getGrupTrukName(row.IdGrupTruk)}
                      </div>
                    );
                  }
                },
                {
                  key: "tanggaljatuhtempoString",
                  header: "Jatuh Tempo",
                  render: (row: any) => (
                    <div className="font-bold text-gray-400 font-mono text-xs whitespace-nowrap">
                      {row.tanggaljatuhtempoString || "-"}
                    </div>
                  )
                }
              ]}
              rowClassName={(row: any) => {
                if (row.tanggaljatuhtempoString) {
                  const dateNow = new Date();
                  const dateJapo = new Date(row.tgljatuhtempo);
                  if (dateNow > dateJapo) {
                    return "bg-[#e9805f] text-white hover:bg-[#e9805f]/90";
                  }
                }
                return "";
              }}
            />
          </CardContent>
        </Card>
      ) : (
        /* Step 2: Pilih Periode Step */
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
                  onClick={() => router.push('/tiket')}
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">            {/* Total Tonase */}
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

            {/* Booking / Realisasi */}
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

            {/* Sisa Kuota */}
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

            {/* Progress Card */}
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
                    queryKey={['shift-quota', selectedPosto?.guid]}
                    fetcher={(params) => apiTable(`/api/KuotaLevel4/PilihPeriodeData`, { ...params, posto: selectedPosto?.guid, cmd: 'refresh' })}
                    rowKey={(row: any) => row.tanggalString}
                    refetchInterval={10000}
                    borderless={true}
                    striped={true}
                    columns={[
                      {
                        key: "tanggalString",
                        header: "Tanggal",
                        headerClassName: "text-center bg-gray-50/50 dark:bg-white/[0.02] py-6",
                        render: (row: any) => (
                          <div className="flex flex-col items-center py-4">
                            <div className="font-black text-gray-900 dark:text-white font-mono text-base tracking-tighter">{row.tanggalString}</div>
                            {row.hari && <div className="text-[10px] font-black text-brand-500 uppercase tracking-[0.25em] mt-1">{row.hari}</div>}
                          </div>
                        )
                      },
                      {
                        key: "action1",
                        header: "Shift 1",
                        headerClassName: "text-center bg-gray-50/50 dark:bg-white/[0.02] py-6",
                        render: (row: any) => {
                          const match = row.action1?.match(/pilihItemProcess\('([^']+)'\)/);
                          const id = match ? match[1] : null;
                          const kuota = row.kuota1 ?? 0;
                          return (
                            <div className="flex flex-col items-center gap-3 py-4">
                              <div className="px-4 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-500/10">
                                <span className="text-[11px] font-black text-brand-600">{kuota.toLocaleString()} TON</span>
                              </div>
                              <Button
                                size="sm"
                                variant={kuota > 0 ? "default" : "outline"}
                                disabled={!id || kuota <= 0 || loadingShiftDetail}
                                className={`h-10 text-[10px] font-black uppercase tracking-widest px-8 rounded-xl shadow-xl transition-all ${kuota > 0 ? 'bg-[#003473] hover:bg-[#002855] text-white hover:scale-105 active:scale-95' : 'opacity-50'}`}
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
                        headerClassName: "text-center bg-gray-50/50 dark:bg-white/[0.02] py-6",
                        render: (row: any) => {
                          const match = row.action2?.match(/pilihItemProcess\('([^']+)'\)/);
                          const id = match ? match[1] : null;
                          const kuota = row.kuota2 ?? 0;
                          return (
                            <div className="flex flex-col items-center gap-3 py-4">
                              <div className="px-4 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-500/10">
                                <span className="text-[11px] font-black text-brand-600">{kuota.toLocaleString()} TON</span>
                              </div>
                              <Button
                                size="sm"
                                variant={kuota > 0 ? "default" : "outline"}
                                disabled={!id || kuota <= 0 || loadingShiftDetail}
                                className={`h-10 text-[10px] font-black uppercase tracking-widest px-8 rounded-xl shadow-xl transition-all ${kuota > 0 ? 'bg-[#003473] hover:bg-[#002855] text-white hover:scale-105 active:scale-95' : 'opacity-50'}`}
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
                        headerClassName: "text-center bg-gray-50/50 dark:bg-white/[0.02] py-6",
                        render: (row: any) => {
                          const match = row.action3?.match(/pilihItemProcess\('([^']+)'\)/);
                          const id = match ? match[1] : null;
                          const kuota = row.kuota3 ?? 0;
                          return (
                            <div className="flex flex-col items-center gap-3 py-4">
                              <div className="px-4 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-500/10">
                                <span className="text-[11px] font-black text-brand-600">{kuota.toLocaleString()} TON</span>
                              </div>
                              <Button
                                size="sm"
                                variant={kuota > 0 ? "default" : "outline"}
                                disabled={!id || kuota <= 0 || loadingShiftDetail}
                                className={`h-10 text-[10px] font-black uppercase tracking-widest px-8 rounded-xl shadow-xl transition-all ${kuota > 0 ? 'bg-[#003473] hover:bg-[#002855] text-white hover:scale-105 active:scale-95' : 'opacity-50'}`}
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

            {/* Tiket Saya Section - Now below Jadwal */}
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
                    queryKey={['posto-tickets', selectedPosto?.guid]}
                    fetcher={(params) => {
                      const payload: any = {
                        draw: params.draw,
                        start: params.start,
                        length: params.length,
                        search: params.search || "",
                        order: params.order?.length ? params.order : [{ column: 1, dir: "desc" }], // Default to Booking No desc
                        posto: selectedPosto?.guid,
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
                            {/* Native Next.js Actions */}
                            <TicketActions bookingNo={row.bookingno} />

                            {/* Legacy Actions (if any) */}
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
                {/* Executive Info Grid */}
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
                        {/* Backdrop to close dropdown */}
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
                      bookingMutation.mutate(formData);
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
      )}
    </div>
  );
}

function TicketIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9V5.2a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2V9a2 2 0 0 0 0 6v3.8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V15a2 2 0 0 0 0-6z" />
      <path d="M15 3v18" />
      <path d="M8 3v18" />
    </svg>
  );
}

export default function TicketBookingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    }>
      <TicketBookingContent />
    </Suspense>
  );
}
