"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/use-api";
import { Loader2, Printer, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingPrintDocumentProps {
  id: string; 
}

export function BookingPrintDocument({ id }: BookingPrintDocumentProps) {
  const { apiTable } = useApi();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["posto-print", id],
    queryFn: () => apiTable(`/api/POSTO/DetailData`, {
      posto: id,
      guid: id,
      cmd: 'refresh'
    }),
    enabled: !!id,
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-brand-500 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-400">Menyiapkan Dokumen Booking...</p>
      </div>
    );
  }

  const data = response?.response || response;

  if (error || !data || !data.noposto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8 text-center">
        <div className="p-4 rounded-full bg-rose-50 text-rose-500 mb-4">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-black uppercase mb-2">Gagal Memuat Data Booking</h2>
        <p className="text-gray-500 mb-6">Data tidak ditemukan atau terjadi kesalahan server.</p>
        <Button onClick={() => window.close()} variant="outline">Tutup Jendela</Button>
      </div>
    );
  }

  const qrValue = `${typeof window !== 'undefined' ? window.location.origin : ''}/DocPub/POSTO?noposto=${data.guid}`;

  return (
    <div className="bg-[#f8fafc] min-h-screen p-0 md:p-12 print:bg-white print:p-0 print:min-h-0 print:m-0">
      {/* Controls */}
      <div className="max-w-[1000px] mx-auto mb-10 flex justify-end gap-3 print:hidden">
        <Button
          onClick={handlePrint}
          className="rounded-none px-10 font-black uppercase text-[11px] tracking-[0.2em] h-12 bg-slate-900 hover:bg-slate-800 text-white shadow-xl transition-all"
        >
          <Printer className="h-4 w-4 mr-3" /> Cetak Dokumen
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.close()}
          className="rounded-none px-6 font-black uppercase text-[11px] tracking-[0.2em] h-12 text-slate-400 hover:text-slate-900"
        >
          Tutup
        </Button>
      </div>

      {/* Manifest Document Area */}
      <div 
        ref={printRef}
        id="print-area"
        className="max-w-[1000px] mx-auto bg-white p-[40px] shadow-2xl print:shadow-none print:p-0 print:max-w-none text-slate-900"
        style={{ paddingTop: '150px', fontSize: '14px', fontFamily: 'serif' }}
      >
        {/* Header Metadata */}
        <div className="flex justify-end mb-4">
          <p className="text-right">Tanggal Cetak : {new Date().toLocaleDateString('id-ID')}</p>
        </div>

        {/* Title Section */}
        <div className="text-center mb-8">
          <h4 className="text-xl font-bold uppercase underline mb-1">
            {data.title_print || "PEMBERITAHUAN PENGIRIMAN BARANG"}
          </h4>
          <p className="font-bold">
            No. {data.title_noprint || "POSTO"} : {data.noposto}
          </p>
          <p className="font-bold">Tanggal : {data.tanggalString}</p>
        </div>

        <div className="border-t border-slate-300 my-6"></div>

        {/* Content Section */}
        <div className="flex gap-4">
          {/* Left Column (Addresses & Meta Table) */}
          <div className="w-1/2 space-y-6">
            <table className="w-full border-0">
              <tbody>
                <tr><td><span className="font-bold">Kepada Yth:</span></td></tr>
                <tr><td>{data.transportString}</td></tr>
                <tr><td>{data.transportAlamat}</td></tr>
                <tr><td>Indonesia</td></tr>
              </tbody>
            </table>

            <div className="py-4">
              <p>Mohon diangkut barang berikut: </p>
            </div>

            <table className="w-full border-0">
              <tbody>
                <tr><td><span className="font-bold">Asal Barang:</span></td></tr>
                <tr><td>{data.asalString}, {data.plant}</td></tr>
                <tr><td>{data.asalAlamat}</td></tr>
                <tr><td>{data.asalKab}</td></tr>
                <tr><td>{data.asalProv}</td></tr>
                <tr><td>Indonesia</td></tr>
              </tbody>
            </table>

            <table className="w-full border-0">
              <tbody>
                <tr><td><span className="font-bold">Tujuan Barang:</span></td></tr>
                {data.bagian === "POPELABUHAN" ? (
                  <>
                    <tr><td>{data.tujuanString}</td></tr>
                    <tr><td>{data.tujuanAlamat}</td></tr>
                    <tr><td>Kapal {data.kapal}</td></tr>
                    <tr><td>{data.kotatujuan}</td></tr>
                  </>
                ) : (
                  <>
                    <tr><td>{data.tujuanString}</td></tr>
                    <tr><td>{data.tujuanAlamat}</td></tr>
                    <tr><td>{data.tujuanKab}</td></tr>
                    <tr><td>{data.tujuanProv}</td></tr>
                  </>
                )}
                <tr><td>Indonesia</td></tr>
              </tbody>
            </table>

            <table className="w-full border-0 mt-6">
              <tbody>
                <tr>
                  <td width="180">Moda</td>
                  <td width="20">:</td>
                  <td>Truck</td>
                </tr>
                <tr>
                  <td>Kondisi Penyerahan</td>
                  <td>:</td>
                  <td>Diserahkan di depan pintu gerbang</td>
                </tr>
                <tr>
                  <td>Referensi</td>
                  <td>:</td>
                  <td></td>
                </tr>
                <tr>
                  <td>Pemilik Barang</td>
                  <td>:</td>
                  <td>{data.signatureCompany?.nama_company || "PT. Pupuk Sriwidjaja"}</td>
                </tr>
                <tr>
                  <td>Batas Waktu Sampai Tujuan</td>
                  <td>:</td>
                  <td>{data.tglakhirString}</td>
                </tr>
                <tr>
                  <td>Mekanisme Pemuatan</td>
                  <td>:</td>
                  <td>{data.percepatan === "1" ? "PERCEPATAN" : "ZERO ODOL"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right Column (QR Code) */}
          <div className="w-1/2 flex justify-end items-start pt-4">
             <QRCodeSVG value={qrValue} size={160} level="H" />
          </div>
        </div>

        {/* Item Table Section */}
        <div className="py-10">
          <table className="w-full border-collapse border border-slate-900">
            <thead>
              <tr>
                <th className="border border-slate-900 p-2 text-center w-12">No.</th>
                <th className="border border-slate-900 p-2 text-left">Nama Barang</th>
                <th className="border border-slate-900 p-2 text-center w-32">Qty</th>
                <th className="border border-slate-900 p-2 text-center w-24">Satuan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-900 p-2 text-center">1</td>
                <td className="border border-slate-900 p-2">{data.produkString}</td>
                <td className="border border-slate-900 p-2 text-center">{data.qty_string || data.qty}</td>
                <td className="border border-slate-900 p-2 text-center">TON</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Closing Notes */}
        <div className="mb-20">
          <p className="mb-4">
            Hal-hal lain yang belum tercantum dalam dokumen ini, agar merujuk kepada surat perjanjian antara rekanan
            dengan PT. Pupuk Sriwidjaja Palembang
          </p>
          <p className="font-bold">{data.cutoff}</p>
        </div>

        {/* Signatures Area */}
        <div className="mt-20">
          <table className="w-full text-center border-0">
            <tbody>
              <tr>
                <td width="50%">{data.transportString}</td>
                <td width="50%">{data.signatureCompany?.nama_company || "PT. Pupuk Sriwidjaja Palembang"}</td>
              </tr>
              <tr>
                <td className="pt-24">
                  <span>..............................</span>
                </td>
                <td className="pt-8">
                  <div className="flex flex-col items-center">
                    {data.signature?.files && (
                      <img 
                        src="/images/stamps/avplog4jatim.jpg" 
                        alt="Signature Stamp" 
                        className="h-20 mb-2 mix-blend-multiply" 
                      />
                    )}
                    {data.signature?.jabatan && (
                      <span className="mt-2">{data.signature.jabatan}</span>
                    )}
                    {!data.signature && <span className="pt-16">..............................</span>}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
