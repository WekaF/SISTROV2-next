# Tiket Search Slow Query Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the root cause of slow ticket search on `/admin/tickets` and `/tiket` — the default date-range filter is computed but never applied, so every search scans the full 1M+ row `Tiket` table instead of a bounded recent window.

**Architecture:** Both pages call the same ASP.NET backend endpoint, `TiketController.DataTableFilterLegacy` in `sistropigroup`. The endpoint already computes a sensible default date range (`startdate`/`enddate`) when the caller omits `SD`/`ED`, but a leftover `string.IsNullOrEmpty(SD) ||` / `string.IsNullOrEmpty(ED) ||` guard makes that computed default dead code — the date predicate always evaluates to `true` when `SD`/`ED` are absent, so the query never restricts by date. Removing the two dead guards makes the already-computed defaults take effect, cutting the scanned row set from ~1.03M rows (5 years) to ~30K rows (trailing 3 months) for the common case, with zero behavior change for the one caller (`posto` drill-down) that already sends `SD` explicitly.

**Tech Stack:** ASP.NET Framework 4.5 (Web API 2), Entity Framework 6, SQL Server (`SISTROSTAGING` for dev/staging verification), MSBuild for build verification (MSTest discovery is broken in this environment — see repo memory — so verification is build success + hand-traced SQL evidence, not an automated test run).

**Repo for the code change:** `C:\Users\weka\Indigo\sistropigroup` (NOT this repo — this repo, `SISTROV2-next`, is the Next.js frontend that calls the buggy endpoint but contains no bug itself).

---

## Root cause evidence (already gathered — do not re-derive, just confirm baseline in Task 1)

1. **Both slow pages hit the same endpoint.** `src/app/tiket/page.tsx:52` and `src/app/admin/tickets/page.tsx:206` both call `/api/Tiket/DataTableFilterLegacy` (proxied via `next.config.ts` rewrite to the ASP.NET backend). Neither page sends `SD`/`ED` params (only the POSTO drill-down variant of `/tiket` sends `SD: "2020-01-01"`).

2. **The endpoint computes a default date range, then never applies it.** `TiketController.cs:3667-3686`:
   ```csharp
   string SD = Request["SD"] ?? Request.Form["SD"] ?? Request.QueryString["SD"];
   string posto = Request["posto"] ?? Request.Form["posto"] ?? Request.QueryString["posto"];
   ...
   DateTime startdate;
   if (!DateTime.TryParse(SD, out startdate))
   {
       // Relax date filter if searching for a specific POSTO
       startdate = string.IsNullOrEmpty(posto) ? DateTime.Today.AddMonths(-3) : new DateTime(2020, 1, 1);
   }

   string ED = Request["ED"] ?? Request.Form["ED"] ?? Request.QueryString["ED"];
   DateTime enddate;
   if (!DateTime.TryParse(ED, out enddate))
   {
       enddate = DateTime.Today.AddDays(7);
   }
   enddate = enddate.Date.AddDays(1).AddTicks(-1);
   ```
   But the `Where` clause at `TiketController.cs:3753-3754` guards the predicate on `SD`/`ED` being non-empty — which they never are for these two pages:
   ```csharp
   (string.IsNullOrEmpty(SD) || x.tanggal >= startdate) &&
   (string.IsNullOrEmpty(ED) || x.tanggal <= enddate) &&
   ```
   Since `SD`/`ED` are always empty for both pages, `string.IsNullOrEmpty(SD)` is always `true`, so the whole `||` term is always `true` — the computed `startdate`/`enddate` are silently discarded. Same query also runs the full `Where` a **second** time for `datasearch.Count()` at `TiketController.cs:3851`, doubling the scan cost.

3. **Measured against the live `SISTROSTAGING` database** (`192.168.188.29,7869`, read-only `sqlcmd`):
   - `Tiket` table has **1,031,660 rows** spanning **2021-08-23 to 2026-07-22** (~5 years).
   - Rows in the last 3 months (the intended default): **30,110** — 2.9% of the table.
   - No index exists on `nopol` or `driver` (the two columns the search box filters on) — confirmed via `sys.indexes`. A plain `LIKE '%term%'` substring search on either column can never seek, only scan, regardless of the row count — so bounding the row count is the lever that matters, not adding an index (a leading-wildcard search can't use one anyway).
   - Bare `SELECT COUNT(*) FROM Tiket WHERE LOWER(nopol) LIKE '%b9%' OR LOWER(driver) LIKE '%b9%'` over the **full unbounded table**: 811ms CPU / 403ms elapsed, 64,940 logical reads.
   - Same query **with the 3-month date bound added**: 251ms CPU / 111ms elapsed — same logical reads (still a full scan of the base table since there's no covering index for this predicate combination), but ~3.6x less CPU/elapsed because far fewer rows survive to the expensive string-comparison stage. This is a conservative floor: the real endpoint also joins 6-7 tables (`Kuota4Shift.Kuota3Bagian`, `Posto1.Gudang`, `Posto1.Gudang1`, `Transport`, `Produk`, `Antrian.Gudang_SPPT`, `M_Status1`) whose join fan-out scales with the number of rows that pass the `WHERE`, so the real-world win from cutting 1.03M → 30K matched rows is expected to be substantially larger than this base-table-only measurement — this part is inferred, not measured, since reproducing the full EF-generated join plan by hand was out of scope for baseline verification.

4. **Scope decision — what this plan does NOT touch:** the identical `string.IsNullOrEmpty(SD) || x.tanggal >= startdate` bug pattern also exists at 6 other call sites in `TiketController.cs` (`DataReport`, `DataTiket` mobile endpoint, legacy `DataTable`, `DataTableMonitorPosition`, `DashboardTiket`, `DashboardTiketAnper`) and in unrelated controllers (`KuotaLevel1Controller`, `KuotaLevel4Controller`, `WtcController`, `ReportWtcController`). These were found via `grep` but **not verified** — some (like `DataReport`) may intentionally default to unbounded for full-history report exports, and none were reported as slow. Fixing them blind risks silently changing report semantics an admin relies on. They are listed here so they're not lost, but are explicitly out of scope for this plan — flag to the user as a candidate follow-up, don't fix without confirming each site's intended behavior first.

---

## Task 1: Confirm baseline against the target endpoint's actual query shape

**Files:** none (read-only verification via `sqlcmd`, no code touched yet)

- [ ] **Step 1: Re-confirm row counts haven't drifted since the investigation above**

Run:
```bash
"/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn/sqlcmd" -S 192.168.188.29,7869 -d SISTROSTAGING -U usr_sistro_dev -P 'Si$tr0@Pupuk1!_d3v' -Q "SET NOCOUNT ON; SELECT COUNT(*) AS TotalRows FROM Tiket; SELECT COUNT(*) AS Last3Months FROM Tiket WHERE tanggal >= DATEADD(month,-3,GETDATE());" -W
```
Expected: `TotalRows` close to 1,031,660 (grows daily, fine if slightly higher). `Last3Months` close to 30,110 and much smaller than `TotalRows` — confirms the date bound is still the high-leverage lever before touching code.

- [ ] **Step 2: Confirm the two frontend pages still omit `SD`/`ED`**

```bash
grep -n "SD" "c:/Users/weka/Indigo/SISTROV2-next/src/app/admin/tickets/page.tsx"
grep -n "SD" "c:/Users/weka/Indigo/SISTROV2-next/src/app/tiket/page.tsx"
```
Expected: no match in `admin/tickets/page.tsx`; the only match in `tiket/page.tsx` is `SD: postoFilter ? "2020-01-01" : undefined` (line 64) — i.e. `SD` is only ever sent when `postoFilter` is set. If this has changed (e.g. someone already added a date param), stop and re-investigate before proceeding — the fix below assumes both pages currently send no `SD`/`ED` in the default (non-posto) case.

## Task 2: Remove the dead date-filter guard in `DataTableFilterLegacy`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs:3753-3754`

- [ ] **Step 1: Make the change**

Current code (`TiketController.cs:3745-3766`, showing the two lines to change in context):
```csharp
                var datasearch = db.Tiket
                    .Include(x => x.Kuota4Shift.Kuota3Bagian)
                    .Include(x => x.Posto1.Gudang)
                    .Include(x => x.Posto1.Gudang1)
                    .Include(x => x.Transport)
                    .Include(x => x.Produk)
                    .Include(x => x.Antrian.Gudang_SPPT)
                    .Include(x => x.M_Status1)
                    .Where(x =>
                    (isTransport ? x.updatedby.ToLower() == namauser.ToLower()
                        : (isSecurity || isTimbangan || isGudang) ? x.position != "0"
                        : (bypassCompanyFilter || string.IsNullOrEmpty(effectiveCompanyCode) || listbagian.Contains(x.Kuota4Shift.Kuota3Bagian.bagian) || x.Kuota4Shift.Kuota3Bagian.bagian == "CHARTER")
                    ) &&
                    (!isTransport ? (bypassCompanyFilter || string.IsNullOrEmpty(effectiveCompanyCode) || x.Posto1.company_code.ToLower() == effectiveCompanyCode.ToLower()) : x.updatedby.ToLower() == namauser.ToLower()) &&
                    (string.IsNullOrEmpty(posto) || x.Posto1.guid == posto || x.Posto1.noposto == posto) &&
                    (string.IsNullOrEmpty(produk) || x.idproduk == produk) &&
                    (string.IsNullOrEmpty(SD) || x.tanggal >= startdate) &&
                    (string.IsNullOrEmpty(ED) || x.tanggal <= enddate) &&
                    (string.IsNullOrEmpty(mode) || x.position != "00" && x.position != "07") &&
```

Change lines 3753-3754 from:
```csharp
                    (string.IsNullOrEmpty(SD) || x.tanggal >= startdate) &&
                    (string.IsNullOrEmpty(ED) || x.tanggal <= enddate) &&
```
to:
```csharp
                    // SD/ED already fold to a sane default (trailing 3 months, or 2020-01-01
                    // for a POSTO drill-down) above when the caller omits them — always apply
                    // startdate/enddate rather than skipping the filter on empty SD/ED, or every
                    // search scans the full multi-year Tiket table instead of a bounded window.
                    x.tanggal >= startdate &&
                    x.tanggal <= enddate &&
```

- [ ] **Step 2: Verify no other logic in this method reads `SD`/`ED` as raw strings in a way this change would break**

```bash
grep -n '\bSD\b\|\bED\b' "C:/Users/weka/Indigo/sistropigroup/SISTROAWESOME/api/TiketController.cs" | awk -F: '$1 >= 3654 && $1 <= 3871'
```
Expected: `SD`/`ED` only appear in the lines already read above (parsing into `startdate`/`enddate`, the `startdate`/`posto` relax-on-posto comment, and the two lines just changed). No other reference exists in this method that depends on `SD`/`ED` staying as raw strings.

## Task 3: Build and confirm zero compile errors

**Files:** none (build verification only)

- [ ] **Step 1: Build via MSBuild**

Per this repo's established convention (`vstest.console.exe` test discovery is broken in this environment — MSBuild build success is the pass/fail signal here, not a test run):
```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)` in the build summary. If errors appear, they are almost certainly a typo in Task 2's edit (e.g. stray parenthesis from removing the `string.IsNullOrEmpty(...) ||` wrapper) — fix and rebuild before continuing.

## Task 4: Verify the fix's effect against the live endpoint

**Files:** none (runtime verification only)

- [ ] **Step 1: Start the local backend + frontend**

```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```
This starts IIS Express on port 8090 (local backend, now running the fixed code) and the Next.js dev server.

- [ ] **Step 2: Compare recordsTotal before vs after via direct API call**

With the app running, call the endpoint directly the same way `admin/tickets/page.tsx` does (no `SD`/`ED`), using a real session cookie from a logged-in browser tab (open `http://localhost:3000/admin/tickets` first, then copy the `next-auth.session-token` cookie for this curl call — this endpoint requires auth):
```bash
curl -s -X POST "http://localhost:8090/api/Tiket/DataTableFilterLegacy" \
  -H "Cookie: <paste session cookie>" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "draw=1&start=0&length=10&search[value]=&companyCode=&cmd=refresh&order[0][column]=2&order[0][dir]=desc&columns[0][name]=bookingno&columns[1][name]=posto&columns[2][name]=tanggal&columns[3][name]=idshift&columns[4][name]=nopol&columns[5][name]=driver&columns[6][name]=idproduk&columns[7][name]=idtransport&columns[8][name]=qty&columns[9][name]=positionString&columns[10][name]=position&columns[11][name]=id" \
  -w "\ntime_total: %{time_total}s\n"
```
Expected: `recordsTotal` in the JSON response is now bounded to roughly the last-3-months count (order of magnitude ~10K-30K depending on `companyCode` filter), not ~1,000,000+. `time_total` should be visibly lower than a pre-fix run (if you want a direct before/after on this exact call, stash the Task 2 change with `git stash`, rebuild, run this same curl, note the time and `recordsTotal`, then `git stash pop` and rebuild again).

- [ ] **Step 3: Manual browser smoke test on both affected pages**

Open `http://localhost:3000/tiket` and `http://localhost:3000/admin/tickets`. For each:
- Confirm the ticket list loads and renders rows.
- Type a plate number or booking number fragment into the search box, confirm results return and the table updates.
- Confirm no console errors in devtools.

This confirms the narrowed date window didn't break rendering — it does NOT confirm search speed against the deployed `sistro-dev.pupuk-indonesia.com` backend, since local IIS Express against `SISTROSTAGING` has different data volume/latency than whatever server backs the Vercel-deployed frontend. Note this gap explicitly when reporting back — the fix is proven against local + `SISTROSTAGING`, not yet against whatever database backs `sistro-dev.pupuk-indonesia.com`.

## Task 5: Commit

**Files:**
- `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs`

- [ ] **Step 1: Commit in the `sistropigroup` repo (NOT this repo)**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && git add SISTROAWESOME/api/TiketController.cs && git commit -m "$(cat <<'EOF'
fix: apply default date-range filter in DataTableFilterLegacy

SD/ED were parsed into a sensible default (trailing 3 months, or full
history for a POSTO drill-down) but the Where clause guarded that
default behind IsNullOrEmpty(SD)/IsNullOrEmpty(ED), which is always
true for the two frontend pages that never send SD/ED. Every ticket
search was scanning the full ~1M-row Tiket table (5 years of history)
instead of the intended bounded window.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 2: Flag the deploy gap to the user**

This fix lives in `sistropigroup`, a separate repo/deploy target from `SISTROV2-next`. The Vercel-hosted frontend at `sistrov2-next.vercel.app` talks to `https://sistro-dev.pupuk-indonesia.com` (per `SISTROV2-next/.env.local`), not the local IIS Express instance this plan built and tested against. Deploying `TiketController.cs` to that server is a manual step outside this repo's tooling — confirm with the user how that backend gets deployed (IIS publish, CI pipeline, etc.) before considering this done end-to-end.

---

## Self-review notes

- **Spec coverage:** the reported symptom (slow search on both URLs) traces to one shared endpoint and one two-line root cause; Task 2 fixes it, Tasks 1/4 provide before/after evidence, Task 3 is the build gate this codebase substitutes for a test run.
- **No placeholders:** every step has literal file paths, literal line numbers, literal before/after code, and literal commands with expected output.
- **Scope boundary:** the plan explicitly documents and excludes the 6 other same-pattern sites in `TiketController.cs` plus the 4 sites in unrelated controllers — found, not fixed, flagged for a separate decision.
