"use client";

import React, { useState, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Search } from "lucide-react";

interface BypassRow {
  number: number;
  bookingcode: string;
  reason: string;
  posisi_awal: string;
  posisi_akhir: string;
  updatedby: string;
  tanggalupdate: string;
}

interface Filters {
  SD: string;
  ED: string;
  bookingcode: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function LogBypassPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [draft, setDraft] = useState<Filters>({ SD: today, ED: today, bookingcode: "" });
  const [filters, setFilters] = useState<Filters>(draft);

  const handleTampilkan = () => setFilters({ ...draft });

  const fetcher = useCallback(
    async (params: any) => {
      try {
        const result = await apiTable("/api/Tiket/LogBypass", {
          draw: params.draw,
          start: params.start,
          length: params.length,
          search: params.search || "",
          SD: filters.SD,
          ED: filters.ED,
          bookingcode: filters.bookingcode,
          company: activeCompanyCode || "",
          columns: [
            { data: "number", name: "bookingcode", searchable: false, orderable: false },
            { data: "bookingcode", name: "bookingcode", searchable: true, orderable: true },
            { data: "reason", name: "reason", searchable: true, orderable: false },
            { data: "posisi_awal", name: "posisi_awal", searchable: false, orderable: false },
            { data: "posisi_akhir", name: "posisi_akhir", searchable: false, orderable: false },
            { data: "updatedby", name: "updatedby", searchable: true, orderable: false },
            { data: "tanggalupdate", name: "updatedon", searchable: false, orderable: true },
          ],
        });
        return {
          data: result.data ?? [],
          recordsTotal: result.recordsTotal ?? 0,
          recordsFiltered: result.recordsFiltered ?? result.recordsTotal ?? 0,
        };
      } catch (err: any) {
        addToast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
        throw err;
      }
    },
    [apiTable, addToast, activeCompanyCode, filters]
  );

  const columns: DataTableColumn<BypassRow>[] = [
    { key: "number", header: "No", render: (r) => <span>{r.number}</span> },
    { key: "bookingcode", header: "Booking No", render: (r) => <span className="font-mono text-xs">{r.bookingcode}</span> },
    { key: "reason", header: "Alasan Bypass", render: (r) => <span className="text-xs">{r.reason}</span> },
    { key: "posisi_awal", header: "Posisi Awal", render: (r) => <span className="text-xs">{r.posisi_awal}</span> },
    { key: "posisi_akhir", header: "Posisi Akhir", render: (r) => <span className="text-xs">{r.posisi_akhir}</span> },
    { key: "updatedby", header: "Oleh", render: (r) => <span className="text-xs">{r.updatedby}</span> },
    { key: "tanggalupdate", header: "Waktu Update", render: (r) => <span className="text-xs whitespace-nowrap">{r.tanggalupdate}</span> },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-6 w-6" />
        <h1 className="text-xl font-bold">Log Bypass</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter</CardTitle>
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
            <div className="space-y-1">
              <Label className="text-xs">Booking Code</Label>
              <Input
                className="w-44"
                placeholder="Opsional"
                value={draft.bookingcode}
                onChange={(e) => setDraft((p) => ({ ...p, bookingcode: e.target.value }))}
              />
            </div>
            <Button onClick={handleTampilkan} className="gap-2">
              <Search className="h-4 w-4" />
              Tampilkan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["report-log-bypass", filters, activeCompanyCode]}
            fetcher={fetcher}
            rowKey={(r) => `${r.bookingcode}-${r.tanggalupdate}`}
            searchPlaceholder="Cari booking code, alasan..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
