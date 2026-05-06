"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MapPin, Package, RefreshCw, Truck, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { hasGudangAccess } from "@/lib/role-utils";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import Badge from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface GudangTarget {
  id: string;
  namagudang: string;
  namaproduk: string;
  antrianproduk: number;
  antriangudang: number;
  stok: number;
  Aktif: string | boolean;
}

interface GudangDetail {
  id: string;
  idgudang: string;
  idproduk: string;
  namagudang: string;
  namaproduk: string;
  stok: number;
  antriangudang: number;
  antrianproduk: number;
  Aktif?: string | boolean;
}

export default function GudangTargetsPage() {
  const { data: session } = useSession();
  const { apiJson, apiTable } = useApi();
  const { activeCompanyCode } = useCompany();
  const { addToast } = useToast();

  const role = (session?.user as any)?.role;
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isGudangFull = hasGudangAccess(role, roles);

  const [selectedRow, setSelectedRow] = useState<GudangTarget | null>(null);
  const [detail, setDetail] = useState<GudangDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetcher = useCallback(
    (params: any) =>
      apiTable("/api/Gudang/DataMapping", {
        ...params,
        cmd: "refresh",
        companyCode: activeCompanyCode,
      }),
    [apiTable, activeCompanyCode]
  );

  const handleOpenDetail = async (row: GudangTarget) => {
    setSelectedRow(row);
    setDetail(null);
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    try {
      const d = await apiJson("/api/Gudang/DetailData", {
        method: "POST",
        body: JSON.stringify({ id: row.id }),
      });
      setDetail(d);
    } catch {
      addToast({ title: "Error", description: "Gagal memuat detail gudang tujuan", variant: "destructive" });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const columns: DataTableColumn<GudangTarget>[] = [
    { key: "no", header: "No", render: (_, i) => <span className="text-xs text-slate-400 font-bold">{i + 1}</span> },
    {
      key: "namagudang",
      header: "Gudang Tujuan",
      render: (row) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-500 shrink-0" />
          <span className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{row.namagudang}</span>
        </div>
      ),
    },
    {
      key: "namaproduk",
      header: "Produk",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{row.namaproduk}</span>
        </div>
      ),
    },
    {
      key: "antriangudang",
      header: "Antrian Total",
      className: "text-center",
      headerClassName: "text-center",
      render: (row) => (
        <div className="flex flex-col items-center">
          <span className="font-black text-lg text-slate-900 dark:text-white">{row.antriangudang}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">TRUK</span>
        </div>
      ),
    },
    {
      key: "antrianproduk",
      header: "Antrian Produk",
      className: "text-center",
      headerClassName: "text-center",
      render: (row) => (
        <div className="flex flex-col items-center">
          <span className="font-bold text-slate-700 dark:text-slate-300">{row.antrianproduk}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">TRUK</span>
        </div>
      ),
    },
    {
      key: "stok",
      header: "Stok Tersedia",
      className: "text-right",
      headerClassName: "text-right",
      render: (row) => (
        <div className="text-right">
          <span className="font-black text-xl text-brand-600">{row.stok.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">TON</span>
        </div>
      ),
    },
    {
      key: "Aktif",
      header: "Status",
      className: "text-center",
      headerClassName: "text-center",
      render: (row) => {
        const isAktif = row.Aktif === "1" || row.Aktif === "True" || row.Aktif === true;
        return (
          <div className="flex justify-center">
            {isAktif ? (
              <Badge color="success" variant="light" size="sm" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Menerima Muatan
              </Badge>
            ) : (
              <Badge color="error" variant="light" size="sm" className="gap-1">
                <XCircle className="h-3 w-3" />
                Tutup
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
          onClick={() => handleOpenDetail(row)}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Gudang Tujuan Bagian</h1>
            <Badge color={isGudangFull ? "success" : "info"} variant="solid" size="sm">
              {isGudangFull ? "Full Access" : "Read Only"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Daftar gudang tujuan pemuatan beserta kapasitas, stok, dan status penerimaan muatan.
          </p>
        </div>
      </div>

      {/* Table */}
      <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            queryKey={["gudang-targets", activeCompanyCode]}
            fetcher={fetcher}
            rowKey={(r) => r.id}
            striped
            compact
            searchPlaceholder="Cari nama gudang / produk..."
          />
        </CardContent>
      </Card>

      {/* Modal Detail Gudang Tujuan */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-500" />
              Detail Gudang Tujuan
            </DialogTitle>
            <DialogDescription>
              Informasi kapasitas dan kondisi gudang tujuan muat.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
              Memuat data...
            </div>
          ) : detail ? (
            <div className="space-y-5 py-2">
              {/* Nama & Status */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight">{detail.namagudang}</p>
                  <p className="text-sm text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                    <Package className="h-4 w-4" /> {detail.namaproduk}
                  </p>
                </div>
                {(() => {
                  const isAktif = detail.Aktif === "1" || detail.Aktif === "True" || detail.Aktif === true;
                  return (
                    <Badge color={isAktif ? "success" : "error"} variant="solid" size="sm">
                      {isAktif ? "Aktif" : "Nonaktif"}
                    </Badge>
                  );
                })()}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-brand-50 dark:bg-brand-500/10 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Stok</p>
                  <p className="text-2xl font-black text-brand-600 mt-1">
                    {detail.stok.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-brand-500 font-bold">TON</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antrian</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {detail.antriangudang}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">TRUK</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Per Produk</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {detail.antrianproduk}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold">TRUK</p>
                </div>
              </div>

              {/* Load indicator */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Tingkat Kepadatan</span>
                  <span className="text-xs font-bold text-slate-600">
                    {detail.antriangudang} / 20 truk (ref)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      detail.antriangudang >= 20 ? "bg-red-500" :
                      detail.antriangudang >= 10 ? "bg-amber-500" :
                      detail.antriangudang >= 5  ? "bg-brand-500" : "bg-green-500"
                    )}
                    style={{ width: `${Math.min(100, (detail.antriangudang / 20) * 100)}%` }}
                  />
                </div>
                <p className={cn(
                  "text-xs font-bold",
                  detail.antriangudang >= 20 ? "text-red-600" :
                  detail.antriangudang >= 10 ? "text-amber-600" :
                  detail.antriangudang >= 5  ? "text-brand-600" : "text-green-600"
                )}>
                  {detail.antriangudang >= 20 ? "🔴 Sangat Padat" :
                   detail.antriangudang >= 10 ? "🟡 Ramai" :
                   detail.antriangudang >= 5  ? "🔵 Normal" : "🟢 Sepi"}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
              Data tidak tersedia.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
