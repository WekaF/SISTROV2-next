"use client";

import React, { useState, useCallback } from "react";
import { BarChart3, Activity, ArrowRightLeft, TrendingUp } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { DataTable, DataTableColumn } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";

interface TrafficData {
  number: number;
  tujuan: string;
  qty: number;
}

export default function GudangTrafficPage() {
  const { apiTable } = useApi();
  const { activeCompanyCode } = useCompany();
  const [summary, setSummary] = useState({ count: 0, total: 0 });

  const fetcher = useCallback(
    async (params: any) => {
      const res = await apiTable("/api/Gudang/TrafficGudang", {
        ...params,
        cmd: "refresh",
        companyCode: activeCompanyCode,
      });
      
      const data = res.data || [];
      setSummary({
        count: data.length,
        total: data.reduce((s: number, i: any) => s + (parseFloat(i.qty) || 0), 0)
      });
      
      return res;
    },
    [apiTable, activeCompanyCode]
  );

  const columns: DataTableColumn<TrafficData>[] = [
    {
      key: "number",
      header: "No.",
      className: "w-16 text-center",
      headerClassName: "text-center",
      render: (_, i) => <span className="text-xs font-mono text-slate-400 font-bold">{i + 1}</span>,
    },
    {
      key: "tujuan",
      header: "Tujuan Pengiriman",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-500 shadow-sm shadow-brand-500/50" />
          <span className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">
            {row.tujuan}
          </span>
        </div>
      ),
    },
    {
      key: "qty",
      header: "Total Tonase",
      className: "text-right",
      headerClassName: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-black text-xl text-brand-600">
            {parseFloat(String(row.qty)).toLocaleString()}
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Ton
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
              Traffic Antrian Gudang
            </h1>
            <Badge color="info" variant="solid" size="sm">
              Summary Traffic
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Ringkasan aktivitas pemuatan gudang berdasarkan tujuan pengiriman.
          </p>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-brand-600 text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
            <ArrowRightLeft className="h-20 w-20" />
          </div>
          <CardContent className="p-6 relative z-10">
            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">
              Main Activity
            </p>
            <h3 className="text-2xl font-black">Warehouse Traffic</h3>
            <div className="mt-4 flex items-center gap-2 text-brand-100">
              <Activity className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Real-time Data Stream</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-2xl">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tujuan Aktif</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{summary.count}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-50 dark:bg-green-500/10 text-green-600 rounded-2xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Volume</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {summary.total.toLocaleString()} <span className="text-xs font-bold text-slate-400">TON</span>
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                <Activity className="h-4 w-4 text-brand-600" />
              </div>
              <CardTitle className="text-lg font-black tracking-tight text-slate-800 dark:text-white uppercase">Activity Gudang</CardTitle>
            </div>
            <Badge color="light" variant="solid" size="sm" className="font-black uppercase tracking-[0.2em] text-[10px]">
              Live Feed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            queryKey={["gudang-traffic-summary", activeCompanyCode]}
            fetcher={fetcher}
            rowKey={(r) => r.tujuan}
            striped
            compact
            searchPlaceholder="Filter tujuan pengiriman..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
