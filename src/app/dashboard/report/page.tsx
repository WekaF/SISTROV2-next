"use client";
import React, { useState, useEffect, useCallback, Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Company {
  company: string;
  company_code: string;
}

interface DayData {
  kuota: number;
  s1: number;
  s2: number;
  s3: number;
  ls1: number;
  ls2: number;
  ls3: number;
  totalTerpesan: number;
  totalTermuat: number;
}

interface NextDayData {
  kuota: number;
  s1: number;
  s2: number;
  s3: number;
}

interface ReportDataResponse {
  Success: boolean;
  company: string;
  company_code: string;
  arrDate: string[];
  lastDaysData: DayData[];
  arrDateNext: string[];
  nextDaysData: NextDayData[];
}

function buildBarOptions(categories: string[], stacked: boolean, colors: string[]): object {
  return {
    chart: { type: "bar", stacked, toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { borderRadius: 3, columnWidth: "70%" } },
    dataLabels: { enabled: false },
    xaxis: { categories, labels: { style: { fontSize: "10px" }, rotate: -45 } },
    yaxis: { labels: { style: { fontSize: "10px" } } },
    fill: { opacity: 1, colors },
    legend: { position: "top" as const, fontSize: "12px" },
    tooltip: { y: { formatter: (v: number) => v.toFixed(0) } },
  };
}

function ReportContent() {
  const { apiJson } = useApi();
  const searchParams = useSearchParams();
  const router = useRouter();

  const companyFromUrl = searchParams.get("company") ?? "";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState(companyFromUrl);
  const [report, setReport] = useState<ReportDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Searchable Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCompanies = companies.filter(c =>
    (c.company || "").toLowerCase().includes(dropdownSearch.toLowerCase()) ||
    (c.company_code || "").toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  const selectedCompanyName = companies.find(c => c.company_code === selectedCompany)?.company || "Pilih Perusahaan";

  useEffect(() => {
    apiJson<Company[]>("/api/Company/getCompanyListFitur").then(data => {
      if (data) setCompanies(data);
    });
  }, [apiJson]);

  const fetchReport = useCallback(async (code: string) => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<ReportDataResponse>(`/api/Home/ReportData?company=${code}`);
      if (res?.Success) setReport(res);
      else setError("Gagal mengambil data laporan");
    } catch {
      setError("Error mengambil data laporan");
    } finally {
      setLoading(false);
    }
  }, [apiJson]);

  useEffect(() => {
    if (companyFromUrl) {
      setSelectedCompany(companyFromUrl);
      fetchReport(companyFromUrl);
    }
  }, [companyFromUrl, fetchReport]);

  function handleCompanyChange(code: string) {
    setSelectedCompany(code);
    router.push(`/dashboard/report?company=${code}`);
  }

  const terspesanSeries = report ? [
    { name: "Shift 1", data: report.lastDaysData.map((d: DayData) => d.s1) },
    { name: "Shift 2", data: report.lastDaysData.map((d: DayData) => d.s2) },
    { name: "Shift 3", data: report.lastDaysData.map((d: DayData) => d.s3) },
  ] : [];

  const termuatSeries = report ? [
    { name: "Shift 1", data: report.lastDaysData.map((d: DayData) => d.ls1) },
    { name: "Shift 2", data: report.lastDaysData.map((d: DayData) => d.ls2) },
    { name: "Shift 3", data: report.lastDaysData.map((d: DayData) => d.ls3) },
  ] : [];

  const allSeries = report ? [
    { name: "Kuota", data: report.lastDaysData.map((d: DayData) => d.kuota) },
    { name: "Terpesan", data: report.lastDaysData.map((d: DayData) => d.totalTerpesan) },
    { name: "Termuat", data: report.lastDaysData.map((d: DayData) => d.totalTermuat) },
  ] : [];

  const nextSeries = report ? [
    { name: "Shift 1", data: report.nextDaysData.map((d: NextDayData) => d.s1) },
    { name: "Shift 2", data: report.nextDaysData.map((d: NextDayData) => d.s2) },
    { name: "Shift 3", data: report.nextDaysData.map((d: NextDayData) => d.s3) },
  ] : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Plant</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Grafik tiket terpesan &amp; termuat 30 hari terakhir dan 30 hari ke depan
        </p>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <label className="text-sm font-black whitespace-nowrap text-slate-600 dark:text-slate-400">PILIH PLANT:</label>
        
        <div ref={dropdownRef} className="relative w-full max-w-xs z-30">
          {/* Dropdown Trigger Button */}
          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              setDropdownSearch(""); // Reset search query on open
            }}
            className="flex items-center justify-between w-full border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary font-bold text-slate-800 dark:text-slate-200 shadow-sm transition-all"
          >
            <span className="truncate">{selectedCompanyName}</span>
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isDropdownOpen && "transform rotate-180")} />
          </button>

          {/* Search Dropdown Panel overlay */}
          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-100">
              {/* Search Box */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                    placeholder="Cari plant/perusahaan..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    autoFocus
                  />
                  {dropdownSearch && (
                    <button
                      type="button"
                      onClick={() => setDropdownSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100/50 dark:divide-slate-800/20">
                {filteredCompanies.length === 0 ? (
                  <div className="px-4 py-3 text-xs font-semibold text-slate-400 italic text-center">
                    Tidak ada hasil ditemukan
                  </div>
                ) : (
                  filteredCompanies.map((c) => (
                    <button
                      key={c.company_code}
                      type="button"
                      onClick={() => {
                        handleCompanyChange(c.company_code);
                        setIsDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30 flex items-center justify-between",
                        selectedCompany === c.company_code 
                          ? "text-primary bg-primary/5 dark:bg-primary/10" 
                          : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      <span className="truncate">{c.company}</span>
                      <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded ml-2">
                        {c.company_code}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!selectedCompany && !loading && (
        <div className="text-center py-12 text-gray-400">Pilih perusahaan untuk melihat laporan</div>
      )}

      {report && !loading && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
              Grafik Tiket Terpesan 30 Hari Terakhir
            </h3>
            <div style={{ height: 260 }}>
              <Chart
                options={buildBarOptions(report.arrDate, true, ["#3B82F6","#10B981","#F59E0B"]) as any}
                series={terspesanSeries}
                type="bar"
                height="100%"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
              Grafik Tiket Termuat 30 Hari Terakhir
            </h3>
            <div style={{ height: 260 }}>
              <Chart
                options={buildBarOptions(report.arrDate, true, ["#6366F1","#8B5CF6","#A78BFA"]) as any}
                series={termuatSeries}
                type="bar"
                height="100%"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
              Grafik Kuota, Terpesan &amp; Termuat 30 Hari Terakhir
            </h3>
            <div style={{ height: 260 }}>
              <Chart
                options={buildBarOptions(report.arrDate, false, ["#6366F1","#3B82F6","#10B981"]) as any}
                series={allSeries}
                type="bar"
                height="100%"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
              Grafik Kuota 30 Hari ke Depan
            </h3>
            <div style={{ height: 260 }}>
              <Chart
                options={buildBarOptions(report.arrDateNext, true, ["#3B82F6","#10B981","#F59E0B"]) as any}
                series={nextSeries}
                type="bar"
                height="100%"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardReportPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" /></div>}>
      <ReportContent />
    </Suspense>
  );
}
