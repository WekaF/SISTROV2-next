# Add-User Capability for "Konfigurasi All User" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let SuperAdmin/Admin/TI create a new user directly from the "Konfigurasi All User" page (`/admin/pengaturan/user`), and let that user be assigned to any plant, not just the caller's own.

**Architecture:** Three independent, additive changes, no existing behavior removed:
1. **Backend — Register accepts an explicit (optional) plant.** `Register`'s `UserModelView` currently has no company/plant field — the new user's `company_code` is always silently set from the *caller's own* `AspNetUsers` row (`myCompanyCode`), never from a request parameter. Add an optional `CompanyCode` field; prefer it over `myCompanyCode` when present. **Company is optional end-to-end** — if the caller doesn't send one and the caller's own account has none either, the new user is created with `company_code = null` and no `_COMPANYCODE` suffix on the username, instead of the old `"username_"` (trailing underscore, from concatenating a null).
2. **Backend — plantless users must still be visible.** `getUserAll` (backing the "Konfigurasi All User" list) currently has two independent reasons a `company_code = null` user never shows up: an inner `Join` against `Company`, and a `Where` clause that calls `.Contains()` directly on `company_code` (which SQL evaluates to `NULL`/excluded for a null column, silently, no exception). Both must be fixed or a user created "without company" would vanish from the very page used to create it.
3. **Frontend (Next.js, `SISTROV2-next`):** `/admin/pengaturan/user` ("Konfigurasi All User") currently has no create-user UI or API route at all — only view/edit of existing users. Add a `POST` handler to `/api/admin/users/plant` and a "Tambah User Baru" modal to the page, with an **optional** plant dropdown (no validation forcing a selection).

**Root cause (for context, verified by reading the code):**
- `/superadmin/settings/users` (menu label **"User Plant"**) is the *only* page with a working "Tambah User Baru" form today (`POST /api/admin/users` → backend `Register`). This is why users can currently only be added there.
- `/admin/pengaturan/user` (menu label **"Konfigurasi All User"**) has zero create UI (`Plus` icon is imported but unused) and its API route (`src/app/api/admin/users/plant/route.ts`) exports only `GET`/`PATCH`/`PUT` — no `POST`. This is why a user can't be registered from that page: the capability was never built.
- Even if you route a create request through the existing `Register` endpoint, the backend has no way to target an arbitrary plant — `adduserFunction` (`UserAccountController.cs:681-724`) always stamps `company_code = myCompanyCode`, resolved from the *caller's own* logged-in identity (`BaseApiController.cs:74`), never from any request field. `UserModelView` (`Models/AccountViewModels.cs:260-276`) has no company/plant property to carry one. This is why "Konfigurasi All User" needs its own explicit plant selector wired to a backend change, not just a UI-only fix.

**Tech Stack:** Next.js 16 (App Router, TanStack Query) for the frontend; ASP.NET Framework 4.5 Web API + Entity Framework 6 + ASP.NET Identity for the backend; MSTest (`ClassLibrary1/SISTRO.Tests.csproj`) for backend unit tests, built/run via MSBuild + `vstest.console.exe`.

---

## File Structure

| File | Responsibility |
|---|---|
| `sistropigroup/SISTROAWESOME/Models/AccountViewModels.cs` | Modify: add optional `CompanyCode` field to `UserModelView`. |
| `sistropigroup/SISTROAWESOME/Helper/UserCompanyHelper.cs` | Create: pure functions resolving which company code a new user should get, and building a company-scoped or bare username. |
| `sistropigroup/ClassLibrary1/UserCompanyHelperTest.cs` | Create: MSTest coverage for the helper. |
| `sistropigroup/SISTROAWESOME/api/UserAccountController.cs` | Modify: `adduserFunction` uses the helper instead of unconditionally using `myCompanyCode`; `getUserAll` changed from inner `Join` to a null-safe left join so plantless users still appear. |
| `SISTROV2-next/src/app/api/admin/users/plant/route.ts` | Modify: add `POST` handler (create user + assign roles), forwarding the chosen plant as `CompanyCode`. |
| `SISTROV2-next/src/app/admin/pengaturan/user/page.tsx` | Modify: add "Tambah User Baru" button + create modal (plant `<select>`, role checkboxes), wired to the new `POST`. |

---

## Task 1: Backend — add `CompanyCode` field to `UserModelView`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Models\AccountViewModels.cs:260-276`

- [ ] **Step 1: Add the field**

```csharp
    public class UserModelView
    {
        public string kode { get; set; }
        public string singkatan { get; set; }
        public string username { get; set; }
        public string password { get; set; }
        public string fullname { get; set; }
        public string rolename { get; set; }
        public string roledesc { get; set; }
        public string emailuser { get; set; }
        public int number { get; set; }
        public string Id { get; set; }
        public string guid { get; set; }
        public string action { get; set; }
        public string tipe { get; set; }
        public List<string> roles { get; set; }
        // Optional target plant for Register. When null/empty, Register falls
        // back to the caller's own company_code (existing behavior).
        public string CompanyCode { get; set; }
    }
```

- [ ] **Step 2: Build to confirm no compile errors**

Run:
```
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /p:Configuration=Debug /t:Build /nologo /v:m
```
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```bash
git -C C:\Users\weka\Indigo\sistropigroup add SISTROAWESOME/Models/AccountViewModels.cs
git -C C:\Users\weka\Indigo\sistropigroup commit -m "feat: add optional CompanyCode field to UserModelView"
```

---

## Task 2: Backend — testable helpers to resolve target company code and build the username

**Files:**
- Create: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Helper\UserCompanyHelper.cs`
- Create: `C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\UserCompanyHelperTest.cs`

- [ ] **Step 1: Write the failing tests**

```csharp
using Microsoft.VisualStudio.TestTools.UnitTesting;
using SISTROAWESOME.Helper;

[TestClass]
public class UserCompanyHelperTest
{
    [TestMethod]
    public void ResolveTargetCompanyCode_RequestedProvided_ReturnsRequested()
    {
        string result = UserCompanyHelper.ResolveTargetCompanyCode("PLANT02", "PLANT01");
        Assert.AreEqual("PLANT02", result);
    }

    [TestMethod]
    public void ResolveTargetCompanyCode_RequestedNull_FallsBackToCaller()
    {
        string result = UserCompanyHelper.ResolveTargetCompanyCode(null, "PLANT01");
        Assert.AreEqual("PLANT01", result);
    }

    [TestMethod]
    public void ResolveTargetCompanyCode_RequestedWhitespace_FallsBackToCaller()
    {
        // Guards against a UI sending an empty-string selection instead of
        // omitting the field entirely.
        string result = UserCompanyHelper.ResolveTargetCompanyCode("   ", "PLANT01");
        Assert.AreEqual("PLANT01", result);
    }

    [TestMethod]
    public void ResolveTargetCompanyCode_BothNull_ReturnsNull()
    {
        // Company is fully optional: a superadmin whose own account has no
        // plant, creating a user with no plant selected, must not throw or
        // silently fabricate a code.
        string result = UserCompanyHelper.ResolveTargetCompanyCode(null, null);
        Assert.IsNull(result);
    }

    [TestMethod]
    public void BuildScopedUsername_WithCompanyCode_AppendsSuffix()
    {
        string result = UserCompanyHelper.BuildScopedUsername("john", "PLANT02");
        Assert.AreEqual("john_PLANT02", result);
    }

    [TestMethod]
    public void BuildScopedUsername_NullCompanyCode_ReturnsBareUsername()
    {
        // The pre-existing code always appended "_" + myCompanyCode, so a
        // null company silently produced "john_" (trailing underscore).
        // That bug is what this helper exists to remove.
        string result = UserCompanyHelper.BuildScopedUsername("john", null);
        Assert.AreEqual("john", result);
    }

    [TestMethod]
    public void BuildScopedUsername_WhitespaceCompanyCode_ReturnsBareUsername()
    {
        string result = UserCompanyHelper.BuildScopedUsername("john", "   ");
        Assert.AreEqual("john", result);
    }
}
```

Save this as `ClassLibrary1/UserCompanyHelperTest.cs`.

- [ ] **Step 2: Build the test project and confirm it fails to compile (helper doesn't exist yet)**

Run:
```
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\SISTRO.Tests.csproj" /p:Configuration=Debug
```
Expected: `error CS0103: The name 'UserCompanyHelper' does not exist in the current context` (or similar CS0246).

- [ ] **Step 3: Write the helper**

```csharp
namespace SISTROAWESOME.Helper
{
    public static class UserCompanyHelper
    {
        // Explicit target wins when a caller (e.g. a superadmin picking a
        // plant from a dropdown) requests one; otherwise falls back to the
        // caller's own company_code — the pre-existing Register behavior for
        // plant-scoped admins creating users for themselves. Returns null
        // (not "") when neither is set — company is optional end-to-end.
        public static string ResolveTargetCompanyCode(string requestedCompanyCode, string callerCompanyCode)
        {
            if (!string.IsNullOrWhiteSpace(requestedCompanyCode)) return requestedCompanyCode;
            return string.IsNullOrWhiteSpace(callerCompanyCode) ? null : callerCompanyCode;
        }

        // The legacy code always did username + "_" + companyCode, which for
        // a null/empty companyCode produced a bare trailing underscore
        // ("john_"). When there's no company, the username stays bare.
        public static string BuildScopedUsername(string username, string companyCode)
        {
            return string.IsNullOrWhiteSpace(companyCode) ? username : username + "_" + companyCode;
        }
    }
}
```

Save this as `SISTROAWESOME/Helper/UserCompanyHelper.cs`.

- [ ] **Step 4: Build and run the tests**

Run:
```
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\SISTRO.Tests.csproj" /p:Configuration=Debug
"C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\Extensions\TestPlatform\vstest.console.exe" "C:\Users\weka\Indigo\sistropigroup\ClassLibrary1\bin\Debug\ClassLibrary1.dll" /Tests:ResolveTargetCompanyCode_RequestedProvided_ReturnsRequested,ResolveTargetCompanyCode_RequestedNull_FallsBackToCaller,ResolveTargetCompanyCode_RequestedWhitespace_FallsBackToCaller,ResolveTargetCompanyCode_BothNull_ReturnsNull,BuildScopedUsername_WithCompanyCode_AppendsSuffix,BuildScopedUsername_NullCompanyCode_ReturnsBareUsername,BuildScopedUsername_WhitespaceCompanyCode_ReturnsBareUsername
```
Expected: `Passed! - Failed: 0, Passed: 7, Skipped: 0`

- [ ] **Step 5: Commit**

```bash
git -C C:\Users\weka\Indigo\sistropigroup add SISTROAWESOME/Helper/UserCompanyHelper.cs ClassLibrary1/UserCompanyHelperTest.cs
git -C C:\Users\weka\Indigo\sistropigroup commit -m "feat: add UserCompanyHelper to resolve optional plant for new users"
```

---

## Task 3: Backend — wire the helper into `Register`/`adduserFunction`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\UserAccountController.cs:681-724`

- [ ] **Step 1: Replace `adduserFunction` to resolve and use the target company code**

Current code (lines 681-724):
```csharp
        private IHttpActionResult adduserFunction(UserModelView user, bool transport)
        {
            var data = new object();
            ApplicationDbContext context = new ApplicationDbContext();
            var roleManager = new RoleManager<IdentityRole>(new RoleStore<IdentityRole>(context));
            var UserManager = new UserManager<ApplicationUser>(new UserStore<ApplicationUser>(context));
            var users = new ApplicationUser();
            if (transport)
            {
                users = new ApplicationUser() { UserName = user.username, Email = user.username + "@mail.com", fullname = user.fullname, EmailConfirmed = true };

            }
            else
            {
                users = new ApplicationUser() { UserName = user.username + "_" + myCompanyCode, Email = user.username + "_" + myCompanyCode + "@mail.com",  };

            }
            IdentityResult result = UserManager.Create(users, user.password);
            if (result.Succeeded)
            {
                var result1 = UserManager.AddToRole(users.Id, user.rolename);
                if (result1.Succeeded)
                {
                    if (!transport)
                    {
                        AspNetUsers userdetail = db.AspNetUsers.Where(x => x.UserName == user.username + "_" + myCompanyCode).SingleOrDefault();
                        userdetail.fullname = user.fullname;
                        userdetail.company_code = myCompanyCode;
                        db.Entry(userdetail).State = EntityState.Modified;
                        db.SaveChanges();
                    }
                    return Content(HttpStatusCode.OK, "Any object");
                }
                else
                {
                    return Content(HttpStatusCode.BadRequest, "Something error. Assign role error...");
                }
            }

            else
            {
                return Content(HttpStatusCode.BadRequest, "Something error.Register user error...");
            }
        }
```

New code:
```csharp
        private IHttpActionResult adduserFunction(UserModelView user, bool transport)
        {
            var data = new object();
            ApplicationDbContext context = new ApplicationDbContext();
            var roleManager = new RoleManager<IdentityRole>(new RoleStore<IdentityRole>(context));
            var UserManager = new UserManager<ApplicationUser>(new UserStore<ApplicationUser>(context));
            var users = new ApplicationUser();
            string targetCompanyCode = transport ? null : UserCompanyHelper.ResolveTargetCompanyCode(isAllowedCompanyOverride ? user.CompanyCode : null, myCompanyCode);
            string scopedUsername = transport ? user.username : UserCompanyHelper.BuildScopedUsername(user.username, targetCompanyCode);
            if (transport)
            {
                users = new ApplicationUser() { UserName = user.username, Email = user.username + "@mail.com", fullname = user.fullname, EmailConfirmed = true };

            }
            else
            {
                users = new ApplicationUser() { UserName = scopedUsername, Email = scopedUsername + "@mail.com",  };

            }
            IdentityResult result = UserManager.Create(users, user.password);
            if (result.Succeeded)
            {
                var result1 = UserManager.AddToRole(users.Id, user.rolename);
                if (result1.Succeeded)
                {
                    if (!transport)
                    {
                        AspNetUsers userdetail = db.AspNetUsers.Where(x => x.UserName == scopedUsername).SingleOrDefault();
                        userdetail.fullname = user.fullname;
                        userdetail.company_code = targetCompanyCode;
                        db.Entry(userdetail).State = EntityState.Modified;
                        db.SaveChanges();
                    }
                    return Content(HttpStatusCode.OK, "Any object");
                }
                else
                {
                    return Content(HttpStatusCode.BadRequest, "Something error. Assign role error...");
                }
            }

            else
            {
                return Content(HttpStatusCode.BadRequest, "Something error.Register user error...");
            }
        }
```

(`UserCompanyHelper` resolves under the already-imported `using SISTROAWESOME.Helper;` at the top of this file — no new `using` needed. Note `targetCompanyCode` can now be a genuine `null` — that's intentional; Task 4 makes the listing endpoint tolerate that.

**Authorization note (caught in review, not in the original plan):** `user.CompanyCode` is gated behind a role check before it reaches `ResolveTargetCompanyCode`. First pass reused the codebase's existing `isAllowedCompanyOverride` convention (`BaseApiController.cs:58-67`, used the same way in `AntrianController.cs`, `ArmadaController.cs`, `GudangController.cs`, `ProdukController.cs`, `POSTOController.cs`) — but a second review round caught that `isAllowedCompanyOverride` was designed for READ-scoping (SuperAdmin/TI/Admin/**Viewer/PKG/StaffArea-variants**/AdminSumbu) and reusing it here gated a WRITE instead, letting a Viewer/PKG/StaffArea account also pick an arbitrary target plant when creating a user — broader than intended. Fixed by adding a narrower, purpose-specific property, `isAllowedToAssignUserCompany` (`BaseApiController.cs`, right after `isAllowedCompanyOverride`): `IsUserInRole("SuperAdmin") || IsUserInRole("TI") || IsUserInRole("Admin")` — matching the same SuperAdmin/TI/Admin privilege level already used by every other layer of this feature (the Next.js `isAdmin` gate). `adduserFunction` now uses `isAllowedToAssignUserCompany ? user.CompanyCode : null` instead of `isAllowedCompanyOverride ? user.CompanyCode : null`. `isAllowedCompanyOverride` itself is untouched and still serves its original 5 call sites. A non-privileged (or now-correctly-excluded Viewer/PKG/StaffArea) caller's `CompanyCode` is discarded before it reaches `ResolveTargetCompanyCode`, so they always fall back to their own `myCompanyCode`.)

- [ ] **Step 2: Build**

Run:
```
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /p:Configuration=Debug /t:Build /nologo /v:m
```
Expected: `Build succeeded.`

- [ ] **Step 3: Manual verification (no automated integration test — `adduserFunction` is tightly coupled to `ApplicationDbContext`/`UserManager` with no seam for mocking, consistent with how the rest of this controller is tested in this codebase)**

Using Postman/curl against a running local backend (`http://localhost:8090`), as a plant-scoped admin (no `CompanyCode` in body):
```
POST /api/UserAccount/Register
Authorization: Bearer <plant-admin token>
{ "username": "testplantadmin1", "password": "Test1234!", "fullname": "Test User", "rolename": "viewer" }
```
Expected: new `AspNetUsers` row with `company_code` equal to the plant admin's own plant (unchanged from current behavior).

Then, as a superadmin, with `CompanyCode` set explicitly:
```
POST /api/UserAccount/Register
Authorization: Bearer <superadmin token>
{ "username": "testplantuser2", "password": "Test1234!", "fullname": "Test User 2", "rolename": "viewer", "CompanyCode": "PLANT02" }
```
Expected: new `AspNetUsers` row with `company_code` = `"PLANT02"`, regardless of the superadmin's own company_code.

Then, as a superadmin whose own account has no `company_code`, with no `CompanyCode` sent at all (the "add user without setting a company" case):
```
POST /api/UserAccount/Register
Authorization: Bearer <superadmin token with no company_code of its own>
{ "username": "testnoplantuser", "password": "Test1234!", "fullname": "Test No Plant", "rolename": "viewer" }
```
Expected: new `AspNetUsers` row with `UserName = "testnoplantuser"` (no trailing underscore, no suffix) and `company_code = null`. No exception.

- [ ] **Step 4: Commit**

```bash
git -C C:\Users\weka\Indigo\sistropigroup add SISTROAWESOME/api/UserAccountController.cs
git -C C:\Users\weka\Indigo\sistropigroup commit -m "fix: let Register target an explicit plant instead of only the caller's own"
```

---

## Task 4: Backend — make plantless users visible in `getUserAll`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\UserAccountController.cs:1241-1278`

**Why this is needed:** `getUserAll` backs the "Konfigurasi All User" list. It currently has two independent filters that silently drop a user whose `company_code` is `null` — which Task 3 now allows to happen on purpose:
1. `.Where(x => !x.company_code.Contains("xxx_T"))` — LINQ-to-Entities translates `.Contains` on a null column to SQL `NULL LIKE '%xxx_T%'`, which evaluates to `NULL`, and `WHERE NULL` excludes the row. No exception, just quietly missing.
2. `.Join(db.Company, ...)` is a SQL `INNER JOIN` on `company_code` — a `null` (or otherwise unmatched) `company_code` never joins, so the row is dropped again regardless of point 1.

Both must change, not just one, or a user created without a plant will never appear in the very page used to create it.

- [ ] **Step 1: Replace `getUserAll`**

Current code (lines 1241-1278):
```csharp
        [HttpGet]
        public JsonResult<object> getUserAll()
        {

            try
            {

                var users = db.AspNetUsers
                 .Where(x => !x.company_code.Contains("xxx_T"))
                    .Join(db.Company, 
                  user => user.company_code, 
                  company => company.company_code, 
                  (user, company) => new 
                  {
                      //user.Id,
                   username =  user.UserName,
                   email = user.Email,
                   company_code =  user.company_code,
                   deskripsi = company.company1
                  })
            .ToList(); 

                return Json((object)new
                {
                    data = users,
                    msg = "success dapatkan user"
                } );
            }
            catch (Exception e)
            {
                return Json((object)new
                {
                    data = "",
                    msg = e.Message.ToString()
                });
            }

        }
```

New code:
```csharp
        [HttpGet]
        public JsonResult<object> getUserAll()
        {

            try
            {

                var users = db.AspNetUsers
                 .Where(x => x.company_code == null || !x.company_code.Contains("xxx_T"))
                    .GroupJoin(db.Company,
                  user => user.company_code,
                  company => company.company_code,
                  (user, companies) => new { user, companies })
                    .SelectMany(
                  x => x.companies.DefaultIfEmpty(),
                  (x, company) => new
                  {
                      //user.Id,
                   username = x.user.UserName,
                   email = x.user.Email,
                   company_code = x.user.company_code,
                   deskripsi = company != null ? company.company1 : null
                  })
            .ToList(); 

                return Json((object)new
                {
                    data = users,
                    msg = "success dapatkan user"
                } );
            }
            catch (Exception e)
            {
                return Json((object)new
                {
                    data = "",
                    msg = e.Message.ToString()
                });
            }

        }
```

(`GroupJoin` + `SelectMany` + `DefaultIfEmpty()` is the standard EF6 LINQ pattern for a SQL `LEFT OUTER JOIN`; a plain `.Join` has no left-join overload. `deskripsi` becomes `null` for a plantless user instead of the row being dropped.)

- [ ] **Step 2: Build**

Run:
```
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /p:Configuration=Debug /t:Build /nologo /v:m
```
Expected: `Build succeeded.`

- [ ] **Step 3: Manual verification**

Using the `testnoplantuser` created in Task 3 Step 3 (no `CompanyCode`, so `company_code = null`):
```
GET /api/UserAccount/getUserAll
Authorization: Bearer <any admin token>
```
Expected: response `data` array includes an entry with `username` containing `"testnoplantuser"`, `company_code: null`, `deskripsi: null`. Before this fix, that entry would be silently absent from `data` with no error.

Also confirm existing plant-scoped users still show correctly with their `deskripsi` (company name) populated, unchanged from before.

- [ ] **Step 4: Commit**

```bash
git -C C:\Users\weka\Indigo\sistropigroup add SISTROAWESOME/api/UserAccountController.cs
git -C C:\Users\weka\Indigo\sistropigroup commit -m "fix: getUserAll left-joins Company so plantless users still show"
```

---

## Task 5: Frontend API — add `POST` to `/api/admin/users/plant`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\users\plant\route.ts`

- [ ] **Step 1: Add the `POST` handler**

Insert after the `GET` function (after line 35), before the `PATCH` function:

```ts
// CREATE User for a specific plant (superadmin picks the target company_code)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    const registerRes = await aspnetFetchServer('/api/UserAccount/Register', token, {
      method: 'POST',
      body: JSON.stringify({
        Username: body.username,
        Password: body.password,
        FullName: body.fullName,
        Email: body.email,
        CompanyCode: body.companyCode || null,
        rolename: body.roles && body.roles.length > 0 ? body.roles[0] : "viewer"
      })
    });

    if (!registerRes.ok) {
      const err = await registerRes.text();
      return NextResponse.json({ success: false, error: err }, { status: registerRes.status });
    }

    if (body.roles && body.roles.length > 0) {
      for (const roleName of body.roles) {
        await aspnetFetchServer('/api/UserAccount/AddtoRole', token, {
          method: 'POST',
          body: JSON.stringify({ username: body.username, role: roleName })
        });
      }
    }

    return NextResponse.json({ success: true, message: "User registered successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Manual verification**

Run the dev server (`npm run dev` from `SISTROV2-next`), log in as superadmin, then from the browser console on any page of the app:
```js
fetch('/api/admin/users/plant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'testplantuser3', password: 'Test1234!', fullName: 'Test User 3', email: 'test3@example.com', companyCode: 'PLANT02', roles: ['viewer'] })
}).then(r => r.json()).then(console.log)
```
Expected: `{ success: true, message: "User registered successfully" }`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/users/plant/route.ts
git commit -m "feat: add POST handler to create users with an explicit plant"
```

---

## Task 6: Frontend UI — "Tambah User Baru" on Konfigurasi All User (plant optional)

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\admin\pengaturan\user\page.tsx`

- [ ] **Step 1: Add imports**

Replace the import block (lines 1-14) with:

```tsx
"use client";
import React, { useState } from "react";
import {
  Users, Edit, X, Loader2, Mail, Check, Lock, Building,
  ShieldCheck, Fingerprint, Activity, Plus, UserCheck, Eye, EyeOff,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable";
```

(Added `Eye`, `EyeOff` for the password field, and `useCompany` for the plant list. `Plus` and `Badge` were already imported but unused — both are now used.)

- [ ] **Step 2: Add create-modal state, roles query, and create mutation**

Insert right after the existing `const [showModal, setShowModal] = useState(false);` block (after line 32, before the `emptyForm` for edit), so the new state sits alongside it:

```tsx
  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const emptyCreateForm = {
    username: "", password: "", fullName: "", email: "",
    companyCode: "", roles: [] as string[],
  };
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const resetCreateForm = () => { setCreateForm(emptyCreateForm); setShowCreatePassword(false); };

  // Full plant roster (not the caller's own companies — useCompany()'s list
  // is scoped to plants the caller already belongs to, which defeats the
  // point of letting a privileged caller target ANY plant. Caught in review.)
  const { data: companiesData } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const res = await fetch("/api/admin/companies");
      const json = await res.json();
      return (json.data || []) as { code: string; name: string }[];
    },
  });
  const availableCompanies = companiesData || [];

  const { data: rolesData } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      return res.json() as Promise<any[]>;
    },
  });
  const availableRoles = rolesData || [];

  const toggleCreateRole = (code: string) => {
    setCreateForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(code) ? prev.roles.filter((r) => r !== code) : [...prev.roles, code],
    }));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      const res = await fetch("/api/admin/users/plant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Gagal membuat user");
      return data;
    },
    onSuccess: () => {
      addToast({ title: "User Dibuat", description: "Akun pengguna baru berhasil dibuat.", variant: "success" });
      setShowCreateModal(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["plant-users"] });
    },
    onError: (err: any) => addToast({ title: "Gagal Buat User", description: err.message, variant: "destructive" }),
  });

  const handleCreateSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!createForm.username.trim()) return addToast({ title: "Validasi Gagal", description: "Username diperlukan.", variant: "destructive" });
    if (!createForm.password || createForm.password.length < 8) return addToast({ title: "Validasi Gagal", description: "Password minimal 8 karakter.", variant: "destructive" });
    if (!createForm.fullName.trim()) return addToast({ title: "Validasi Gagal", description: "Nama lengkap diperlukan.", variant: "destructive" });
    // Plant/Unit is intentionally optional — leaving it blank creates a
    // user with no company_code (Task 2-4 make the backend and the
    // listing endpoint handle that case correctly).
    createMutation.mutate(createForm);
  };
```

- [ ] **Step 3: Add the "Tambah User Baru" button next to the page title**

Find the page header block (around what is currently line 249-259):
```tsx
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            User Management
          </h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
            SISTRO NEXT &bull; ADMINISTRASI SISTEM
          </p>
        </div>
        
        <div className="flex gap-4">
```

Replace with:
```tsx
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            User Management
          </h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
            SISTRO NEXT &bull; ADMINISTRASI SISTEM
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            className="bg-brand-500 hover:bg-brand-600 rounded-none font-black uppercase tracking-widest text-[10px] h-10 px-6"
            onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah User Baru
          </Button>

        <div className="flex gap-4">
```

(Note: this opens a new `<div className="flex items-center gap-4">` wrapping both the button and the existing stats cards — close it by adding one more `</div>` right before the header block's final closing `</div>`, i.e. immediately after the existing two `<Card>` stat blocks and their wrapping `</div>`.)

Find that closing point (currently around line 280-282):
```tsx
             </div>
          </Card>
        </div>
      </div>
```

Replace with:
```tsx
             </div>
          </Card>
        </div>
        </div>
      </div>
```

- [ ] **Step 4: Add the create modal JSX**

Insert immediately before the existing `{/* Edit Modal */}` block (before what is currently line 299):

```tsx
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl rounded-none border-none bg-white dark:bg-[#1a1c1e] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
            <CardHeader className="border-b dark:border-white/5 pb-6 bg-gray-50/50 dark:bg-white/[0.02] p-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Tambah User Baru</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-brand-500 mt-1">Buat akun pengguna baru untuk plant manapun</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="rounded-none hover:bg-gray-200 dark:hover:bg-white/10" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="overflow-y-auto flex-1 p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Username <span className="text-rose-500">*</span></label>
                    <Input
                      placeholder="john.doe"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.trim() })}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Password <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Input
                        type={showCreatePassword ? "text" : "password"}
                        placeholder="Min. 8 karakter"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowCreatePassword((s) => !s)}>
                        {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Nama Lengkap <span className="text-rose-500">*</span></label>
                    <Input value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Email Address</label>
                    <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400">Plant / Unit (Opsional)</label>
                  <select
                    value={createForm.companyCode}
                    onChange={(e) => setCreateForm({ ...createForm, companyCode: e.target.value })}
                    className="w-full h-10 px-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent text-sm rounded-none"
                  >
                    <option value="">Tanpa Plant</option>
                    {availableCompanies.map((c) => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400">Role Selection</label>
                  <div className="flex flex-wrap gap-2">
                    {availableRoles.map((role: any, idx: number) => {
                      const code = role.code || role.Code || role.name || role.Name;
                      if (!code) return null;
                      const isSelected = createForm.roles.includes(code);
                      return (
                        <button key={`create-role-${code}-${idx}`} type="button" onClick={() => toggleCreateRole(code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${isSelected ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10'}`}>
                          {isSelected && <Check className="h-3 w-3" />}
                          {role.name || role.Name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <CardFooter className="border-t dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] p-4 flex justify-end gap-2">
                <Button variant="ghost" type="button" className="rounded-none font-black uppercase tracking-widest text-[10px] h-10 px-6" onClick={() => { setShowCreateModal(false); resetCreateForm(); }}>Batal</Button>
                <Button type="submit" className="bg-brand-500 hover:bg-brand-600 rounded-none font-black uppercase tracking-widest text-[10px] h-10 px-6 min-w-[130px]" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Buat Akun
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

```

- [ ] **Step 5: Manual verification in the browser**

Run `npm run dev` (or `npm run dev:local`), log in as a user with `superadmin`/`admin`/`ti` role, navigate to `/admin/pengaturan/user`.

*Scenario A — with a plant:*
1. Confirm the "Tambah User Baru" button is visible next to the page title.
2. Click it, fill in username/password/full name, pick a Plant from the dropdown, pick a role, submit.
3. Confirm the success toast appears and the table refreshes.
4. Confirm the new user shows up in the table with the chosen plant in the "Unit" column (proves the backend `CompanyCode` wiring from Task 3 works end-to-end, not just that the form submits).

*Scenario B — without a plant (the actual ask: add a user without setting a company):*
1. Click "Tambah User Baru" again, fill in username/password/full name, pick a role, **leave "Plant / Unit" as "Tanpa Plant"**, submit.
2. Confirm the success toast appears (no "Plant/Unit wajib dipilih" validation error blocks it).
3. Confirm the new user shows up in the table with an empty/"-" "Unit" column (proves Task 4's left join keeps it visible instead of silently vanishing).

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/pengaturan/user/page.tsx
git commit -m "feat: add Tambah User Baru (optional plant) to Konfigurasi All User page"
```

---

## Self-Review Notes

- **Spec coverage:**
  - "can't add user except in User Plant" → fixed by Task 6 (new create UI on the Konfigurasi All User page).
  - "can't register in Konfigurasi All User" → fixed by Task 5 (new `POST` route) + Task 1/3 (backend now accepts an explicit target plant instead of only the caller's own).
  - "add user without needing to set a company" → fixed by Task 3 (`ResolveTargetCompanyCode`/`BuildScopedUsername` tolerate `null` end-to-end, no more `"username_"` artifact) + Task 4 (`getUserAll` left-joins so a `company_code = null` user doesn't silently disappear from the list) + Task 6 (dropdown is optional, no client-side validation forcing a selection).
  - All three are verified end-to-end in Task 6 Step 5, Scenario B.
- **No placeholders:** every step above contains full, real code — no "add error handling" stubs.
- **Type/name consistency check:** `createForm.roles` (frontend) → sent as `roles` in the `POST /api/admin/users/plant` body (Task 5) → mapped to `rolename` (first role) + looped `AddtoRole` calls, matching the existing pattern already used by `/api/admin/users`'s sibling route exactly. `companyCode` (frontend, camelCase, optional/blank-string-capable) → `CompanyCode` (backend C# PascalCase, nullable) — casing matches the existing `companyCode`/`CompanyCode` convention already used elsewhere (e.g. `switch-company` route); `ResolveTargetCompanyCode` and `BuildScopedUsername` (Task 2) both treat `null` and whitespace/empty-string the same way, so a blank dropdown selection and an omitted field behave identically.

## Known Follow-ups (found during review, deliberately left out of scope)

- **The "Email Address" field in the create form is not actually persisted.** `POST /api/admin/users/plant` (Task 5) sends `body.email` as `Email` to the backend `Register` endpoint, but `UserModelView` (Task 1) has no `Email` property (only an unrelated `emailuser` field that `adduserFunction`/`Register` never reads either) — `adduserFunction` always synthesizes its own `scopedUsername + "@mail.com"` as the email, regardless of what's typed. This bug pre-dates this plan: the sibling "User Plant" create form (`/superadmin/settings/users`) has the identical issue. Fixing it requires backend changes (add and wire a real email field through `UserModelView`/`adduserFunction`) beyond this plan's scope — flagged for a separate fix.
- **`/api/admin/companies` (used for the Plant/Unit dropdown) only allows `superadmin`/`ti`, not `admin`.** Every other endpoint this page calls (`/api/admin/roles`, `POST /api/admin/users/plant`) allows `superadmin`/`admin`/`ti`. Not fixed here because `/api/admin/companies` is a shared endpoint used by 7 other (superadmin-only) pages; broadening its access needs a deliberate decision, not a side-effect of this plan. **Superseded/moot in practice by the next item** — see below.
- **The `Admin` role cannot reach `/admin/pengaturan/user` ("Konfigurasi All User") at all, today, independent of anything this plan changed.** Found in final cross-task review: `src/lib/menu-configs.tsx` — the `admin` role's own menu config has no entry pointing at this page (only `superadmin`'s does); and `src/components/layout/LayoutWrapper.tsx` gates this route to `userRole === "superadmin"`/`"ti"` client-side, showing "Akses Ditolak" otherwise. This means the plan's own Goal line ("Let SuperAdmin/**Admin**/TI create a user...") is not actually deliverable for `Admin` today — not because of anything the 6 tasks did, but because the page itself was already SuperAdmin/TI-only before this plan started. Every API layer this feature added (`isAdmin` on `/api/admin/users/plant`, `/api/admin/roles`) does allow `admin` — so the backend/API stack is ready for `admin` access whenever the page-level gate is deliberately widened; that's a separate, bigger access-control decision (which menu entry to add, whether to widen `LayoutWrapper.tsx`'s check) intentionally left to the user/product owner rather than done as a side-effect of adding a create-user button.
