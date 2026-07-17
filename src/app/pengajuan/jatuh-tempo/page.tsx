"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Clock,
  FileText,
  Upload,
  XCircle,
  Loader2,
  Eye,
  FilePlus,
  Printer,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  DataTable,
  type DataTableColumn,
  type DataTableParams,
} from "@/components/ui/DataTable";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PengajuanJapoItem {
  NoPosto: string;
  NoDo?: string;
  TglPosto: string;
  TglJatuhTempo: string;
  TglJatuhTempoEkspeditur?: string;
  PlantAsal: string;
  PlantAsalDesc: string;
  PlantTujuan: string;
  PlantTujuanDesc: string;
  VendorCode: string;
  VendorName: string;
  Ekspenditur?: string;
  TotalKuantumPO: number;
  TotalGi: number;            // Kuantum Realisasi Terlambat
  SisaPo: number;             // Total Kuantum Outstanding Terlambat
  Satuan: string;
  StatusPo: string;
  StatusPoDes: string;
  Status?: string;
  StatusPengajuan?: string;   // Status pengajuan japo
  TotalGrTerlambat: number;   // Kuantum Realisasi Terlambat
  TotalGrTidakTerlambat: number; // Kuantum Realisasi Tidak Terlambat
  KuantumTerlambat: number;   // Kuantum Terlambat
  TotalDenda: number;         // Total Klaim (Rp)
  EvidenceJatuhTempo?: string;
  TanggalGr?: string;
  TotalGr: number;
  ApprovedBy?: string;
  ApproverPosition?: string;
  AcknowledgeBy?: string;
  AcknowledgePosition?: string;
}

interface RiwayatJapoItem extends PengajuanJapoItem {
  StatusPengajuanJapo?: string;
  TglJapoEkspeditur?: string;
  TglJapoOrigin?: string;
  AllDo: boolean;
  TotalKuantumPo?: number; // backend riwayat mungkin pakai lowercase 'o'
}

interface DOItem {
  NoDo: string;
  KuantumDo: number;
  TanggalDo?: string;
  TanggalDoStr?: string;
  TglJatuhTempo?: string;
  TglJatuhTempoStr?: string;
  TanggalGr?: string;
  TanggalGrStr?: string;
  TotalGr: number;
  SisaPo?: number;
  Denda: number;
  TotalDenda: number;
  Telat?: boolean | number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTanggal(val?: string | null): string {
  if (!val) return "-";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return val;
  }
}

function formatAngka(val?: number | null, decimals = 0): string {
  if (val === null || val === undefined) return "-";
  return Number(val).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function isDekat(tglJatuhTempo?: string): boolean {
  if (!tglJatuhTempo) return false;
  const d = new Date(tglJatuhTempo);
  const now = new Date();
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

function isLewat(tglJatuhTempo?: string): boolean {
  if (!tglJatuhTempo) return false;
  return new Date(tglJatuhTempo) < new Date();
}

function getStatusPengajuanBadge(status?: string) {
  if (!status) return <Badge>-</Badge>;
  const s = status.toUpperCase();
  if (s.includes("APPROVE"))
    return <Badge color="success" size="sm">{status}</Badge>;
  if (s.includes("REJECT"))
    return <Badge color="error" size="sm">{status}</Badge>;
  return <Badge color="warning" size="sm">{status}</Badge>;
}

// ─── Modal Pengajuan ──────────────────────────────────────────────────────────

interface ModalPengajuanProps {
  item: PengajuanJapoItem;
  onClose: () => void;
  onSuccess: () => void;
}

function ModalPengajuan({ item, onClose, onSuccess }: ModalPengajuanProps) {
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const [tglBaru, setTglBaru] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxMB = 10;
    if (f.size > maxMB * 1024 * 1024) {
      addToast({ title: "File terlalu besar", description: `Maksimal ${maxMB}MB`, variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi wajib seperti di Classic
    if (!file) {
      addToast({ title: "Validasi", description: "Wajib Melampirkan Evidence", variant: "destructive" });
      return;
    }
    if (!tglBaru) {
      addToast({ title: "Validasi", description: "Tanggal Jatuh Tempo Ekspeditur tidak boleh kosong", variant: "destructive" });
      return;
    }
    if (!keterangan.trim()) {
      addToast({ title: "Validasi", description: "Keterangan tidak boleh kosong", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      const payload = {
        NoPosto: item.NoPosto,
        TglJatuhTempoEkspeditur: tglBaru,
        Keterangan: keterangan,
      };
      formData.append("data", JSON.stringify(payload));
      formData.append("file", file);

      const res = await apiFetch("/api/Apg/SavePengajuanJapoEks", {
        method: "POST",
        body: formData,
      });

      const json = await res.json().catch(() => null);
      let resp = json?.response;
      // Classic checks: JSON.parse(response.response).Success
      let isSuccess = false;
      try {
        const parsed = typeof resp === "string" ? JSON.parse(resp) : resp;
        isSuccess = parsed?.Success === true;
        if (!isSuccess && parsed?.Message) {
          addToast({ title: "Gagal", description: "Gagal Kirim Pengajuan Japo: " + parsed.Message, variant: "destructive" });
          return;
        }
      } catch {
        isSuccess = res.ok;
      }

      if (isSuccess) {
        addToast({ title: "Berhasil", description: `Berhasil Mengajukan Japo: ${item.NoPosto}`, variant: "default" });
        onSuccess();
        onClose();
      } else {
        addToast({ title: "Gagal", description: "Gagal Kirim Pengajuan Japo", variant: "destructive" });
      }
    } catch (err: any) {
      addToast({ title: "Error", description: err?.message || "Gagal menghubungi server", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <FilePlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Pengajuan Japo</h2>
              <p className="text-xs text-white/80">POSTO: {item.NoPosto}</p>
            </div>
          </div>
        </div>

        {/* Info read-only fields (sesuai Classic) */}
        <div className="px-6 pt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Tanggal PO</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatTanggal(item.TglPosto)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Plant Asal</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.PlantAsalDesc || item.PlantAsal}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Plant Tujuan</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.PlantTujuanDesc || item.PlantTujuan}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Kuantum Terlambat</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatAngka(item.KuantumTerlambat, 2)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total GR Terlambat</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatAngka(item.TotalGrTerlambat)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Tanggal JAPO saat ini</p>
            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">{formatTanggal(item.TglJatuhTempo)}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
              Tanggal Pengajuan Perpanjangan JAPO <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={tglBaru}
              onChange={(e) => setTglBaru(e.target.value)}
              className="rounded-xl h-10 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
              Keterangan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              rows={3}
              placeholder="Masukkan Keterangan"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1.5">
              Upload Evidence <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-all"
            >
              <Upload className="h-6 w-6 text-gray-300 dark:text-gray-600" />
              {file ? (
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{file.name}</p>
                  <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Klik untuk pilih file</p>
                  <p className="text-[10px] text-gray-400">Tipe berkas: Pdf, png/jpg/jpeg, doc/docx, zip/rar — Maks. 10MB</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.zip,.rar"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} className="flex-1 rounded-xl">
              Close
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menyimpan...</>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Detail DO ──────────────────────────────────────────────────────────

interface ModalDetailDOProps {
  noPosto: string;
  onClose: () => void;
}

function ModalDetailDO({ noPosto, onClose }: ModalDetailDOProps) {
  const { apiFetch, apiTable } = useApi();
  const { addToast } = useToast();
  const [doList, setDoList] = useState<DOItem[]>([]);
  const [totalDenda, setTotalDenda] = useState(0);
  const [isCanPrint, setIsCanPrint] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // Use a client-side fetcher wrapper for the DataTable component
  const fetcherDO = useCallback(async (params: DataTableParams) => {
    try {
      const res = await apiFetch("/api/Apg/DatatableDoPengajuanJapo", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `noposto=${encodeURIComponent(noPosto)}`,
      });
      const json = await res.json();
      
      setTotalDenda(json?.totaldenda ?? 0);
      setIsCanPrint(json?.iscanprint ?? false);
      
      const allData: DOItem[] = json?.data ?? [];
      
      // Client-side filtering if search is used
      let filtered = allData;
      if (params.search) {
        const lowerSearch = params.search.toLowerCase();
        filtered = filtered.filter(item => 
          Object.values(item).some(val => 
            val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch)
          )
        );
      }
      
      // Client-side pagination
      const paginated = filtered.slice(params.start, params.start + params.length);
      
      return { 
        data: paginated, 
        recordsTotal: allData.length, 
        recordsFiltered: filtered.length 
      };
    } catch (err: any) {
      addToast({ title: "Error", description: "Gagal memuat detail DO", variant: "destructive" });
      return { data: [], recordsTotal: 0, recordsFiltered: 0 };
    }
  }, [noPosto, apiFetch, addToast]);

  const columnsDO: DataTableColumn<DOItem>[] = [
    { key: "index", header: "No.", render: (row, i) => i + 1 },
    { key: "NoDo", header: "Do", className: "font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap" },
    { key: "KuantumDo", header: "Kuantum", className: "text-right", render: (row) => formatAngka(row.KuantumDo) },
    { key: "TanggalDo", header: "Tanggal", className: "whitespace-nowrap", render: (row) => row.TanggalDoStr || formatTanggal(row.TanggalDo) },
    { key: "TglJatuhTempo", header: "Tanggal Jatuh Tempo", className: "text-orange-600 dark:text-orange-400 whitespace-nowrap", render: (row) => row.TglJatuhTempoStr || formatTanggal(row.TglJatuhTempo) },
    { key: "TanggalGr", header: "Tanggal Realisasi", className: "whitespace-nowrap", render: (row) => row.TanggalGrStr || formatTanggal(row.TanggalGr) },
    { key: "SisaPo", header: "Outstanding Kuantum Terlambat", className: "text-right", render: (row) => formatAngka(row.SisaPo, 2) },
    { key: "TotalGr", header: "Realisasi Kuantum", className: "text-right", render: (row) => formatAngka(row.TotalGr) },
    { key: "Telat", header: "Waktu/Hari", render: (row) => row.Telat ? <Badge color="error" size="sm">Terlambat</Badge> : <Badge color="success" size="sm">Tepat Waktu</Badge> },
    { key: "Denda", header: "Denda Rp/Ton/Hari", className: "font-bold text-right", render: (row) => formatAngka(row.Denda) },
    { key: "TotalDenda", header: "Total Klaim (Rp)", className: "font-bold text-red-600 dark:text-red-400 text-right", render: (row) => formatAngka(row.TotalDenda) },
  ];

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const res = await apiFetch("/api/Apg/PrintInvoiceDoPosto", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `noposto=${encodeURIComponent(JSON.stringify(noPosto))}`,
      });
      if (!res.ok) throw new Error("Gagal cetak invoice");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      addToast({ title: "Error", description: err?.message || "Gagal mencetak invoice", variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-6xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Permohonan Perpanjangan Jatuh Tempo Detail</h2>
              <p className="text-xs text-white/80">POSTO: {noPosto} — *Satuan Kuantum dalam bentuk TON</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50/30 dark:bg-gray-900/50">
          <DataTable<DOItem>
            columns={columnsDO}
            queryKey={["do-detail", noPosto]}
            fetcher={fetcherDO}
            rowKey={(row) => row.NoDo}
            searchPlaceholder="Cari DO..."
            emptyText="Tidak ada data DO"
            defaultPageSize={10}
            striped
            compact
          />
        </div>

        {/* Footer: total denda + cetak */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mr-3">
              Total Klaim (Rp) :
            </span>
            <span className="text-lg font-black text-blue-700 dark:text-blue-300">
              {formatAngka(totalDenda)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting || !isCanPrint}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
            >
              {isPrinting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Printer className="h-3.5 w-3.5 mr-1.5" />
              )}
              Cetak Invoice
            </Button>
            <Button size="sm" variant="outline" onClick={onClose} className="rounded-xl text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = "aktif" | "riwayat";

export default function PengajuanJatuhTempoPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("aktif");
  const [selectedItem, setSelectedItem] = useState<PengajuanJapoItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [doNoPosto, setDoNoPosto] = useState<string | null>(null);

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetcherAktif = useCallback(
    async (params: DataTableParams) => {
      try {
        // Backend endpoint (ApgController.DatatablePengajuanJapo) ignores start/length/search
        // and always returns the full dataset (can be thousands of rows) — fetch it once via
        // a stable React Query cache key instead of re-hitting the network on every page click
        // or search keystroke, then filter/page it here client-side.
        const allData: PengajuanJapoItem[] = await queryClient.fetchQuery({
          // Nested under ["japo-aktif", ...] so DataTable's own refresh button and the
          // post-edit invalidateQueries(["japo-aktif"]) below both bust this cache too
          // (React Query invalidates by key prefix).
          queryKey: ["japo-aktif", "raw"],
          queryFn: async () => {
            const result = await apiTable("/api/Apg/DatatablePengajuanJapo", {
              draw: params.draw,
              start: params.start,
              length: params.length,
              search: { value: params.search },
              cmd: "refresh",
              columns: [
                { data: "NoPosto", name: "NoPosto", searchable: true, orderable: true }
              ]
            });
            return result?.data ?? [];
          },
          staleTime: 60_000,
        });

        let filtered = allData;
        if (params.search) {
          const lowerSearch = params.search.toLowerCase();
          filtered = filtered.filter((item) =>
            Object.values(item).some(
              (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch)
            )
          );
        }

        const paginated = filtered.slice(params.start, params.start + params.length);

        return {
          data: paginated,
          recordsTotal: allData.length,
          recordsFiltered: filtered.length,
        };
      } catch (err: any) {
        addToast({ title: "Error", description: "Gagal memuat data pengajuan", variant: "destructive" });
        return { data: [], recordsTotal: 0, recordsFiltered: 0 };
      }
    },
    [apiTable, addToast, queryClient]
  );

  const fetcherRiwayat = useCallback(
    async (params: DataTableParams) => {
      try {
        // Backend endpoint (ApgController.DatatableRiwayatPengajuanJapo) ignores
        // start/length/search and always returns the full dataset (can be thousands of
        // rows) — fetch it once via a stable React Query cache key instead of re-hitting
        // the network on every page click or search keystroke, then filter/page it here.
        const allData: RiwayatJapoItem[] = await queryClient.fetchQuery({
          // Nested under ["japo-riwayat", ...] so DataTable's own refresh button and the
          // post-edit invalidateQueries(["japo-riwayat"]) below both bust this cache too
          // (React Query invalidates by key prefix).
          queryKey: ["japo-riwayat", "raw"],
          queryFn: async () => {
            const result = await apiTable("/api/Apg/DatatableRiwayatPengajuanJapo", {
              draw: params.draw,
              start: params.start,
              length: params.length,
              search: { value: params.search },
              cmd: "refresh",
              columns: [
                { data: "NoPosto", name: "NoPosto", searchable: true, orderable: true }
              ]
            });
            return result?.data ?? [];
          },
          staleTime: 60_000,
        });

        let filtered = allData;
        if (params.search) {
          const lowerSearch = params.search.toLowerCase();
          filtered = filtered.filter((item) =>
            Object.values(item).some(
              (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch)
            )
          );
        }

        const paginated = filtered.slice(params.start, params.start + params.length);

        return {
          data: paginated,
          recordsTotal: allData.length,
          recordsFiltered: filtered.length,
        };
      } catch (err: any) {
        addToast({ title: "Error", description: "Gagal memuat riwayat pengajuan", variant: "destructive" });
        return { data: [], recordsTotal: 0, recordsFiltered: 0 };
      }
    },
    [apiTable, addToast, queryClient]
  );

  // ── Columns — Tab Aktif ──────────────────────────────────────────────────────
  // Kolom sesuai Classic: No, Action, POSTO, Status PO, Status Pengajuan, Tanggal PO,
  // Tanggal JAPO, Tanggal Pengajuan Perpanjangan JAPO, Total Klaim, Kuantum POSTO,
  // Kuantum Realisasi Tidak Terlambat, Kuantum Terlambat, Kuantum Realisasi Terlambat,
  // Total Kuantum Outstanding Terlambat, Plant Asal, Plant Tujuan

  const columnsAktif: DataTableColumn<PengajuanJapoItem>[] = [
    {
      key: "NoPosto",
      header: "POSTO",
      render: (row) => (
        // Klik NoPosto → buka Detail DO (sesuai Classic `tableDo`)
        <button
          onClick={() => setDoNoPosto(row.NoPosto)}
          className="font-bold text-blue-600 dark:text-blue-400 text-[12px] hover:underline whitespace-nowrap"
        >
          {row.NoPosto}
        </button>
      ),
    },
    {
      key: "StatusPoDes",
      header: "Status PO",
      render: (row) => (
        <span className="text-[12px] text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.StatusPoDes || row.StatusPo}</span>
      ),
    },
    {
      key: "StatusPengajuan",
      header: "Status Pengajuan",
      render: (row) => getStatusPengajuanBadge(row.StatusPengajuan),
    },
    {
      key: "TglPosto",
      header: "Tanggal PO",
      render: (row) => <span className="text-[12px] whitespace-nowrap">{formatTanggal(row.TglPosto)}</span>,
    },
    {
      key: "TglJatuhTempo",
      header: "Tanggal JAPO",
      render: (row) => {
        const lewat = isLewat(row.TglJatuhTempo);
        const dekat = isDekat(row.TglJatuhTempo);
        return (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className={`text-[12px] font-bold ${lewat ? "text-red-600 dark:text-red-400" : dekat ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {formatTanggal(row.TglJatuhTempo)}
            </span>
            {lewat && <span className="text-[9px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-1 rounded font-black">LEWAT</span>}
            {!lewat && dekat && <span className="text-[9px] bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 rounded font-black">≤7HR</span>}
          </div>
        );
      },
    },
    {
      key: "TglJatuhTempoEkspeditur",
      header: "Tgl Perpanjangan JAPO",
      render: (row) => <span className="text-[12px] whitespace-nowrap">{formatTanggal(row.TglJatuhTempoEkspeditur)}</span>,
    },
    {
      key: "TotalDenda",
      header: "Total Klaim (Rp)",
      className: "text-right",
      render: (row) => <span className="text-[12px] font-bold text-right block">{formatAngka(row.TotalDenda)}</span>,
    },
    {
      key: "TotalKuantumPO",
      header: "Kuantum POSTO",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.TotalKuantumPO)}</span>,
    },
    {
      key: "TotalGrTidakTerlambat",
      header: "Realisasi Tidak Terlambat",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.TotalGrTidakTerlambat)}</span>,
    },
    {
      key: "KuantumTerlambat",
      header: "Kuantum Terlambat",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.KuantumTerlambat, 2)}</span>,
    },
    {
      key: "TotalGrTerlambat",
      header: "Realisasi Terlambat",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.TotalGrTerlambat)}</span>,
    },
    {
      key: "SisaPo",
      header: "Outstanding Terlambat",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.SisaPo)}</span>,
    },
    {
      key: "PlantAsalDesc",
      header: "Plant Asal",
      render: (row) => <span className="text-[12px] whitespace-nowrap">{row.PlantAsalDesc || row.PlantAsal}</span>,
    },
    {
      key: "PlantTujuanDesc",
      header: "Plant Tujuan",
      render: (row) => <span className="text-[12px] whitespace-nowrap">{row.PlantTujuanDesc || row.PlantTujuan}</span>,
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <Button
          size="sm"
          className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white border-0 text-[11px] h-7 px-3 whitespace-nowrap"
          onClick={() => { setSelectedItem(row); setIsModalOpen(true); }}
        >
          <FilePlus className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
      ),
    },
  ];

  // ── Columns — Tab Riwayat ────────────────────────────────────────────────────
  // Kolom sesuai Classic: No, Status, POSTO, Tanggal PO, Tanggal JAPO, Tgl Perpanjangan JAPO,
  // Total Klaim, Kuantum POSTO, Realisasi Tidak Terlambat, Kuantum Terlambat,
  // Realisasi Terlambat, Total Outstanding Terlambat, Status PO, Plant Asal, Plant Tujuan

  const columnsRiwayat: DataTableColumn<RiwayatJapoItem>[] = [
    {
      key: "StatusPengajuanJapo",
      header: "Status",
      render: (row) => getStatusPengajuanBadge(row.StatusPengajuanJapo),
    },
    {
      key: "NoPosto",
      header: "POSTO",
      render: (row) => (
        <button
          onClick={() => setDoNoPosto(row.NoPosto)}
          className="font-bold text-blue-600 dark:text-blue-400 text-[12px] hover:underline whitespace-nowrap"
        >
          {row.NoPosto}
        </button>
      ),
    },
    {
      key: "TglPosto",
      header: "Tanggal PO",
      render: (row) => <span className="text-[12px] whitespace-nowrap">{formatTanggal(row.TglPosto)}</span>,
    },
    {
      key: "TglJatuhTempo",
      header: "Tanggal JAPO",
      render: (row) => <span className="text-[12px] text-orange-600 dark:text-orange-400 whitespace-nowrap">{formatTanggal(row.TglJatuhTempo)}</span>,
    },
    {
      key: "TglJapoEkspeditur",
      header: "Tgl Perpanjangan JAPO",
      render: (row) => <span className="text-[12px] text-blue-600 dark:text-blue-400 whitespace-nowrap">{formatTanggal(row.TglJapoEkspeditur)}</span>,
    },
    {
      key: "TotalDenda",
      header: "Total Klaim (Rp)",
      className: "text-right",
      render: (row) => <span className="text-[12px] font-bold text-right block">{formatAngka(row.TotalDenda)}</span>,
    },
    {
      key: "TotalKuantumPO",
      header: "Kuantum POSTO",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.TotalKuantumPo ?? row.TotalKuantumPO)}</span>,
    },
    {
      key: "TotalGrTidakTerlambat",
      header: "Realisasi Tidak Terlambat",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.TotalGrTidakTerlambat)}</span>,
    },
    {
      key: "KuantumTerlambat",
      header: "Kuantum Terlambat",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.KuantumTerlambat, 2)}</span>,
    },
    {
      key: "TotalGi",
      header: "Realisasi Terlambat",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.TotalGi)}</span>,
    },
    {
      key: "TotalGrTerlambat",
      header: "Outstanding Terlambat",
      className: "text-right",
      render: (row) => <span className="text-[12px] text-right block">{formatAngka(row.TotalGrTerlambat)}</span>,
    },
    {
      key: "StatusPoDes",
      header: "Status PO",
      render: (row) => <span className="text-[12px] whitespace-nowrap">{row.StatusPoDes || row.StatusPo}</span>,
    },
    {
      key: "PlantAsalDesc",
      header: "Plant Asal",
      render: (row) => <span className="text-[12px] whitespace-nowrap">{row.PlantAsalDesc || row.PlantAsal}</span>,
    },
    {
      key: "PlantTujuanDesc",
      header: "Plant Tujuan",
      render: (row) => <span className="text-[12px] whitespace-nowrap">{row.PlantTujuanDesc || row.PlantTujuan}</span>,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Pengajuan Jatuh Tempo</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          *Satuan Kuantum dalam bentuk TON
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Klik No. POSTO untuk melihat Detail DO</p>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-black">LEWAT</span>
              <span className="text-xs text-gray-500">Sudah melewati jatuh tempo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-black">≤7HR</span>
              <span className="text-xs text-gray-500">Mendekati jatuh tempo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 dark:border-gray-800">
        <div className="flex gap-0">
          {(
            [
              { key: "aktif", label: "Pengajuan Jatuh Tempo", icon: Clock },
              { key: "riwayat", label: "Riwayat Pengajuan", icon: FileText },
            ] as { key: TabKey; label: string; icon: React.ElementType }[]
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all duration-200 border-b-2 ${
                activeTab === key
                  ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
                  : "text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "aktif" && (
          <DataTable<PengajuanJapoItem>
            columns={columnsAktif}
            queryKey={["japo-aktif"]}
            fetcher={fetcherAktif}
            rowKey={(row) => row.NoPosto}
            searchPlaceholder="Cari No POSTO..."
            emptyText="Tidak ada data Pengajuan Jatuh Tempo"
            defaultPageSize={25}
            striped
            compact
          />
        )}

        {activeTab === "riwayat" && (
          <DataTable<RiwayatJapoItem>
            columns={columnsRiwayat}
            queryKey={["japo-riwayat"]}
            fetcher={fetcherRiwayat}
            rowKey={(row) => row.NoPosto + (row.TglJapoEkspeditur || "")}
            searchPlaceholder="Cari No POSTO..."
            emptyText="Belum ada riwayat pengajuan jatuh tempo"
            defaultPageSize={25}
            striped
            compact
          />
        )}
      </div>

      {/* Modals */}
      {isModalOpen && selectedItem && (
        <ModalPengajuan
          item={selectedItem}
          onClose={() => { setIsModalOpen(false); setSelectedItem(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["japo-aktif"] });
            queryClient.invalidateQueries({ queryKey: ["japo-riwayat"] });
          }}
        />
      )}

      {doNoPosto && (
        <ModalDetailDO
          noPosto={doNoPosto}
          onClose={() => setDoNoPosto(null)}
        />
      )}
    </div>
  );
}
