"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, CheckCircle2, Copy, ChevronRight, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

interface JapoNotifItem {
  NoPosto: string;
  TglJatuhTempo: string;
  KuantumTerlambat: number;
}

function formatTanggalJapo(val?: string | null): string {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export function JapoWarningCard() {
  const { apiJson } = useApi();
  const { addToast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["japo-notif"],
    queryFn: () => apiJson<{ data: JapoNotifItem[] }>("/api/Apg/getDataNotif"),
    staleTime: 1000 * 60 * 3,
  });

  const items = data?.data ?? [];

  const copyNoPosto = (nopo: string) => {
    navigator.clipboard.writeText(nopo);
    addToast({ title: "Disalin", description: `${nopo} disalin ke clipboard`, variant: "success" });
  };

  if (isLoading) {
    return (
      <Card className="shadow-theme-xs">
        <CardContent className="p-5 animate-pulse">
          <div className="h-5 w-40 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="shadow-theme-xs">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-amber-500" />
            Notifikasi Jatuh Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gagal memuat notifikasi jatuh tempo.</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600"
            >
              Coba Lagi
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-theme-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-amber-500" />
            Notifikasi Jatuh Tempo
          </CardTitle>
          <Link
            href="/pengajuan/jatuh-tempo"
            className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600"
          >
            Lihat Semua <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Semua Aman!</p>
            <p className="text-xs text-gray-400">Tidak ada tagihan atau jatuh tempo saat ini.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.NoPosto}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white font-mono truncate">
                      PO: {item.NoPosto}
                    </p>
                    <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-red-600 border border-red-100 dark:bg-gray-900 dark:border-red-900/40">
                      {formatTanggalJapo(item.TglJatuhTempo)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Terlambat: <span className="font-bold text-red-600">{item.KuantumTerlambat ?? 0} Ton</span>
                    </p>
                    <button
                      onClick={() => copyNoPosto(item.NoPosto)}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-500"
                    >
                      <Copy className="h-3 w-3" /> Salin
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
