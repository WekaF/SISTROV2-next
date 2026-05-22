"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";

interface Truck {
  nopol: string;
  driver: string;
  bookingno: string;
  produk: string;
  posto: string;
  kabupatenTujuan: string;
  gudangTujuan: string;
  tonase: string;
  color: string;
}

interface Section {
  id: string;
  name: string;
  type: string;
  trucks: Truck[];
}

interface ReportQ2Response {
  Success: boolean;
  company: string;
  company_code: string;
  date: string;
  sections: Section[];
}

function TruckCard({ truck }: { truck: Truck }) {
  const color = truck.color || "gray";
  return (
    <div
      className="flex-shrink-0 rounded-lg overflow-hidden shadow-sm border"
      style={{ width: 160, height: 290, borderColor: color, borderWidth: 1 }}
    >
      <div
        className="flex items-center justify-center"
        style={{ backgroundColor: color, height: 68, width: 68, borderRadius: "50%", margin: "10px auto 0" }}
      >
        <svg viewBox="0 0 24 24" fill="white" width="30" height="30">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      </div>
      <div className="px-2 mt-2">
        <p className="font-bold text-sm leading-tight">{truck.nopol}</p>
        <p className="text-xs text-gray-500 leading-tight">{truck.driver}</p>
      </div>
      <div className="mx-1 mt-1 rounded px-1 py-1" style={{ backgroundColor: color, minHeight: 170 }}>
        <table className="w-full text-white" style={{ fontSize: 9, tableLayout: "fixed" }}>
          <tbody>
            <tr><td className="font-bold" style={{ width: "42%" }}>Booking</td><td style={{ width: "5%" }}>:</td><td style={{ width: "53%" }}>{truck.bookingno}</td></tr>
            <tr><td className="font-bold">Produk</td><td>:</td><td>{truck.produk}</td></tr>
            <tr><td className="font-bold">POSTO</td><td>:</td><td>{truck.posto}</td></tr>
            <tr><td className="font-bold">Kab. Tujuan</td><td>:</td><td>{truck.kabupatenTujuan}</td></tr>
            <tr><td className="font-bold">Gudang</td><td>:</td><td>{truck.gudangTujuan}</td></tr>
            <tr><td className="font-bold">Tonase</td><td>:</td><td>{truck.tonase}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionAccordion({ section, defaultOpen }: { section: Section; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const colorCounts = section.trucks.reduce<Record<string, number>>((acc, t) => {
    acc[t.color] = (acc[t.color] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="border rounded-lg overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{section.name}</span>
          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {section.trucks.length} truk
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(["royalblue", "darkcyan", "gold", "crimson"] as const).map((c) =>
            colorCounts[c] ? (
              <span key={c} className="text-xs text-white px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: c }}>
                {colorCounts[c]}
              </span>
            ) : null
          )}
          <svg
            className={`h-4 w-4 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 overflow-x-auto">
          {section.trucks.length === 0 ? (
            <div className="text-sm text-gray-500 italic py-2">Tidak ada antrian</div>
          ) : (
            <div className="flex gap-3 flex-nowrap">
              {section.trucks.map((t, i) => <TruckCard key={i} truck={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManagerAntrianPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.aspnetToken as string;
  const companyCode = (session?.user as any)?.companyCode as string;

  const [report, setReport] = useState<ReportQ2Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchReport = useCallback(async () => {
    if (!token || !companyCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/aspnet-proxy/api/Antrian/ReportHorizontalQ2?company=${companyCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Gagal mengambil data antrian");
      const data: ReportQ2Response = await res.json();
      if (data.Success) {
        setReport(data);
        setLastUpdate(new Date().toLocaleTimeString("id-ID"));
      } else {
        setError("Server mengembalikan data tidak valid");
      }
    } catch (e: any) {
      setError(e.message ?? "Error mengambil data antrian");
    } finally {
      setLoading(false);
    }
  }, [token, companyCode]);

  useEffect(() => {
    if (!token || !companyCode) return;
    fetchReport();
    timerRef.current = setInterval(fetchReport, 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchReport, token, companyCode]);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Monitor Antrian</h1>
            <p className="text-sm text-muted-foreground">
              {report?.company ?? companyCode ?? "—"} — update tiap 30 detik
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {lastUpdate && <span>Update: {lastUpdate}</span>}
          {report && <span className="text-muted-foreground/60">{report.date}</span>}
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh manual"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loading initial */}
      {loading && !report && (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Sections */}
      {report && (
        <div>
          {report.sections.map((sec, i) => (
            <SectionAccordion key={sec.id} section={sec} defaultOpen={i < 3} />
          ))}
          {report.sections.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Tidak ada data antrian</div>
          )}
        </div>
      )}
    </div>
  );
}
