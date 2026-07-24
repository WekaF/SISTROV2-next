# POSTO/SO/Tiket Column + Date Search (Phase 1: Foundation + Core Tables) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every column in the POSTO, SO, and Tiket list tables independently searchable, and make date/datetime columns searchable via a real date picker (exact-day match) instead of free text — starting with the shared `DataTable` component and the three primary table families (POSTO, SO, Tiket).

**Architecture:** Two codebases are involved: the Next.js frontend (`SISTROV2-next`) and the ASP.NET Framework 4.5 backend (`sistropigroup`). The frontend's shared `DataTable` component already supports per-column text search (`searchable: true` renders a search box, values flow through `columnFilters`); this plan adds a `searchType: "date"` variant that renders `<input type="date">`. On the backend, a new shared `DateRangeSearchHelper` converts a picked date into a whole-day range (`>= day, < day+1`) so date columns match correctly regardless of any time component on the stored value. Each affected ASP.NET controller endpoint is updated to read the relevant `columns[i][search][value]` parameters and apply them to its LINQ-to-Entities query; each affected frontend page is updated to mark its columns `searchable` (and `searchType: "date"` for date columns) and forward `columnFilters` into its fetcher payload.

**Scope of this phase:** POSTO (`/posto`), SO (`/so` and `/posto/so` — two frontend pages sharing one backend endpoint), and Tiket (`/tiket`, `/admin/tickets`, `/tiket/dashboard`, plus the three small ticket-queue dashboard widgets `GudangDashboard`/`JBTDashboard`/`SecurityDashboard` — all five sharing one backend endpoint). Reports pages (`/reports/*`), the embedded "Riwayat Tiket" history mini-tables, `/tiket/booking`, `/antrian`, and `/pengajuan/jatuh-tempo` are separate, later plans — each hits its own distinct backend endpoint and is independently schedulable. Also explicitly out of scope: `PostoListView.tsx` (used by `/weighbridge/posto`, `/warehouse/posto`, `/security/posto`) renders **hardcoded fake data**, not a real API call — it needs to be wired to real data first, which is a different bug entirely; file that as its own follow-up task, don't fold it into a "add search" plan.

**Tech Stack:** Next.js 16 / React / TypeScript (frontend), ASP.NET Framework 4.5 / EF6 / LINQ-to-Entities / MSTest (backend, in `C:\Users\weka\Indigo\sistropigroup`).

**Verification note:** `vstest.console.exe` test discovery is broken in this environment (documented in project memory) — for backend changes, "done" means `MSBuild.exe` succeeds with 0 errors, plus a hand-traced check of the LINQ predicate against representative data (and a live `Invoke-RestMethod` call against the running dev backend where practical), not a green test-runner run. For frontend changes, "done" means `npx tsc --noEmit` (or `npm run build`) succeeds, plus manually exercising the search boxes in a running `npm run dev` session per the project's UI-verification convention.

---

## Task 1: `DateRangeSearchHelper` — shared day-range date parsing (backend)

**Files:**
- Create: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Helper\DateRangeSearchHelper.cs`
- Create: `C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\DateRangeSearchHelperTest.cs`

This mirrors the existing `SISTROAWESOME.Helper` convention (see `GrupTrukHelper.cs` / `GrupTrukHelperTest.cs`) so the date-range logic used by every controller in this plan is written and verified exactly once.

- [ ] **Step 1: Write the helper**

```csharp
using System;

namespace SISTROAWESOME.Helper
{
    public static class DateRangeSearchHelper
    {
        // A date-column search box sends one ISO "yyyy-MM-dd" value (from an
        // <input type="date">). We match rows anywhere within that whole day
        // rather than exact DateTime equality, so a time-of-day component on
        // the stored value (or on whatever string got parsed) never causes a
        // real match to be silently dropped.
        public static bool TryGetDayRange(string input, out DateTime dayStart, out DateTime dayEndExclusive)
        {
            DateTime parsed;
            if (!string.IsNullOrEmpty(input) && DateTime.TryParse(input, out parsed))
            {
                dayStart = parsed.Date;
                dayEndExclusive = dayStart.AddDays(1);
                return true;
            }
            dayStart = default(DateTime);
            dayEndExclusive = default(DateTime);
            return false;
        }
    }
}
```

- [ ] **Step 2: Write the test**

```csharp
using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SISTROAWESOME.Helper;

[TestClass]
public class DateRangeSearchHelperTest
{
    [TestMethod]
    public void TryGetDayRange_IsoDate_ReturnsWholeDayRange()
    {
        DateTime start, end;
        bool ok = DateRangeSearchHelper.TryGetDayRange("2026-07-17", out start, out end);
        Assert.IsTrue(ok);
        Assert.AreEqual(new DateTime(2026, 7, 17), start);
        Assert.AreEqual(new DateTime(2026, 7, 18), end);
    }

    [TestMethod]
    public void TryGetDayRange_EmptyString_ReturnsFalse()
    {
        DateTime start, end;
        bool ok = DateRangeSearchHelper.TryGetDayRange("", out start, out end);
        Assert.IsFalse(ok);
    }

    [TestMethod]
    public void TryGetDayRange_Null_ReturnsFalse()
    {
        DateTime start, end;
        bool ok = DateRangeSearchHelper.TryGetDayRange(null, out start, out end);
        Assert.IsFalse(ok);
    }

    [TestMethod]
    public void TryGetDayRange_Garbage_ReturnsFalse()
    {
        DateTime start, end;
        bool ok = DateRangeSearchHelper.TryGetDayRange("not-a-date", out start, out end);
        Assert.IsFalse(ok);
    }

    [TestMethod]
    public void TryGetDayRange_DateWithTimeComponent_TruncatesToWholeDay()
    {
        // Defensive: even if a caller ends up passing a full datetime string,
        // we still want the whole-day range, not an exact-instant match.
        DateTime start, end;
        bool ok = DateRangeSearchHelper.TryGetDayRange("2026-07-17T14:30:00", out start, out end);
        Assert.IsTrue(ok);
        Assert.AreEqual(new DateTime(2026, 7, 17), start);
        Assert.AreEqual(new DateTime(2026, 7, 18), end);
    }
}
```

- [ ] **Step 3: Build to confirm both files compile**

Run (git-bash, note the `MSYS_NO_PATHCONV=1` + dash-style switches — see project memory on MSBuild quirks):
```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "ClassLibrary1/SISTRO.Tests.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)` for both. (Do not attempt to run the tests via `vstest.console.exe` — discovery is broken in this environment for every MSTest class, not just new ones; build success plus the hand-traced assertions above are the pass signal here.)

- [ ] **Step 4: Commit**

```bash
git add SISTROAWESOME/Helper/DateRangeSearchHelper.cs ClassLibrary1/DateRangeSearchHelperTest.cs
git commit -m "feat: add DateRangeSearchHelper for day-range date-column search"
```
(Run from `C:\Users\weka\Indigo\sistropigroup`.)

---

## Task 2: `DataTable.tsx` — add a date-picker column search type (frontend)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\components\ui\DataTable.tsx`

- [ ] **Step 1: Add `searchType` to the column interface**

In the `DataTableColumn<T>` interface (top of file):

```typescript
export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  searchable?: boolean; // New: enable column search
  searchType?: "text" | "date"; // "date" renders a native date picker instead of free text
  sortColumn?: number; // Backend DataTables column index to sort by when this header is clicked. Omit to make the column unsortable.
  render?: (row: T, index: number) => React.ReactNode;
}
```

- [ ] **Step 2: Render a date input when `searchType === "date"`**

Find the column-search row (renders one `<Input>` per searchable column):

```typescript
            {hasColumnSearch && (
              <tr className="bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-gray-800">
                {columns.map((col) => (
                  <th key={`search-${col.key}`} className="px-2 py-2">
                    {col.searchable ? (
                      <Input
                        className="h-8 text-[11px] font-bold rounded-none border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-white/[0.01] focus:border-brand-500 transition-all"
                        placeholder={`Cari ${col.header}...`}
                        value={columnFilters[col.key] || ""}
                        onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
```

Replace with:

```typescript
            {hasColumnSearch && (
              <tr className="bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-gray-800">
                {columns.map((col) => (
                  <th key={`search-${col.key}`} className="px-2 py-2">
                    {col.searchable ? (
                      <Input
                        type={col.searchType === "date" ? "date" : "text"}
                        className="h-8 text-[11px] font-bold rounded-none border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-white/[0.01] focus:border-brand-500 transition-all"
                        placeholder={col.searchType === "date" ? undefined : `Cari ${col.header}...`}
                        value={columnFilters[col.key] || ""}
                        onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
```

- [ ] **Step 3: Type-check**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/DataTable.tsx
git commit -m "feat: support a date-picker column search type in DataTable"
```

---

## Task 3: POSTO backend — fix date-column filters (`POSTOController.DataTableFilter`)

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\POSTOController.cs`

Two problems here: (1) date filters use exact `DateTime.TryParse(text) == storedValue` equality, which silently returns zero rows for anything but a perfectly-formatted full match; (2) the "Batas" (`tglakhir`) filter is a real pre-existing bug — it compares against `tglposto` instead of `tglakhir`.

- [ ] **Step 1: Replace the exact-match TryParse block with day-range parsing**

Find (around line 336):
```csharp
            DateTime search_tanggal;
            DateTime search_tanggalAkhir;
            DateTime search_tanggaljatuhtempo;
            bool b_search_tanggal = DateTime.TryParse(fil_tanggal, out search_tanggal);
            bool b_search_tanggalAkhir = DateTime.TryParse(fil_tglakhir, out search_tanggalAkhir);
            bool b_search_tanggaljatuhtempo = DateTime.TryParse(fil_tgljatuhtempo, out search_tanggaljatuhtempo);
```

Replace with:
```csharp
            DateTime search_tanggal, search_tanggal_end;
            DateTime search_tanggalAkhir, search_tanggalAkhir_end;
            DateTime search_tanggaljatuhtempo, search_tanggaljatuhtempo_end;
            bool b_search_tanggal = DateRangeSearchHelper.TryGetDayRange(fil_tanggal, out search_tanggal, out search_tanggal_end);
            bool b_search_tanggalAkhir = DateRangeSearchHelper.TryGetDayRange(fil_tglakhir, out search_tanggalAkhir, out search_tanggalAkhir_end);
            bool b_search_tanggaljatuhtempo = DateRangeSearchHelper.TryGetDayRange(fil_tgljatuhtempo, out search_tanggaljatuhtempo, out search_tanggaljatuhtempo_end);
```

(`using SISTROAWESOME.Helper;` is already present at the top of this file — no new using needed.)

- [ ] **Step 2: Switch the three date conditions to range matches, and fix the `tglakhir` bug**

Find (around line 394):
```csharp
                                        (string.IsNullOrEmpty(fil_wilayah) || x.pos.M_Wilayah.keterangan.ToLower().Contains(fil_wilayah.ToLower())) &&
                                        (string.IsNullOrEmpty(fil_tanggal) || x.pos.tglposto == search_tanggal) &&
                                        (string.IsNullOrEmpty(fil_tgljatuhtempo) || x.pos.tgljatuhtempo == search_tanggaljatuhtempo) &&
                                        (string.IsNullOrEmpty(fil_noposto) || x.pos.noposto.ToLower().Contains(fil_noposto.ToLower())) &&
                                        (string.IsNullOrEmpty(fil_tglakhir) || x.pos.tglposto == search_tanggalAkhir) &&
                                        (string.IsNullOrEmpty(fil_asal) || x.pos.Gudang.Deskripsi.ToLower().Contains(fil_asal.ToLower())) &&
```

Replace with:
```csharp
                                        (string.IsNullOrEmpty(fil_wilayah) || x.pos.M_Wilayah.keterangan.ToLower().Contains(fil_wilayah.ToLower())) &&
                                        (string.IsNullOrEmpty(fil_tanggal) || (b_search_tanggal && x.pos.tglposto >= search_tanggal && x.pos.tglposto < search_tanggal_end)) &&
                                        (string.IsNullOrEmpty(fil_tgljatuhtempo) || (b_search_tanggaljatuhtempo && x.pos.tgljatuhtempo >= search_tanggaljatuhtempo && x.pos.tgljatuhtempo < search_tanggaljatuhtempo_end)) &&
                                        (string.IsNullOrEmpty(fil_noposto) || x.pos.noposto.ToLower().Contains(fil_noposto.ToLower())) &&
                                        (string.IsNullOrEmpty(fil_tglakhir) || (b_search_tanggalAkhir && x.pos.tglakhir >= search_tanggalAkhir && x.pos.tglakhir < search_tanggalAkhir_end)) &&
                                        (string.IsNullOrEmpty(fil_asal) || x.pos.Gudang.Deskripsi.ToLower().Contains(fil_asal.ToLower())) &&
```

Note the fix: `x.pos.tglakhir` (not `x.pos.tglposto`) on the `fil_tglakhir` line — previously, searching the "Batas" column actually filtered by the POSTO date instead of the deadline date.

- [ ] **Step 3: Build**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)`.

- [ ] **Step 4: Live sanity check (if the local backend is running)**

```bash
curl -s -X POST "http://localhost:8090/api/POSTO/DataTableFilter" \
  -H "Content-Type: application/json" \
  -d '{"draw":1,"start":0,"length":10,"search":"","columns":[{"data":"tanggalString","name":"tglposto","searchable":true,"orderable":true,"search":{"value":"2026-07-17","regex":"false"}}]}' | head -c 500
```
Expected: `recordsFiltered` reflects only rows whose `tglposto` falls on 2026-07-17, not zero unless that's genuinely correct for the dataset. (Adjust the date to one known to have data if verifying against a real dev DB — see `sqlcmd` access notes in project memory.)

- [ ] **Step 5: Commit**

```bash
git add SISTROAWESOME/api/POSTOController.cs
git commit -m "fix: POSTO date-column search uses day-range match, fixes Batas filter bug"
```

---

## Task 4: POSTO frontend — mark date columns as date-picker search (`/posto`)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\posto\page.tsx`

The three date columns already have `searchable: true` — they just need `searchType: "date"` so the search box becomes a real date picker.

- [ ] **Step 1: Add `searchType: "date"` to the "Tanggal" column**

Find:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal",
      searchable: true,
      sortColumn: 3,
      render: (p) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{p.tanggalString}</span>,
    },
```
Replace with:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal",
      searchable: true,
      searchType: "date",
      sortColumn: 3,
      render: (p) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{p.tanggalString}</span>,
    },
```

- [ ] **Step 2: Add `searchType: "date"` to the "Batas" column**

Find:
```typescript
    {
      key: "tglakhirString",
      header: "Batas",
      searchable: true,
      sortColumn: 5,
      render: (p) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{p.tglakhirString || "-"}</span>,
    },
```
Replace with:
```typescript
    {
      key: "tglakhirString",
      header: "Batas",
      searchable: true,
      searchType: "date",
      sortColumn: 5,
      render: (p) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{p.tglakhirString || "-"}</span>,
    },
```

- [ ] **Step 3: Add `searchType: "date"` to the "Jatuh Tempo" column**

Find:
```typescript
    {
      key: "tanggaljatuhtempoString",
      header: "Jatuh Tempo",
      searchable: true,
      sortColumn: 20,
      render: (p) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{p.tanggaljatuhtempoString || "-"}</span>,
    },
```
Replace with:
```typescript
    {
      key: "tanggaljatuhtempoString",
      header: "Jatuh Tempo",
      searchable: true,
      searchType: "date",
      sortColumn: 20,
      render: (p) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{p.tanggaljatuhtempoString || "-"}</span>,
    },
```

- [ ] **Step 4: Type-check**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

- [ ] **Step 5: Manual verify**

Run `npm run dev`, open `/posto`, type a date into the "Tanggal" column's date picker, confirm the table filters to that day only. Repeat for "Batas" and "Jatuh Tempo".

- [ ] **Step 6: Commit**

```bash
git add src/app/posto/page.tsx
git commit -m "feat: POSTO date columns use date-picker search"
```

---

## Task 5: SO backend — apply the dead column filters (`SOController.DataTableFilter`)

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\SOController.cs`

The current method parses `fil_wilayah`, `fil_tanggal`, `fil_tglakhir`, `fil_asal`, `fil_tujuan`, `fil_bagian`, `fil_transport`, `fil_produk`, `fil_qty` from the request but never applies any of them to the query — only `fil_noposto` actually filters. This task makes every parsed filter real, adds the three missing filters (`qtyrencana`, `qtyrealisasi`, `cutoff`, `kapal`, `kotatujuan`, `updatedby`, `tgljatuhtempo`), and switches date filters to day-range matching.

- [ ] **Step 1: Add the `Helper` using**

Find (top of file):
```csharp
using SISTROAWESOME.BDO;
using SISTROAWESOME.Models;
using System;
```
Replace with:
```csharp
using SISTROAWESOME.BDO;
using SISTROAWESOME.Helper;
using SISTROAWESOME.Models;
using System;
```

- [ ] **Step 2: Extend the column-filter declarations**

Find:
```csharp
                // Column filters
                string fil_wilayah = Request["columns[2][search][value]"];
                string fil_tanggal = Request["columns[3][search][value]"];
                string fil_noposto = Request["columns[4][search][value]"];
                string fil_tglakhir = Request["columns[5][search][value]"];
                string fil_asal = Request["columns[6][search][value]"];
                string fil_tujuan = Request["columns[7][search][value]"];
                string fil_bagian = Request["columns[8][search][value]"];
                string fil_transport = Request["columns[9][search][value]"];
                string fil_produk = Request["columns[10][search][value]"];
                string fil_qty = Request["columns[11][search][value]"];
                
                DateTime search_tanggal;
                bool b_search_tanggal = DateTime.TryParse(fil_tanggal, out search_tanggal);
                
                DateTime startdate;
                bool b_tanggal = DateTime.TryParse(SD, out startdate);
```
Replace with:
```csharp
                // Column filters
                string fil_wilayah = Request["columns[2][search][value]"];
                string fil_tanggal = Request["columns[3][search][value]"];
                string fil_noposto = Request["columns[4][search][value]"];
                string fil_tglakhir = Request["columns[5][search][value]"];
                string fil_asal = Request["columns[6][search][value]"];
                string fil_tujuan = Request["columns[7][search][value]"];
                string fil_bagian = Request["columns[8][search][value]"];
                string fil_transport = Request["columns[9][search][value]"];
                string fil_produk = Request["columns[10][search][value]"];
                string fil_qty = Request["columns[11][search][value]"];
                string fil_qtyrencana = Request["columns[12][search][value]"];
                string fil_qtyrealisasi = Request["columns[14][search][value]"];
                string fil_cutoff = Request["columns[16][search][value]"];
                string fil_kapal = Request["columns[17][search][value]"];
                string fil_kotatujuan = Request["columns[18][search][value]"];
                string fil_updatedby = Request["columns[19][search][value]"];
                string fil_tgljatuhtempo = Request["columns[20][search][value]"];

                DateTime search_tanggal, search_tanggal_end;
                bool b_search_tanggal = DateRangeSearchHelper.TryGetDayRange(fil_tanggal, out search_tanggal, out search_tanggal_end);
                DateTime search_tglakhir, search_tglakhir_end;
                bool b_search_tglakhir = DateRangeSearchHelper.TryGetDayRange(fil_tglakhir, out search_tglakhir, out search_tglakhir_end);
                DateTime search_tgljatuhtempo, search_tgljatuhtempo_end;
                bool b_search_tgljatuhtempo = DateRangeSearchHelper.TryGetDayRange(fil_tgljatuhtempo, out search_tgljatuhtempo, out search_tgljatuhtempo_end);
                
                DateTime startdate;
                bool b_tanggal = DateTime.TryParse(SD, out startdate);
```

- [ ] **Step 3: Actually apply the filters to the query**

Find:
```csharp
                if (!string.IsNullOrEmpty(fil_noposto))
                    query = query.Where(x => x.noposto != null && x.noposto.Contains(fil_noposto));

                // Count total filtered
```
Replace with:
```csharp
                if (!string.IsNullOrEmpty(fil_noposto))
                    query = query.Where(x => x.noposto != null && x.noposto.Contains(fil_noposto));

                if (!string.IsNullOrEmpty(fil_wilayah))
                    query = query.Where(x => x.M_Wilayah != null && x.M_Wilayah.keterangan.ToLower().Contains(fil_wilayah.ToLower()));

                if (b_search_tanggal)
                    query = query.Where(x => x.tglposto >= search_tanggal && x.tglposto < search_tanggal_end);

                if (b_search_tglakhir)
                    query = query.Where(x => x.tglakhir >= search_tglakhir && x.tglakhir < search_tglakhir_end);

                if (b_search_tgljatuhtempo)
                    query = query.Where(x => x.tgljatuhtempo >= search_tgljatuhtempo && x.tgljatuhtempo < search_tgljatuhtempo_end);

                if (!string.IsNullOrEmpty(fil_asal))
                    query = query.Where(x => x.Gudang != null && x.Gudang.Deskripsi.ToLower().Contains(fil_asal.ToLower()));

                // tujuanString in the SOView projection below reuses Transport1.nama (same
                // source as transportString) rather than a real destination field — a
                // pre-existing display quirk, left untouched here. Filtering the same field
                // keeps search consistent with what the "Tujuan" column actually shows.
                if (!string.IsNullOrEmpty(fil_tujuan))
                    query = query.Where(x => x.Transport1 != null && x.Transport1.nama.ToLower().Contains(fil_tujuan.ToLower()));

                if (!string.IsNullOrEmpty(fil_bagian))
                    query = query.Where(x => x.M_Bagian != null && x.M_Bagian.keterangan.ToLower().Contains(fil_bagian.ToLower()));

                if (!string.IsNullOrEmpty(fil_transport))
                    query = query.Where(x => x.Transport1 != null && x.Transport1.nama.ToLower().Contains(fil_transport.ToLower()));

                if (!string.IsNullOrEmpty(fil_produk))
                    query = query.Where(x => x.Produk1 != null && x.Produk1.Nama.ToLower().Contains(fil_produk.ToLower()));

                if (!string.IsNullOrEmpty(fil_qty))
                    query = query.Where(x => x.qty != null && x.qty.Value.ToString().Contains(fil_qty));

                if (!string.IsNullOrEmpty(fil_qtyrencana))
                    query = query.Where(x => x.qtyrencana != null && x.qtyrencana.Value.ToString().Contains(fil_qtyrencana));

                if (!string.IsNullOrEmpty(fil_qtyrealisasi))
                    query = query.Where(x => x.qtyrealisasi != null && x.qtyrealisasi.Value.ToString().Contains(fil_qtyrealisasi));

                if (!string.IsNullOrEmpty(fil_cutoff))
                    query = query.Where(x => x.cutoff != null && x.cutoff.ToLower().Contains(fil_cutoff.ToLower()));

                if (!string.IsNullOrEmpty(fil_kapal))
                    query = query.Where(x => x.kapal != null && x.kapal.ToLower().Contains(fil_kapal.ToLower()));

                if (!string.IsNullOrEmpty(fil_kotatujuan))
                    query = query.Where(x => x.kotatujuan != null && x.kotatujuan.ToLower().Contains(fil_kotatujuan.ToLower()));

                if (!string.IsNullOrEmpty(fil_updatedby))
                    query = query.Where(x => x.AspNetUsers != null && x.AspNetUsers.fullname.ToLower().Contains(fil_updatedby.ToLower()));

                // Count total filtered
```

- [ ] **Step 4: Build**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)`.

- [ ] **Step 5: Commit**

```bash
git add SISTROAWESOME/api/SOController.cs
git commit -m "fix: SO DataTableFilter actually applies its column filters"
```

---

## Task 6: SO frontend — wire column search on `/so`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\so\page.tsx`

This page's fetcher builds a `URLSearchParams` form body and already has a `colIndices` lookup, but only 8 keys are mapped and only "No SO" has a UI search box.

- [ ] **Step 1: Extend `colIndices` to cover every filterable column this page displays**

Find:
```typescript
    const colIndices: Record<string, number> = {
      wilayah: 2, tanggalString: 3, noposto: 4, asalString: 6,
      tujuanString: 7, bagian: 8, transportString: 9, produkString: 10,
    };
```
Replace with:
```typescript
    const colIndices: Record<string, number> = {
      wilayah: 2, tanggalString: 3, noposto: 4, asalString: 6,
      tujuanString: 7, bagian: 8, transportString: 9, produkString: 10,
      qty: 11, qtyrealisasi: 14, cutoff: 16, kapal: 17,
      kotatujuan: 18, updatedby: 19, tanggaljatuhtempoString: 20,
    };
```

- [ ] **Step 2: Mark "No SO" (already searchable) and add `searchable: true` to the rest of the visible columns**

Find:
```typescript
    {
      key: "noposto",
      header: "No SO",
      searchable: true,
      render: (p) => (
```
This one is unchanged (already correct) — just confirm it stays as-is.

Find:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal",
      render: (p) => <span className="text-gray-500 font-mono text-xs">{p.tanggalString}</span>,
    },
```
Replace with:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal",
      searchable: true,
      searchType: "date",
      render: (p) => <span className="text-gray-500 font-mono text-xs">{p.tanggalString}</span>,
    },
```

Find:
```typescript
    {
      key: "tanggaljatuhtempoString",
      header: "Jatuh Tempo",
      render: (p) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{p.tanggaljatuhtempoString || "-"}</span>,
    },
```
Replace with:
```typescript
    {
      key: "tanggaljatuhtempoString",
      header: "Jatuh Tempo",
      searchable: true,
      searchType: "date",
      render: (p) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{p.tanggaljatuhtempoString || "-"}</span>,
    },
```

Find:
```typescript
    {
      key: "transportString",
      header: "Transportir",
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "transportString",
      header: "Transportir",
      searchable: true,
      render: (p) => (
```

Find:
```typescript
    {
      key: "produkString",
      header: "Produk",
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "produkString",
      header: "Produk",
      searchable: true,
      render: (p) => (
```

Find:
```typescript
    {
      key: "qty",
      header: "Qty (Ton)",
      headerClassName: "text-right",
      className: "text-right font-bold",
      render: (p) => (p.qty || 0).toLocaleString(),
    },
```
Replace with:
```typescript
    {
      key: "qty",
      header: "Qty (Ton)",
      headerClassName: "text-right",
      className: "text-right font-bold",
      searchable: true,
      render: (p) => (p.qty || 0).toLocaleString(),
    },
```

Find:
```typescript
    { key: "asalString", header: "Asal", render: (p) => p.asalString || "-" },
    { key: "tujuanString", header: "Tujuan", render: (p) => p.tujuanString || "-" },
    { key: "wilayah", header: "Wilayah", render: (p) => <span className="font-medium">{p.wilayah || "-"}</span> },
```
Replace with:
```typescript
    { key: "asalString", header: "Asal", searchable: true, render: (p) => p.asalString || "-" },
    { key: "tujuanString", header: "Tujuan", searchable: true, render: (p) => p.tujuanString || "-" },
    { key: "wilayah", header: "Wilayah", searchable: true, render: (p) => <span className="font-medium">{p.wilayah || "-"}</span> },
```

Find:
```typescript
    {
      key: "cutoff",
      header: "CutOff",
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "cutoff",
      header: "CutOff",
      searchable: true,
      render: (p) => (
```

Find:
```typescript
    { key: "kapal", header: "Kapal", render: (p) => <span className="text-xs">{p.kapal || "-"}</span> },
    { key: "kotatujuan", header: "Kota Tujuan", render: (p) => <span className="text-xs">{p.kotatujuan || "-"}</span> },
    { key: "updatedby", header: "PIC", render: (p) => <span className="text-[10px] uppercase font-bold text-gray-400">{p.updatedby || "-"}</span> },
```
Replace with:
```typescript
    { key: "kapal", header: "Kapal", searchable: true, render: (p) => <span className="text-xs">{p.kapal || "-"}</span> },
    { key: "kotatujuan", header: "Kota Tujuan", searchable: true, render: (p) => <span className="text-xs">{p.kotatujuan || "-"}</span> },
    { key: "updatedby", header: "PIC", searchable: true, render: (p) => <span className="text-[10px] uppercase font-bold text-gray-400">{p.updatedby || "-"}</span> },
```

(`qtysisaBooking`/`qtysisaRealisasi`/`gruptruk`/`statusString` stay non-searchable — they're computed/derived display values with no matching raw-column filter on the backend.)

- [ ] **Step 3: Type-check**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

- [ ] **Step 4: Manual verify**

`npm run dev`, open `/so`, confirm every newly-searchable column shows a search box, type into a few (Transportir, Produk, Kapal), confirm results narrow. Use the "Tanggal" and "Jatuh Tempo" date pickers and confirm exact-day filtering.

- [ ] **Step 5: Commit**

```bash
git add src/app/so/page.tsx
git commit -m "feat: wire per-column and date search on /so"
```

---

## Task 7: SO frontend — wire column search on `/posto/so` (the second SO page)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\posto\so\page.tsx`

This page hits the same `SOController.DataTableFilter` endpoint fixed in Task 5, but its fetcher currently hardcodes every column's `search.value` to `""` — it never reads `params.columnFilters` at all.

- [ ] **Step 1: Wire the fetcher to forward `columnFilters`**

Find:
```typescript
  const fetcher = async (params: DataTableParams) => {
    const payload: any = {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: params.search || "",
      order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
      SD: dateFilter || "",
      tipe: "SO",
      columns: [
        { data: "charter", name: "charter", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "numberString", name: "numberString", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "wilayah", name: "wilayah", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "tanggalString", name: "tglposto", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "noposto", name: "noposto", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "tglakhirString", name: "tglakhir", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "asalString", name: "asal", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "tujuanString", name: "tujuan", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "bagian", name: "bagian", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "transportString", name: "transport", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "produkString", name: "produk", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "qty", name: "qty", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "qtyrencana", name: "qtyrencana", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "qtysisaBooking", name: "qtysisaBooking", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "qtyrealisasi", name: "qtyrealisasi", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "qtysisaRealisasi", name: "qtysisaRealisasi", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "cutoff", name: "cutoff", searchable: true, orderable: false, search: { value: "", regex: "false" } },
        { data: "kapal", name: "kapal", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "kotatujuan", name: "kotatujuan", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "updatedby", name: "updatedby", searchable: true, orderable: false, search: { value: "", regex: "false" } },
        { data: "tanggaljatuhtempoString", name: "tgljatuhtempo", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "action", name: "", searchable: false, orderable: false },
      ],
    };
```
Replace with:
```typescript
  const fetcher = async (params: DataTableParams) => {
    const cf = params.columnFilters ?? {};
    const cs = (key: string) => ({ value: cf[key] || "", regex: "false" });
    const payload: any = {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: params.search || "",
      order: params.order?.length ? params.order : [{ column: 0, dir: "desc" }],
      SD: dateFilter || "",
      tipe: "SO",
      columns: [
        { data: "charter", name: "charter", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "numberString", name: "numberString", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "wilayah", name: "wilayah", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "tanggalString", name: "tglposto", searchable: true, orderable: true, search: cs("tanggalString") },
        { data: "noposto", name: "noposto", searchable: true, orderable: true, search: cs("noposto") },
        { data: "tglakhirString", name: "tglakhir", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "asalString", name: "asal", searchable: true, orderable: true, search: cs("asalString") },
        { data: "tujuanString", name: "tujuan", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "bagian", name: "bagian", searchable: true, orderable: true, search: cs("bagian") },
        { data: "transportString", name: "transport", searchable: true, orderable: true, search: cs("transportString") },
        { data: "produkString", name: "produk", searchable: true, orderable: true, search: cs("produkString") },
        { data: "qty", name: "qty", searchable: true, orderable: true, search: cs("qty") },
        { data: "qtyrencana", name: "qtyrencana", searchable: true, orderable: true, search: cs("qtyrencana") },
        { data: "qtysisaBooking", name: "qtysisaBooking", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "qtyrealisasi", name: "qtyrealisasi", searchable: true, orderable: true, search: cs("qtyrealisasi") },
        { data: "qtysisaRealisasi", name: "qtysisaRealisasi", searchable: false, orderable: false, search: { value: "", regex: "false" } },
        { data: "cutoff", name: "cutoff", searchable: true, orderable: false, search: cs("cutoff") },
        { data: "kapal", name: "kapal", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "kotatujuan", name: "kotatujuan", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "updatedby", name: "updatedby", searchable: true, orderable: false, search: { value: "", regex: "false" } },
        { data: "tanggaljatuhtempoString", name: "tgljatuhtempo", searchable: true, orderable: true, search: { value: "", regex: "false" } },
        { data: "action", name: "", searchable: false, orderable: false },
      ],
    };
```
(Filters wired: only the ones with a matching visible UI column, per Step 2 below.)

- [ ] **Step 2: Add `searchable`/`searchType` to the UI columns that display those fields**

Find:
```typescript
    {
      key: "noposto",
      header: "No SO",
      sortColumn: 4,
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "noposto",
      header: "No SO",
      searchable: true,
      sortColumn: 4,
      render: (p) => (
```

Find:
```typescript
    {
      key: "tanggalString",
      header: "Tgl SO",
      sortColumn: 3,
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "tanggalString",
      header: "Tgl SO",
      searchable: true,
      searchType: "date",
      sortColumn: 3,
      render: (p) => (
```

Find:
```typescript
    {
      key: "transportString",
      header: "Transportir",
      sortColumn: 9,
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "transportString",
      header: "Transportir",
      searchable: true,
      sortColumn: 9,
      render: (p) => (
```

Find:
```typescript
    {
      key: "produkString",
      header: "Produk",
      sortColumn: 10,
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "produkString",
      header: "Produk",
      searchable: true,
      sortColumn: 10,
      render: (p) => (
```

Find:
```typescript
    {
      key: "qty",
      header: "Kuantitas",
      sortColumn: 11,
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "qty",
      header: "Kuantitas",
      searchable: true,
      sortColumn: 11,
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
```

Find:
```typescript
    {
      key: "qtyrencana",
      header: "Booking",
      sortColumn: 12,
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "qtyrencana",
      header: "Booking",
      searchable: true,
      sortColumn: 12,
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
```

Find:
```typescript
    {
      key: "qtyrealisasi",
      header: "Realisasi",
      sortColumn: 14,
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "qtyrealisasi",
      header: "Realisasi",
      searchable: true,
      sortColumn: 14,
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
```

Find:
```typescript
    {
      key: "asalString",
      header: "Asal / Tujuan",
      sortColumn: 6,
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "asalString",
      header: "Asal / Tujuan",
      searchable: true,
      sortColumn: 6,
      render: (p) => (
```

Find:
```typescript
    {
      key: "bagian",
      header: "Area",
      sortColumn: 8,
      render: (p) => (
```
Replace with:
```typescript
    {
      key: "bagian",
      header: "Area",
      searchable: true,
      sortColumn: 8,
      render: (p) => (
```

Find:
```typescript
    {
      key: "cutoff",
      header: "Cut Off",
      headerClassName: "text-center",
      className: "text-center",
      render: (p) => {
```
Replace with:
```typescript
    {
      key: "cutoff",
      header: "Cut Off",
      searchable: true,
      headerClassName: "text-center",
      className: "text-center",
      render: (p) => {
```

(`statusString` and `action` stay non-searchable — status is a derived display label with no direct backend filter in this phase.)

- [ ] **Step 3: Type-check**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

- [ ] **Step 4: Manual verify**

`npm run dev`, open `/posto/so`, confirm the same set of columns now have working search boxes, and the "Tgl SO" date picker filters by exact day.

- [ ] **Step 5: Commit**

```bash
git add src/app/posto/so/page.tsx
git commit -m "feat: wire per-column and date search on /posto/so"
```

---

## Task 8: Tiket backend — add name-based per-column search (`TiketController.DataTableFilterLegacy`)

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs`

This endpoint currently reads zero `columns[i][search][value]` parameters — only global search, `SD`/`ED` range, and a few static filters. It's shared by 6 different frontend pages/widgets, each sending a differently-ordered `columns[]` array, so filters must be looked up by DataTables `columns[i][name]` value rather than by fixed index (a fixed-index lookup is exactly what caused the SO dead-filter bug fixed in Task 5).

- [ ] **Step 1: Add the name-based filter lookup and date-range parsing**

Find (around line 3619-3623):
```csharp
                if (string.IsNullOrEmpty(sortColumnName)) { sortColumnName = "tanggal"; }
                if (string.IsNullOrEmpty(sortDirection)) { sortDirection = "desc"; }

                // Allow companyCode override from Next.js frontend (company switcher)
                string requestedCompanyCode = Request["companyCode"] ?? Request.Form["companyCode"] ?? Request.QueryString["companyCode"];
```
Replace with:
```csharp
                if (string.IsNullOrEmpty(sortColumnName)) { sortColumnName = "tanggal"; }
                if (string.IsNullOrEmpty(sortDirection)) { sortDirection = "desc"; }

                // Column-level search filters. This endpoint is shared by 6+ frontend
                // pages/widgets whose `columns[]` arrays differ in length and order, so
                // filters are looked up by DataTables `columns[i][name]` value instead of
                // by fixed index.
                Func<string, string> colSearch = (name) =>
                {
                    for (int i = 0; i < 20; i++)
                    {
                        if (Request["columns[" + i + "][name]"] == name)
                            return Request["columns[" + i + "][search][value]"];
                    }
                    return null;
                };
                string fil_bookingno = colSearch("bookingno");
                string fil_posto = colSearch("posto");
                string fil_nopol = colSearch("nopol");
                string fil_driver = colSearch("driver");
                string fil_produk = colSearch("idproduk");
                string fil_transport = colSearch("idtransport");
                string fil_tujuan = colSearch("tujuan");
                string fil_position = colSearch("positionString");
                string fil_tanggalCol = colSearch("tanggal");

                DateTime search_tanggalCol, search_tanggalCol_end;
                bool b_search_tanggalCol = DateRangeSearchHelper.TryGetDayRange(fil_tanggalCol, out search_tanggalCol, out search_tanggalCol_end);

                // Allow companyCode override from Next.js frontend (company switcher)
                string requestedCompanyCode = Request["companyCode"] ?? Request.Form["companyCode"] ?? Request.QueryString["companyCode"];
```

- [ ] **Step 2: Apply the new filters in the main query's `.Where()`**

Find:
```csharp
                    (string.IsNullOrEmpty(mode) || x.position != "00" && x.position != "07") &&
                    (string.IsNullOrEmpty(position) || x.position == position) &&
                    (string.IsNullOrEmpty(searchValue) ||
                        x.Produk.Nama.ToLower().Contains(searchValue.ToLower()) ||
                        x.posto.Contains(searchValue.ToLower()) ||
                        x.bookingno.Contains(searchValue.ToLower()) ||
                        x.tiketno.Contains(searchValue.ToLower()) ||
                        x.Transport.nama.ToLower().Contains(searchValue.ToLower()) ||
                        x.Posto1.Gudang1.Deskripsi.ToLower().Contains(searchValue.ToLower())
                    ))
                    .OrderBy(sortColumnName + " " + sortDirection);
```
Replace with:
```csharp
                    (string.IsNullOrEmpty(mode) || x.position != "00" && x.position != "07") &&
                    (string.IsNullOrEmpty(position) || x.position == position) &&
                    (string.IsNullOrEmpty(fil_bookingno) || x.bookingno.ToLower().Contains(fil_bookingno.ToLower())) &&
                    (string.IsNullOrEmpty(fil_posto) || x.posto.ToLower().Contains(fil_posto.ToLower())) &&
                    (string.IsNullOrEmpty(fil_nopol) || x.nopol.ToLower().Contains(fil_nopol.ToLower())) &&
                    (string.IsNullOrEmpty(fil_driver) || x.driver.ToLower().Contains(fil_driver.ToLower())) &&
                    (string.IsNullOrEmpty(fil_produk) || x.Produk.Nama.ToLower().Contains(fil_produk.ToLower())) &&
                    (string.IsNullOrEmpty(fil_transport) || x.Transport.nama.ToLower().Contains(fil_transport.ToLower())) &&
                    (string.IsNullOrEmpty(fil_tujuan) || x.Posto1.Gudang1.Deskripsi.ToLower().Contains(fil_tujuan.ToLower())) &&
                    (string.IsNullOrEmpty(fil_position) || x.M_Status1.keterangan.ToLower().Contains(fil_position.ToLower())) &&
                    (string.IsNullOrEmpty(fil_tanggalCol) || (b_search_tanggalCol && x.tanggal >= search_tanggalCol && x.tanggal < search_tanggalCol_end)) &&
                    (string.IsNullOrEmpty(searchValue) ||
                        x.Produk.Nama.ToLower().Contains(searchValue.ToLower()) ||
                        x.posto.Contains(searchValue.ToLower()) ||
                        x.bookingno.Contains(searchValue.ToLower()) ||
                        x.tiketno.Contains(searchValue.ToLower()) ||
                        x.Transport.nama.ToLower().Contains(searchValue.ToLower()) ||
                        x.Posto1.Gudang1.Deskripsi.ToLower().Contains(searchValue.ToLower())
                    ))
                    .OrderBy(sortColumnName + " " + sortDirection);
```

- [ ] **Step 3: Build**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)`.

- [ ] **Step 4: Live sanity check (if the local backend is running)**

```bash
curl -s -X POST "http://localhost:8090/api/Tiket/DataTableFilterLegacy" \
  -H "Content-Type: application/json" \
  -d '{"draw":1,"start":0,"length":10,"search":{"value":""},"columns":[{"data":"bookingno","name":"bookingno","searchable":true,"orderable":true,"search":{"value":"","regex":false}}]}' | head -c 300
```
Then repeat with a real `bookingno` substring in `search.value` and confirm `recordsFiltered` drops accordingly.

- [ ] **Step 5: Commit**

```bash
git add SISTROAWESOME/api/TiketController.cs
git commit -m "feat: DataTableFilterLegacy applies per-column and date-range search"
```

---

## Task 9: Tiket frontend — wire column search on `/tiket`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\tiket\page.tsx`

- [ ] **Step 1: Forward `columnFilters` in the fetcher**

Find:
```typescript
  const fetcher = async (params: DataTableParams) => {
    // Use DataTablePeriodeTiket if filtering by POSTO, otherwise use Legacy
    const endpoint = postoFilter ? "/api/Tiket/DataTablePeriodeTiket" : "/api/Tiket/DataTableFilterLegacy";

    const result = await apiTable(endpoint, {

      draw: params.draw,
      start: params.start,
      length: params.length,
      search: { value: params.search },
      companyCode,
      posto: postoFilter || undefined,
      SD: postoFilter ? "2020-01-01" : undefined,
      cmd: 'refresh',
      order: params.order?.length ? params.order : [{ column: 2, dir: "desc" }], // 2 = "tanggal"
      columns: [
        { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
        { data: "posto", name: "posto", searchable: true, orderable: true },
        { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
        { data: "shift", name: "idshift", searchable: true, orderable: true },
        { data: "produkString", name: "idproduk", searchable: true, orderable: true },
        { data: "nopol", name: "nopol", searchable: true, orderable: true },
        { data: "driver", name: "driver", searchable: true, orderable: true },
        { data: "transportString", name: "idtransport", searchable: true, orderable: true },
        { data: "tujuan", name: "tujuan", searchable: true, orderable: true },
        { data: "positionString", name: "positionString", searchable: true, orderable: true },
        { data: "position", name: "position", searchable: true, orderable: true },
        { data: "status", name: "statuspemuatan", searchable: true, orderable: true },
        { data: "createdat", name: "tanggal", searchable: true, orderable: true }
      ]
    });
```
Replace with:
```typescript
  const fetcher = async (params: DataTableParams) => {
    // Use DataTablePeriodeTiket if filtering by POSTO, otherwise use Legacy
    const endpoint = postoFilter ? "/api/Tiket/DataTablePeriodeTiket" : "/api/Tiket/DataTableFilterLegacy";
    const cf = params.columnFilters ?? {};
    const cs = (key: string) => ({ value: cf[key] || "" });

    const result = await apiTable(endpoint, {

      draw: params.draw,
      start: params.start,
      length: params.length,
      search: { value: params.search },
      companyCode,
      posto: postoFilter || undefined,
      SD: postoFilter ? "2020-01-01" : undefined,
      cmd: 'refresh',
      order: params.order?.length ? params.order : [{ column: 2, dir: "desc" }], // 2 = "tanggal"
      columns: [
        { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: cs("bookingno") },
        { data: "posto", name: "posto", searchable: true, orderable: true, search: cs("posto") },
        { data: "tanggalString", name: "tanggal", searchable: true, orderable: true, search: cs("tanggalString") },
        { data: "shift", name: "idshift", searchable: true, orderable: true },
        { data: "produkString", name: "idproduk", searchable: true, orderable: true, search: cs("produkString") },
        { data: "nopol", name: "nopol", searchable: true, orderable: true, search: cs("nopol") },
        { data: "driver", name: "driver", searchable: true, orderable: true, search: cs("driver") },
        { data: "transportString", name: "idtransport", searchable: true, orderable: true },
        { data: "tujuan", name: "tujuan", searchable: true, orderable: true },
        { data: "positionString", name: "positionString", searchable: true, orderable: true, search: cs("positionString") },
        { data: "position", name: "position", searchable: true, orderable: true },
        { data: "status", name: "statuspemuatan", searchable: true, orderable: true },
        { data: "createdat", name: "tanggal", searchable: true, orderable: true }
      ]
    });
```

- [ ] **Step 2: Mark the matching UI columns as searchable**

Find:
```typescript
    {

      key: "bookingno",
      header: "No Booking",
      sortColumn: 0,
      render: (t) => (
```
Replace with:
```typescript
    {

      key: "bookingno",
      header: "No Booking",
      searchable: true,
      sortColumn: 0,
      render: (t) => (
```

Find:
```typescript
    {
      key: "posto",
      header: "POSTO / SO",
      sortColumn: 1,
      render: (t) => (
```
Replace with:
```typescript
    {
      key: "posto",
      header: "POSTO / SO",
      searchable: true,
      sortColumn: 1,
      render: (t) => (
```

Find:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal Muat",
      sortColumn: 2,
      render: (t) => (
```
Replace with:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal Muat",
      searchable: true,
      searchType: "date",
      sortColumn: 2,
      render: (t) => (
```

Find:
```typescript
    {
      key: "produkString",
      header: "Produk",
      sortColumn: 4,
      render: (t) => (
```
Replace with:
```typescript
    {
      key: "produkString",
      header: "Produk",
      searchable: true,
      sortColumn: 4,
      render: (t) => (
```

Find:
```typescript
    {
      key: "nopol",
      header: "Armada",
      sortColumn: 5,
      render: (t) => (
```
Replace with:
```typescript
    {
      key: "nopol",
      header: "Armada",
      searchable: true,
      sortColumn: 5,
      render: (t) => (
```

Find:
```typescript
    {
      key: "driver",
      header: "Driver",
      sortColumn: 6,
      render: (t) => (
```
Replace with:
```typescript
    {
      key: "driver",
      header: "Driver",
      searchable: true,
      sortColumn: 6,
      render: (t) => (
```

Find:
```typescript
    {
      key: "positionString",
      header: "Posisi / Status",
      sortColumn: 9,
      render: (t) => (
```
Replace with:
```typescript
    {
      key: "positionString",
      header: "Posisi / Status",
      searchable: true,
      sortColumn: 9,
      render: (t) => (
```

- [ ] **Step 3: Type-check**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

- [ ] **Step 4: Manual verify**

`npm run dev`, open `/tiket`, confirm search boxes render for No Booking, POSTO/SO, Tanggal Muat (date picker), Produk, Armada, Driver, Posisi/Status, and each narrows results correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/tiket/page.tsx
git commit -m "feat: wire per-column and date search on /tiket"
```

---

## Task 10: Tiket frontend — wire column search on `/admin/tickets`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\admin\tickets\page.tsx`

`bookingno`/`posto`/`nopol`/`driver` are already wired; this task adds `tanggalString` (as a date picker), `produkString`, `transportString`, and `positionString`.

- [ ] **Step 1: Forward the remaining column filters in the fetcher**

Find:
```typescript
                columns: [
                  { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: p.columnFilters?.bookingno || "" } },
                  { data: "posto", name: "posto", searchable: true, orderable: true, search: { value: p.columnFilters?.posto || "" } },
                  { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
                  { data: "shift", name: "idshift", searchable: true, orderable: true },
                  { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: p.columnFilters?.nopol || "" } },
                  { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: p.columnFilters?.driver || "" } },
                  { data: "produkString", name: "idproduk", searchable: true, orderable: true },
                  { data: "transportString", name: "idtransport", searchable: true, orderable: true },
                  { data: "qty", name: "qty", searchable: true, orderable: true },
                  { data: "positionString", name: "positionString", searchable: true, orderable: true },
                  { data: "position", name: "position", searchable: true, orderable: true },
                  { data: "id", name: "id", searchable: false, orderable: true } // hidden sort key, keep as last column
                ]
```
Replace with:
```typescript
                columns: [
                  { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: p.columnFilters?.bookingno || "" } },
                  { data: "posto", name: "posto", searchable: true, orderable: true, search: { value: p.columnFilters?.posto || "" } },
                  { data: "tanggalString", name: "tanggal", searchable: true, orderable: true, search: { value: p.columnFilters?.tanggalString || "" } },
                  { data: "shift", name: "idshift", searchable: true, orderable: true },
                  { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: p.columnFilters?.nopol || "" } },
                  { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: p.columnFilters?.driver || "" } },
                  { data: "produkString", name: "idproduk", searchable: true, orderable: true, search: { value: p.columnFilters?.produkString || "" } },
                  { data: "transportString", name: "idtransport", searchable: true, orderable: true, search: { value: p.columnFilters?.transportString || "" } },
                  { data: "qty", name: "qty", searchable: true, orderable: true },
                  { data: "positionString", name: "positionString", searchable: true, orderable: true, search: { value: p.columnFilters?.positionString || "" } },
                  { data: "position", name: "position", searchable: true, orderable: true },
                  { data: "id", name: "id", searchable: false, orderable: true } // hidden sort key, keep as last column
                ]
```

- [ ] **Step 2: Mark the matching UI columns as searchable**

Find:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal",
      className: "text-[11px] font-bold",
      sortColumn: 2,
    },
```
Replace with:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal",
      searchable: true,
      searchType: "date",
      className: "text-[11px] font-bold",
      sortColumn: 2,
    },
```

Find:
```typescript
    {
      key: "produkString",
      header: "Produk",
      className: "text-[11px] font-bold text-gray-900 dark:text-white",
      sortColumn: 6,
    },
```
Replace with:
```typescript
    {
      key: "produkString",
      header: "Produk",
      searchable: true,
      className: "text-[11px] font-bold text-gray-900 dark:text-white",
      sortColumn: 6,
    },
```

Find:
```typescript
    {
      key: "transportString",
      header: "Transportir",
      className: "text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate max-w-[150px]",
      sortColumn: 7,
    },
```
Replace with:
```typescript
    {
      key: "transportString",
      header: "Transportir",
      searchable: true,
      className: "text-[10px] font-bold text-gray-500 uppercase tracking-tight truncate max-w-[150px]",
      sortColumn: 7,
    },
```

Find:
```typescript
    {
      key: "positionString",
      header: "Status",
      sortColumn: 9,
      render: (row: any) => {
```
Replace with:
```typescript
    {
      key: "positionString",
      header: "Status",
      searchable: true,
      sortColumn: 9,
      render: (row: any) => {
```

- [ ] **Step 3: Type-check**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

- [ ] **Step 4: Manual verify**

`npm run dev`, open `/admin/tickets`, confirm the four new search boxes (Tanggal date picker, Produk, Transportir, Status) filter correctly alongside the four that already worked.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/tickets/page.tsx
git commit -m "feat: wire remaining column and date search on /admin/tickets"
```

---

## Task 11: Tiket frontend — wire column search on `/tiket/dashboard`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\tiket\dashboard\page.tsx`

- [ ] **Step 1: Forward `columnFilters` in `tableFetcher`**

Find:
```typescript
      columns: [
        { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
        { data: "posto", name: "posto", searchable: true, orderable: true },
        { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
        { data: "nopol", name: "nopol", searchable: true, orderable: true },
        { data: "driver", name: "driver", searchable: true, orderable: true },
        { data: "produkString", name: "idproduk", searchable: true, orderable: true },
        { data: "transportString", name: "idtransport", searchable: true, orderable: true },
        { data: "tujuan", name: "tujuan", searchable: true, orderable: true },
        { data: "positionString", name: "positionString", searchable: true, orderable: true },
        { data: "position", name: "position", searchable: true, orderable: true },
        { data: "updatedon", name: "updatedon", searchable: true, orderable: true },
      ],
    });
```
Replace with:
```typescript
      columns: [
        { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: params.columnFilters?.bookingno || "" } },
        { data: "posto", name: "posto", searchable: true, orderable: true, search: { value: params.columnFilters?.posto || "" } },
        { data: "tanggalString", name: "tanggal", searchable: true, orderable: true, search: { value: params.columnFilters?.tanggalString || "" } },
        { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: params.columnFilters?.nopol || "" } },
        { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: params.columnFilters?.driver || "" } },
        { data: "produkString", name: "idproduk", searchable: true, orderable: true, search: { value: params.columnFilters?.produkString || "" } },
        { data: "transportString", name: "idtransport", searchable: true, orderable: true, search: { value: params.columnFilters?.transportString || "" } },
        { data: "tujuan", name: "tujuan", searchable: true, orderable: true, search: { value: params.columnFilters?.tujuan || "" } },
        { data: "positionString", name: "positionString", searchable: true, orderable: true, search: { value: params.columnFilters?.positionString || "" } },
        { data: "position", name: "position", searchable: true, orderable: true },
        { data: "updatedon", name: "updatedon", searchable: true, orderable: true },
      ],
    });
```

- [ ] **Step 2: Mark the matching UI columns as searchable**

Find:
```typescript
    {
      key: "posto",
      header: "POSTO",
      className: "font-semibold text-gray-800 dark:text-gray-200",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 1,
    },
```
Replace with:
```typescript
    {
      key: "posto",
      header: "POSTO",
      searchable: true,
      className: "font-semibold text-gray-800 dark:text-gray-200",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 1,
    },
```

Find:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal",
      className: "text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 2,
    },
```
Replace with:
```typescript
    {
      key: "tanggalString",
      header: "Tanggal",
      searchable: true,
      searchType: "date",
      className: "text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 2,
    },
```

Find:
```typescript
    {
      key: "produkString",
      header: "Produk",
      headerClassName: "w-[220px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 5,
    },
```
Replace with:
```typescript
    {
      key: "produkString",
      header: "Produk",
      searchable: true,
      headerClassName: "w-[220px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 5,
    },
```

Find:
```typescript
    {
      key: "transportString",
      header: "Transportir",
      headerClassName: "w-[200px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 6,
    },
```
Replace with:
```typescript
    {
      key: "transportString",
      header: "Transportir",
      searchable: true,
      headerClassName: "w-[200px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 6,
    },
```

Find:
```typescript
    {
      key: "tujuan",
      header: "Tujuan",
      headerClassName: "w-[180px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 7,
    },
```
Replace with:
```typescript
    {
      key: "tujuan",
      header: "Tujuan",
      searchable: true,
      headerClassName: "w-[180px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 7,
    },
```

Find:
```typescript
    {
      key: "nopol",
      header: "Nopol",
      className: "font-bold text-gray-800 dark:text-gray-200",
      headerClassName: "w-[120px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 3,
    },
```
Replace with:
```typescript
    {
      key: "nopol",
      header: "Nopol",
      searchable: true,
      className: "font-bold text-gray-800 dark:text-gray-200",
      headerClassName: "w-[120px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 3,
    },
```

Find:
```typescript
    {
      key: "driver",
      header: "Driver",
      headerClassName: "w-[120px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 4,
    },
```
Replace with:
```typescript
    {
      key: "driver",
      header: "Driver",
      searchable: true,
      headerClassName: "w-[120px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 4,
    },
```

Find:
```typescript
    {
      key: "positionString",
      header: "Posisi",
      render: (row) => row.positionString ? (
```
Replace with:
```typescript
    {
      key: "positionString",
      header: "Posisi",
      searchable: true,
      render: (row) => row.positionString ? (
```

Find:
```typescript
    {
      key: "bookingno",
      header: "Kode SISTRO",
      className: "font-bold text-blue-600 dark:text-blue-400 font-mono",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 0,
    },
```
Replace with:
```typescript
    {
      key: "bookingno",
      header: "Kode SISTRO",
      searchable: true,
      className: "font-bold text-blue-600 dark:text-blue-400 font-mono",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 0,
    },
```

- [ ] **Step 3: Type-check**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

- [ ] **Step 4: Manual verify**

`npm run dev`, open `/tiket/dashboard`, confirm search boxes for POSTO, Tanggal (date picker), Produk, Transportir, Tujuan, Nopol, Driver, Posisi, Kode SISTRO all filter the "Realisasi Tiket" table correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/tiket/dashboard/page.tsx
git commit -m "feat: wire per-column and date search on /tiket/dashboard"
```

---

## Task 12: Tiket frontend — wire column search on the 3 live-queue dashboard widgets

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\components\dashboard\GudangDashboard.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\components\dashboard\JBTDashboard.tsx`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\components\dashboard\SecurityDashboard.tsx`

These three widgets show no date column, so this task is text-search only: `bookingno`, `nopol`, `driver`, `produkString`. All three files have the identical structure — apply the same edit to each.

- [ ] **Step 1: `GudangDashboard.tsx` — forward `columnFilters` in the fetcher**

Find:
```typescript
        columns: [
          { data: "tanggal", name: "tanggal", searchable: false, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "produkString", name: "idproduk", searchable: true, orderable: true },
        ]
      });
```
Replace with:
```typescript
        columns: [
          { data: "tanggal", name: "tanggal", searchable: false, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: params.columnFilters?.bookingno || "" } },
          { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: params.columnFilters?.nopol || "" } },
          { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: params.columnFilters?.driver || "" } },
          { data: "produkString", name: "idproduk", searchable: true, orderable: true, search: { value: params.columnFilters?.produkString || "" } },
        ]
      });
```

- [ ] **Step 2: `GudangDashboard.tsx` — mark the UI columns searchable**

Find:
```typescript
    {
      key: "bookingno",
      header: "No Booking / Tiket",
      sortColumn: 0,
      render: (t) => (
```
Replace with:
```typescript
    {
      key: "bookingno",
      header: "No Booking / Tiket",
      searchable: true,
      sortColumn: 0,
      render: (t) => (
```

Find:
```typescript
    {
      key: "nopol",
      header: "Plat Nomor",
      sortColumn: 1,
      render: (t) => <span className="font-bold font-mono text-gray-800 dark:text-gray-200">{t.nopol}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      sortColumn: 2,
      render: (t) => <span className="text-gray-600 dark:text-gray-400">{t.driver}</span>,
    },
    {
      key: "produkString",
      header: "Produk",
      sortColumn: 3,
      render: (t) => <span className="font-semibold text-brand-600 dark:text-brand-400">{t.produkString}</span>,
    },
```
Replace with:
```typescript
    {
      key: "nopol",
      header: "Plat Nomor",
      searchable: true,
      sortColumn: 1,
      render: (t) => <span className="font-bold font-mono text-gray-800 dark:text-gray-200">{t.nopol}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      searchable: true,
      sortColumn: 2,
      render: (t) => <span className="text-gray-600 dark:text-gray-400">{t.driver}</span>,
    },
    {
      key: "produkString",
      header: "Produk",
      searchable: true,
      sortColumn: 3,
      render: (t) => <span className="font-semibold text-brand-600 dark:text-brand-400">{t.produkString}</span>,
    },
```

- [ ] **Step 3: `JBTDashboard.tsx` — apply the identical fetcher edit**

Find:
```typescript
        columns: [
          { data: "tanggal", name: "tanggal", searchable: false, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "produkString", name: "idproduk", searchable: true, orderable: true },
        ]
      });
```
Replace with:
```typescript
        columns: [
          { data: "tanggal", name: "tanggal", searchable: false, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: params.columnFilters?.bookingno || "" } },
          { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: params.columnFilters?.nopol || "" } },
          { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: params.columnFilters?.driver || "" } },
          { data: "produkString", name: "idproduk", searchable: true, orderable: true, search: { value: params.columnFilters?.produkString || "" } },
        ]
      });
```

- [ ] **Step 4: `JBTDashboard.tsx` — mark the UI columns searchable**

Find:
```typescript
    {
      key: "bookingno",
      header: "No Booking / Tiket",
      render: (t) => (
```
Replace with:
```typescript
    {
      key: "bookingno",
      header: "No Booking / Tiket",
      searchable: true,
      render: (t) => (
```

Find:
```typescript
    {
      key: "nopol",
      header: "Plat Nomor",
      render: (t) => <span className="font-bold font-mono text-gray-900 dark:text-white text-xs">{t.nopol}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      render: (t) => <span className="text-gray-600 dark:text-gray-400 text-xs">{t.driver}</span>,
    },
    {
      key: "produkString",
      header: "Produk",
      render: (t) => <span className="text-gray-500 text-xs">{t.produkString}</span>,
    },
```
Replace with:
```typescript
    {
      key: "nopol",
      header: "Plat Nomor",
      searchable: true,
      render: (t) => <span className="font-bold font-mono text-gray-900 dark:text-white text-xs">{t.nopol}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      searchable: true,
      render: (t) => <span className="text-gray-600 dark:text-gray-400 text-xs">{t.driver}</span>,
    },
    {
      key: "produkString",
      header: "Produk",
      searchable: true,
      render: (t) => <span className="text-gray-500 text-xs">{t.produkString}</span>,
    },
```

- [ ] **Step 5: `SecurityDashboard.tsx` — apply the identical fetcher edit**

Find:
```typescript
        columns: [
          { data: "tanggal", name: "tanggal", searchable: false, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "produkString", name: "idproduk", searchable: true, orderable: true },
        ]
      });
```
Replace with:
```typescript
        columns: [
          { data: "tanggal", name: "tanggal", searchable: false, orderable: true },
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true, search: { value: params.columnFilters?.bookingno || "" } },
          { data: "nopol", name: "nopol", searchable: true, orderable: true, search: { value: params.columnFilters?.nopol || "" } },
          { data: "driver", name: "driver", searchable: true, orderable: true, search: { value: params.columnFilters?.driver || "" } },
          { data: "produkString", name: "idproduk", searchable: true, orderable: true, search: { value: params.columnFilters?.produkString || "" } },
        ]
      });
```

- [ ] **Step 6: `SecurityDashboard.tsx` — mark the UI columns searchable**

Find:
```typescript
    {
      key: "bookingno",
      header: "No Booking / Tiket",
      render: (t) => (
```
Replace with:
```typescript
    {
      key: "bookingno",
      header: "No Booking / Tiket",
      searchable: true,
      render: (t) => (
```

Find:
```typescript
    {
      key: "nopol",
      header: "Plat Nomor",
      render: (t) => <span className="font-bold font-mono text-gray-800 dark:text-gray-200 text-xs">{t.nopol}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      render: (t) => <span className="text-gray-600 dark:text-gray-400 text-xs">{t.driver}</span>,
    },
    {
      key: "produkString",
      header: "Produk",
      render: (t) => <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{t.produkString}</span>,
    },
```
Replace with:
```typescript
    {
      key: "nopol",
      header: "Plat Nomor",
      searchable: true,
      render: (t) => <span className="font-bold font-mono text-gray-800 dark:text-gray-200 text-xs">{t.nopol}</span>,
    },
    {
      key: "driver",
      header: "Driver",
      searchable: true,
      render: (t) => <span className="text-gray-600 dark:text-gray-400 text-xs">{t.driver}</span>,
    },
    {
      key: "produkString",
      header: "Produk",
      searchable: true,
      render: (t) => <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{t.produkString}</span>,
    },
```

- [ ] **Step 7: Type-check**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

- [ ] **Step 8: Manual verify**

`npm run dev`, visit the Gudang, JBT (weighbridge), and Security dashboards, confirm each widget's small ticket table now shows working search boxes for No Booking, Plat Nomor, Driver, Produk.

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/GudangDashboard.tsx src/components/dashboard/JBTDashboard.tsx src/components/dashboard/SecurityDashboard.tsx
git commit -m "feat: wire per-column search on the live-queue dashboard widgets"
```

---

## What's next (separate plans, not in this phase)

- **Riwayat Tiket embedded history tables** (in `posto/page.tsx`, `so/page.tsx`, `posto/so/page.tsx`, `TicketBookingDetail.tsx`) — all hit `TiketController.DataTablePeriodeTiket`, which has a working `SD`/`ED` day-range already but no UI ever calls it.
- **`/tiket/booking`** (`POSTOController.AvailableBaru`) — backend already supports per-column search; only the UI `searchable` flags and date-picker types are missing.
- **Reports**: `/reports/posto` (`POSTOController.DataTable`), `/reports/tiket-pi` (`TiketController.DashboardTiket`), `/reports/resume`+`loading`+`tickets`+`booking` (all four share `TiketController.DataReport`), `/reports/cancelation` (`TiketController.TiketCancelDataReport`, plus a one-line `produk` filter no-op bug worth fixing alongside), `/reports/log-bypass` (`TiketController.LogBypass`) — none of these backends read `columns[i][search][value]` at all today.
- **`/antrian`** (`AntrianController.DataTable`) — same gap as the reports above.
- **`/pengajuan/jatuh-tempo`** — the frontend doesn't even forward the global search term today; needs its own investigation of the `Apg` controller before a plan can be written.
- **`PostoListView.tsx`** (`/weighbridge/posto`, `/warehouse/posto`, `/security/posto`) — needs to be wired to real POSTO data before "add search" is even a meaningful ask there.
