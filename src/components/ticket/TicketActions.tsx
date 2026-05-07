"use client";

import React, { useState, useEffect } from "react";
import { Eye, Printer, Loader2, FileEdit, Search, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { normalizeRole } from "@/lib/role-utils";

interface TicketActionsProps {
  bookingNo: string;
  id?: string;
  status?: string;
  currentNopol?: string;
  currentDriver?: string;
  showView?: boolean;
  showPrint?: boolean;
  className?: string;
}

export function TicketActions({
  bookingNo,
  id,
  status,
  currentNopol,
  currentDriver,
  showView = true,
  showPrint = true,
  className = "",
}: TicketActionsProps) {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = normalizeRole((session?.user as any)?.roleName || (session?.user as any)?.role);
  
  const isSuperAdmin = userRole === "superadmin" || userRole === "ti";
  const isStaffArea = userRole === "staffarea";
  const isTransport = userRole === "transport" || userRole === "rekanan";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const router = useRouter();

  // Loading state
  if (sessionStatus === "loading") {
    return <div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-none" />;
  }

  // Normalize status to string for comparison
  const currentStatus = String(status || "").padStart(2, '0');

  // Permission: Edit allowed if role is authorized AND status is '00'
  const canEdit = (isSuperAdmin || isStaffArea || isTransport) && currentStatus === "00";
  
  // Permission: Reschedule allowed ONLY for superadmin and staffarea
  const canReschedule = isSuperAdmin || isStaffArea;

  // Permission: View/Print allowed for these roles
  const canInteract = isSuperAdmin || isStaffArea || isTransport;

  const handlePrint = () => {
    // New Next.js native print route
    const printUrl = `/tiket/print/${bookingNo || id}`;
    window.open(printUrl, "_blank");
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {canEdit && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-none border-gray-200 hover:border-amber-500 hover:bg-amber-50 hover:text-amber-600 transition-all duration-300 hover:scale-110 active:scale-90"
          onClick={() => setIsEditOpen(true)}
          title="Edit Tiket"
        >
          <FileEdit className="h-3.5 w-3.5" />
        </Button>
      )}
      {canReschedule && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-none border-gray-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 hover:scale-110 active:scale-90"
          onClick={() => setIsRescheduleOpen(true)}
          title="Ganti Shift / Reschedule"
        >
          <Clock className="h-3.5 w-3.5" />
        </Button>
      )}

      {showView && canInteract && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-none border-gray-200 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600 transition-all duration-300 hover:scale-110 active:scale-90"
          onClick={() => router.push(`/track/tiket?id=${bookingNo}`)}
          title="Lacak Tiket"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      )}

      {showPrint && canInteract && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-none border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-300 hover:scale-110 active:scale-90"
          onClick={handlePrint}
          title="Cetak Tiket"
        >
          <Printer className="h-3.5 w-3.5" />
        </Button>
      )}


      {/* Ticket Edit Modal */}
      {canEdit && (
        <TicketEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          bookingNo={bookingNo}
          currentNopol={currentNopol}
          currentDriver={currentDriver}
        />
      )}

      {/* Ticket Reschedule Modal */}
      <TicketRescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        bookingNo={bookingNo}
      />
    </div>
  );
}


interface TicketEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingNo: string;
  currentNopol?: string;
  currentDriver?: string;
}

export function TicketEditModal({
  isOpen,
  onClose,
  bookingNo,
  currentNopol = "",
  currentDriver = "",
}: TicketEditModalProps) {
  const { apiJson, apiTable } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nopol: currentNopol,
    driver: currentDriver,
    alasan: "",
  });

  const [mode, setMode] = useState<"gp" | "kontainer">("gp");

  const [armadaSearch, setArmadaSearch] = useState("");
  const [debouncedArmadaSearch, setDebouncedArmadaSearch] = useState("");
  const [isArmadaDropdownOpen, setIsArmadaDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedArmadaSearch(armadaSearch), 300);
    return () => clearTimeout(timer);
  }, [armadaSearch]);

  // Fetch Ticket Details to get posto GUID and percepatan
  const { data: ticketDetailRaw } = useQuery({
    queryKey: ["ticket-detail-edit", bookingNo],
    queryFn: () => apiJson(`/api/Tiket/DetailData`, {
      method: "POST",
      body: JSON.stringify({ bookingno: bookingNo })
    }),
    enabled: isOpen && !!bookingNo,
  });

  const ticketDetail = ticketDetailRaw?.data || ticketDetailRaw || {};
  const postoGuidFromTicket = ticketDetail.guid;
  const isPercepatan = ticketDetail.percepatan === "1";

  // Logic from legacy JS: determine mode based on posto number and wilayah
  useEffect(() => {
    if (ticketDetail.bookingno) {
      const postoNum = ticketDetail.posto || ticketDetail.bookingno || "";
      const isSO = postoNum.substring(0, 1) !== "5";
      const wilayah = ticketDetail.postowilayah || "";

      if (isSO || wilayah === "DW2_KONTAINER") {
        setMode("kontainer");
      } else if (wilayah === "DW1_GP" || wilayah === "DW2_INBAG") {
        setMode("gp");
      }
      
      setFormData(prev => ({
        ...prev,
        nopol: ticketDetail.nopol || currentNopol,
        driver: ticketDetail.driver || currentDriver
      }));
    }
  }, [ticketDetail, currentNopol, currentDriver]);

  // Fetch Reasons
  const { data: reasons } = useQuery({
    queryKey: ["reasons-edit"],
    queryFn: () => apiJson(`/api/Alasan/DataFilter?param=ganti`),
    enabled: isOpen,
  });

  // Fetch Armada
  const { data: armadaPaginationRaw, isLoading: loadingFleet } = useQuery({
    queryKey: ["armada-pagination-edit", postoGuidFromTicket, isPercepatan, debouncedArmadaSearch],
    queryFn: () => {
      const endpoint = isPercepatan 
        ? "/api/Armada/DataPaginationPercepatan" 
        : "/api/Armada/DataPagination";
      return apiJson(`${endpoint}?posto=${postoGuidFromTicket}&start=0&length=100&cmd=refresh&q=${debouncedArmadaSearch}`);
    },
    enabled: isOpen && !!postoGuidFromTicket,
  });

  const fleetList = Array.isArray(armadaPaginationRaw?.data)
    ? armadaPaginationRaw.data.map((f: any) => ({
      Nopol: f.nopol || f.Nopol,
      AxleName: f.idsumbuString || f.AxleName
    }))
    : [];

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Use apiJson with POST and JSON body as the controller expects the Tiket model
      return apiJson("/api/Tiket/UpdateData", {
        method: "POST",
        body: JSON.stringify({
          bookingno: bookingNo,
          nopol: payload.nopol,
          driver: payload.driver,
          deletereason: payload.alasan, // Backend expects 'deletereason'
        }),
      });
    },
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Data tiket berhasil diperbarui.", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["rekanan-tickets"] });
      onClose();
    },
    onError: (err: any) => {
      addToast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const handleUpdate = () => {
    if (!formData.nopol || !formData.driver || !formData.alasan) {
      addToast({ title: "Peringatan", description: "Semua field harus diisi.", variant: "warning" });
      return;
    }
    updateMutation.mutate({
      id: bookingNo,
      nopol: formData.nopol,
      driver: formData.driver,
      alasan: formData.alasan,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-none border-none shadow-2xl">
        <DialogHeader className="p-8 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
            Edit Tiket Armada
          </DialogTitle>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Booking No: <span className="text-brand-600">{bookingNo}</span>
          </p>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-white dark:bg-gray-900">
          {/* Nopol Input - Conditional based on Mode */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">No Plat Truk :</label>
            
            {mode === "gp" ? (
              <div className="relative">
                <div
                  className="w-full h-11 px-4 rounded-none font-bold bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer group hover:border-brand-500 transition-all"
                  onClick={() => setIsArmadaDropdownOpen(!isArmadaDropdownOpen)}
                >
                  <span className={formData.nopol ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                    {formData.nopol || "Pilih Armada..."}
                  </span>
                  <Search className="h-4 w-4 text-gray-400 group-hover:text-brand-500" />
                </div>

                {isArmadaDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-none shadow-2xl z-[100] overflow-hidden">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                      <Input
                        placeholder="Cari Plat No..."
                        value={armadaSearch}
                        onChange={(e) => setArmadaSearch(e.target.value.toUpperCase())}
                        className="h-9 bg-gray-50 dark:bg-gray-800 border-none font-bold"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                      {loadingFleet ? (
                        <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin text-brand-500 mx-auto" /></div>
                      ) : fleetList.length === 0 ? (
                        <p className="p-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tidak ada data armada</p>
                      ) : (
                        fleetList.map((a: any) => (
                          <div
                            key={a.Nopol}
                            className="p-3 rounded-none hover:bg-brand-50 dark:hover:bg-brand-500/10 cursor-pointer transition-colors group"
                            onClick={() => {
                              setFormData({ ...formData, nopol: a.Nopol });
                              setIsArmadaDropdownOpen(false);
                              setArmadaSearch("");
                            }}
                          >
                            <p className="text-xs font-black text-gray-900 dark:text-white group-hover:text-brand-600 uppercase">{a.Nopol}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{a.AxleName}</p>
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
                placeholder="Ketik No Plat Nomor Truk"
                value={formData.nopol}
                onChange={(e) => setFormData({ ...formData, nopol: e.target.value.toUpperCase() })}
                className="rounded-none font-bold h-11 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"
              />
            )}
          </div>

          {/* Driver Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nama Pengemudi :</label>
            <Input
              placeholder="Ketik Nama Lengkap Supir"
              value={formData.driver}
              onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
              className="rounded-none font-bold h-11 bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm"
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Alasan Perubahan :</label>
            <select
              className="w-full h-11 px-4 rounded-none font-bold bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 outline-none focus:border-brand-500 transition-all text-sm"
              value={formData.alasan}
              onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
            >
              <option value="">Pilih Alasan...</option>
              {Array.isArray(reasons) && reasons.map((r: any, idx: number) => (
                <option key={idx} value={r.alasan}>{r.alasan}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-none px-6 font-bold uppercase text-[10px] tracking-widest h-11">
            Batal
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            className="bg-[#003473] hover:bg-[#002855] text-white rounded-none px-8 font-black uppercase text-[10px] tracking-widest h-11 shadow-xl shadow-brand-500/20"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TicketRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingNo: string;
}

export function TicketRescheduleModal({
  isOpen,
  onClose,
  bookingNo,
}: TicketRescheduleModalProps) {
  const { apiJson, apiTable } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [alasan, setAlasan] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  // Fetch Available Shifts for Reschedule
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["ticket-reschedule-options", bookingNo],
    queryFn: () => apiJson("/api/KuotaLevel4/DataforReschedule", {
      method: "POST",
      body: JSON.stringify({ bookingno: bookingNo })
    }),
    enabled: isOpen && !!bookingNo,
  });

  const availableShifts = Array.isArray(scheduleData) ? scheduleData : [];

  const updateShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      return apiJson("/api/Tiket/ChangeShiftBaru", {
        method: "POST",
        body: JSON.stringify({
          bookingno: bookingNo,
          deletereason: alasan, // Backend expects 'deletereason'
          id: shiftId,
        }),
      });
    },
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Shift berhasil diperbarui", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["rekanan-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["posto-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-list"] }); // Also invalidate global list
      onClose();
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message || "Terjadi kesalahan sistem", variant: "destructive" });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-none border-none shadow-2xl">
        <DialogHeader className="p-6 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Reschedule / Ganti Shift
          </DialogTitle>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-white dark:bg-gray-900">
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border-l-4 border-blue-500">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Tiket Aktif</p>
            <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{bookingNo}</p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pilih Jadwal Baru :</label>
            {isLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
            ) : availableShifts.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800">
                <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-400 uppercase">Tidak ada jadwal tersedia</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {availableShifts.map((shift: any) => (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShiftId(shift.id)}
                    className={`p-4 border-2 transition-all cursor-pointer group ${
                      selectedShiftId === shift.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                        : 'border-gray-100 dark:border-gray-800 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Shift {shift.shift}</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{shift.tanggalString}</p>
                      </div>
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        selectedShiftId === shift.id ? 'border-blue-500 bg-blue-500' : 'border-gray-200'
                      }`}>
                        {selectedShiftId === shift.id && <div className="h-1.5 w-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Alasan Perubahan :</label>
            <textarea
              className="w-full h-24 p-4 rounded-none font-bold text-sm bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:outline-none focus:border-blue-500 transition-all resize-none"
              placeholder="Masukkan alasan pemindahan shift..."
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-none font-black uppercase tracking-widest border-gray-200"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            className="flex-1 h-12 rounded-none font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => selectedShiftId && updateShiftMutation.mutate(selectedShiftId)}
            disabled={!selectedShiftId || !alasan || updateShiftMutation.isPending}
          >
            {updateShiftMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Simpan Jadwal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
