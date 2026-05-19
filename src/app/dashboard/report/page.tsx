"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useApi } from "@/hooks/use-api";

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

      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border">
        <label className="text-sm font-medium whitespace-nowrap">Pilih Plant:</label>
        <select
          className="flex-1 max-w-xs border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
          value={selectedCompany}
          onChange={e => handleCompanyChange(e.target.value)}
        >
          <option value="">-- Pilih Perusahaan --</option>
          {companies.map(c => (
            <option key={c.company_code} value={c.company_code}>{c.company}</option>
          ))}
        </select>
        {report && <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{report.company}</span>}
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
