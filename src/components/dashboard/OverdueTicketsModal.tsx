// src/components/dashboard/OverdueTicketsModal.tsx
"use client";
import { useEffect, useState } from "react";
import { X, AlertTriangle, Clock, Truck } from "lucide-react";

interface OverdueTicket {
  tiketno: string;
  nopol: string;
  driver: string;
  position: string;
  posisiLabel: string;
  timesec: string | null;
  durasimenit: number;
}

interface OverdueAlertsResponse {
  companyCode: string;
  totalOverdue: number;
  tickets: OverdueTicket[];
  generatedAt: string;
}

interface OverdueTicketsModalProps {
  open: boolean;
  onClose: () => void;
  companyCode?: string;
}

function formatDurasi(menit: number): string {
  const jam = Math.floor(menit / 60);
  const sisa = Math.round(menit % 60);
  if (jam === 0) return `${sisa} menit`;
  return `${jam} jam ${sisa} menit`;
}

export default function OverdueTicketsModal({ open, onClose, companyCode }: OverdueTicketsModalProps) {
  const [data, setData] = useState<OverdueAlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    const url = companyCode
      ? `/api/staffarea/overdue-alerts?companyCode=${encodeURIComponent(companyCode)}`
      : "/api/staffarea/overdue-alerts";

    fetch(url)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<OverdueAlertsResponse>;
      })
      .then(setData)
      .catch(e => setError(e.message ?? "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [open, companyCode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/50">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-red-800 dark:text-red-300">
              Eskalasi Diperlukan
            </h2>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              Tiket aktif &gt;2 jam belum selesai
              {data && ` — ${data.totalOverdue} tiket`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Memuat...
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center py-12 text-sm text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && data && data.tickets.length === 0 && (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Tidak ada tiket overdue.
            </div>
          )}

          {!loading && !error && data && data.tickets.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-5 py-2.5">No. Tiket</th>
                  <th className="text-left px-4 py-2.5">Nopol</th>
                  <th className="text-left px-4 py-2.5">Driver</th>
                  <th className="text-left px-4 py-2.5">Posisi</th>
                  <th className="text-right px-5 py-2.5">Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.tickets.map((t) => (
                  <tr key={t.tiketno} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {t.tiketno}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
                        <Truck className="h-3.5 w-3.5 text-gray-400" />
                        {t.nopol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                      {t.driver || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                        {t.posisiLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400 font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDurasi(t.durasimenit)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {data && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 text-right">
            Data per: {new Date(data.generatedAt).toLocaleTimeString("id-ID")}
          </div>
        )}
      </div>
    </div>
  );
}
