# Fix Posto Priority — Gudang List Filtered by Company

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/posto/priority` gudang list must show only warehouses mapped to the active company, matching old app behavior.

**Architecture:** Old MVC `POSTO/PrioritasNew` uses `GudangMapping WHERE company_code == myCompanyCode` — not the raw `Gudang` table. The API controller `GudangController.Data()` returns ALL gudangs with no company filter. Fix: add a new `GET /api/Gudang/ByCompany` endpoint that mirrors the old MVC logic, then update Next.js page to call it instead of `Data`. `Data()` is NOT changed — old apps still use it.

**Tech Stack:** ASP.NET Framework 4.5 (C#, Entity Framework), Next.js 16, TypeScript

---

## Root Cause Trace

```
Old MVC (POSTOController.cs:181-187):
  GudangMapping WHERE company_code == myCompanyCode
  → only warehouses for user's company

New Next.js (posto/priority/page.tsx:55):
  GET /api/Gudang/Data
  → GudangController.Data()
  → db.Gudang.Where(x => x.Tipe != 1)  ← NO company filter
  → returns ALL warehouses from ALL companies
```

**Impact:** User on PKG sees PKC warehouses in the picker. Selecting them and clicking "Tampilkan" returns empty POSTO data (DatatablePrioritas filters by myCompanyCode=PKG, so PKC gudangs yield no results). After company switch, the gudang list is still all companies — does not narrow to the switched company.

---

## Files Changed

| File | Repo | Action |
|---|---|---|
| `SISTROAWESOME/api/GudangController.cs` | sistropigroup | Add `ByCompany()` method |
| `src/app/posto/priority/page.tsx` | SISTROV2-next | Change `/api/Gudang/Data` → `/api/Gudang/ByCompany` |

---

## Task 1: Add `GET /api/Gudang/ByCompany` endpoint

**Files:**
- Modify: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\GudangController.cs`

- [ ] **Step 1: Read current `Data()` method for context**

Read `GudangController.cs` lines 19-31 to understand the existing structure. The class header is `public class GudangController : BaseLoggedApiController`.

- [ ] **Step 2: Add `ByCompany()` method after `Data()`**

Insert immediately after the closing `#endregion` on line 31 (after the `Data()` method block):

```csharp
[HttpGet]
public List<GudangView> ByCompany()
{
    return db.GudangMapping
        .Where(x => x.company_code == myCompanyCode)
        .OrderBy(x => x.Gudang1.ID)
        .Select(x => new GudangView
        {
            idgudang = x.Gudang1.ID,
            namagudang = x.Gudang1.Deskripsi,
        })
        .ToList();
}
```

Full context of edit — old:
```csharp
        #region GP
        [HttpGet]
        public List<GudangView> Data()
        {
            List<GudangView> data = db.Gudang.Where(x=>x.Tipe!=1).OrderBy(x=>x.Deskripsi).Select(x => new GudangView
            {
                idgudang = x.ID,
                namagudang = x.Deskripsi,
            }
            ).ToList();
            return data;
        }
        #endregion
```

New (add `ByCompany()` after `#endregion`):
```csharp
        #region GP
        [HttpGet]
        public List<GudangView> Data()
        {
            List<GudangView> data = db.Gudang.Where(x=>x.Tipe!=1).OrderBy(x=>x.Deskripsi).Select(x => new GudangView
            {
                idgudang = x.ID,
                namagudang = x.Deskripsi,
            }
            ).ToList();
            return data;
        }
        #endregion
        [HttpGet]
        public List<GudangView> ByCompany()
        {
            return db.GudangMapping
                .Where(x => x.company_code == myCompanyCode)
                .OrderBy(x => x.Gudang1.ID)
                .Select(x => new GudangView
                {
                    idgudang = x.Gudang1.ID,
                    namagudang = x.Gudang1.Deskripsi,
                })
                .ToList();
        }
```

- [ ] **Step 3: Build backend to verify no compile errors**

Open the SISTROAWESOME solution in Visual Studio or run MSBuild:
```powershell
cd c:\Users\weka\Indigo\sistropigroup
msbuild SISTROAWESOME/SISTROAWESOME.csproj /p:Configuration=Debug /t:Build /v:m
```

Expected: `Build succeeded. 0 Error(s)`

If `GudangView` doesn't have `namagudang`/`idgudang` fields compile error, check `SISTROAWESOME/BDO/GudangView.cs` — the `Data()` method uses them so they exist.

- [ ] **Step 4: Commit backend**

```bash
cd c:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/GudangController.cs
git commit -m "feat: add GET /api/Gudang/ByCompany endpoint filtered by company mapping"
```

---

## Task 2: Update `/posto/priority` page to use `ByCompany`

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\posto\priority\page.tsx`

- [ ] **Step 1: Change the endpoint call**

In `page.tsx` line 55, change:
```typescript
        const data = await apiJson<Gudang[]>("/api/Gudang/Data");
```
To:
```typescript
        const data = await apiJson<Gudang[]>("/api/Gudang/ByCompany");
```

- [ ] **Step 2: Verify TypeScript — no type changes needed**

`ByCompany` returns `List<GudangView>` same shape as `Data()` — both have `idgudang` and `namagudang`. The `Gudang` type in page.tsx already matches:
```typescript
type Gudang = {
  idgudang: string;
  namagudang: string;
};
```
No type changes needed. Run:
```powershell
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit frontend**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
git add src/app/posto/priority/page.tsx
git commit -m "fix: use /api/Gudang/ByCompany (company-filtered) in posto priority page"
```

---

## Task 3: Manual Test

- [ ] **Step 1: Start both servers**

```powershell
# From sistropigroup root:
.\start-dev.ps1
```

- [ ] **Step 2: Test gudang list filtered by company**

1. Login as user with company `PKG`
2. Go to `http://localhost:3000/posto/priority`
3. Verify warehouse list shows ONLY PKG warehouses (not all companies' warehouses)
4. Click "Tampilkan" with some selected → verify POSTO data appears

- [ ] **Step 3: Test after company switch**

1. Open company switcher → switch to `PKC`
2. Verify warehouse list RELOADS and shows ONLY PKC warehouses
3. Click "Tampilkan" with some selected → verify POSTO data is from PKC

- [ ] **Step 4: Verify old `Data()` still works (regression check)**

In browser DevTools console or via curl, check that `GET /api/Gudang/Data` still returns all gudangs (other pages that use it must not break).

---

## Self-Review

- [x] Spec coverage: adds `ByCompany` endpoint matching old MVC `PrioritasNew` logic ✓
- [x] `Data()` untouched — old apps not broken ✓
- [x] `ByCompany` uses `myCompanyCode` from Bearer token — auto-correct on company switch ✓
- [x] Frontend type `Gudang` matches response shape ✓
- [x] No placeholder steps ✓
- [x] Both repos covered with separate commits ✓
- [x] `GudangMapping` table exists — confirmed used throughout `GudangController.cs:189` and `SuperadminGudangController.cs` ✓
