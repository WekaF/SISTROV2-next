"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Activity, AlertOctagon, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

interface AppLogEntry {
  id: number;
  title: string;
  relatedtable: string;
  relatedid: string;
  updatedby: string;
  updatedon: string | null;
  location: string;
}

interface ApiLogEntry {
  Id: number;
  Timestamp: string | null;
  Endpoint: string;
  Username: string;
  IPAddress: string;
  StatusResponse: string;
  ExecutionTimeMs: number | null;
  ErrorMessage: string;
}

interface LogPage<T> {
  total: number;
  page: number;
  limit: number;
  data: T[];
}

const PAGE_SIZE = 20;

function formatDt(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function StatusBadge({ status }: { status: string }) {
  const code = parseInt(status, 10);
  const isError = code >= 400 || isNaN(code);
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${
      isError
        ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
    }`}>
      {status || "?"}
    </span>
  );
}

export default function ActivityMonitorPanel() {
  const [activeTab, setActiveTab] = useState<"activity" | "apierrors">("activity");

  const [activityPage, setActivityPage] = useState(1);
  const [activityData, setActivityData] = useState<LogPage<AppLogEntry> | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  const [apiPage, setApiPage] = useState(1);
  const [apiData, setApiData] = useState<LogPage<ApiLogEntry> | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [onlyErrors, setOnlyErrors] = useState(true);

  const loadActivityLog = useCallback(async (page: number, user: string, table: string) => {
    setActivityLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (user) params.set("user", user);
      if (table) params.set("table", table);
      const res = await fetch(`/api/admin/logs/activity?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setActivityData(data);
    } catch (e) {
      console.error("[ActivityMonitorPanel activity]", e);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const loadApiLog = useCallback(async (page: number, errors: boolean) => {
    setApiLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        onlyErrors: String(errors),
      });
      const res = await fetch(`/api/admin/logs/api?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setApiData(data);
    } catch (e) {
      console.error("[ActivityMonitorPanel api]", e);
    } finally {
      setApiLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivityLog(activityPage, userFilter, tableFilter);
  }, [activityPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadApiLog(apiPage, onlyErrors);
  }, [apiPage, onlyErrors]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === "activity") loadActivityLog(activityPage, userFilter, tableFilter);
      else loadApiLog(apiPage, onlyErrors);
    }, 30_000);
    return () => clearInterval(interval);
  }, [activeTab, activityPage, apiPage, userFilter, tableFilter, onlyErrors, loadActivityLog, loadApiLog]);

  const activityTotalPages = activityData ? Math.ceil(activityData.total / PAGE_SIZE) : 1;
  const apiTotalPages = apiData ? Math.ceil(apiData.total / PAGE_SIZE) : 1;

  return (
    <Card className="shadow-theme-xs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Monitor</CardTitle>
            <CardDescription>Log aktivitas user dan API errors — superadmin only.</CardDescription>
          </div>
          <button
            onClick={() => {
              if (activeTab === "activity") loadActivityLog(activityPage, userFilter, tableFilter);
              else loadApiLog(apiPage, onlyErrors);
            }}
            className="p-1.5 text-gray-400 hover:text-brand-500 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/20 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${(activityLoading || apiLoading) ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex gap-1 mt-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "activity"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Activity Log
            {activityData && (
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 font-mono text-[10px]">
                {activityData.total.toLocaleString()}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("apierrors")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === "apierrors"
                ? "border-red-500 text-red-600 dark:text-red-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            API Log
            {apiData && (
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 font-mono text-[10px]">
                {apiData.total.toLocaleString()}
              </span>
            )}
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Filter user..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setActivityPage(1); loadActivityLog(1, userFilter, tableFilter); } }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500 w-36"
              />
              <input
                type="text"
                placeholder="Filter tabel..."
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setActivityPage(1); loadActivityLog(1, userFilter, tableFilter); } }}
                className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500 w-36"
              />
              <button
                onClick={() => { setActivityPage(1); loadActivityLog(1, userFilter, tableFilter); }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
              >
                Cari
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Waktu</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">User</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Aksi</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Tabel</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">ID</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Lokasi</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLoading && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Memuat...</td></tr>
                  )}
                  {!activityLoading && (!activityData?.data.length) && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada log.</td></tr>
                  )}
                  {!activityLoading && activityData?.data.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap font-mono">{formatDt(entry.updatedon)}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 max-w-[100px] truncate">{entry.updatedby || "—"}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[160px] truncate" title={entry.title}>{entry.title || "—"}</td>
                      <td className="px-3 py-2">
                        {entry.relatedtable ? (
                          <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded font-mono text-[10px]">
                            {entry.relatedtable}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-400 font-mono">{entry.relatedid || "—"}</td>
                      <td className="px-3 py-2 text-gray-400 max-w-[100px] truncate" title={entry.location}>{entry.location || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{activityData ? `${activityData.total.toLocaleString()} total log` : ""}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={activityPage <= 1}
                  onClick={() => setActivityPage((p) => p - 1)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-medium">{activityPage} / {activityTotalPages}</span>
                <button
                  disabled={activityPage >= activityTotalPages}
                  onClick={() => setActivityPage((p) => p + 1)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "apierrors" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyErrors}
                  onChange={(e) => { setOnlyErrors(e.target.checked); setApiPage(1); }}
                  className="rounded border-gray-300"
                />
                Hanya errors (4xx / 5xx)
              </label>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Waktu</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">User</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Endpoint</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Ms</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {apiLoading && (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Memuat...</td></tr>
                  )}
                  {!apiLoading && (!apiData?.data.length) && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">
                        {onlyErrors ? "Tidak ada API error." : "Tidak ada log."}
                      </td>
                    </tr>
                  )}
                  {!apiLoading && apiData?.data.map((entry) => (
                    <tr key={entry.Id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap font-mono">{formatDt(entry.Timestamp)}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 max-w-[80px] truncate">{entry.Username || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[180px] truncate font-mono text-[10px]" title={entry.Endpoint}>{entry.Endpoint || "—"}</td>
                      <td className="px-3 py-2"><StatusBadge status={entry.StatusResponse} /></td>
                      <td className="px-3 py-2 text-gray-400 font-mono">{entry.ExecutionTimeMs ?? "—"}</td>
                      <td className="px-3 py-2 text-red-500 dark:text-red-400 max-w-[160px] truncate text-[10px]" title={entry.ErrorMessage}>{entry.ErrorMessage || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{apiData ? `${apiData.total.toLocaleString()} total log` : ""}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={apiPage <= 1}
                  onClick={() => setApiPage((p) => p - 1)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-medium">{apiPage} / {apiTotalPages}</span>
                <button
                  disabled={apiPage >= apiTotalPages}
                  onClick={() => setApiPage((p) => p + 1)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
