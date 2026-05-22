"use client";

import React, { useState, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Search, TrendingUp, Ticket, Package, Truck } from "lucide-react";

interface StatRow {
  label: string;
  total: number;
  selesai: number;
  batal: number;
  proses: number;
}

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

export default function LaporanStatistikPage() {
  const { apiJson } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [draft, setDraft] = useState({ SD: firstOfMonth, ED: today });
  const [filters, setFilters] = useState(draft);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTampilkan = useCallback(async () => {
    setFilters({ ...draft });
    setLoading(true);
    try {
      const res = await apiJson(
        `/api/Tiket/StatistikReport?SD=${draft.SD}&ED=${draft.ED}&company=${activeCompanyCode || ""}`
      );
      setStats(res);
    } catch (err: any) {
      addToast({ title: "Gagal memuat statistik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [draft, activeCompanyCode, apiJson, addToast]);

  const summaryCards = stats
    ? [
        { label: "Total Tiket", value: stats.total ?? 0, icon: Ticket, color: "bg-blue-500" },
        { label: "Tiket Selesai", value: stats.selesai ?? 0, icon: TrendingUp, color: "bg-green-500" },
        { label: "Tiket Batal", value: stats.batal ?? 0, icon: Package, color: "bg-red-500" },
        { label: "Tiket Dalam Proses", value: stats.proses ?? 0, icon: Truck, color: "bg-yellow-500" },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-xl font-bold">Laporan Statistik</h1>
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
              {loading ? "Memuat..." : "Tampilkan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`${card.color} p-3 rounded-lg text-white`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value.toLocaleString("id-ID")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Raw data table if available */}
      {stats?.rows && stats.rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Detail per Produk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Produk</th>
                    <th className="text-right p-3 font-medium">Total Tiket</th>
                    <th className="text-right p-3 font-medium">Selesai</th>
                    <th className="text-right p-3 font-medium">Batal</th>
                    <th className="text-right p-3 font-medium">Dalam Proses</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rows.map((row: StatRow, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">{row.label}</td>
                      <td className="p-3 text-right font-mono">{row.total?.toLocaleString("id-ID")}</td>
                      <td className="p-3 text-right font-mono text-green-600">{row.selesai?.toLocaleString("id-ID")}</td>
                      <td className="p-3 text-right font-mono text-red-600">{row.batal?.toLocaleString("id-ID")}</td>
                      <td className="p-3 text-right font-mono text-yellow-600">{row.proses?.toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!stats && !loading && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Pilih periode dan klik <strong>Tampilkan</strong> untuk melihat statistik</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
