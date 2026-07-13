# Fix Relogin False "Company Code Hilang" Error Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "Ya, Login Lagi" auto-relogin flow so it stops falsely rejecting accounts that legitimately have no `companyCode` (Transport/rekanan accounts) with `{"success": false, "error": "Company code hilang dari session, silakan login manual."}`.

**Architecture:** `src/app/api/auth/relogin/route.ts` currently hard-fails whenever `companyCode` is missing from the session/cookie, before even attempting to re-authenticate against ASP.NET. But `companyCode` being absent is not always a bug — it's the *normal, correct* state for Transport/rekanan accounts, whose `AspNetUsers.company_code` column is legitimately `null` (verified in the backend: `SISTROAWESOME\Provider\ApplicationOAuthProvider.cs` has a dedicated code path that authenticates these accounts via the `Transport` table lookup, with no `companycode` form field required at all — this is exactly how `src/lib/auth.ts`'s `authorize()` already logs these accounts in the first time, by simply omitting the `companycode` param when there isn't one). The fix makes the relogin endpoint mirror that same "omit if absent" behavior instead of treating absence as a hard error, matching the pattern that already works for initial login.

**Tech Stack:** Next.js 16 API route (TypeScript) calling an ASP.NET Framework 4.5 OAuth `/Token` endpoint.

---

## Root Cause (verified by reading the code directly)

**Where the error comes from:** `src/app/api/auth/relogin/route.ts:43-48` (current code):

```ts
    if (!companyCode) {
      return NextResponse.json({
        success: false,
        error: "Company code hilang dari session, silakan login manual.",
      });
    }
```

This runs *before* attempting to call ASP.NET's `/Token` endpoint at all — so any account whose session has no `companyCode` gets this error immediately, no matter what the real cause is.

**Why some accounts legitimately have no `companyCode`, confirmed in the backend** (`C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Provider\ApplicationOAuthProvider.cs`):

```csharp
public override async Task GrantResourceOwnerCredentials(OAuthGrantResourceOwnerCredentialsContext context)
{
    ...
    if (form["companycode"] != null)
    {
        String companycode = form["companycode"];
        users = db.AspNetUsers.AsEnumerable().Where(x => x.UserName.ToLower() == (context.UserName.ToLower() + "_" + companycode.ToLower()) && x.company_code == companycode).SingleOrDefault();
        if (users == null)
        {
            Transport tp = db.Transport.Where(x => x.username == context.UserName).SingleOrDefault();
            if (tp != null) { /* Transport account, OK to proceed without a companycode-suffixed username */ }
            else { context.SetError("invalid_grant", "Anda tidak terdaftar di plant / company code ini."); return; }
        }
    }
    else
    {
        // No companycode field sent at all -- still fine for Transport accounts
        Transport tp = db.Transport.Where(x => x.username == context.UserName).SingleOrDefault();
        if (tp != null) { /* OK */ }
        else { context.SetError("invalid_grant", "Please provide company code"); return; }
    }
    ...
}

public override Task TokenEndpoint(OAuthTokenEndpointContext context)
{
    ...
    AspNetUsers user = db.AspNetUsers.AsEnumerable().Where(x => x.UserName == context.Identity.Name).SingleOrDefault();
    ...
    context.AdditionalResponseParameters.Add("companycode", user.company_code);
    ...
}
```

`AspNetUsers.company_code` (`SISTROAWESOME\BDO\AspNetUsers.cs:48`, `public string company_code { get; set; }`) is a plain nullable string — Transport/rekanan accounts, which aren't tied to one fixed plant, have this column `null`. `/Token`'s response therefore legitimately returns `"companycode": null` for these accounts.

**This is not new or broken by relogin** — the original login flow already handles it correctly. `src/lib/auth.ts`'s `authorize()` only appends `companycode` to the `/Token` request *if the caller supplied one*:

```ts
if (credentials.companycode) {
  params.append("companycode", credentials.companycode);
}
```

...and `src/components/auth/SignInForm.tsx`'s `handleSubmit` calls `GetUserCompanies` first and passes whatever it finds (empty string for accounts with no fixed company, e.g. Transport) — so a Transport user's *very first* login already goes through ASP.NET without a `companycode` field, hits the `else` branch above, succeeds, and ends up with `token.companyCode = null` in their session from day one. That's the expected, working state.

**The bug:** `relogin/route.ts` was written assuming `companyCode` is always required to re-authenticate, and fails closed *before even trying* — instead of just omitting it from the re-auth call like `authorize()` already does. So any Transport/rekanan account whose session gets force-invalidated (the global 401 auto-logout, or "used on another device") and then clicks "Ya, Login Lagi" hits this false error, even though ASP.NET would have happily re-authenticated them with no `companycode` at all, exactly as it did on their original login.

**Why this doesn't break the other (real) failure case:** if a *non-Transport* account somehow really is missing `companyCode` (an actual data problem, not the by-design Transport case), removing the hard-fail doesn't hide that — the re-auth call to `/Token` without `companycode` will hit `ApplicationOAuthProvider.cs`'s `else` branch, find no matching `Transport` record, and ASP.NET itself returns `invalid_grant: "Please provide company code"` — which `relogin/route.ts`'s existing `!tokenRes.ok` handling (lines 65-74, untouched by this fix) already surfaces as a clear, accurate error message. So the fix is a strict improvement: Transport accounts start working, and genuinely-broken accounts get a *more* accurate error (from ASP.NET itself) instead of our own blanket guess.

---

## Task 1: Make `companyCode` optional in the relogin re-auth request

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\api\auth\relogin\route.ts` (lines 22-57)

- [ ] **Step 1: Read the current file in full**

Read `src/app/api/auth/relogin/route.ts` top to bottom to confirm the exact current text — it's a short file (~88 lines), read the whole thing.

- [ ] **Step 2: Remove the hard-fail and make `companycode` conditional in the re-auth request**

Find this exact block (lines 22-57):

```ts
    // Fallback companyCode from cookie if missing from token
    let companyCode = rawToken?.companyCode as string | undefined;
    if (!companyCode) {
      companyCode = request.cookies.get("sistro_active_company")?.value;
    }

    // rawToken.username = full DB username as stored by ASP.NET e.g. "wahyu_pkg"
    // (ASP.NET /Token always stores <bare_login>_<COMPANYCODE> as the DB UserName)
    // Strip last _COMPANY suffix so re-auth sends bare username to /Token
    const lastUnderscore = rawUsername ? rawUsername.lastIndexOf("_") : -1;
    const username = (rawUsername && lastUnderscore > 0 && lastUnderscore < rawUsername.length - 1)
      ? rawUsername.slice(0, lastUnderscore)
      : rawUsername;

    if (!username || !encodedPw) {
      return NextResponse.json({
        success: false,
        error: "Session data incomplete for auto-relogin",
      });
    }

    if (!companyCode) {
      return NextResponse.json({
        success: false,
        error: "Company code hilang dari session, silakan login manual.",
      });
    }

    // Re-auth to ASP.NET with current companyCode to get fresh token
    const password = Buffer.from(encodedPw, "base64").toString("utf-8");
    const params = new URLSearchParams({
      grant_type: "password",
      username,
      password,
      companycode: companyCode,
    });
```

Replace with:

```ts
    // Fallback companyCode from cookie if missing from token
    let companyCode = rawToken?.companyCode as string | undefined;
    if (!companyCode) {
      companyCode = request.cookies.get("sistro_active_company")?.value;
    }

    // rawToken.username = full DB username as stored by ASP.NET e.g. "wahyu_pkg"
    // (ASP.NET /Token always stores <bare_login>_<COMPANYCODE> as the DB UserName)
    // Strip last _COMPANY suffix so re-auth sends bare username to /Token
    const lastUnderscore = rawUsername ? rawUsername.lastIndexOf("_") : -1;
    const username = (rawUsername && lastUnderscore > 0 && lastUnderscore < rawUsername.length - 1)
      ? rawUsername.slice(0, lastUnderscore)
      : rawUsername;

    if (!username || !encodedPw) {
      return NextResponse.json({
        success: false,
        error: "Session data incomplete for auto-relogin",
      });
    }

    // companyCode is optional here, not required. Accounts without a fixed plant (e.g.
    // Transport/rekanan, whose AspNetUsers.company_code is legitimately null in the backend)
    // authenticate at ASP.NET's /Token with no companycode field at all -- see
    // ApplicationOAuthProvider.GrantResourceOwnerCredentials's Transport-table fallback branch.
    // This mirrors exactly what src/lib/auth.ts's authorize() already does on the original
    // login (only appends companycode when one was actually supplied), so re-login behaves
    // the same way the first login did instead of hard-failing accounts that never had one.
    const password = Buffer.from(encodedPw, "base64").toString("utf-8");
    const params = new URLSearchParams({
      grant_type: "password",
      username,
      password,
    });
    if (companyCode) {
      params.append("companycode", companyCode);
    }
```

- [ ] **Step 3: Confirm the rest of the file needs no changes**

Read the remaining lines (roughly 59-87, the `fetch(/Token)` call and the success/error response building) and confirm they don't need edits: `params.toString()` already picks up whichever fields were appended, the existing `!tokenRes.ok` branch already surfaces ASP.NET's own error message (including the "Please provide company code" case for genuinely-broken non-Transport accounts), and the success branch's `companyCode: data.companycode ?? companyCode` already handles `data.companycode` being `null` and `companyCode` being `undefined` gracefully (results in `companyCode: null` in the JSON response, which is correct — that account still has none).

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/relogin/route.ts
git commit -m "fix: don't hard-fail relogin when companyCode is missing

companyCode is legitimately null for Transport/rekanan accounts
(AspNetUsers.company_code is nullable in the backend, and
ApplicationOAuthProvider.cs already has a dedicated Transport-table
lookup path for /Token requests sent with no companycode field at
all). relogin/route.ts previously hard-failed with 'Company code
hilang dari session' before even attempting re-auth, so these accounts
could never use the 'Ya, Login Lagi' flow -- even though their very
first login succeeded the exact same way (auth.ts's authorize() only
appends companycode when one exists). Now the re-auth request omits
companycode when absent, same as the original login, and lets ASP.NET
itself return an accurate error for any account that's genuinely
missing one it should have."
```

---

## Task 2: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev servers**

From `C:\Users\weka\Indigo\sistropigroup`, run `.\start-dev.ps1` (local IIS Express backend + Next.js), or run the frontend alone with `npm run dev:local` (from `SISTROV2-next`) against an already-running local backend.

- [ ] **Step 2: Reproduce the original bug with a Transport/rekanan account**

Log in as a Transport/rekanan-role account normally (confirm login succeeds — this account should have no company selector/no companyCode, consistent with the Root Cause section above). Force a session invalidation the same way the original bug report did (log in as the same account from a second browser/session so the first gets the global 401 auto-logout, or navigate to `/login?session_expired=true` directly to open the dialog manually for a quick UI check). Click "Ya, Login Lagi".

Expected (before this fix, for comparison): `{"success": false, "error": "Company code hilang dari session, silakan login manual."}`, dialog stays open with the error shown.

Expected (after this fix): request succeeds, dialog closes, the app redirects back to the page the user was on (`callbackUrl`), fully logged back in.

- [ ] **Step 3: Confirm the alert-dialog UI itself still behaves correctly**

While in Step 2's dialog, quickly re-confirm (from the earlier relogin-alert-dialog work): the dialog is a modal (backdrop visible), pressing Escape/clicking outside does not close it, and the "Batal" button still works (navigates to `/login`, clears `session_expired`).

- [ ] **Step 4: Confirm a normal (non-Transport) account's relogin still works**

Log in as a regular Staff/Admin account (one that does have a `companyCode`), force a session invalidation the same way, click "Ya, Login Lagi". Expected: succeeds exactly as before this fix (unaffected — this account always had a `companyCode`, so `params.append("companycode", companyCode)` still runs).

---

## Self-Review

**Spec coverage:** The user's report is exactly this one error message on the relogin dialog; Task 1 removes its false-positive trigger at the root (the endpoint that produces it), Task 2 verifies both the previously-broken case (Transport account) and the previously-working case (regular account) still behave correctly after the change.

**Placeholder scan:** None — Task 1 has the complete before/after code, Task 2 has concrete steps and expected results.

**Type consistency:** `companyCode` stays typed `string | undefined` throughout (from `rawToken?.companyCode as string | undefined` and the cookie fallback, both already optional) — the only behavioral change is that the `URLSearchParams` construction no longer requires it to be truthy before proceeding; `params.append` is called conditionally instead of the value being baked into the initial `URLSearchParams({...})` object. No type changes needed elsewhere; `companyCode: data.companycode ?? companyCode` in the response was already written to tolerate an `undefined`/`null` companyCode.

**Risk assessment:** LOW — this is a pure relaxation of an overly-strict guard clause in one API route, no other files touch this logic (confirmed via grep: the exact string "Company code hilang" only appears in this one file), and the fallback path being relied on (`ApplicationOAuthProvider.cs`'s no-companycode branch) is not new code — it's the same path the original login already exercises successfully for these accounts every day.
