"use client";

import React, { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import JsBarcode from "jsbarcode";
import { toPng } from "html-to-image";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { Loader2, Printer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketPrintDocumentProps {
  id: string;
}

export function TicketPrintDocument({ id }: TicketPrintDocumentProps) {
  const { apiJson } = useApi();
  const barcodeRef = useRef<SVGSVGElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket-print", id],
    queryFn: () => apiJson(`/api/Tiket/DetailData`, {
      method: "POST",
      body: JSON.stringify({ bookingno: id })
    }),
    enabled: !!id,
  });

  const handlePrint = async () => {
    if (ticketRef.current === null || !ticket || !ticket.data) return;
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 3,
      });

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Cetak Tiket - ${ticket.data.bookingno}</title>
              <style>
                @page { size: landscape; margin: 0; }
                html, body { 
                  margin: 0; 
                  padding: 0; 
                  width: 100%; 
                  height: 100%; 
                  overflow: hidden; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  background: white; 
                }
                img { 
                  max-width: 100%; 
                  max-height: 100%; 
                  object-fit: contain; 
                  display: block;
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" id="printImg" />
              <script>
                const img = document.getElementById('printImg');
                img.onload = function() {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 500);
                };
                // Fallback in case onload doesn't fire
                setTimeout(function() {
                  if (!window.closed) {
                    window.print();
                    window.close();
                  }
                }, 2000);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Failed to print', err);
      window.print();
    }
  };

  const handleDownload = async () => {
    if (ticketRef.current === null || !ticket || !ticket.data) return;
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `Tiket_${ticket.data.bookingno}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    }
  };

  useEffect(() => {
    if (ticket && ticket.data && !isLoading) {
      if (barcodeRef.current) {
        JsBarcode(barcodeRef.current, ticket.data.bookingno, {
          format: "CODE128",
          width: 1.5,
          height: 50,
          displayValue: false,
          margin: 0,
        });
      }
    }
  }, [ticket, isLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-400">Menyiapkan Dokumen Tiket...</p>
      </div>
    );
  }

  if (error || !ticket || !ticket.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8 text-center">
        <div className="p-4 rounded-full bg-rose-50 text-rose-500 mb-4">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-black uppercase mb-2">Gagal Memuat Tiket</h2>
        <p className="text-gray-500 mb-6">Pastikan nomor booking benar atau coba lagi nanti.</p>
        <Button onClick={() => window.close()} variant="outline">Tutup Jendela</Button>
      </div>
    );
  }

  const data = ticket.data;

  return (
    <div className="bg-[#f8fafc] min-h-screen p-0 md:p-12 print:bg-white print:p-0 print:min-h-0 print:m-0">
      {/* Controls */}
      <div className="max-w-[1100px] mx-auto mb-10 flex justify-end gap-3 print:hidden">
        <Button
          onClick={handlePrint}
          className="rounded-none px-10 font-black uppercase text-[11px] tracking-[0.2em] h-12 bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-all"
        >
          <Printer className="h-4 w-4 mr-3" /> Cetak Tiket
        </Button>
        <Button
          variant="outline"
          onClick={handleDownload}
          className="rounded-none px-10 font-black uppercase text-[11px] tracking-[0.2em] h-12 border-slate-300 bg-white hover:bg-slate-50 shadow-sm transition-all"
        >
          Download
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.close()}
          className="rounded-none px-6 font-black uppercase text-[11px] tracking-[0.2em] h-12 text-slate-400 hover:text-slate-900"
        >
          Tutup
        </Button>
      </div>

      {/* Ticket Area Container */}
      <div className="max-w-[1100px] mx-auto bg-white print:max-w-none print:m-0 print:p-0 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] print:shadow-none p-1">
        <div
          ref={ticketRef}
          className="border border-slate-900 p-1 bg-white"
        >
          <div className="border border-slate-900 relative bg-white flex flex-col p-10 min-h-[700px]">
            {/* Professional Charter Stamp */}
            {data.charter === "1" && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] border-[10px] border-emerald-600/10 text-emerald-600/10 px-12 py-6 font-black text-8xl opacity-20 pointer-events-none uppercase italic tracking-tighter z-0">
                Charter
              </div>
            )}

            {/* Header Section */}
            <div className="flex justify-between items-center mb-16 relative z-10">
              <img src="/images/logo/logosistro.png" className="h-10" alt="Sistro" />
              <img src="/images/logo/logocompany.png" className="h-14" alt="Pupuk Indonesia" />
            </div>

            <div className="mb-10 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none">Tiket Pemuatan</h2>
              </div>
              <div className="h-1.5 bg-slate-900 w-full" />
            </div>

            {/* Transportir Section */}
            <div className="flex gap-10 mb-12 relative z-10">
              <div className="flex-1 flex flex-col">
                <div className="bg-[#0f172a] text-white px-4 py-2 font-black text-[10px] uppercase tracking-widest mb-1">
                  Detail Transportir & Armada
                </div>
                <table className="w-full border-collapse flex-grow">
                  <tbody className="text-sm">
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-1 text-slate-400 font-black uppercase text-[10px] w-48 tracking-widest">Kode Booking</td>
                      <td className="py-4 px-1 font-black text-lg tracking-tight text-slate-900 uppercase">{data.bookingno}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-1 text-slate-400 font-black uppercase text-[10px] tracking-widest">Transportir</td>
                      <td className="py-4 px-1 font-black uppercase text-slate-800 text-lg">{data.transportString}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-1 text-slate-400 font-black uppercase text-[10px] tracking-widest">Pengemudi</td>
                      <td className="py-4 px-1 font-black uppercase text-slate-800 text-lg">{data.driver}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-4 px-1 text-slate-400 font-black uppercase text-[10px] tracking-widest">Nopol Armada</td>
                      <td className="py-4 px-1 font-black uppercase text-lg tracking-tighter text-slate-900">
                        {data.nopol}
                        {data.wilayah === "DW2_KONTAINER" && <span className="bg-rose-500 text-white px-2 py-0.5 ml-3 text-[10px] tracking-normal font-black uppercase align-middle">Container</span>}
                      </td>
                    </tr>
                    <tr className="border-b-2 border-slate-200">
                      <td className="py-4 px-1 text-slate-400 font-black uppercase text-[10px] tracking-widest">Kendaraan</td>
                      <td className="py-4 px-1 font-black uppercase text-slate-800 text-lg">{data.jeniskendaraan}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* QR Code Container */}
              <div className="w-[260px] bg-slate-50 border border-slate-100 flex flex-col items-center py-10 px-4 self-stretch">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Verification QR Code</p>
                <div className="bg-white p-4 shadow-sm">
                  <QRCodeSVG value={data.bookingno} size={160} level="H" includeMargin={false} />
                </div>
                <div className="mt-auto pt-8">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Scan for validation</p>
                </div>
              </div>
            </div>

            {/* DO Detail Section Header */}
            <div className="flex items-center mb-6 relative z-10">
              <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-900 whitespace-nowrap">Detail Tiket</h4>
              <div className="h-[1px] bg-slate-200 flex-grow ml-6" />
            </div>

            {/* DO Table */}
            <div className="overflow-hidden border-b-2 border-slate-200 relative z-10 mb-12">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-t border-slate-200">
                    <th className="py-4 px-3 text-left border-r border-slate-100">{data.posto?.startsWith('5') ? 'Nomor POSTO' : 'Nomor SO'}</th>
                    <th className="py-4 px-3 text-left border-r border-slate-100">Mekanisme Pemuatan</th>
                    <th className="py-4 px-3 text-left border-r border-slate-100">Gudang Asal</th>
                    <th className="py-4 px-3 text-left border-r border-slate-100">Gudang Tujuan</th>
                    <th className="py-4 px-3 text-left border-r border-slate-100">Produk</th>
                    <th className="py-4 px-3 text-right">Tonase (Ton)</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] font-black uppercase text-slate-900">
                  <tr className="border-t border-slate-100">
                    <td className="py-8 px-3 border-r border-slate-100 font-mono">{data.posto}</td>
                    <td className="py-8 px-3 border-r border-slate-100">
                      <span className={`${(data.posto?.startsWith('5') && data.percepatan === "1") ? 'text-rose-600' : 'text-slate-900'}`}>
                        {data.posto?.startsWith('5')
                          ? (data.percepatan === "1" ? "PERCEPATAN" : "ZERO ODOL")
                          : "-"
                        }
                      </span>
                    </td>
                    <td className="py-8 px-3 border-r border-slate-100">{data.asal}</td>
                    <td className="py-8 px-3 border-r border-slate-100">{data.tujuan}</td>
                    <td className="py-8 px-3 border-r border-slate-100">{data.produkString}</td>
                    <td className="py-8 px-3 text-right text-4xl tracking-tighter font-black">{data.qty}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer Section */}
            <div className="mt-auto flex justify-between items-end relative z-10">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <div className="mb-4 italic text-[10px]">
                  DICETAK PADA TANGGAL: {ticket.DateTimeNow || new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} {ticket.DateTimeZona || 'WIB'}
                </div>
                <div className="mb-8 flex items-center gap-4">
                  <span className="text-slate-900 text-[13px] tracking-tight">TANGGAL ANGKUT:</span>
                  <span className="text-slate-900 text-[13px] bg-slate-100 px-4 py-1.5 border border-slate-200">{data.tanggalString}</span>
                  <span className="text-slate-900 text-[13px] ml-2">(SHIFT {data.shift}*)</span>
                </div>

                <div className="space-y-1 text-[10px]">
                  {ticket.times && (
                    <div dangerouslySetInnerHTML={{ __html: ticket.times }} className="space-y-1" />
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="bg-white p-4 border border-slate-200 shadow-sm w-[400px] flex items-center justify-center min-h-[100px]">
                  <svg ref={barcodeRef} className="w-full h-auto"></svg>
                </div>
                <p className="text-[12px] font-black tracking-[0.3em] uppercase text-slate-900 font-mono pr-2">{data.bookingno}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
