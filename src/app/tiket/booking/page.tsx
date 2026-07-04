"use client";
import React from "react";
import { Printer, Tag, Ticket } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { DataTable } from "@/components/ui/DataTable";

export default function TicketBookingPage() {
  const { apiTable } = useApi();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
          Booking Tiket Antrian
        </h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          Terbitkan tiket antrian berdasarkan order POSTO yang Anda miliki.
        </p>
      </div>

      <Card className="shadow-theme-xs overflow-hidden border-none bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/40 dark:shadow-none">
        <CardHeader className="border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-brand-500 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-none bg-brand-500 animate-pulse" />
            List Order Tersedia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            queryKey={['available-posto']}
            fetcher={(params) => apiTable('/api/POSTO/AvailableBaru', { ...params, cmd: 'refresh' })}
            rowKey={(row: any) => row.id || row.noposto}
            refetchInterval={10000}
            columns={[
              {
                key: "number",
                header: "No",
                headerClassName: "w-[40px] text-center",
                render: (_: any, index: number) => (
                  <div className="font-mono text-xs text-gray-400 text-center font-bold">
                    {index + 1}
                  </div>
                )
              },
              {
                key: "action",
                header: "Action",
                headerClassName: "w-[150px] text-center",
                render: (row: any) => (
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-[10px] font-black uppercase tracking-widest px-4 rounded-none bg-[#003473] hover:bg-[#002855] text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border-none"
                      onClick={() => router.push(`/tiket/booking/${row.guid || row.id}`)}
                    >
                      <Ticket className="h-3 w-3" />
                      Booking Tiket
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[10px] font-black uppercase tracking-widest px-3 border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 rounded-none shadow-sm transition-all"
                      onClick={() => {
                        window.open(`/posto/print/${row.guid || row.id}`, '_blank');
                      }}
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                  </div>
                )
              },
              {
                key: "plant",
                header: "Plant",
                render: (row: any) => (
                  <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight whitespace-nowrap">
                    {row.plant}
                  </div>
                )
              },
              {
                key: "tanggalString",
                header: "Tanggal",
                render: (row: any) => (
                  <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight whitespace-nowrap">
                    {row.tanggalString}
                  </div>
                )
              },
              {
                key: "noposto",
                header: "No POSTO",
                render: (row: any) => (
                  <div className="flex flex-col">
                    <div className="font-bold text-brand-600 dark:text-brand-400 font-mono text-sm tracking-tight">
                      {row.noposto}
                    </div>
                    {row.charter === "1" && (
                      <div className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                        <Tag className="h-2 w-2" /> Charter
                      </div>
                    )}
                  </div>
                )
              },
              {
                key: "tglakhirString",
                header: "Exp",
                render: (row: any) => (
                  <div className="font-bold text-rose-500 font-mono text-xs whitespace-nowrap">
                    {row.tglakhirString}
                  </div>
                )
              },
              {
                key: "tujuanString",
                header: "Tujuan",
                render: (row: any) => (
                  <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight uppercase max-w-[200px] truncate" title={row.tujuanString}>
                    {row.tujuanString}
                  </div>
                )
              },
              {
                key: "transportString",
                header: "Transport",
                render: (row: any) => (
                  <div className="font-bold text-gray-500 font-mono text-xs uppercase whitespace-nowrap bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {row.transportString || "-"}
                  </div>
                )
              },
              {
                key: "produkString",
                header: "Produk",
                render: (row: any) => (
                  <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight uppercase whitespace-nowrap">
                    {row.produkString}
                  </div>
                )
              },
              {
                key: "qty",
                header: "Qty",
                headerClassName: "text-right",
                className: "text-right",
                render: (row: any) => (
                  <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight">
                    {row.qty?.toLocaleString()}
                  </div>
                )
              },
              {
                key: "qtyrencana",
                header: "Qty Pesan",
                headerClassName: "text-right",
                className: "text-right",
                render: (row: any) => (
                  <div className="font-bold text-amber-600 font-mono text-sm tracking-tight">
                    {row.qtyrencana?.toLocaleString()}
                  </div>
                )
              },
              {
                key: "qtysisaBooking",
                header: "Qty Sisa",
                headerClassName: "text-right",
                className: "text-right",
                render: (row: any) => (
                  <div className="font-bold text-emerald-600 font-mono text-sm tracking-tight">
                    {row.qtysisaBooking?.toLocaleString()}
                  </div>
                )
              },
              {
                key: "gruptruk",
                header: "Grup Truk",
                render: (row: any) => {
                  const getGrupTrukName = (id: number) => {
                    switch (id) {
                      case 1: return "Colt Diesel (CDD)";
                      case 2: return "Engkel/Fuso";
                      case 3: return "Trintin";
                      case 4: return "Tronton";
                      case 5: return "Gandengan";
                      case 6: return "Trinton";
                      case 7: return "Trintin Gandengan";
                      case 8:
                      case 9: return "Trailler 20 Ft";
                      case 10:
                      case 11: return "Trailler 40 Ft";
                      default: return row.gruptruk || "All Grup";
                    }
                  };
                  return (
                    <div className="font-bold text-gray-400 font-mono text-[10px] whitespace-nowrap uppercase">
                      {getGrupTrukName(row.IdGrupTruk)}
                    </div>
                  );
                }
              },
              {
                key: "tanggaljatuhtempoString",
                header: "Jatuh Tempo",
                render: (row: any) => (
                  <div className="font-bold text-gray-400 font-mono text-xs whitespace-nowrap">
                    {row.tanggaljatuhtempoString || "-"}
                  </div>
                )
              }
            ]}
            rowClassName={(row: any) => {
              if (row.tanggaljatuhtempoString) {
                const dateNow = new Date();
                const dateJapo = new Date(row.tgljatuhtempo);
                if (dateNow > dateJapo) {
                  return "bg-[#e9805f] text-white hover:bg-[#e9805f]/90";
                }
              }
              return "";
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
