# Tiket Booking Detail Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/tiket/booking?guid=...` a real, bookmarkable, browser-back-friendly detail page (`/tiket/booking/[guid]`), and fix the "Kembali" button inside it that currently sends users to the wrong page — so users can always get back to the list of available POSTO to book a different one.

**Root cause (diagnosis for the reported bug):**

1. **"Booking tiket posto tidak tersedia dihalaman tiket"** — this is by design, not a bug: the "Booking Baru" / "Booking" buttons that lead into this flow are gated to `transport`/`rekanan` roles (`src/app/tiket/page.tsx:238`, `src/app/posto/page.tsx:215`, `src/app/posto/so/page.tsx:300`). If the logged-in session's role doesn't normalize to `transport` or `rekanan` (see `src/lib/role-utils.ts:34-36`), the button is intentionally hidden. No code change needed for this part.
2. **"Halaman ini tidak ada pagenya" / can't go back to see other POSTO** — this **is** a real bug. `src/app/tiket/booking/page.tsx` is a single client component that handles both "pick a POSTO" (step 1) and "POSTO detail / book a slot" (step 2) via a `?guid=` query string and `useState` step toggle — there is no dedicated route for the detail view. Worse, the detail view's own **"Kembali" button sends the user to `/tiket` (`router.push('/tiket')` at `src/app/tiket/booking/page.tsx:473`) — the "Daftar Tiket Saya" (my tickets) history page, not back to the list of bookable POSTO**. Anyone who opens a `?guid=` link directly (e.g. from the `/posto` or `/posto/so` "Booking" button, or a shared link) lands straight on step 2, and the only visible "back" affordance takes them to an unrelated page — exactly the "can't back to see other posto" symptom reported.
   A secondary bug: `src/app/posto/so/page.tsx:304` links to `/tiket/booking?noposto=...`, but `src/app/tiket/booking/page.tsx`'s query-param effect only ever checks `guid` (`if (guid) { ... }` at line 82) — the `noposto`-only entry point is silently ignored and the page just shows step 1, never resolving that POSTO. This plan fixes it as a side effect of using one unified route param that the backend already accepts as either identifier.

**Architecture:** Split the current single page into a list page (`/tiket/booking`, step 1 only) and a dynamic detail route (`/tiket/booking/[guid]`, step 2 content extracted into a reusable client component). The ASP.NET `POSTO/DetailData` endpoint already matches `x.noposto == param.noposto || x.guid == param.guid` (`sistropigroup/SISTROAWESOME/api/POSTOController.cs:558`), so the same route param value can be sent as both `guid` and `noposto` — this works whether the link was built from a real guid or a `noposto` string, fixing both entry points with one dynamic segment.

**Tech Stack:** Next.js 16 App Router (async `params`), React Query (`@tanstack/react-query`), existing `useApi`/`DataTable`/`ui` component library. No test framework is configured in this repo (no `vitest`/`playwright`/`*.test.ts*` files exist) — verification is manual via `npm run dev`, matching how every other page in this codebase is validated.

---

### Task 1: Extract the POSTO detail/booking view into its own client component

**Files:**
- Create: `src/components/ticket/TicketBookingDetail.tsx`

- [ ] **Step 1: Create the component**

This is the existing "step 2" JSX and logic from `src/app/tiket/booking/page.tsx`, adapted to take `guid` as a prop instead of reading it from `useSearchParams()`/client state, with the `noposto` fallback tracked in local state instead of mutating a `selectedPosto` object, and with the "Kembali" button fixed to return to the POSTO list instead of the unrelated ticket-history page. Dead code from the original file (`postoList`, `handlePostoSelect`, unused icon imports) is dropped.

```tsx
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
                        <TicketActions
                          bookingNo={row.bookingno}
                          status={row.position || "00"}
                          currentNopol={row.nopol}
                          currentDriver={row.driver}
                          postoGuid={row.posto || guid}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ticket/TicketBookingDetail.tsx
git commit -m "refactor: extract POSTO booking detail view into TicketBookingDetail component"
```

---

### Task 2: Add the `/tiket/booking/[guid]` dynamic route

**Files:**
- Create: `src/app/tiket/booking/[guid]/page.tsx`

- [ ] **Step 1: Create the route page**

Matches the async-`params` pattern already used in this codebase at `src/app/tiket/print/[id]/page.tsx`.

```tsx
import { TicketBookingDetail } from "@/components/ticket/TicketBookingDetail";

interface TicketBookingDetailPageProps {
  params: Promise<{ guid: string }>;
}

export default async function TicketBookingDetailPage({ params }: TicketBookingDetailPageProps) {
  const { guid } = await params;
  return <TicketBookingDetail guid={guid} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/tiket/booking/[guid]/page.tsx"
git commit -m "feat: add dedicated /tiket/booking/[guid] detail route"
```

---

### Task 3: Reduce `/tiket/booking` to the POSTO list only

**Files:**
- Modify: `src/app/tiket/booking/page.tsx` (full rewrite — replaces the current 1082-line file)

- [ ] **Step 1: Replace the file contents**

Removes the step-2 state/queries/dialog (now living in `TicketBookingDetail`), the `useSearchParams`-driven step toggle, the dead `postoList`/`handlePostoSelect` code, and the now-unnecessary `Suspense` wrapper (this page no longer reads search params). The "Booking Tiket" action now navigates to the new nested route.

```tsx
"use client";
import React from "react";
import { Printer, Tag, Ticket } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { DataTable } from "@/components/ui/DataTable";

export default function TicketBookingPage() {
  const { apiTable } = useApi();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
          Booking Tiket Antrian
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Terbitkan tiket antrian berdasarkan order POSTO yang Anda miliki.
        </p>
      </div>

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
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-[10px] font-black uppercase tracking-widest px-4 rounded-none bg-[#003473] hover:bg-[#002855] text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border-none"
                      onClick={() => router.push(`/tiket/booking/${row.guid || row.id}`)}
                    >
                      <Ticket className="h-3 w-3" />
                      Booking Tiket
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[10px] font-black uppercase tracking-widest px-3 border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 rounded-none shadow-sm transition-all"
                      onClick={() => {
                        window.open(`/posto/print/${row.guid || row.id}`, '_blank');
                      }}
                    >
                      <Printer className="h-3 w-3" />
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
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/tiket/booking/page.tsx
git commit -m "refactor: simplify /tiket/booking to the POSTO list, move detail to nested route"
```

---

### Task 4: Point the "Booking" entry points at the new route

**Files:**
- Modify: `src/app/posto/page.tsx:219`
- Modify: `src/app/posto/so/page.tsx:304`

- [ ] **Step 1: Fix `src/app/posto/page.tsx`**

```tsx
// Before
onClick={() => window.location.href = `/tiket/booking?guid=${id}`}

// After
onClick={() => window.location.href = `/tiket/booking/${id}`}
```

- [ ] **Step 2: Fix `src/app/posto/so/page.tsx`**

This also resolves the previously-dead `noposto`-only entry point, since `/tiket/booking/[guid]` sends the same value as both `guid` and `noposto` to `POSTO/DetailData`, and the backend matches on either (`sistropigroup/SISTROAWESOME/api/POSTOController.cs:558`).

```tsx
// Before
onClick={() => (window.location.href = `/tiket/booking?noposto=${noposto}`)}

// After
onClick={() => (window.location.href = `/tiket/booking/${noposto}`)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/posto/page.tsx src/app/posto/so/page.tsx
git commit -m "fix: link POSTO booking buttons to the dedicated /tiket/booking/[guid] route"
```

---

### Task 5: Manual verification

No test framework (`vitest`/`playwright`) is configured in this repo — verify by running the dev server and exercising the flow directly, the same way other pages in this codebase are validated.

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify the list page**

Navigate to `http://localhost:3000/tiket/booking` (logged in as a `transport`/`rekanan` role). Confirm:
- The "List Order Tersedia" table loads.
- Clicking "Booking Tiket" on a row navigates to `/tiket/booking/<guid>` (URL changes, not just `?guid=`).

- [ ] **Step 3: Verify the detail page and back-navigation**

On `/tiket/booking/<guid>`:
- Confirm the hero section shows the POSTO number, product, date.
- Confirm "Jadwal Pemuatan" and "Riwayat Tiket" tables load.
- Click "Kembali ke List POSTO" — confirm it lands on `/tiket/booking` (the list), **not** `/tiket`.
- Reload the browser directly on `/tiket/booking/<guid>` (simulating an opened shared link with no prior in-app history), then click the browser's native Back button — confirm it does not strand the user (falls back to whatever page opened it, e.g. `/posto`), and separately confirm the in-page "Kembali ke List POSTO" button always works regardless of history.

- [ ] **Step 4: Verify the `/posto` and `/posto/so` entry points**

- From `/posto`, click "Booking" on a row (as `rekanan`/`transport`) — confirm it lands on `/tiket/booking/<guid>` and shows that POSTO's detail.
- From `/posto/so`, click "Booking" on a row — confirm it lands on `/tiket/booking/<noposto>` and the detail data loads (this previously silently failed).

- [ ] **Step 5: Regression-check booking still works end to end**

Pick an available shift ("Pesan" button), fill in Nopol/Driver/Qty in the modal, submit, and confirm the toast shows success and "Riwayat Tiket" refreshes with the new booking.

---

## Self-Review

- **Spec coverage:** Both reported symptoms are addressed — Q1 answered as role-gating (no code change), Q2 fixed via a real nested route plus the mis-pointed "Kembali" button, and the dormant `noposto`-only entry bug fixed as a side effect of Task 2/4.
- **Placeholder scan:** No TBD/TODO/"add error handling" placeholders; every step has complete code.
- **Type consistency:** `TicketBookingDetail` prop is `guid: string` everywhere it's referenced (Task 1 definition, Task 2 usage). Query keys (`posto-detail`, `armada-pagination`, `shift-quota`, `posto-tickets`) consistently use `guid` in place of the old `selectedPosto?.guid` in both the extracted component and the invalidation calls in `bookingMutation.onSuccess`.
