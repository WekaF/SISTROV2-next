"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  Weight,
  Loader2,
  X,
  Car,
  Layers,
  CalendarDays,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Sumbu {
  Id: number;
  jenistruk: string;
  nama: string;
  tahun: string;
  muatan: number;
  updatedon: string;
  updatedby: string;
  IdGrupTruk: number;
}

// ─────────────────────────────────────────
// Truck Axle Visualization
// ─────────────────────────────────────────
function TruckAxleViz({ value }: { value: string }) {
  const units = useMemo(() => {
    if (!value || !value.trim()) return [];
    let currentX = 20;
    const result: Array<{
      isTrailer: boolean;
      parts: string[];
      chassisLeft: number;
      unitWidth: number;
      cabinLeft?: number;
      hookLeft?: number;
      axles: Array<{ left: number; isDouble: boolean; label: string }>;
    }> = [];

    value.split("&").forEach((unitStr, unitIdx) => {
      const isTrailer = unitIdx > 0;
      const parts = unitStr.split(/[.\-\s]+/).filter(Boolean);
      if (parts.length === 0) return;

      const unitWidth = Math.max(120, parts.length * 65 + (isTrailer ? 10 : 30));

      const axles = parts.map((part, axleIdx) => {
        let posX: number;
        if (!isTrailer && axleIdx === 0) {
          posX = currentX + 10;
        } else {
          posX = currentX + axleIdx * 60 + (isTrailer ? 20 : 50);
        }
        const isDouble = ["2", "4", "6"].includes(part);
        return { left: posX, isDouble, label: part };
      });

      result.push({
        isTrailer,
        parts,
        chassisLeft: currentX + (isTrailer ? 5 : 0),
        unitWidth,
        cabinLeft: !isTrailer ? currentX : undefined,
        hookLeft: isTrailer ? currentX - 20 : undefined,
        axles,
      });

      currentX += unitWidth + 25;
    });

    return result;
  }, [value]);

  return (
    <div
      style={{
        background: "#f1f3f5",
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        textAlign: "center",
        border: "1px dashed #ced4da",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          height: 140,
          width: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          paddingBottom: 30,
          paddingLeft: 20,
          background: "#fdfdfe",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {/* Road */}
        <div
          style={{
            position: "absolute",
            bottom: 15,
            left: "5%",
            width: "90%",
            height: 4,
            background: "linear-gradient(to right, transparent, #ced4da, transparent)",
            borderRadius: 2,
          }}
        />

        {units.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#adb5bd",
              fontSize: 13,
              fontStyle: "italic",
            }}
          >
            Masukkan tipe sumbu untuk visualisasi
          </div>
        )}

        {units.map((unit, ui) => (
          <React.Fragment key={ui}>
            {/* Hook for trailer */}
            {unit.isTrailer && (
              <div
                style={{
                  position: "absolute",
                  bottom: 54,
                  left: unit.hookLeft,
                  width: 35,
                  height: 8,
                  background: "#adb5bd",
                  zIndex: 5,
                  borderRadius: 4,
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
                }}
              />
            )}

            {/* Cabin for tractor */}
            {!unit.isTrailer && (
              <div
                style={{
                  width: 80,
                  height: 65,
                  background: "linear-gradient(135deg, #003473 0%, #00509d 100%)",
                  borderRadius: "30px 12px 5px 5px",
                  position: "absolute",
                  bottom: 45,
                  left: unit.cabinLeft,
                  zIndex: 20,
                  boxShadow: "-3px 5px 15px rgba(0,0,0,0.3)",
                }}
              >
                {/* Grill */}
                <div
                  style={{
                    position: "absolute",
                    top: 25,
                    left: 0,
                    width: 8,
                    height: 35,
                    background: "#121416",
                    borderRadius: "4px 0 0 4px",
                  }}
                />
                {/* Window */}
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    width: 38,
                    height: 28,
                    background: "linear-gradient(to bottom, #d0ebff, #74c0fc)",
                    borderRadius: "20px 5px 5px 5px",
                    border: "1.5px solid rgba(255,255,255,0.5)",
                  }}
                />
              </div>
            )}

            {/* Chassis */}
            <div
              style={{
                height: 16,
                background: unit.isTrailer
                  ? "linear-gradient(to bottom, #495057 0%, #212529 100%)"
                  : "linear-gradient(to bottom, #2b2d42 0%, #1a1c1e 100%)",
                position: "absolute",
                bottom: 50,
                left: unit.chassisLeft,
                width: unit.unitWidth,
                zIndex: 10,
                borderRadius: unit.isTrailer ? 6 : "4px 10px 10px 4px",
                boxShadow: "0 3px 6px rgba(0,0,0,0.4)",
              }}
            />

            {/* Axles */}
            {unit.axles.map((axle, ai) => (
              <div
                key={ai}
                style={{
                  position: "absolute",
                  bottom: 18,
                  left: axle.left,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 60,
                  zIndex: 15,
                }}
              >
                {/* Mudguard */}
                <div
                  style={{
                    width: 45,
                    height: 18,
                    background: "#212529",
                    borderRadius: "25px 25px 0 0",
                    position: "absolute",
                    top: -5,
                    zIndex: 16,
                  }}
                />
                {/* Axle stem */}
                <div
                  style={{
                    width: 6,
                    height: 35,
                    background: "#495057",
                    position: "absolute",
                    bottom: 15,
                    zIndex: 11,
                  }}
                />
                {/* Wheels */}
                <div
                  style={{
                    display: "flex",
                    gap: 2,
                    justifyContent: "center",
                    position: "relative",
                    zIndex: 18,
                    marginBottom: 2,
                  }}
                >
                  <Wheel />
                  {axle.isDouble && (
                    <div style={{ marginLeft: -14 }}>
                      <Wheel />
                    </div>
                  )}
                </div>
                {/* Label */}
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#003473",
                    marginTop: 5,
                    background: "rgba(255,255,255,0.8)",
                    borderRadius: 4,
                    padding: "1px 4px",
                  }}
                >
                  {axle.label}
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div
        style={{
          fontWeight: 600,
          fontSize: "0.8rem",
          color: "#adb5bd",
          marginTop: 5,
        }}
      >
        Konfigurasi:{" "}
        <span style={{ color: "#003473", fontWeight: 700 }}>{value || "-"}</span>
      </div>
    </div>
  );
}

function Wheel() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        background: "#111",
        border: "4px solid #495057",
        borderRadius: "50%",
        boxShadow: "0 4px 8px rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          background: "#adb5bd",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────
export default function SumbuPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: sumbuData, isLoading: loading } = useQuery({
    queryKey: ["sumbu"],
    queryFn: async () => {
      const res = await fetch("/api/admin/sumbu");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data as Sumbu[];
    },
  });

  const filteredData = Array.isArray(sumbuData)
    ? sumbuData.filter(
        (s) =>
          s.nama?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          s.jenistruk?.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : [];

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetSumbu, setTargetSumbu] = useState<Sumbu | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id: 0,
    nama: "",
    jenistruk: "",
    tahun: "2026",
    muatan: 0,
    idGrupTruk: 0,
  });

  const resetForm = () => {
    setFormData({ id: 0, nama: "", jenistruk: "", tahun: "2026", muatan: 0, idGrupTruk: 0 });
    setIsEditing(false);
    setTargetSumbu(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/sumbu?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Berhasil Dihapus", variant: "success" });
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["sumbu"] });
    },
    onError: (err: any) =>
      addToast({ title: "Gagal Hapus", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jenistruk || !formData.nama) {
      addToast({ title: "Form Tidak Lengkap", description: "Jenis Kendaraan dan Sumbu wajib diisi", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/admin/sumbu", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        addToast({ title: isEditing ? "Sumbu Diperbarui" : "Sumbu Ditambahkan", variant: "success" });
        setShowModal(false);
        resetForm();
        queryClient.invalidateQueries({ queryKey: ["sumbu"] });
      } else {
        throw new Error(data.error || "Gagal menyimpan data");
      }
    } catch (err: any) {
      addToast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (s: Sumbu) => {
    setFormData({
      id: s.Id,
      nama: s.nama,
      jenistruk: s.jenistruk,
      tahun: s.tahun,
      muatan: Number(s.muatan),
      idGrupTruk: s.IdGrupTruk,
    });
    setIsEditing(true);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            Master Sumbu Kendaraan
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Konfigurasi jenis truk dan tonase muatan standar.
          </p>
        </div>
        <Button
          className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Data Sumbu
        </Button>
      </div>

      <Card className="shadow-theme-xs border-none bg-white dark:bg-white/[0.02] overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Cari jenis truk atau sumbu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">
                    Jenis Kendaraan
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">
                    Tipe Sumbu
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">
                    Muatan (Ton)
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">
                    Tahun
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-500 tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-500" />
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                      Data tidak ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredData.map((s) => (
                    <tr
                      key={s.Id}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center font-bold dark:bg-brand-500/10">
                            <Truck className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                              {s.jenistruk}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">ID: {s.Id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge color="info" variant="light" size="sm" className="font-mono">
                          {s.nama}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-black text-gray-900 dark:text-white">
                          <Weight className="h-3 w-3 text-brand-500" />
                          {Number(s.muatan).toLocaleString()}{" "}
                          <span className="text-[10px] text-gray-400 uppercase">Ton</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                          {s.tahun || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(s)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-500"
                            onClick={() => {
                              setTargetSumbu(s);
                              setShowDeleteConfirm(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8 bg-white dark:bg-[#1a1c1e] rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ background: "linear-gradient(135deg, #003473 0%, #00509d 100%)" }}
            >
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-white" />
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Pengaturan Data Sumbu
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div
              className="p-6 relative"
              style={{ background: "#f8f9fa" }}
            >
              {/* Truck loading overlay */}
              {isSubmitting && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(255,255,255,0.92)",
                    zIndex: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                  }}
                >
                  <Loader2 className="h-10 w-10 animate-spin text-[#003473]" />
                  <p
                    style={{
                      fontWeight: 700,
                      color: "#003473",
                      marginTop: 15,
                      fontSize: "0.85rem",
                      textTransform: "uppercase",
                      letterSpacing: 2,
                    }}
                  >
                    Sedang Memproses...
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div
                  className="rounded-xl p-5 space-y-4"
                  style={{ background: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                >
                  {/* Axle Visualization */}
                  <TruckAxleViz value={formData.nama} />

                  {/* Jenis Kendaraan */}
                  <div className="space-y-2">
                    <label
                      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#495057" }}
                    >
                      <Car className="h-3.5 w-3.5" />
                      Jenis Kendaraan
                    </label>
                    <input
                      type="text"
                      value={formData.jenistruk}
                      onChange={(e) => setFormData({ ...formData, jenistruk: e.target.value })}
                      placeholder="Masukkan Jenis Kendaraan"
                      required
                      className="w-full h-10 px-4 rounded-lg text-sm transition-all outline-none"
                      style={{
                        border: "1.5px solid #e9ecef",
                        background: "white",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#003473")}
                      onBlur={(e) => (e.target.style.borderColor = "#e9ecef")}
                    />
                  </div>

                  {/* Sumbu */}
                  <div className="space-y-2">
                    <label
                      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#495057" }}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Sumbu
                    </label>
                    <input
                      type="text"
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      placeholder="1.2, 1.2.2, etc"
                      required
                      className="w-full h-10 px-4 rounded-lg text-sm transition-all outline-none"
                      style={{
                        border: "1.5px solid #e9ecef",
                        background: "white",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#003473")}
                      onBlur={(e) => (e.target.style.borderColor = "#e9ecef")}
                    />
                  </div>

                  {/* Muatan */}
                  <div className="space-y-2">
                    <label
                      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#495057" }}
                    >
                      <Weight className="h-3.5 w-3.5" />
                      Muatan (Ton)
                    </label>
                    <input
                      type="number"
                      value={formData.muatan}
                      onChange={(e) =>
                        setFormData({ ...formData, muatan: Number(e.target.value) })
                      }
                      required
                      className="w-full h-10 px-4 rounded-lg text-sm transition-all outline-none"
                      style={{
                        border: "1.5px solid #e9ecef",
                        background: "white",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#003473")}
                      onBlur={(e) => (e.target.style.borderColor = "#e9ecef")}
                    />
                  </div>

                  {/* Tahun */}
                  <div className="space-y-2">
                    <label
                      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#495057" }}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Tahun
                    </label>
                    <input
                      type="text"
                      value={formData.tahun}
                      onChange={(e) => setFormData({ ...formData, tahun: e.target.value })}
                      placeholder="2026"
                      className="w-full h-10 px-4 rounded-lg text-sm transition-all outline-none"
                      style={{
                        border: "1.5px solid #e9ecef",
                        background: "white",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#003473")}
                      onBlur={(e) => (e.target.style.borderColor = "#e9ecef")}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div
                  className="flex justify-end gap-3 mt-5"
                  style={{ borderTop: "1px solid #e9ecef", paddingTop: 16 }}
                >
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: "#f1f3f5", color: "#495057" }}
                  >
                    Batal
                  </button>

                  {!isEditing ? (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
                      style={{
                        background: "#28a745",
                        boxShadow: "0 4px 10px rgba(40,167,69,0.3)",
                      }}
                    >
                      Simpan Sumbu
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-2.5 rounded-lg text-sm font-bold text-white transition-all"
                      style={{
                        background: "#003473",
                        boxShadow: "0 4px 10px rgba(0,52,115,0.2)",
                      }}
                    >
                      Update Sumbu
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Hapus Sumbu"
        description={`Yakin ingin menghapus ${targetSumbu?.nama}?`}
        onConfirm={() => {
          if (targetSumbu) deleteMutation.mutate(targetSumbu.Id);
        }}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
