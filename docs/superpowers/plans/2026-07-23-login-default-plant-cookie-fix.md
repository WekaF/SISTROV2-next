# Login Default Plant + Stale Cookie Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On first login, a multi-plant user must land on a sensible, admin-ranked plant instead of whichever plant name sorts first alphabetically — and a stale "active plant" cookie left on a shared browser must never silently override the plant a fresh login just authenticated against.

**Architecture:**
- ASP.NET (`sistropigroup/SISTROAWESOME`): `CompanyController.MyCompanies()` and `CompanyController.GetUserCompanies()` both order a user's accessible plants with `.OrderBy(c => c.company)` (alphabetical by plant *name*). Every other place in this codebase that lists plants (`AccountController.cs`, `HomeController.cs`, `NotLoginController.cs`, `PlantInstallController.cs`) orders by the existing, admin-curated `Company.urutan` column instead. These two methods are the odd ones out — fix them to match the established convention. No schema change needed; `urutan` already exists and is already populated.
- Next.js (`SISTROV2-next`): `src/lib/auth.ts`'s NextAuth `events.signIn` never clears the `sistro_active_company` cookie. That cookie lives 30 days, is not scoped to a user, and `active-company/route.ts` prioritizes it over the session's own `companyCode`. A previous user's (or previous session's) leftover cookie value can silently win on a brand-new login if it happens to also be a valid plant code for the new user. Clear it on every successful fresh credential login.

**Tech Stack:** ASP.NET Web API (C#, EF6/Database-First), Next.js 16 App Router, NextAuth v4

---

## Verified Findings (Pre-Plan)

**Q: What actually decides which plant a fresh login lands on?**
> `SignInForm.tsx:70-76` calls ASP.NET `GetUserCompanies?username=X`, takes `companies[0].company_code`, and sends that as `companycode` to `/Token`. ASP.NET's `ApplicationOAuthProvider.GrantResourceOwnerCredentials` (`Provider/ApplicationOAuthProvider.cs:42`) exact-matches `username_companycode` against `AspNetUsers` — it does not pick a "real" default on its own. So whatever `GetUserCompanies` returns first *is* the login target, verbatim.

**Q: Is the alphabetical ordering the actual bug, confirmed against real data?**
> Yes. Queried `SISTROSTAGING` directly for a real multi-plant account (`logjatim_*`, 8 plants): ordering by `company` name puts `D205 "GD BROMO MENENG BANYUWANGI"` first. Ordering by the existing `urutan` column instead puts `PKG "Petrokimia Gresik"` first (`urutan = 3`, the lowest/highest-priority value among this user's plants — everything else is unranked at `99`). `urutan` is the same column `AccountController.cs:152/168/169`, `HomeController.cs:725/776/785`, and `NotLoginController.cs:30` already sort plant lists by everywhere else in this codebase — `GetUserCompanies`/`MyCompanies` just never got updated to match when they were added.
>
> *(Correction from earlier discussion: I initially recommended adding a new "default plant" column/flag. That's unnecessary — `urutan` already is that field, already populated, already the established convention. Reusing it is a 2-line fix per method, no migration.)*

**Q: Does `CompanyView` (the DTO both methods project into) already expose `urutan`?**
> No (`Models/CompanyView.cs:8-12` — only `company_code`, `company`). Doesn't need to: apply `.OrderBy(c => c.urutan).ThenBy(c => c.company1)` on the `Company` entity query *before* `.Select(...)` projects it away, not after.

**Q: Is the stale-cookie issue real, or just theoretical?**
> Real. `active-company/route.ts:49-53`: `activeCompany = cookie (if valid) → session companyCode → companies[0]`. The cookie (`switch-company/route.ts:100`, `active-company/route.ts:78`) is `maxAge: 60*60*24*30`, `httpOnly: false`, not namespaced per user. Nothing clears it on a new `signIn("credentials", ...)`. `relogin/route.ts:23-26` *intentionally* reuses it as a fallback for same-user re-auth, so the fix must only clear it on a genuine fresh login (NextAuth `events.signIn`), not on relogin/session-update.

**Q: Can `cookies().delete()` be called from inside NextAuth's `events.signIn`?**
> Yes — Next.js docs (`node_modules/next/dist/docs/.../cookies.md:70-71`) require `.delete()` run inside a Route Handler or Server Function. `events.signIn` executes inside `/api/auth/callback/credentials`, served by `app/api/auth/[...nextauth]/route.ts` — a Route Handler. Same primitive (`await cookies()`) is already used this way elsewhere in this repo (`switch-company/route.ts:99-105`, `active-company/route.ts:77-83`).

---

## File Map

### ASP.NET (`sistropigroup/SISTROAWESOME/`)
| File | Action | Purpose |
|------|--------|---------|
| `api/CompanyController.cs` | **Modify** | `MyCompanies()` and `GetUserCompanies()` — order plants by `urutan` (admin-ranked) instead of alphabetically by name |

### Next.js (`SISTROV2-next/src/`)
| File | Action | Purpose |
|------|--------|---------|
| `lib/auth.ts` | **Modify** | Clear `sistro_active_company` cookie in `events.signIn` so a stale value can never outrank a fresh login |

---

## Task 1: ASP.NET — Order plant lists by `urutan`, not alphabetically

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\CompanyController.cs:198-209` (`MyCompanies`)
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\CompanyController.cs:392-403` (`GetUserCompanies`)

**Context:** Both methods build the exact same query shape: filter `Company` rows, project to `CompanyView`, then `.OrderBy(c => c.company)`. Move the ordering *before* the `.Select(...)` projection (so `urutan`, which isn't on `CompanyView`, is still in scope) and order by `urutan` first, plant name as tiebreak for the many rows still sitting at the unranked default (`99`).

- [ ] **Step 1: Fix `MyCompanies()` ordering**

In `CompanyController.cs`, change:

```csharp
            // Join with Company to get full details, filter active plants only
            var data = db.Company
                .Where(c => userCompanyCodes.Contains(c.company_code)
                         && c.statusPlant == true
                         && c.groupcompany != "TnT Lini 3"
                         && c.company_code != "TRANSPORT")
                .Select(c => new CompanyView
                {
                    company_code = c.company_code,
                    company = c.company1,
                })
                .OrderBy(c => c.company)
                .ToList();
```

to:

```csharp
            // Join with Company to get full details, filter active plants only.
            // Order by the admin-ranked `urutan` column (same convention used by
            // AccountController/HomeController/NotLoginController elsewhere) so a
            // multi-plant user's primary/important plant sorts first — not whichever
            // plant name happens to be alphabetically first.
            var data = db.Company
                .Where(c => userCompanyCodes.Contains(c.company_code)
                         && c.statusPlant == true
                         && c.groupcompany != "TnT Lini 3"
                         && c.company_code != "TRANSPORT")
                .OrderBy(c => c.urutan)
                .ThenBy(c => c.company1)
                .Select(c => new CompanyView
                {
                    company_code = c.company_code,
                    company = c.company1,
                })
                .ToList();
```

- [ ] **Step 2: Fix `GetUserCompanies()` ordering**

In the same file, change:

```csharp
            var data = db.Company
                .Where(c => companyCodes.Contains(c.company_code)
                         && c.statusPlant == true
                         && c.groupcompany != "TnT Lini 3"
                         && c.company_code != "TRANSPORT")
                .Select(c => new CompanyView
                {
                    company_code = c.company_code,
                    company = c.company1,
                })
                .OrderBy(c => c.company)
                .ToList();
```

to:

```csharp
            // Same ordering fix as MyCompanies() — this is the list SignInForm.tsx
            // uses to pick the login-time companycode, so this is the ordering that
            // actually decides which plant a fresh login lands on.
            var data = db.Company
                .Where(c => companyCodes.Contains(c.company_code)
                         && c.statusPlant == true
                         && c.groupcompany != "TnT Lini 3"
                         && c.company_code != "TRANSPORT")
                .OrderBy(c => c.urutan)
                .ThenBy(c => c.company1)
                .Select(c => new CompanyView
                {
                    company_code = c.company_code,
                    company = c.company1,
                })
                .ToList();
```

- [ ] **Step 3: Build to verify no compile errors**

`vstest` discovery is broken in this environment (see project memory) — use `MSBuild.exe` build success as the pass/fail signal:

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```

Expected: `0 Error(s)` in the build summary.

- [ ] **Step 4: Verify the new ordering against live data**

```bash
"/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn/sqlcmd" -S "192.168.188.29,7869" -U usr_sistro_dev -P 'Si$tr0@Pupuk1!_d3v' -d SISTROSTAGING -Q "SET NOCOUNT ON; SELECT company_code, company, urutan FROM Company WHERE company_code IN ('D205','D2A5','D441','F275','LOG4MENENG','PKG','PKGEX','ROMO') ORDER BY urutan, company" -W"
```

Expected first row: `PKG | Petrokimia Gresik | 3` (matches what the fixed C# `.OrderBy(c => c.urutan).ThenBy(c => c.company1)` will now return as `companies[0]` for this account) — confirms the fix changes the winner from the alphabetical `D205` to the admin-ranked `PKG`.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && git add SISTROAWESOME/api/CompanyController.cs && git commit -m "fix(company): order plant lists by urutan instead of alphabetically

MyCompanies() and GetUserCompanies() were the only two plant-list
endpoints still sorting by plant name; every other endpoint already
uses the admin-ranked urutan column. GetUserCompanies() feeds the
login-time companycode picked by SignInForm.tsx, so this is why
multi-plant users could land on an arbitrary alphabetically-first
plant on first login instead of their intended one."
```

---

## Task 2: Next.js — Clear stale plant cookie on fresh login

**Files:**
- Modify: `src/lib/auth.ts:1-4` (imports)
- Modify: `src/lib/auth.ts:295-304` (`events.signIn`)

**Context:** `events.signIn` fires exactly once per successful credentials login (initial, or the final call after MFA) — never on `useSession().update()` (that's the separate `jwt` callback `trigger === "update"` path used by company-switch, which manages the cookie itself in `switch-company/route.ts`). Clearing the cookie here only ever affects genuine fresh logins.

- [ ] **Step 1: Import `cookies` from `next/headers`**

In `src/lib/auth.ts`, change:

```ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { logEvent } from "@/lib/audit-logger";
import { resolveCompanyMenuTemplate } from "@/lib/company-menu";
```

to:

```ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import { logEvent } from "@/lib/audit-logger";
import { resolveCompanyMenuTemplate } from "@/lib/company-menu";
```

- [ ] **Step 2: Clear the cookie in `events.signIn`**

In `src/lib/auth.ts`, change:

```ts
  events: {
    async signIn({ user }) {
      await logEvent({
        eventType:   "LOGIN",
        userId:      (user as any).id,
        username:    (user as any).username,
        role:        (user as any).role,
        companyCode: (user as any).companyCode,
      });
    },
```

to:

```ts
  events: {
    async signIn({ user }) {
      await logEvent({
        eventType:   "LOGIN",
        userId:      (user as any).id,
        username:    (user as any).username,
        role:        (user as any).role,
        companyCode: (user as any).companyCode,
      });
      // Fresh login — drop any stale plant cookie from a previous session on this
      // browser/device. Without this, active-company/route.ts's cookie-wins-first
      // priority can silently override the plant just authenticated against with
      // a leftover value from a different user (or a different plant) on shared
      // hardware. Company-switch sets its own fresh cookie value right after this,
      // so it's unaffected; relogin/route.ts intentionally still reads the cookie
      // as a same-user re-auth fallback, which this does not touch.
      const cookieStore = await cookies();
      cookieStore.delete("sistro_active_company");
    },
```

- [ ] **Step 3: Type-check to verify no compile errors**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit 2>&1 | grep "lib/auth.ts"
```

Expected: no output (no errors reported for this file).

- [ ] **Step 4: Manual login trace (no automated test runner configured in this repo)**

1. In a browser, log in as a multi-plant user (e.g. `logjatim`) on company A. Confirm the plant switcher shows company A active.
2. Log out.
3. Log in as a *different* multi-plant user who also has access to company A, on a plant other than A.
4. Confirm the plant switcher shows that second user's own plant active — not company A (the first user's leftover cookie must not leak into the second login).

- [ ] **Step 5: Commit**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && git add src/lib/auth.ts && git commit -m "fix(auth): clear stale active-plant cookie on fresh login

sistro_active_company is a 30-day, non-user-scoped cookie that
active-company/route.ts prioritizes over the session's own
companyCode. Without clearing it on a new credentials login, a
leftover value from a previous user or session on the same browser
could silently override the plant the fresh login just authenticated
against."
```

---

## Self-Review Notes

- **Spec coverage:** Both bugs identified in the prior discussion (alphabetical plant ordering, stale cross-session cookie) each have a dedicated task.
- **No new abstractions:** No schema migration, no new admin UI, no new cookie scheme — both fixes reuse existing, already-populated data (`urutan`) and existing primitives (`cookies()` already used identically elsewhere in this file's neighboring routes).
- **Type consistency:** `CompanyView.company`/`company_code` field names match what both methods already project; `urutan` is `Nullable<int>` on the `Company` BDO entity (`BDO/Company.cs:32`), safe to `.OrderBy` directly.
