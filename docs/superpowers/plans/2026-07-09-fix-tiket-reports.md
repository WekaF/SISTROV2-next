# Fix Tiket & Reports QA Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 QA findings on ticket pages: a stale page header, a silently-hidden report failure, confusion about what "Checkout SPPT" means, and slow loading on the "Resume Transit" page.

**Architecture:** One frontend-only fix (header text) and one frontend clarification (tooltip) in `SISTROV2-next`. Two fixes require the ASP.NET backend (`sistropigroup/SISTROAWESOME/api/TiketController.cs` and `ResumeApiController.cs`).

**Tech Stack:** Next.js 16 / React / TypeScript on the frontend; ASP.NET Framework 4.5 / Entity Framework / `System.Runtime.Caching` on the backend.

**No test runner exists in this repo.** Verification steps use `rtk tsc --noEmit`, `rtk lint`, and manual checks against `npm run dev:local` plus the running backend.

---

## Task 1: Rename "Daftar Tiket Saya" to "Daftar Tiket Gudang"

QA finding #37. Confirmed at `src/app/tiket/page.tsx:228`.

**Files:**
- Modify: `src/app/tiket/page.tsx:228`

- [ ] **Step 1: Read current header**

```bash
rtk read src/app/tiket/page.tsx 224 232
```

- [ ] **Step 2: Change the header text**

Change:
```tsx
{postoFilter ? "Riwayat Lengkap POSTO" : "Daftar Tiket Saya"}
```
to:
```tsx
{postoFilter ? "Riwayat Lengkap POSTO" : "Daftar Tiket Gudang"}
```

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Open `/tiket` without a `posto` query param and confirm the page header now reads "Daftar Tiket Gudang".

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/tiket/page.tsx
rtk git commit -m "fix: rename tiket page header to 'Daftar Tiket Gudang'"
```

---

## Task 2: Fix "Laporan Tiket" silently returning no data on backend errors

QA finding #35: "menu laporan tiket = gagal ambil data tiket". Investigation traced this to `sistropigroup/SISTROAWESOME/api/TiketController.cs`, the `DashboardTiket` action's catch block (around line 5914-5917):
```csharp
            catch (Exception ex)
            {
                return Json((object)ex.ToString());
            }
```
This returns **HTTP 200** with the raw exception text as the entire response body — not the `{ data, draw, recordsTotal, recordsFiltered }` shape the frontend expects, and not an error status. The Next.js proxy route `src/app/api/tiket/report-pi/route.ts` and the report page `src/app/reports/tiket-pi/page.tsx` already correctly check `if (!res.ok) throw ...` and show a "Gagal memuat data" toast — but because the backend always answers 200, that check never fires, and the page just renders an empty table silently swallowing the real error. Any row where a related entity is unexpectedly null (e.g. `x.Posto1.Gudang.ID`, `x.Kuota4Shift.shift`, `x.Transport.nama` — all accessed without a null check in the `Select` projection at lines 5874-5902) can trigger this.

Fix: return a real error status from the backend so the frontend's existing error handling actually engages. No frontend change is needed — the frontend is already correct.

**Files:**
- Modify: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` (the `DashboardTiket` action's catch block, ~line 5914-5917)

- [ ] **Step 1: Locate the catch block**

```bash
grep -n "return Json((object)ex.ToString());" SISTROAWESOME/api/TiketController.cs
```
(run inside `sistropigroup`) — this pattern appears in multiple actions in this controller; confirm you're editing the one inside the `DashboardTiket` method (the one whose `try` block builds the `TiketView` projection with `tanggalPOSTO`/`qtyPOSTO`/`asal`/`tujuan` fields, matching lines 5874-5902 above) — not a different action's identical-looking catch block.

- [ ] **Step 2: Return a proper error status**

Change:
```csharp
            catch (Exception ex)
            {
                return Json((object)ex.ToString());
            }
```
to:
```csharp
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, ex.ToString());
            }
```
(`System.Net.HttpStatusCode` should already be in scope in this file — confirm via existing `using System.Net;` at the top; other actions in this controller already use `HttpStatusCode` values, e.g. `Content(HttpStatusCode.OK, ...)`)

- [ ] **Step 3: Build the backend**

Open `sistropigroup/SISTROAWESOME.sln` in Visual Studio (or run `msbuild`) and confirm `TiketController.cs` compiles with no errors.

- [ ] **Step 4: Manual verify**

With the backend running, find or create a ticket whose related data would trigger the projection to throw (or temporarily add a throw in a test branch to confirm the wiring), open `/reports/tiket-pi`, and confirm a "Gagal memuat data" toast now appears with the real error text instead of a silently empty table. Then confirm the happy path still works: filter for a normal date range with valid data and confirm rows render.

- [ ] **Step 5: Commit**

```bash
git add SISTROAWESOME/api/TiketController.cs
git commit -m "fix: return real error status from DashboardTiket so report page surfaces failures"
```
(run inside `sistropigroup`, not this repo)

---

## Task 3: Clarify what "Checkout SPPT" means in Laporan Tiket PI

QA finding #34: "posisi checkout SPPT apa?" (what does the Checkout SPPT position mean?). Investigation found `"Checkout SPPT"` (value `"06"`) is a real, selectable filter option in `src/app/reports/tiket-pi/page.tsx:65` (`POSITIONS` array), but tracing the backend ticket state machine (`sistropigroup/SISTROAWESOME/api/TiketController.cs`) shows position `"06"` has no dedicated timestamp column of its own — entering it (transition `05 → 06`, e.g. lines 1764-1770) reuses the `timeisi` ("Timbang Isi") timestamp, and leaving it (transition `06 → 07`, e.g. lines 1693-1699) is what sets `timeout` ("Checkout Security"). So "Checkout SPPT" is a real, intentional intermediate checkpoint in the flow, not a bug — it just doesn't have its own column to show in the report, which is why QA couldn't find where its timestamp lives. Fix: explain this in the UI instead of leaving it unexplained.

**Files:**
- Modify: `src/app/reports/tiket-pi/page.tsx` (POSITIONS filter, around line 57-67)

- [ ] **Step 1: Read the current filter block**

```bash
rtk read src/app/reports/tiket-pi/page.tsx 285 300
```

- [ ] **Step 2: Add a tooltip next to the Posisi filter label**

Find the `<Label>` for the position filter (the one whose `<select>` maps over `POSITIONS`, around line 296) and add an inline help icon next to it, reusing the shared `Tooltip` component (`src/components/ui/tooltip.tsx`):
```tsx
<div className="flex items-center gap-1">
  <Label className="text-xs">Posisi</Label>
  <Tooltip>
    <TooltipTrigger>
      <HelpCircle className="w-3 h-3 text-muted-foreground" />
    </TooltipTrigger>
    <TooltipContent>
      &quot;Checkout SPPT&quot; adalah checkpoint antara Timbang Isi dan Checkout Security —
      tidak punya timestamp sendiri, waktunya sama dengan Timbang Isi saat armada masuk
      posisi ini.
    </TooltipContent>
  </Tooltip>
</div>
```
(replace whatever the existing label wrapper is around the Posisi `<select>` with this, keeping the `<select>` itself unchanged)

- [ ] **Step 3: Add the tooltip imports**

At the top of `src/app/reports/tiket-pi/page.tsx`, if not already present, add:
```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
```

- [ ] **Step 4: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 5: Manual verify**

Open `/reports/tiket-pi`, hover/focus the help icon next to "Posisi", confirm the tooltip explains that Checkout SPPT shares its timestamp with Timbang Isi.

- [ ] **Step 6: Commit**

```bash
rtk git add src/app/reports/tiket-pi/page.tsx
rtk git commit -m "fix: explain what 'Checkout SPPT' position means in Laporan Tiket PI"
```

---

## Task 4: Speed up "Resume Transit" by caching the external traffic API call

QA finding #36 (confirmed: performance issue, per user decision). Investigation found `sistropigroup/SISTROAWESOME/api/ResumeApiController.cs`'s `Summary()` and `DetailStatus()` actions (lines 20-130) both call `GetTrafficTiket()` on every single request, which in turn calls `FetchTrafficFromExternalApi()` (lines 132-164) — a live HTTPS call to `https://dpcs.pupuk-indonesia.com/v2/api/kabupaten/flag/all` with a 5-second timeout, made fresh every time, with **no caching**. The frontend (`src/app/resume-transit/ResumeTransitClient.tsx:165`) polls `Summary` every 30 seconds, and any open `DetailStatus` drill-down polls too — so under normal use, this external endpoint gets hit repeatedly by every connected user, each paying up to 5 seconds of latency if the external API is slow, even though the traffic-flag data barely changes between polls. Fix: cache the external API's result server-side for a short TTL so most polls are served from memory instead of making a live external call.

**Files:**
- Modify: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\ResumeApiController.cs`

- [ ] **Step 1: Read the current fetch method**

```bash
grep -n "FetchTrafficFromExternalApi" -A 35 SISTROAWESOME/api/ResumeApiController.cs
```
(run inside `sistropigroup`)

- [ ] **Step 2: Add a short-TTL in-memory cache around the external call**

At the top of `ResumeApiController.cs`, add the needed using statement (if not already present):
```csharp
using System.Runtime.Caching;
```

Replace:
```csharp
        private async Task<List<TrafficView>> FetchTrafficFromExternalApi()
        {
            try
            {
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    client.BaseAddress = new Uri("https://dpcs.pupuk-indonesia.com/v2/api/");
                    client.DefaultRequestHeaders.Clear();

                    var response = await client.GetAsync("kabupaten/flag/all");
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        return JsonConvert.DeserializeObject<List<TrafficView>>(json) ?? new List<TrafficView>();
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("DPCS API Kabupaten Flag Fetch Exception: " + ex.Message);
            }

            // Fallback mock data when external API is unreachable/offline
            return new List<TrafficView>
            {
                new TrafficView { produk = "P01", kab_kode = "3525", kab_nama = "GRESIK", status = "hijau" },
                new TrafficView { produk = "P02", kab_kode = "3525", kab_nama = "GRESIK", status = "hijau" },
                new TrafficView { produk = "P01", kab_kode = "3578", kab_nama = "SURABAYA", status = "kuning" },
                new TrafficView { produk = "P02", kab_kode = "3578", kab_nama = "SURABAYA", status = "biru" },
                new TrafficView { produk = "P01", kab_kode = "3515", kab_nama = "SIDOARJO", status = "merah" }
            };
        }
```
with:
```csharp
        private const string TrafficCacheKey = "ResumeApi_TrafficFlags";
        private static readonly TimeSpan TrafficCacheTtl = TimeSpan.FromSeconds(30);

        private async Task<List<TrafficView>> FetchTrafficFromExternalApi()
        {
            var cached = MemoryCache.Default.Get(TrafficCacheKey) as List<TrafficView>;
            if (cached != null)
            {
                return cached;
            }

            List<TrafficView> result;
            try
            {
                using (var client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(5);
                    client.BaseAddress = new Uri("https://dpcs.pupuk-indonesia.com/v2/api/");
                    client.DefaultRequestHeaders.Clear();

                    var response = await client.GetAsync("kabupaten/flag/all");
                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        result = JsonConvert.DeserializeObject<List<TrafficView>>(json) ?? new List<TrafficView>();
                    }
                    else
                    {
                        result = FallbackTrafficData();
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("DPCS API Kabupaten Flag Fetch Exception: " + ex.Message);
                result = FallbackTrafficData();
            }

            MemoryCache.Default.Set(TrafficCacheKey, result, DateTimeOffset.Now.Add(TrafficCacheTtl));
            return result;
        }

        private static List<TrafficView> FallbackTrafficData()
        {
            // Fallback mock data when external API is unreachable/offline
            return new List<TrafficView>
            {
                new TrafficView { produk = "P01", kab_kode = "3525", kab_nama = "GRESIK", status = "hijau" },
                new TrafficView { produk = "P02", kab_kode = "3525", kab_nama = "GRESIK", status = "hijau" },
                new TrafficView { produk = "P01", kab_kode = "3578", kab_nama = "SURABAYA", status = "kuning" },
                new TrafficView { produk = "P02", kab_kode = "3578", kab_nama = "SURABAYA", status = "biru" },
                new TrafficView { produk = "P01", kab_kode = "3515", kab_nama = "SIDOARJO", status = "merah" }
            };
        }
```

Note: the cache TTL (30s) is deliberately set to match the frontend's own poll interval (`ResumeTransitClient.tsx:165`) — this means at most one live external call per 30-second window server-wide, instead of one per connected client per poll. Fallback/mock data is now also cached for the same TTL rather than re-attempting the slow external call on every single failed request, so an outage doesn't cause every poll to eat the full 5-second timeout.

- [ ] **Step 3: Build the backend**

Open `sistropigroup/SISTROAWESOME.sln` in Visual Studio (or run `msbuild`) and confirm `ResumeApiController.cs` compiles. If `System.Runtime.Caching` isn't already referenced by the project, add the assembly reference (it ships with .NET Framework, no NuGet package needed).

- [ ] **Step 4: Manual verify**

With the backend running, open `/resume-transit`, open browser devtools Network tab, and confirm repeated `GET /api/ResumeApi/Summary` calls (30s apart) resolve quickly and consistently — not intermittently slow. To specifically confirm caching kicks in, trigger two `Summary`/`DetailStatus` calls within the same 30-second window (e.g. open the page and immediately open a `DetailStatus` drill-down) and confirm the second call returns near-instantly (served from `MemoryCache`, no second external HTTP round-trip).

- [ ] **Step 5: Commit**

```bash
git add SISTROAWESOME/api/ResumeApiController.cs
git commit -m "perf: cache external traffic API response to avoid repeated slow calls on every poll"
```
(run inside `sistropigroup`, not this repo)

---

## Self-Review Notes

- Coverage: Task 1 → #37, Task 2 → #35, Task 3 → #34, Task 4 → #36. All 4 items in this cluster covered.
- QA finding #4 ("hubungi helpdesk diarahkan kemana?") was explicitly marked "sudah solve" (already resolved) by the user during planning and is intentionally excluded from this plan.
- Tasks 2 and 4 are both backend-only (`sistropigroup`) and independent of each other and of Tasks 1/3 — safe to execute in any order or in parallel.
