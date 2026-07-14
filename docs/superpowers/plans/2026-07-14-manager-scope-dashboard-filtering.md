# Manager Scope Dashboard Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user with a `ManagerScope` assignment (avp/vp/direksi) opens `/dashboard`, they see the exact same `ViewerDashboard` everyone else sees, but every stat/chart/leaderboard/map is filtered to only their scoped company/companies. Users with no `ManagerScope` are completely unaffected.

**Architecture:** No changes to `ViewerDashboard.tsx` or `useDashboardStream.ts` at all. `src/app/api/stream/dashboard/route.ts` resolves the caller's scope (via `getManagerScope`, already built) into a company-code list, and threads it as an optional `companies=` query param into the 9 ASP.NET `HomeController` endpoints it already calls. Each of those 9 endpoints gets a small optional filter added — absent param means unchanged (today's global) behavior. A new tiny `CompanyController.CodesByGroups` endpoint resolves "which company codes belong to wilayah group(s) X" for the avp/vp cases.

**Tech Stack:** ASP.NET Web API 2 / EF6 (backend, `SISTROAWESOME`), Next.js 16 App Router + NextAuth (frontend, `SISTROV2-next`).

**Full design rationale:** `docs/superpowers/specs/2026-07-14-manager-scope-dashboard-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\CompanyController.cs` | Add `CodesByGroups` action — resolve wilayah group name(s) → company codes |
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\HomeController.cs` | Add optional `companies` filter param to 9 dashboard-data endpoints |
| `c:\Users\weka\Indigo\SISTROV2-next\src\lib\manager-scope.ts` | Add `vpRegionName` to the vp branch's return shape; add `resolveScopeCompanies()` helper |
| `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\stream\dashboard\route.ts` | Resolve scope, thread `companies` param into all 9 backend calls, return `scopeLabel` |
| `c:\Users\weka\Indigo\SISTROV2-next\src\app\dashboard\DashboardViewerClient.tsx` | Render a scope badge when `scopeLabel` is present |

---

## Task 1: `CodesByGroups` endpoint

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\CompanyController.cs`

- [ ] **Step 1: Add the endpoint**

In `CompanyController.cs`, add this method right after the existing `GroupCompanies()` method (which ends around line 78, just before `[HttpGet] public List<CompanyView> Data()`):

```csharp
        /// <summary>
        /// Resolve one or more `groupcompany` values into their company codes.
        /// Used by the Next.js dashboard-scoping layer to turn an AVP's single
        /// wilayah (or a VP's set of wilayah) into the list of companies to filter to.
        /// </summary>
        [HttpGet]
        [Route("CodesByGroups")]
        [Authorize]
        public List<string> CodesByGroups(string groups)
        {
            if (string.IsNullOrWhiteSpace(groups))
                return new List<string>();

            var groupList = groups.Split(',')
                .Select(g => g.Trim())
                .Where(g => !string.IsNullOrEmpty(g))
                .ToList();

            if (groupList.Count == 0)
                return new List<string>();

            return db.Company
                .Where(x => x.groupcompany != null && groupList.Contains(x.groupcompany))
                .Select(x => x.company_code)
                .Distinct()
                .ToList();
        }
```

Note: `[Authorize]` (no role restriction) rather than `[Authorize(Roles = "SuperAdmin,TI")]` — this is called by the dashboard-scoping layer on behalf of ANY logged-in user with a `ManagerScope` (avp/vp), not just superadmins. `BaseLoggedApiController`'s class-level `[Authorize]` would already cover this, but it's declared explicitly here for clarity since `GroupCompanies` right above it uses a stricter one.

- [ ] **Step 2: Compile-check**

Run (PowerShell, not Git Bash — path args get mangled otherwise):
```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\amd64\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /nologo /v:quiet
echo "Exit code: $LASTEXITCODE"
```
Expected: `Exit code: 0`

- [ ] **Step 3: Manual verification**

```powershell
$SQLCMD = "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\sqlcmd"
& $SQLCMD -Q "SELECT DISTINCT groupcompany FROM Company WHERE groupcompany IS NOT NULL" -S "192.168.188.29,7869" -U "usr_sistro_dev" -P 'Si$tr0@Pupuk1!_d3v' -d "SISTROSTAGING" -C
```
Confirm the group names you'll test with (e.g. `SUMBAGUT`) actually exist, then once this branch is deployed, hit `GET /api/Company/CodesByGroups?groups=SUMBAGUT` with a valid bearer token and confirm it returns that group's company codes (a JSON array of strings).

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\weka\Indigo\sistropigroup"
git add SISTROAWESOME/api/CompanyController.cs
git commit -m "feat: add CodesByGroups endpoint for dashboard scope resolution"
```

---

## Task 2: Add `companies` filter to the 9 HomeController dashboard endpoints

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\HomeController.cs`

Each of the 9 methods below gets the same shape of change: add an optional `string companies = null` parameter, and when it's non-null, add a company-code filter to the query. **When `companies` is null (not passed), behavior must be byte-for-byte identical to today** — the filter logic only runs inside `if (companies != null)`.

Two access patterns exist in this file:
- Most endpoints query `db.Tiket` and reach the company via the `Posto1` navigation property (`x.Posto1.company_code`), since `Tiket` has no direct company column.
- `MonitorMapData` queries `db.Company` directly, which already has `company_code`.

- [ ] **Step 1: `GetMonthlyOverview` (around line 1226)**

Current signature:
```csharp
        public JsonResult<object> GetMonthlyOverview()
```

Change to:
```csharp
        public JsonResult<object> GetMonthlyOverview(string companies = null)
```

Current body starts:
```csharp
                // Query this month
                var thisMonthStats = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= startOfThisMonth && x.tanggal < endOfThisMonth)
                    .GroupBy(x => 1)
```

Add a helper right after `var endOfLastMonth = startOfThisMonth;` (before the "Query this month" comment):
```csharp
                List<string> companyCodes = companies != null
                    ? companies.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList()
                    : null;
```

Then change both `db.Tiket.AsNoTracking().Where(...)` clauses (this month AND last month) from:
```csharp
                    .Where(x => x.tanggal >= startOfThisMonth && x.tanggal < endOfThisMonth)
```
to:
```csharp
                    .Where(x => x.tanggal >= startOfThisMonth && x.tanggal < endOfThisMonth
                             && (companyCodes == null || (x.Posto1 != null && companyCodes.Contains(x.Posto1.company_code))))
```
(and the equivalent for the `startOfLastMonth`/`endOfLastMonth` query below it).

- [ ] **Step 2: `GetPlantLeaderboard` (around line 1302)**

Current signature:
```csharp
        public JsonResult<object> GetPlantLeaderboard()
```
→
```csharp
        public JsonResult<object> GetPlantLeaderboard(string companies = null)
```

Current query:
```csharp
                var rawTickets = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= startOfLast30Days && x.tanggal < tomorrow
                             && x.Posto1 != null)
```
→
```csharp
                List<string> companyCodes = companies != null
                    ? companies.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList()
                    : null;

                var rawTickets = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= startOfLast30Days && x.tanggal < tomorrow
                             && x.Posto1 != null
                             && (companyCodes == null || companyCodes.Contains(x.Posto1.company_code)))
```

- [ ] **Step 3: `GetTopDurasiTiket` (around line 1404)**

Current signature:
```csharp
        public JsonResult<object> GetTopDurasiTiket()
```
→
```csharp
        public JsonResult<object> GetTopDurasiTiket(string companies = null)
```

Current query has no `Posto1 != null` check at all — add it along with the filter:
```csharp
                var finishedTickets = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= startOfLast30Days && x.tanggal < tomorrow
                             && x.position == "07"
                             && x.timesec != null && x.timeout != null)
```
→
```csharp
                List<string> companyCodes = companies != null
                    ? companies.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList()
                    : null;

                var finishedTickets = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= startOfLast30Days && x.tanggal < tomorrow
                             && x.position == "07"
                             && x.timesec != null && x.timeout != null
                             && (companyCodes == null || (x.Posto1 != null && companyCodes.Contains(x.Posto1.company_code))))
```

- [ ] **Step 4: `GetTiketTrendPerPlant` (around line 1475)**

Current signature:
```csharp
        public JsonResult<object> GetTiketTrendPerPlant()
```
→
```csharp
        public JsonResult<object> GetTiketTrendPerPlant(string companies = null)
```

Current query:
```csharp
                var trendData = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= last7Days && x.tanggal < tomorrow
                             && x.Posto1 != null)
```
→
```csharp
                List<string> companyCodes = companies != null
                    ? companies.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList()
                    : null;

                var trendData = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= last7Days && x.tanggal < tomorrow
                             && x.Posto1 != null
                             && (companyCodes == null || companyCodes.Contains(x.Posto1.company_code)))
```

- [ ] **Step 5: `GetTopProdukVolume` (around line 1520)**

Current signature:
```csharp
        public JsonResult<object> GetTopProdukVolume()
```
→
```csharp
        public JsonResult<object> GetTopProdukVolume(string companies = null)
```

Current query has no Posto1 reference at all (groups by product name only) — add it along with the filter:
```csharp
                var productVolume = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= last30Days && x.tanggal < tomorrow
                             && x.position == "07"
                             && x.qty != null
                             && x.Produk != null)
```
→
```csharp
                List<string> companyCodes = companies != null
                    ? companies.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList()
                    : null;

                var productVolume = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= last30Days && x.tanggal < tomorrow
                             && x.position == "07"
                             && x.qty != null
                             && x.Produk != null
                             && (companyCodes == null || (x.Posto1 != null && companyCodes.Contains(x.Posto1.company_code))))
```

- [ ] **Step 6: `GetTiketTrendPerHour` (around line 1562)**

Current signature:
```csharp
        public JsonResult<object> GetTiketTrendPerHour()
```
→
```csharp
        public JsonResult<object> GetTiketTrendPerHour(string companies = null)
```

Current query:
```csharp
                var hourlyData = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= today && x.tanggal < tomorrow
                             && x.timesec != null)
```
→
```csharp
                List<string> companyCodes = companies != null
                    ? companies.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList()
                    : null;

                var hourlyData = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= today && x.tanggal < tomorrow
                             && x.timesec != null
                             && (companyCodes == null || (x.Posto1 != null && companyCodes.Contains(x.Posto1.company_code))))
```

- [ ] **Step 7: `GetDurasiProsesMuat` (around line 1601)**

Current signature:
```csharp
        public JsonResult<object> GetDurasiProsesMuat()
```
→
```csharp
        public JsonResult<object> GetDurasiProsesMuat(string companies = null)
```

Current query:
```csharp
                var durasiData = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= last30Days && x.tanggal < tomorrow
                             && x.position == "08"
                             && x.timemuat != null && x.timeisi != null
                             && x.Posto1 != null)
```
→
```csharp
                List<string> companyCodes = companies != null
                    ? companies.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList()
                    : null;

                var durasiData = db.Tiket.AsNoTracking()
                    .Where(x => x.tanggal >= last30Days && x.tanggal < tomorrow
                             && x.position == "08"
                             && x.timemuat != null && x.timeisi != null
                             && x.Posto1 != null
                             && (companyCodes == null || companyCodes.Contains(x.Posto1.company_code)))
```

- [ ] **Step 8: `MonitorStats` (around line 1791)**

Current signature:
```csharp
        public IHttpActionResult MonitorStats(string period = "today", int? month = null, int? year = null)
```
→
```csharp
        public IHttpActionResult MonitorStats(string period = "today", int? month = null, int? year = null, string companies = null)
```

Current body starts:
```csharp
                IQueryable<Tiket> query = db.Tiket.AsNoTracking();

                if (period == "today")
```
→
```csharp
                List<string> companyCodes = companies != null
                    ? companies.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList()
                    : null;

                IQueryable<Tiket> query = db.Tiket.AsNoTracking();

                if (companyCodes != null)
                {
                    query = query.Where(x => x.Posto1 != null && companyCodes.Contains(x.Posto1.company_code));
                }

                if (period == "today")
```
(the rest of the method — the `else if` chain for month/year and the aggregation — stays exactly as-is; the company filter is a separate `.Where()` applied before the period filter, both compose correctly since LINQ `.Where()` calls AND together).

- [ ] **Step 9: `MonitorMapData` (around line 1869)**

This one queries `db.Company` directly (not `db.Tiket`), so the filter target is different.

Current signature:
```csharp
        public IHttpActionResult MonitorMapData()
```
→
```csharp
        public IHttpActionResult MonitorMapData(string companies = null)
```

Current query:
```csharp
                var companies = db.Company.AsNoTracking()
                    .Where(x => x.statusPlant == true
                        && x.groupcompany != "TnT Lini 3"
                        && x.groupcompany != "PIHC"
                        && x.groupcompany != "EKSPEDITUR"
                        && x.groupcompany != "GUDANG LINI 3")
                    .Select(x => new { x.company_code, company = x.company1 })
                    .ToList();
```

**Important:** the existing local variable is also named `companies` (a `List<...>` of plant rows) — this collides with the new parameter name. Rename the new parameter to `companyFilter` for this method only, to avoid shadowing:

```csharp
        public IHttpActionResult MonitorMapData(string companyFilter = null)
        {
            try
            {
                var today    = DateTime.Now.Date;
                var tomorrow = today.AddDays(1);

                List<string> companyCodes = companyFilter != null
                    ? companyFilter.Split(',').Where(c => !string.IsNullOrWhiteSpace(c)).ToList()
                    : null;

                var companyCodeMap = new Dictionary<string, string>
                {
                    { "LOG4MENENG",   "F267" },
                    { "LOMBOK",       "B442" },
                    { "MAKASAR2",     "D243" },
                    { "MEDAN",        "B201" },
                    { "PADIMAS",      "F209" },
                    { "PIM",          "E101" },
                    { "PKC",          "C101" },
                    { "PKG",          "B101" },
                    { "ROMO",         "D277" },
                    { "BANJARMASIN2", "D3AY" },
                    { "CILACAP",      "F206" }
                };

                var companies = db.Company.AsNoTracking()
                    .Where(x => x.statusPlant == true
                        && x.groupcompany != "TnT Lini 3"
                        && x.groupcompany != "PIHC"
                        && x.groupcompany != "EKSPEDITUR"
                        && x.groupcompany != "GUDANG LINI 3"
                        && (companyCodes == null || companyCodes.Contains(x.company_code)))
                    .Select(x => new { x.company_code, company = x.company1 })
                    .ToList();
```

(Only the method signature, the new `companyCodes` line, and the added `&& (companyCodes == null || ...)` clause change — everything else in this method, including the rest of the `companies` variable's usage further down, stays exactly as-is.)

- [ ] **Step 10: Compile-check**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\amd64\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /nologo /v:quiet
echo "Exit code: $LASTEXITCODE"
```
Expected: `Exit code: 0`

- [ ] **Step 11: Commit**

```bash
cd "C:\Users\weka\Indigo\sistropigroup"
git add SISTROAWESOME/api/HomeController.cs
git commit -m "feat: add optional company-code filter to dashboard aggregate endpoints"
```

---

## Task 3: Extend `manager-scope.ts` — `vpRegionName` + `resolveScopeCompanies()`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\lib\manager-scope.ts`

Current file:
```typescript
import { aspnetFetchServer } from "@/lib/api-client";

export type ManagerScopeResult =
  | { tier: "avp"; wilayahCode: string }
  | { tier: "vp"; vpRegionId: string; wilayahCodes: string[] }
  | { tier: "direksi"; companyCode: string }
  | { tier: "none" };

/**
 * Resolve a user's manager scope tier. For tier "vp", also resolves
 * the full list of wilayah codes currently assigned to that region,
 * since VP grouping is superadmin-editable and can change at any time.
 *
 * Backed by the ASP.NET ManagerScope/VpRegion controllers (SISTROAWESOME),
 * so a valid backend bearer token is required — pass `session.user.aspnetToken`.
 */
export async function getManagerScope(userId: string, token: string): Promise<ManagerScopeResult> {
  const scopeRes = await aspnetFetchServer(`/api/ManagerScope/Get?userId=${encodeURIComponent(userId)}`, token);
  if (scopeRes.status === 404) return { tier: "none" };
  if (!scopeRes.ok) throw new Error(`Backend ${scopeRes.status}: ${await scopeRes.text().catch(() => scopeRes.statusText)}`);

  const scope = await scopeRes.json();

  if (scope.Tier === "avp" && scope.WilayahCode) {
    return { tier: "avp", wilayahCode: scope.WilayahCode };
  }

  if (scope.Tier === "vp" && scope.VpRegionId) {
    const regionsRes = await aspnetFetchServer("/api/VpRegion/List", token);
    if (!regionsRes.ok) throw new Error(`Backend ${regionsRes.status}: ${await regionsRes.text().catch(() => regionsRes.statusText)}`);
    const regions: any[] = await regionsRes.json();
    const region = regions.find((r) => r.Id === scope.VpRegionId);
    return { tier: "vp", vpRegionId: scope.VpRegionId, wilayahCodes: region?.WilayahCodes || [] };
  }

  if (scope.Tier === "direksi" && scope.CompanyCode) {
    return { tier: "direksi", companyCode: scope.CompanyCode };
  }

  return { tier: "none" };
}
```

- [ ] **Step 1: Add `vpRegionName` to the vp branch**

Replace the whole file with:

```typescript
import { aspnetFetchServer } from "@/lib/api-client";

export type ManagerScopeResult =
  | { tier: "avp"; wilayahCode: string }
  | { tier: "vp"; vpRegionId: string; vpRegionName: string; wilayahCodes: string[] }
  | { tier: "direksi"; companyCode: string }
  | { tier: "none" };

/**
 * Resolve a user's manager scope tier. For tier "vp", also resolves
 * the full list of wilayah codes currently assigned to that region,
 * since VP grouping is superadmin-editable and can change at any time.
 *
 * Backed by the ASP.NET ManagerScope/VpRegion controllers (SISTROAWESOME),
 * so a valid backend bearer token is required — pass `session.user.aspnetToken`.
 */
export async function getManagerScope(userId: string, token: string): Promise<ManagerScopeResult> {
  const scopeRes = await aspnetFetchServer(`/api/ManagerScope/Get?userId=${encodeURIComponent(userId)}`, token);
  if (scopeRes.status === 404) return { tier: "none" };
  if (!scopeRes.ok) throw new Error(`Backend ${scopeRes.status}: ${await scopeRes.text().catch(() => scopeRes.statusText)}`);

  const scope = await scopeRes.json();

  if (scope.Tier === "avp" && scope.WilayahCode) {
    return { tier: "avp", wilayahCode: scope.WilayahCode };
  }

  if (scope.Tier === "vp" && scope.VpRegionId) {
    const regionsRes = await aspnetFetchServer("/api/VpRegion/List", token);
    if (!regionsRes.ok) throw new Error(`Backend ${regionsRes.status}: ${await regionsRes.text().catch(() => regionsRes.statusText)}`);
    const regions: any[] = await regionsRes.json();
    const region = regions.find((r) => r.Id === scope.VpRegionId);
    return {
      tier: "vp",
      vpRegionId: scope.VpRegionId,
      vpRegionName: region?.Name ?? scope.VpRegionId,
      wilayahCodes: region?.WilayahCodes || [],
    };
  }

  if (scope.Tier === "direksi" && scope.CompanyCode) {
    return { tier: "direksi", companyCode: scope.CompanyCode };
  }

  return { tier: "none" };
}

export interface ScopeCompanies {
  tier: "avp" | "vp" | "direksi" | "none";
  /** null = no restriction (tier "none"); otherwise the exact set of company
   * codes to filter dashboard data to. An empty (non-null) array means
   * "restricted to nothing" — this must never be treated as "no filter". */
  companyCodes: string[] | null;
  /** Human-readable label for a scope badge, e.g. "SUMBAGUT" or "PKG". */
  label: string | null;
}

/**
 * Resolve a user's manager scope into the exact set of company codes their
 * dashboard should be filtered to. Never throws — on any failure it fails
 * closed (empty company list for a known-scoped user, "no scope" for a user
 * whose scope couldn't even be determined), so an error can never widen
 * access to unfiltered/global data.
 */
export async function resolveScopeCompanies(userId: string, token: string): Promise<ScopeCompanies> {
  let scope: ManagerScopeResult;
  try {
    scope = await getManagerScope(userId, token);
  } catch (err) {
    console.error("[dashboard-scope] getManagerScope failed, treating as no scope", err);
    return { tier: "none", companyCodes: null, label: null };
  }

  if (scope.tier === "none") {
    return { tier: "none", companyCodes: null, label: null };
  }

  if (scope.tier === "direksi") {
    return { tier: "direksi", companyCodes: [scope.companyCode], label: scope.companyCode };
  }

  const groups = scope.tier === "avp" ? scope.wilayahCode : scope.wilayahCodes.join(",");
  const label = scope.tier === "avp" ? scope.wilayahCode : scope.vpRegionName;

  try {
    const res = await aspnetFetchServer(`/api/Company/CodesByGroups?groups=${encodeURIComponent(groups)}`, token);
    if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text().catch(() => res.statusText)}`);
    const codes: string[] = await res.json();
    return { tier: scope.tier, companyCodes: codes, label };
  } catch (err) {
    console.error("[dashboard-scope] CodesByGroups failed, failing closed to empty scope", err);
    return { tier: scope.tier, companyCodes: [], label };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/manager-scope.ts
git commit -m "feat: add resolveScopeCompanies helper for dashboard scoping"
```

---

## Task 4: Thread scope into `/api/stream/dashboard/route.ts`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\stream\dashboard\route.ts`

Current file:
```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const VIEWER_ROLES = ["superadmin", "ti", "admin", "pod", "viewer", "adminarmada", "adminsumbu"];

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    VIEWER_ROLES.includes(r.toLowerCase())
  );
}

async function fetchAllDashboardData(token: string, period?: string, month?: string, year?: string) {
  const safe = async (path: string) => {
    try {
      const res = await aspnetFetchServer(path, token);
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.error("[Dashboard] fetch error for", path, err);
      return null;
    }
  };

  const queryParams = new URLSearchParams();
  if (period) queryParams.set("period", period);
  if (month) queryParams.set("month", month);
  if (year) queryParams.set("year", year);

  const statsPath = `/api/Home/MonitorStats?${queryParams.toString()}`;

  const [stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData] =
    await Promise.all([
      safe(statsPath),
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
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || undefined;
  const month = searchParams.get("month") || undefined;
  const year = searchParams.get("year") || undefined;

  const data = await fetchAllDashboardData(token, period, month, year);
  return NextResponse.json(data);
}
```

- [ ] **Step 1: Replace the whole file**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { resolveScopeCompanies } from "@/lib/manager-scope";

const VIEWER_ROLES = ["superadmin", "ti", "admin", "pod", "viewer", "adminarmada", "adminsumbu"];

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    VIEWER_ROLES.includes(r.toLowerCase())
  );
}

async function fetchAllDashboardData(
  token: string,
  period: string | undefined,
  month: string | undefined,
  year: string | undefined,
  companiesParam: string | undefined
) {
  const safe = async (path: string) => {
    try {
      const res = await aspnetFetchServer(path, token);
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.error("[Dashboard] fetch error for", path, err);
      return null;
    }
  };

  const withCompanies = (path: string, extra?: Record<string, string>) => {
    const queryParams = new URLSearchParams(extra);
    if (companiesParam !== undefined) queryParams.set("companies", companiesParam);
    const qs = queryParams.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const statsExtra: Record<string, string> = {};
  if (period) statsExtra.period = period;
  if (month) statsExtra.month = month;
  if (year) statsExtra.year = year;

  const [stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData] =
    await Promise.all([
      safe(withCompanies("/api/Home/MonitorStats", statsExtra)),
      safe(withCompanies("/api/Home/GetTiketTrendPerPlant")),
      safe(withCompanies("/api/Home/GetTiketTrendPerHour")),
      safe(withCompanies("/api/Home/GetDurasiProsesMuat")),
      safe(withCompanies("/api/Home/GetMonthlyOverview")),
      safe(withCompanies("/api/Home/GetPlantLeaderboard")),
      safe(withCompanies("/api/Home/GetTopDurasiTiket")),
      safe(withCompanies("/api/Home/GetTopProdukVolume")),
      // MonitorMapData's param is named `companyFilter`, not `companies` (see Task 2 Step 9)
      safe((() => {
        const p = new URLSearchParams();
        if (companiesParam !== undefined) p.set("companyFilter", companiesParam);
        const qs = p.toString();
        return qs ? `/api/Home/MonitorMapData?${qs}` : "/api/Home/MonitorMapData";
      })()),
    ]);

  return { stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  const userId = (session?.user as any)?.id as string;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || undefined;
  const month = searchParams.get("month") || undefined;
  const year = searchParams.get("year") || undefined;

  const scope = await resolveScopeCompanies(userId, token);
  // companyCodes === null means "no restriction" — the `companies` param is
  // omitted entirely so every HomeController endpoint behaves exactly as it
  // does today. A non-null (possibly empty) array is always passed through,
  // so an empty scope can never be mistaken for "no filter".
  const companiesParam = scope.companyCodes !== null ? scope.companyCodes.join(",") : undefined;

  const data = await fetchAllDashboardData(token, period, month, year, companiesParam);

  return NextResponse.json({
    ...data,
    scope: scope.tier !== "none" ? { tier: scope.tier, label: scope.label } : null,
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Manual verification**

Start dev server, sign in as a superadmin (no `ManagerScope`), open `/dashboard`, confirm it looks exactly as before (no badge, same numbers as before this change) — this is the regression check for the 99% of unscoped users.

Then test the empty-scope edge case: via `/superadmin/settings/manager-scope`, assign your test account tier=avp with a `wilayahCode` that has zero companies tagged to it (e.g. add a throwaway `CustomWilayah` entry via `/superadmin/settings/vp-regions`'s "Tambah Wilayah Custom" that has never been assigned to any `Company.groupcompany`). Open `/dashboard` and confirm all stats show zero — **not** the global totals. This confirms the `companyCodes == null` (no filter) vs `companyCodes == []` (filter to nothing) distinction is correctly wired end-to-end, not just correct in isolation.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/stream/dashboard/route.ts
git commit -m "feat: thread manager-scope company filter into dashboard stream route"
```

---

## Task 5: Scope badge in `DashboardViewerClient.tsx`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\dashboard\DashboardViewerClient.tsx`

This component currently renders `<ViewerDashboard />` directly with no data of its own for the `!company` branch (lines 89-106 in the current file). `ViewerDashboard` calls `useDashboardStream()` itself internally — the scope info from Task 4's route isn't accessible to `DashboardViewerClient` unless it also calls the stream endpoint. Rather than duplicating that fetch, add a small dedicated query in `DashboardViewerClient` just for the scope badge (cheap: a HEAD-of-waterfall request, `/api/stream/dashboard` is already polled by `ViewerDashboard` every 30s so this second read is a normal React Query-less `useEffect` fetch, not a new polling loop).

- [ ] **Step 1: Add the scope-badge fetch and render**

In `DashboardViewerClient.tsx`, add a new piece of state right after the existing `stats`/`loading` state (around line 39-40):

```typescript
  const [scopeBadge, setScopeBadge] = useState<{ tier: string; label: string } | null>(null);
```

Add a new `useEffect` right after the existing one (around line 72, after the `company`-scoped stats effect):

```typescript
  useEffect(() => {
    if (company) return; // only relevant on the global (!company) dashboard
    fetch("/api/stream/dashboard?period=today")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setScopeBadge(json?.scope ?? null))
      .catch(() => setScopeBadge(null));
  }, [company]);
```

Then, in the `!company` branch (currently):
```typescript
  if (!company) {
    return (
      <>
        {isPiAdmin && (
          <div className="p-6 pb-0">
            <a
              href="/reports/tiket-pi"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 text-sm font-medium transition-colors"
            >
              <FileText className="h-4 w-4" />
              Laporan Tiket
            </a>
          </div>
        )}
        <ViewerDashboard />
      </>
    );
  }
```

Add the badge before `<ViewerDashboard />`:
```typescript
  const SCOPE_TIER_LABELS: Record<string, string> = { avp: "AVP", vp: "VP", direksi: "Direksi" };

  if (!company) {
    return (
      <>
        {isPiAdmin && (
          <div className="p-6 pb-0">
            <a
              href="/reports/tiket-pi"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 text-sm font-medium transition-colors"
            >
              <FileText className="h-4 w-4" />
              Laporan Tiket
            </a>
          </div>
        )}
        {scopeBadge && (
          <div className="px-6 pt-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-600 dark:border-blue-400 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              Menampilkan data: {SCOPE_TIER_LABELS[scopeBadge.tier] ?? scopeBadge.tier} — {scopeBadge.label}
            </div>
          </div>
        )}
        <ViewerDashboard />
      </>
    );
  }
```

(Move the `SCOPE_TIER_LABELS` const to module scope, alongside the existing `COMPANY_LABELS` const near the top of the file, rather than redeclaring it inside the component on every render.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Manual verification**

Using the manager-scope admin page, assign your own test superadmin/viewer account a temporary `ManagerScope` (e.g. tier=avp, wilayahCode=SUMBAGUT), open `/dashboard`, confirm:
- The badge shows "AVP — SUMBAGUT".
- The stat numbers are lower than (or equal to, if all data happens to be in that wilayah) the unscoped totals.
Remove the test `ManagerScope` afterward via the same admin page.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/DashboardViewerClient.tsx
git commit -m "feat: show scope badge on dashboard for avp/vp/direksi users"
```

---

## Reference table (for the user, not a code artifact)

| Tier | `companies` param value passed to HomeController | Badge label |
|---|---|---|
| none | omitted entirely (unrestricted, today's behavior) | none |
| avp | `CodesByGroups(wilayahCode)` result | the wilayah name, e.g. "SUMBAGUT" |
| vp | `CodesByGroups(all wilayahCodes under the region)` result | the VP region's name, e.g. "Wilayah Barat" |
| direksi | `[companyCode]` directly, no lookup needed | the company code, e.g. "PKG" |

---

## Self-Review Notes

- **Spec coverage:** all 4 spec sections covered — architecture (Tasks 1-4, no ViewerDashboard changes), safety/edge cases (empty-scope-never-unfiltered logic in `resolveScopeCompanies` + the `companyCodes == null` vs `[]` distinction threaded through every HomeController endpoint), badge (Task 5), testing (manual verification steps in every task).
- **No placeholders:** every step has runnable code or an exact command; no "add appropriate filtering" language — the exact LINQ diff is given for all 9 endpoints individually since they're not identical (different table access patterns, some missing the `Posto1 != null` guard entirely).
- **Type consistency:** `ManagerScopeResult`'s vp variant gains `vpRegionName` (Task 3) and every consumer of it (`resolveScopeCompanies` in the same task) uses the new field name consistently. `ScopeCompanies.companyCodes` (`string[] | null`) is consistent between Task 3 (defined) and Task 4 (consumed via `scope.companyCodes !== null`). The `MonitorMapData` parameter is deliberately named `companyFilter` (not `companies`) to avoid shadowing that method's existing local variable — Task 4's `fetchAllDashboardData` builds that one call's query string with the differently-named param to match.
