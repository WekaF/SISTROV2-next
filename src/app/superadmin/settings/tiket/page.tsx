"use client";
import React, { useState } from "react";
import {
  Ticket,
  Search,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface TicketDetail {
  bookingno: string;
  tiketno?: string;
  posto?: string;
  nopol?: string;
  driver?: string;
  qty?: number;
  asal?: string;
  tujuan?: string;
  statuspemuatan?: string;
  positionString?: string;
  company?: string;
  idproduk?: string;
  produkString?: string;
}

export default function ForceDeleteTiketPage() {
  const { addToast } = useToast();

  const [bookingNoInput, setBookingNoInput] = useState("");
  const [ticketDetail, setTicketDetail] = useState<TicketDetail | null>(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleSearch = async () => {
    const query = bookingNoInput.trim();
    if (!query) {
      addToast({
        title: "Peringatan",
        description: "Masukkan nomor booking atau tiket terlebih dahulu.",
        variant: "warning",
      });
      return;
    }

    setIsSearching(true);
    setTicketDetail(null);

    try {
      const res = await fetch(`/api/admin/tiket?bookingno=${encodeURIComponent(query)}`);
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Tiket tidak ditemukan atau gagal dimuat.");
      }

      setTicketDetail(json.data);
      addToast({
        title: "Sukses",
        description: "Detail tiket berhasil ditemukan.",
        variant: "success",
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        title: "Gagal Cek Tiket",
        description: err.message || "Tiket tidak dikenali atau terjadi kesalahan koneksi.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleForceDelete = async () => {
    if (!ticketDetail) return;
    if (confirmText.toUpperCase() !== "SETUJU") {
      addToast({
        title: "Verifikasi Gagal",
        description: 'Anda harus mengetik "SETUJU" untuk melanjutkan.',
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/tiket?force=true`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingno: ticketDetail.bookingno }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menghapus tiket.");
      }

      addToast({
        title: "Berhasil",
        description: `Tiket ${ticketDetail.bookingno} berhasil dihapus paksa dari sistem.`,
        variant: "success",
      });

      // Reset Form
      setTicketDetail(null);
      setBookingNoInput("");
      setIsConfirmOpen(false);
      setConfirmText("");
    } catch (err: any) {
      console.error(err);
      addToast({
        title: "Gagal Hapus Paksa",
        description: err.message || "Gagal menghubungi server untuk menghapus tiket.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReset = () => {
    setTicketDetail(null);
    setBookingNoInput("");
    setConfirmText("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Trash2 className="h-7 w-7 text-red-500" />
          Hapus Tiket Paksa (Force Delete)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Hapus tiket di posisi mana pun secara permanen. Tindakan ini memotong validasi standar.
        </p>
      </div>

      {/* Banner Warning */}
      <div className="p-5 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded-r-2xl flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-wider">
            PERINGATAN OPERASI DESTRUKTIF!
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 leading-relaxed">
            Force Delete akan menghapus tiket secara fisik dari database utama dan mengembalikan alokasi kuota ke status semula.
            Tindakan ini <strong>tidak dapat dibatalkan</strong> dan hanya boleh digunakan untuk kasus khusus (double upload, kesalahan data, dll).
          </p>
        </div>
      </div>

      {/* Card Search */}
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Input Nomor Booking / Kode SISTRO
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Masukkan Nomor Booking / Tiket (SISTRO_XXX...)"
                  className="pl-12 h-14 text-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus-visible:ring-red-500 focus-visible:border-red-500 rounded-xl font-bold uppercase"
                  value={bookingNoInput}
                  onChange={(e) => setBookingNoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="h-14 px-8 font-black rounded-xl bg-slate-900 dark:bg-red-600 text-white hover:bg-slate-800 dark:hover:bg-red-700 shadow-md transition-all active:scale-[0.98] uppercase tracking-wider"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Cek Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Card (If Loaded) */}
      {ticketDetail && (
        <Card className="border-2 border-red-100 dark:border-red-950/40 shadow-2xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="bg-red-50/50 dark:bg-red-950/10 p-6 border-b border-red-100/50 dark:border-red-950/20">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <CardTitle className="text-lg font-black text-slate-800 dark:text-white uppercase">
                  Data Tiket Ditemukan
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500">
                  Pastikan informasi berikut sesuai sebelum melakukan penghapusan paksa.
                </CardDescription>
              </div>
              <Badge className="bg-red-100 text-red-700 border-none font-black px-4 py-1.5 rounded-full text-xs">
                {ticketDetail.company || "PLANT"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm">
              <div className="space-y-4">
                <div className="pb-3 border-b dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Nomor Booking</span>
                  <span className="font-mono font-black text-slate-800 dark:text-white text-base">
                    {ticketDetail.bookingno}
                  </span>
                </div>
                {ticketDetail.tiketno && (
                  <div className="pb-3 border-b dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-400 block mb-1">Nomor Tiket</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {ticketDetail.tiketno}
                    </span>
                  </div>
                )}
                <div className="pb-3 border-b dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Nomor POSTO / SO</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {ticketDetail.posto || "-"}
                  </span>
                </div>
                <div className="pb-3 border-b dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Nomor Polisi (Nopol)</span>
                  <span className="inline-block bg-slate-900 text-white font-mono text-xs font-bold px-3 py-1 rounded border border-slate-700">
                    {ticketDetail.nopol || "-"}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="pb-3 border-b dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Driver</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">
                    {ticketDetail.driver || "-"}
                  </span>
                </div>
                <div className="pb-3 border-b dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Tonase (Qty)</span>
                  <span className="font-black text-slate-800 dark:text-white">
                    {ticketDetail.qty} <span className="text-xs font-bold text-slate-500">Ton</span>
                  </span>
                </div>
                <div className="pb-3 border-b dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Status Pemuatan</span>
                  <span className="font-black text-red-600 dark:text-red-400">
                    {ticketDetail.positionString || ticketDetail.statuspemuatan || "-"}
                  </span>
                </div>
                <div className="pb-3 border-b dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 block mb-1">Produk</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {ticketDetail.produkString || "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t dark:border-slate-800">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-xs"
              >
                Batal
              </Button>
              <Button
                onClick={() => setIsConfirmOpen(true)}
                className="h-12 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-red-500/20 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Hapus Paksa Tiket
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsConfirmOpen(false);
            setConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
          <DialogHeader className="p-8 bg-red-50 dark:bg-red-950/20 border-b border-red-100/50 dark:border-red-950/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-2xl">
                <AlertTriangle className="h-6 w-6 text-red-600 animate-bounce" />
              </div>
              <div>
                <DialogTitle className="text-red-700 dark:text-red-400 font-black uppercase tracking-tight">
                  Konfirmasi Hapus Paksa
                </DialogTitle>
                <DialogDescription className="text-red-600 dark:text-red-400 font-bold text-xs mt-1">
                  Prosedur ini akan menghapus data secara permanen.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-800 space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Tiket yang akan dihapus
              </p>
              <p className="font-mono font-black text-sm text-slate-800 dark:text-white">
                {ticketDetail?.bookingno}
              </p>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                {ticketDetail?.nopol} — QTY {ticketDetail?.qty} TON
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                Ketik <span className="text-red-600 font-black">SETUJU</span> untuk melanjutkan :
              </label>
              <Input
                placeholder="SETUJU"
                className="h-12 text-center text-base font-black tracking-widest border-slate-200 dark:border-slate-800 focus-visible:ring-red-500 rounded-xl"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-t dark:border-slate-800 gap-2 flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setConfirmText("");
              }}
              className="h-12 rounded-xl font-bold uppercase tracking-wider text-xs border-slate-200"
            >
              Batal
            </Button>
            <Button
              onClick={handleForceDelete}
              disabled={confirmText.toUpperCase() !== "SETUJU" || isDeleting}
              className="h-12 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-red-500/20"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Memproses...
                </>
              ) : (
                "Hapus Sekarang"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
