# Manager Scoped Simple Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AVP/VP/Direksi dashboard experience entirely — instead of the full `ViewerDashboard` (map, charts, leaderboard), role `manager` gets a simple KPI-stats-only dashboard (mirroring the existing `/manager` "Dashboard Pimpinan" page's card style), plus two report pages (Data Tiket, Antrian), all filtered to the exact company/companies their `ManagerScope` resolves to (1 company for direksi, N companies for avp/vp). Role `manager`'s sidebar menu is trimmed to exactly 3 items.

**Architecture:** Rather than retrofitting the shared, heavily-used, complex endpoints these existing pages currently call (`Tiket/DataTableFilterLegacy` is a ~200-line method with role-branching and transaction-isolation tuning used by many other callers; `Antrian/ReportHorizontalQ2` calls an external traffic API and builds rich truck cards), this plan adds **new, separate action methods** to the existing controllers (`CompanyDashboardController`, `AntrianController`, `TiketController`, `KuotaLevel4Controller`) that accept a comma-separated `companies` list instead of a single `companyCode`. The old single-company methods are untouched — zero risk to their other callers. New methods reuse existing private helpers (`BuildTruckCardQ2`, `ComputeTrafficColorQ2`, the `PosisiAntri`/`PosisiProses` static arrays) where the same controller already has them, so there's no logic duplication beyond wrapping in a company-list loop/filter.

On the Next.js side, three new/modified server-side proxy routes resolve the caller's `ManagerScope` (via `resolveScopeCompanies`, already built) into a company-code list, then call the corresponding new backend method — mirroring the exact pattern already proven in `src/app/api/stream/dashboard/route.ts`.

**Tech Stack:** ASP.NET Web API 2 / EF6 (backend, `SISTROAWESOME`), Next.js 16 App Router + NextAuth (frontend, `SISTROV2-next`).

---

## File Structure

| File | Responsibility |
|---|---|
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\CompanyDashboardController.cs` | Add `GetStatsMulti`, `GetManagerStatsMulti` — multi-company KPI + trend |
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\AntrianController.cs` | Add `ReportHorizontalQ2Multi` — multi-company antrian sections |
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` | Add `DataTableTiketMulti` — lean multi-company tiket list (only the 12 fields the manager page actually renders) |
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\KuotaLevel4Controller.cs` | Add `DataTableMulti` — multi-company kuota list |
| `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\manager\dashboard-stats\route.ts` | New proxy: resolves scope, calls `GetStatsMulti` + `GetManagerStatsMulti` |
| `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\manager\tiket-list\route.ts` | New proxy: resolves scope, calls `DataTableTiketMulti` |
| `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\manager\kuota-list\route.ts` | New proxy: resolves scope, calls `DataTableMulti` |
| `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\manager\antrian\route.ts` | New proxy: resolves scope, calls `ReportHorizontalQ2Multi` |
| `c:\Users\weka\Indigo\SISTROV2-next\src\app\manager\page.tsx` | Rewrite: simple KPI cards, scoped |
| `c:\Users\weka\Indigo\SISTROV2-next\src\app\manager\tiket\page.tsx` | Rewrite: same UI, points at new proxy routes |
| `c:\Users\weka\Indigo\SISTROV2-next\src\app\manager\antrian\page.tsx` | Rewrite: same UI, points at new proxy route, section names prefixed with company code when scope has >1 company |
| `c:\Users\weka\Indigo\SISTROV2-next\src\lib\menu-configs.tsx` | Trim `manager` nav to 3 items, remove Laporan |

**Out of scope (explicitly deferred):** `/manager/laporan` page itself is not touched (just removed from the nav — the route still exists if linked directly, but nothing routes to it after this plan).

---

## Task 1: `CompanyDashboardController` — multi-company stats + trend

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\CompanyDashboardController.cs`

- [ ] **Step 1: Add `GetStatsMulti`**

Add this method right after the existing `GetStats` method (which ends at line 146, just before `GetProdukFilter`):

```csharp
        [HttpGet]
        [Route("GetStatsMulti")]
        public IHttpActionResult GetStatsMulti(string companies)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(companies))
                    return BadRequest("companies wajib diisi");

                var companyCodes = companies.Split(',')
                    .Select(c => c.Trim())
                    .Where(c => !string.IsNullOrEmpty(c))
                    .ToList();

                if (companyCodes.Count == 0)
                    return BadRequest("companies wajib diisi");

                DateTime today    = DateTime.UtcNow.Date;
                DateTime tomorrow = today.AddDays(1);
                DateTime sevenDaysAgo = today.AddDays(-7);

                var tiketToday = db.Tiket
                    .Include("Antrian")
                    .Where(x => companyCodes.Contains(x.Posto1.company_code)
                                && x.tanggal >= today
                                && x.tanggal < tomorrow)
                    .ToList();

                int antriAktif = tiketToday.Count(x => PosisiAntri.Contains(x.position));
                int proses      = tiketToday.Count(x => PosisiProses.Contains(x.position));
                int selesai     = tiketToday.Count(x => PosisiSelesai.Contains(x.position));
                int cancel      = tiketToday.Count(x => PosisiCancel.Contains(x.position));

                double totalTonase = tiketToday
                    .Where(x => x.qty.HasValue)
                    .Sum(x => (double?)x.qty) ?? 0;

                var tiket7Days = db.Tiket
                    .Where(x => companyCodes.Contains(x.Posto1.company_code)
                                && x.tanggal >= sevenDaysAgo
                                && x.tanggal < tomorrow)
                    .ToList();
                int total7  = tiket7Days.Count;
                int cancel7 = tiket7Days.Count(x => PosisiCancel.Contains(x.position));
                double cancelRate = total7 > 0
                    ? Math.Round((double)cancel7 / total7 * 100, 1)
                    : 0;

                var selesaiWithDurasi = tiketToday
                    .Where(x => PosisiSelesai.Contains(x.position)
                                && x.timesec  != null
                                && x.timeout  != null)
                    .ToList();
                double avgDurasi = selesaiWithDurasi.Any()
                    ? selesaiWithDurasi.Average(x =>
                        (x.timeout.Value - x.timesec.Value).TotalMinutes)
                    : 0;

                var posisiAktif = new HashSet<string>(PosisiAntri.Concat(PosisiProses));
                var gudangBreakdown = tiketToday
                    .Where(x => posisiAktif.Contains(x.position ?? ""))
                    .GroupBy(x => (x.Antrian != null && !string.IsNullOrEmpty(x.Antrian.storageID))
                                  ? x.Antrian.storageID
                                  : "Antri Gate")
                    .Select(g => new { gudang = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .Take(8)
                    .ToList();

                DateTime twoHoursAgo = DateTime.UtcNow.AddHours(-2);
                int overdueCount = tiketToday.Count(x =>
                    posisiAktif.Contains(x.position ?? "")
                    && (x.timesec ?? x.updatedon) != null
                    && (x.timesec ?? x.updatedon) < twoHoursAgo);

                var shiftBreakdown = new
                {
                    pagi  = tiketToday.Count(x => { var t = x.timesec ?? x.updatedon; return t.HasValue && t.Value.Hour >= 6  && t.Value.Hour < 14; }),
                    siang = tiketToday.Count(x => { var t = x.timesec ?? x.updatedon; return t.HasValue && t.Value.Hour >= 14 && t.Value.Hour < 22; }),
                    malam = tiketToday.Count(x => { var t = x.timesec ?? x.updatedon; return t.HasValue && (t.Value.Hour >= 22 || t.Value.Hour < 6); })
                };

                return Ok(new
                {
                    companies = companyCodes,
                    antriAktif,
                    proses,
                    selesai,
                    cancel,
                    totalTonase    = Math.Round(totalTonase, 2),
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
```

- [ ] **Step 2: Add `GetManagerStatsMulti`**

Add this method right after the existing `GetManagerStats` method (which ends at line 396, just before `GetTopProduk`):

```csharp
        [HttpGet]
        [Route("GetManagerStatsMulti")]
        public IHttpActionResult GetManagerStatsMulti(string companies, string period = "today")
        {
            try
            {
                if (string.IsNullOrWhiteSpace(companies))
                    return BadRequest("companies wajib diisi");

                var companyCodes = companies.Split(',')
                    .Select(c => c.Trim())
                    .Where(c => !string.IsNullOrEmpty(c))
                    .ToList();

                if (companyCodes.Count == 0)
                    return BadRequest("companies wajib diisi");

                DateTime from, to;
                GetPeriodRange(period, out from, out to);

                var tiket = db.Tiket
                    .Where(x => companyCodes.Contains(x.Posto1.company_code)
                                && x.tanggal >= from && x.tanggal < to)
                    .Select(x => new { x.position, x.qty, x.tanggal, x.timesec, x.updatedon })
                    .ToList();

                int totalTiket  = tiket.Count;
                int realisasi   = tiket.Count(x => PosisiSelesai.Contains(x.position));
                int cancel      = tiket.Count(x => PosisiCancel.Contains(x.position));
                int aktif       = tiket.Count(x => PosisiAntri.Concat(PosisiProses).Contains(x.position));
                double tonase   = tiket.Where(x => x.qty.HasValue && PosisiSelesai.Contains(x.position))
                                       .Sum(x => (double?)x.qty) ?? 0;
                double rasio    = totalTiket > 0
                                  ? Math.Round((double)realisasi / totalTiket * 100, 1)
                                  : 0;

                DateTime twoHoursAgo = DateTime.UtcNow.AddHours(-2);
                var posisiAktifSet   = new HashSet<string>(PosisiAntri.Concat(PosisiProses));
                int overdue = tiket.Count(x =>
                    posisiAktifSet.Contains(x.position ?? "")
                    && (x.timesec ?? x.updatedon) != null
                    && (x.timesec ?? x.updatedon) < twoHoursAgo);

                var trend = tiket
                    .GroupBy(x => x.tanggal.HasValue ? x.tanggal.Value.Date : DateTime.MinValue)
                    .Where(g => g.Key != DateTime.MinValue)
                    .OrderBy(g => g.Key)
                    .Select(g => new
                    {
                        tanggal   = g.Key.ToString("dd/MM"),
                        total     = g.Count(),
                        selesai   = g.Count(x => PosisiSelesai.Contains(x.position)),
                        dibatalkan = g.Count(x => PosisiCancel.Contains(x.position))
                    })
                    .ToList();

                return Ok(new
                {
                    companies = companyCodes, period,
                    totalTiket, realisasi, cancel, aktif,
                    tonase    = Math.Round(tonase, 2),
                    rasio, overdue, trend,
                    generatedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex) { return InternalServerError(ex); }
        }
```

- [ ] **Step 3: Compile-check**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\amd64\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /nologo /v:quiet
echo "Exit code: $LASTEXITCODE"
```
Expected: `Exit code: 0`

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\weka\Indigo\sistropigroup"
git add SISTROAWESOME/api/CompanyDashboardController.cs
git commit -m "feat: add multi-company stats/trend endpoints for manager-scope dashboard"
```

---

## Task 2: `AntrianController` — multi-company antrian sections

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\AntrianController.cs`

- [ ] **Step 1: Add `ReportHorizontalQ2Multi`**

Add this method right after the existing `ReportHorizontalQ2` method (ends at line 786, just before `BuildPositionSectionQ2`). It reuses the exact same private helpers (`BuildTruckCardQ2`, `BuildPositionSectionQ2`) the single-company method already uses — no duplicated business logic, just looped per company with section names prefixed by company code when there's more than one company in scope.

```csharp
        [HttpGet]
        [Route("ReportHorizontalQ2Multi")]
        public async Task<IHttpActionResult> ReportHorizontalQ2Multi(string companies)
        {
            if (string.IsNullOrWhiteSpace(companies))
                return Content(HttpStatusCode.BadRequest, new { Success = false, message = "companies wajib diisi" });

            var companyCodes = companies.Split(',')
                .Select(c => c.Trim())
                .Where(c => !string.IsNullOrEmpty(c))
                .ToList();

            if (companyCodes.Count == 0)
                return Content(HttpStatusCode.BadRequest, new { Success = false, message = "companies wajib diisi" });

            try
            {
                System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12;
                var trafficData = await FetchTrafficDataApi();
                var today = DateTime.Today;
                bool multiCompany = companyCodes.Count > 1;

                var allSections = new List<object>();

                foreach (var company in companyCodes)
                {
                    var companyName = db.Company
                        .Where(x => x.company_code == company)
                        .Select(x => x.company1)
                        .FirstOrDefault() ?? company;
                    string prefix = multiCompany ? ("[" + company + "] ") : "";

                    var shifts = db.Mst_Shift.Where(x => x.company_code == company).OrderBy(x => x.shift).ToList();
                    foreach (var shift in shifts)
                    {
                        var trucks = db.Tiket
                            .Include("Produk")
                            .Include("Posto1.Gudang1")
                            .Where(x => x.Kuota4Shift.company_code == company
                                && x.statuspemuatan == "booking"
                                && x.Kuota4Shift.shift == shift.shift
                                && x.tanggal == today)
                            .ToList()
                            .Select(t => BuildTruckCardQ2(t, trafficData))
                            .ToList();

                        allSections.Add(new
                        {
                            id = company + "_shift_" + shift.shift,
                            name = prefix + "Shift " + shift.shift + " (" + shift.starttime?.ToString("HH:mm") + " - " + shift.endtime?.ToString("HH:mm") + ")",
                            type = "shift",
                            trucks
                        });
                    }

                    allSections.Add(PrefixSectionQ2(prefix, company, (object)BuildPositionSectionQ2("security_in", "Security In",
                        db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                            .Where(x => x.Kuota4Shift.company_code == company && x.position == "01" && x.tanggal <= today)
                            .OrderBy(x => x.nomor_antrian).ToList(), trafficData)));

                    allSections.Add(PrefixSectionQ2(prefix, company, (object)BuildPositionSectionQ2("security_out", "On Going Security Out",
                        db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                            .Where(x => x.Kuota4Shift.company_code == company && x.position == "06" && x.tanggal == today).ToList(),
                        trafficData)));

                    allSections.Add(PrefixSectionQ2(prefix, company, (object)BuildPositionSectionQ2("timbangan_in", "Jembatan Timbangan In",
                        db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                            .Where(x => x.Kuota4Shift.company_code == company && x.position == "02" && x.tanggal <= today).ToList(),
                        trafficData)));

                    allSections.Add(PrefixSectionQ2(prefix, company, (object)BuildPositionSectionQ2("timbangan_isi", "On Going Jembatan Timbang Out",
                        db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                            .Where(x => x.Kuota4Shift.company_code == company && x.position == "04" && x.tanggal == today).ToList(),
                        trafficData)));

                    var gudangs = db.Gudang_SPPT
                        .Where(x => x.company_code == company)
                        .Select(x => new { x.ID, x.deskripsi })
                        .OrderBy(x => x.deskripsi)
                        .ToList();

                    foreach (var gudang in gudangs)
                    {
                        var antrianTicketIds = db.Antrian
                            .Where(x => x.storageID == gudang.ID && x.timekosong != null && x.status == null && x.Tiket.position == "03")
                            .OrderBy(x => x.updatedon)
                            .Select(x => x.ticketID)
                            .ToList();

                        var gudangTrucks = db.Tiket
                            .Include("Produk")
                            .Include("Posto1.Gudang1")
                            .Where(x => antrianTicketIds.Contains(x.bookingno) && x.position == "03")
                            .ToList()
                            .Select(t => BuildTruckCardQ2(t, trafficData))
                            .ToList();

                        allSections.Add(new
                        {
                            id = company + "_gudang_" + gudang.ID,
                            name = prefix + (gudang.deskripsi ?? "Gudang"),
                            type = "gudang",
                            trucks = gudangTrucks
                        });
                    }
                }

                return Content(HttpStatusCode.OK, new
                {
                    Success = true,
                    companies = companyCodes,
                    date = today.ToString("yyyy-MM-dd"),
                    sections = allSections
                });
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { Success = false, message = ex.Message });
            }
        }

        // `BuildPositionSectionQ2` returns an anonymous-typed `{ id, name, type, trucks }` object —
        // this reflects over it to rebuild the same shape with `id`/`name` prefixed per company,
        // without needing a named type just for this one adjustment.
        private object PrefixSectionQ2(string prefix, string company, object section)
        {
            var t = section.GetType();
            var id = t.GetProperty("id").GetValue(section);
            var name = t.GetProperty("name").GetValue(section);
            var type = t.GetProperty("type").GetValue(section);
            var trucks = t.GetProperty("trucks").GetValue(section);
            return new { id = company + "_" + id, name = prefix + name, type, trucks };
        }
```

- [ ] **Step 2: Compile-check**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\amd64\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /nologo /v:quiet
echo "Exit code: $LASTEXITCODE"
```
Expected: `Exit code: 0`

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\weka\Indigo\sistropigroup"
git add SISTROAWESOME/api/AntrianController.cs
git commit -m "feat: add multi-company antrian sections endpoint for manager-scope dashboard"
```

---

## Task 3: `TiketController` — lean multi-company tiket list

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs`

This is a deliberately smaller, simpler endpoint than `DataTableFilterLegacy` — it only projects the 12 fields `src/app/manager/tiket/page.tsx`'s `TiketRow` interface actually uses (`number, bookingno, tiketno, tanggalString, nopol, driver, produkString, tujuan, qty, positionString, position, transportString, charter`), and only supports the params that page's `TiketTable` component actually sends (`draw`, `start`, `length`, `search[value]`, plus a `companies` filter) — no posto/produk/position/mode/SD/ED support, since the manager page never sends those.

- [ ] **Step 1: Add `DataTableTiketMulti`**

Add this method right after `DataTableFilterLegacy` ends (search for its closing brace — the method ends around line 3760, right before the next `[HttpGet]`/`[HttpPost]` attribute block):

```csharp
        [HttpGet]
        [Route("DataTableTiketMulti")]
        public JsonResult<object> DataTableTiketMulti(string companies)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(companies))
                    return Json((object)new { data = new object[0], draw = "1", recordsTotal = 0, recordsFiltered = 0, error = "companies wajib diisi" });

                var companyCodes = companies.Split(',')
                    .Select(c => c.Trim())
                    .Where(c => !string.IsNullOrEmpty(c))
                    .ToList();

                var Request = HttpContext.Current.Request;
                string drawStr   = Request["draw"] ?? "1";
                string startStr  = Request["start"] ?? "0";
                string lengthStr = Request["length"] ?? "25";
                string searchValue = Request["search[value]"];

                int start  = Convert.ToInt32(startStr);
                int length = Convert.ToInt32(lengthStr);
                if (length <= 0) length = 25;

                var datasearch = db.Tiket
                    .Include(x => x.Posto1.Gudang1)
                    .Include(x => x.Transport)
                    .Include(x => x.Produk)
                    .Include(x => x.M_Status1)
                    .Where(x => x.Posto1 != null && companyCodes.Contains(x.Posto1.company_code)
                        && (string.IsNullOrEmpty(searchValue) ||
                            x.Produk.Nama.ToLower().Contains(searchValue.ToLower()) ||
                            x.posto.Contains(searchValue.ToLower()) ||
                            x.bookingno.Contains(searchValue.ToLower()) ||
                            x.tiketno.Contains(searchValue.ToLower()) ||
                            x.Transport.nama.ToLower().Contains(searchValue.ToLower())
                        ))
                    .OrderByDescending(x => x.tanggal);

                int count = datasearch.Count();

                var dt = datasearch.Skip(start).Take(length).ToList().Select((x, i) => new
                {
                    number         = start + i + 1,
                    bookingno      = x.bookingno,
                    tiketno        = x.tiketno,
                    tanggalString  = String.Format("{0:dd MMMM yyyy}", x.tanggal),
                    nopol          = x.nopol,
                    driver         = x.driver,
                    produkString   = x.Produk != null ? x.Produk.Nama : "",
                    tujuan         = (x.Posto1 != null && x.Posto1.Gudang1 != null) ? (x.Posto1.Gudang1.Deskripsi ?? "") : "",
                    qty            = x.qty,
                    positionString = x.M_Status1 != null ? x.M_Status1.keterangan : "",
                    position       = x.position,
                    transportString = x.Transport != null ? x.Transport.nama : "",
                    charter        = x.Posto1 != null ? x.Posto1.charter : null
                }).ToList();

                return Json((object)new
                {
                    data = dt,
                    draw = drawStr,
                    recordsTotal = count,
                    recordsFiltered = count
                });
            }
            catch (Exception ex)
            {
                return Json((object)new { data = new object[0], draw = "1", recordsTotal = 0, recordsFiltered = 0, error = ex.Message });
            }
        }
```

- [ ] **Step 2: Compile-check**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\amd64\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /nologo /v:quiet
echo "Exit code: $LASTEXITCODE"
```
Expected: `Exit code: 0`

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\weka\Indigo\sistropigroup"
git add SISTROAWESOME/api/TiketController.cs
git commit -m "feat: add lean multi-company tiket list endpoint for manager-scope dashboard"
```

---

## Task 4: `KuotaLevel4Controller` — multi-company kuota list

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\KuotaLevel4Controller.cs`

- [ ] **Step 1: Add `DataTableMulti`**

Add this method right after the existing `DataTable()` method ends (around line 715, right before `DataforReschedule`):

```csharp
        [HttpGet]
        [Route("DataTableMulti")]
        public JsonResult<object> DataTableMulti(string companies)
        {
            if (string.IsNullOrWhiteSpace(companies))
                return Json((object)new { data = new object[0], draw = "1", recordsTotal = 0, recordsFiltered = 0, error = "companies wajib diisi" });

            var companyCodes = companies.Split(',')
                .Select(c => c.Trim())
                .Where(c => !string.IsNullOrEmpty(c))
                .ToList();

            var Request = HttpContext.Current.Request;
            int start = Convert.ToInt32(Request["start"] ?? "0");
            int length = Convert.ToInt32(Request["length"] ?? "25");
            if (length <= 0) length = 25;
            string searchValue = Request["search[value]"];

            var query = db.Kuota4Shift.AsNoTracking()
                .Where(x => companyCodes.Contains(x.company_code));

            if (!string.IsNullOrEmpty(searchValue))
            {
                query = query.Where(x => x.Produk.Nama.Contains(searchValue) ||
                                         x.Kuota3Bagian.Kuota2Wilayah.M_Wilayah.keterangan.Contains(searchValue) ||
                                         x.Kuota3Bagian.M_Bagian.keterangan.Contains(searchValue) ||
                                         x.AspNetUsers.fullname.Contains(searchValue));
            }
            else
            {
                var hariIni = DateTime.Now;
                var tanggalMulai = new DateTime(hariIni.AddMonths(-6).Year, hariIni.AddMonths(-6).Month, 1);
                var tanggalSelesai = hariIni.AddDays(6).Date.AddDays(1).AddTicks(-1);
                query = query.Where(x => x.tanggal >= tanggalMulai && x.tanggal <= tanggalSelesai);
            }

            int recordsFiltered = query.Count();

            var pagedData = query
                .OrderByDescending(x => x.tanggal)
                .Skip(start)
                .Take(length)
                .Select(x => new
                {
                    x.id,
                    x.guid,
                    x.tanggal,
                    x.idproduk,
                    ProdukNama = x.Produk.Nama,
                    x.kuota,
                    x.kuota_terpesan,
                    x.kuota_in,
                    x.kuota_out,
                    StatusKeterangan = x.M_Status.keterangan,
                    x.shift,
                    WilayahKeterangan = x.Kuota3Bagian.Kuota2Wilayah.M_Wilayah.keterangan,
                    BagianKeterangan = x.Kuota3Bagian.M_Bagian.keterangan
                })
                .ToList();

            var dt = pagedData.Select((x, i) => new
            {
                number         = start + i + 1,
                tanggalString  = String.Format("{0:dd MMMM yyyy}", x.tanggal),
                shift          = x.shift,
                namaproduk     = x.ProdukNama,
                kuota          = x.kuota,
                kuota_terpesan = x.kuota_terpesan,
                kuota_in       = x.kuota_in,
                kuota_out      = x.kuota_out,
                status         = x.StatusKeterangan,
                wilayahString  = x.WilayahKeterangan,
                bagianString   = x.BagianKeterangan
            }).ToList();

            return Json((object)new
            {
                data = dt,
                draw = Request["draw"],
                recordsTotal = recordsFiltered,
                recordsFiltered = recordsFiltered
            });
        }
```

- [ ] **Step 2: Compile-check**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\amd64\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /nologo /v:quiet
echo "Exit code: $LASTEXITCODE"
```
Expected: `Exit code: 0`

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\weka\Indigo\sistropigroup"
git add SISTROAWESOME/api/KuotaLevel4Controller.cs
git commit -m "feat: add multi-company kuota list endpoint for manager-scope dashboard"
```

---

## Task 5: Next.js proxy routes

**Files:**
- Create: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\manager\dashboard-stats\route.ts`
- Create: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\manager\tiket-list\route.ts`
- Create: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\manager\kuota-list\route.ts`
- Create: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\manager\antrian\route.ts`

All four follow the exact same pattern already proven in `src/app/api/stream/dashboard/route.ts`: resolve the session, resolve scope via `resolveScopeCompanies`, fail with a clear error if scope resolves to zero companies (unlike the main dashboard, these manager-only pages have no "global/unscoped" fallback — every caller here is expected to have a `ManagerScope`), then call the backend with the resolved `companies` list.

- [ ] **Step 1: `dashboard-stats/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { resolveScopeCompanies } from "@/lib/manager-scope";

function isManager(session: any): boolean {
  const groups: string[] = (session?.user as any)?.menuGroups || [];
  const single = (session?.user as any)?.menuGroup as string | undefined;
  return !!session?.user && (groups.includes("manager") || single === "manager");
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const userId = (session?.user as any)?.id as string;

    const scope = await resolveScopeCompanies(userId, token);
    if (!scope.companyCodes || scope.companyCodes.length === 0) {
      return NextResponse.json({ error: "Belum ada scope (wilayah/company) yang di-assign" }, { status: 403 });
    }
    const companies = scope.companyCodes.join(",");

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";

    const [statsRes, trendRes] = await Promise.all([
      aspnetFetchServer(`/api/CompanyDashboard/GetStatsMulti?companies=${encodeURIComponent(companies)}`, token),
      aspnetFetchServer(`/api/CompanyDashboard/GetManagerStatsMulti?companies=${encodeURIComponent(companies)}&period=${period}`, token),
    ]);

    if (!statsRes.ok) throw new Error(`Backend ${statsRes.status}: ${await statsRes.text().catch(() => statsRes.statusText)}`);
    if (!trendRes.ok) throw new Error(`Backend ${trendRes.status}: ${await trendRes.text().catch(() => trendRes.statusText)}`);

    return NextResponse.json({
      stats: await statsRes.json(),
      trend: await trendRes.json(),
      scopeLabel: scope.label,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: `tiket-list/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { resolveScopeCompanies } from "@/lib/manager-scope";

function isManager(session: any): boolean {
  const groups: string[] = (session?.user as any)?.menuGroups || [];
  const single = (session?.user as any)?.menuGroup as string | undefined;
  return !!session?.user && (groups.includes("manager") || single === "manager");
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const userId = (session?.user as any)?.id as string;

    const scope = await resolveScopeCompanies(userId, token);
    if (!scope.companyCodes || scope.companyCodes.length === 0) {
      return NextResponse.json({ data: [], draw: "1", recordsTotal: 0, recordsFiltered: 0 });
    }

    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams({
      companies: scope.companyCodes.join(","),
      draw: searchParams.get("draw") || "1",
      start: searchParams.get("start") || "0",
      length: searchParams.get("length") || "25",
    });
    const search = searchParams.get("search[value]");
    if (search) qs.set("search[value]", search);

    const res = await aspnetFetchServer(`/api/Tiket/DataTableTiketMulti?${qs.toString()}`, token);
    if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text().catch(() => res.statusText)}`);
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: `kuota-list/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { resolveScopeCompanies } from "@/lib/manager-scope";

function isManager(session: any): boolean {
  const groups: string[] = (session?.user as any)?.menuGroups || [];
  const single = (session?.user as any)?.menuGroup as string | undefined;
  return !!session?.user && (groups.includes("manager") || single === "manager");
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const userId = (session?.user as any)?.id as string;

    const scope = await resolveScopeCompanies(userId, token);
    if (!scope.companyCodes || scope.companyCodes.length === 0) {
      return NextResponse.json({ data: [], draw: "1", recordsTotal: 0, recordsFiltered: 0 });
    }

    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams({
      companies: scope.companyCodes.join(","),
      draw: searchParams.get("draw") || "1",
      start: searchParams.get("start") || "0",
      length: searchParams.get("length") || "25",
    });
    const search = searchParams.get("search[value]");
    if (search) qs.set("search[value]", search);

    const res = await aspnetFetchServer(`/api/KuotaLevel4/DataTableMulti?${qs.toString()}`, token);
    if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text().catch(() => res.statusText)}`);
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: `antrian/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { resolveScopeCompanies } from "@/lib/manager-scope";

function isManager(session: any): boolean {
  const groups: string[] = (session?.user as any)?.menuGroups || [];
  const single = (session?.user as any)?.menuGroup as string | undefined;
  return !!session?.user && (groups.includes("manager") || single === "manager");
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const userId = (session?.user as any)?.id as string;

    const scope = await resolveScopeCompanies(userId, token);
    if (!scope.companyCodes || scope.companyCodes.length === 0) {
      return NextResponse.json({ Success: true, companies: [], date: "", sections: [] });
    }

    const res = await aspnetFetchServer(
      `/api/Antrian/ReportHorizontalQ2Multi?companies=${encodeURIComponent(scope.companyCodes.join(","))}`,
      token
    );
    if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text().catch(() => res.statusText)}`);
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/manager/dashboard-stats src/app/api/manager/tiket-list src/app/api/manager/kuota-list src/app/api/manager/antrian
git commit -m "feat: add scoped proxy routes for manager dashboard/tiket/kuota/antrian"
```

---

## Task 6: Rewrite `/manager` (Dashboard Utama)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\manager\page.tsx`

Same KPI-card layout as the current page, but fetches from the new scoped proxy instead of the single-`companyCode` backend calls, and shows the scope label instead of a raw company code.

- [ ] **Step 1: Replace the whole file**

```typescript
"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Truck, CheckCircle, Ban, AlertTriangle, Clock, Layers, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Period = "today" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Hari Ini",
  week:  "7 Hari",
  month: "30 Hari",
};

interface GetStatsResult {
  antriAktif: number;
  proses: number;
  selesai: number;
  cancel: number;
  totalTonase: number;
  overdueCount: number;
  gudangBreakdown: { gudang: string; count: number }[];
  shiftBreakdown: { pagi: number; siang: number; malam: number };
}

interface ManagerStats {
  trend: { tanggal: string; total: number; selesai: number; dibatalkan: number }[];
}

function KpiCard({ label, value, sub, icon, highlight }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  highlight?: "green" | "red" | "yellow" | "blue" | "indigo";
}) {
  const colors: Record<string, string> = {
    green: "text-green-600 dark:text-green-450", red: "text-red-600 dark:text-red-450", yellow: "text-yellow-600 dark:text-yellow-450",
    blue: "text-blue-600 dark:text-blue-450", indigo: "text-indigo-600 dark:text-indigo-455",
  };
  const color = highlight ? colors[highlight] : "text-foreground dark:text-gray-100";
  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm transition-all duration-300">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground dark:text-gray-400 mb-1 truncate">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-muted dark:bg-gray-700 shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const { theme } = useTheme();

  const { data, isLoading } = useQuery<{ stats: GetStatsResult; trend: ManagerStats; scopeLabel: string | null }>({
    queryKey: ["manager-dashboard-stats", period],
    queryFn: async () => {
      const res = await fetch(`/api/manager/dashboard-stats?period=${period}`);
      if (!res.ok) throw new Error("Gagal memuat data dashboard");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const liveStats = data?.stats;
  const trendStats = data?.trend;

  const gudangOptions: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    colors: ["#6366f1"],
    dataLabels: { enabled: true, style: { fontSize: "11px" } },
    xaxis: { labels: { show: false } },
    tooltip: { y: { formatter: (v) => `${v} truk` } },
    grid: { show: false },
    theme: { mode: theme },
  };

  const gudangSeries = [{
    name: "Truk",
    data: liveStats?.gudangBreakdown.map(g => ({ x: g.gudang, y: g.count })) || [],
  }];

  const shiftOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut" },
    labels: ["Pagi (06–14)", "Siang (14–22)", "Malam (22–06)"],
    colors: ["#f59e0b", "#3b82f6", "#8b5cf6"],
    legend: { position: "bottom", labels: { colors: theme === "dark" ? "#cbd5e1" : "#475569" } },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: "60%" } } },
    theme: { mode: theme },
  };

  const shiftSeries = liveStats
    ? [liveStats.shiftBreakdown.pagi, liveStats.shiftBreakdown.siang, liveStats.shiftBreakdown.malam]
    : [0, 0, 0];

  const trendOptions: ApexCharts.ApexOptions = {
    chart: { type: "area", toolbar: { show: false }, animations: { enabled: false } },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    xaxis: {
      categories: trendStats?.trend.map(t => t.tanggal) || [],
      labels: { style: { colors: theme === "dark" ? "#cbd5e1" : "#475569" } }
    },
    colors: ["#3b82f6", "#22c55e", "#ef4444"],
    legend: { position: "top", labels: { colors: theme === "dark" ? "#cbd5e1" : "#475569" } },
    tooltip: { shared: true, intersect: false },
    yaxis: {
      min: 0,
      labels: { style: { colors: theme === "dark" ? "#cbd5e1" : "#475569" } }
    },
    theme: { mode: theme },
  };

  const trendSeries = [
    { name: "Total Tiket", data: trendStats?.trend.map(t => t.total) || [] },
    { name: "Realisasi",   data: trendStats?.trend.map(t => t.selesai) || [] },
    { name: "Dibatalkan",  data: trendStats?.trend.map(t => t.dibatalkan) || [] },
  ];

  const totalAntri = liveStats ? liveStats.antriAktif + liveStats.proses : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6 text-primary dark:text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard Pimpinan</h1>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              {data?.scopeLabel ?? "—"} — Update tiap 30 detik
            </p>
          </div>
        </div>
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" /> Memuat...
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground dark:text-gray-400 uppercase tracking-wider mb-3">Status Antrian Hari Ini</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Antri Gate" value={liveStats?.antriAktif ?? "—"}
            icon={<Truck className="w-4 h-4 text-blue-500" />} highlight="blue" />
          <KpiCard label="Dalam Proses" value={liveStats?.proses ?? "—"}
            icon={<Layers className="w-4 h-4 text-indigo-500" />} highlight="indigo" />
          <KpiCard label="Selesai" value={liveStats?.selesai ?? "—"}
            sub={liveStats ? `${liveStats.totalTonase.toLocaleString()} ton` : undefined}
            icon={<CheckCircle className="w-4 h-4 text-green-500" />} highlight="green" />
          <KpiCard label="Dibatalkan" value={liveStats?.cancel ?? "—"}
            icon={<Ban className="w-4 h-4 text-red-500" />} highlight="red" />
          <KpiCard label="Total Antri" value={liveStats ? totalAntri : "—"} sub="Antri + Proses"
            icon={<Clock className="w-4 h-4 text-muted-foreground dark:text-gray-400" />} />
          <KpiCard label="Overdue >2 jam" value={liveStats?.overdueCount ?? "—"}
            icon={<AlertTriangle className="w-4 h-4 text-yellow-500" />}
            highlight={liveStats && liveStats.overdueCount > 0 ? "yellow" : undefined} />
        </div>
      </div>

      {liveStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white">Antrian per Gudang</CardTitle>
            </CardHeader>
            <CardContent>
              {liveStats.gudangBreakdown.length > 0 ? (
                <Chart
                  type="bar"
                  series={gudangSeries}
                  options={gudangOptions}
                  height={Math.max(liveStats.gudangBreakdown.length * 38 + 20, 120)}
                />
              ) : (
                <p className="text-center text-sm text-muted-foreground dark:text-gray-400 py-6">Tidak ada antrian aktif</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white">Tiket per Shift</CardTitle>
            </CardHeader>
            <CardContent>
              <Chart type="donut" series={shiftSeries} options={shiftOptions} height={200} />
              <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                {[
                  { label: "Pagi", value: liveStats.shiftBreakdown.pagi, color: "text-amber-600 dark:text-amber-400" },
                  { label: "Siang", value: liveStats.shiftBreakdown.siang, color: "text-blue-600 dark:text-blue-400" },
                  { label: "Malam", value: liveStats.shiftBreakdown.malam, color: "text-violet-650 dark:text-violet-400" },
                ].map(s => (
                  <div key={s.label}>
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground dark:text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-gray-900 dark:text-white">Trend Tiket</CardTitle>
            <div className="flex gap-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors cursor-pointer ${
                    period === p
                      ? "bg-primary text-primary-foreground border-primary dark:bg-indigo-600 dark:border-indigo-600 dark:text-white"
                      : "bg-background text-muted-foreground hover:text-foreground dark:bg-gray-700 dark:border-gray-650 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-gray-400 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
            </div>
          )}
          {trendStats && trendStats.trend.length > 0 ? (
            <Chart type="area" series={trendSeries} options={trendOptions} height={220} />
          ) : !isLoading && (
            <p className="text-center text-sm text-muted-foreground dark:text-gray-400 py-8">Tidak ada data trend</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/manager/page.tsx
git commit -m "feat: rewrite manager dashboard to use scoped multi-company stats"
```

---

## Task 7: Rewrite `/manager/tiket` (Data Tiket)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\manager\tiket\page.tsx`

Same UI/tables, only the fetch URLs and payload change: drop `token`/`API_BASE`/`companyCode` header-based auth, point at the new Next.js proxy routes (which handle auth+scoping server-side), keep everything else (pagination, search, rendering) identical.

- [ ] **Step 1: Read the current file in full first**

Read `c:\Users\weka\Indigo\SISTROV2-next\src\app\manager\tiket\page.tsx` (374 lines) end to end before editing — you need the exact current `TiketTable`/`KuotaTable` component bodies (rendering JSX, pagination wiring) to preserve them unchanged.

- [ ] **Step 2: Replace the two fetch calls**

In the `TiketTable` component, replace:
```typescript
      const res = await fetch(`${API_BASE}/api/Tiket/DataTableFilterLegacy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
```
with:
```typescript
      const res = await fetch(`/api/manager/tiket-list?${body.toString()}`);
```
(Change the request from `POST` with a URL-encoded body to a plain `GET` with the same params as a query string — the new proxy route only reads `searchParams`, matching `tiket-list/route.ts` from Task 5. Remove the `token` dependency from this component if it was only used for the `Authorization` header — check the rest of the component for other uses of `token` first; if none, the `{ token }` prop can be dropped from `TiketTable`'s signature and its caller.)

Do the equivalent for the `KuotaTable` component's fetch to `KuotaLevel4/DataTable`, pointing it at `/api/manager/kuota-list?${body.toString()}` instead, same GET-with-querystring conversion.

- [ ] **Step 3: Remove now-unused imports/props**

If `API_BASE` and the `token` prop threading become fully unused after Step 2 (check every remaining reference in the file first), remove the `import { API_BASE } from "@/lib/api-client"` line and drop the `token` prop from component signatures/callers. Do not remove `useSession` if `session` is still used for anything else in the file (e.g. a header label) — check before removing.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/manager/tiket/page.tsx
git commit -m "feat: point manager tiket/kuota tables at scoped multi-company endpoints"
```

---

## Task 8: Rewrite `/manager/antrian`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\manager\antrian\page.tsx`

- [ ] **Step 1: Replace the fetch call and drop the `companyCode` dependency**

Current fetch:
```typescript
      const res = await fetch(
        `${API_BASE}/api/Antrian/ReportHorizontalQ2?company=${companyCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
```

Replace with:
```typescript
      const res = await fetch(`/api/manager/antrian`);
```

Update the component's guards and effect dependencies: everywhere the code currently checks `if (!token || !companyCode) return;` (both in `fetchReport`'s `useCallback` and the mounting `useEffect`), remove the `companyCode` part of that check — this page no longer needs the caller's own `companyCode`/`token` client-side at all, since scoping now happens server-side in the new proxy route. Simplify both guards to not depend on `companyCode`/`token` (the proxy route itself returns 401 if the session isn't valid, which the existing `if (!res.ok) throw new Error(...)` already handles).

Update the header subtitle (currently `{report?.company ?? companyCode ?? "—"}`) to just `{report?.company ?? "—"}` since `companyCode` is no longer sourced client-side. Because the backend's `ReportHorizontalQ2Multi` response for multiple companies doesn't have one single `company`/`company_code` (it's a list, per the `companies: string[]` field in the response) — update the `ReportQ2Response` interface to match Task 2's actual response shape:

```typescript
interface ReportQ2Response {
  Success: boolean;
  companies: string[];
  date: string;
  sections: Section[];
}
```

And update the header subtitle to show the scope's companies joined, e.g.:
```typescript
{report?.companies?.join(", ") ?? "—"}
```

Remove the now-unused `useSession`/`API_BASE` imports and the `token`/`companyCode` local variables if nothing else in the file uses them (check the whole file first — the polling `useEffect`'s dependency array also needs `token`/`companyCode` removed since they no longer exist as guards).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/manager/antrian/page.tsx
git commit -m "feat: point manager antrian page at scoped multi-company endpoint"
```

---

## Task 9: Trim manager nav to 3 items

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\lib\menu-configs.tsx`

- [ ] **Step 1: Update the `manager` nav array**

Current (after this session's earlier "Dashboard" path fix):
```typescript
  manager: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/dashboard" },
      {
        icon: <Ticket className="h-5 w-5" />,
        name: "Dashboard Tiket",
        path: "/manager/tiket",
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        path: "/manager/antrian",
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        path: "/manager/laporan",
      },
    ],
    admin: [],
  },
```

Replace with:
```typescript
  manager: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard Utama", path: "/manager" },
      {
        icon: <Ticket className="h-5 w-5" />,
        name: "Data Tiket",
        path: "/manager/tiket",
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        path: "/manager/antrian",
      },
    ],
    admin: [],
  },
```

(Note this also switches "Dashboard" back to pointing at `/manager` instead of `/dashboard` — per this session's new direction, `/manager` IS now the correct scoped statistics dashboard, so the earlier redirect to `/dashboard` — done before this simple-stats-only design was decided — is superseded here.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Manual verification**

Log in as a user with role `manager`, confirm the sidebar shows exactly 3 items: "Dashboard Utama", "Data Tiket", "Antrian" — no "Laporan".

- [ ] **Step 4: Commit**

```bash
git add src/lib/menu-configs.tsx
git commit -m "feat: trim manager nav to Dashboard Utama/Data Tiket/Antrian"
```

---

## Self-Review Notes

- **Spec coverage:** statistik-only dashboard (Task 6), scoped by wilayah/company (Tasks 1, 5), Data Tiket + Antrian also scoped (Tasks 3-4, 7-8), menu trimmed to exactly 3 items (Task 9) — all covered.
- **No placeholders:** every task has full, exact code — the antrian multi-company loop reuses the real existing private helpers rather than a "TODO: adapt logic" placeholder; the lean tiket endpoint lists its exact 12 projected fields rather than "project needed fields".
- **Type/shape consistency:** `ReportQ2Response.companies: string[]` (Task 8) matches `ReportHorizontalQ2Multi`'s actual response field name `companies` (Task 2). `GetStatsResult`/`ManagerStats` interfaces in Task 6 match `GetStatsMulti`/`GetManagerStatsMulti`'s response shapes (Task 1) minus the now-irrelevant single `companyCode` field. All four proxy routes (Task 5) use the same `resolveScopeCompanies` helper and the same `isManager` check pattern.
- **Risk isolation confirmed:** none of the 4 new backend methods modify or are called by any existing method — `GetStats`/`GetManagerStats`/`ReportHorizontalQ2`/`DataTableFilterLegacy`/`DataTable` (KuotaLevel4) are all left completely untouched, so no other caller of those endpoints is affected by this plan.
