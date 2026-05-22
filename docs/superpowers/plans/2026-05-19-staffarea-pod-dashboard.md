# StaffArea & POD Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder dashboards for `staffarea` and `pod` roles with real, company-scoped operational dashboards powered by new ASP.NET endpoints.

**Architecture:** (1) New ASP.NET endpoint `GetCompanyDashboardStats` in `HomeController.cs` that scopes queries to the JWT user's `company_code`. (2) New Next.js proxy routes for staffarea and pod. (3) New `StaffAreaDashboard.tsx` component for the staffarea role. (4) Replace hardcoded `PodDashboard.tsx` with live data. (5) Wire `staffarea` role in `DashboardClient.tsx`.

**Tech Stack:** ASP.NET Web API (EF6, LINQ), Next.js 16 App Router, React hooks, ApexCharts (`react-apexcharts`), Tailwind CSS, `getServerSession`/`aspnetFetchServer` proxy pattern.

---

## File Structure

- **Create:** `SISTROAWESOME/api/CompanyDashboardController.cs` — new ASP.NET controller with company-scoped endpoints
- **Create:** `src/app/api/staffarea/dashboard/route.ts` — Next.js proxy for staffarea metrics
- **Create:** `src/app/api/pod/dashboard/company-stats/route.ts` — Next.js proxy for POD company-scoped stats
- **Create:** `src/components/dashboard/StaffAreaDashboard.tsx` — new staffarea dashboard component
- **Modify:** `src/components/dashboard/PodDashboard.tsx` — replace hardcoded data with real API calls
- **Modify:** `src/components/dashboard/DashboardClient.tsx` — add `staffarea` role routing

---

### Task 1: ASP.NET — GetCompanyDashboardStats endpoint

This is the core backend endpoint. It reads the authenticated user's `company_code` from `AspNetUsers`, then queries `Tiket` and related tables scoped to that company.

**Files:**
- Create: `SISTROAWESOME/api/CompanyDashboardController.cs`

- [ ] **Step 1: Create the controller file**

Create `SISTROAWESOME/api/CompanyDashboardController.cs`:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using SISTROAWESOME.BDO;

namespace SISTROAWESOME.api
{
    [RoutePrefix("api/CompanyDashboard")]
    public class CompanyDashboardController : BaseLoggedApiController
    {
        private SistroDb db = new SistroDb();

        [HttpGet]
        public IHttpActionResult GetStats()
        {
            try
            {
                string username = User.Identity.Name;
                var userRecord = db.AspNetUsers
                    .Where(x => x.UserName == username)
                    .Select(x => new { x.company_code })
                    .FirstOrDefault();

                if (userRecord == null || string.IsNullOrEmpty(userRecord.company_code))
                    return BadRequest("User company not found");

                string companyCode = userRecord.company_code;

                DateTime today = DateTime.UtcNow.Date;
                DateTime tomorrow = today.AddDays(1);
                DateTime sevenDaysAgo = today.AddDays(-7);

                var tiketToday = db.Tiket
                    .Where(x => x.company_code == companyCode
                                && x.tanggal >= today
                                && x.tanggal < tomorrow)
                    .ToList();

                int antriAktif = tiketToday.Count(x => x.status == "Antri" || x.status == "0");
                int selesai = tiketToday.Count(x => x.status == "Selesai" || x.status == "4");
                int proses = tiketToday.Count(x => x.status == "Proses" || x.status == "2" || x.status == "3");
                int cancel = tiketToday.Count(x => x.status == "Batal" || x.status == "9");
                double totalTonase = tiketToday
                    .Where(x => x.qty != null)
                    .Sum(x => (double?)x.qty) ?? 0;

                // Cancel rate (7 days)
                var tiket7Days = db.Tiket
                    .Where(x => x.company_code == companyCode
                                && x.tanggal >= sevenDaysAgo
                                && x.tanggal < tomorrow)
                    .ToList();
                int total7 = tiket7Days.Count;
                int cancel7 = tiket7Days.Count(x => x.status == "Batal" || x.status == "9");
                double cancelRate = total7 > 0 ? Math.Round((double)cancel7 / total7 * 100, 1) : 0;

                // Avg durasi (selesai today, durasi in minutes)
                var selesaiWithDurasi = tiketToday
                    .Where(x => (x.status == "Selesai" || x.status == "4")
                                && x.tgl_muat != null && x.tgl_keluar != null)
                    .ToList();
                double avgDurasi = selesaiWithDurasi.Any()
                    ? selesaiWithDurasi.Average(x =>
                        (x.tgl_keluar.Value - x.tgl_muat.Value).TotalMinutes)
                    : 0;

                // Per-gudang antrian breakdown
                var gudangBreakdown = tiketToday
                    .Where(x => x.status == "Antri" || x.status == "0")
                    .GroupBy(x => x.idgudang ?? "Unknown")
                    .Select(g => new { gudang = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .Take(8)
                    .ToList();

                // Shift breakdown (based on jam_masuk hour)
                var shiftBreakdown = new
                {
                    pagi = tiketToday.Count(x => x.jam_masuk != null && x.jam_masuk.Value.Hour >= 6 && x.jam_masuk.Value.Hour < 14),
                    siang = tiketToday.Count(x => x.jam_masuk != null && x.jam_masuk.Value.Hour >= 14 && x.jam_masuk.Value.Hour < 22),
                    malam = tiketToday.Count(x => x.jam_masuk != null && (x.jam_masuk.Value.Hour >= 22 || x.jam_masuk.Value.Hour < 6))
                };

                // Overdue tickets (Antri/Proses for >2 hours)
                DateTime twoHoursAgo = DateTime.UtcNow.AddHours(-2);
                int overdueCount = tiketToday.Count(x =>
                    (x.status == "Antri" || x.status == "0" || x.status == "Proses" || x.status == "2")
                    && x.jam_masuk != null && x.jam_masuk < twoHoursAgo);

                return Ok(new
                {
                    companyCode,
                    antriAktif,
                    selesai,
                    proses,
                    cancel,
                    totalTonase = Math.Round(totalTonase, 2),
                    avgDurasiMenit = Math.Round(avgDurasi, 1),
                    cancelRate,
                    overdueCount,
                    gudangBreakdown,
                    shiftBreakdown,
                    generatedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }
    }
}
```

- [ ] **Step 2: Verify field names against Tiket entity**

Run a quick grep to confirm field names used in the query:
```bash
grep -n "company_code\|tgl_muat\|tgl_keluar\|idgudang\|jam_masuk\|qty\b" SISTROAWESOME/BDO/Tiket.cs
```

If any field name differs, update the controller query to match the actual entity field name. Common variants: `tgl_keluar` might be `tgl_selesai`, `idgudang` might be `gudang_code`, `qty` might be `berat` or `tonase`.

- [ ] **Step 3: Verify BaseLoggedApiController and SistroDb are the correct base class and DbContext**

```bash
grep -rn "class BaseLoggedApiController" SISTROAWESOME/
grep -rn "class SistroDb" SISTROAWESOME/
```

If the base class name or DbContext name differs, update the controller accordingly.

- [ ] **Step 4: Build and verify no compile errors**

```bash
cd C:\Users\weka\Indigo\sistropigroup
msbuild SISTROAWESOME/SISTROAWESOME.csproj /t:Build /p:Configuration=Debug 2>&1 | grep -E "error|warning" | head -30
```

Fix any compile errors before continuing.

- [ ] **Step 5: Commit**

```bash
rtk git add SISTROAWESOME/api/CompanyDashboardController.cs
rtk git commit -m "feat: add CompanyDashboardController with company-scoped GetStats endpoint"
```

---

### Task 2: Next.js proxy routes for staffarea and pod

Two thin proxy routes that forward requests to the new ASP.NET endpoint with the user's JWT token.

**Files:**
- Create: `src/app/api/staffarea/dashboard/route.ts`
- Create: `src/app/api/pod/dashboard/company-stats/route.ts`

- [ ] **Step 1: Create staffarea dashboard proxy**

Create `src/app/api/staffarea/dashboard/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !role || !["staffarea", "gudang", "pod"].includes(role.toLowerCase())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/CompanyDashboard/GetStats", token);
    if (!res.ok) throw new Error(`ASP.NET returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[StaffArea Dashboard]", error.message);
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create pod company-stats proxy**

Create `src/app/api/pod/dashboard/company-stats/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !role || role.toLowerCase() !== "pod") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/CompanyDashboard/GetStats", token);
    if (!res.ok) throw new Error(`ASP.NET returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[POD Company Stats]", error.message);
    return NextResponse.json({ error: "Failed to fetch company stats" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit 2>&1 | head -30
```

Fix any type errors before continuing.

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/api/staffarea/dashboard/route.ts src/app/api/pod/dashboard/company-stats/route.ts
rtk git commit -m "feat: add staffarea and pod company-scoped dashboard proxy routes"
```

---

### Task 3: StaffAreaDashboard component

New React component for the `staffarea` role. Shows 6 KPI cards, per-gudang queue bar chart, and shift progress.

**Files:**
- Create: `src/components/dashboard/StaffAreaDashboard.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/StaffAreaDashboard.tsx`:

```tsx
"use client";
import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  CheckCircle2,
  Weight,
  Timer,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CompanyStats {
  antriAktif: number;
  selesai: number;
  proses: number;
  totalTonase: number;
  avgDurasiMenit: number;
  cancelRate: number;
  overdueCount: number;
  gudangBreakdown: { gudang: string; count: number }[];
  shiftBreakdown: { pagi: number; siang: number; malam: number };
}

export default function StaffAreaDashboard() {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/staffarea/dashboard");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("[StaffAreaDashboard]", e);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const kpis = [
    {
      label: "Antrian Aktif",
      value: stats?.antriAktif ?? "—",
      icon: ClipboardList,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      alert: (stats?.antriAktif ?? 0) > 15,
      alertMsg: "Antrian tinggi!",
    },
    {
      label: "Selesai Hari Ini",
      value: stats?.selesai ?? "—",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      alert: false,
      alertMsg: "",
    },
    {
      label: "Sedang Proses",
      value: stats?.proses ?? "—",
      icon: Timer,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      alert: false,
      alertMsg: "",
    },
    {
      label: "Total Tonase",
      value: stats ? `${stats.totalTonase.toLocaleString("id-ID")} Ton` : "—",
      icon: Weight,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/20",
      alert: false,
      alertMsg: "",
    },
    {
      label: "Avg Durasi Bongkar",
      value: stats ? `${stats.avgDurasiMenit} Mnt` : "—",
      icon: Timer,
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-950/20",
      alert: (stats?.avgDurasiMenit ?? 0) > 90,
      alertMsg: "Durasi rata-rata tinggi",
    },
    {
      label: "Cancel Rate (7 Hari)",
      value: stats ? `${stats.cancelRate}%` : "—",
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950/20",
      alert: (stats?.cancelRate ?? 0) > 5,
      alertMsg: "Cancel rate >5%",
    },
  ];

  // Gudang breakdown bar chart
  const gudangCategories = stats?.gudangBreakdown.map((g) => g.gudang) ?? [];
  const gudangData = stats?.gudangBreakdown.map((g) => g.count) ?? [];
  const gudangChartOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
    colors: ["#3C50E0", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#36B9CC", "#858796"],
    xaxis: { categories: gudangCategories, labels: { style: { fontSize: "11px" } } },
    yaxis: { labels: { style: { fontSize: "11px" } } },
    legend: { show: false },
    dataLabels: { enabled: true, style: { fontSize: "11px" } },
    grid: { borderColor: "#f1f5f9" },
    tooltip: { y: { formatter: (v: number) => `${v} tiket` } },
  };

  // Shift donut chart
  const shiftSeries = [
    stats?.shiftBreakdown.pagi ?? 0,
    stats?.shiftBreakdown.siang ?? 0,
    stats?.shiftBreakdown.malam ?? 0,
  ];
  const shiftOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: ["Pagi (06–14)", "Siang (14–22)", "Malam (22–06)"],
    colors: ["#F59E0B", "#3C50E0", "#1E293B"],
    legend: { position: "bottom", fontSize: "12px" },
    dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Memuat data dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overdue alert banner */}
      {(stats?.overdueCount ?? 0) > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{stats?.overdueCount}</strong> tiket sudah &gt;2 jam belum selesai — perlu perhatian segera.
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-theme-xs">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{kpi.value}</p>
              {kpi.alert && (
                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {kpi.alertMsg}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gudang queue breakdown */}
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Antrian per Gudang</CardTitle>
            <CardDescription>Jumlah tiket antri aktif per lokasi gudang hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            {gudangCategories.length > 0 ? (
              <div style={{ height: `${Math.max(200, gudangCategories.length * 44)}px` }}>
                <Chart
                  options={gudangChartOptions}
                  series={[{ name: "Antri", data: gudangData }]}
                  type="bar"
                  height="100%"
                  width="100%"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Tidak ada tiket antri saat ini.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shift breakdown donut */}
        <Card className="lg:col-span-4 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Distribusi Shift</CardTitle>
            <CardDescription>Tiket masuk berdasarkan shift hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              {shiftSeries.some((v) => v > 0) ? (
                <Chart
                  options={shiftOptions}
                  series={shiftSeries}
                  type="donut"
                  height="100%"
                  width="100%"
                />
              ) : (
                <p className="text-sm text-gray-400">Belum ada tiket hari ini.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit 2>&1 | head -30
```

Fix any type errors. Common issue: `ApexCharts.ApexOptions` may need import `import type ApexCharts from "apexcharts"` at the top if the type isn't globally available. Check `PodDashboard.tsx` for the pattern it uses for chart options typing — use `any` if needed.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/dashboard/StaffAreaDashboard.tsx
rtk git commit -m "feat: add StaffAreaDashboard component with real-time company-scoped KPIs"
```

---

### Task 4: Wire StaffAreaDashboard in DashboardClient

`staffarea` role currently falls through to `<LogisticsMetrics />` placeholder. Route it to the new component.

**Files:**
- Modify: `src/components/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add import**

Open `src/components/dashboard/DashboardClient.tsx`. Add import after the existing dashboard imports:

```tsx
import StaffAreaDashboard from "@/components/dashboard/StaffAreaDashboard";
```

- [ ] **Step 2: Add staffarea routing in JSX**

Find this block in `DashboardClient.tsx`:
```tsx
      {/* Dynamic Content based on Role */}
      {role === "admin" || role === "superadmin" ? (
        <AdminDashboard />
      ) : role === "pod" ? (
        <PodDashboard />
      ) : (role === "rekanan" || role === "transport") ? (
        <TransportDashboard />
      ) : role === "viewer" ? (
        <ViewerDashboard />
      ) : (
```

Replace with:
```tsx
      {/* Dynamic Content based on Role */}
      {role === "admin" || role === "superadmin" ? (
        <AdminDashboard />
      ) : role === "pod" ? (
        <PodDashboard />
      ) : role === "staffarea" ? (
        <StaffAreaDashboard />
      ) : (role === "rekanan" || role === "transport") ? (
        <TransportDashboard />
      ) : role === "viewer" ? (
        <ViewerDashboard />
      ) : (
```

- [ ] **Step 3: Update title/description for staffarea**

In the `title` and `description` ternary chains, `staffarea` currently has no explicit case. It will fall through to `"Logistics Overview"`. Add an explicit case.

Find the `title` assignment:
```typescript
  const title = role === "admin" || role === "superadmin"
    ? "Central Command Dashboard"
    : role === "pod"
      ? "POD Operations Center"
```

Add after the `pod` case (before the `security` case):
```typescript
      : role === "staffarea"
        ? "Staff Area Operations"
```

Find the `description` assignment and add similarly:
```typescript
      : role === "staffarea"
        ? "Pantau antrian, tonase, dan kinerja gudang plant Anda."
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/dashboard/DashboardClient.tsx
rtk git commit -m "feat: route staffarea role to StaffAreaDashboard in DashboardClient"
```

---

### Task 5: Replace PodDashboard with live company-scoped data

`PodDashboard.tsx` currently has all hardcoded data with fake numbers and a stub `fetch("/api/pod/dashboard/metrics")` that returns empty. Replace with real data from `/api/pod/dashboard/company-stats`.

**Files:**
- Modify: `src/components/dashboard/PodDashboard.tsx`

- [ ] **Step 1: Replace the PodDashboard component**

Rewrite `src/components/dashboard/PodDashboard.tsx` in full:

```tsx
"use client";
import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Timer,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  TrendingDown,
  Weight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface CompanyStats {
  antriAktif: number;
  selesai: number;
  proses: number;
  cancel: number;
  totalTonase: number;
  avgDurasiMenit: number;
  cancelRate: number;
  overdueCount: number;
  gudangBreakdown: { gudang: string; count: number }[];
  shiftBreakdown: { pagi: number; siang: number; malam: number };
  companyCode: string;
}

export const PodDashboard = () => {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/pod/dashboard/company-stats");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error("[PodDashboard]", e);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const kpis = [
    {
      label: "Antrian Aktif",
      value: stats?.antriAktif ?? "—",
      icon: ClipboardList,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/20",
    },
    {
      label: "Selesai Hari Ini",
      value: stats?.selesai ?? "—",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      label: "Sedang Proses",
      value: stats?.proses ?? "—",
      icon: Timer,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      label: "Total Tonase",
      value: stats ? `${stats.totalTonase.toLocaleString("id-ID")} Ton` : "—",
      icon: Weight,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      label: "Avg Durasi",
      value: stats ? `${stats.avgDurasiMenit} Mnt` : "—",
      icon: Timer,
      color: "text-sky-500",
      bg: "bg-sky-50 dark:bg-sky-950/20",
    },
    {
      label: "Cancel Rate 7hr",
      value: stats ? `${stats.cancelRate}%` : "—",
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950/20",
    },
  ];

  const gudangCategories = stats?.gudangBreakdown.map((g) => g.gudang) ?? [];
  const gudangData = stats?.gudangBreakdown.map((g) => g.count) ?? [];

  const gudangChartOptions: any = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, distributed: true } },
    colors: ["#3C50E0", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#36B9CC", "#858796"],
    xaxis: { categories: gudangCategories, labels: { style: { fontSize: "11px" } } },
    legend: { show: false },
    dataLabels: { enabled: true, style: { fontSize: "11px" } },
    tooltip: { y: { formatter: (v: number) => `${v} tiket` } },
  };

  const shiftSeries = [
    stats?.shiftBreakdown.pagi ?? 0,
    stats?.shiftBreakdown.siang ?? 0,
    stats?.shiftBreakdown.malam ?? 0,
  ];

  const shiftOptions: any = {
    chart: { type: "donut", fontFamily: "inherit" },
    labels: ["Pagi (06–14)", "Siang (14–22)", "Malam (22–06)"],
    colors: ["#F59E0B", "#3C50E0", "#1E293B"],
    legend: { position: "bottom", fontSize: "12px" },
    dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%` },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Memuat data POD dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overdue alert */}
      {(stats?.overdueCount ?? 0) > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{stats?.overdueCount}</strong> tiket &gt;2 jam belum selesai — eskalasi diperlukan.
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-theme-xs">
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-3`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{kpi.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 shadow-theme-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Antrian per Gudang</CardTitle>
                <CardDescription>Distribusi tiket antri aktif per lokasi gudang.</CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            {gudangCategories.length > 0 ? (
              <div style={{ height: `${Math.max(200, gudangCategories.length * 44)}px` }}>
                <Chart
                  options={gudangChartOptions}
                  series={[{ name: "Antri", data: gudangData }]}
                  type="bar"
                  height="100%"
                  width="100%"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                Tidak ada tiket antri saat ini.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 shadow-theme-xs">
          <CardHeader>
            <CardTitle>Distribusi Shift</CardTitle>
            <CardDescription>Tiket masuk berdasarkan shift hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              {shiftSeries.some((v) => v > 0) ? (
                <Chart
                  options={shiftOptions}
                  series={shiftSeries}
                  type="donut"
                  height="100%"
                  width="100%"
                />
              ) : (
                <p className="text-sm text-gray-400">Belum ada tiket hari ini.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/dashboard/PodDashboard.tsx
rtk git commit -m "feat: replace PodDashboard hardcoded data with real company-scoped API"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Covered by |
|---|---|
| Staff Area — company-scoped KPIs (antrian, selesai, tonase, avg durasi, cancel rate) | Task 1 (endpoint) + Task 3 (component) |
| Staff Area — per-gudang queue breakdown | Task 1 (`gudangBreakdown`) + Task 3 (bar chart) |
| Staff Area — shift progress | Task 1 (`shiftBreakdown`) + Task 3 (donut chart) |
| Staff Area — overdue alert | Task 1 (`overdueCount`) + Task 3 (alert banner) |
| Staff Area — wired in DashboardClient | Task 4 |
| POD — same KPIs as staffarea + overdue | Task 1 (shared endpoint) + Task 5 |
| POD — per-gudang + shift charts | Task 5 |
| Real data, not hardcoded | Tasks 1-2 (ASP.NET + Next.js proxy) |

**Placeholder scan:** No TBDs. All code blocks complete.

**Type consistency:**
- `CompanyStats` interface in `StaffAreaDashboard.tsx` matches fields returned by `GetStats` endpoint exactly.
- `PodDashboard.tsx` uses same `CompanyStats` shape (same endpoint via different route).
- `gudangBreakdown` typed as `{ gudang: string; count: number }[]` — matches `GroupBy` result in C# DTO.
- Chart options typed as `any` in PodDashboard (consistent with existing pattern in same file).
