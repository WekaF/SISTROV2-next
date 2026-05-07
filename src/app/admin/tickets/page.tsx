"use client";
import React, { Suspense } from "react";
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  Clock,
  LayoutGrid,
  ListFilter,
  Loader2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { TicketActions } from "@/components/ticket/TicketActions";
import Badge from "@/components/ui/badge/Badge";

function AdminTicketsContent() {
  const { apiTable } = useApi();
  const { activeCompanyCode } = useCompany();
  const [searchTerm, setSearchTerm] = React.useState("");

  const columns: DataTableColumn[] = [
    {
      key: "bookingno",
      header: "Booking No",
      searchable: true,
      className: "font-black text-brand-600 font-mono text-[11px]",
    },
    {
      key: "posto",
      header: "POSTO",
      searchable: true,
      className: "font-bold text-gray-900 dark:text-white text-[11px]",
    },
    {
      key: "tanggalString",
      header: "Tanggal",
      className: "text-[11px] font-bold",
    },
    {
      key: "shift",
      header: "Shift",
      render: (row: any) => (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="font-bold">{row.shift}</span>
        </div>
      ),
    },
    {
      key: "nopol",
      header: "No. Polisi",
      searchable: true,
      className: "font-black text-[11px] uppercase tracking-wider",
    },
    {
      key: "driver",
      header: "Driver",
      searchable: true,
      className: "text-[11px] font-bold text-gray-600 dark:text-gray-400 truncate max-w-[120px]",
    },
    {
      key: "produkString",
      header: "Produk",
      className: "text-[11px] font-bold text-gray-900 dark:text-white",
    },
    {
      key: "transportString",
      header: "Transportir",
      className: "text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate max-w-[150px]",
    },
    {
      key: "qty",
      header: "Qty",
      render: (row: any) => (
        <div className="font-black text-[11px]">
          {row.qty?.toLocaleString()} <span className="text-[8px] text-gray-400 uppercase">TON</span>
        </div>
      ),
    },
    {
      key: "positionString",
      header: "Status",
      render: (row: any) => {
        const pos = row.position || "00";
        let variant: any = "default";
        if (pos === "00") variant = "info";
        if (pos === "10" || pos === "20") variant = "warning";
        if (pos === "30" || pos === "40") variant = "success";
        
        return (
          <Badge color={variant} size="sm" className="rounded-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
            {row.positionString || "PENDING"}
          </Badge>
        );
      },
    },
    {
      key: "actions",
      header: "Aksi",
      headerClassName: "text-right",
      className: "text-right",
      render: (row: any) => (
        <TicketActions 
          bookingNo={row.bookingno} 
          status={row.position || row.status} 
          currentNopol={row.nopol}
          currentDriver={row.driver}
          className="justify-end"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1.5 bg-[#003473] rounded-none" />
            <h1 className="text-3xl font-black tracking-tighter text-gray-900 dark:text-white uppercase italic">
              Ticket <span className="text-[#003473]">Management</span>
            </h1>
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] ml-4">
            Monitoring & Kontrol Operasional Logistik Global
          </p>
        </div>

      </div>

      <Card className="rounded-none border-none shadow-none ring-0 bg-white dark:bg-gray-900 overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="h-12 pl-12 rounded-none border-2 border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02] focus:border-[#003473] font-bold text-sm transition-all" 
                placeholder="Cari Booking No, Plat Nomor, atau Driver..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              {/* Optional: Add active filters count or other summary info here */}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            queryKey={['admin-tickets-global', searchTerm, activeCompanyCode]}
            fetcher={(params) => {
              const p = params as any;
              const payload = {
                draw: p.draw,
                start: p.start,
                length: p.length,
                search: { value: searchTerm },
                companyCode: activeCompanyCode,
                cmd: 'refresh',
                order: p.order?.length ? p.order : [{ column: 0, dir: "desc" }],
                columns: [
                  { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: p.columnFilters?.bookingno || "" } },
                  { data: "posto", name: "posto", searchable: true, orderable: true, search: { value: p.columnFilters?.posto || "" } },
                  { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
                  { data: "shift", name: "idshift", searchable: true, orderable: true },
                  { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: p.columnFilters?.nopol || "" } },
                  { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: p.columnFilters?.driver || "" } },
                  { data: "produkString", name: "idproduk", searchable: true, orderable: true },
                  { data: "transportString", name: "idtransport", searchable: true, orderable: true },
                  { data: "qty", name: "qty", searchable: true, orderable: true },
                  { data: "positionString", name: "positionString", searchable: true, orderable: true },
                  { data: "position", name: "position", searchable: true, orderable: true }
                ]
              };
              return apiTable('/api/Tiket/DataTableFilterLegacy', payload);
            }}
            columns={columns}
            rowKey={(row: any) => row.bookingno}
            borderless={true}
            striped={true}
            refetchInterval={30000}
            hideGlobalSearch={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#003473]" />
      </div>
    }>
      <AdminTicketsContent />
    </Suspense>
  );
}
