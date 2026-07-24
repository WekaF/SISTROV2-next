# Fix Grup Truk and Produk Column Display Bugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Fix two display bugs: (1) the "Grup Truk" column on `/tiket/booking` shows a numeric ID guess instead of the real truck-group name, and (2) the "Produk" column on `/tiket?posto=...` (Riwayat Lengkap POSTO) always shows "-" instead of the product name.

**Architecture:** Both bugs are backend data-shape bugs surfaced through an already-correct frontend. Bug 1: `POSTOController.AvailableBaru()` in the ASP.NET backend hard-codes `gruptrukString = "HEHE"` (a placeholder that was never wired up), so the Next.js booking page falls back to a hand-rolled, incomplete ID→name switch statement. Fix: resolve the real name server-side via the `M_GrupTruk` lookup table (through a new, unit-tested `GrupTrukHelper`), then have the frontend render that field directly and delete the guesswork switch. Bug 2: `TiketController.DataTablePeriodeTiket()` (the endpoint used whenever the tiket list is filtered by `?posto=`) omits `idproduk`/`produkString` from its `TiketView` projection, unlike every sibling endpoint in that controller. Fix: add the missing two fields, following the exact pattern (`x.Produk != null ? x.Produk.Nama : "-"`) already used elsewhere in the same file.

**Tech Stack:** ASP.NET Framework 4.8 (Web API, Entity Framework 6) in `C:\Users\weka\Indigo\sistropigroup`, MSTest (`ClassLibrary1/SISTRO.Tests.csproj`), MSBuild — for the backend fixes. Next.js 16 / React / TypeScript in `C:\Users\weka\Indigo\SISTROV2-next` — for the frontend column render fix.

---

## Root cause summary (verified by reading the code, not guessed)

- **Bug 1 (Grup Truk):** `POSTOController.cs:1407` sets `gruptrukString = "HEHE"` — a literal placeholder string, never replaced with a real lookup. The `POSTOView` model (`Models/POSTOView.cs:78-79`) already has both `gruptruk` (the raw `int? IdGrupTruk`) and `gruptrukString` fields — only the second was never populated correctly. The frontend (`src/app/tiket/booking/page.tsx:227-253`) works around this by guessing names from `row.IdGrupTruk` (which doesn't even exist in the API response — the real field is lowercase `gruptruk`) via a hardcoded `switch`, which is exactly the "showing the ID, not the name" behavior being reported.
- **Bug 2 (Produk):** `TiketController.cs`, `DataTablePeriodeTiket()` (the endpoint hit whenever `src/app/tiket/page.tsx` has a `posto` query param — see `endpoint = postoFilter ? "/api/Tiket/DataTablePeriodeTiket" : "/api/Tiket/DataTableFilterLegacy"` at `tiket/page.tsx:50`), builds its `TiketView` projection at lines 4355-4382 without `idproduk`/`produkString`. Every other `TiketView`-producing action in this file (`Aktif()` at line 4422-4423, and ~10 others) includes `idproduk = x.idproduk, produkString = x.Produk.Nama` (or the null-safe variant). This one endpoint was simply missed. The frontend (`tiket/page.tsx:142-151`) already reads `t.produkString ?? "-"` correctly — it just never receives the field, hence the permanent "-".

---

### Task 1: Add `GrupTrukHelper` to resolve truck-group names

**Files:**
- Create: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Helper\GrupTrukHelper.cs`
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj`
- Test: `C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\GrupTrukHelperTest.cs`
- Modify: `C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\SISTRO.Tests.csproj`

- [x] **Step 1: Write the failing test**

Create `C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\GrupTrukHelperTest.cs`:

```csharp
using System.Collections.Generic;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SISTROAWESOME.Helper;

[TestClass]
public class GrupTrukHelperTest
{
    [TestMethod]
    public void ResolveName_KnownId_ReturnsMappedName()
    {
        var names = new Dictionary<int, string> { { 3, "Trintin" } };
        string result = GrupTrukHelper.ResolveName(3, names);
        Assert.AreEqual("Trintin", result);
    }

    [TestMethod]
    public void ResolveName_NullId_ReturnsAllGrup()
    {
        // POSTO.IdGrupTruk is nullable: no restriction means "All Grup", not blank.
        var names = new Dictionary<int, string> { { 3, "Trintin" } };
        string result = GrupTrukHelper.ResolveName(null, names);
        Assert.AreEqual("All Grup", result);
    }

    [TestMethod]
    public void ResolveName_UnmappedId_ReturnsAllGrup()
    {
        // An id with no matching M_GrupTruk row must not leak the raw id to the UI.
        var names = new Dictionary<int, string> { { 3, "Trintin" } };
        string result = GrupTrukHelper.ResolveName(99, names);
        Assert.AreEqual("All Grup", result);
    }

    [TestMethod]
    public void ResolveName_EmptyDictionary_ReturnsAllGrup()
    {
        string result = GrupTrukHelper.ResolveName(3, new Dictionary<int, string>());
        Assert.AreEqual("All Grup", result);
    }
}
```

Add the linked file to `ClassLibrary1/SISTRO.Tests.csproj`. Open the file and find the `<ItemGroup>` containing the existing `<Compile Include="...Test.cs" />` entries (starting at line 74). Add these to that same group:

```xml
    <Compile Include="GrupTrukHelperTest.cs" />
    <Compile Include="..\SISTROAWESOME\Helper\GrupTrukHelper.cs">
      <Link>GrupTrukHelper.cs</Link>
    </Compile>
```

- [x] **Step 2: Run test to verify it fails (helper doesn't exist yet)**

Run:
```
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\SISTRO.Tests.csproj" /p:Configuration=Debug
```
Expected: `BUILD FAILED` with `The type or namespace name 'GrupTrukHelper' could not be found` (CS0246), because the linked file doesn't exist on disk yet.

- [x] **Step 3: Write minimal implementation**

Create `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Helper\GrupTrukHelper.cs`:

```csharp
using System.Collections.Generic;

namespace SISTROAWESOME.Helper
{
    public static class GrupTrukHelper
    {
        // idGrupTruk is nullable (no restriction set) and may reference a
        // deleted/unmapped M_GrupTruk row; either case must fall back to
        // "All Grup" rather than leak the raw numeric id to the UI.
        public static string ResolveName(int? idGrupTruk, IDictionary<int, string> namesById)
        {
            string name;
            if (idGrupTruk.HasValue && namesById != null &&
                namesById.TryGetValue(idGrupTruk.Value, out name) && !string.IsNullOrEmpty(name))
            {
                return name;
            }
            return "All Grup";
        }
    }
}
```

Add the new file to `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj` right after line 882 (`<Compile Include="Helper\ArmadaEligibilityHelper.cs" />`):

```xml
    <Compile Include="Helper\GrupTrukHelper.cs" />
```

- [x] **Step 4: Run test to verify it passes**

Run:
```
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\SISTRO.Tests.csproj" /p:Configuration=Debug
"C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\Extensions\TestPlatform\vstest.console.exe" "C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\bin\Debug\ClassLibrary1.dll" /Tests:ResolveName_KnownId_ReturnsMappedName,ResolveName_NullId_ReturnsAllGrup,ResolveName_UnmappedId_ReturnsAllGrup,ResolveName_EmptyDictionary_ReturnsAllGrup
```
Expected: `Passed! - Failed: 0, Passed: 4, Skipped: 0, Total: 4`

- [x] **Step 5: Commit**

```bash
git add SISTROAWESOME/Helper/GrupTrukHelper.cs SISTROAWESOME/SISTROAWESOME.csproj ClassLibrary1/GrupTrukHelperTest.cs ClassLibrary1/SISTRO.Tests.csproj
git commit -m "feat: add GrupTrukHelper to resolve truck-group id to name"
```

---

### Task 2: Wire `GrupTrukHelper` into `POSTOController.AvailableBaru()`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\POSTOController.cs:1-18` (usings)
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\POSTOController.cs:1371-1422` (`AvailableBaru`)

- [x] **Step 1: Add the `using` for the Helper namespace**

Current code (`api/POSTOController.cs:1-18`):

```csharp
using SISTROAWESOME.BDO;
using SISTROAWESOME.Models;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using System.Data.SqlClient;
using System.Linq;
using System.Linq.Dynamic;
using System.Net;
using System.Web;
using System.Web.Http;
using System.Web.Http.Results;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Diagnostics;
using System.Net.Http;
using System.Configuration;
```

Replace with:

```csharp
using SISTROAWESOME.BDO;
using SISTROAWESOME.Helper;
using SISTROAWESOME.Models;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using System.Data.SqlClient;
using System.Linq;
using System.Linq.Dynamic;
using System.Net;
using System.Web;
using System.Web.Http;
using System.Web.Http.Results;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Diagnostics;
using System.Net.Http;
using System.Configuration;
```

- [x] **Step 2: Preload the id→name lookup and use it in the projection**

Current code (`api/POSTOController.cs:1370-1422`):

```csharp
            //paging
            var dataPaging = dataSearch.Skip(start).Take(length);
            //select
            List<POSTOView> dataSelect = dataPaging.AsEnumerable().Select((x, i) => new POSTOView
                {
                    //number = i + 1,
                    //numberString = (x.charter == "1") ? ("<div class='txt_charter'>charter</div>" + (i + 1).ToString()) : (i + 1).ToString(),
                    numberString =
                    (x.charter == "1" ? "<div class='txt_charter'>charter</div>" : "") +
                    (x.Percepatan == "1" ? "<div class='txt_percepatan'>percepatan</div>" : "") +
                    (i + 1).ToString(),
                    id = x.id,
                    guid = x.guid,
                    noposto = x.noposto,
                    tglposto = x.tglposto,
                    plant = x.Company.company1,
                    companyCode = x.Company.company_code,
                    tanggalString = String.Format("{0:dd MMMM yyyy}", x.tglposto),
                    asal = x.asal,
                    asalString = x.Gudang != null ? x.Gudang.Deskripsi : "-",
                    tujuan = x.tujuan,
                    //tujuanString = x.Gudang1 != null ? x.Gudang1.Deskripsi : "",
                    tujuanString = (!x.noposto.StartsWith("5")) ? (x.Transport1 != null ? x.Transport1.nama : "") : (db.Gudang.Where(z => z.ID == x.tujuan).Select(z => z.Deskripsi).FirstOrDefault() ?? ""),

                    transport = x.transport,
                    transportString = x.Transport1 != null ? x.Transport1.nama : "-",
                    produk = x.produk,
                    produkString = x.Produk1 != null ? x.Produk1.Nama : "-",
                    qty = x.qty,
                    status = x.status,
                    statusString = x.status == "1" ? "Aktif" : "Non Aktif",
                    updatedon = x.updatedon,
                    updatedonString = String.Format("{0:dd MMMM yyyy}", x.updatedon),
                    updatedby = x.updatedby,
                    tglakhir = x.tglakhir,
                    tglakhirString = String.Format("{0:dd MMMM yyyy}", x.tglakhir),
                    qtyrencana = x.qtyrencana,
                    gruptrukString = "HEHE",
                    qtyrealisasi = x.qtyrealisasi,
                    qtysisaBooking = (x.qty ?? 0) - (x.qtyrencana ?? 0),
                    qtysisaRealisasi = (x.qty ?? 0) - (x.qtyrealisasi ?? 0),
                    qtyIntransit = (x.qtyrencana ?? 0) - (x.qtyrealisasi ?? 0),
                    cutoff = String.IsNullOrEmpty(x.cutoff) ? "Belum Cut Off" : "Cut Off",
                    wilayah = x.M_Wilayah != null ? x.M_Wilayah.keterangan : "-",
                    tgljatuhtempo = x.tgljatuhtempo,
                    tanggaljatuhtempoString = String.Format("{0:dd MMMM yyyy}", x.tgljatuhtempo),
                    charter = x.charter,
                    Action = pesan + PublicUrl(this.Url.Link("Default", new { Controller = "Tiket", Action = "PilihPeriode", id = x.guid })) + pesan2 +
                    print1 + "" + PublicUrl(this.Url.Link("Default", new { Controller = "POSTO", Action = "Print", x.noposto })) + print2,
                    gruptruk = x.IdGrupTruk,
                    

                }).ToList();
```

Replace with:

```csharp
            //paging
            var dataPaging = dataSearch.Skip(start).Take(length);
            //select
            var grupTrukNames = db.M_GrupTruk.ToDictionary(g => g.Id, g => g.Nama);
            List<POSTOView> dataSelect = dataPaging.AsEnumerable().Select((x, i) => new POSTOView
                {
                    //number = i + 1,
                    //numberString = (x.charter == "1") ? ("<div class='txt_charter'>charter</div>" + (i + 1).ToString()) : (i + 1).ToString(),
                    numberString =
                    (x.charter == "1" ? "<div class='txt_charter'>charter</div>" : "") +
                    (x.Percepatan == "1" ? "<div class='txt_percepatan'>percepatan</div>" : "") +
                    (i + 1).ToString(),
                    id = x.id,
                    guid = x.guid,
                    noposto = x.noposto,
                    tglposto = x.tglposto,
                    plant = x.Company.company1,
                    companyCode = x.Company.company_code,
                    tanggalString = String.Format("{0:dd MMMM yyyy}", x.tglposto),
                    asal = x.asal,
                    asalString = x.Gudang != null ? x.Gudang.Deskripsi : "-",
                    tujuan = x.tujuan,
                    //tujuanString = x.Gudang1 != null ? x.Gudang1.Deskripsi : "",
                    tujuanString = (!x.noposto.StartsWith("5")) ? (x.Transport1 != null ? x.Transport1.nama : "") : (db.Gudang.Where(z => z.ID == x.tujuan).Select(z => z.Deskripsi).FirstOrDefault() ?? ""),

                    transport = x.transport,
                    transportString = x.Transport1 != null ? x.Transport1.nama : "-",
                    produk = x.produk,
                    produkString = x.Produk1 != null ? x.Produk1.Nama : "-",
                    qty = x.qty,
                    status = x.status,
                    statusString = x.status == "1" ? "Aktif" : "Non Aktif",
                    updatedon = x.updatedon,
                    updatedonString = String.Format("{0:dd MMMM yyyy}", x.updatedon),
                    updatedby = x.updatedby,
                    tglakhir = x.tglakhir,
                    tglakhirString = String.Format("{0:dd MMMM yyyy}", x.tglakhir),
                    qtyrencana = x.qtyrencana,
                    gruptrukString = GrupTrukHelper.ResolveName(x.IdGrupTruk, grupTrukNames),
                    qtyrealisasi = x.qtyrealisasi,
                    qtysisaBooking = (x.qty ?? 0) - (x.qtyrencana ?? 0),
                    qtysisaRealisasi = (x.qty ?? 0) - (x.qtyrealisasi ?? 0),
                    qtyIntransit = (x.qtyrencana ?? 0) - (x.qtyrealisasi ?? 0),
                    cutoff = String.IsNullOrEmpty(x.cutoff) ? "Belum Cut Off" : "Cut Off",
                    wilayah = x.M_Wilayah != null ? x.M_Wilayah.keterangan : "-",
                    tgljatuhtempo = x.tgljatuhtempo,
                    tanggaljatuhtempoString = String.Format("{0:dd MMMM yyyy}", x.tgljatuhtempo),
                    charter = x.charter,
                    Action = pesan + PublicUrl(this.Url.Link("Default", new { Controller = "Tiket", Action = "PilihPeriode", id = x.guid })) + pesan2 +
                    print1 + "" + PublicUrl(this.Url.Link("Default", new { Controller = "POSTO", Action = "Print", x.noposto })) + print2,
                    gruptruk = x.IdGrupTruk,

                }).ToList();
```

The lookup is a single query over the small `M_GrupTruk` master table, built once per request outside the per-row loop — no N+1.

- [x] **Step 3: Build the web project to confirm no compile errors**

Run:
```
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /p:Configuration=Debug /t:Build
```
Expected: `Build succeeded. 0 Error(s)` (pre-existing warnings are fine).

- [x] **Step 4: Commit**

```bash
git add SISTROAWESOME/api/POSTOController.cs
git commit -m "fix: resolve real grup truk name instead of placeholder in AvailableBaru"
```

---

### Task 3: Render `gruptrukString` on the booking page instead of guessing from an id

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\tiket\booking\page.tsx:227-253`

- [x] **Step 1: Replace the hardcoded id→name switch with the real backend field**

Current code (`src/app/tiket/booking/page.tsx:227-253`):

```tsx
              {
                key: "gruptruk",
                header: "Grup Truk",
                render: (row: any) => {
                  const getGrupTrukName = (id: number) => {
                    switch (id) {
                      case 1: return "Colt Diesel (CDD)";
                      case 2: return "Engkel/Fuso";
                      case 3: return "Trintin";
                      case 4: return "Tronton";
                      case 5: return "Gandengan";
                      case 6: return "Trinton";
                      case 7: return "Trintin Gandengan";
                      case 8:
                      case 9: return "Trailler 20 Ft";
                      case 10:
                      case 11: return "Trailler 40 Ft";
                      default: return row.gruptruk || "All Grup";
                    }
                  };
                  return (
                    <div className="font-bold text-gray-400 font-mono text-[10px] whitespace-nowrap uppercase">
                      {getGrupTrukName(row.IdGrupTruk)}
                    </div>
                  );
                }
              },
```

Replace with:

```tsx
              {
                key: "gruptruk",
                header: "Grup Truk",
                render: (row: any) => (
                  <div className="font-bold text-gray-400 font-mono text-[10px] whitespace-nowrap uppercase">
                    {row.gruptrukString || "-"}
                  </div>
                )
              },
```

`gruptrukString` now comes pre-resolved from the backend (Task 2) — the frontend no longer needs to guess a name from an id.

- [x] **Step 2: Verify against the running app**

1. Start both projects: `cd C:\Users\weka\Indigo\sistropigroup && .\start-dev.ps1` (or run the frontend alone with `npm run dev:local` from `SISTROV2-next` if the backend is already running).
2. Log in as a Transport-role user with at least one active POSTO order, and open `/tiket/booking`.
3. Confirm the "Grup Truk" column shows a real name (e.g. "Trintin", "Tronton", or "All Grup") for every row — never a bare number.

- [x] **Step 3: Commit**

```bash
git add src/app/tiket/booking/page.tsx
git commit -m "fix: render resolved grup truk name instead of guessing from id"
```

---

### Task 4: Fix missing Produk column on the POSTO ticket history endpoint

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs:4355-4382` (`DataTablePeriodeTiket`)

- [x] **Step 1: Add `idproduk`/`produkString` to the `TiketView` projection**

Current code (`api/TiketController.cs:4355-4382`):

```csharp
                List<TiketView> dt = datapaging.AsEnumerable().Select((x, i) => new TiketView
                {
                    number = i + 1,
                    id = x.id,
                    bookingno = x.bookingno,
                    tanggalString = String.Format("{0:dd MMMM yyyy}", x.tanggal),
                    shift = x.Kuota4Shift.shift,
                    nopol = x.nopol,
                    driver = x.driver,
                    updatedonString = String.Format("{0:dd MMMM yyyy}", x.updatedon),
                    qty = x.qty,
                    // statuspemuatan & position are required by the Next.js frontend
                    // (TicketActions canEdit/canDelete guards) — do NOT remove.
                    statuspemuatan = x.statuspemuatan,
                    position = x.position,
                    //positionString = x.M_Status1.keterangan,
                    positionString = th.statusTiket(x.bookingno, x.position, x.Posto1.company_code),
                    posto = x.posto,
                    charter = x.Posto1 != null ? x.Posto1.charter : null,
                    Action = track1 + this.Url.Link("Default", new { Controller = "Tiket", Action = "Track", id = x.bookingno }) + track2 + "" +
```

Replace with:

```csharp
                List<TiketView> dt = datapaging.AsEnumerable().Select((x, i) => new TiketView
                {
                    number = i + 1,
                    id = x.id,
                    bookingno = x.bookingno,
                    tanggalString = String.Format("{0:dd MMMM yyyy}", x.tanggal),
                    shift = x.Kuota4Shift.shift,
                    nopol = x.nopol,
                    driver = x.driver,
                    updatedonString = String.Format("{0:dd MMMM yyyy}", x.updatedon),
                    qty = x.qty,
                    idproduk = x.idproduk,
                    produkString = x.Produk != null ? x.Produk.Nama : "-",
                    // statuspemuatan & position are required by the Next.js frontend
                    // (TicketActions canEdit/canDelete guards) — do NOT remove.
                    statuspemuatan = x.statuspemuatan,
                    position = x.position,
                    //positionString = x.M_Status1.keterangan,
                    positionString = th.statusTiket(x.bookingno, x.position, x.Posto1.company_code),
                    posto = x.posto,
                    charter = x.Posto1 != null ? x.Posto1.charter : null,
                    Action = track1 + this.Url.Link("Default", new { Controller = "Tiket", Action = "Track", id = x.bookingno }) + track2 + "" +
```

This matches the exact pattern already used at `TiketController.cs:4422-4423` (`Aktif()`) and ~10 other actions in this same file. `TiketView.idproduk` and `TiketView.produkString` already exist as fields (`Models/TiketView.cs:29,72`) — no model change needed. No frontend change is needed either: `src/app/tiket/page.tsx:142-151` already renders `t.produkString ?? "-"` and `t.idproduk`.

- [x] **Step 2: Build the web project to confirm no compile errors**

Run:
```
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /p:Configuration=Debug /t:Build
```
Expected: `Build succeeded. 0 Error(s)` (pre-existing warnings are fine).

- [x] **Step 3: Verify against the running app**

1. With both projects running, open `https://sistrov2-next.vercel.app/tiket?posto=088e99e2-5e26-41ba-94cd-548cd25d56d1` (or the local equivalent `http://localhost:3000/tiket?posto=<a real POSTO guid or noposto>`).
2. Confirm the "Produk" column shows the real product name (with the `idproduk` code in small text underneath) for every row, instead of "-".
3. Open `/tiket` **without** a `posto` query param and confirm the Produk column still works there too (this path uses `DataTableFilterLegacy`, which was already correct — check for regressions, none expected since that endpoint wasn't touched).

- [x] **Step 4: Commit**

```bash
git add SISTROAWESOME/api/TiketController.cs
git commit -m "fix: include produk name in POSTO-filtered ticket history endpoint"
```

---

## Self-review notes

- **Spec coverage:** Task 1+2+3 cover the Grup Truk bug (backend resolves the real name; frontend renders it instead of guessing). Task 4 covers the Produk "-" bug on the POSTO history page. Both reported URLs are addressed.
- **Placeholder scan:** No TBD/TODO left; every step has literal, exact code taken from the real files.
- **Type consistency:** `GrupTrukHelper.ResolveName(int?, IDictionary<int,string>)` signature is identical between its definition (Task 1) and call site (Task 2). `gruptrukString` is the exact `POSTOView` property name used by both the backend assignment (Task 2) and the frontend read (Task 3). `idproduk`/`produkString` match the exact `TiketView` property names already used elsewhere in `TiketController.cs`.
