"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/use-api";

interface PrintData {
  guid: string;
  noposto: string;
  tanggalString: string;
  tglakhirString: string;
  asal: string;
  asalString: string;
  asalAlamat: string;
  asalKab: string;
  asalProv: string;
  tujuanString: string;
  tujuanAlamat: string;
  tujuanKab: string;
  tujuanProv: string;
  transportString: string;
  transportAlamat: string;
  produkString: string;
  qty: number;
  qty_string: string;
  bagian: string;
  kapal: string;
  kotatujuan: string;
  plant: string;
  percepatan: string;
  cutoff: string;
  signatureCompanyName: string;
  titlePrint: string;
  titleNo: string;
}

function PrintContent() {
  const searchParams = useSearchParams();
  const noposto = searchParams.get("noposto") || "";
  const { apiFetch } = useApi();

  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!noposto) {
      setError("No POSTO tidak ditemukan di URL");
      setLoading(false);
      return;
    }
    apiFetch(`/api/POSTO/PrintData?noposto=${encodeURIComponent(noposto)}`, { method: "GET" })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "Gagal memuat data");
        }
        return res.json();
      })
      .then((json) => {
        setData(json?.response ?? json);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || "Error saat memuat data");
        setLoading(false);
      });
  }, [noposto]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Memuat data POSTO...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error || "Data tidak ditemukan"}
      </div>
    );
  }

  const isPelabuhan = data.bagian === "POPELABUHAN";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        body { font-family: Arial, sans-serif; font-size: 14px; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 flex items-center gap-2"
        >
          🖨️ Print {data.titlePrint}
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded hover:bg-gray-200"
        >
          Tutup
        </button>
        <span className="text-xs text-gray-400 ml-2">
          No. {data.titleNo}: {data.noposto}
        </span>
      </div>

      {/* Print Area */}
      <div style={{ padding: "40px 60px", maxWidth: 900, margin: "0 auto", fontSize: 14 }}>
        {/* Date */}
        <div style={{ textAlign: "right", marginBottom: 8 }}>
          <p>Tanggal Cetak : {today}</p>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h4 style={{ textDecoration: "underline", margin: 0 }}>{data.titlePrint}</h4>
          <p style={{ margin: 4 }}>
            <b>No. {data.titleNo} : {data.noposto}</b>
          </p>
          <p style={{ margin: 4 }}>
            <b>Tanggal : {data.tanggalString}</b>
          </p>
        </div>

        <hr style={{ margin: "12px 0 20px" }} />

        <div style={{ display: "flex", gap: 40 }}>
          {/* Left column */}
          <div style={{ flex: 1 }}>
            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td>
                    <b>Kepada Yth: </b>
                  </td>
                </tr>
                <tr>
                  <td>{data.transportString}</td>
                </tr>
                {data.transportAlamat && (
                  <tr>
                    <td>{data.transportAlamat}</td>
                  </tr>
                )}
                <tr>
                  <td>Indonesia</td>
                </tr>
              </tbody>
            </table>

            <br />
            <br />
            <br />
            <p>Mohon diangkut barang berikut: </p>
            <br />

            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td>
                    <b>Asal Barang: </b>
                  </td>
                </tr>
                <tr>
                  <td>
                    {data.asalString}
                    {data.plant ? `, ${data.plant}` : ""}
                  </td>
                </tr>
                {data.asalAlamat && (
                  <tr>
                    <td>{data.asalAlamat}</td>
                  </tr>
                )}
                {data.asalKab && (
                  <tr>
                    <td>{data.asalKab}</td>
                  </tr>
                )}
                {data.asalProv && (
                  <tr>
                    <td>{data.asalProv}</td>
                  </tr>
                )}
                <tr>
                  <td>Indonesia</td>
                </tr>
              </tbody>
            </table>

            <br />
            <br />

            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td>
                    <b>Tujuan Barang: </b>
                  </td>
                </tr>
                <tr>
                  <td>{data.tujuanString}</td>
                </tr>
                {isPelabuhan ? (
                  <>
                    {data.tujuanAlamat && (
                      <tr>
                        <td>{data.tujuanAlamat}</td>
                      </tr>
                    )}
                    {data.kapal && (
                      <tr>
                        <td>Kapal {data.kapal}</td>
                      </tr>
                    )}
                    {data.kotatujuan && (
                      <tr>
                        <td>{data.kotatujuan}</td>
                      </tr>
                    )}
                  </>
                ) : (
                  <>
                    {data.tujuanAlamat && (
                      <tr>
                        <td>{data.tujuanAlamat}</td>
                      </tr>
                    )}
                    {data.tujuanKab && (
                      <tr>
                        <td>{data.tujuanKab}</td>
                      </tr>
                    )}
                    {data.tujuanProv && (
                      <tr>
                        <td>{data.tujuanProv}</td>
                      </tr>
                    )}
                  </>
                )}
                <tr>
                  <td>Indonesia</td>
                </tr>
              </tbody>
            </table>

            <br />

            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: 8 }}>Moda</td>
                  <td style={{ paddingRight: 8 }}> : </td>
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
                  <td>{data.signatureCompanyName}</td>
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

          {/* Right column */}
          <div style={{ width: 160, textAlign: "right" }}>
            <div
              style={{
                width: 160,
                height: 160,
                border: "1px dashed #ccc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "#aaa",
                textAlign: "center",
                padding: 8,
              }}
            >
              QR: {data.noposto}
            </div>
          </div>
        </div>

        {/* Product table */}
        <div style={{ margin: "20px 0" }}>
          <table
            border={1}
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th style={{ padding: "4px 8px" }}>No.</th>
                <th style={{ padding: "4px 8px" }}>Nama Barang</th>
                <th style={{ padding: "4px 8px" }}>Qty</th>
                <th style={{ padding: "4px 8px" }}>Satuan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "4px 8px", textAlign: "center" }}>1</td>
                <td style={{ padding: "4px 8px" }}>{data.produkString}</td>
                <td style={{ padding: "4px 8px", textAlign: "center" }}>
                  {data.qty_string || data.qty}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "center" }}>TON</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Hal-hal lain yang belum tercantum dalam dokumen ini, agar merujuk
          kepada surat perjanjian antara rekanan dengan {data.signatureCompanyName}
        </p>

        <br />
        <br />
        <p>
          <b>{data.cutoff}</b>
        </p>

        {/* Signature block */}
        <div style={{ paddingTop: 120 }}>
          <table
            style={{
              textAlign: "center",
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <tbody>
              <tr>
                <td style={{ width: "50%" }}>{data.transportString}</td>
                <td style={{ width: "50%" }}>{data.signatureCompanyName}</td>
              </tr>
              <tr>
                <td style={{ paddingTop: 80 }}>..............................</td>
                <td style={{ paddingTop: 80 }}>..............................</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function PostoPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-gray-500">
          Memuat...
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  );
}
