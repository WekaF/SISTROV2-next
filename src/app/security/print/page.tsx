"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import JsBarcode from "jsbarcode";
import { QRCodeCanvas } from "qrcode.react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketData {
  data: {
    tiketno: string;
    nopol: string;
    driver: string;
    wilayah: string;
    qty: number;
    asal: string;
    tujuan: string;
    tanggalString: string;
    shift: string;
    transportString: string;
    posto: string;
    produkString: string;
    gudangtujuan?: string;
    labelantrian?: string;
    percepatan?: string;
    emergencystatus?: string;
    company?: string;
  };
}

export default function SecurityPrintPage() {
  const searchParams = useSearchParams();
  const bookingno = searchParams.get("bookingno");
  const { apiFetch } = useApi();
  
  const [data, setData] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!bookingno) return;
      try {
        const res = await apiFetch("/api/Tiket/DetailData", {
          method: "POST",
          body: JSON.stringify({ bookingno }),
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Error fetching print data", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [bookingno, apiFetch]);

  useEffect(() => {
    if (data?.data?.tiketno && barcodeRef.current) {
      JsBarcode(barcodeRef.current, data.data.tiketno, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true,
      });
      
      // Auto print
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-bold">Data tidak ditemukan</h1>
        <p className="text-muted-foreground">Booking ID: {bookingno}</p>
      </div>
    );
  }

  const { data: t } = data;

  const getModa = (wilayah: string) => {
    switch (wilayah) {
      case "DW1_GP": return "TRUK KE GP";
      case "DW2_INBAG": return "INBAG";
      case "DW2_KONTAINER": return "CONTAINER";
      default: return wilayah || "-";
    }
  };

  return (
    <div className="print-container bg-white text-black font-mono min-h-screen p-2 mx-auto max-w-[80mm]">
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto; /* Let printer driver handle width if 58mm or 80mm */
          }
          body {
            margin: 0;
            padding: 0 !important;
            background: white;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2mm !important;
            box-shadow: none !important;
          }
          /* Ensure text is sharp for thermal */
          * {
            color: black !important;
            text-shadow: none !important;
          }
        }
        /* Style for on-screen preview to match thermal look */
        .print-container {
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
      `}</style>

      <div className="flex flex-col items-center text-center space-y-4">
        <h1 className="text-[30px] font-bold leading-tight">SECURITY PASS</h1>
        
        {/* QR Code */}
        <div className="py-2">
          <QRCodeCanvas 
            value={t.tiketno} 
            size={190} 
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Emergency Status */}
        {t.emergencystatus && (
          <div className="w-full">
            <div className="border-t-2 border-black my-1"></div>
            <div className="text-red-600 font-black text-xl py-1 animate-pulse">EMERGENCY</div>
            <div className="border-b-2 border-black my-1"></div>
          </div>
        )}

        {/* Data Table */}
        <table className="w-full text-left text-[12px] border-collapse">
          <tbody>
            <tr className="border-b-2 border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Nomor Tiket</td>
              <td className="py-1">: {t.tiketno}</td>
            </tr>
            <tr className="border-b-2 border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Nomor Polisi</td>
              <td className="py-1 font-black text-[18px]">: {t.nopol}</td>
            </tr>
            <tr className="border-b-2 border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Nama Driver</td>
              <td className="py-1 font-black text-[18px]">: {t.driver}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Moda</td>
              <td className="py-1">: {getModa(t.wilayah)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Qty (Ton)</td>
              <td className="py-1">: {t.qty}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Asal</td>
              <td className="py-1">: {t.asal}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">GP Tujuan</td>
              <td className="py-1">: {t.tujuan}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Tgl (Shift)</td>
              <td className="py-1">: {t.tanggalString} (Shift {t.shift})</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Transport</td>
              <td className="py-1">: {t.transportString}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">POSTO</td>
              <td className="py-1">: {t.posto}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Produk</td>
              <td className="py-1">: {t.produkString}</td>
            </tr>
            {t.gudangtujuan && (
              <tr className="border-b-2 border-black">
                <td className="py-1 pr-2 whitespace-nowrap font-bold">Gudang Muat</td>
                <td className="py-1 font-black">: {t.gudangtujuan}</td>
              </tr>
            )}
            {t.company === "PKC" && t.labelantrian && (
              <tr className="border-b border-black">
                <td className="py-1 pr-2 whitespace-nowrap">Antrian</td>
                <td className="py-1 font-bold">: {t.labelantrian}</td>
              </tr>
            )}
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Pemuatan</td>
              <td className="py-1">: {t.percepatan}</td>
            </tr>
          </tbody>
        </table>

        {/* Barcode */}
        <div className="w-full flex justify-center py-4 overflow-hidden">
          <svg ref={barcodeRef} className="max-w-full"></svg>
        </div>

        {/* Manual Print Button (Hidden on print) */}
        <div className="no-print pt-6 pb-10 w-full flex justify-center">
          <Button 
            onClick={() => window.print()} 
            className="w-full flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print Ulang
          </Button>
        </div>
      </div>
    </div>
  );
}
