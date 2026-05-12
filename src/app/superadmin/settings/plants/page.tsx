"use client";
import { useState } from "react";
import {
  Building2, Search, Edit, Loader2, X,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Plant {
  company_code: string;
  company: string;
  groupcompany: string;
  urutan: number | null;
  timezone: number | null;
  statusPlant: boolean;
  timbangan: boolean;
  cluster: boolean;
  onestaff: boolean;
  deleteticketAll: boolean;
  odol: boolean;
  duplicateticketAll: boolean;
  signature: boolean;
  asalthesamemuat: boolean;
  SO: boolean;
  autoqtymaxarmada: boolean;
  tahunpembuatan: boolean;
  percepatan: boolean;
}

const emptyForm = (): Plant => ({
  company_code: "",
  company: "",
  groupcompany: "",
  urutan: null,
  timezone: null,
  statusPlant: false,
  timbangan: false,
  cluster: false,
  onestaff: false,
  deleteticketAll: false,
  odol: false,
  duplicateticketAll: false,
  signature: false,
  asalthesamemuat: false,
  SO: false,
  autoqtymaxarmada: false,
  tahunpembuatan: false,
  percepatan: false,
});

const TOGGLES: { key: keyof Plant; label: string }[] = [
  { key: "timbangan",        label: "Timbangan (Integrasi)" },
  { key: "cluster",          label: "Sistem Cluster" },
  { key: "onestaff",         label: "One Staff Mode" },
  { key: "deleteticketAll",  label: "Delete Ticket All" },
  { key: "odol",             label: "Validasi ODOL" },
  { key: "duplicateticketAll", label: "Duplicate Ticket All" },
  { key: "signature",        label: "Signature Check" },
  { key: "asalthesamemuat",  label: "Asal = Tujuan Muat" },
  { key: "SO",               label: "Integrasi SO" },
  { key: "autoqtymaxarmada", label: "Auto Qty Max Armada" },
  { key: "tahunpembuatan",   label: "Konfig Tahun Pembuatan" },
  { key: "percepatan",       label: "Fitur Percepatan" },
];

const PAGE_SIZE = 10;

export default function PlantConfigPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Plant>(emptyForm());

  const { data: plantsData, isLoading } = useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      const res = await fetch("/api/admin/plants");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Plant[];
    },
  });

  const allPlants = Array.isArray(plantsData) ? plantsData : [];
  const groups = [...new Set(allPlants.map((p) => p.groupcompany).filter(Boolean))].sort() as string[];
  const filtered = allPlants.filter(
    (p) =>
      (groupFilter === "" || p.groupcompany === groupFilter) &&
      (p.company.toLowerCase().includes(search.toLowerCase()) ||
       p.company_code.toLowerCase().includes(search.toLowerCase()) ||
       (p.groupcompany || "").toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: Plant) => {
      const res = await fetch("/api/admin/plants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Plant Updated", variant: "success" });
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["plants"] });
    },
    onError: (err: any) =>
      addToast({ title: "Update Failed", description: err.message, variant: "destructive" }),
  });

  const handleEdit = (plant: Plant) => {
    setForm({ ...plant });
    setShowModal(true);
  };

  const setToggle = (key: keyof Plant, val: boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const activeCount = allPlants.filter((p) => p.statusPlant).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            Konfigurasi Plant & Company
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kelola seluruh entitas plant dan unit bisnis di ekosistem SISTRO.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-brand-500 text-white border-none shadow-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold opacity-80 uppercase">Total Plant</p>
              <h3 className="text-2xl font-black">{allPlants.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-theme-xs bg-white dark:bg-white/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Plant Aktif</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{activeCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-theme-xs bg-white dark:bg-white/[0.02]">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Plant Inaktif</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {allPlants.length - activeCount}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-theme-xs border-none bg-white dark:bg-white/[0.02] overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Cari plant, code, atau group..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.02] px-3 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[180px]"
              value={groupFilter}
              onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}
            >
              <option value="">Semua Group</option>
              {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">No.</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Kode Plant</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Nama Plant</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Grup Company</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Urutan</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                        <span className="text-gray-500 italic">Memuat data plant...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">
                      Tidak ada plant ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginated.map((plant, i) => (
                    <tr
                      key={plant.company_code}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group"
                    >
                      <td className="px-6 py-4 text-gray-500 text-sm">{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-brand-500 font-mono tracking-widest text-sm">
                          {plant.company_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900 dark:text-white">{plant.company}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{plant.groupcompany || "-"}</td>
                      <td className="px-6 py-4 text-center text-gray-600 text-sm">
                        {plant.urutan ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {plant.statusPlant ? (
                          <Badge color="success" size="sm">Aktif</Badge>
                        ) : (
                          <Badge color="error" size="sm">Inaktif</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                          onClick={() => handleEdit(plant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} dari {filtered.length} plant
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-xs">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant="ghost"
                      size="sm"
                      className={`w-8 h-8 p-0 text-xs ${currentPage === p ? "bg-brand-500 text-white hover:bg-brand-600 hover:text-white" : ""}`}
                      onClick={() => setPage(p as number)}
                    >
                      {p}
                    </Button>
                  )
                )}
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-none bg-white dark:bg-[#1a1c1e] overflow-hidden max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b dark:border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold">Konfigurasi Plant: <span className="text-brand-500">{form.company}</span></h3>
                <p className="text-xs text-gray-400">{form.company_code} · {form.groupcompany}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
              {/* Readonly info */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl text-sm">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Company Code</p>
                  <p className="font-bold text-gray-700 dark:text-gray-200">{form.company_code}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Company Name</p>
                  <p className="font-bold text-gray-700 dark:text-gray-200">{form.company}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Group Company</p>
                  <p className="font-bold text-gray-700 dark:text-gray-200">{form.groupcompany}</p>
                </div>
              </div>

              {/* Konfigurasi Utama */}
              <div>
                <p className="text-sm font-black text-brand-500 uppercase tracking-wider mb-3">Konfigurasi Utama</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400">Urutan Display</label>
                    <Input
                      type="number"
                      value={form.urutan ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, urutan: e.target.value ? parseInt(e.target.value) : null }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400">Timezone (Offset)</label>
                    <Input
                      type="number"
                      value={form.timezone ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value ? parseInt(e.target.value) : null }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Status Plant</label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.statusPlant}
                        onChange={(e) => setToggle("statusPlant", e.target.checked)}
                        className="w-4 h-4 rounded text-brand-500"
                      />
                      <span className={`text-sm font-bold ${form.statusPlant ? "text-emerald-600" : "text-rose-500"}`}>
                        {form.statusPlant ? "Aktif" : "Nonaktif"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Fitur Toggles */}
              <div>
                <p className="text-sm font-black text-brand-500 uppercase tracking-wider mb-3">Fitur Toggles</p>
                <div className="grid grid-cols-2 gap-3">
                  {TOGGLES.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] cursor-pointer hover:border-brand-200 transition-colors"
                    >
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
                      <input
                        type="checkbox"
                        checked={!!form[key]}
                        onChange={(e) => setToggle(key, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <CardFooter className="flex justify-end gap-2 border-t dark:border-white/5 pt-4">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Batal</Button>
              <Button
                className="bg-brand-500 hover:bg-brand-600"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate(form)}
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Konfigurasi
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
