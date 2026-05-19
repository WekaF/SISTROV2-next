"use client";
import React, { useState } from "react";
import {
  Edit, X, Loader2, Clock,
  Timer, Save
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { normalizeRole } from "@/lib/role-utils";

export default function ShiftPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const role = normalizeRole((session?.user as any)?.role);
  const canEdit = ["superadmin", "admin"].includes(role);

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emptyForm = {
    abbrev: "",
    keterangan: "",
    scope: "",
    level: "",
    starttime: "00:00",
    endtime: "00:00",
  };
  const [formData, setFormData] = useState(emptyForm);

  const resetForm = () => setFormData(emptyForm);

  const { data: allShifts } = useQuery({
    queryKey: ["shifts-all"],
    queryFn: async () => {
      const res = await fetch("/api/admin/shifts");
      const data = await res.json();
      return (Array.isArray(data) ? data : []) as any[];
    },
  });

  const stats = {
    total: allShifts?.length || 0,
    scopes: new Set(allShifts?.map((s: any) => s.scope)).size || 0,
  };

  const fetcher = async (params: DataTableParams) => {
    const res = await fetch("/api/admin/shifts");
    const allData = await res.json();
    if (!res.ok) throw new Error(allData.error || "Failed to fetch shifts");
    const safeData = Array.isArray(allData) ? allData : [];

    const filtered = safeData.filter((s: any) => {
      const searchTerm = params.search.toLowerCase();
      return (
        (s.keterangan || "").toLowerCase().includes(searchTerm) ||
        (s.scope || "").toLowerCase().includes(searchTerm) ||
        (s.level || "").toLowerCase().includes(searchTerm)
      );
    });

    const start = params.start || 0;
    const length = params.length || 25;

    return {
      data: filtered.slice(start, start + length),
      recordsTotal: safeData.length,
      recordsFiltered: filtered.length,
    };
  };

  const handleEdit = async (item: any) => {
    try {
      const res = await fetch(`/api/admin/shifts?abbrev=${item.abbrev}`, { method: "PATCH" });
      const detail = await res.json();
      if (res.ok) {
        const formatTime = (timeStr: string) => {
          if (!timeStr) return "00:00";
          if (timeStr.includes("T")) {
            const date = new Date(timeStr);
            return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
          }
          return timeStr;
        };
        const data = detail.response || detail;
        setFormData({
          abbrev: data.abbrev,
          keterangan: data.keterangan,
          scope: data.scope,
          level: data.level,
          starttime: formatTime(data.starttime),
          endtime: formatTime(data.endtime),
        });
        setShowModal(true);
      } else {
        addToast({ title: "Gagal mengambil detail shift", variant: "destructive" });
      }
    } catch {
      addToast({ title: "Terjadi kesalahan sistem", variant: "destructive" });
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/shifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update gagal");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts-all"] });
      addToast({ title: "Data shift berhasil diperbarui", variant: "success" });
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      addToast({ title: error.message, variant: "destructive" });
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    updateMutation.mutate(formData);
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "no",
      header: "No.",
      headerClassName: "w-16 text-center",
      className: "text-center",
      render: (_, index) => (
        <span className="text-[10px] font-black text-gray-300">
          {(index + 1).toString().padStart(2, "0")}
        </span>
      ),
    },
    {
      key: "keterangan",
      header: "Keterangan",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-900 dark:text-white uppercase text-sm tracking-tight">{item.keterangan}</span>
          <span className="text-[10px] text-gray-400 font-medium tracking-widest">{item.abbrev}</span>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Scope",
      render: (item) => (
        <Badge variant="outline" className="rounded-none border-gray-200 dark:border-white/10 font-bold uppercase text-[10px] px-2">
          {item.scope}
        </Badge>
      ),
    },
    {
      key: "level",
      header: "Level",
      className: "text-center",
      render: (item) => <span className="font-mono text-xs font-bold">{item.level}</span>,
    },
    {
      key: "starttime",
      header: "Awal Waktu",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-brand-500" />
          <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-300">
            {item.tglstartString || item.starttime}
          </span>
        </div>
      ),
    },
    {
      key: "endtime",
      header: "Akhir Waktu",
      render: (item) => (
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-red-500" />
          <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-300">
            {item.tglendString || item.endtime}
          </span>
        </div>
      ),
    },
    ...(canEdit ? [{
      key: "actions",
      header: "Aksi",
      headerClassName: "w-20 text-center",
      className: "text-center",
      render: (item: any) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(item)}
          className="h-8 w-8 p-0 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
        >
          <Edit className="h-4 w-4" />
        </Button>
      ),
    }] as DataTableColumn<any>[] : []),
  ];

  return (
    <div className="flex flex-col gap-8 p-0 sm:p-0 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative overflow-hidden bg-[#1e293b] text-white p-8 sm:p-12 border-b-4 border-brand-500">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-2 bg-brand-500" />
              <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">
                Pengaturan Shift
              </h1>
            </div>
            <p className="text-gray-400 max-w-2xl font-medium leading-relaxed uppercase text-[10px] tracking-[0.2em]">
              Pembagian waktu operasional dan shift kerja di seluruh area operasional sistro.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Card className="bg-white/5 border-white/10 rounded-none min-w-[140px] backdrop-blur-sm">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Total Shift</span>
                <span className="text-2xl font-black font-mono">{stats.total.toString().padStart(2, "0")}</span>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 rounded-none min-w-[140px] backdrop-blur-sm">
              <CardContent className="p-4 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Scopes</span>
                <span className="text-2xl font-black font-mono">{stats.scopes.toString().padStart(2, "0")}</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 sm:px-8 -mt-6">
        <div className="bg-white dark:bg-[#0f1115] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5">
          <DataTable
            columns={columns}
            fetcher={fetcher}
            queryKey={["shifts-table"]}
            defaultPageSize={25}
            rowKey={(row: any) => row.abbrev ?? `row-${row.number}`}
            searchPlaceholder="Cari shift (keterangan, scope, level)..."
          />
        </div>
      </div>

      {/* Edit Modal — only rendered when canEdit */}
      {showModal && canEdit && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
          <Card className="w-full max-w-2xl shadow-2xl border-none bg-white dark:bg-[#1a1c1e] overflow-hidden rounded-none animate-in zoom-in-95">
            <CardHeader className="border-b dark:border-white/5 pb-6 bg-gray-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-500 text-white shadow-xl shadow-brand-500/20">
                    <Timer className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Edit Detail Shift</CardTitle>
                    <CardDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {formData.abbrev} - {formData.keterangan}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="h-10 w-10 p-0 rounded-none hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Keterangan</label>
                    <Input
                      required
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      className="rounded-none border-gray-200 dark:border-white/10 h-12 font-bold focus:ring-brand-500 focus:border-brand-500 bg-gray-50/50 dark:bg-white/[0.02]"
                      placeholder="Masukkan keterangan"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Scope</label>
                    <Input
                      required
                      value={formData.scope}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      className="rounded-none border-gray-200 dark:border-white/10 h-12 font-bold focus:ring-brand-500 focus:border-brand-500 bg-gray-50/50 dark:bg-white/[0.02]"
                      placeholder="Masukkan scope"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Level</label>
                    <Input
                      required
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="rounded-none border-gray-200 dark:border-white/10 h-12 font-bold focus:ring-brand-500 focus:border-brand-500 bg-gray-50/50 dark:bg-white/[0.02]"
                      placeholder="Masukkan level"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Awal Waktu</label>
                      <Input
                        required
                        type="time"
                        value={formData.starttime}
                        onChange={(e) => setFormData({ ...formData, starttime: e.target.value })}
                        className="rounded-none border-gray-200 dark:border-white/10 h-12 font-bold focus:ring-brand-500 focus:border-brand-500 bg-gray-50/50 dark:bg-white/[0.02]"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Akhir Waktu</label>
                      <Input
                        required
                        type="time"
                        value={formData.endtime}
                        onChange={(e) => setFormData({ ...formData, endtime: e.target.value })}
                        className="rounded-none border-gray-200 dark:border-white/10 h-12 font-bold focus:ring-brand-500 focus:border-brand-500 bg-gray-50/50 dark:bg-white/[0.02]"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t dark:border-white/5 p-6 bg-gray-50/50 dark:bg-white/[0.02] flex justify-end gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="rounded-none font-bold uppercase tracking-widest text-[10px] h-12 px-8"
                >
                  Batal
                </Button>
                <Button
                  disabled={isSubmitting}
                  className="rounded-none bg-brand-500 hover:bg-brand-600 text-white font-black uppercase tracking-[0.2em] text-[10px] h-12 px-10 shadow-lg shadow-brand-500/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Perubahan
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      <div className="h-12" />
    </div>
  );
}
