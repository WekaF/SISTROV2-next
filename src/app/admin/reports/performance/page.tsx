"use client";

import React, { useState, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Search, Clock, Truck, CheckCircle, XCircle } from "lucide-react";

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

interface PerformanceData {
  totalBooking: number;
  totalSelesai: number;
  totalBatal: number;
  totalProses: number;
  persentaseSelesai: number;
  persentaseBatal: number;
  avgDurasiMenit: number;
}

export default function PerformanceAnalysisPage() {
  const { apiJson } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [draft, setDraft] = useState({ SD: firstOfMonth, ED: today });
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTampilkan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiJson(
        `/api/Tiket/StatistikReport?SD=${draft.SD}&ED=${draft.ED}&company=${activeCompanyCode || ""}`
      );
      setPerf(res);
    } catch (err: any) {
      addToast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [draft, activeCompanyCode, apiJson, addToast]);

  const kpiCards = perf
    ? [
        {
          label: "Total Booking",
          value: perf.totalBooking ?? 0,
          icon: Truck,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Selesai",
          value: perf.totalSelesai ?? 0,
          sub: perf.persentaseSelesai != null ? `${perf.persentaseSelesai.toFixed(1)}%` : "",
          icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-50",
        },
        {
          label: "Dibatalkan",
          value: perf.totalBatal ?? 0,
          sub: perf.persentaseBatal != null ? `${perf.persentaseBatal.toFixed(1)}%` : "",
          icon: XCircle,
          color: "text-red-600",
          bg: "bg-red-50",
        },
        {
          label: "Dalam Proses",
          value: perf.totalProses ?? 0,
          icon: Clock,
          color: "text-yellow-600",
          bg: "bg-yellow-50",
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6" />
        <div>
          <h1 className="text-xl font-bold">Performance Analysis</h1>
          <p className="text-sm text-muted-foreground">Analisis performa operasional tiket per periode</p>
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter Periode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Mulai</Label>
              <Input
                type="date"
                className="w-36"
                value={draft.SD}
                onChange={(e) => setDraft((p) => ({ ...p, SD: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Akhir</Label>
              <Input
                type="date"
                className="w-36"
                value={draft.ED}
                onChange={(e) => setDraft((p) => ({ ...p, ED: e.target.value }))}
              />
            </div>
            <Button onClick={handleTampilkan} disabled={loading} className="gap-2">
              <Search className="h-4 w-4" />
              {loading ? "Memuat..." : "Analisis"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {perf && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  <div className={`${kpi.bg} p-2 rounded-lg`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                </div>
                <div className="text-3xl font-bold">{kpi.value.toLocaleString("id-ID")}</div>
                {kpi.sub && (
                  <div className={`text-sm font-semibold mt-1 ${kpi.color}`}>{kpi.sub} dari total</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progress bars */}
      {perf && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Distribusi Status Tiket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                label: "Selesai",
                value: perf.totalSelesai ?? 0,
                total: perf.totalBooking ?? 1,
                color: "bg-green-500",
              },
              {
                label: "Dibatalkan",
                value: perf.totalBatal ?? 0,
                total: perf.totalBooking ?? 1,
                color: "bg-red-500",
              },
              {
                label: "Dalam Proses",
                value: perf.totalProses ?? 0,
                total: perf.totalBooking ?? 1,
                color: "bg-yellow-500",
              },
            ].map((bar) => {
              const pct = bar.total > 0 ? Math.round((bar.value / bar.total) * 100) : 0;
              return (
                <div key={bar.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{bar.label}</span>
                    <span className="font-semibold">{bar.value.toLocaleString("id-ID")} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bar.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {!perf && !loading && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">
              Pilih periode dan klik <strong>Analisis</strong> untuk melihat performa operasional
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
