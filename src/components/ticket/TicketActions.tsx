"use client";

import React, { useState } from "react";
import { Eye, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";

interface TicketActionsProps {
  bookingNo: string;
  id?: string;
  showView?: boolean;
  showPrint?: boolean;
  className?: string;
}

export function TicketActions({
  bookingNo,
  id,
  showView = true,
  showPrint = true,
  className = "",
}: TicketActionsProps) {
  const [isViewOpen, setIsViewOpen] = useState(false);

  const handlePrint = () => {
    // New Next.js native print route
    const printUrl = `/tiket/print/${bookingNo || id}`;
    window.open(printUrl, "_blank");
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showView && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-none hover:bg-brand-50 hover:text-brand-600 transition-colors"
          onClick={() => setIsViewOpen(true)}
          title="Lihat Detail"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}

      {showPrint && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-none hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
          onClick={handlePrint}
          title="Cetak Tiket"
        >
          <Printer className="h-4 w-4" />
        </Button>
      )}

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        bookingNo={bookingNo}
      />
    </div>
  );
}

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingNo: string;
}

export function TicketDetailModal({
  isOpen,
  onClose,
  bookingNo,
}: TicketDetailModalProps) {
  const { apiJson } = useApi();
  const { data: detail, isLoading } = useQuery({
    queryKey: ["ticket-detail", bookingNo],
    queryFn: () => apiJson(`/api/Tiket/DetailData`, {
      method: "POST",
      body: JSON.stringify({ bookingno: bookingNo })
    }),
    enabled: isOpen && !!bookingNo,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-none border-none shadow-2xl">
        <DialogHeader className="p-6 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-sm font-black uppercase tracking-widest text-gray-400">
            Detail Tiket: <span className="text-brand-600">{bookingNo}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-8">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500 opacity-50" />
            </div>
          ) : detail ? (
            <div className="grid grid-cols-2 gap-8">
              <DetailItem label="Nopol" value={detail.nopol} />
              <DetailItem label="Driver" value={detail.driver} />
              <DetailItem label="Tonase" value={`${detail.qty} TON`} />
              <DetailItem label="Shift" value={detail.shift} />
              <DetailItem label="Tanggal Muat" value={detail.tanggalString} />
              <DetailItem label="Status" value={detail.positionString} isStatus />
              <div className="col-span-2">
                <DetailItem label="Keterangan" value={detail.keterangan || "-"} />
              </div>
            </div>
          ) : (
            <p className="text-center py-12 text-gray-400 font-bold uppercase text-xs tracking-widest">
              Gagal memuat data.
            </p>
          )}
        </div>

        <div className="p-6 bg-gray-50/30 dark:bg-white/[0.01] flex justify-end">
          <Button onClick={onClose} className="rounded-none px-8 font-black uppercase text-[10px] tracking-widest h-11">
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value, isStatus = false }: { label: string; value: string; isStatus?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      {isStatus ? (
        <div className="inline-flex px-3 py-1 rounded-none bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
          {value}
        </div>
      ) : (
        <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{value}</p>
      )}
    </div>
  );
}
