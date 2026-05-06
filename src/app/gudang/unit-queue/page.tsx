"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Warehouse, Truck, Package, RefreshCw, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { hasGudangAccess } from "@/lib/role-utils";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import Badge from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GudangQueueItem {
  id: string;
  namagudang: string;
  namaproduk: string;
  antrianproduk: number;
  antriangudang: number;
  stok: number;
  Aktif: string | boolean;
}

export default function UnitQueuePage() {
  const { data: session } = useSession();
  const { apiTable } = useApi();
  const { activeCompanyCode } = useCompany();
  const { addToast } = useToast();

  const role = (session?.user as any)?.role;
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isGudangFull = hasGudangAccess(role, roles);

  const columns: DataTableColumn<GudangQueueItem>[] = [
    { key: "no", header: "No", className: "text-center", headerClassName: "text-center", render: (_, i) => <span className="text-xs text-slate-400 font-bold">{i + 1}</span> },
    { key: "namagudang", header: "Gudang", render: (row) => <span className="font-black text-slate-800 dark:text-white uppercase text-xs">{row.namagudang}</span> },
    { key: "namaproduk", header: "Produk", render: (row) => <span className="text-slate-600 dark:text-slate-400 text-xs font-bold">{row.namaproduk}</span> },
    { 
      key: "antrianproduk", 
      header: "Antrian Produk", 
      className: "text-center", 
      headerClassName: "text-center",
      render: (row) => (
        <div className="flex flex-col items-center">
          <span className="font-bold text-slate-900 dark:text-white">{row.antrianproduk}</span>
          <span className="text-[9px] text-slate-400 font-bold">TRUK</span>
        </div>
      )
    },
    { 
      key: "antriangudang", 
      header: "Antrian Total", 
      className: "text-center", 
      headerClassName: "text-center",
      render: (row) => (
        <div className="flex flex-col items-center">
          <span className={cn(
            "font-black text-sm",
            row.antriangudang >= 20 ? "text-red-600" :
            row.antriangudang >= 10 ? "text-amber-600" : "text-slate-900 dark:text-white"
          )}>
            {row.antriangudang}
          </span>
          <span className="text-[9px] text-slate-400 font-bold">TRUK</span>
        </div>
      )
    },
    { 
      key: "stok", 
      header: "Stok", 
      className: "text-right", 
      headerClassName: "text-right",
      render: (row) => (
        <div className="text-right">
          <span className="font-black text-brand-600">{row.stok.toLocaleString()}</span>
          <span className="text-[9px] text-slate-400 font-bold ml-1">TON</span>
        </div>
      )
    },
    { 
      key: "Aktif", 
      header: "Status", 
      className: "text-center", 
      headerClassName: "text-center",
      render: (row) => {
        const isAktif = row.Aktif === "1" || row.Aktif === "True" || row.Aktif === true;
        return (
          <Badge color={isAktif ? "success" : "error"} variant="light" size="sm">
            {isAktif ? "Aktif" : "Nonaktif"}
          </Badge>
        );
      }
    }
  ];

  const [items, setItems] = useState<GudangQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiTable("/api/Gudang/DataMapping", {
        draw: 1,
        start: 0,
        length: 100,
        cmd: "refresh",
        companyCode: activeCompanyCode,
      });
      setItems(res.data || []);
      setLastUpdated(new Date());
    } catch {
      addToast({ title: "Error", description: "Gagal memuat data antrian gudang", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [apiTable, activeCompanyCode, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group by namagudang to aggregate per-gudang totals
  const gudangMap = new Map<string, { namagudang: string; totalProduk: number; totalGudang: number; totalStok: number; produkList: string[]; aktif: boolean }>();
  for (const item of items) {
    const isAktif = item.Aktif === "1" || item.Aktif === "True" || item.Aktif === true;
    if (!gudangMap.has(item.namagudang)) {
      gudangMap.set(item.namagudang, { namagudang: item.namagudang, totalProduk: 0, totalGudang: item.antriangudang, totalStok: 0, produkList: [], aktif: isAktif });
    }
    const g = gudangMap.get(item.namagudang)!;
    g.totalProduk += item.antrianproduk;
    g.totalStok += item.stok;
    if (!g.produkList.includes(item.namaproduk)) g.produkList.push(item.namaproduk);
  }
  const gudangList = Array.from(gudangMap.values());

  const totalAntrian = gudangList.reduce((s, g) => s + g.totalGudang, 0);
  const totalStok = items.reduce((s, i) => s + i.stok, 0);
  const congested = gudangList.filter((g) => g.totalGudang >= 10).length;

  const getStatusColor = (antrian: number) => {
    if (antrian >= 20) return "error";
    if (antrian >= 10) return "warning";
    if (antrian >= 5)  return "info";
    return "success";
  };

  const getStatusLabel = (antrian: number) => {
    if (antrian >= 20) return "Padat";
    if (antrian >= 10) return "Ramai";
    if (antrian >= 5)  return "Normal";
    return "Sepi";
  };

  const getBarWidth = (antrian: number) => Math.min(100, (antrian / 20) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Antrian Per Gudang</h1>
            <Badge color={isGudangFull ? "success" : "info"} variant="solid" size="sm">
              {isGudangFull ? "Full Access" : "Read Only"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Monitoring kepadatan antrian real-time di setiap gudang pemuatan.
            {lastUpdated && (
              <span className="ml-2 text-slate-400">
                Diperbarui {lastUpdated.toLocaleTimeString("id-ID")}
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="gap-2 shrink-0">
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-brand-500 text-white">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Total Gudang</p>
              <h3 className="text-2xl font-black">{gudangList.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-xl">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Antrian</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {totalAntrian} <span className="text-xs font-bold text-slate-400">TRUK</span>
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 bg-green-50 dark:bg-green-500/10 text-green-600 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Stok</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {totalStok.toLocaleString()} <span className="text-xs font-bold text-slate-400">TON</span>
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-5 flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", congested > 0 ? "bg-red-50 dark:bg-red-500/10 text-red-600" : "bg-slate-50 dark:bg-slate-800 text-slate-400")}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gudang Ramai</p>
              <h3 className={cn("text-2xl font-black", congested > 0 ? "text-red-600" : "text-slate-900 dark:text-white")}>
                {congested} <span className="text-xs font-bold text-slate-400">LOKASI</span>
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gudang Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-none shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : gudangList.length === 0 ? (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            Tidak ada data gudang.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gudangList.map((g) => (
            <Card
              key={g.namagudang}
              className={cn(
                "border-none shadow-sm overflow-hidden transition-all hover:shadow-md",
                !g.aktif && "opacity-60",
                g.totalGudang >= 20 && "ring-2 ring-red-400/60",
              )}
            >
              <CardContent className="p-0">
                {/* Card header strip */}
                <div className={cn(
                  "px-5 py-4 flex items-start justify-between",
                  g.totalGudang >= 20 ? "bg-red-500" :
                  g.totalGudang >= 10 ? "bg-amber-500" :
                  g.totalGudang >= 5  ? "bg-brand-500" : "bg-slate-800"
                )}>
                  <div>
                    <p className="text-white font-black text-sm uppercase tracking-tight">{g.namagudang}</p>
                    <p className="text-white/70 text-[10px] font-bold mt-0.5">
                      {g.produkList.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      color={getStatusColor(g.totalGudang) as any}
                      variant="solid"
                      size="sm"
                    >
                      {getStatusLabel(g.totalGudang)}
                    </Badge>
                    {!g.aktif && (
                      <Badge color="light" variant="solid" size="sm">Nonaktif</Badge>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="px-5 py-4 bg-white dark:bg-slate-900 space-y-4">
                  {/* Antrian bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Antrian Truk
                      </span>
                      <span className="text-xl font-black text-slate-900 dark:text-white">
                        {g.totalGudang}
                        <span className="text-xs font-bold text-slate-400 ml-1">TRUK</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          g.totalGudang >= 20 ? "bg-red-500" :
                          g.totalGudang >= 10 ? "bg-amber-500" :
                          g.totalGudang >= 5  ? "bg-brand-500" : "bg-green-500"
                        )}
                        style={{ width: `${getBarWidth(g.totalGudang)}%` }}
                      />
                    </div>
                  </div>

                  {/* Detail stats */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antrian Produk</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                        {g.totalProduk}
                        <span className="text-[10px] font-bold text-slate-400 ml-1">TRUK</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Package className="h-3 w-3" /> Stok
                      </p>
                      <p className="text-lg font-black text-brand-600 mt-0.5">
                        {g.totalStok.toLocaleString()}
                        <span className="text-[10px] font-bold text-slate-400 ml-1">TON</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail table per produk */}
      {!isLoading && items.length > 0 && (
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-0">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                Detail Antrian Per Produk
              </h3>
              <Badge color="light" variant="solid" size="sm" className="font-bold">{items.length} Data</Badge>
            </div>
            
            <DataTable
              columns={columns}
              queryKey={["gudang-unit-queue-local", activeCompanyCode]}
              fetcher={async () => ({
                data: items,
                recordsTotal: items.length,
                recordsFiltered: items.length
              })}
              rowKey={(r) => r.id}
              striped
              compact
              searchPlaceholder="Cari gudang / produk..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
