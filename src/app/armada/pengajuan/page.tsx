"use client";
import { useState, useRef, useCallback, useMemo } from "react";
import {
  Truck,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  Eye,
  Upload,
  X,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  User,
  Settings,
  ShieldCheck,
  Plus,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useSession } from "next-auth/react";
import { MultiSelect, MultiSelectOption } from "@/components/ui/MultiSelect";
import { DataTable, DataTableColumn, DataTableParams } from "@/components/ui/DataTable";

// ─────────────── Types ────────────────────────────────────────────────────────

interface SumbuItem {
  Id: number;
  nama: string;
  jenistruk: string;
  muatan: number | null;
}

interface CompanyItem {
  company_code: string;
  company: string;
}

interface HistoryRow {
  ID?: number;
  numberString?: string;
  aprrovestatus?: string;
  alasan?: string;
  Action?: string;
  transportir?: string;
  nopol?: string;
  approver?: string;
  tahun_pembuatan?: number;
  masa_berlaku_kir_string?: string;
  no_rangka_stnk?: string;
  no_mesin_stnk?: string;
  no_rangka_kir?: string;
  no_mesin_kir?: string;
  sumbu?: string;
  jeniskendaraan?: string;
  qtymax?: number;
  jbi?: number;
  beratkendaraan?: number;
  beratpenumpang?: number;
  createdSubmission?: string;
  createdApproval?: string;
  file?: string;
  file1String?: string;
  file2String?: string;
  charterString?: string;
}

interface DetailResponse {
  tipe: string;
  response: {
    ID: number;
    TransportCode: string;
    nopol: string;
    sumbu: string;
    jeniskendaraan: string;
    qtymax: number;
    jbi: number;
    beratkendaraan: number;
    beratpenumpang: number;
    tahun_pembuatan: number;
    masa_berlaku_kir_string: string;
    no_rangka_stnk: string;
    no_mesin_stnk: string;
    no_rangka_kir: string;
    no_mesin_kir: string;
    approver: string;
    files1: string;
    files2: string;
    charterString: string;
    charter: boolean;
  };
}

// ─────────────── Helpers ──────────────────────────────────────────────────────

const formatNopol = (val: string) => {
  const clean = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const m = clean.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/);
  if (m) return `${m[1]} ${m[2]}${m[3] ? " " + m[3] : ""}`.trim();
  return clean;
};

const emptyForm = () => ({
  nopol: "",
  sumbu: "",
  jeniskendaraan: "",
  qtymax: "",
  jbi: "",
  beratkendaraan: "",
  beratpenumpang: "",
  tahun_pembuatan: "",
  masa_berlaku_kir: "",
  no_rangka_stnk: "",
  no_mesin_stnk: "",
  no_rangka_kir: "",
  no_mesin_kir: "",
  approvers: [] as string[],
  charter: false,
  file1: null as File | null,
  file2: null as File | null,
});

const getStatusBadge = (status: string) => {
  if (!status) return { label: "Menunggu", color: "warning" as const };
  const s = status.toLowerCase();
  if (s.includes("approve") || s.includes("sudah")) return { label: "Disetujui", color: "success" as const };
  if (s.includes("tolak") || s.includes("ditolak") || s.includes("revisi")) return { label: "Ditolak/Revisi", color: "error" as const };
  return { label: "Menunggu", color: "warning" as const };
};

// ─────────────── File Upload Zone ─────────────────────────────────────────────

function FileUploadZone({
  label,
  required,
  value,
  onChange,
  existingUrl,
  onClearExisting,
  id,
}: {
  label: string;
  required?: boolean;
  value: File | null;
  onChange: (f: File | null) => void;
  existingUrl?: string;
  onClearExisting?: () => void;
  id: string;
  handleViewFile: (url: string) => void;
  isCheckingFile: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {existingUrl && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewFile(existingUrl)}
              className="text-[10px] font-bold text-brand-600 hover:text-brand-700 underline flex items-center gap-1 disabled:opacity-50"
              disabled={isCheckingFile}
            >
              {isCheckingFile ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />} Lihat
            </button>
            {onClearExisting && (
              <button type="button" onClick={onClearExisting} className="text-red-500 hover:text-red-600 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
      <div
        className="group relative h-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] hover:bg-brand-50/50 dark:hover:bg-brand-500/5 hover:border-brand-300 transition-all cursor-pointer flex items-center px-4 gap-3 overflow-hidden"
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-gray-800 shadow-sm group-hover:scale-110 transition-transform">
          <Upload className="h-4 w-4 text-gray-400 group-hover:text-brand-500" />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[150px]">
          {value ? value.name : existingUrl ? "Ganti file lampiran..." : "Pilih file atau drag here"}
        </span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="application/pdf,image/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

// ─────────────── Main Page ────────────────────────────────────────────────────

export default function ArmadaPengajuanPage() {
  const { data: session } = useSession();
  const { apiFetch, apiTable } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const role = (session?.user as any)?.role as string | undefined;
  const userName = session?.user?.name ?? "";
  const transportCode = (session?.user as any)?.companyCode as string | undefined;
  const isTransport = role === "transport" || role === "rekanan";

  // ── form state ──
  const [form, setForm] = useState(emptyForm());
  const setF = (patch: Partial<ReturnType<typeof emptyForm>>) => setForm((p) => ({ ...p, ...patch }));

  // ── sumbu modal ──
  const [sumbuOpen, setSumbuOpen] = useState(false);
  const [sumbuSearch, setSumbuSearch] = useState("");
  const [sumbuTarget, setSumbuTarget] = useState<"main" | "edit">("main");

  // ── edit modal ──
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const setEF = (patch: Partial<ReturnType<typeof emptyForm>>) => setEditForm((p) => ({ ...p, ...patch }));
  const [editExistingFile1, setEditExistingFile1] = useState("");
  const [editExistingFile2, setEditExistingFile2] = useState("");

  // ── delete modal ──
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [viewFileUrl, setViewFileUrl] = useState<string | null>(null);
  const [isCharterFilter, setIsCharterFilter] = useState(false);

  // ── file check logic ──
  const [isCheckingFile, setIsCheckingFile] = useState(false);
  const handleViewFile = async (url: string) => {
    if (!url || url === "null" || url === "") {
      addToast({ title: "Gagal", description: "URL file tidak valid.", variant: "destructive" });
      return;
    }

    setIsCheckingFile(true);
    try {
      // Check if file exists using HEAD request
      const response = await fetch(url, { method: 'HEAD' });
      
      if (response.status === 404) {
        addToast({ 
          title: "File Not Found", 
          description: "File tidak ditemukan atau link sudah tidak berlaku (Corrupt/Not Found).", 
          variant: "destructive" 
        });
      } else if (!response.ok) {
        throw new Error("Gagal mengakses file");
      } else {
        setViewFileUrl(url);
      }
    } catch (error) {
      console.error("File check error:", error);
      // Fallback: try opening directly if HEAD is blocked by CORS, 
      // or show error if it's a known failure
      setViewFileUrl(url); 
    } finally {
      setIsCheckingFile(false);
    }
  };

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const { data: sumbuList = [] } = useQuery<SumbuItem[]>({
    queryKey: ["sumbu-data"],
    queryFn: async () => {
      const res = await apiFetch("/api/Armada/SumbuData");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session,
    staleTime: 60_000,
  });

  const { data: companyList = [] } = useQuery<CompanyItem[]>({
    queryKey: ["company-fitur"],
    queryFn: async () => {
      const res = await apiFetch("/api/Company/getCompanyListFitur");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session,
    staleTime: 60_000,
  });

  const companyOptions: MultiSelectOption[] = useMemo(() => 
    companyList.map(c => ({ value: c.company_code, label: c.company })),
    [companyList]
  );

  const fetchHistory = async (params: DataTableParams) => {
    const payload: any = {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: params.search || "",
      order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
      columns: columns.map((col) => {
        let name = col.key;
        if (col.key === "nopol") name = "nopol";
        else if (col.key === "aprrovestatus") name = "approve";
        else if (col.key === "approver") name = "approver";
        else if (col.key === "sumbu") name = "sumbu";
        else if (col.key === "masa_berlaku_kir_string") name = "masa_berlaku_kir";
        else if (col.key === "createdSubmission") name = "ID"; // Fallback to ID for sorting
        
        return {
          data: col.key,
          name: name,
          searchable: true,
          orderable: true,
          search: { value: "", regex: false }
        };
      })
    };

    if (isCharterFilter) {
      // In this specific backend, charter filter is passed via columns[0][search][value]
      if (payload.columns[0]) {
        payload.columns[0].search = { value: "1", regex: false };
      }
    }

    return await apiTable("/api/Armada/DataTableReviewBaru", payload);
  };

  const { data: detailData } = useQuery<DetailResponse | null>({
    queryKey: ["armada-review-detail", editId],
    queryFn: async () => {
      if (!editId) return null;
      const res = await apiFetch("/api/Armada/DetailDataReview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ID: editId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!editId,
  });

  // Populate edit form when detail arrives
  const prevEditIdRef = useRef<number | null>(null);
  if (detailData?.tipe === "success" && editId && editId !== prevEditIdRef.current) {
    prevEditIdRef.current = editId;
    const r = detailData.response;
    const approverArr = r.approver ? r.approver.split(",").map((s) => s.trim()).filter(Boolean) : [];
    setEditForm({
      nopol: r.nopol ?? "",
      sumbu: r.sumbu ?? "",
      jeniskendaraan: r.jeniskendaraan ?? "",
      qtymax: r.qtymax?.toString() ?? "",
      jbi: r.jbi?.toString() ?? "",
      beratkendaraan: r.beratkendaraan?.toString() ?? "",
      beratpenumpang: r.beratpenumpang?.toString() ?? "",
      tahun_pembuatan: r.tahun_pembuatan?.toString() ?? "",
      masa_berlaku_kir: r.masa_berlaku_kir_string ?? "",
      no_rangka_stnk: r.no_rangka_stnk ?? "",
      no_mesin_stnk: r.no_mesin_stnk ?? "",
      no_rangka_kir: r.no_rangka_kir ?? "",
      no_mesin_kir: r.no_mesin_kir ?? "",
      approvers: approverArr,
      charter: r.charter === true || r.charterString === "1",
      file1: null,
      file2: null,
    });
    setEditExistingFile1(r.files1 ?? "");
    setEditExistingFile2(r.files2 ?? "");
  }

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const buildFormData = (f: ReturnType<typeof emptyForm>, extra?: Record<string, string>) => {
    const fd = new FormData();
    if (transportCode) fd.append("TransportCode", transportCode);
    fd.append("nopol", f.nopol);
    fd.append("sumbu", f.sumbu);
    fd.append("jeniskendaraan", f.jeniskendaraan);
    fd.append("qtymax", (parseFloat(f.qtymax || "0") || 0).toFixed(2).replace(".", ","));
    fd.append("jbi", (parseFloat(f.jbi || "0") || 0).toFixed(2).replace(".", ","));
    fd.append("beratkendaraan", (parseFloat(f.beratkendaraan || "0") || 0).toFixed(2).replace(".", ","));
    fd.append("beratpenumpang", (parseFloat(f.beratpenumpang || "0") || 0).toFixed(2).replace(".", ","));
    fd.append("tahun_pembuatan", f.tahun_pembuatan);
    fd.append("masa_berlaku_kir", f.masa_berlaku_kir);
    fd.append("no_rangka_stnk", f.no_rangka_stnk);
    fd.append("no_mesin_stnk", f.no_mesin_stnk);
    fd.append("no_rangka_kir", f.no_rangka_kir);
    fd.append("no_mesin_kir", f.no_mesin_kir);
    fd.append("charterString", f.charter ? "1" : "0");
    f.approvers.forEach((a) => fd.append("approver", a));
    if (f.file1) fd.append("file1", f.file1);
    if (f.file2) fd.append("file2", f.file2);
    if (extra) Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    return fd;
  };

  const validate = (f: ReturnType<typeof emptyForm>, requireFile1 = true) => {
    if (!f.approvers.length) return "Pilih minimal satu Approver/Rekanan.";
    if (!f.nopol) return "Nomor Polisi wajib diisi.";
    if (!f.sumbu) return "Sumbu wajib dipilih.";
    if (!f.jbi) return "JBI wajib diisi.";
    if (!f.masa_berlaku_kir) return "Masa Berlaku KIR wajib diisi.";
    if (!f.tahun_pembuatan) return "Tahun Pembuatan wajib diisi.";
    if (!f.no_rangka_stnk || !f.no_mesin_stnk || !f.no_rangka_kir || !f.no_mesin_kir) return "Nomor Rangka & Mesin STNK/KIR wajib diisi.";
    const nr1 = f.no_rangka_stnk.trim().toUpperCase();
    const nr2 = f.no_rangka_kir.trim().toUpperCase();
    if (nr1 !== nr2) return `Nomor Rangka STNK (${nr1}) dan KIR (${nr2}) tidak sama.`;
    const nm1 = f.no_mesin_stnk.trim().toUpperCase();
    const nm2 = f.no_mesin_kir.trim().toUpperCase();
    if (nm1 !== nm2) return `Nomor Mesin STNK (${nm1}) dan KIR (${nm2}) tidak sama.`;
    if (requireFile1 && !f.file1) return "Attachment KIR & STNK wajib dilampirkan.";
    return null;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const err = validate(form, true);
      if (err) throw new Error(err);
      const fd = buildFormData(form);
      const res = await apiFetch("/api/Armada/AddReviewBaruAsync", { method: "POST", body: fd });
      const text = (await res.text()).trim();
      if (text !== "sukses") throw new Error(text === "gagal_upload" ? "Gagal mengupload file" : text || "Gagal menyimpan");
    },
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Armada berhasil diajukan.", variant: "success" });
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ["armada-review-baru"] });
    },
    onError: (e: any) => addToast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const hasExistingFile1 = !!editExistingFile1;
      const err = validate(editForm, !hasExistingFile1);
      if (err) throw new Error(err);
      const fd = buildFormData(editForm, {
        ID: String(editId!),
        file1_before: editExistingFile1,
        file2_before: editExistingFile2,
      });
      const res = await apiFetch("/api/Armada/UpdateReviewBaruAsync", { method: "POST", body: fd });
      const text = (await res.text()).trim();
      if (text !== "sukses") throw new Error(text === "gagal_upload" ? "Gagal mengupload file" : text || "Gagal menyimpan");
    },
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Data armada berhasil diperbarui.", variant: "success" });
      setEditId(null);
      prevEditIdRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["armada-review-baru"] });
      queryClient.removeQueries({ queryKey: ["armada-review-detail", editId] });
    },
    onError: (e: any) => addToast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch("/api/Armada/DeleteDataReview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ID: id }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Pengajuan berhasil dihapus.", variant: "success" });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["armada-review-baru"] });
    },
    onError: (e: any) => addToast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  // ─── Sumbu Picker Logic ──────────────────────────────────────────────────────

  const filteredSumbu = sumbuList.filter((s) =>
    !sumbuSearch || s.nama.toLowerCase().includes(sumbuSearch.toLowerCase()) || s.jenistruk.toLowerCase().includes(sumbuSearch.toLowerCase())
  );

  const selectSumbu = (item: SumbuItem) => {
    if (sumbuTarget === "main") {
      setF({ sumbu: item.nama, jeniskendaraan: item.jenistruk, qtymax: item.muatan?.toString() ?? "" });
    } else {
      setEF({ sumbu: item.nama, jeniskendaraan: item.jenistruk, qtymax: item.muatan?.toString() ?? "" });
    }
    setSumbuOpen(false);
    setSumbuSearch("");
  };

  // ─── Action parsing from HTML Action string ──────────────────────────────────

  const parseActions = (row: HistoryRow) => {
    const html = row.Action ?? "";
    const deleteMatch = html.match(/deleteItemProcess\('(\d+)'\)/);
    const editMatch = html.match(/editItemProcess\('(\d+)'\)/);
    const viewMatch = html.match(/viewItemProcess\('(\d+)'\)/);
    return {
      canDelete: !!deleteMatch,
      canEdit: !!editMatch,
      canView: !!viewMatch,
      deleteId: deleteMatch ? parseInt(deleteMatch[1]) : null,
      editId: editMatch ? parseInt(editMatch[1]) : null,
      viewId: viewMatch ? parseInt(viewMatch[1]) : null,
    };
  };

  // ─── Table Columns ───────────────────────────────────────────────────────────

  const columns: DataTableColumn<HistoryRow>[] = [
    {
      key: "nopol",
      header: "Nomor Polisi",
      className: "font-mono font-bold text-gray-900 dark:text-white",
      render: (row) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold">{row.nopol || "—"}</span>
            {String(row.charterString) === "1" && (
              <Badge color="indigo" size="sm" variant="solid">Charter</Badge>
            )}
          </div>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{row.jeniskendaraan}</span>
        </div>
      )
    },
    {
      key: "aprrovestatus",
      header: "Status",
      render: (row) => {
        const s = getStatusBadge(row.aprrovestatus ?? "");
        return <Badge color={s.color} size="sm">{s.label}</Badge>;
      }
    },
    {
      key: "approver",
      header: "Approver",
      className: "text-xs font-medium text-gray-600 dark:text-gray-400",
      render: (row) => <span className="truncate block max-w-[150px]" title={row.approver}>{row.approver || "—"}</span>
    },
    {
      key: "sumbu",
      header: "Sumbu",
      className: "text-xs whitespace-nowrap",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.sumbu}</span>
          <span className="text-[10px] text-brand-600 font-bold">{row.qtymax} TON</span>
        </div>
      )
    },
    {
      key: "masa_berlaku_kir_string",
      header: "Legalitas",
      className: "text-xs whitespace-nowrap",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 font-black uppercase">Masa KIR</span>
          <span className="font-medium">{row.masa_berlaku_kir_string || "—"}</span>
        </div>
      )
    },
    {
      key: "createdSubmission",
      header: "Diajukan Pada",
      className: "text-[10px] text-gray-400 font-mono",
    },
    {
      key: "files",
      header: "Dokumen",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.file1String && (
            <button 
              type="button" 
              disabled={isCheckingFile}
              onClick={() => handleViewFile(row.file1String!)} 
              className="p-1.5 rounded-lg bg-brand-50 text-brand-600 border border-brand-100 hover:bg-brand-100 transition-all disabled:opacity-50" 
              title="KIR & STNK"
            >
              {isCheckingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            </button>
          )}
          {row.file2String && (
            <button 
              type="button" 
              disabled={isCheckingFile}
              onClick={() => handleViewFile(row.file2String!)} 
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all disabled:opacity-50" 
              title="Lainnya"
            >
              {isCheckingFile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      )
    },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      render: (row) => {
        const { canDelete, canEdit, canView, deleteId: dId, editId: eId, viewId: vId } = parseActions(row);
        return (
          <div className="flex items-center justify-end gap-1">
            {canView && vId && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-brand-600 hover:bg-brand-50" onClick={() => setEditId(vId)}>
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {canEdit && eId && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-50" onClick={() => { prevEditIdRef.current = null; setEditId(eId); }}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && dId && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => setDeleteId(dId)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  // ─── Form Section Renderer ───────────────────────────────────────────────────

  const renderFormFields = (f: ReturnType<typeof emptyForm>, set: (p: Partial<ReturnType<typeof emptyForm>>) => void, target: "main" | "edit") => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

      {/* Section 1: Data Identitas */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Data Identitas</h3>
            <p className="text-[10px] text-gray-400 font-medium">Informasi kepemilikan unit</p>
          </div>
        </div>

        <div className="space-y-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-white/[0.01]">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Transportir</label>
            <div className="h-10 px-4 flex items-center bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300">
              {userName || transportCode || "—"}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Approver <span className="text-red-500">*</span></label>
            <MultiSelect
              options={companyOptions}
              selected={f.approvers}
              onChange={(vals) => set({ approvers: vals })}
              placeholder="Pilih plant/rekanan..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Nomor Polisi <span className="text-red-500">*</span></label>
            <Input
              placeholder="B 1234 ABC"
              value={f.nopol}
              onChange={(e) => set({ nopol: e.target.value.toUpperCase() })}
              onBlur={(e) => set({ nopol: formatNopol(e.target.value) })}
              className="h-10 rounded-xl font-bold uppercase"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Spesifikasi Teknis */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Spesifikasi Unit</h3>
            <p className="text-[10px] text-gray-400 font-medium">Data teknis dan kapasitas</p>
          </div>
        </div>

        <div className="space-y-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-white/[0.01]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Sumbu</label>
              <div className="relative group">
                <Input readOnly value={f.sumbu} placeholder="Klik cari" className="cursor-pointer pr-10 h-10 rounded-xl" onClick={() => { setSumbuTarget(target); setSumbuOpen(true); }} />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Tahun Unit</label>
              <Input type="number" placeholder="2020" value={f.tahun_pembuatan} onChange={(e) => set({ tahun_pembuatan: e.target.value })} className="h-10 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">JBI (Kg)</label>
              <Input type="number" placeholder="0" value={f.jbi} onChange={(e) => set({ jbi: e.target.value })} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Tonase Max</label>
              <div className="h-10 px-4 flex items-center bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-brand-600">
                {f.qtymax || "0"} TON
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Berat Kosong</label>
              <Input type="number" placeholder="0" value={f.beratkendaraan} onChange={(e) => set({ beratkendaraan: e.target.value })} className="h-10 rounded-xl text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Berat Kru</label>
              <Input type="number" placeholder="0" value={f.beratpenumpang} onChange={(e) => set({ beratpenumpang: e.target.value })} className="h-10 rounded-xl text-xs" />
            </div>
          </div>
          
          <label className="flex items-center gap-3 px-4 py-2.5 bg-brand-25 dark:bg-brand-500/5 rounded-xl border border-brand-100 dark:border-brand-500/10 cursor-pointer group transition-all">
            <input type="checkbox" checked={f.charter} onChange={(e) => set({ charter: e.target.checked })} className="w-4 h-4 accent-brand-600 rounded" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-800 dark:text-brand-300">Unit Charter</span>
              <span className="text-[9px] text-brand-600/60 font-medium">Set sebagai armada prioritas</span>
            </div>
          </label>
        </div>
      </div>

      {/* Section 3: Legalitas & Berkas */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Legalitas & Berkas</h3>
            <p className="text-[10px] text-gray-400 font-medium">Dokumen dan validasi KIR</p>
          </div>
        </div>

        <div className="space-y-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-white/[0.01]">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Masa Berlaku KIR <span className="text-red-500">*</span></label>
            <Input placeholder="DD-MM-YYYY" value={f.masa_berlaku_kir} onChange={(e) => set({ masa_berlaku_kir: e.target.value })} className="h-10 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FileUploadZone
              id={target === "main" ? "f1-main" : "f1-edit"}
              label="Lampiran KIR/STNK"
              required={target === "main" || !editExistingFile1}
              value={f.file1}
              onChange={(file) => set({ file1: file })}
              handleViewFile={handleViewFile}
              isCheckingFile={isCheckingFile}
              existingUrl={target === "edit" ? editExistingFile1 : undefined}
              onClearExisting={target === "edit" ? () => setEditExistingFile1("") : undefined}
            />
            <FileUploadZone
              id={target === "main" ? "f2-main" : "f2-edit"}
              label="Lampiran Lainnya"
              value={f.file2}
              onChange={(file) => set({ file2: file })}
              handleViewFile={handleViewFile}
              isCheckingFile={isCheckingFile}
              existingUrl={target === "edit" ? editExistingFile2 : undefined}
              onClearExisting={target === "edit" ? () => setEditExistingFile2("") : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">No Rangka KIR</label>
              <Input value={f.no_rangka_kir} onChange={(e) => set({ no_rangka_kir: e.target.value })} className="h-9 rounded-xl text-[10px] uppercase font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">No Mesin KIR</label>
              <Input value={f.no_mesin_kir} onChange={(e) => set({ no_mesin_kir: e.target.value })} className="h-9 rounded-xl text-[10px] uppercase font-mono" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Armada Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Daftarkan unit kendaraan baru dan monitor status persetujuan rekanan secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-xl border-gray-200 dark:border-gray-800">
            <Filter className="h-4 w-4 mr-2" />
            Filter Data
          </Button>
          <Button size="sm" className="h-9 rounded-xl shadow-theme-sm" onClick={() => {
            const el = document.getElementById("form-section");
            el?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Pengajuan Baru
          </Button>
        </div>
      </div>

      {/* Stats Quick Overview (Optional but adds premium feel) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Pengajuan", value: "24", icon: Truck, color: "brand" },
          { label: "Menunggu Approval", value: "08", icon: Clock, color: "warning" },
          { label: "Disetujui", value: "12", icon: CheckCircle2, color: "success" },
          { label: "Ditolak / Revisi", value: "04", icon: X, color: "error" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-theme-xs">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 dark:bg-${stat.color}-500/10 dark:text-${stat.color}-400`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{stat.label}</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form Section */}
      <div id="form-section">
        {isTransport ? (
          <Card className="border-none shadow-theme-lg overflow-hidden bg-white dark:bg-white/[0.02]">
            <CardHeader className="px-8 py-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Formulir Pengajuan Armada</CardTitle>
                  <CardDescription className="text-xs text-gray-500 mt-1">Silakan lengkapi data teknis dan lampiran dokumen unit kendaraan Anda.</CardDescription>
                </div>
                <Badge color="indigo" variant="light" size="md">Step 01: Pendaftaran</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {renderFormFields(form, setF, "main")}
              
              <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Data Anda aman dan terenkripsi oleh sistem SISTRO.
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Button
                    variant="ghost"
                    className="flex-1 md:flex-none h-11 rounded-xl font-bold text-gray-400 hover:text-red-500 transition-colors"
                    onClick={() => setForm(emptyForm())}
                  >
                    Reset Form
                  </Button>
                  <Button
                    className="flex-1 md:flex-none h-11 px-10 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-theme-md font-bold tracking-tight"
                    disabled={submitMutation.isPending}
                    onClick={() => submitMutation.mutate()}
                  >
                    {submitMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
                    ) : (
                      "Kirim Pengajuan Sekarang"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="p-8 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col items-center text-center gap-3">
            <Clock className="h-10 w-10 text-amber-500" />
            <div className="max-w-md">
              <h4 className="text-sm font-bold text-amber-800 uppercase tracking-tight">Fitur Pengajuan Terbatas</h4>
              <p className="text-xs text-amber-700/70 mt-1">Hanya pengguna dengan role Transportir atau Rekanan yang dapat melakukan pengajuan unit armada baru.</p>
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Riwayat Pengajuan Unit</h2>
          <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800 mx-4" />
        </div>

        <Card className="border-none shadow-theme-xs bg-white dark:bg-white/[0.02]">
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              queryKey={["armada-review-baru", isCharterFilter]}
              fetcher={fetchHistory}
              rowKey={(row) => row.ID || Math.random()}
              searchPlaceholder="Cari Nopol, Rekanan, atau Status..."
              defaultPageSize={10}
              toolbar={
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={isCharterFilter} 
                      onChange={(e) => setIsCharterFilter(e.target.checked)}
                      className="w-4 h-4 accent-brand-600 rounded"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Hanya Charter</span>
                  </label>
                  <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-gray-400 hover:text-brand-600" onClick={() => queryClient.invalidateQueries({ queryKey: ["armada-review-baru"] })}>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Refresh
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {/* Sumbu Picker */}
      <Dialog open={sumbuOpen} onOpenChange={(o) => { setSumbuOpen(o); if (!o) setSumbuSearch(""); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-theme-lg">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-base font-bold uppercase tracking-tight">Pilih Konfigurasi Sumbu</DialogTitle>
            <DialogDescription className="text-xs">Konfigurasi menentukan Tonase Max armada.</DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10 h-10 rounded-xl bg-gray-50 border-gray-100" placeholder="Cari nama sumbu..." value={sumbuSearch} onChange={(e) => setSumbuSearch(e.target.value)} autoFocus />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {filteredSumbu.map((s) => (
                <button
                  key={s.Id}
                  className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all flex items-center justify-between group"
                  onClick={() => selectSumbu(s)}
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{s.nama}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{s.jenistruk}</p>
                  </div>
                  <Badge color="primary" variant="light">{s.muatan} TON</Badge>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Detail Modal */}
      <Dialog open={!!editId} onOpenChange={(o) => { if (!o) { setEditId(null); prevEditIdRef.current = null; } }}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0 border-none shadow-theme-lg bg-gray-50 dark:bg-gray-900">
          <DialogHeader className="p-6 border-b border-gray-100 bg-white dark:bg-gray-800 dark:border-gray-700 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-50 rounded-xl text-brand-600">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black uppercase tracking-tight">Review {"&"} Edit Pengajuan</DialogTitle>
                  <DialogDescription className="text-xs">ID Pengajuan: #{editId}</DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditId(null)} className="rounded-full">
                <X className="h-5 w-5 text-gray-400" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-8">
            {!detailData ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sinkronisasi Data...</p>
              </div>
            ) : (
              renderFormFields(editForm, setEF, "edit")
            )}
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3 sticky bottom-0 z-10">
            <Button variant="outline" className="h-10 px-6 rounded-xl font-bold text-xs" onClick={() => setEditId(null)}>Batal</Button>
            <Button
              className="h-10 px-8 rounded-xl bg-brand-600 hover:bg-brand-700 shadow-theme-sm font-bold text-xs"
              disabled={updateMutation.isPending || !detailData}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm p-6 text-center border-none shadow-theme-lg">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="h-8 w-8" />
          </div>
          <DialogTitle className="text-lg font-black uppercase tracking-tight mb-2">Hapus Pengajuan?</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mb-6">
            Apakah Anda yakin ingin menghapus data pengajuan armada ini? Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="rounded-xl font-bold h-10" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" className="rounded-xl font-bold h-10 shadow-theme-sm" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Data"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Viewer */}
      <Dialog open={!!viewFileUrl} onOpenChange={(o) => !o && setViewFileUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden border-none shadow-theme-lg bg-black">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <a href={viewFileUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="h-9 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md flex items-center gap-2 text-xs font-bold transition-all">
              <Eye className="h-4 w-4" /> Buka Tab Baru
            </a>
            <Button variant="ghost" size="icon" className="bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-md" onClick={() => setViewFileUrl(null)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="w-full h-full pt-16">
            {viewFileUrl && (
              <iframe src={viewFileUrl} className="w-full h-full border-none" title="Document Viewer" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
