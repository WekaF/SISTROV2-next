"use client";
import React, { useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";

const PAGE_SIZE = 50;

const EVENT_BADGE: Record<string, { label: string; color: string }> = {
  LOGIN:          { label: "Login",         color: "bg-green-100 text-green-800" },
  LOGOUT:         { label: "Logout",        color: "bg-gray-100 text-gray-700" },
  LOGIN_FAILED:   { label: "Login Gagal",   color: "bg-red-100 text-red-800" },
  COMPANY_SWITCH: { label: "Ganti Company", color: "bg-blue-100 text-blue-800" },
  API_CALL:       { label: "API Call",      color: "bg-purple-100 text-purple-800" },
};

interface AppliedFilters {
  username: string;
  eventType: string;
  companyCode: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: AppliedFilters = {
  username: "", eventType: "", companyCode: "", dateFrom: "", dateTo: "",
};

export default function NextjsActivityLogPage() {
  const [page, setPage]           = useState(1);
  const [draft, setDraft]         = useState<AppliedFilters>(EMPTY_FILTERS);
  const [applied, setApplied]     = useState<AppliedFilters>(EMPTY_FILTERS);

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (applied.username)    params.set("username",    applied.username);
  if (applied.eventType)   params.set("eventType",   applied.eventType);
  if (applied.companyCode) params.set("companyCode", applied.companyCode);
  if (applied.dateFrom)    params.set("dateFrom",    applied.dateFrom);
  if (applied.dateTo)      params.set("dateTo",      applied.dateTo);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["nextjs-audit-log", page, applied],
    queryFn: async () => {
      const res = await fetch(`/api/admin/logs/nextjs?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal fetch log");
      return json as { data: any[]; total: number; page: number; limit: number };
    },
  });

  const rows       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function applyFilters() {
    setPage(1);
    setApplied({ ...draft });
  }

  function resetFilters() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity Log (Next.js)</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Input
              placeholder="Username..."
              value={draft.username}
              onChange={(e) => setDraft(d => ({ ...d, username: e.target.value }))}
            />
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={draft.eventType}
              onChange={(e) => setDraft(d => ({ ...d, eventType: e.target.value }))}
            >
              <option value="">Semua Event</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="LOGIN_FAILED">Login Gagal</option>
              <option value="COMPANY_SWITCH">Ganti Company</option>
              <option value="API_CALL">API Call</option>
            </select>
            <Input
              placeholder="Company Code..."
              value={draft.companyCode}
              onChange={(e) => setDraft(d => ({ ...d, companyCode: e.target.value }))}
            />
            <Input
              type="date"
              value={draft.dateFrom}
              onChange={(e) => setDraft(d => ({ ...d, dateFrom: e.target.value }))}
            />
            <Input
              type="date"
              value={draft.dateTo}
              onChange={(e) => setDraft(d => ({ ...d, dateTo: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={applyFilters}>
              <Search className="w-4 h-4 mr-2" /> Filter
            </Button>
            <Button size="sm" variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <p className="text-sm text-gray-500 mb-3">
            {isLoading ? "Memuat..." : `${total} log ditemukan`}
          </p>
          {!isLoading && rows.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Tidak ada data log</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-600">
                  <th className="pb-2 pr-4 font-medium">Waktu</th>
                  <th className="pb-2 pr-4 font-medium">Event</th>
                  <th className="pb-2 pr-4 font-medium">Username</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Company</th>
                  <th className="pb-2 pr-4 font-medium">Resource</th>
                  <th className="pb-2 pr-4 font-medium">IP</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => {
                  const badge = EVENT_BADGE[row.eventType] ?? { label: row.eventType, color: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 whitespace-nowrap text-xs text-gray-500">
                        {new Date(row.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-medium">{row.username ?? "-"}</td>
                      <td className="py-2 pr-4 text-xs">{row.role ?? "-"}</td>
                      <td className="py-2 pr-4 text-xs">{row.companyCode ?? "-"}</td>
                      <td className="py-2 pr-4 text-xs font-mono max-w-[180px] truncate" title={row.resource ?? ""}>
                        {row.method ? `[${row.method}] ` : ""}{row.resource ?? "-"}
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{row.ipAddress ?? "-"}</td>
                      <td className="py-2 text-xs">
                        {row.statusCode ? (
                          <span className={row.statusCode < 400 ? "text-green-600" : "text-red-600"}>
                            {row.statusCode}
                          </span>
                        ) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>Halaman {page} / {totalPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
