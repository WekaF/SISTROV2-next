# Fix Loading Bays Client-Side Fetch (Company Switch Data Update)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix loading bays data not updating on company switch by migrating the fetch to client-side `useApi().apiTable()` — same proven pattern as GudangDashboard.

**Architecture:** Both pages currently call `fetch("/api/dashboard/loading-bays")` — a server-side Next.js proxy that reads the ASP.NET token from `getServerSession()`. There is a race window between `updateSession()` completing client-side and `getServerSession()` seeing the updated cookie. GudangDashboard avoids this entirely by calling `apiTable("/api/Tiket/DataTableFilterLegacy", ...)` directly client-side via `useApi()`, which uses `CompanyContext.aspnetToken` — updated before `activeCompanyCode` ever changes. Migrate both pages to this proven pattern.

**Tech Stack:** Next.js 16, `useApi().apiTable()`, `CompanyContext`, `/api/Tiket/DataTableFilterLegacy` (ASP.NET endpoint, form-encoded POST).

---

## File Map

| File | Change |
|---|---|
| `src/app/antrian/live-monitoring/page.tsx` | Replace `fetch("/api/dashboard/loading-bays")` with two `apiTable()` calls (positions "03" + "02") using `useApi()` |
| `src/components/dashboard/ViewerDashboard.tsx` | Same replacement |
| `src/app/api/dashboard/loading-bays/route.ts` | No change — leave intact (may be used by other consumers) |

---

## Reference: Proven Pattern (GudangDashboard)

`src/components/dashboard/GudangDashboard.tsx` lines 70-84 — this works correctly after company switch:

```typescript
const result = await apiTable("/api/Tiket/DataTableFilterLegacy", {
  draw: params.draw,
  start: params.start,
  length: params.length,
  search: { value: params.search },
  companyCode: activeCompanyCode ?? undefined,
  position,                        // "02", "03", etc.
  order: [{ column: 0, dir: "desc" }],
  columns: [
    { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
    { data: "nopol",     name: "nopol",     searchable: true, orderable: true },
    { data: "driver",    name: "driver",    searchable: true, orderable: true },
    { data: "produkString", name: "idproduk", searchable: true, orderable: true },
  ]
});
// result.data = array of ticket rows
```

`apiTable` sends form-encoded (x-www-form-urlencoded), uses token from `CompanyContext.aspnetToken`.

Our pages need a slightly extended column list to get `posto`, `transportString`, `qty`, `tiketno`:
```typescript
columns: [
  { data: "bookingno",       name: "bookingno",   searchable: false, orderable: true  },
  { data: "nopol",           name: "nopol",       searchable: false, orderable: false },
  { data: "driver",          name: "driver",      searchable: false, orderable: false },
  { data: "produkString",    name: "idproduk",    searchable: false, orderable: false },
  { data: "transportString", name: "idtransport", searchable: false, orderable: false },
  { data: "qty",             name: "qty",         searchable: false, orderable: false },
  { data: "posto",           name: "posto",       searchable: false, orderable: false },
  { data: "tiketno",         name: "tiketno",     searchable: false, orderable: false },
]
```

---

## Task 1: Migrate live-monitoring page to client-side fetch

**Files:**
- Modify: `src/app/antrian/live-monitoring/page.tsx`

The current `fetchBays` function does:
```typescript
const res = await fetch(`/api/dashboard/loading-bays${qs}`);
const json = await res.json();
setRealBays(Array.isArray(json.bays) ? json.bays : []);
setRealQueue(Array.isArray(json.queue) ? json.queue : []);
```

Replace with two parallel `apiTable()` calls.

- [ ] **Step 1: Read the current file**

```
Read src/app/antrian/live-monitoring/page.tsx
```

Confirm:
- `useApi` is already imported (it was added back in a previous fix)
- `const { apiJson } = useApi();` or similar exists
- The fetch effect with `fetch("/api/dashboard/loading-bays")` is at approximately line 50-78
- `activeCompanyCode` comes from `useCompany()`

- [ ] **Step 2: Update useApi destructure**

Find the `const { apiJson } = useApi();` line. Change it to:
```tsx
const { apiTable } = useApi();
```

(Keep `apiJson` if it's still used for the company list fetch — if so, destructure both: `const { apiJson, apiTable } = useApi();`)

- [ ] **Step 3: Replace the fetchBays implementation**

Find the `fetchBays` async function inside the useEffect. Replace the entire function body (from `setBaysLoading(true)` to the finally block) with:

```typescript
const fetchBays = async () => {
  setBaysLoading(true);
  try {
    const BASE_COLUMNS = [
      { data: "bookingno",       name: "bookingno",   searchable: false, orderable: true  },
      { data: "nopol",           name: "nopol",       searchable: false, orderable: false },
      { data: "driver",          name: "driver",      searchable: false, orderable: false },
      { data: "produkString",    name: "idproduk",    searchable: false, orderable: false },
      { data: "transportString", name: "idtransport", searchable: false, orderable: false },
      { data: "qty",             name: "qty",         searchable: false, orderable: false },
      { data: "posto",           name: "posto",       searchable: false, orderable: false },
      { data: "tiketno",         name: "tiketno",     searchable: false, orderable: false },
    ];
    const basePayload = {
      draw: 1,
      start: 0,
      search: { value: "" },
      order: [{ column: 0, dir: "desc" }],
      columns: BASE_COLUMNS,
      ...(activeCompanyCode ? { companyCode: activeCompanyCode } : {}),
    };
    const [baysResult, queueResult] = await Promise.all([
      apiTable<{ data: any[] }>("/api/Tiket/DataTableFilterLegacy", { ...basePayload, length: 20, position: "03" }),
      apiTable<{ data: any[] }>("/api/Tiket/DataTableFilterLegacy", { ...basePayload, length: 10, position: "02" }),
    ]);
    if (!cancelled) {
      setRealBays(Array.isArray(baysResult?.data) ? baysResult.data : []);
      setRealQueue(Array.isArray(queueResult?.data) ? queueResult.data : []);
    }
  } catch (err) {
    console.error("[live-monitoring] fetch error:", err);
  } finally {
    if (!cancelled) setBaysLoading(false);
  }
};
```

Note: `BASE_COLUMNS` defined inside `fetchBays` is fine here — it's a constant evaluated once per call. `cancelled` is already in scope from the outer `useEffect` closure.

- [ ] **Step 4: Add `apiTable` to the dep array**

The effect dep array is currently `[activeCompanyCode]`. `apiTable` comes from `useCallback` inside `useApi()` — it's stable (won't cause infinite loops) but add it to be correct:
```typescript
}, [activeCompanyCode, apiTable]);
```

- [ ] **Step 5: Build check**

```powershell
cd c:\Users\weka\Indigo\SISTROV2-next && npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/antrian/live-monitoring/page.tsx
git commit -m "fix: migrate live-monitoring bay fetch to client-side apiTable (fixes company switch)"
```

---

## Task 2: Migrate ViewerDashboard to client-side fetch

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx`

Same change as Task 1 but in ViewerDashboard. The current fetch effect is at approximately lines 175-190.

- [ ] **Step 1: Read the current fetch effect**

```
Read src/components/dashboard/ViewerDashboard.tsx lines 150-200
```

Confirm the `fetchBays` function and current `useApi` destructure.

- [ ] **Step 2: Update useApi destructure**

Find where `useApi()` is destructured. Add `apiTable` to it:
```tsx
const { apiJson, apiTable } = useApi();
```

(Keep `apiJson` — it's still used for the dock companies list fetch.)

- [ ] **Step 3: Replace fetchBays implementation**

Find the `fetchBays` async function in the useEffect. Replace with the same implementation as Task 1:

```typescript
const fetchBays = async () => {
  setBaysLoading(true);
  try {
    const BASE_COLUMNS = [
      { data: "bookingno",       name: "bookingno",   searchable: false, orderable: true  },
      { data: "nopol",           name: "nopol",       searchable: false, orderable: false },
      { data: "driver",          name: "driver",      searchable: false, orderable: false },
      { data: "produkString",    name: "idproduk",    searchable: false, orderable: false },
      { data: "transportString", name: "idtransport", searchable: false, orderable: false },
      { data: "qty",             name: "qty",         searchable: false, orderable: false },
      { data: "posto",           name: "posto",       searchable: false, orderable: false },
      { data: "tiketno",         name: "tiketno",     searchable: false, orderable: false },
    ];
    const basePayload = {
      draw: 1,
      start: 0,
      search: { value: "" },
      order: [{ column: 0, dir: "desc" }],
      columns: BASE_COLUMNS,
      ...(activeCompanyCode ? { companyCode: activeCompanyCode } : {}),
    };
    const [baysResult, queueResult] = await Promise.all([
      apiTable<{ data: any[] }>("/api/Tiket/DataTableFilterLegacy", { ...basePayload, length: 20, position: "03" }),
      apiTable<{ data: any[] }>("/api/Tiket/DataTableFilterLegacy", { ...basePayload, length: 10, position: "02" }),
    ]);
    if (!cancelled) {
      setRealBays(Array.isArray(baysResult?.data) ? baysResult.data : []);
      setRealQueue(Array.isArray(queueResult?.data) ? queueResult.data : []);
    }
  } catch (err) {
    console.error("[loading-bays] fetch error:", err);
  } finally {
    if (!cancelled) setBaysLoading(false);
  }
};
```

- [ ] **Step 4: Update dep array**

```typescript
}, [activeCompanyCode, apiTable]);
```

- [ ] **Step 5: Build check**

```powershell
cd c:\Users\weka\Indigo\SISTROV2-next && npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ViewerDashboard.tsx
git commit -m "fix: migrate ViewerDashboard bay fetch to client-side apiTable (fixes company switch)"
```

---

## Self-Review

**Spec coverage:**
- ✅ live-monitoring page uses client-side `apiTable()` for bay + queue fetch
- ✅ ViewerDashboard uses client-side `apiTable()` for bay + queue fetch
- ✅ Both use `activeCompanyCode` from context — updates after token is already fresh
- ✅ `BASE_COLUMNS` same as old server-side route (posto, transportString, qty, tiketno all included)
- ✅ `cancelled` flag preserved (prevents stale state after unmount/dep change)
- ✅ `apiTable` in dep array (stable `useCallback`, no infinite loop)
- ✅ `/api/dashboard/loading-bays` route untouched

**Placeholder scan:** None.

**Type consistency:** `apiTable<{ data: any[] }>` — consistent with GudangDashboard pattern. `baysResult?.data` and `queueResult?.data` accessed safely.

**Why this is correct:**
- `CompanyContext.switchCompany()` calls `setActiveAspnetToken(newToken)` BEFORE `setActiveCompanyCode(code)`
- `useApi().apiTable()` reads token from `CompanyContext.aspnetToken` — already the new token when effect re-runs
- No server-side session cookie race condition
- Same mechanism GudangDashboard uses — proven to work
