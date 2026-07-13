# Loading Bays Card – Real Booking & Posto Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded fake `bookingno` and `noposto` in the "Live Monitor Pintu Pemuatan (Loading Bays) & Antrean Gudang" card in `ViewerDashboard.tsx` with real data from the SISTRO ticket API.

**Architecture:** Create a new Next.js API route `/api/dashboard/loading-bays` that proxies two POST calls to the ASP.NET `DataTableFilterLegacy` endpoint — one for position "03" (Sedang Dimuat / active bays) and one for position "02" (Antrean Gudang / queue). The ViewerDashboard fetches from this route whenever `selectedDockPlant` changes, polling every 30 s.

**Tech Stack:** Next.js App Router, `aspnetFetchServer`, React state + `useEffect`, TypeScript

---

## Background

`src/components/dashboard/ViewerDashboard.tsx` contains a card (line 1243–1442) titled **"Live Monitor Pintu Pemuatan (Loading Bays) & Antrean Gudang"**. It uses two hardcoded functions:

- `getBaysForPlant()` (line 77–116) — returns fake `LoadingBay[]` with invented `bookingno` values like `"SISTRO_2026_09102"` and fake `noposto` values like `"P10023491"`.
- `getQueueForPlant()` (line 119–141) — returns fake queue trucks with no booking/posto info at all.

**Real data source:**

The ASP.NET backend exposes `/api/Tiket/DataTableFilterLegacy` (POST) — already used in `GudangDashboard.tsx` (line 69–94). Each returned ticket row has:

| Field | Meaning |
|---|---|
| `bookingno` | SISTRO booking code (what the card should display as "Kode Booking") |
| `posto` | The `noposto` value from the `Posto` table (FK: `Tiket.posto = Posto.noposto`) |
| `nopol` | Truck plate number |
| `driver` | Driver name |
| `produkString` | Product name |
| `transportString` | Transporter name |
| `qty` | Quantity (tons) |
| `position` | `"03"` = Sedang Dimuat, `"02"` = Antrean Gudang |

**Physical bays vs. positions:** SISTRO does not track which physical bay slot a truck occupies. The existing card shows "Bay 01/02/03…" labels which are simulated. Real bays are just trucks at position "03" — we index them as Bay 01, Bay 02, etc. The `baseProgress` animation stays simulated (no real-time per-truck progress in the ticket system). Only `bookingno` and `noposto` (the fields the user asked about) are swapped to real values.

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| **Create** | `src/app/api/dashboard/loading-bays/route.ts` | Next.js GET route — auth, proxy two ASP.NET calls, return `{ bays, queue }` |
| **Modify** | `src/components/dashboard/ViewerDashboard.tsx` | Add real-data state + fetch; replace `getBaysForPlant()` / `getQueueForPlant()` calls |

---

## Task 1: Create the API route

**Files:**
- Create: `src/app/api/dashboard/loading-bays/route.ts`

- [ ] **Step 1: Create the file with auth + proxy logic**

```typescript
// src/app/api/dashboard/loading-bays/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const ALLOWED = new Set([
  "superadmin", "ti", "admin", "pod", "viewer", "adminarmada", "adminsumbu"
]);

function isAuthorized(session: any): boolean {
  const roles: string[] = (session?.user as any)?.roles ?? [];
  return !!session?.user && roles.some((r) => ALLOWED.has(r.toLowerCase()));
}

const BASE_COLUMNS = [
  { data: "bookingno",      name: "bookingno",    searchable: false, orderable: true },
  { data: "nopol",          name: "nopol",        searchable: false, orderable: false },
  { data: "driver",         name: "driver",       searchable: false, orderable: false },
  { data: "produkString",   name: "idproduk",     searchable: false, orderable: false },
  { data: "transportString",name: "idtransport",  searchable: false, orderable: false },
  { data: "qty",            name: "qty",          searchable: false, orderable: false },
  { data: "posto",          name: "posto",        searchable: false, orderable: false },
  { data: "tiketno",        name: "tiketno",      searchable: false, orderable: false },
];

async function fetchTicketsByPosition(
  token: string,
  companyCode: string | null,
  position: string,
  length: number
) {
  const body: any = {
    draw: 1,
    start: 0,
    length,
    search: { value: "" },
    position,
    order: [{ column: 0, dir: "desc" }],
    columns: BASE_COLUMNS,
  };
  if (companyCode) body.companyCode = companyCode;

  const res = await aspnetFetchServer("/api/Tiket/DataTableFilterLegacy", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const companyCode = searchParams.get("companyCode");

  try {
    const [bays, queue] = await Promise.all([
      fetchTicketsByPosition(token, companyCode, "03", 20),
      fetchTicketsByPosition(token, companyCode, "02", 10),
    ]);
    return NextResponse.json({ bays, queue });
  } catch (err) {
    console.error("[loading-bays] fetch error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the file is created at the correct path**

Run:
```powershell
Test-Path "src\app\api\dashboard\loading-bays\route.ts"
```
Expected: `True`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/loading-bays/route.ts
git commit -m "feat: add /api/dashboard/loading-bays route for real bay + queue data"
```

---

## Task 2: Modify ViewerDashboard to consume real data

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx`

The changes are isolated to two regions:
1. **State + fetch effect** — add after existing `useState` declarations (around line 186)
2. **Replace render calls** — replace `getBaysForPlant(...)` and `getQueueForPlant(...)` in the JSX with real-data arrays

- [ ] **Step 1: Add types + state for real bay/queue data**

Add this block immediately after the existing `useState` declarations near line 182 (after `const [companies, setCompanies] = ...`):

```typescript
// Real loading-bay data from /api/dashboard/loading-bays
interface RealBay {
  bookingno: string;
  tiketno?: string;
  nopol: string;
  driver: string;
  produkString: string;
  transportString: string;
  qty: number;
  posto: string; // this IS the noposto
}
const [realBays, setRealBays] = useState<RealBay[]>([]);
const [realQueue, setRealQueue] = useState<RealBay[]>([]);
const [baysLoading, setBaysLoading] = useState(false);
```

- [ ] **Step 2: Add fetch effect for loading bays**

Add this `useEffect` block after the `companies` fetch effect (around line 209, after the `apiJson` fetch for companies closes):

```typescript
useEffect(() => {
  let cancelled = false;

  const fetchBays = async () => {
    setBaysLoading(true);
    try {
      const qs = selectedDockPlant ? `?companyCode=${encodeURIComponent(selectedDockPlant)}` : "";
      const res = await fetch(`/api/dashboard/loading-bays${qs}`);
      if (!res.ok || cancelled) return;
      const json = await res.json();
      if (!cancelled) {
        setRealBays(Array.isArray(json.bays) ? json.bays : []);
        setRealQueue(Array.isArray(json.queue) ? json.queue : []);
      }
    } catch {
      // silently fall through — baysLoading resets below
    } finally {
      if (!cancelled) setBaysLoading(false);
    }
  };

  fetchBays();
  const id = setInterval(fetchBays, 30_000);
  return () => { cancelled = true; clearInterval(id); };
}, [selectedDockPlant]);
```

- [ ] **Step 3: Replace `getBaysForPlant()` call in summary strip (line 1278)**

Find (lines 1278):
```typescript
{getBaysForPlant(selectedDockPlant, companies).filter((b) => b.status === "loading").length} / {getBaysForPlant(selectedDockPlant, companies).length} Pintu Terisi
```

Replace with:
```typescript
{realBays.length} / {realBays.length} Pintu Terisi
```

- [ ] **Step 4: Replace `getQueueForPlant()` count in summary strip (line 1300)**

Find (line 1300):
```typescript
{getQueueForPlant(selectedDockPlant).length} Truk Mengantre
```

Replace with:
```typescript
{realQueue.length} Truk Mengantre
```

- [ ] **Step 5: Replace the bays grid map (line 1308)**

Find (line 1308):
```typescript
{getBaysForPlant(selectedDockPlant, companies).map((bay) => {
  const isOccupied = bay.status === "loading";
  const currentProgress = isOccupied ? Math.min(100, Math.max(0, (bay.baseProgress + dockProgressOffset) % 100)) : 0;
  const currentDuration = isOccupied ? Math.round(bay.durationMinutes + (dockProgressOffset * 0.2)) : 0;
  const isProgressNearlyDone = currentProgress > 85;

  return (
    <div
      key={bay.id}
```

Replace with:
```typescript
{baysLoading && realBays.length === 0 ? (
  <div className="col-span-full text-center py-10 text-gray-400 text-sm">Memuat data loading bay...</div>
) : realBays.length === 0 ? (
  <div className="col-span-full text-center py-10 text-gray-400 text-sm">Tidak ada truk sedang dimuat untuk plant ini.</div>
) : null}
{realBays.map((bay, idx) => {
  const isOccupied = true;
  // ponytail: progress is simulated — no real per-truck % in SISTRO ticket data
  const seed = (bay.bookingno?.length ?? 5) * 7 + idx * 13;
  const currentProgress = Math.min(100, Math.max(5, (seed + dockProgressOffset) % 100));
  const currentDuration = Math.round(10 + (seed % 40) + dockProgressOffset * 0.2);
  const isProgressNearlyDone = currentProgress > 85;

  const fakeBay: LoadingBay = {
    id: idx + 1,
    bay: `Bay ${String(idx + 1).padStart(2, "0")}`,
    status: "loading",
    nopol: bay.nopol,
    driver: bay.driver,
    product: bay.produkString,
    baseProgress: seed % 100,
    durationMinutes: 10 + (seed % 40),
    warehouseName: bay.produkString,
    queueNumber: idx + 1,
    bookingno: bay.bookingno,
    noposto: bay.posto,        // Tiket.posto === Posto.noposto
    transportir: bay.transportString,
  };
  const bay2 = fakeBay;

  return (
    <div
      key={bay2.id}
```

> **Note:** The rest of the bay card JSX (lines 1317–1411) refers to `bay` by name. After the replacement, the variable `bay` is replaced by `bay2`. Continue reading the original JSX and replace all `bay.` references below with `bay2.`.

- [ ] **Step 6: Replace `bay.` variable references inside the bay card JSX**

Inside the newly mapped block (lines 1317–1411 in the original), replace each `bay.` with `bay2.` for: `bay.warehouseName`, `bay.status`, `bay.queueNumber`, `bay.nopol`, `bay.driver`, `bay.product`, `bay.bay`, `bay.bookingno`, `bay.noposto`, `bay.transportir`, `bay.id`.

Also replace `isOccupied`, `currentProgress`, `currentDuration`, `isProgressNearlyDone` references — these are already declared in the new mapping lambda above. No change needed for those.

The closing of the old `getBaysForPlant(...).map((bay) => {` lambda was `})}`. Change the closing to close the new `realBays.map((bay, idx) => {` lambda instead:
```
      );
    })}
```
→ stays the same, just now closes the `realBays.map` lambda.

- [ ] **Step 7: Replace the queue strip map (line 1421)**

Find (line 1421):
```typescript
{getQueueForPlant(selectedDockPlant).map((q, idx) => (
  <div key={idx} className="bg-gray-50/60 dark:bg-white/[0.01] border border-gray-150 dark:border-gray-800 p-3 rounded-xl min-w-[200px] flex items-center justify-between gap-3 shrink-0">
    <div className="flex items-center gap-2.5">
      <div className="p-2 bg-brand-50/50 dark:bg-brand-950/20 text-brand-500 rounded-lg text-xs font-black">
        #{idx + 1}
      </div>
      <div>
        <span className="text-xs font-black text-gray-800 dark:text-white block">{q.nopol}</span>
        <span className="text-[9px] text-gray-400 block mt-0.5">{q.driver} • {q.product}</span>
      </div>
    </div>
    <div className="text-right">
      <span className="text-[9px] bg-brand-100/50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 px-2 py-0.5 rounded-md font-bold">
        ETA: {q.eta}
      </span>
    </div>
  </div>
))}
```

Replace with:
```typescript
{realQueue.length === 0 ? (
  <div className="text-xs text-gray-400 py-3">Tidak ada truk menunggu di antrean.</div>
) : realQueue.map((q, idx) => (
  <div key={idx} className="bg-gray-50/60 dark:bg-white/[0.01] border border-gray-150 dark:border-gray-800 p-3 rounded-xl min-w-[200px] flex items-center justify-between gap-3 shrink-0">
    <div className="flex items-center gap-2.5">
      <div className="p-2 bg-brand-50/50 dark:bg-brand-950/20 text-brand-500 rounded-lg text-xs font-black">
        #{idx + 1}
      </div>
      <div>
        <span className="text-xs font-black text-gray-800 dark:text-white block">{q.nopol}</span>
        <span className="text-[9px] text-gray-400 block mt-0.5">{q.driver} • {q.produkString}</span>
      </div>
    </div>
    <div className="text-right flex flex-col gap-0.5 items-end">
      <span className="text-[9px] font-mono font-bold text-gray-600 dark:text-gray-300">{q.bookingno}</span>
      <span className="text-[9px] text-gray-400 font-mono">{q.posto}</span>
    </div>
  </div>
))}
```

- [ ] **Step 8: Verify TypeScript compiles without errors**

```powershell
rtk tsc
```

Expected: zero errors. If `LoadingBay` is complained about for `fakeBay` construction, verify the `LoadingBay` interface at lines 61–75 has matching fields (`id`, `bay`, `status`, `nopol`, `driver`, `product`, `baseProgress`, `durationMinutes`, `warehouseName`, `queueNumber`, `bookingno`, `noposto`, `transportir`).

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/ViewerDashboard.tsx
git commit -m "fix: loading bays card uses real bookingno + noposto from SISTRO ticket API"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| `bookingno` from real SISTRO booking code | Task 2 Step 5 — `bookingno: bay.bookingno` |
| `noposto` from real posto number | Task 2 Step 5 — `noposto: bay.posto` (Tiket.posto IS noposto) |
| Card still renders when no data | Task 2 Step 5 — empty state messages |
| Queue strip shows real booking + posto | Task 2 Step 7 — `{q.bookingno}` + `{q.posto}` |

### Known simplifications

- Progress bar remains simulated (`ponytail:` comment added). SISTRO ticket API has `timemuat`/`timegudang` timestamps but calculating per-bay % is complex and not requested.
- The card shows trucks at position "03" as bays, labelled Bay 01/02/etc. Physical bay assignment is not tracked in SISTRO.
- Empty-state fallback shown when `realBays.length === 0` — the old `getBaysForPlant` static fallback is removed.

### No placeholders

No TBD/TODO/fill-in-later in above steps.
