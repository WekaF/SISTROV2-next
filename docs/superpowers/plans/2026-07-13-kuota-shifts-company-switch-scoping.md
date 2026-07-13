# Kuota Per Shift — Scope to Active Company & Fix Switch-Company Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Kuota Per Shift" page (`/kuota/shifts`) show data scoped to the currently active company/plant, and fix the bug where switching company via the header `CompanySwitcher` does not refresh the shift-quota table.

**Architecture:** The sibling page "Penjadwalan Kuota" (`/kuota/schedule`, backed by `KuotaLevel1Controller.DataTableFilter`) already implements the correct pattern: frontend reads `activeCompanyCode` from `CompanyContext`, includes it in the TanStack Query `queryKey` (so switching company triggers an automatic refetch) and sends it as an explicit `companyCode` request param; the backend controller accepts that param and falls back to the token's own company only if it's absent. `/kuota/shifts` (backed by `KuotaLevel4Controller.DataTable`) has none of this — it never reads `CompanyContext`, its `queryKey` has no company dimension, its Next.js API route never forwards a `companyCode` param, and the backend `DataTable()` method hard-codes `myCompanyCode` (derived from the Bearer token) with no override. This plan mirrors the already-working Level1 pattern onto Level4, end to end: backend override → Next.js route forwarding → frontend queryKey/fetcher.

**Tech Stack:** Next.js 16 / React / TypeScript / TanStack Query (frontend, `SISTROV2-next`), ASP.NET Framework 4.5 Web API / Entity Framework (backend, `sistropigroup`).

**No test runner exists in either repo for this code path.** Verification steps use `rtk tsc --noEmit` / `rtk lint` for the frontend, and manual checks against `.\start-dev.ps1` (local IIS Express backend + local Next.js) for both.

---

## Root Cause

1. **Backend gap:** `KuotaLevel4Controller.DataTable()` (`C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\KuotaLevel4Controller.cs:530-713`) filters exclusively by `myCompanyCode`, a property resolved from the caller's Bearer token. It has no `Request["companyCode"]` override, unlike `KuotaLevel1Controller.DataTableFilter()` (`KuotaLevel1Controller.cs:934-955`), which reads an optional `companyCode` request param and only falls back to the token's company when absent. This override exists specifically to survive the known company-switch race documented in `docs/superpowers/plans/2026-05-20-company-switch-data-refresh.md` (NextAuth session/cookie propagation can briefly lag behind the freshly-issued token) — Level1 got that fix, Level4 never did.
2. **Frontend gap:** `src/app/kuota/shifts/page.tsx` never imports `useCompany()` from `CompanyContext`, so it has no `activeCompanyCode` to act on at all. Its `DataTable`'s `queryKey` (`["kuota-shifts", appliedSD, appliedED, appliedProduk, refreshKey]`) has no company dimension, so TanStack Query has no reason to refetch when the company changes — switching company silently leaves the stale table in place until the user touches an unrelated filter. `src/app/api/kuota/shifts/route.ts` correspondingly never reads or forwards a `companyCode` param.

Both gaps must close together: without the backend override, an explicit `companyCode` param from the frontend would be silently ignored; without the frontend queryKey/param, the backend fix alone won't be reached on a plain company switch (no filter changes, so `DataTable` never re-fetches).

---

## File Map

| File | Repo | Action |
|------|------|--------|
| `SISTROAWESOME/api/KuotaLevel4Controller.cs` | `sistropigroup` | Modify — add `companyCode` override to `DataTable()` |
| `src/app/api/kuota/shifts/route.ts` | `SISTROV2-next` | Modify — read & forward `companyCode` |
| `src/app/kuota/shifts/page.tsx` | `SISTROV2-next` | Modify — use `CompanyContext`, scope queryKey + fetcher |

---

## Task 1: Backend — accept `companyCode` override in `KuotaLevel4Controller.DataTable()`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\KuotaLevel4Controller.cs:530-713`

- [ ] **Step 1: Read the current method**

```powershell
rtk read C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\KuotaLevel4Controller.cs 530 600
```

Confirm it still matches:
```csharp
public JsonResult<object> DataTable()
{
// --- 1. Ambil Parameter ---
var Request = HttpContext.Current.Request;
int start = Convert.ToInt32(Request["start"]);
int length = Convert.ToInt32(Request["length"]);
string searchValue = Request["search[value]"];
string level3 = Request["level3"];
string SD = Request["SD"];
string ED = Request["ED"];
string produk = Request["produk"];
```
and, further down:
```csharp
        int recordsTotal = db.Kuota4Shift.AsNoTracking()
                             .Count(x => x.company_code == myCompanyCode && x.tanggal.Value.Year == tahunIni );
```
and:
```csharp
        var query = db.Kuota4Shift.AsNoTracking()
                      .Where(x => x.company_code == myCompanyCode);
```
If the surrounding code has drifted from this, stop and re-read the full method (`rtk read ... 530 713`) before editing — the line numbers below assume this exact shape.

- [ ] **Step 2: Add the `companyCode` override, mirroring `KuotaLevel1Controller.DataTableFilter()`**

Change:
```csharp
        string SD = Request["SD"];
        string ED = Request["ED"];
        string produk = Request["produk"];
```
to:
```csharp
        string SD = Request["SD"];
        string ED = Request["ED"];
        string produk = Request["produk"];
        string requestedCompanyCode = Request["companyCode"];
        string effectiveCompanyCode = !string.IsNullOrEmpty(requestedCompanyCode) ? requestedCompanyCode : myCompanyCode;
```

- [ ] **Step 3: Use `effectiveCompanyCode` for the `recordsTotal` count**

Change:
```csharp
        int recordsTotal = db.Kuota4Shift.AsNoTracking()
                             .Count(x => x.company_code == myCompanyCode && x.tanggal.Value.Year == tahunIni );
```
to:
```csharp
        int recordsTotal = db.Kuota4Shift.AsNoTracking()
                             .Count(x => x.company_code == effectiveCompanyCode && x.tanggal.Value.Year == tahunIni );
```

- [ ] **Step 4: Use `effectiveCompanyCode` for the main query**

Change:
```csharp
        var query = db.Kuota4Shift.AsNoTracking()
                      .Where(x => x.company_code == myCompanyCode);
```
to:
```csharp
        var query = db.Kuota4Shift.AsNoTracking()
                      .Where(x => x.company_code == effectiveCompanyCode);
```

- [ ] **Step 5: Confirm no other `myCompanyCode` reference remains inside `DataTable()`**

```powershell
rtk read C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\KuotaLevel4Controller.cs 530 713
```
Expected: the only two `x.company_code == ...` comparisons in this method now read `effectiveCompanyCode`; every other method in the file (`DataTable1`, `DataTablex`, etc.) is untouched and still uses `myCompanyCode` directly.

- [ ] **Step 6: Rebuild the backend solution**

Open the `sistropigroup` solution in Visual Studio and rebuild (or run your usual `msbuild` command for `SISTROAWESOME`). IIS Express serves the compiled DLL, so a stale build will silently keep the old behavior even after this edit and even after restarting IIS Express.

- [ ] **Step 7: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
rtk git add SISTROAWESOME/api/KuotaLevel4Controller.cs
rtk git commit -m "fix: allow companyCode override in KuotaLevel4 DataTable to match KuotaLevel1 pattern"
```

---

## Task 2: Next.js API route — forward `companyCode` to the backend

**Files:**
- Modify: `src/app/api/kuota/shifts/route.ts`

- [ ] **Step 1: Read the current param block**

```bash
rtk read src/app/api/kuota/shifts/route.ts 1 40
```

- [ ] **Step 2: Read the `companyCode` query param**

Change:
```ts
    const SD     = searchParams.get("SD")     || ""
    const ED     = searchParams.get("ED")     || ""
    const produk = searchParams.get("produk") || ""
```
to:
```ts
    const SD          = searchParams.get("SD")          || ""
    const ED          = searchParams.get("ED")          || ""
    const produk      = searchParams.get("produk")      || ""
    const companyCode = searchParams.get("companyCode") || ""
```

- [ ] **Step 3: Forward it to the ASP.NET backend**

Change:
```ts
    if (SD)     body.append("SD", SD)
    if (ED)     body.append("ED", ED)
    if (produk) body.append("produk", produk)
```
to:
```ts
    if (SD)          body.append("SD", SD)
    if (ED)          body.append("ED", ED)
    if (produk)      body.append("produk", produk)
    if (companyCode) body.append("companyCode", companyCode)
```

- [ ] **Step 4: Type-check**

Run: `rtk tsc --noEmit`
Expected: no new errors

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/api/kuota/shifts/route.ts
rtk git commit -m "feat: forward companyCode param to KuotaLevel4 DataTable"
```

---

## Task 3: Frontend page — scope to `activeCompanyCode` from `CompanyContext`

**Files:**
- Modify: `src/app/kuota/shifts/page.tsx`

- [ ] **Step 1: Import `useCompany`**

Change:
```tsx
import { useSession } from "next-auth/react"
import { normalizeRole } from "@/lib/role-utils"
import { useToast } from "@/components/ui/toast"
```
to:
```tsx
import { useSession } from "next-auth/react"
import { normalizeRole } from "@/lib/role-utils"
import { useToast } from "@/components/ui/toast"
import { useCompany } from "@/context/CompanyContext"
```

- [ ] **Step 2: Read `activeCompanyCode` in the component**

Change:
```tsx
export default function KuotaShiftsPage() {
  const { data: session } = useSession()
  const { addToast } = useToast()
```
to:
```tsx
export default function KuotaShiftsPage() {
  const { data: session } = useSession()
  const { activeCompanyCode } = useCompany()
  const { addToast } = useToast()
```

- [ ] **Step 3: Send `companyCode` in the fetcher's query string**

Change:
```tsx
  const fetcher = async (params: DataTableParams) => {
    const qs = new URLSearchParams({
      draw:   String(params.draw),
      start:  String(params.start),
      length: String(params.length),
      search: params.search || "",
      SD:     appliedSD,
      ED:     appliedED,
      produk: appliedProduk,
    })
    const res = await fetch(`/api/kuota/shifts?${qs}`)
```
to:
```tsx
  const fetcher = async (params: DataTableParams) => {
    const qs = new URLSearchParams({
      draw:   String(params.draw),
      start:  String(params.start),
      length: String(params.length),
      search: params.search || "",
      SD:     appliedSD,
      ED:     appliedED,
      produk: appliedProduk,
    })
    if (activeCompanyCode) qs.set("companyCode", activeCompanyCode)
    const res = await fetch(`/api/kuota/shifts?${qs}`)
```

- [ ] **Step 4: Add `activeCompanyCode` to the `DataTable` queryKey**

Change:
```tsx
          <DataTable<ShiftRow>
            queryKey={["kuota-shifts", appliedSD, appliedED, appliedProduk, refreshKey]}
```
to:
```tsx
          <DataTable<ShiftRow>
            queryKey={["kuota-shifts", activeCompanyCode ?? "all", appliedSD, appliedED, appliedProduk, refreshKey]}
```

- [ ] **Step 5: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
rtk git add src/app/kuota/shifts/page.tsx
rtk git commit -m "fix: scope Kuota Per Shift page to activeCompanyCode so switching company refreshes data"
```

---

## Task 4: End-to-end manual verification

No code changes in this task.

- [ ] **Step 1: Start both projects with the local backend**

```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```

- [ ] **Step 2: Log in as a user with 2+ companies (e.g. `candal`, `superadmin`, `admin`, or `pod`)**

Open `/kuota/shifts`. Note the currently displayed rows and their `wilayahString`/`bagianString`/`namaproduk` values for the initially active company.

- [ ] **Step 3: Switch company via the header `CompanySwitcher`**

Confirm the table refetches (loading state briefly shown) and now shows rows for the newly active company — not the same rows as before, and not empty unless the new company genuinely has no shift-quota data in range.

- [ ] **Step 4: Confirm filters still combine correctly with company scoping**

Apply a date range and/or product filter, confirm results are still scoped to the active company. Switch company again with those filters still applied, confirm the table refetches and stays scoped to both the filters and the new company.

- [ ] **Step 5: Regression-check the edit flow**

As a `candal`/`superadmin`/`admin`/`pod` user, click edit (pencil icon) on a row, change the kuota value, save. Confirm the toast success message appears and the row updates (existing `refreshKey` bump behavior — untouched by this plan).

- [ ] **Step 6: Regression-check `/kuota/schedule` (Level1) is unaffected**

Open `/kuota/schedule`, switch company, confirm it still refreshes correctly (this page's behavior wasn't touched, but it exercises the same `CompanyContext`/`useApi()` machinery).

---

## Self-Review Notes

- **Coverage:** "tampilkan kuota pershift sesuai dengan plan yang aktif" (show quota-per-shift for the active company/plant) → Task 1 (backend can now honor an explicit company scope) + Task 3 (frontend now reads and sends `activeCompanyCode`). "kuota tidak terupdate karena switch company" → Task 3 Step 4 (company now in `queryKey`, so TanStack Query refetches automatically on switch) + Task 1 (the refetch actually returns the new company's data instead of being silently ignored by the backend).
- **Scope boundary:** This plan only touches `KuotaLevel4Controller.DataTable()` — the single endpoint backing `/kuota/shifts`. Sibling methods in the same file (`DataTable1`, `DataTablex`, the `Level1UpdateData`/create/edit handlers) are out of scope and left on `myCompanyCode` as before.
- **Rival considered:** Fixing only the frontend (queryKey + param) without the backend override would look like it works in dev if the tester's Bearer token already matches the target company from a prior switch, but would silently keep returning the *token's* company on any request where session propagation lags — exactly the race `2026-05-20-company-switch-data-refresh.md` already diagnosed and fixed for other endpoints via this same override pattern. Fixing only the backend without the frontend queryKey change would leave the page never refetching on a plain company switch (no other filter changed), so the stale table would persist until the user touched SD/ED/produk. Both halves are required.
- **Type consistency:** `activeCompanyCode` is `string | null` from `useCompany()` (per `src/context/CompanyContext.tsx:22`) — the `?? "all"` in the queryKey and `if (activeCompanyCode)` guard in the fetcher match the exact idiom already used in `src/app/kuota/schedule/page.tsx:65,89,132,360`.
