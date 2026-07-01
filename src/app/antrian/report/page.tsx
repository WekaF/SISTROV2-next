"use client";

import React, { useState, useCallback, useEffect } from "react";
import { RefreshCw, Truck } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";

interface TruckCardData {
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
  type: "shift" | "position" | "gudang";
  trucks: TruckCardData[];
}

interface ApiResponse {
  Success: boolean;
  company: string;
  company_code: string;
  date: string;
  sections: Section[];
}

const COLOR_HEX: Record<string, string> = {
  crimson: "#DC143C",
  gold: "#FFD700",
  darkcyan: "#008B8B",
  royalblue: "#4169E1",
  gray: "#9CA3AF",
};

function TruckCardV({ truck }: { truck: TruckCardData }) {
  const bg = COLOR_HEX[truck.color] ?? COLOR_HEX.gray;
  return (
    <div
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mb-2 overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: bg, borderLeftStyle: "solid" }}
    >
      <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-slate-700">
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ backgroundColor: bg, width: 32, height: 32 }}
        >
          <Truck className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 truncate">
            {truck.nopol}
          </p>
          <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{truck.driver}</p>
        </div>
      </div>
      <div className="px-3 py-2 space-y-0.5">
        {(
          [
            ["Booking", truck.bookingno],
            ["Produk", truck.produk],
            ["POSTO", truck.posto],
            ["Kab. Tujuan", truck.kabupatenTujuan],
            ["Gudang", truck.gudangTujuan],
            ["Tonase", truck.tonase],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex-shrink-0">
              {label}
            </span>
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 text-right leading-tight max-w-[140px] break-words">
              {value || "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColumnSection({ section }: { section: Section }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
          {section.name}
        </span>
        <span className="text-[10px] font-black text-slate-500 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full">
          {section.trucks.length}
        </span>
      </div>
      {section.trucks.length === 0 ? (
        <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest py-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
          Tidak ada antrian
        </p>
      ) : (
        section.trucks.map((t, i) => <TruckCardV key={`${t.nopol}-${i}`} truck={t} />)
      )}
    </div>
  );
}

const LEFT_IDS = new Set(["security_in", "security_out"]);
const MIDDLE_IDS = new Set(["timbangan_in", "timbangan_isi"]);

function partitionSections(sections: Section[]) {
  const left: Section[] = [];
  const middle: Section[] = [];
  const right: Section[] = [];
  for (const s of sections) {
    if (s.type === "shift" || LEFT_IDS.has(s.id)) left.push(s);
    else if (MIDDLE_IDS.has(s.id)) middle.push(s);
    else if (s.type === "gudang") right.push(s);
  }
  return { left, middle, right };
}

export default function AntrianReportPage() {
  const { apiJson } = useApi();
  const { activeCompanyCode, companies } = useCompany();
  const [selectedCompany, setSelectedCompany] = useState("");

  useEffect(() => {
    if (!selectedCompany && activeCompanyCode) setSelectedCompany(activeCompanyCode);
  }, [activeCompanyCode, selectedCompany]);

  const [sections, setSections] = useState<Section[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiJson<ApiResponse>(
        `/api/Antrian/ReportHorizontalQ2?company=${encodeURIComponent(selectedCompany)}`
      );
      if (res?.Success) {
        setSections(res.sections ?? []);
        setCompanyName(res.company ?? selectedCompany);
        setDate(res.date ?? "");
      } else {
        setError("Server mengembalikan respons tidak berhasil.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Gagal mengambil data.");
    } finally {
      setIsLoading(false);
    }
  }, [apiJson, selectedCompany]);

  useEffect(() => {
    if (selectedCompany) fetchData();
  }, [fetchData, selectedCompany]);

  const { left, middle, right } = partitionSections(sections);
  const totalTrucks = sections.reduce((acc, s) => acc + s.trucks.length, 0);
  const showCompanyPicker = companies.length > 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Report Antrian
            {companyName && (
              <span className="ml-2 text-slate-400 font-medium normal-case text-xl">
                — {companyName}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Dashboard antrian truk gudang.
            {date && <span className="ml-2 text-slate-400">Tanggal: {date}</span>}
            {totalTrucks > 0 && (
              <span className="ml-3 text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                {totalTrucks} truk aktif
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showCompanyPicker && (
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] font-bold px-3 text-slate-700 dark:text-slate-200"
            >
              {companies.map((c) => (
                <option key={c.company_code} value={c.company_code}>
                  {c.company_code} — {c.company}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-10 bg-white border-2 font-bold uppercase text-[10px] tracking-widest"
            onClick={fetchData}
            disabled={isLoading || !selectedCompany}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-64" />
          ))}
        </div>
      )}

      {!isLoading && !!selectedCompany && sections.length === 0 && !error && (
        <div className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest py-16 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          Belum ada data antrian.
        </div>
      )}

      {!isLoading && sections.length > 0 && (
        <div className="overflow-x-auto">
          <div className="flex gap-4" style={{ minWidth: 900 }}>
            <div className="flex-1 min-w-[280px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                Shift & Security
              </h2>
              {left.map((s) => (
                <ColumnSection key={s.id} section={s} />
              ))}
            </div>
            <div className="flex-1 min-w-[280px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                Jembatan Timbangan
              </h2>
              {middle.map((s) => (
                <ColumnSection key={s.id} section={s} />
              ))}
            </div>
            <div className="flex-1 min-w-[280px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                Gudang
              </h2>
              {right.map((s) => (
                <ColumnSection key={s.id} section={s} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
