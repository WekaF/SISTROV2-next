"use client";
import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Truck,
  Search,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useSession } from "next-auth/react";

interface ReviewItem {
  ID?: number;
  TransportCode?: string;
  transportir?: string;
  nopol?: string;
  jeniskendaraan?: string;
  sumbu?: string;
  updatedon?: string | Date;
  status_armada?: string;
  aprrovestatus?: string;
  approver?: string;
}

export default function ArmadaApprovalsPage() {
  const { data: session } = useSession();
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const companyCode = (session?.user as any)?.companyCode as string | undefined;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["armada-review", companyCode],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("draw", "1");
      params.append("start", "0");
      params.append("length", "100");
      params.append("search[value]", "");
      if (companyCode) params.append("companyCode", companyCode);

      const res = await apiFetch("/api/Armada/DataTableReview", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      if (!res.ok) throw new Error(`[${res.status}] ${res.statusText}`);
      return res.json();
    },
    enabled: !!session,
  });

  const allItems: ReviewItem[] = data?.data ?? [];
  const filtered = search
    ? allItems.filter((item) => {
        const s = search.toLowerCase();
        return (
          (item.nopol ?? "").toLowerCase().includes(s) ||
          (item.transportir ?? "").toLowerCase().includes(s)
        );
      })
    : allItems;

  const pendingCount = allItems.filter((i) => !i.status_armada || i.status_armada === "0").length;

  const approveMutation = useMutation({
    mutationFn: async ({ id, nopol }: { id: number | string; nopol: string }) => {
      const res = await apiFetch("/api/Armada/ApproveDataReview", {
        method: "POST",
        body: JSON.stringify({ ID: id, nopol }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      addToast({ title: "Disetujui", description: "Armada berhasil diverifikasi", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["armada-review"] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, nopol }: { id: number | string; nopol: string }) => {
      const res = await apiFetch("/api/Armada/RejectDataReview", {
        method: "POST",
        body: JSON.stringify({ ID: id, nopol }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      addToast({ title: "Ditolak", description: "Armada ditolak", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["armada-review"] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Persetujuan Armada Baru</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Verifikasi dan setujui pengajuan armada dari Rekanan/Transportir.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["armada-review"] })}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="shadow-theme-xs">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Review spesifikasi kendaraan sebelum memberikan izin muat.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Cari Nopol / Rekanan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Transportir</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Kendaraan</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Spesifikasi</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Tanggal</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                      Tidak ada pengajuan armada yang perlu diverifikasi.
                    </td>
                  </tr>
                ) : filtered.map((item) => {
                  const id = item.ID ?? 0;
                  const nopol = item.nopol ?? "";
                  const statusRaw = item.status_armada ?? "";
                  const isPending = !statusRaw || statusRaw === "0";
                  return (
                    <tr key={`${id}-${nopol}`} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                      <td className="px-6 py-4 text-sm font-medium">
                        {item.transportir ?? item.TransportCode ?? "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-bold">{nopol}</div>
                            <div className="text-xs text-gray-400">
                              {item.jeniskendaraan ?? ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        Sumbu: {item.sumbu ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.updatedon
                          ? new Date(item.updatedon).toLocaleDateString("id-ID")
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          color={isPending ? "warning" : statusRaw === "1" ? "success" : "error"}
                          size="sm"
                          variant="light"
                        >
                          {isPending ? "Pending" : statusRaw === "1" ? "Disetujui" : "Ditolak"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Setujui"
                                className="text-emerald-500 hover:bg-emerald-50"
                                disabled={approveMutation.isPending}
                                onClick={() => approveMutation.mutate({ id, nopol })}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Tolak"
                                className="text-red-500 hover:bg-red-50"
                                disabled={rejectMutation.isPending}
                                onClick={() => rejectMutation.mutate({ id, nopol })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Statistik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] rounded-xl">
              <div>
                <p className="text-sm text-gray-500">Total Armada Terdaftar</p>
                <p className="text-2xl font-bold">{allItems.length}</p>
              </div>
              <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-500" /> Menunggu Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] rounded-xl">
              <div>
                <p className="text-sm text-gray-500">Pending Verifikasi</p>
                <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
              </div>
              <div className="h-10 w-10 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center">
                <Truck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
