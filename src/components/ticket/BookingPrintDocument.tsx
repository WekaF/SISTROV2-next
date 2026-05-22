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
  const { apiFetch, token } = useApi();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["posto-print", id, token],
    queryFn: async () => {
      const res = await apiFetch(`/api/POSTO/PrintData?noposto=${encodeURIComponent(id)}`, { method: "GET" });
      if (!res.ok) {
        throw new Error("Gagal memuat data print");
      }
      return res.json();
    },
    enabled: !!id && !!token,
  });

  const handlePrint = () => {
    window.print();
  };

  if ((isLoading || !token || !response) && !error) {
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

  const getStampSrc = (filePath?: string) => {
    if (!filePath) return "";
    const filename = filePath.split(/[/\\]/).pop() || "";
    if (filename === "avplog4jatim.jpg" || filename === "avpjatimbalinusa.jpeg") {
      return `/images/stamps/${filename}`;
    }
    return "";
  };

  let stampSrc = "";
  let stampJabatan = "";

  if (data.signature) {
    stampSrc = getStampSrc(data.signature.files);
    stampJabatan = data.signature.jabatan;
  }

  if (!stampSrc) {
    const company = data.plant?.toUpperCase();
    if (company === "LOG4MENENG" || company === "ROMO") {
      stampSrc = "/images/stamps/avplog4jatim.jpg";
      if (!stampJabatan) stampJabatan = "AVP Ops Logistik Jatim";
    } else if (company === "D243") {
      stampSrc = "/images/stamps/avpjatimbalinusa.jpeg";
      if (!stampJabatan) stampJabatan = "VP Distribusi Jatim Bali Nusa";
    } else {
      stampSrc = "/images/stamps/avplog4jatim.jpg";
      if (!stampJabatan) stampJabatan = data.signature?.jabatan || "AVP Ops Logistik Jatim";
    }
  }

  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const printStyles = `
    /* Styles berlaku di layar dan kertas — identik */
    #print-area {
      font-family: Arial, sans-serif;
      color: black;
      line-height: 1.5;
    }
    #print-area p {
      margin: 0px;
    }
    #print-area table.bordered-table {
      border: 1px solid #000;
      border-collapse: collapse;
    }
    #print-area table.bordered-table th,
    #print-area table.bordered-table td {
      border: 1px solid #000;
      padding: 8px 12px;
    }

    @media print {
      /* Sembunyikan elemen non-print */
      aside, header, .no-print { display: none !important; }

      /* Reset halaman */
      html, body {
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }

      /* Hapus layout constraints dari LayoutWrapper */
      div.flex.h-screen.overflow-hidden {
        display: block !important;
        height: auto !important;
        overflow: visible !important;
        background: transparent !important;
      }
      div.relative.flex.flex-col.flex-1 {
        margin-left: 0 !important;
        padding-left: 0 !important;
        position: static !important;
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        transition: none !important;
      }
      main {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        display: block !important;
        overflow: visible !important;
      }

      /* Sembunyikan semua kecuali area cetak */
      body * { visibility: hidden; }
      #print-area, #print-area * { visibility: visible; }

      /*
       * SCALE APPROACH — muat satu halaman A4 tanpa mengubah layout layar.
       *
       * Inline style (paddingTop: 150px dll) punya spesifisitas lebih tinggi
       * dari @media print CSS, jadi kita tidak bisa override dengan padding.
       * Solusi: scale seluruh dokumen sehingga mengecil secara proporsional.
       *
       * Dokumen lebar: max-w-[1000px] = 1000px
       * A4 @96dpi ≈ 794px lebar (tanpa margin browser)
       * Tinggi konten ≈ 1350px (150px top + konten + 150px sig area)
       * A4 tinggi @96dpi ≈ 1123px
       *
       * Scale = min(794/1000, 1123/1350) = min(0.794, 0.832) → 0.76 (safety margin)
       */
      #print-area {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 1000px !important;
        max-width: 1000px !important;
        margin: 0 !important;
        box-shadow: none !important;
        background: white !important;
        transform: scale(0.76) !important;
        transform-origin: top left !important;
      }

      /* A4 tanpa margin browser — semua whitespace dikontrol oleh scale + inline padding */
      @page {
        size: A4 portrait;
        margin: 0;
      }
    }
  `;

  return (
    <>
      <style>{printStyles}</style>

      <div className="bg-[#f8fafc] min-h-screen p-0 md:p-12 print:bg-white print:p-0 print:min-h-0 print:m-0">
        {/* Controls - hidden on print */}
        <div className="max-w-[1000px] mx-auto mb-10 flex justify-end gap-3 print:hidden no-print">
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
          className="max-w-[1000px] mx-auto bg-white p-[40px] shadow-2xl text-slate-900"
          style={{ paddingTop: '150px', fontSize: '14px', fontFamily: 'Arial, sans-serif' }}
        >
          {/* Header Metadata */}
          <div style={{ textAlign: 'right' }}>
            <p>Tanggal Cetak : {formattedDate}</p>
          </div>

          {/* Title Section */}
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '20px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>
              {data.titlePrint || "PEMBERITAHUAN PENGIRIMAN BARANG"}
            </h4>
            <p><b>No. {data.titleNo || "POSTO"} : {data.noposto}</b></p>
            <p><b>Tanggal : {data.tanggalString}</b></p>
          </div>

          <div style={{ borderTop: '1px solid #ccc', marginTop: '16px', marginBottom: '24px' }}></div>

          {/* Content Section — Left column: addresses, Right column: QR */}
          <div style={{ display: 'flex' }}>
            {/* Left Column */}
            <div style={{ width: '50%' }}>
              <table border={0}>
                <tbody>
                  <tr><td><b>Kepada Yth: </b></td></tr>
                  <tr><td>{data.transportString}</td></tr>
                  {data.transportAlamat && <tr><td>{data.transportAlamat}</td></tr>}
                  <tr><td>Indonesia</td></tr>
                </tbody>
              </table>
              <br />
              <br />
              <br />
              <p>Mohon diangkut barang berikut: </p>
              <br />
              <table border={0}>
                <tbody>
                  <tr><td><b>Asal Barang: </b></td></tr>
                  <tr><td>{data.asalString}, {data.plant}</td></tr>
                  {data.asalAlamat && <tr><td>{data.asalAlamat}</td></tr>}
                  {data.asalKab && <tr><td>{data.asalKab}</td></tr>}
                  {data.asalProv && <tr><td>{data.asalProv}</td></tr>}
                  <tr><td>Indonesia</td></tr>
                </tbody>
              </table>
              <br />
              <br />
              <table border={0}>
                <tbody>
                  <tr><td><b>Tujuan Barang: </b></td></tr>
                  {data.bagian === "POPELABUHAN" ? (
                    <>
                      <tr><td>{data.tujuanString}</td></tr>
                      {data.tujuanAlamat && <tr><td>{data.tujuanAlamat}</td></tr>}
                      {data.kapal && <tr><td>Kapal {data.kapal}</td></tr>}
                      {data.kotatujuan && <tr><td>{data.kotatujuan}</td></tr>}
                    </>
                  ) : (
                    <>
                      <tr><td>{data.tujuanString}</td></tr>
                      {data.tujuanAlamat && <tr><td>{data.tujuanAlamat}</td></tr>}
                      {data.tujuanKab && <tr><td>{data.tujuanKab}</td></tr>}
                      {data.tujuanProv && <tr><td>{data.tujuanProv}</td></tr>}
                    </>
                  )}
                  <tr><td>Indonesia</td></tr>
                </tbody>
              </table>
              <br />
              <table border={0} style={{ width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '220px' }}>Moda</td>
                    <td style={{ width: '15px' }}> : </td>
                    <td>Truck</td>
                  </tr>
                  <tr>
                    <td>Kondisi Penyerahan</td>
                    <td> : </td>
                    <td>Diserahkan di depan pintu gerbang</td>
                  </tr>
                  <tr>
                    <td>Referensi</td>
                    <td> : </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td>Pemilik Barang</td>
                    <td> : </td>
                    <td>{data.signatureCompanyName || data.signatureCompany?.nama_company || "PT. Pupuk Sriwidjaja"}</td>
                  </tr>
                  <tr>
                    <td>Batas Waktu Sampai Tujuan</td>
                    <td> : </td>
                    <td>{data.tglakhirString}</td>
                  </tr>
                  <tr>
                    <td>Mekanisme Pemuatan</td>
                    <td> : </td>
                    <td>{data.percepatan}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Column — QR Code only */}
            <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
              <QRCodeSVG value={qrValue} size={160} level="H" />
            </div>
          </div>

          {/* Item Table */}
          <div style={{ padding: '20px 0px' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse' }}
              className="bordered-table"
            >
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center', fontWeight: 'bold' }}>No.</th>
                  <th style={{ textAlign: 'left', fontWeight: 'bold' }}>Nama Barang</th>
                  <th style={{ width: '120px', textAlign: 'center', fontWeight: 'bold' }}>Qty</th>
                  <th style={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }}>Satuan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'center' }}>1</td>
                  <td>{data.produkString}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{data.qty_string || data.qty}</td>
                  <td style={{ textAlign: 'center' }}>TON</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Closing Notes */}
          <div>
            <p>
              Hal-hal lain yang belum tercantum dalam dokumen ini, agar merujuk kepada surat perjanjian antara rekanan
              dengan {data.signatureCompanyName || data.signatureCompany?.nama_company || "PT. Pupuk Sriwidjaja"}
            </p>
            <br />
            <br />
            <p><b>{data.cutoff}</b></p>
          </div>

          {/* Signatures Area */}
          <div style={{ paddingTop: '150px' }}>
            <table style={{ textAlign: 'center', width: '100%', border: 0 }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%' }}>{data.transportString}</td>
                  <td style={{ width: '50%' }}>{data.signatureCompanyName || data.signatureCompany?.nama_company || "PT. Pupuk Sriwidjaja"}</td>
                </tr>
                <tr>
                  <td>
                    <br />
                    <br />
                    <br />
                    <br />
                    ..............................
                  </td>
                  <td>
                    {stampSrc ? (
                      <>
                        <br />
                        <img
                          src={stampSrc}
                          alt="Signature Stamp"
                          style={{ height: '80px', marginBottom: 0, marginTop: 0, display: 'inline-block' }}
                        />
                        <br />
                        <br />
                      </>
                    ) : (
                      <>
                        <br />
                        <br />
                        <br />
                        <br />
                      </>
                    )}
                    {stampJabatan && <span>{stampJabatan}</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
