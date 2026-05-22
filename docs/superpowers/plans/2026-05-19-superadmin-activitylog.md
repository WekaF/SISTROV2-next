# Superadmin Activity Monitor & Log API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Add two ASP.NET endpoints to expose `AppLog` and `ApiLog` tables with pagination. (2) Create Next.js proxy routes for both. (3) Add an Activity Monitor panel to `AdminDashboard.tsx` that superadmin can use to track user movements and API errors — without removing existing dashboard content.

**Architecture:** New ASP.NET `ActivityLogController.cs` with `GetActivityLog` (AppLog table) and `GetApiLog` (ApiLog table). Two Next.js proxy routes under `/api/admin/logs/`. New `ActivityMonitorPanel` component added below existing AdminDashboard content. `AuditLogAttribute` in `FilterConfig.cs` remains commented out — ApiLog is populated separately, do not touch it in this plan.

**Tech Stack:** ASP.NET Web API (EF6, LINQ), Next.js 16 App Router, React hooks, Tailwind CSS, `getServerSession`/`aspnetFetchServer` proxy pattern.

---

## File Structure

- **Create:** `SISTROAWESOME/api/ActivityLogController.cs` — ASP.NET controller for AppLog + ApiLog
- **Create:** `src/app/api/admin/logs/activity/route.ts` — Next.js proxy for AppLog
- **Create:** `src/app/api/admin/logs/api/route.ts` — Next.js proxy for ApiLog
- **Create:** `src/components/dashboard/ActivityMonitorPanel.tsx` — React component for the activity monitor
- **Modify:** `src/components/dashboard/AdminDashboard.tsx` — add ActivityMonitorPanel below existing content

---

### Task 1: ASP.NET ActivityLogController

Two GET endpoints: `GetActivityLog` (AppLog with optional `table` and `user` filter) and `GetApiLog` (ApiLog with optional `onlyErrors` flag). Both paginated.

**Files:**
- Create: `SISTROAWESOME/api/ActivityLogController.cs`

- [ ] **Step 1: Verify AppLog and ApiLog are in SistroDb**

```bash
grep -n "AppLog\|ApiLog" SISTROAWESOME/BDO/SistroDb.cs
```

Expected output: lines like `public DbSet<AppLog> AppLog { get; set; }` and `public DbSet<ApiLog> ApiLog { get; set; }`. If missing, the controller will fail to compile. If missing, add them to `SistroDb.cs` DbContext — but that is a separate task; confirm first.

- [ ] **Step 2: Create the controller**

Create `SISTROAWESOME/api/ActivityLogController.cs`:

```csharp
using System;
using System.Linq;
using System.Web.Http;
using SISTROAWESOME.BDO;

namespace SISTROAWESOME.api
{
    [RoutePrefix("api/ActivityLog")]
    public class ActivityLogController : BaseLoggedApiController
    {
        private SistroDb db = new SistroDb();

        /// <summary>
        /// GET /api/ActivityLog/GetActivityLog?page=1&limit=50&table=&user=
        /// Returns paginated AppLog entries, newest first.
        /// </summary>
        [HttpGet]
        public IHttpActionResult GetActivityLog(int page = 1, int limit = 50, string table = null, string user = null)
        {
            try
            {
                if (!User.IsInRole("SuperAdmin") && !User.IsInRole("TI"))
                    return Unauthorized();

                limit = Math.Min(limit, 200);
                int skip = (page - 1) * limit;

                IQueryable<AppLog> query = db.AppLog;

                if (!string.IsNullOrWhiteSpace(table))
                    query = query.Where(x => x.relatedtable == table);

                if (!string.IsNullOrWhiteSpace(user))
                    query = query.Where(x => x.updatedby.Contains(user));

                int total = query.Count();

                var data = query
                    .OrderByDescending(x => x.updatedon)
                    .Skip(skip)
                    .Take(limit)
                    .Select(x => new
                    {
                        x.id,
                        x.title,
                        x.relatedtable,
                        x.relatedid,
                        x.updatedby,
                        x.updatedon,
                        x.location
                    })
                    .ToList();

                return Ok(new { total, page, limit, data });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        /// <summary>
        /// GET /api/ActivityLog/GetApiLog?page=1&limit=50&onlyErrors=false
        /// Returns paginated ApiLog entries, newest first.
        /// </summary>
        [HttpGet]
        public IHttpActionResult GetApiLog(int page = 1, int limit = 50, bool onlyErrors = false)
        {
            try
            {
                if (!User.IsInRole("SuperAdmin") && !User.IsInRole("TI"))
                    return Unauthorized();

                limit = Math.Min(limit, 200);
                int skip = (page - 1) * limit;

                IQueryable<ApiLog> query = db.ApiLog;

                if (onlyErrors)
                    query = query.Where(x => x.StatusResponse != null && x.StatusResponse.StartsWith("4")
                                          || x.StatusResponse != null && x.StatusResponse.StartsWith("5")
                                          || x.ErrorMessage != null && x.ErrorMessage != "");

                int total = query.Count();

                var data = query
                    .OrderByDescending(x => x.Timestamp)
                    .Skip(skip)
                    .Take(limit)
                    .Select(x => new
                    {
                        x.Id,
                        x.Timestamp,
                        x.Endpoint,
                        x.Username,
                        x.IPAddress,
                        x.StatusResponse,
                        x.ExecutionTimeMs,
                        x.ErrorMessage
                    })
                    .ToList();

                return Ok(new { total, page, limit, data });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }
}
```

- [ ] **Step 3: Build and verify no compile errors**

```bash
cd C:\Users\weka\Indigo\sistropigroup
msbuild SISTROAWESOME/SISTROAWESOME.csproj /t:Build /p:Configuration=Debug 2>&1 | grep -E "error|warning" | head -30
```

Fix any compile errors. Common issue: `db.AppLog` or `db.ApiLog` not found on DbContext — if so, verify Step 1 result and add DbSet properties to `SistroDb.cs`.

- [ ] **Step 4: Commit**

```bash
rtk git add SISTROAWESOME/api/ActivityLogController.cs
rtk git commit -m "feat: add ActivityLogController with GetActivityLog and GetApiLog endpoints"
```

---

### Task 2: Next.js proxy routes for activity log and API log

Two thin proxy routes, superadmin/ti only.

**Files:**
- Create: `src/app/api/admin/logs/activity/route.ts`
- Create: `src/app/api/admin/logs/api/route.ts`

- [ ] **Step 1: Create activity log proxy**

Create `src/app/api/admin/logs/activity/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !role || !["superadmin", "ti"].includes(role.toLowerCase())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "50";
  const table = searchParams.get("table") ?? "";
  const user = searchParams.get("user") ?? "";

  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const params = new URLSearchParams({ page, limit });
    if (table) params.set("table", table);
    if (user) params.set("user", user);
    const res = await aspnetFetchServer(`/api/ActivityLog/GetActivityLog?${params}`, token);
    if (!res.ok) throw new Error(`ASP.NET returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[ActivityLog proxy]", error.message);
    return NextResponse.json({ error: "Failed to fetch activity log" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create API log proxy**

Create `src/app/api/admin/logs/api/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !role || !["superadmin", "ti"].includes(role.toLowerCase())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "50";
  const onlyErrors = searchParams.get("onlyErrors") ?? "false";

  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const params = new URLSearchParams({ page, limit, onlyErrors });
    const res = await aspnetFetchServer(`/api/ActivityLog/GetApiLog?${params}`, token);
    if (!res.ok) throw new Error(`ASP.NET returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[ApiLog proxy]", error.message);
    return NextResponse.json({ error: "Failed to fetch API log" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/api/admin/logs/activity/route.ts src/app/api/admin/logs/api/route.ts
rtk git commit -m "feat: add superadmin proxy routes for activity log and API log"
```

---

### Task 3: ActivityMonitorPanel component

Tabbed panel: "Activity Log" tab shows AppLog, "API Errors" tab shows ApiLog filtered to errors. Both paginated with Next/Prev buttons. Auto-refreshes every 30s.

**Files:**
- Create: `src/components/dashboard/ActivityMonitorPanel.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/ActivityMonitorPanel.tsx`:

```tsx
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

  // Activity log state
  const [activityPage, setActivityPage] = useState(1);
  const [activityData, setActivityData] = useState<LogPage<AppLogEntry> | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");

  // API log state
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

  // Load on mount and tab switch
  useEffect(() => {
    loadActivityLog(activityPage, userFilter, tableFilter);
  }, [activityPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadApiLog(apiPage, onlyErrors);
  }, [apiPage, onlyErrors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30s
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

        {/* Tabs */}
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
        {/* Activity Log Tab */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            {/* Filters */}
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

            {/* Table */}
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
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">Memuat...</td>
                    </tr>
                  )}
                  {!activityLoading && (!activityData?.data.length) && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada log.</td>
                    </tr>
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

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {activityData ? `${activityData.total.toLocaleString()} total log` : ""}
              </span>
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

        {/* API Log Tab */}
        {activeTab === "apierrors" && (
          <div className="space-y-4">
            {/* Toggle */}
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

            {/* Table */}
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
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">Memuat...</td>
                    </tr>
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
                      <td className="px-3 py-2">
                        <StatusBadge status={entry.StatusResponse} />
                      </td>
                      <td className="px-3 py-2 text-gray-400 font-mono">{entry.ExecutionTimeMs ?? "—"}</td>
                      <td className="px-3 py-2 text-red-500 dark:text-red-400 max-w-[160px] truncate text-[10px]" title={entry.ErrorMessage}>{entry.ErrorMessage || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {apiData ? `${apiData.total.toLocaleString()} total log` : ""}
              </span>
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/dashboard/ActivityMonitorPanel.tsx
rtk git commit -m "feat: add ActivityMonitorPanel component with tabbed AppLog/ApiLog viewer"
```

---

### Task 4: Add ActivityMonitorPanel to AdminDashboard

Append the panel below the existing "Additional Warehouse & Transit Stats" placeholder in `AdminDashboard.tsx`. Do not remove any existing content.

**Files:**
- Modify: `src/components/dashboard/AdminDashboard.tsx`

- [ ] **Step 1: Add import**

Open `src/components/dashboard/AdminDashboard.tsx`. Add import at the top after existing imports:

```tsx
import ActivityMonitorPanel from "@/components/dashboard/ActivityMonitorPanel";
```

- [ ] **Step 2: Replace the placeholder div with ActivityMonitorPanel**

Find this block near the bottom of `AdminDashboard.tsx`:
```tsx
        {/* Placeholder for future detailed widgets */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 flex items-center justify-center text-gray-400">
           Additional Warehouse & Transit Stats Will Appear Here
        </div>
```

Replace with:
```tsx
        <div className="lg:col-span-2">
          <ActivityMonitorPanel />
        </div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/dashboard/AdminDashboard.tsx
rtk git commit -m "feat: add ActivityMonitorPanel to AdminDashboard superadmin view"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Covered by |
|---|---|
| Superadmin — pantau pergerakan user | Task 3 (ActivityMonitorPanel, Activity Log tab, `AppLog`) |
| Superadmin — log API errors | Task 3 (API Log tab, `ApiLog` with `onlyErrors` toggle) |
| API log endpoint di SISTROAWESOME | Task 1 (`GetActivityLog`, `GetApiLog` in `ActivityLogController`) |
| Next.js proxy routes | Task 2 (`/api/admin/logs/activity`, `/api/admin/logs/api`) |
| Superadmin-only guard | Task 1 (`User.IsInRole("SuperAdmin")`) + Task 2 (role check) |
| Pagination | Task 1 (`skip`/`take`) + Task 3 (page state + prev/next) |
| Auto-refresh 30s | Task 3 (`setInterval(30_000)`) |
| Filter by user/table (activity) | Task 1 (query params) + Task 3 (filter inputs) |
| Filter errors only (API log) | Task 1 (`onlyErrors` param) + Task 3 (checkbox toggle) |
| Tidak menghapus existing AdminDashboard content | Task 4 (only replaces placeholder div) |

**Placeholder scan:** No TBDs. All code blocks complete.

**Type consistency:**
- `AppLogEntry` fields match `AppLog.cs` exactly: `id, title, relatedtable, relatedid, updatedby, updatedon, location`.
- `ApiLogEntry` fields match `ApiLog.cs` exactly: `Id, Timestamp, Endpoint, IPAddress, Username, StatusResponse, ExecutionTimeMs, ErrorMessage`.
- `LogPage<T>` interface matches ASP.NET response shape `{ total, page, limit, data }`.
- `GetActivityLog` endpoint Select projection omits `oldvalue`/`newvalue` (can be large) — intentional, not a bug.
- `GetApiLog` endpoint omits `RequestBody` (can be large) — intentional.
