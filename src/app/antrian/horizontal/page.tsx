"use client";

import React, { useState, useCallback, useEffect } from "react";
import { RefreshCw, Truck, ChevronDown, ChevronUp } from "lucide-react";
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
const COLOR_ORDER = ["royalblue", "darkcyan", "gold", "crimson"] as const;

function colorCounts(trucks: TruckCardData[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of trucks) {
    if (t.color && t.color !== "gray") counts[t.color] = (counts[t.color] ?? 0) + 1;
  }
  return counts;
}

function TruckCardH({ truck }: { truck: TruckCardData }) {
  const bg = COLOR_HEX[truck.color] ?? COLOR_HEX.gray;
  return (
    <div
      className="flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
      style={{ width: 160, borderTopWidth: 4, borderTopColor: bg, borderTopStyle: "solid" }}
    >
      <div className="p-3 space-y-2">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ backgroundColor: bg, width: 40, height: 40 }}
        >
          <Truck className="h-4 w-4 text-white" />
        </div>
        <p className="text-[12px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 truncate">
          {truck.nopol}
        </p>
        <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{truck.driver}</p>
        <div className="rounded-lg p-2 space-y-0.5" style={{ backgroundColor: bg + "18" }}>
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
            <div key={label} className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                {label}
              </span>
              <span className="text-[9px] font-bold break-words leading-tight" style={{ color: bg }}>
                {value || "-"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionAccordion({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);
  const counts = colorCounts(section.trucks);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
            {section.name}
          </span>
          <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full">
            {section.trucks.length} truk
          </span>
        </div>
        <div className="flex items-center gap-2">
          {COLOR_ORDER.map((c) =>
            counts[c] ? (
              <span
                key={c}
                className="text-[9px] font-black px-2 py-0.5 rounded text-white"
                style={{ backgroundColor: COLOR_HEX[c] }}
              >
                {counts[c]} Truk
              </span>
            ) : null
          )}
          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 overflow-x-auto">
          {section.trucks.length === 0 ? (
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest py-6">
              Tidak ada antrian
            </p>
          ) : (
            <div className="flex gap-3 pb-1" style={{ minWidth: "max-content" }}>
              {section.trucks.map((t, i) => (
                <TruckCardH key={`${t.nopol}-${i}`} truck={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AntrianHorizontalPage() {
  const { apiJson } = useApi();
  const { activeCompanyCode, companies } = useCompany();

  const [selectedCompany, setSelectedCompany] = useState<string>("");

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

  const totalTrucks = sections.reduce((acc, s) => acc + s.trucks.length, 0);
  const showCompanyPicker = companies.length > 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            Antrian Horizontal
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
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-16" />
          ))}
        </div>
      )}

      {!isLoading && !!selectedCompany && sections.length === 0 && !error && (
        <div className="text-center text-[11px] text-slate-400 font-bold uppercase tracking-widest py-16 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          Belum ada data antrian.
        </div>
      )}

      {!isLoading && sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section) => (
            <SectionAccordion key={section.id} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}
