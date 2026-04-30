"use client";
import React from "react";
import { Plus, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";

interface TicketData {
  bookingno: string;
  posto?: string;
  nopol: string;
  Nopol?: string;
  tanggalString: string;
  shift: string;
  produkString: string;
  transportString: string;
  driver: string;
  DriverName?: string;
  idproduk?: string;
  tujuan?: string;
  positionString?: string;
  statuspemuatan?: string;
  status: string;
  Status?: string;
  createdat: string;
  TglBooking?: string;
  JamMasuk?: string;
}

export default function RekananTicketPage() {
  const { data: session } = useSession();
  const { apiTable } = useApi();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const postoFilter = searchParams?.get('posto');
  const companyCode = (session?.user as any)?.companyCode;

  const fetcher = async (params: DataTableParams) => {
    const result = await apiTable("/api/Tiket/DataTableFilter", {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: { value: params.search },
      companyCode,
      posto: postoFilter || undefined,
      // Pass a very old Start Date (SD) to bypass the default 3-month limit if filtering by POSTO
      SD: postoFilter ? "2020-01-01" : undefined,
      cmd: 'refresh',
      order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
      columns: [
        { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
        { data: "posto", name: "posto", searchable: true, orderable: true },
        { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
        { data: "shift", name: "idshift", searchable: true, orderable: true },
        { data: "produkString", name: "idproduk", searchable: true, orderable: true },
        { data: "nopol", name: "nopol", searchable: true, orderable: true },
        { data: "driver", name: "driver", searchable: true, orderable: true },
        { data: "transportString", name: "idtransport", searchable: true, orderable: true },
        { data: "tujuan", name: "tujuan", searchable: true, orderable: true },
        { data: "positionString", name: "position", searchable: true, orderable: true },
        { data: "status", name: "statuspemuatan", searchable: true, orderable: true },
        { data: "createdat", name: "tanggal", searchable: true, orderable: true }
      ]
    });
    return {
      data: result.data ?? [],
      recordsTotal: result.recordsTotal ?? 0,
      recordsFiltered: result.recordsFiltered ?? result.recordsTotal ?? 0,
    };
  };

  const columns: DataTableColumn<TicketData>[] = [
    {
      key: "bookingno",
      header: "No Booking",
      render: (t) => (
        <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
          {t.bookingno ?? "-"}
        </div>
      ),
    },
    {
      key: "posto",
      header: "POSTO",
      render: (t) => (
        <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
          {t.posto ?? "-"}
        </div>
      ),
    },
    {
      key: "tanggalString",
      header: "Tanggal Muat",
      render: (t) => (
        <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
          {t.tanggalString ?? "-"}
        </div>
      ),
    },
    {
      key: "shift",
      header: "Shift",
      render: (t) => (
        <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
          {t.shift ?? "-"}
        </div>
      ),
    },
    {
      key: "produkString",
      header: "Produk",
      render: (t) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
            {t.produkString ?? "-"}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">{t.idproduk ?? "-"}</div>
        </div>
      ),
    },
    {
      key: "nopol",
      header: "Armada",
      render: (t) => (
        <div className="bg-gray-900 text-white px-2 py-1 rounded font-mono text-xs font-bold inline-block">
          {t.Nopol || t.nopol}
        </div>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      render: (t) => (
        <div className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">
          {t.DriverName || t.driver}
        </div>
      ),
    },
    {
      key: "transportString",
      header: "Transport",
      render: (t) => (
        <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
          {t.transportString ?? "-"}
        </div>
      ),
    },
    {
      key: "tujuan",
      header: "Tujuan",
      render: (t) => (
        <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
          {t.tujuan ?? "-"}
        </div>
      ),
    },
    {
      key: "positionString",
      header: "Posisi",
      render: (t) => (
        <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
          {t.positionString ?? "-"}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t) => (
        <div className="flex flex-col gap-1">
          <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
            {t.statuspemuatan ?? "-"}
          </div>
          <Badge
            color={(t.JamMasuk || t.Status?.includes("Check")) ? "success" : "info"}
            size="sm"
            variant="light"
            className="italic font-bold w-fit"
          >
            {t.JamMasuk ? "Check-in" : (t.Status || "Booked")}
          </Badge>
        </div>
      ),
    },
    {
      key: "createdat",
      header: "Activity",
      headerClassName: "text-right",
      className: "text-right",
      render: (t) => (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
            <Calendar className="h-3 w-3" />
            {new Date(t.TglBooking || t.createdat).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold">
            <Clock className="h-3 w-3" />
            {new Date(t.TglBooking || t.createdat).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            Daftar Tiket Saya
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Monitoring status tiket dan kedatangan armada Anda.
          </p>
        </div>
      </div>

      <Card className="shadow-theme-xs">
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["rekanan-tickets", companyCode, postoFilter]}
            fetcher={fetcher}
            rowKey={(t) => t.bookingno}
            searchPlaceholder="Cari No Booking atau Nopol..."
            emptyText="Belum ada tiket yang diterbitkan."
            toolbar={
              <Button
                size="sm"
                onClick={() => (window.location.href = "/tiket/booking")}
                className="bg-brand-500 shadow-lg shadow-brand-500/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Booking Baru
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
