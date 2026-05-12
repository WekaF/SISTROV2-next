# Produk & Produk Mapping Superadmin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the existing product settings UI at `/superadmin/settings/products` to real data from the `Produk` and `ProdukMapping` SQL Server tables, with APG sync, via a new C# `SuperadminProdukController`.

**Architecture:** C# ASP.NET WebAPI handles all DB ops (SQL Server) via new `SuperadminProdukController` mirroring the gudang pattern. Next.js API routes proxy to C# via `aspnetFetchServer`. APG sync: Next.js fetches from APG, maps payload, passes to C# `SyncBulk`.

**Tech Stack:** C# ASP.NET WebAPI 2, Entity Framework (sistroEntities), Next.js 14 App Router, TanStack React Query, TypeScript, `aspnetFetchServer` from `@/lib/api-client`

---

## Current State

Page UI at `src/app/superadmin/settings/products/page.tsx` is **already complete**. The API layer is broken:

| Route | Problem |
|---|---|
| `GET /api/admin/products` | Calls `/api/Produk/Data` (company-filtered); `mappingCount` and `plants` are hardcoded `0`/`''` |
| `POST /api/admin/products` | Calls `/api/Produk/AddProduk` (may not exist) |
| `GET/POST/DELETE /api/admin/products/mapping` | Calls non-existent C# endpoints; wrong role check (`role !== 'superadmin'` string equality, blocks TI users) |
| `POST /api/admin/products/sync` | Uses `query` from `@/lib/db` (direct Postgres) — inconsistent, should go via C# |

No `SuperadminProdukController` exists. Reference pattern: `SuperadminGudangController.cs`.

---

## File Map

**Create:**
- `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Models\ProdukSettingView.cs`
- `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\SuperadminProdukController.cs`

**Modify:**
- `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\products\route.ts`
- `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\products\mapping\route.ts`
- `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\products\sync\route.ts`

---

## Task 1: C# ViewModels

**Files:**
- Create: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Models\ProdukSettingView.cs`

- [ ] **Step 1: Create view model file**

```csharp
using System;

namespace SISTROAWESOME.Models
{
    public class ProdukSettingView
    {
        public string Id { get; set; }
        public string Nama { get; set; }
        public string Kode { get; set; }
        public decimal? Denda { get; set; }
        public string Tipe { get; set; }
        public int MappingCount { get; set; }
        public string Plants { get; set; }
    }

    public class ProdukMappingDetailView
    {
        public int Id { get; set; }
        public string ProdukId { get; set; }
        public string CompanyCode { get; set; }
        public string CompanyName { get; set; }
    }

    public class SyncProdukParam
    {
        public string Id { get; set; }
        public string Nama { get; set; }
        public string Kode { get; set; }
        public string Tipe { get; set; }
    }

    public class AddProdukParam
    {
        public string Nama { get; set; }
        public string Kode { get; set; }
        public string Tipe { get; set; }
    }

    public class ProdukMappingParam
    {
        public string ProdukId { get; set; }
        public string CompanyCode { get; set; }
    }

    public class RemoveProdukMappingParam
    {
        public int Id { get; set; }
    }
}
```

- [ ] **Step 2: Build project in Visual Studio — verify 0 errors**

- [ ] **Step 3: Commit**

```bash
rtk git add SISTROAWESOME/Models/ProdukSettingView.cs
rtk git commit -m "feat: add ProdukSettingView models for SuperadminProdukController"
```

---

## Task 2: C# SuperadminProdukController

**Files:**
- Create: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\SuperadminProdukController.cs`

Reference: `SuperadminGudangController.cs` — same inheritance, same `gh.DateTimeNowSistro`, same `db.Company` lookup for company name.

- [ ] **Step 1: Create controller file**

```csharp
using SISTROAWESOME.BDO;
using SISTROAWESOME.Helper;
using SISTROAWESOME.Models;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Net;
using System.Web.Http;

namespace SISTROAWESOME.api
{
    [RoutePrefix("api/SuperadminProduk")]
    [Authorize(Roles = "TI")]
    public class SuperadminProdukController : BaseLoggedApiController
    {
        protected GeneralHelper gh = new GeneralHelper();

        // GET api/SuperadminProduk/List
        [HttpGet]
        [Route("List")]
        public IHttpActionResult List()
        {
            try
            {
                var mappingGroups = db.ProdukMapping
                    .ToList()
                    .GroupBy(m => m.produk)
                    .ToDictionary(
                        g => g.Key,
                        g => new
                        {
                            Count = g.Count(),
                            Plants = string.Join(", ", g.Select(m => m.company_code))
                        }
                    );

                var data = db.Produk
                    .OrderBy(p => p.Nama)
                    .AsEnumerable()
                    .Select(p => new ProdukSettingView
                    {
                        Id = p.ID,
                        Nama = p.Nama,
                        Kode = p.Kode,
                        Denda = p.denda,
                        Tipe = p.tipe,
                        MappingCount = mappingGroups.ContainsKey(p.ID) ? mappingGroups[p.ID].Count : 0,
                        Plants = mappingGroups.ContainsKey(p.ID) ? mappingGroups[p.ID].Plants : ""
                    })
                    .ToList();

                return Content(HttpStatusCode.OK, data);
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { error = ex.Message });
            }
        }

        // POST api/SuperadminProduk/SyncBulk
        [HttpPost]
        [Route("SyncBulk")]
        public IHttpActionResult SyncBulk(List<SyncProdukParam> items)
        {
            try
            {
                if (items == null || items.Count == 0)
                    return Content(HttpStatusCode.BadRequest, "Data kosong.");

                int added = 0, updated = 0;

                foreach (var param in items)
                {
                    if (string.IsNullOrEmpty(param.Kode)) continue;

                    var produk = db.Produk.FirstOrDefault(p => p.Kode == param.Kode);
                    if (produk == null)
                    {
                        db.Produk.Add(new Produk
                        {
                            ID = param.Kode,
                            Nama = param.Nama,
                            Kode = param.Kode,
                            tipe = param.Tipe
                        });
                        added++;
                    }
                    else if (produk.Nama != param.Nama)
                    {
                        produk.Nama = param.Nama;
                        db.Entry(produk).State = EntityState.Modified;
                        updated++;
                    }
                }

                db.SaveChanges();
                return Content(HttpStatusCode.OK, new
                {
                    added,
                    updated,
                    message = $"{added} produk ditambahkan, {updated} produk diperbarui."
                });
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { error = ex.Message });
            }
        }

        // POST api/SuperadminProduk/AddProduct
        [HttpPost]
        [Route("AddProduct")]
        public IHttpActionResult AddProduct(AddProdukParam param)
        {
            try
            {
                if (string.IsNullOrEmpty(param.Nama) || string.IsNullOrEmpty(param.Kode))
                    return Content(HttpStatusCode.BadRequest, "Nama dan Kode wajib diisi.");

                bool exists = db.Produk.Any(p => p.Kode == param.Kode);
                if (exists)
                    return Content(HttpStatusCode.BadRequest, "Produk dengan kode ini sudah ada.");

                db.Produk.Add(new Produk
                {
                    ID = param.Kode,
                    Nama = param.Nama,
                    Kode = param.Kode,
                    tipe = param.Tipe
                });
                db.SaveChanges();

                return Content(HttpStatusCode.OK, "Produk berhasil ditambahkan.");
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { error = ex.Message });
            }
        }

        // GET api/SuperadminProduk/Mappings?produkId={id}
        [HttpGet]
        [Route("Mappings")]
        public IHttpActionResult Mappings(string produkId)
        {
            try
            {
                if (string.IsNullOrEmpty(produkId))
                    return Content(HttpStatusCode.BadRequest, "produkId wajib diisi.");

                var data = db.ProdukMapping
                    .Where(m => m.produk == produkId)
                    .Select(m => new ProdukMappingDetailView
                    {
                        Id = m.id,
                        ProdukId = m.produk,
                        CompanyCode = m.company_code,
                        CompanyName = db.Company
                            .Where(c => c.company_code == m.company_code)
                            .Select(c => c.company1)
                            .FirstOrDefault()
                    })
                    .ToList();

                return Content(HttpStatusCode.OK, data);
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { error = ex.Message });
            }
        }

        // POST api/SuperadminProduk/AddMapping
        [HttpPost]
        [Route("AddMapping")]
        public IHttpActionResult AddMapping(ProdukMappingParam param)
        {
            try
            {
                if (string.IsNullOrEmpty(param.ProdukId) || string.IsNullOrEmpty(param.CompanyCode))
                    return Content(HttpStatusCode.BadRequest, "ProdukId dan CompanyCode wajib diisi.");

                bool exists = db.ProdukMapping.Any(m => m.produk == param.ProdukId && m.company_code == param.CompanyCode);
                if (exists)
                    return Content(HttpStatusCode.BadRequest, "Mapping sudah ada.");

                db.ProdukMapping.Add(new ProdukMapping
                {
                    produk = param.ProdukId,
                    company_code = param.CompanyCode,
                    updatedby = myUserId,
                    updatedon = gh.DateTimeNowSistro(myCompanyCode)
                });
                db.SaveChanges();

                return Content(HttpStatusCode.OK, "Mapping berhasil ditambahkan.");
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { error = ex.Message });
            }
        }

        // POST api/SuperadminProduk/RemoveMapping
        [HttpPost]
        [Route("RemoveMapping")]
        public IHttpActionResult RemoveMapping(RemoveProdukMappingParam param)
        {
            try
            {
                var mapping = db.ProdukMapping.Find(param.Id);
                if (mapping == null)
                    return Content(HttpStatusCode.NotFound, "Mapping tidak ditemukan.");

                db.ProdukMapping.Remove(mapping);
                db.SaveChanges();

                return Content(HttpStatusCode.OK, "Mapping berhasil dihapus.");
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.InternalServerError, new { error = ex.Message });
            }
        }
    }
}
```

- [ ] **Step 2: Build project in Visual Studio — verify 0 errors**

If "ProdukMapping is ambiguous" error, qualify with: `new SISTROAWESOME.BDO.ProdukMapping { ... }`.

- [ ] **Step 3: Smoke-test List endpoint**

```
GET http://192.168.188.170:8090/api/SuperadminProduk/List
Authorization: Bearer {token}
```

Expected: JSON array with `Id`, `Nama`, `Kode`, `MappingCount`, `Plants` fields.

- [ ] **Step 4: Commit**

```bash
rtk git add SISTROAWESOME/api/SuperadminProdukController.cs
rtk git commit -m "feat: add SuperadminProdukController with List/Sync/Mapping endpoints"
```

---

## Task 3: Fix Next.js products GET/POST route

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\products\route.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminProduk/List', token);
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    let allData: any[] = await res.json();
    if (!Array.isArray(allData)) allData = [];

    if (search) {
      allData = allData.filter((p: any) =>
        (p.Nama || '').toLowerCase().includes(search) ||
        (p.Kode || '').toLowerCase().includes(search)
      );
    }

    const total = allData.length;
    const offset = (page - 1) * limit;
    const paginated = allData.slice(offset, offset + limit).map((p: any) => ({
      id: p.Id,
      name: p.Nama || '',
      code: p.Kode || '',
      isSubsidi: (p.Tipe || '').toLowerCase() === 'subsidi',
      mappingCount: p.MappingCount || 0,
      plants: p.Plants || '',
    }));

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ success: false, error: "name dan code wajib diisi." }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminProduk/AddProduct', token, {
      method: 'POST',
      body: JSON.stringify({
        Nama: body.name,
        Kode: body.code,
        Tipe: body.isSubsidi ? 'subsidi' : null,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Produk berhasil ditambahkan." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test in browser**

Visit `http://localhost:3000/superadmin/settings/products`. DevTools → Network. Expected: table renders with real `mappingCount` numbers and plant badges.

- [ ] **Step 3: Commit**

```bash
rtk git add src/app/api/admin/products/route.ts
rtk git commit -m "fix: products list/add route calls SuperadminProduk C# endpoints"
```

---

## Task 4: Fix Next.js mapping route

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\products\mapping\route.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    if (!productId) return NextResponse.json({ success: false, error: "productId wajib diisi." }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer(
      `/api/SuperadminProduk/Mappings?produkId=${encodeURIComponent(productId)}`,
      token
    );
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`API error: ${res.status} ${err}`);
    }

    const data: any[] = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { productId, companyCode } = await req.json();
    if (!productId || !companyCode) {
      return NextResponse.json({ success: false, error: "productId dan companyCode wajib diisi." }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminProduk/AddMapping', token, {
      method: 'POST',
      body: JSON.stringify({ ProdukId: productId, CompanyCode: companyCode }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Mapping berhasil ditambahkan." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: "Mapping ID wajib diisi." }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminProduk/RemoveMapping', token, {
      method: 'POST',
      body: JSON.stringify({ Id: parseInt(id, 10) }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Mapping berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test mapping modal**

Click `ArrowRightLeft` button on any product with `mappingCount > 0`. Expected: modal shows `CompanyName` and `CompanyCode` from C# DB.

- [ ] **Step 3: Test add mapping**

Select plant from dropdown → click Tambah. Expected: success toast, mapping appears in list.

- [ ] **Step 4: Test remove mapping**

Click delete on a mapping → confirm. Expected: mapping removed, list refreshes.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/api/admin/products/mapping/route.ts
rtk git commit -m "fix: product mapping route targets SuperadminProduk C#, fix TI role check"
```

---

## Task 5: Fix sync route

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\products\sync\route.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { getProductsFromApg } from "@/lib/apg-service";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    let apgProducts: any[] = [];
    try {
      apgProducts = await getProductsFromApg();
    } catch (err: any) {
      throw new Error(`Gagal mengambil data dari APG: ${err.message}`);
    }

    if (!apgProducts || apgProducts.length === 0) {
      throw new Error("Data produk dari APG kosong atau tidak dapat diakses.");
    }

    // APG returns combo-style { value, text } pairs
    const items = apgProducts
      .map((ext: any) => {
        const kode = (ext.value || ext.VALUE || ext.id || ext.ID || '').toString().trim();
        let nama = (ext.text || ext.TEXT || ext.name || ext.NAME || '').toString().trim();
        // Strip code prefix if present (e.g. "1000036 Urea Bersubsidi" -> "Urea Bersubsidi")
        if (nama.startsWith(kode)) nama = nama.substring(kode.length).replace(/^[\s\-]+/, '').trim();
        return { Id: kode, Nama: nama, Kode: kode };
      })
      .filter((i: any) => i.Kode && i.Nama);

    if (items.length === 0) {
      throw new Error("Tidak ada data valid dari APG setelah mapping.");
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminProduk/SyncBulk', token, {
      method: 'POST',
      body: JSON.stringify(items),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Sync API error: ${res.status} ${errText}`);
    }

    const result = await res.json();
    return NextResponse.json({
      success: true,
      message: result.message ?? `Sync selesai. ${result.added} ditambahkan, ${result.updated} diperbarui.`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test sync**

Click "Sinkronasi APG" → confirm. Expected: spinner, then success toast with "X ditambahkan, Y diperbarui." Product list refreshes.

- [ ] **Step 3: Commit**

```bash
rtk git add src/app/api/admin/products/sync/route.ts
rtk git commit -m "fix: product sync uses APG -> SuperadminProduk/SyncBulk, remove direct Postgres query"
```

---

## Self-Review

**Spec coverage:**
- [x] Produk list from `Produk` table — Task 2 `List`, Task 3 GET
- [x] ProdukMapping from `ProdukMapping` table — Task 2 `Mappings`, Task 4 GET
- [x] Add product mapping — Task 2 `AddMapping`, Task 4 POST
- [x] Remove product mapping — Task 2 `RemoveMapping`, Task 4 DELETE
- [x] APG sync to SQL Server — Task 2 `SyncBulk`, Task 5
- [x] Page at `/superadmin/settings/products` — UI already exists, works after Tasks 3-5
- [x] Role superadmin + TI — `[Authorize(Roles = "TI")]` in C#; `isAuthorized` checks both in Next.js

**Placeholder scan:** No TBD/TODO. All code complete.

**Type consistency:**
- `ProdukMappingParam.ProdukId` (C# Task 1) ↔ `{ ProdukId: productId }` (Task 4 POST) ✓
- `RemoveProdukMappingParam.Id` (C# int) ↔ `{ Id: parseInt(id, 10) }` (Task 4 DELETE) ✓
- `ProdukSettingView.MappingCount` (Task 1) ↔ `p.MappingCount` (Task 3) ✓
- `ProdukMappingDetailView.Id` (int) ↔ `m.Id` in page UI delete target ✓
- `ProdukMappingDetailView.CompanyCode` ↔ `m.CompanyCode` in page UI ✓
- `ProdukMappingDetailView.CompanyName` ↔ `m.CompanyName` in page UI ✓
- `SyncProdukParam.{ Id, Nama, Kode }` ↔ `{ Id, Nama, Kode }` mapped in Task 5 ✓
