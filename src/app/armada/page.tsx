"use client";
import React, { useState, useEffect } from "react";
import { Plus, FileEdit, Trash2, ExternalLink, Eye, FileText, Download, AlertCircle, X, Loader2, Ban, Unlock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useCompany } from "@/context/CompanyContext";
import { API_BASE } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";

interface FleetData {
  Nopol: string;
  __key?: string;
  VendorCode?: string;
  TransporterName?: string;
  NamaTransportir?: string;
  AxleName?: string;
  NamaSumbu?: string;
  Type?: string;
  IsVerified: boolean | number;
  ExpiryDate?: string;
  TglDaftar?: string;
  ID?: number;
  IsBlocked?: boolean;
  BlockedReason?: string;
  BlockedOn?: string;
}

const formatNopol = (val: string) => {
  const clean = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  // Format: X XXXX XXXX (Prefix Number Suffix)
  const match = clean.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`.trim();
  }
  return clean;
};

const getDaysUntil = (dateStr: string) => {
  if (!dateStr) return 999;
  try {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return 999;
    const expiry = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const diff = expiry.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  } catch {
    return 999;
  }
};

const toDateInputFormat = (dateStr: string) => {
  if (!dateStr) return "";
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.substring(0, 10);
  const parts = dateStr.substring(0, 10).split("-");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr.substring(0, 10);
};

const toDisplayFormat = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

export default function ArmadaPage() {
  const { data: session } = useSession();
  const { apiJson, apiFetch, apiTable } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { activeCompanyCode } = useCompany();
  const role = (session?.user as any)?.role;
  const companyCode = activeCompanyCode;
  const isRekanan = role === "rekanan" || role === "transport";

  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    Nopol: "",
    SumbuId: "",
    JenisKendaraan: "",
    QtyMax: "0",
    JBI: "0",
    BeratKendaraan: "0",
    BeratPenumpang: "0",
    TahunPembuatan: "",
    MasaBerlakuKir: "",
    NoRangkaStnk: "",
    NoMesinStnk: "",
    NoRangkaKir: "",
    NoMesinKir: "",
    Charter: false,
    Approver: ""
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("33");
  const [isExporting, setIsExporting] = useState(false);

  const [blokirTarget, setBlokirTarget] = useState<{ id: number; nextIsBlocked: boolean } | null>(null);
  const [blokirReason, setBlokirReason] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await apiFetch("/Armada/ExportArmada");
      if (!res.ok) throw new Error("Gagal mengunduh file export armada");
      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Attempt to get filename from Content-Disposition header
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "Export_Armada.xlsx";
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      addToast({ title: "Gagal Export", description: err.message || "Terjadi kesalahan sistem", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const { data: sumbuResult } = useQuery({
    queryKey: ["sumbu-list"],
    queryFn: async () => {
      const data = await apiJson("/api/Armada/SumbuData");
      return data.data || data || [];
    },
    enabled: isSubmitOpen || !!editId,
  });

  const { data: companyResult } = useQuery({
    queryKey: ["company-list"],
    queryFn: async () => {
      const data = await apiJson("/api/Company/getCompanyListFitur");
      return data || [];
    },
    enabled: isSubmitOpen || !!editId,
  });

  const { data: armadaDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["armada-detail", editId],
    queryFn: async () => {
      if (!editId) return null;
      const fd = new URLSearchParams();
      fd.append("ID", editId);
      const res = await apiFetch("/api/Armada/DetailData", {
        method: "POST",
        body: fd.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      const data = await res.json();
      return data || null;
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (armadaDetail) {
      setEditFormData({
        Nopol: armadaDetail.nopol || armadaDetail.Nopol || "",
        SumbuId: armadaDetail.sumbu || armadaDetail.Sumbu || "",
        JenisKendaraan: armadaDetail.jeniskendaraan || armadaDetail.JenisKendaraan || "",
        QtyMax: armadaDetail.qtymax || armadaDetail.QtyMax || "0",
        JBI: armadaDetail.jbi || armadaDetail.JBI || "0",
        BeratKendaraan: armadaDetail.beratkendaraan || armadaDetail.BeratKendaraan || "0",
        BeratPenumpang: armadaDetail.beratpenumpang || armadaDetail.BeratPenumpang || "0",
        TahunPembuatan: armadaDetail.tahun_pembuatan || armadaDetail.TahunPembuatan || "",
        MasaBerlakuKir: armadaDetail.masa_berlaku_kir_string || armadaDetail.MasaBerlakuKirString || "",
        NoRangkaStnk: armadaDetail.no_rangka_stnk || armadaDetail.NoRangkaStnk || "",
        NoMesinStnk: armadaDetail.no_mesin_stnk || armadaDetail.NoMesinStnk || "",
        NoRangkaKir: armadaDetail.no_rangka_kir || armadaDetail.NoRangkaKir || "",
        NoMesinKir: armadaDetail.no_mesin_kir || armadaDetail.NoMesinKir || "",
        Charter: (armadaDetail.charter || armadaDetail.Charter) === true,
        Approver: armadaDetail.approver || armadaDetail.Approver || "",
      });
    }
  }, [armadaDetail]);

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isRekanan) {
        // Rekanan: ChangeDataAsyc mengharapkan multipart/form-data (ada upload file)
        const fd = new FormData();
        fd.append("ID", editId!);
        if (armadaDetail?.TransportCode) {
          fd.append("TransportCode", armadaDetail.TransportCode);
        }
        fd.append("nopol", data.Nopol);
        fd.append("sumbu", data.SumbuId);
        fd.append("jeniskendaraan", data.JenisKendaraan);
        fd.append("qtymax", String(data.QtyMax || "0").replace(".", ","));
        fd.append("jbi", String(data.JBI || "0").replace(".", ","));
        fd.append("beratkendaraan", String(data.BeratKendaraan || "0").replace(".", ","));
        fd.append("beratpenumpang", String(data.BeratPenumpang || "0").replace(".", ","));
        fd.append("tahun_pembuatan", data.TahunPembuatan || "0");
        fd.append("masa_berlaku_kir", data.MasaBerlakuKir);
        fd.append("no_rangka_stnk", data.NoRangkaStnk);
        fd.append("no_mesin_stnk", data.NoMesinStnk);
        fd.append("no_rangka_kir", data.NoRangkaKir);
        fd.append("no_mesin_kir", data.NoMesinKir);
        fd.append("charterString", data.Charter ? "1" : "0");

        if (data.Approver) {
          fd.append("approver", data.Approver);
        } else if (armadaDetail?.approver) {
          fd.append("approver", armadaDetail.approver);
        }

        if (armadaDetail?.files1) fd.append("file1_before", armadaDetail.files1);
        if (armadaDetail?.files2) fd.append("file2_before", armadaDetail.files2);
        if (data.File1) fd.append("file1", data.File1);
        if (data.File2) fd.append("file2", data.File2);

        const res = await apiFetch("/api/Armada/ChangeDataAsyc", {
          method: "POST",
          body: fd,
        });
        return res;
      } else {
        // Admin / SuperAdmin / AdminArmada:
        // ChangeDataBaru mengharapkan JSON body (`ArmadaView param`),
        // bukan FormData — ASP.NET Web API POCO binding hanya bekerja via JSON.
        const payload: Record<string, any> = {
          ID: parseInt(editId!, 10),
          nopol: data.Nopol,
          sumbu: data.SumbuId,
          jeniskendaraan: data.JenisKendaraan,
          qtymax: parseFloat(String(data.QtyMax || "0").replace(",", ".")) || 0,
          jbi: parseFloat(String(data.JBI || "0").replace(",", ".")) || 0,
          beratkendaraan: parseFloat(String(data.BeratKendaraan || "0").replace(",", ".")) || 0,
          beratpenumpang: parseFloat(String(data.BeratPenumpang || "0").replace(",", ".")) || 0,
          tahun_pembuatan: parseInt(data.TahunPembuatan || "0", 10) || null,
          masa_berlaku_kir_string: data.MasaBerlakuKir || "",
          no_rangka_stnk: data.NoRangkaStnk || "",
          no_mesin_stnk: data.NoMesinStnk || "",
          no_rangka_kir: data.NoRangkaKir || "",
          no_mesin_kir: data.NoMesinKir || "",
          charterString: data.Charter ? "1" : "0",
          approver: data.Approver || armadaDetail?.approver || "",
        };

        const res = await apiFetch("/api/Armada/ChangeDataBaru", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return res;
      }
    },
    onSuccess: async (res) => {
      const text = typeof res === "string" ? res : await res.text().catch(() => "");
      if (text.includes("sukses") || text.includes("Sukses") || res.ok) {
        setEditId(null);
        queryClient.invalidateQueries({ queryKey: ["armada"] });
        addToast({ title: "Berhasil", description: "Perubahan armada berhasil disimpan.", variant: "default" });
      } else {
        addToast({ title: "Gagal", description: text || "Gagal menyimpan perubahan", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const fd = new FormData();
      fd.append("nopol", data.Nopol);
      fd.append("sumbu", data.SumbuId);
      fd.append("jeniskendaraan", data.JenisKendaraan);
      fd.append("qtymax", String(data.QtyMax || "0").replace(".", ","));
      fd.append("jbi", String(data.JBI || "0").replace(".", ","));
      fd.append("beratkendaraan", String(data.BeratKendaraan || "0").replace(".", ","));
      fd.append("beratpenumpang", String(data.BeratPenumpang || "0").replace(".", ","));
      fd.append("tahun_pembuatan", data.TahunPembuatan || "0");
      fd.append("masa_berlaku_kir", data.MasaBerlakuKir);
      fd.append("no_rangka_stnk", data.NoRangkaStnk);
      fd.append("no_mesin_stnk", data.NoMesinStnk);
      fd.append("no_rangka_kir", data.NoRangkaKir);
      fd.append("no_mesin_kir", data.NoMesinKir);
      fd.append("charterString", data.Charter ? "1" : "0");

      if (data.Approver) {
        fd.append("approver", data.Approver);
      }

      if (data.File1) fd.append("file1", data.File1);
      if (data.File2) fd.append("file2", data.File2);

      const res = await apiFetch("/api/Armada/AddBaru", {
        method: "POST",
        body: fd,
      });
      return res;
    },
    onSuccess: async (res) => {
      const text = typeof res === "string" ? res : await res.text().catch(() => "");
      if (text.includes("sukses") || res.ok) {
        addToast({ title: "Success", description: "Armada berhasil diajukan untuk verifikasi", variant: "success" });
        setIsSubmitOpen(false);
        setFormData({
          Nopol: "", SumbuId: "", JenisKendaraan: "", QtyMax: "0", JBI: "0",
          BeratKendaraan: "0", BeratPenumpang: "0", TahunPembuatan: "",
          MasaBerlakuKir: "", NoRangkaStnk: "", NoMesinStnk: "",
          NoRangkaKir: "", NoMesinKir: "", Charter: false, Approver: ""
        });
        queryClient.invalidateQueries({ queryKey: ["armada"] });
      } else {
        addToast({ title: "Gagal", description: text || "Gagal mengajukan armada", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, alasan }: { id: string; alasan: string }) => {
      const fd = new URLSearchParams();
      fd.append("ID", id);
      fd.append("nopol", alasan); // ASP.NET expects reason inside 'nopol' property

      const res = await apiFetch("/api/Armada/DeleteData", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: fd.toString(),
      });
      return res;
    },
    onSuccess: (res: any) => {
      setDeleteId(null);
      if (typeof res === "string" && res.includes("sukses")) {
        addToast({ title: "Berhasil", description: "Armada telah dihapus.", variant: "default" });
        queryClient.invalidateQueries({ queryKey: ["armada"] });
      } else {
        addToast({ title: "Gagal", description: typeof res === "string" ? res : "Gagal menghapus armada", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const blokirMutation = useMutation({
    mutationFn: async ({ id, isBlocked, reason }: { id: number; isBlocked: boolean; reason: string }) => {
      const res = await apiFetch("/api/Armada/ToggleBlokir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ID: id, IsBlocked: isBlocked, Reason: reason }),
      });
      return res;
    },
    onSuccess: (_res: any, variables) => {
      setBlokirTarget(null);
      setBlokirReason("");
      addToast({
        title: "Berhasil",
        description: variables.isBlocked ? "Armada telah diblokir." : "Blokir armada telah dibuka.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["armada"] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const fetcher = async (params: DataTableParams) => {
    const expiryColIndex = columns.findIndex(c => c.key === "Expiry");
    const payload: any = {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: params.search || "",
      order: params.order?.length ? params.order : [
        {
          column: expiryColIndex !== -1 ? expiryColIndex : 0,
          dir: "asc"
        }
      ],
      columns: columns.map((col, idx) => {
        let name = col.key;
        if (col.key === "Nopol") name = "Armada1.nopol";
        else if (col.key === "Tahun") name = "Armada1.tahun_pembuatan";
        else if (col.key === "Transportir") name = "Armada1.Transport.nama";
        else if (col.key === "KodeVendor") name = "Armada1.TransportCode";
        else if (col.key === "JenisKendaraan") name = "Armada1.jeniskendaraan";
        else if (col.key === "Sumbu") name = "Armada1.sumbu";
        else if (col.key === "QtyMax") name = "Armada1.qtymax";
        else if (col.key === "JBI") name = "Armada1.jbi";
        else if (col.key === "BeratKendaraan") name = "Armada1.beratkendaraan";
        else if (col.key === "NoRangka") name = "Armada1.no_rangka_stnk";
        else if (col.key === "NoMesin") name = "Armada1.no_mesin_stnk";
        else if (col.key === "Status") name = "Armada1.isVerified";
        else if (col.key === "Approver") name = "company_code";
        else if (col.key === "Expiry") name = "Armada1.masa_berlaku_kir";

        return {
          data: col.key,
          name: name,
          searchable: true,
          orderable: true,
          search: { value: "", regex: false }
        };
      })
    };
    if (companyCode) payload.companyCode = companyCode;

    try {
      const result = await apiTable("/api/Armada/DataTable", payload);

      if (typeof result === "string") throw new Error(result);

      return {
        data: (result.data ?? []).map((item: any, index: number) => {
          const idMatch = item.Action?.match(/(?:edit|delete)ItemProcess\('([^']+)'\)/);
          const stableId = idMatch ? idMatch[1] : (item.ID || item.id || `temp-${index}`);
          return { ...item, __key: `${stableId}-${index}` };
        }),
        recordsTotal: result.recordsTotal ?? 0,
        recordsFiltered: result.recordsFiltered ?? result.recordsTotal ?? 0,
      };
    } catch (error: any) {
      console.error("Armada API CRASH:", error);
      throw error;
    }
  };

  const columns: DataTableColumn<FleetData>[] = [
    {
      key: "Nopol",
      header: "Nopol",
      render: (f: any) => (
        <div className="flex items-center gap-2">
          <div className="bg-gray-900 text-white px-2 py-1 rounded font-mono text-sm font-bold shadow-sm whitespace-nowrap">
            {f.nopol || f.Nopol || "-"}
          </div>
          {f.charterString && <span className="bg-brand-500 text-[10px] px-1.5 py-0.5 rounded text-white uppercase">Charter</span>}
        </div>
      ),
    },
    {
      key: "Tahun",
      header: "Tahun",
      render: (f: any) => <span className="font-mono">{f.tahun_pembuatan || "-"}</span>,
    },
    ...(!isRekanan
      ? [{
        key: "Transportir",
        header: "Transportir",
        render: (f: any) => (
          <span className="text-sm font-bold text-gray-900 dark:text-white uppercase whitespace-nowrap">
            {f.transportir || f.transporterName || f.TransporterName || "-"}
          </span>
        ),
      },
      {
        key: "KodeVendor",
        header: "Kode Vendor",
        render: (f: any) => (
          <span className="font-mono text-xs text-gray-500">{f.username || f.TransportCode || "-"}</span>
        ),
      }]
      : []),
    {
      key: "JenisKendaraan",
      header: "Jenis Kendaraan",
      render: (f: any) => <span className="text-xs font-bold whitespace-nowrap">{f.jeniskendaraan || f.type || f.Type || "-"}</span>,
    },
    {
      key: "Sumbu",
      header: "Sumbu",
      render: (f: any) => <span className="text-xs">{f.sumbu || f.axleName || f.AxleName || "-"}</span>,
    },
    {
      key: "QtyMax",
      header: "Max Qty (T)",
      className: "text-right font-bold",
      render: (f: any) => f.qtymax || "0",
    },
    {
      key: "JBI",
      header: "JBI (T)",
      className: "text-right",
      render: (f: any) => f.jbi || "0",
    },
    {
      key: "BeratKendaraan",
      header: "Berat (T)",
      className: "text-right text-gray-500",
      render: (f: any) => f.beratkendaraan || "0",
    },
    {
      key: "NoRangka",
      header: "No Rangka",
      render: (f: any) => <span className="font-mono text-xs whitespace-nowrap">{f.no_rangka_stnk || f.no_rangka_kir || "-"}</span>,
    },
    {
      key: "NoMesin",
      header: "No Mesin",
      render: (f: any) => <span className="font-mono text-xs whitespace-nowrap">{f.no_mesin_stnk || f.no_mesin_kir || "-"}</span>,
    },
    {
      key: "Dokumen",
      header: "Dokumen",
      headerClassName: "text-center",
      className: "text-center",
      render: (f: any) => {
        const kirUrl = f.files1 || f.Files1;
        const stnkUrl = f.files2 || f.Files2;

        // Helper to check if string is a valid non-empty URL
        const isValidUrl = (url: any) => url && typeof url === "string" && url.trim() !== "" && url !== "null";

        return (
          <div className="flex items-center justify-center gap-2">
            {isValidUrl(kirUrl) && (
              <a
                href={kirUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-brand-50 text-brand-600 border border-brand-100 hover:bg-brand-600 hover:text-white transition-all shadow-sm"
                title="Lihat Dokumen 1"
              >
                <FileText className="h-4 w-4" />
              </a>
            )}
            {isValidUrl(stnkUrl) && (
              <a
                href={stnkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                title="Lihat Dokumen 2"
              >
                <FileText className="h-4 w-4" />
              </a>
            )}
            {!isValidUrl(kirUrl) && !isValidUrl(stnkUrl) && <span className="text-gray-200">-</span>}
          </div>
        );
      },
    },
    {
      key: "Status",
      header: "Status",
      render: (f: any) => {
        const isVerified = f.isVerified ?? f.IsVerified ?? f.status ?? f.Status ?? true;
        return (
          <Badge color={isVerified ? "success" : "warning"} size="sm" variant="light" className="whitespace-nowrap">
            {isVerified ? "Active" : "Pending"}
          </Badge>
        );
      },
    },
    {
      key: "Blokir",
      header: "Blokir",
      render: (f: any) => {
        const isBlocked = f.isBlocked ?? f.IsBlocked ?? false;
        return (
          <Badge color={isBlocked ? "error" : "success"} size="sm" variant="light" className="whitespace-nowrap">
            {isBlocked ? "Diblokir" : "Aktif"}
          </Badge>
        );
      },
    },
    {
      key: "Approver",
      header: "Approver",
      render: (f: any) => <span className="text-xs uppercase font-bold text-gray-500">{f.approver || "-"}</span>,
    },
    {
      key: "Expiry",
      header: "Expiry KIR",
      render: (f: any) => {
        const expiry = f.masa_berlaku_kir_string || f.expiryDate || f.ExpiryDate || f.tglDaftar || f.TglDaftar;
        const daysLeft = getDaysUntil(expiry);
        const isUrgent = daysLeft <= 30;

        return expiry ? (
          <div className="flex flex-col items-end">
            <span className={`text-[11px] font-bold px-2 py-1 rounded whitespace-nowrap flex items-center gap-1 ${isUrgent
              ? "text-white bg-red-600 animate-pulse shadow-sm"
              : "text-red-600 bg-red-50 dark:bg-red-500/10"
              }`}>
              {isUrgent && <AlertCircle className="h-3 w-3" />}
              {expiry}
            </span>
            {isUrgent && (
              <span className="text-[9px] font-bold text-red-500 uppercase mt-0.5 tracking-tighter">
                {daysLeft < 0 ? "Kadaluwarsa" : `H-${daysLeft} Hari`}
              </span>
            )}
          </div>
        ) : "-";
      },
    },
    {
      key: "Action",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      render: (f: any) => {
        // C# API returns an HTML string for Action with embedded JS calls (e.g. editItemProcess('123')).
        // We extract the ID using Regex to bring the functionality natively to Next.js.
        const editMatch = f.Action?.match(/editItemProcess\('([^']+)'\)/);
        const deleteMatch = f.Action?.match(/deleteItemProcess\('([^']+)'\)/);

        const editId = editMatch ? editMatch[1] : null;
        const deleteId = deleteMatch ? deleteMatch[1] : null;
        const armadaId: number | null = f.ID ?? f.id ?? null;
        const isBlocked = f.isBlocked ?? f.IsBlocked ?? false;

        if (!editId && !deleteId && !armadaId) return <span className="text-gray-400 italic text-xs">No Action</span>;

        return (
          <div className="flex items-center justify-end gap-1">
            {editId && (
              <Button
                variant="outline"
                size="sm"
                className="text-amber-500 border-amber-200 hover:bg-amber-50 bg-white dark:bg-transparent h-7 px-2"
                onClick={() => setEditId(editId)}
              >
                <FileEdit className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
            {deleteId && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50 bg-white dark:bg-transparent h-7 px-2"
                onClick={() => setDeleteId(deleteId)}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Hapus
              </Button>
            )}
            {!isRekanan && armadaId != null && (
              <Button
                variant="outline"
                size="sm"
                className={isBlocked
                  ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-white dark:bg-transparent h-7 px-2"
                  : "text-gray-600 border-gray-200 hover:bg-gray-50 bg-white dark:bg-transparent h-7 px-2"}
                onClick={() => setBlokirTarget({ id: armadaId, nextIsBlocked: !isBlocked })}
              >
                {isBlocked ? <Unlock className="h-3 w-3 mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                {isBlocked ? "Buka Blokir" : "Blokir"}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Wire up header-click sorting: index must match the backend `columns` array built in
  // `fetcher` above, which mirrors this array's order 1:1 (including the conditional
  // Transportir/KodeVendor entries), so we derive it from actual position rather than
  // hardcoding numbers that would drift when isRekanan changes the array shape.
  // Dokumen/Action are left out: neither has a real backend field mapping in fetcher.
  const sortableKeys = new Set([
    "Nopol", "Tahun", "Transportir", "KodeVendor", "JenisKendaraan", "Sumbu",
    "QtyMax", "JBI", "BeratKendaraan", "NoRangka", "NoMesin", "Status", "Approver", "Expiry",
  ]);
  columns.forEach((col, idx) => {
    if (sortableKeys.has(col.key)) col.sortColumn = idx;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {isRekanan ? "Data Armada" : "Manajemen Armada"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {isRekanan
              ? "Daftar unit kendaraan Anda yang terdaftar di sistem SISTRO."
              : "Kelola daftar kendaraan, perizinan, dan status operasional armada global."}
          </p>
        </div>
      </div>

      <Card className="shadow-theme-xs">
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["armada", role, companyCode]}
            fetcher={fetcher}
            rowKey={(f) => f.__key}
            searchPlaceholder={isRekanan ? "Cari Nopol..." : "Cari Nopol atau Transporter..."}
            toolbar={
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  variant="outline"
                  className="h-8 px-3 py-1 text-green-600 border-green-200 hover:bg-green-50 shadow-sm"
                >
                  {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Export Excel
                </Button>
                {isRekanan ? (
                  <Button size="sm" onClick={() => setIsSubmitOpen(true)} className="bg-brand-500 shadow-lg shadow-brand-500/20 h-8">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Unit Baru
                  </Button>
                ) : (
                  <Badge color="info" variant="light">Admin View</Badge>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* Submission Modal for Rekanan */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pengajuan Armada Baru</DialogTitle>
            <DialogDescription>Daftarkan unit kendaraan baru Anda untuk diverifikasi oleh admin.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-brand-600 border-b pb-2 uppercase">Identitas & Legalitas</h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Nomor Polisi</label>
                <Input
                  placeholder="Contoh: W 1234 AB"
                  value={formData.Nopol}
                  onChange={(e) => setFormData({ ...formData, Nopol: formatNopol(e.target.value) })}
                  className="font-bold uppercase h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Masa Berlaku KIR (DD-MM-YYYY)</label>
                <Input
                  type="date"
                  placeholder="DD-MM-YYYY"
                  value={toDateInputFormat(formData.MasaBerlakuKir)}
                  onChange={(e) => setFormData({ ...formData, MasaBerlakuKir: toDisplayFormat(e.target.value) })}
                  className="h-10 rounded-lg block w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Rangka STNK</label>
                  <Input value={formData.NoRangkaStnk} onChange={(e) => setFormData({ ...formData, NoRangkaStnk: e.target.value })} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Mesin STNK</label>
                  <Input value={formData.NoMesinStnk} onChange={(e) => setFormData({ ...formData, NoMesinStnk: e.target.value })} className="h-10 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Rangka KIR</label>
                  <Input value={formData.NoRangkaKir} onChange={(e) => setFormData({ ...formData, NoRangkaKir: e.target.value })} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Mesin KIR</label>
                  <Input value={formData.NoMesinKir} onChange={(e) => setFormData({ ...formData, NoMesinKir: e.target.value })} className="h-10 rounded-lg" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-sm text-brand-600 border-b pb-2 uppercase">Spesifikasi & Verifikasi</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Jenis Sumbu</label>
                  <select
                    className="w-full h-10 px-3 border border-gray-100 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500"
                    value={formData.SumbuId}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selected = sumbuResult?.find((s: any) => s.nama === val);
                      setFormData({
                        ...formData,
                        SumbuId: val,
                        JenisKendaraan: selected?.jenistruk || "",
                        QtyMax: selected?.muatan || "0"
                      });
                    }}
                  >
                    <option value="">Pilih Sumbu...</option>
                    {sumbuResult?.map((s: any) => (
                      <option key={s.Id} value={s.nama}>{s.nama}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Tipe Kendaraan</label>
                  <Input
                    placeholder="Auto-filled"
                    value={formData.JenisKendaraan}
                    disabled
                    className="font-bold h-10 rounded-lg bg-gray-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Kapasitas (TON)</label>
                  <Input
                    type="number"
                    value={formData.QtyMax}
                    disabled
                    className="h-10 rounded-lg bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">JBI (KG)</label>
                  <Input type="number" min="0" value={formData.JBI} onChange={(e) => setFormData({ ...formData, JBI: e.target.value })} className="h-10 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Berat Kosong (KG)</label>
                  <Input type="number" min="0" value={formData.BeratKendaraan} onChange={(e) => setFormData({ ...formData, BeratKendaraan: e.target.value })} className="h-10 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Berat Penumpang (KG)</label>
                  <Input type="number" min="0" value={formData.BeratPenumpang} onChange={(e) => setFormData({ ...formData, BeratPenumpang: e.target.value })} className="h-10 rounded-lg" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Tahun Buat</label>
                <Input type="number" min="0" value={formData.TahunPembuatan} onChange={(e) => setFormData({ ...formData, TahunPembuatan: e.target.value })} className="h-10 rounded-lg" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Submit Ke (Approver)</label>
                <select
                  className="w-full h-10 px-3 border border-gray-100 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500"
                  value={formData.Approver}
                  onChange={(e) => setFormData({ ...formData, Approver: e.target.value })}
                >
                  <option value="">Pilih Approver...</option>
                  {companyResult?.map((c: any) => (
                    <option key={c.company_code} value={c.company_code}>{c.company}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Lampiran Dokumen 1</label>
                  <Input type="file" className="h-10 text-xs" onChange={(e) => setFormData({ ...formData, File1: e.target.files?.[0] })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Lampiran Dokumen 2</label>
                  <Input type="file" className="h-10 text-xs" onChange={(e) => setFormData({ ...formData, File2: e.target.files?.[0] })} />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 italic ml-1">
                * Anda dapat mengunggah dokumen KIR/STNK yang digabung dalam satu file pada Lampiran Dokumen 1.
              </p>
            </div>
          </div>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsSubmitOpen(false)}>Batal</Button>
            <Button className="bg-brand-500 text-white hover:bg-brand-600" onClick={() => submitMutation.mutate(formData)} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Mengajukan..." : "Ajukan Unit Baru"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Armada</DialogTitle>
            <DialogDescription>Masukkan alasan penghapusan unit armada ini dari sistem.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 mb-2 block">Alasan Hapus</label>
            <select
              className="w-full h-11 px-3 border border-gray-100 rounded-xl bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition-shadow"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            >
              <option value="33">Double (Duplikat)</option>
              <option value="Pensiun">Unit Rusak / Pensiun</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: deleteId!, alasan: deleteReason })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Armada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blokir/Unblock Confirm Dialog */}
      <ConfirmDialog
        open={!!blokirTarget}
        onOpenChange={(open) => { if (!open) { setBlokirTarget(null); setBlokirReason(""); } }}
        title={blokirTarget?.nextIsBlocked ? "Blokir Armada" : "Buka Blokir Armada"}
        description={blokirTarget?.nextIsBlocked
          ? "Armada yang diblokir tidak akan bisa dipilih saat pembuatan tiket baru."
          : "Armada ini akan bisa dipilih kembali saat pembuatan tiket baru."}
        onConfirm={() => { if (blokirTarget) blokirMutation.mutate({ id: blokirTarget.id, isBlocked: blokirTarget.nextIsBlocked, reason: blokirReason }); }}
        confirmText={blokirMutation.isPending ? "Memproses..." : blokirTarget?.nextIsBlocked ? "Ya, Blokir" : "Ya, Buka Blokir"}
        cancelText="Batal"
        variant={blokirTarget?.nextIsBlocked ? "danger" : "warning"}
        isLoading={blokirMutation.isPending}
      >
        {blokirTarget?.nextIsBlocked && (
          <div>
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 mb-2 block">Alasan Blokir</label>
            <Input
              value={blokirReason}
              onChange={(e) => setBlokirReason(e.target.value)}
              placeholder="Contoh: KIR bermasalah, unit rusak, dsb."
            />
          </div>
        )}
      </ConfirmDialog>

      {/* Edit Modal */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Armada</DialogTitle>
            <DialogDescription>Perbarui informasi teknis dan kelengkapan unit armada.</DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-12 flex justify-center text-sm text-gray-500">Memuat data...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-brand-600 border-b pb-2 uppercase">Identitas & Legalitas</h3>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Nomor Polisi</label>
                  <Input value={editFormData.Nopol || ""} onChange={(e) => setEditFormData({ ...editFormData, Nopol: e.target.value })} className="font-bold uppercase h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Masa Berlaku KIR (DD-MM-YYYY)</label>
                  <Input type="date" value={toDateInputFormat(editFormData.MasaBerlakuKir || "")} onChange={(e) => setEditFormData({ ...editFormData, MasaBerlakuKir: toDisplayFormat(e.target.value) })} className="h-10 block w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Rangka STNK</label>
                    <Input value={editFormData.NoRangkaStnk || ""} onChange={(e) => setEditFormData({ ...editFormData, NoRangkaStnk: e.target.value })} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Mesin STNK</label>
                    <Input value={editFormData.NoMesinStnk || ""} onChange={(e) => setEditFormData({ ...editFormData, NoMesinStnk: e.target.value })} className="h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Rangka KIR</label>
                    <Input value={editFormData.NoRangkaKir || ""} onChange={(e) => setEditFormData({ ...editFormData, NoRangkaKir: e.target.value })} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Mesin KIR</label>
                    <Input value={editFormData.NoMesinKir || ""} onChange={(e) => setEditFormData({ ...editFormData, NoMesinKir: e.target.value })} className="h-10" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-sm text-brand-600 border-b pb-2 uppercase">Spesifikasi Teknis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Sumbu</label>
                    <select
                      className="w-full h-10 px-3 border border-gray-100 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500"
                      value={editFormData.SumbuId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const selected = sumbuResult?.find((s: any) => s.nama === val);
                        setEditFormData({
                          ...editFormData,
                          SumbuId: val,
                          JenisKendaraan: selected?.jenistruk || "",
                          QtyMax: selected?.muatan || "0"
                        });
                      }}
                    >
                      <option value="">Pilih Sumbu...</option>
                      {sumbuResult?.map((s: any) => (
                        <option key={s.Id} value={s.nama}>{s.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Jenis Kendaraan</label>
                    <Input value={editFormData.JenisKendaraan || ""} disabled className="h-10 bg-gray-50 font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Kapasitas (TON)</label>
                    <Input type="number" value={editFormData.QtyMax || ""} disabled className="h-10 bg-gray-50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">JBI (KG)</label>
                    <Input type="number" min="0" value={editFormData.JBI || ""} onChange={(e) => setEditFormData({ ...editFormData, JBI: e.target.value })} className="h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Berat Kosong (KG)</label>
                    <Input type="number" min="0" value={editFormData.BeratKendaraan || ""} onChange={(e) => setEditFormData({ ...editFormData, BeratKendaraan: e.target.value })} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Berat Penumpang (KG)</label>
                    <Input type="number" min="0" value={editFormData.BeratPenumpang || ""} onChange={(e) => setEditFormData({ ...editFormData, BeratPenumpang: e.target.value })} className="h-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Tahun Buat</label>
                  <Input type="number" min="0" value={editFormData.TahunPembuatan || ""} onChange={(e) => setEditFormData({ ...editFormData, TahunPembuatan: e.target.value })} className="h-10" />
                </div>

                {isRekanan && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-bold text-sm text-brand-600 uppercase">Verifikasi & Dokumen</h3>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Submit Ke (Approver)</label>
                      <select
                        className="w-full h-10 px-3 border border-gray-100 rounded-lg bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500"
                        value={editFormData.Approver || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, Approver: e.target.value })}
                      >
                        <option value="">Pilih Approver...</option>
                        {companyResult?.map((c: any) => (
                          <option key={c.company_code} value={c.company_code}>{c.company}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 flex items-center justify-between">
                          <span>Lampiran Dokumen 1 (KIR/STNK)</span>
                          {armadaDetail?.files1 && armadaDetail.files1 !== "" && armadaDetail.files1 !== "null" && (
                            <div className="flex items-center gap-2">
                              <a
                                href={armadaDetail.files1}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-600 hover:text-brand-700 flex items-center gap-1 normal-case font-bold"
                              >
                                <FileText className="h-3 w-3" /> Lihat Dokumen 1
                              </a>
                              {(!armadaDetail.isVerified || armadaDetail.status === "Revised" || armadaDetail.status === "Rejected") && (
                                <button
                                  onClick={() => setEditFormData({ ...editFormData, files1: "", File1: null })}
                                  className="text-red-500 hover:text-red-600 p-0.5"
                                  title="Hapus Attachment"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </label>
                        <Input
                          type="file"
                          className="h-10 text-xs"
                          onChange={(e) => setEditFormData({ ...editFormData, File1: e.target.files?.[0] })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 flex items-center justify-between">
                          <span>Lampiran Dokumen 2 (Opsional)</span>
                          {armadaDetail?.files2 && armadaDetail.files2 !== "" && armadaDetail.files2 !== "null" && (
                            <div className="flex items-center gap-2">
                              <a
                                href={armadaDetail.files2}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 normal-case font-bold"
                              >
                                <FileText className="h-3 w-3" /> Lihat Dokumen 2
                              </a>
                              {(!armadaDetail.isVerified || armadaDetail.status === "Revised" || armadaDetail.status === "Rejected") && (
                                <button
                                  onClick={() => setEditFormData({ ...editFormData, files2: "", File2: null })}
                                  className="text-red-500 hover:text-red-600 p-0.5"
                                  title="Hapus Attachment"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </label>
                        <Input
                          type="file"
                          className="h-10 text-xs"
                          onChange={(e) => setEditFormData({ ...editFormData, File2: e.target.files?.[0] })}
                        />
                      </div>
                    </div>
                    {editFormData.MasaBerlakuKir !== armadaDetail?.masa_berlaku_kir_string && (
                      <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded border border-amber-100">
                        INFO: Tanggal KIR berubah. Anda WAJIB mengunggah dokumen KIR terbaru.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 border-t pt-4">
            <Button variant="outline" onClick={() => setEditId(null)}>Batal</Button>
            <Button className="bg-brand-600 text-white hover:bg-brand-700" onClick={() => editMutation.mutate(editFormData)} disabled={editMutation.isPending || isLoadingDetail}>
              {editMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
