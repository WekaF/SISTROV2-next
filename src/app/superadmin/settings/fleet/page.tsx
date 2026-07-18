"use client";
import React, { useState, useEffect } from "react";
import {
  Truck,
  Search,
  ArrowRightLeft,
  MapPin,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
  X,
  ShieldCheck,
  Layers,
  Ban,
  Unlock,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { MultiSelect } from "@/components/ui/MultiSelect";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ArmadaRow {
  no: number;
  id: number;
  transportCode: string;
  nopol: string;
  updatedBy: string;
  updatedOn: string | null;
  sumbu: string;
  jenisKendaraan: string;
  qtyMax: number | null;
  kir: string;
  jbi: number | null;
  beratKendaraan: number | null;
  beratPenumpang: number | null;
  approver: string;
  approve: boolean | null;
  revised: string;
  charter: boolean | null;
  tahunPembuatan: number | null;
  noRangkaStnk: string;
  noMesinStnk: string;
  masaBerlakuKir: string | null;
  noRangkaKir: string;
  noMesinKir: string;
  statusArmada: string;
  mappingCount: number;
  plants: string;
  isBlocked: boolean;
  blockedOn: string | null;
  blockedReason: string | null;
}

interface ArmadaMappingDetail {
  Id: number;
  ArmadaId: number | null;
  CompanyCode: string;
  CompanyName: string;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "-";
  return n.toLocaleString("id-ID");
}

function isKirExpired(masaBerlakuKir: string | null): boolean {
  if (!masaBerlakuKir) return false;
  return new Date(masaBerlakuKir) < new Date();
}

export default function FleetSettingsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const [selectedArmada, setSelectedArmada] = useState<ArmadaRow | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [armadaMappings, setArmadaMappings] = useState<ArmadaMappingDetail[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showDeleteMappingConfirm, setShowDeleteMappingConfirm] = useState(false);

  const [blokirTarget, setBlokirTarget] = useState<{ id: number; nextIsBlocked: boolean } | null>(null);
  const [blokirReason, setBlokirReason] = useState("");
  const [targetDeleteMappingId, setTargetDeleteMappingId] = useState<number | null>(null);

  const {
    data: armadaData,
    isLoading,
    isFetching,
    refetch,
    isError,
    error,
  } = useQuery({
    queryKey: ["superadmin-armada", debouncedSearch, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/armada?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${limit}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
  });

  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await fetch("/api/admin/companies");
      return res.json();
    },
  });

  const armada: ArmadaRow[] = armadaData?.data || [];
  const pagination = armadaData?.pagination || { total: 0, totalPages: 0 };
  const companies = companiesData?.data || [];

  const totalArmada = pagination.total;
  const mappedCount = armada.filter((a) => a.mappingCount > 0).length;
  const approvedCount = armada.filter((a) => a.approve === true).length;

  const fetchMappings = async (armadaId: number) => {
    setLoadingMappings(true);
    try {
      const res = await fetch(`/api/admin/armada/mapping?armadaId=${armadaId}`);
      const data = await res.json();
      if (data.success) setArmadaMappings(data.data);
    } catch {
      // silent
    } finally {
      setLoadingMappings(false);
    }
  };

  useEffect(() => {
    if (showMappingModal && selectedArmada) fetchMappings(selectedArmada.id);
  }, [showMappingModal, selectedArmada]);

  const addMappingMutation = useMutation({
    mutationFn: async ({ armadaId, companyCodes }: { armadaId: number; companyCodes: string[] }) => {
      await Promise.all(
        companyCodes.map(async (companyCode) => {
          const res = await fetch("/api/admin/armada/mapping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ armadaId, companyCode }),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || `Gagal map ${companyCode}`);
        })
      );
    },
    onSuccess: (_, variables) => {
      addToast({ title: "Mapping Berhasil", description: `${variables.companyCodes.length} plant dipetakan.`, variant: "success" });
      setSelectedCompanies([]);
      if (selectedArmada) fetchMappings(selectedArmada.id);
      queryClient.invalidateQueries({ queryKey: ["superadmin-armada"] });
    },
    onError: (err: Error) => {
      addToast({ title: "Gagal Mapping", description: err.message, variant: "destructive" });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/armada/mapping?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      addToast({ title: "Mapping Dihapus", variant: "success" });
      if (selectedArmada) fetchMappings(selectedArmada.id);
      queryClient.invalidateQueries({ queryKey: ["superadmin-armada"] });
    },
    onError: (err: Error) => {
      addToast({ title: "Gagal Menghapus", description: err.message, variant: "destructive" });
    },
  });

  const blokirMutation = useMutation({
    mutationFn: async ({ id, isBlocked, reason }: { id: number; isBlocked: boolean; reason: string }) => {
      const res = await fetch("/api/admin/armada/toggle-blokir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isBlocked, reason }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: (_data, variables) => {
      setBlokirTarget(null);
      setBlokirReason("");
      addToast({
        title: "Berhasil",
        description: variables.isBlocked ? "Armada telah diblokir." : "Blokir armada telah dibuka.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["superadmin-armada"] });
    },
    onError: (err: Error) => {
      addToast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const handleAddMapping = () => {
    if (!selectedArmada || selectedCompanies.length === 0) return;
    addMappingMutation.mutate({ armadaId: selectedArmada.id, companyCodes: selectedCompanies });
  };

  const handleDeleteMapping = () => {
    if (!targetDeleteMappingId) return;
    deleteMappingMutation.mutate(targetDeleteMappingId);
    setTargetDeleteMappingId(null);
  };

  const thClass = "px-3 py-3 text-[10px] font-black uppercase text-gray-500 tracking-widest whitespace-nowrap";
  const tdClass = "px-3 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            Master Armada (Superadmin)
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Kelola data armada global dan mapping ke plant/company.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["superadmin-armada"] })}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-theme-xs">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-50 text-brand-500 rounded-2xl dark:bg-brand-500/10">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Total Armada</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{totalArmada}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-theme-xs border-indigo-100 dark:border-indigo-900/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-500 rounded-2xl dark:bg-indigo-500/10">
                <Layers className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Sudah Di-Mapping</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{mappedCount}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-theme-xs border-emerald-100 dark:border-emerald-900/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl dark:bg-emerald-500/10">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Approved</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{approvedCount}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Cari nopol, transport code, jenis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-white/[0.01]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className={thClass}>No</th>
                  <th className={thClass}>Nopol</th>
                  <th className={thClass}>Transport Code</th>
                  <th className={thClass}>Jenis Kendaraan</th>
                  <th className={thClass}>Sumbu</th>
                  <th className={thClass}>Qty Max</th>
                  <th className={thClass}>JBI</th>
                  <th className={thClass}>Berat Kend.</th>
                  <th className={thClass}>Berat Penum.</th>
                  <th className={thClass}>KIR</th>
                  <th className={thClass}>Masa KIR</th>
                  <th className={thClass}>No Rangka STNK</th>
                  <th className={thClass}>No Mesin STNK</th>
                  <th className={thClass}>No Rangka KIR</th>
                  <th className={thClass}>No Mesin KIR</th>
                  <th className={thClass}>Tahun</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Approve</th>
                  <th className={thClass}>Approver</th>
                  <th className={thClass}>Charter</th>
                  <th className={thClass}>Revised</th>
                  <th className={thClass}>Updated By</th>
                  <th className={thClass}>Updated On</th>
                  <th className={thClass}>Mapping</th>
                  <th className={thClass}>Blokir</th>
                  <th className={thClass + " text-right"}>Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={26} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                        Memuat data armada...
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={26} className="px-6 py-12 text-center text-rose-500">
                      <div className="flex flex-col items-center gap-2">
                        <X className="h-8 w-8" />
                        Gagal memuat: {(error as Error)?.message}
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                          Coba Lagi
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : armada.length === 0 ? (
                  <tr>
                    <td colSpan={26} className="px-6 py-12 text-center text-gray-400 italic">
                      Tidak ada data armada.
                    </td>
                  </tr>
                ) : (
                  armada.map((a) => {
                    const kirExpired = isKirExpired(a.masaBerlakuKir);
                    return (
                      <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <td className={tdClass + " text-gray-400 font-mono"}>{a.no}</td>
                        <td className={tdClass}>
                          <div className="bg-gray-900 text-white px-2 py-1 rounded font-mono text-xs font-bold shadow-sm inline-block">
                            {a.nopol || "-"}
                          </div>
                        </td>
                        <td className={tdClass + " font-mono text-gray-500"}>{a.transportCode || "-"}</td>
                        <td className={tdClass}>{a.jenisKendaraan || "-"}</td>
                        <td className={tdClass}>{a.sumbu || "-"}</td>
                        <td className={tdClass + " text-right font-mono"}>{fmtNum(a.qtyMax)}</td>
                        <td className={tdClass + " text-right font-mono"}>{fmtNum(a.jbi)}</td>
                        <td className={tdClass + " text-right font-mono"}>{fmtNum(a.beratKendaraan)}</td>
                        <td className={tdClass + " text-right font-mono"}>{fmtNum(a.beratPenumpang)}</td>
                        <td className={tdClass + " max-w-[120px] truncate"} title={a.kir}>{a.kir || "-"}</td>
                        <td className={tdClass}>
                          <span className={kirExpired ? "text-rose-500 font-bold" : ""}>
                            {fmtDate(a.masaBerlakuKir)}
                          </span>
                        </td>
                        <td className={tdClass + " font-mono text-[11px]"}>{a.noRangkaStnk || "-"}</td>
                        <td className={tdClass + " font-mono text-[11px]"}>{a.noMesinStnk || "-"}</td>
                        <td className={tdClass + " font-mono text-[11px]"}>{a.noRangkaKir || "-"}</td>
                        <td className={tdClass + " font-mono text-[11px]"}>{a.noMesinKir || "-"}</td>
                        <td className={tdClass}>{a.tahunPembuatan ?? "-"}</td>
                        <td className={tdClass}>
                          {a.statusArmada ? (
                            <Badge
                              color={a.statusArmada.toLowerCase() === "aktif" ? "success" : "warning"}
                              size="sm"
                              variant="light"
                            >
                              {a.statusArmada}
                            </Badge>
                          ) : "-"}
                        </td>
                        <td className={tdClass}>
                          {a.approve === true ? (
                            <Badge color="success" size="sm" variant="light">Approved</Badge>
                          ) : a.approve === false ? (
                            <Badge color="error" size="sm" variant="light">Rejected</Badge>
                          ) : (
                            <Badge color="warning" size="sm" variant="light">Pending</Badge>
                          )}
                        </td>
                        <td className={tdClass}>{a.approver || "-"}</td>
                        <td className={tdClass}>
                          {a.charter === true ? (
                            <Badge color="info" size="sm" variant="light">Charter</Badge>
                          ) : "-"}
                        </td>
                        <td className={tdClass}>{a.revised || "-"}</td>
                        <td className={tdClass}>{a.updatedBy || "-"}</td>
                        <td className={tdClass}>{fmtDate(a.updatedOn)}</td>
                        <td className={tdClass}>
                          {a.mappingCount > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                              {a.plants.split(", ").slice(0, 3).map((p, i) => (
                                <span key={i} className="flex items-center gap-0.5 text-[9px] font-black uppercase bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                                  <MapPin className="h-2 w-2" />{p}
                                </span>
                              ))}
                              {a.plants.split(", ").length > 3 && (
                                <span className="text-[9px] text-gray-400">+{a.plants.split(", ").length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Belum di-map</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          <Badge color={a.isBlocked ? "error" : "success"} size="sm" variant="light">
                            {a.isBlocked ? "Diblokir" : "Aktif"}
                          </Badge>
                        </td>
                        <td className={tdClass + " text-right"}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Kelola Mapping"
                              className="text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                              onClick={() => { setSelectedArmada(a); setShowMappingModal(true); }}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={a.isBlocked ? "Buka Blokir" : "Blokir"}
                              className={a.isBlocked ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-500 hover:bg-gray-100"}
                              onClick={() => setBlokirTarget({ id: a.id, nextIsBlocked: !a.isBlocked })}
                            >
                              {a.isBlocked ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30">
              <div className="text-xs text-gray-500">
                Showing <span className="font-bold">{(page - 1) * limit + 1}</span>–
                <span className="font-bold">{Math.min(page * limit, pagination.total)}</span> of{" "}
                <span className="font-bold">{pagination.total}</span> armada
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "ghost"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {pagination.totalPages > 5 && <span className="text-gray-400 text-xs">...</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showMappingModal && selectedArmada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border-none bg-white dark:bg-[#1a1c1e]">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="uppercase flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-brand-500" />
                  Mapping: {selectedArmada.nopol}
                </CardTitle>
                <CardDescription>
                  Hubungkan armada ini ke plant atau company tertentu.
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setShowMappingModal(false); setSelectedCompanies([]); }}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-500 tracking-widest">Pilih Plant / Company</label>
                <div className="flex gap-2 items-start">
                  <MultiSelect
                    className="flex-1"
                    options={companies.map((c: { code: string; name: string }) => ({ value: c.code, label: `${c.name} (${c.code})` }))}
                    selected={selectedCompanies}
                    onChange={setSelectedCompanies}
                    placeholder="Pilih satu atau lebih plant..."
                  />
                  <Button
                    className="bg-brand-500 hover:bg-brand-600 h-11 px-6 rounded-xl font-bold"
                    onClick={handleAddMapping}
                    disabled={selectedCompanies.length === 0 || addMappingMutation.isPending}
                  >
                    {addMappingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tambah"}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Mapped Plants
                  </span>
                  {loadingMappings && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {armadaMappings.length > 0 ? (
                    armadaMappings.map((m) => (
                      <div
                        key={m.Id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-gray-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-brand-50 text-brand-500 rounded-lg flex items-center justify-center font-bold text-xs">
                            {(m.CompanyName || m.CompanyCode)[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{m.CompanyName || "-"}</div>
                            <div className="text-[10px] font-mono text-gray-400 uppercase">{m.CompanyCode}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:bg-rose-50"
                          onClick={() => { setTargetDeleteMappingId(m.Id); setShowDeleteMappingConfirm(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : !loadingMappings ? (
                    <p className="text-center py-8 text-gray-400 italic text-sm">Belum ada mapping untuk armada ini.</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t border-gray-100 dark:border-gray-800 pt-6">
              <Button onClick={() => { setShowMappingModal(false); setSelectedCompanies([]); }}>Selesai</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteMappingConfirm}
        onOpenChange={setShowDeleteMappingConfirm}
        title="Hapus Mapping"
        description="Apakah Anda yakin ingin menghapus pemetaan armada ini ke plant? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDeleteMapping}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />

      <ConfirmDialog
        open={!!blokirTarget}
        onOpenChange={(open) => { if (!open) { setBlokirTarget(null); setBlokirReason(""); } }}
        title={blokirTarget?.nextIsBlocked ? "Blokir Armada" : "Buka Blokir Armada"}
        description={blokirTarget?.nextIsBlocked
          ? "Armada yang diblokir tidak akan bisa dipilih saat pembuatan tiket baru."
          : "Armada ini akan bisa dipilih kembali saat pembuatan tiket baru."}
        onConfirm={async () => {
          if (!blokirTarget) return;
          try {
            await blokirMutation.mutateAsync({ id: blokirTarget.id, isBlocked: blokirTarget.nextIsBlocked, reason: blokirReason });
          } catch {
            // swallow — already reported via onError toast
          }
        }}
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
    </div>
  );
}
