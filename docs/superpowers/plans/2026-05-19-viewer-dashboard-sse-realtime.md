# Viewer Dashboard SSE Real-Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ViewerDashboard's single-fetch-on-mount with SSE streaming so dashboard data auto-refreshes every 30 seconds without user interaction.

**Architecture:** Next.js API route at `/api/stream/dashboard` acts as SSE server — it fetches all 9 ASP.NET endpoints every 30s using server-side `aspnetFetchServer` and streams the combined payload as `text/event-stream`. Browser uses `EventSource` (cookies auto-sent → `getServerSession` works, no auth header workaround needed). A `useDashboardStream` hook wraps lifecycle. `InteractiveLeafletMap` gains an optional `externalData` prop so map markers also update live.

**Tech Stack:** Next.js 16 App Router (ReadableStream SSE), `getServerSession` (NextAuth), `aspnetFetchServer`, `EventSource` browser API, TypeScript.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/api/stream/dashboard/route.ts` | **Create** | SSE endpoint — polls 9 ASP.NET endpoints, streams JSON every 30s |
| `src/hooks/use-dashboard-stream.ts` | **Create** | Client hook — wraps EventSource, exposes dashboard state + connection status |
| `src/components/dashboard/InteractiveLeafletMap.tsx` | **Modify** | Accept `externalData?: PlantMarker[]` prop — skip internal fetch when provided |
| `src/components/dashboard/ViewerDashboard.tsx` | **Modify** | Replace `loadDashboardData` + `useEffect([token])` with `useDashboardStream()`, pass map data to map, show live indicator |

---

## ASP.NET Endpoints to Stream

All called server-side with `aspnetFetchServer`:

| # | Endpoint | State var in ViewerDashboard |
|---|----------|------------------------------|
| 1 | `/api/Home/MonitorStats` | `stats` |
| 2 | `/api/Home/GetTiketTrendPerPlant` | `trendPerPlant` |
| 3 | `/api/Home/GetTiketTrendPerHour` | `trendPerHour` |
| 4 | `/api/Home/GetDurasiProsesMuat` | `durasiMuat` |
| 5 | `/api/Home/GetMonthlyOverview` | `monthlyComp` |
| 6 | `/api/Home/GetPlantLeaderboard` | `plantRanking`, `slaPerPlant`, `kuotaUtilization` |
| 7 | `/api/Home/GetTopDurasiTiket` | `durasiTickets` |
| 8 | `/api/Home/GetTopProdukVolume` | `topProduk` |
| 9 | `/api/Home/MonitorMapData` | passed as prop to `InteractiveLeafletMap` |

---

## Task 1: SSE API Route

**Files:**
- Create: `src/app/api/stream/dashboard/route.ts`

The route fetches all 9 endpoints in `Promise.all`, wraps raw responses in a named payload, and streams `data: <json>\n\n` every 30s. On client disconnect (`req.signal` abort), the interval clears.

- [ ] **Step 1: Create the SSE route file**

```typescript
// src/app/api/stream/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const STREAM_INTERVAL_MS = 30_000;

const VIEWER_ROLES = ["superadmin", "ti", "admin", "pod", "viewer", "adminarmada", "adminsumbu"];

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    VIEWER_ROLES.includes(r.toLowerCase())
  );
}

async function fetchAllDashboardData(token: string) {
  const safe = async (path: string, options?: RequestInit) => {
    try {
      const res = await aspnetFetchServer(path, token, options);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  };

  const [stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData] =
    await Promise.all([
      safe("/api/Home/MonitorStats"),
      safe("/api/Home/GetTiketTrendPerPlant"),
      safe("/api/Home/GetTiketTrendPerHour"),
      safe("/api/Home/GetDurasiProsesMuat"),
      safe("/api/Home/GetMonthlyOverview"),
      safe("/api/Home/GetPlantLeaderboard"),
      safe("/api/Home/GetTopDurasiTiket"),
      safe("/api/Home/GetTopProdukVolume"),
      safe("/api/Home/MonitorMapData"),
    ]);

  return { stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const payload = await fetchAllDashboardData(token);
          const line = `data: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(line));
        } catch {
          // silent — next tick will retry
        }
      };

      // Send immediately on connect
      await send();

      const interval = setInterval(send, STREAM_INTERVAL_MS);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Verify route reachable (manual test in browser)**

Open: `http://localhost:3000/api/stream/dashboard` while logged in.
Expected: browser shows streaming `data: {...}\n\n` lines appearing every 30s. No 401 error.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stream/dashboard/route.ts
git commit -m "feat: add SSE endpoint for viewer dashboard real-time streaming"
```

---

## Task 2: useDashboardStream Hook

**Files:**
- Create: `src/hooks/use-dashboard-stream.ts`

Hook opens `EventSource('/api/stream/dashboard')`, parses each message, updates all dashboard state vars, exposes `status: "connecting" | "live" | "error"`.

- [ ] **Step 1: Create the hook file**

```typescript
// src/hooks/use-dashboard-stream.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type StreamStatus = "connecting" | "live" | "error";

export interface DashboardStreamData {
  stats: any;
  trendPlant: any;
  trendHour: any;
  durasi: any;
  monthly: any;
  leaderboard: any;
  durasiTickets: any;
  topProduk: any;
  mapData: any;
}

interface UseDashboardStreamResult {
  data: DashboardStreamData | null;
  status: StreamStatus;
  lastUpdated: Date | null;
}

export function useDashboardStream(): UseDashboardStreamResult {
  const [data, setData] = useState<DashboardStreamData | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (esRef.current) {
        esRef.current.close();
      }

      setStatus("connecting");
      const es = new EventSource("/api/stream/dashboard");
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const parsed: DashboardStreamData = JSON.parse(event.data);
          setData(parsed);
          setStatus("live");
          setLastUpdated(new Date());
        } catch {
          // malformed payload — ignore this tick
        }
      };

      es.onerror = () => {
        setStatus("error");
        es.close();
        esRef.current = null;
        // Auto-reconnect after 5s
        retryTimeout = setTimeout(connect, 5_000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryTimeout);
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  return { data, status, lastUpdated };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `rtk tsc --noEmit`
Expected: no errors related to the new hook file.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-dashboard-stream.ts
git commit -m "feat: add useDashboardStream hook wrapping EventSource with auto-reconnect"
```

---

## Task 3: Update InteractiveLeafletMap to Accept External Data

**Files:**
- Modify: `src/components/dashboard/InteractiveLeafletMap.tsx` (lines 19-110)

Add `externalData?: PlantMarker[]` prop. When provided, skip the internal `fetchMarkers` call and use the prop directly. When prop changes, re-render markers.

- [ ] **Step 1: Add externalData prop to the interface and component signature**

In `InteractiveLeafletMap.tsx`, find the `function InteractiveLeafletMap()` declaration at line 42 and replace it:

```typescript
// BEFORE (line 42):
function InteractiveLeafletMap() {
  const { apiJson, token } = useApi();

// AFTER:
interface InteractiveLeafletMapProps {
  externalData?: PlantMarker[];
}

function InteractiveLeafletMap({ externalData }: InteractiveLeafletMapProps) {
  const { apiJson, token } = useApi();
```

- [ ] **Step 2: Make fetchMarkers conditional on externalData absence**

Find the `useEffect` at line 50 that calls `fetchMarkers`, and wrap the internal fetch with a condition:

```typescript
// BEFORE (lines 50-110):
useEffect(() => {
  fixLeafletIcon();

  const fetchMarkers = async () => {
    // ... full fetch logic ...
  };

  if (!token) return;
  fetchMarkers();
}, [apiJson, token]);

// AFTER:
useEffect(() => {
  fixLeafletIcon();

  if (externalData && externalData.length > 0) {
    setPlants(externalData);
    setIsSimulated(false);
    return;
  }

  const fetchMarkers = async () => {
    try {
      const resObj = await apiJson("/api/Home/MonitorMapData");

      if (resObj && resObj.Success && Array.isArray(resObj.data)) {
        const parsedPlants: PlantMarker[] = resObj.data.map((p: any) => {
          let cleanLat = p.lat || "0";
          let cleanLng = p.lng || "0";

          if (cleanLat.includes(",") && cleanLat.includes(".")) {
            cleanLat = cleanLat.replace(/,/g, "");
          } else if (cleanLat.includes(",")) {
            cleanLat = cleanLat.replace(/,/g, ".");
          }

          if (cleanLng.includes(",") && cleanLng.includes(".")) {
            cleanLng = cleanLng.replace(/,/g, "");
          } else if (cleanLng.includes(",")) {
            cleanLng = cleanLng.replace(/,/g, ".");
          }

          const phaseNum = p.antrian > 0 ? 1 : 2;

          return {
            name: p.name || p.company_code,
            lat: cleanLat,
            lng: cleanLng,
            address: `Antrian Aktif: ${p.antrian} Truk`,
            kodePlant: p.company_code || "UNKNOWN",
            phase: phaseNum,
          };
        });

        if (parsedPlants.length > 0) {
          setPlants(parsedPlants);
          setIsSimulated(false);
        } else {
          setPlants(FALLBACK_PLANTS);
          setIsSimulated(true);
        }
      } else {
        setPlants(FALLBACK_PLANTS);
        setIsSimulated(true);
      }
    } catch {
      setPlants(FALLBACK_PLANTS);
      setIsSimulated(true);
    }
  };

  if (!token) return;
  fetchMarkers();
}, [apiJson, token, externalData]);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `rtk tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/InteractiveLeafletMap.tsx
git commit -m "feat: InteractiveLeafletMap accepts externalData prop for SSE-driven map updates"
```

---

## Task 4: Wire ViewerDashboard to SSE + Live Indicator

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx`

Replace `useApi`, `loadDashboardData`, and `useEffect([token])` with `useDashboardStream()`. The hook returns raw backend responses — apply the same transform logic currently in `loadDashboardData` but inside a `useEffect([data])`. Add a live/offline badge in the header. Pass parsed `mapData` to `InteractiveLeafletMap`.

- [ ] **Step 1: Add useDashboardStream import and replace useApi**

At top of `ViewerDashboard.tsx`, find:
```typescript
import { useApi } from "@/hooks/use-api";
```
Replace with:
```typescript
import { useDashboardStream } from "@/hooks/use-dashboard-stream";
import type { StreamStatus } from "@/hooks/use-dashboard-stream";
```

- [ ] **Step 2: Replace state initialization and fetch logic**

Find the block starting at line 46:
```typescript
export default function ViewerDashboard() {
  const { apiJson, token } = useApi();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isSimulated, setIsSimulated] = useState(false);
```
Replace with:
```typescript
export default function ViewerDashboard() {
  const { data: streamData, status: streamStatus, lastUpdated: streamLastUpdated } = useDashboardStream();
  const [loading, setLoading] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);
  const [mapPlants, setMapPlants] = useState<any[]>([]);
```

- [ ] **Step 3: Replace loadDashboardData function with a useEffect that reacts to streamData**

Find and **delete** the entire `loadDashboardData` async function (lines 69–480). Replace it with:

```typescript
  // Transform raw SSE payload into component state every time stream delivers data
  useEffect(() => {
    if (!streamData) return;

    const { stats: statsRes, trendPlant: trendPlantRes, trendHour: trendHourRes,
            durasi: durasiRes, monthly: monthlyRes, leaderboard: leaderboardRes,
            durasiTickets: durasiTicketsRes, topProduk: topProdukRes, mapData: mapDataRes } = streamData;

    setLoading(false);

    // ── MonitorStats ──────────────────────────────────────────────────────────
    let finalStats = {
      total_antrian: 1205, total_tonase: 48900, avg_tiket_minutes: 42,
      durasi_terlama: 145, durasi_tercepat: 12, total_selesai: 980,
      tiket_cancelled: [
        { Alasan: "Armada Tidak Layak", Jumlah: 14 },
        { Alasan: "Overload Berat Muat", Jumlah: 9 },
        { Alasan: "Pembatalan Driver", Jumlah: 7 },
        { Alasan: "Kesalahan Dokumen", Jumlah: 5 },
      ]
    };
    let realDataFetched = false;
    if (statsRes?.Success && statsRes.totalTiket > 0) {
      finalStats = {
        total_antrian: statsRes.totalAntrian ?? 0,
        total_selesai: statsRes.totalSelesai ?? 0,
        total_tonase: statsRes.totalTonase ?? 0,
        avg_tiket_minutes: statsRes.avgDurasiMenit ?? 0,
        durasi_terlama: statsRes.durasiTerlama ?? 0,
        durasi_tercepat: statsRes.durasiTercepat ?? 0,
        tiket_cancelled: statsRes.totalCancel > 0
          ? [{ Alasan: "Dibatalkan / Kadaluwarsa", Jumlah: statsRes.totalCancel }]
          : []
      };
      realDataFetched = true;
    }
    setStats(finalStats);
    setIsSimulated(!realDataFetched);

    // ── Monthly Overview ──────────────────────────────────────────────────────
    if (monthlyRes?.status === "success" && monthlyRes.BulanIni?.TotalTiket > 0) {
      setMonthlyComp({
        BulanIniLabel: monthlyRes.BulanIniLabel,
        BulanLaluLabel: monthlyRes.BulanLaluLabel,
        BulanIni: monthlyRes.BulanIni,
        BulanLalu: monthlyRes.BulanLalu,
        TiketChange: monthlyRes.TiketChange,
        TonaseChange: monthlyRes.TonaseChange,
      });
    } else {
      setMonthlyComp({
        BulanIniLabel: "Mei 2026", BulanLaluLabel: "April 2026",
        BulanIni: { TotalTiket: 32540, TotalTonase: 1301600, TotalSelesai: 28900, TotalCancel: 640 },
        BulanLalu: { TotalTiket: 30120, TotalTonase: 1204800, TotalSelesai: 27200, TotalCancel: 710 },
        TiketChange: 8.0, TonaseChange: 8.3,
      });
    }

    // ── Top Produk ────────────────────────────────────────────────────────────
    if (topProdukRes?.status === "success" && Array.isArray(topProdukRes.data) && topProdukRes.data.length > 0) {
      setTopProduk(topProdukRes.data);
    } else {
      setTopProduk([
        { NamaProduk: "Urea Curah", TotalTonase: 546200 },
        { NamaProduk: "NPK Phonska", TotalTonase: 364100 },
        { NamaProduk: "ZA", TotalTonase: 195100 },
        { NamaProduk: "SP-36", TotalTonase: 130000 },
        { NamaProduk: "Pupuk Organik", TotalTonase: 65000 },
      ]);
    }

    // ── Leaderboard ───────────────────────────────────────────────────────────
    if (leaderboardRes?.status === "success" && Array.isArray(leaderboardRes.data) && leaderboardRes.data.length > 0) {
      setPlantRanking(leaderboardRes.data);
      setSlaPerPlant(leaderboardRes.data.map((item: any) => ({
        CompanyName: item.CompanyName,
        SlaCompliancePercent: item.SlaPercent,
        TotalSelesai: item.TotalSelesai,
        TotalDalamSla: Math.round((item.SlaPercent / 100) * item.TotalSelesai),
      })));
      setKuotaUtilization(leaderboardRes.data.slice(0, 5).map((item: any) => {
        const simulatedKuota = Math.max(5000, Math.round((item.TotalTonase * 1.2) / 1000) * 1000);
        const percent = simulatedKuota > 0 ? Math.round((item.TotalTonase / simulatedKuota) * 100) : 0;
        return {
          CompanyCode: item.CompanyCode,
          UtilizationPercent: percent > 100 ? 100 : percent,
          TotalRealisasi: Math.round(item.TotalTonase),
          TotalKuota: simulatedKuota,
        };
      }));
    } else {
      setSlaPerPlant([
        { CompanyName: "DC Makassar", SlaCompliancePercent: 92, TotalSelesai: 1540, TotalDalamSla: 1416 },
        { CompanyName: "Petrokimia Gresik (PKG)", SlaCompliancePercent: 88, TotalSelesai: 4850, TotalDalamSla: 4268 },
        { CompanyName: "Pupuk Kujang (PKC)", SlaCompliancePercent: 81, TotalSelesai: 2980, TotalDalamSla: 2413 },
        { CompanyName: "Logistics Meneng", SlaCompliancePercent: 75, TotalSelesai: 1820, TotalDalamSla: 1365 },
        { CompanyName: "Pupuk Iskandar Muda (PIM)", SlaCompliancePercent: 68, TotalSelesai: 2150, TotalDalamSla: 1462 },
        { CompanyName: "UPP Semarang", SlaCompliancePercent: 64, TotalSelesai: 1100, TotalDalamSla: 704 },
      ]);
      setKuotaUtilization([
        { CompanyCode: "PKG", UtilizationPercent: 89, TotalRealisasi: 8900, TotalKuota: 10000 },
        { CompanyCode: "LOG4MENENG", UtilizationPercent: 82, TotalRealisasi: 4100, TotalKuota: 5000 },
        { CompanyCode: "PKC", UtilizationPercent: 76, TotalRealisasi: 5700, TotalKuota: 7500 },
        { CompanyCode: "PIM", UtilizationPercent: 54, TotalRealisasi: 3240, TotalKuota: 6000 },
        { CompanyCode: "D243", UtilizationPercent: 45, TotalRealisasi: 1800, TotalKuota: 4000 },
      ]);
      setPlantRanking([
        { Rank: 1, CompanyName: "DC Makassar", TotalTiket: 1540, TotalTonase: 61600, AvgDurasi: 32, SlaPercent: 92, CancelRate: 0.8, Score: 92.5 },
        { Rank: 2, CompanyName: "Petrokimia Gresik (PKG)", TotalTiket: 4850, TotalTonase: 194000, AvgDurasi: 38, SlaPercent: 88, CancelRate: 1.2, Score: 89.8 },
        { Rank: 3, CompanyName: "Pupuk Kujang Cikampek (PKC)", TotalTiket: 2980, TotalTonase: 119200, AvgDurasi: 45, SlaPercent: 81, CancelRate: 1.6, Score: 84.2 },
        { Rank: 4, CompanyName: "UPP Meneng Banyuwangi", TotalTiket: 1820, TotalTonase: 72800, AvgDurasi: 41, SlaPercent: 75, CancelRate: 2.3, Score: 78.4 },
        { Rank: 5, CompanyName: "Pupuk Iskandar Muda (PIM)", TotalTiket: 2150, TotalTonase: 86000, AvgDurasi: 52, SlaPercent: 68, CancelRate: 2.8, Score: 71.9 },
        { Rank: 6, CompanyName: "UPP Semarang", TotalTiket: 1100, TotalTonase: 44000, AvgDurasi: 48, SlaPercent: 64, CancelRate: 3.5, Score: 65.1 },
      ]);
    }

    // ── Trend Per Plant ───────────────────────────────────────────────────────
    if (trendPlantRes?.status === "success" && Array.isArray(trendPlantRes.data) && trendPlantRes.data.length > 0) {
      const raw = trendPlantRes.data;
      const uniqueDates: string[] = Array.from(new Set(raw.map((item: any) => item.Tanggal))).sort();
      const formattedDates = uniqueDates.map((d: string) =>
        new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      );
      const plants: string[] = Array.from(new Set(raw.map((item: any) => item.CompanyName || item.CompanyCode)));
      const series = plants.map((plant: string) => ({
        name: plant,
        data: uniqueDates.map((dateStr: string) => {
          const entry = raw.find((item: any) => (item.CompanyName || item.CompanyCode) === plant && item.Tanggal === dateStr);
          return entry ? (entry.TotalTiket || 0) : 0;
        }),
      }));
      setTrendPerPlant({ dates: formattedDates, series });
    }

    // ── Trend Per Hour ────────────────────────────────────────────────────────
    if (trendHourRes?.status === "success" && Array.isArray(trendHourRes.data) && trendHourRes.data.length > 0) {
      const raw = trendHourRes.data;
      const hours: string[] = Array.from(new Set(raw.map((item: any) => `${item.Jam}:00`))).sort();
      const plants: string[] = Array.from(new Set(raw.map((item: any) => item.CompanyName || item.CompanyCode)));
      const series = plants.map((plant: string) => ({
        name: plant,
        data: hours.map((h: string) => {
          const hour = parseInt(h);
          const entry = raw.find((item: any) => (item.CompanyName || item.CompanyCode) === plant && item.Jam === hour);
          return entry ? (entry.TotalTiket || 0) : 0;
        }),
      }));
      setTrendPerHour({ hours, series });
    }

    // ── Durasi Muat ───────────────────────────────────────────────────────────
    if (durasiRes?.status === "success" && Array.isArray(durasiRes.data) && durasiRes.data.length > 0) {
      setDurasiMuat({
        companies: durasiRes.data.map((item: any) => item.CompanyName || item.CompanyCode),
        avgDurasi: durasiRes.data.map((item: any) => Math.round(item.AvgDurasiMenit || 0)),
      });
    }

    // ── Top Durasi Tickets ────────────────────────────────────────────────────
    if (durasiTicketsRes?.status === "success" && Array.isArray(durasiTicketsRes.longest) && durasiTicketsRes.longest.length > 0) {
      setDurasiTickets({ longest: durasiTicketsRes.longest, fastest: durasiTicketsRes.fastest || [] });
    }

    // ── Static simulated data (no real API) ──────────────────────────────────
    setThroughputShift({
      dates: ["12 Mei", "13 Mei", "14 Mei", "15 Mei", "16 Mei", "17 Mei", "18 Mei"],
      shift1: [4200, 4800, 4500, 5100, 4900, 4400, 5200],
      shift2: [3800, 4100, 3900, 4600, 4300, 3900, 4500],
      shift3: [2400, 2800, 2600, 3100, 2950, 2500, 3200],
    });
    setCancelTrend({
      dates: ["12 Mei", "13 Mei", "14 Mei", "15 Mei", "16 Mei", "17 Mei", "18 Mei"],
      series: [
        { name: "Petrokimia Gresik (PKG)", data: [1.2, 1.5, 1.1, 1.4, 1.2, 1.3, 1.2] },
        { name: "Pupuk Kujang (PKC)", data: [1.8, 2.1, 1.7, 1.9, 1.6, 1.5, 1.6] },
        { name: "Pupuk Iskandar Muda (PIM)", data: [2.5, 3.0, 2.8, 3.2, 2.7, 2.9, 2.8] },
      ],
    });

    // ── Map Data ──────────────────────────────────────────────────────────────
    if (mapDataRes?.Success && Array.isArray(mapDataRes.data) && mapDataRes.data.length > 0) {
      const parsedMap = mapDataRes.data.map((p: any) => {
        let cleanLat = (p.lat || "0").toString();
        let cleanLng = (p.lng || "0").toString();
        if (cleanLat.includes(",") && cleanLat.includes(".")) cleanLat = cleanLat.replace(/,/g, "");
        else if (cleanLat.includes(",")) cleanLat = cleanLat.replace(/,/g, ".");
        if (cleanLng.includes(",") && cleanLng.includes(".")) cleanLng = cleanLng.replace(/,/g, "");
        else if (cleanLng.includes(",")) cleanLng = cleanLng.replace(/,/g, ".");
        return {
          name: p.name || p.company_code,
          lat: cleanLat,
          lng: cleanLng,
          address: `Antrian Aktif: ${p.antrian} Truk`,
          kodePlant: p.company_code || "UNKNOWN",
          phase: p.antrian > 0 ? 1 : 2,
        };
      });
      setMapPlants(parsedMap);
    }
  }, [streamData]);
```

- [ ] **Step 4: Remove old useEffect([token]) trigger**

Find and **delete** this block (was at line 482-485):
```typescript
  useEffect(() => {
    if (!token) return;
    loadDashboardData();
  }, [token]);
```
It no longer exists — the `useEffect([streamData])` above replaces it.

- [ ] **Step 5: Add live indicator to dashboard header**

Find the header section in the JSX that shows "Konfigurasi Armada Percepatan" or the dashboard title. It will be the first `<div>` in the return block. Add a live status badge:

```tsx
{/* Add this right after the dashboard title/description in the header area */}
<div className="flex items-center gap-2">
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
      streamStatus === "live"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
        : streamStatus === "error"
        ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
        : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        streamStatus === "live"
          ? "bg-emerald-500 animate-pulse"
          : streamStatus === "error"
          ? "bg-red-500"
          : "bg-gray-400 animate-pulse"
      }`}
    />
    {streamStatus === "live" ? "Live" : streamStatus === "error" ? "Offline" : "Connecting..."}
  </span>
  {streamLastUpdated && (
    <span className="text-xs text-gray-400">
      Update: {streamLastUpdated.toLocaleTimeString("id-ID")}
    </span>
  )}
</div>
```

- [ ] **Step 6: Pass mapPlants to InteractiveLeafletMap**

Find the `<InteractiveLeafletMap />` usage in the JSX and add the prop:
```tsx
// BEFORE:
<InteractiveLeafletMap />

// AFTER:
<InteractiveLeafletMap externalData={mapPlants.length > 0 ? mapPlants : undefined} />
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `rtk tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 8: Test in browser**

1. Open `http://localhost:3000` as viewer user
2. Check header shows "● Connecting..." then "● Live"
3. Check "Update: HH:MM:SS" timestamp appears
4. Wait 30s — timestamp should update
5. Open DevTools → Network → filter "stream" — should see one persistent SSE connection
6. Open DevTools → EventStream tab — should see `data:` events every 30s

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/ViewerDashboard.tsx
git commit -m "feat: wire ViewerDashboard to SSE stream — live refresh every 30s with live indicator"
```

---

## Self-Review

**Spec coverage:**
- ✅ Real-time data via SSE (not polling from client)
- ✅ All 9 endpoints streamed (8 dashboard + 1 map)
- ✅ Map updates live via `externalData` prop
- ✅ Auto-reconnect on connection loss
- ✅ Live/Offline/Connecting indicator
- ✅ Last updated timestamp
- ✅ No C# ASP.NET changes required
- ✅ Auth via session cookie (no EventSource header limitation issue)

**Placeholder scan:** None found — all code blocks complete.

**Type consistency:**
- `DashboardStreamData` fields match keys used in `useDashboardStream` and `ViewerDashboard` `useEffect([streamData])`
- `PlantMarker` interface in `InteractiveLeafletMap` unchanged — `externalData?: PlantMarker[]` uses same type
- `StreamStatus` exported and imported correctly
