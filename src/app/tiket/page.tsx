"use client";
import React, { Suspense } from "react";
import { Plus, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useSession } from "next-auth/react";
import { useCompany } from "@/context/CompanyContext";
import { useApi } from "@/hooks/use-api";
import { useSearchParams } from "next/navigation";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
import { TicketActions } from "@/components/ticket/TicketActions";
import { normalizeRole } from "@/lib/role-utils";

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
  updatedonString?: string;
  qty?: number;
}

function RekananTicketContent() {
  const { data: session } = useSession();
  const { apiTable } = useApi();
  const searchParams = useSearchParams();
  const postoFilter = searchParams.get('posto');
  const companyCode = useCompany().activeCompanyCode;

  const fetcher = async (params: DataTableParams) => {
    // Use DataTablePeriodeTiket if filtering by POSTO, otherwise use Legacy
    const endpoint = postoFilter ? "/api/Tiket/DataTablePeriodeTiket" : "/api/Tiket/DataTableFilterLegacy";
    
    const result = await apiTable(endpoint, {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: { value: params.search },
      companyCode,
      posto: postoFilter || undefined,
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
      key: "action",
      header: "Aksi",
      render: (t) => (
        <TicketActions bookingNo={t.bookingno} />
      ),
    },
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
      key: "qty",
      header: "Qty",
      render: (t) => (
        <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
          {t.qty ? `${t.qty} TON` : "-"}
        </div>
      ),
    },
    {
      key: "positionString",
      header: "Posisi / Status",
      render: (t) => (
        <div className="flex flex-col gap-1">
          <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight uppercase">
            {t.positionString ?? "-"}
          </div>
          {t.statuspemuatan && (
            <Badge color="info" size="sm" variant="light" className="w-fit font-bold italic">
              {t.statuspemuatan}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "updatedonString",
      header: "Update Terakhir",
      render: (t) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
            <Calendar className="h-3 w-3" />
            {t.updatedonString || new Date(t.createdat).toLocaleDateString()}
          </div>
          {!t.updatedonString && (
             <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
              <Clock className="h-3 w-3" />
              {new Date(t.createdat).toLocaleTimeString()}
            </div>
          )}
        </div>
      ),
    },
  ];

  const role = (session?.user as any)?.role;
  const roles = (session?.user as any)?.roles || [];
  const isTransport = ["transport", "rekanan"].includes(normalizeRole(role)) || 
    roles.some((r: string) => ["transport", "rekanan"].includes(normalizeRole(r)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {postoFilter ? "Riwayat Lengkap POSTO" : "Daftar Tiket Saya"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {postoFilter
              ? `Menampilkan data tiket lengkap untuk POSTO: ${postoFilter}`
              : "Monitoring status tiket dan kedatangan armada Anda."}
          </p>
        </div>
      </div>

      <Card className="shadow-theme-xs rounded-none border-none">
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["rekanan-tickets", companyCode, postoFilter ?? ""]}
            fetcher={fetcher}
            rowKey={(t) => t.bookingno}
            searchPlaceholder="Cari No Booking atau Nopol..."
            emptyText="Belum ada tiket yang ditemukan."
            toolbar={
              !postoFilter && isTransport && (
                <Button
                  size="sm"
                  onClick={() => (window.location.href = "/tiket/booking")}
                  className="bg-brand-500 shadow-lg shadow-brand-500/20"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Booking Baru
                </Button>
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function RekananTicketPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Memuat data tiket...</div>}>
      <RekananTicketContent />
    </Suspense>
  );
}
