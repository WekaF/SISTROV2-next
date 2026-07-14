# Manager Scope Dashboard Design

**Goal:** When a user with a `ManagerScope` assignment (avp/vp/direksi — see `docs/superpowers/plans/2026-07-13-manager-hierarchy-mapping.md`) opens `/dashboard`, they should see the same dashboard everyone else sees (`ViewerDashboard`), but with all stats/charts/leaderboard/map filtered to only the company/companies within their scope. Users with no `ManagerScope` are completely unaffected.

**Why now:** The manager-hierarchy mapping plan built the *data layer* only (who is assigned what scope) and explicitly deferred dashboard consumption. `getManagerScope()` in `src/lib/manager-scope.ts` exists and is correct, but nothing calls it yet. This spec is that missing consumption layer.

## Current state (verified by reading the code)

- `/dashboard` (`src/app/dashboard/page.tsx`) renders `DashboardViewerClient.tsx`, which renders `ViewerDashboard.tsx` (2241 lines) when there's no `?company=` query param.
- `ViewerDashboard` pulls all its data from `useDashboardStream()` (`src/hooks/use-dashboard-stream.ts`), which polls `GET /api/stream/dashboard?period=...`.
- `src/app/api/stream/dashboard/route.ts` fans out to 9 ASP.NET `HomeController` endpoints in parallel (`MonitorStats`, `GetTiketTrendPerPlant`, `GetTiketTrendPerHour`, `GetDurasiProsesMuat`, `GetMonthlyOverview`, `GetPlantLeaderboard`, `GetTopDurasiTiket`, `GetTopProdukVolume`, `MonitorMapData`) and returns their combined JSON as-is.
- None of those 9 `HomeController` methods currently accept any company-list filter — they aggregate across every company in the system unconditionally. Access is gated only by role (`superadmin, ti, admin, pod, viewer, adminarmada, adminsumbu`), not by data scope.
- `ManagerScope.wilayahCode`/`vpRegion` values are `Company.groupcompany` strings (SUMBAGUT, SUMBAGSEL, KALIMANTAN, JABAR JATENG, JATIM BALI NUS, SULAMAPA, plus any superadmin-added `CustomWilayah` entries) — confirmed via direct DB query. There is currently no ASP.NET endpoint that resolves "which company codes belong to wilayah group X" — this needs to be added.

## Architecture

No changes to `ViewerDashboard.tsx` or `useDashboardStream.ts` at all — they keep rendering whatever JSON they're given, unaware that scoping exists. All new logic lives in the API layer:

1. **New backend endpoint** — `CompanyController.CodesByGroups(string groups)`: accepts a comma-separated list of `groupcompany` values, returns `List<string>` of matching `company_code`s. One endpoint serves both AVP (single group) and VP (multiple groups) cases.

2. **`/api/stream/dashboard/route.ts` gains a scope-resolution step**, right after the existing auth check:
   - Call `getManagerScope(userId, token)` (`src/lib/manager-scope.ts`, already built).
   - `{tier: "none"}` → no filter; behavior is byte-for-byte identical to today.
   - `{tier: "direksi", companyCode}` → company list is `[companyCode]` directly, no extra call.
   - `{tier: "avp", wilayahCode}` → one call to `CodesByGroups` with `[wilayahCode]`.
   - `{tier: "vp", wilayahCodes}` → one call to `CodesByGroups` with all of `wilayahCodes` (already resolved by `getManagerScope`'s vp branch).
   - The resulting company list is appended as a `companies=` query param to all 9 `aspnetFetchServer` calls to `Home/*`.

3. **Each of the 9 `HomeController` methods** gets an optional `string companies` parameter (comma-separated). When present, add `.Where(x => companyCodes.Contains(x.company_code))` (or the equivalent join, depending on the query) to that endpoint's underlying LINQ query. When absent, behavior is unchanged (today's global aggregate) — this keeps every other caller/role unaffected.

4. **Small UI addition** — a one-line badge on the dashboard (e.g. "Menampilkan data: Wilayah Sumbagut" / "Direksi — PKG") so a scoped user understands why their numbers differ from a colleague's. Implemented as a tiny addition to `DashboardViewerClient.tsx`, sourced from the same scope-resolution call (VP's badge uses the `VpRegion.Name`, fetched alongside the wilayah-code list, not a raw code list).

## Safety / edge cases

- **Empty-scope must never mean unfiltered.** If `tier != "none"`, the `companies` param is *always* sent to every `Home/*` endpoint, even if the resolved list is empty (e.g. a misconfigured wilayah with zero tagged companies). An empty `companies` param means "match nothing," never "no filter" — this must be explicit in both the Next.js param-building logic and the ASP.NET `.Where` clause (an empty `Contains` list correctly matches zero rows in LINQ, so this falls out naturally as long as the param is always passed once scoped).
- Users with no `ManagerScope` row: completely unaffected, byte-for-byte identical response to today.
- If `getManagerScope()` or `CodesByGroups` fails (network/backend error), fail closed: treat as empty-scope (zero data), not as global/unfiltered — never let an error silently widen access.

## Testing (manual — no automated test runner in this repo)

1. Assign a test user each tier (avp/vp/direksi) via `/superadmin/settings/manager-scope`.
2. Log in as each; confirm dashboard numbers/charts only include their scoped company(ies) — cross-check against the same period's superadmin (unscoped) view.
3. Confirm a user with no `ManagerScope` still sees the full global dashboard, unchanged.
4. Confirm the empty-scope edge case shows zero data, not global data.
5. Confirm the scope badge shows the right label for all three tiers.

## Explicitly out of scope

- Changing anything about how non-scoped users (the vast majority) see the dashboard.
- A separate route/menu entry — this is fully automatic based on `ManagerScope` presence (per prior confirmation in this design session).
- Historical/report views beyond what `ViewerDashboard` already shows — this only threads scope through the existing dashboard, not new report pages.
