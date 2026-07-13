# Fix Relogin "Anda tidak terdaftar di plant / company code ini" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "Ya, Login Lagi" auto-relogin flow so it stops rejecting legitimately-registered accounts with `error_description: "Anda tidak terdaftar di plant / company code ini."` — a *different* error than the one fixed yesterday (`2026-07-09-fix-relogin-missing-companycode.md`, commit `693916b`), confirmed by the user to now be the one blocking login.

**Architecture:** Yesterday's fix addressed accounts with genuinely *no* `companyCode` (Transport/rekanan). This new error means ASP.NET's `/Token` endpoint DID receive a `companycode`, but rejected the `username_companycode` combination it reconstructed as not matching any account. Three independent, compounding bugs were found by reading the actual authentication code end-to-end (frontend `SISTROV2-next` + backend `sistropigroup`), all traced from the exact error string ASP.NET only returns from one specific `if` branch: (1) the backend's account lookup compares `company_code` case-*sensitively* while it lowercases the username half of the same check — an inconsistency that alone can silently reject a perfectly valid account; (2) switching companies (`CompanyContext.switchCompany`) updates the session's `companyCode` but never updates its `username`, so after a switch the two fields describe two different points in time and no longer reconstruct a username ASP.NET recognizes; (3) the username-reconstruction logic in `relogin`/`switch-company` blindly strips "everything after the last underscore" assuming that's always a company-code suffix, which is wrong for the subset of accounts whose stored username has no suffix at all (their bare login, which can itself contain underscores). This plan fixes all three, since together they're the only demonstrated ways this specific error can fire for an account that's actually registered correctly.

**Tech Stack:** ASP.NET Framework 4.5 (C#) OAuth provider at `C:\Users\weka\Indigo\sistropigroup`; Next.js 16 / NextAuth (TypeScript) at `C:\Users\weka\Indigo\SISTROV2-next`.

**Amendment (added after Tasks 1-4 were written):** while yesterday's fix (`693916b`) was sitting unpushed, the user also hit a *fourth*, related bug confirmed to happen right after a successful "Ya, Login Lagi" click: `{"success":false,"error":"ASP.NET MyCompanies failed: 401"}`. Root cause (below, in its own section) is a race/staleness bug in `handleAutoRelogin` itself, not the `/Token` re-auth path — added as Task 5, with Task 6 (manual verification, originally Task 5) updated to also cover it.

---

## Root Cause (verified by reading the code directly)

**Where the error text comes from**, `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Provider\ApplicationOAuthProvider.cs`, method `GrantResourceOwnerCredentials` (current line ~31-55):

```csharp
if (form["companycode"] != null)
{
    String companycode = form["companycode"];
    users = db.AspNetUsers.AsEnumerable().Where(x => x.UserName.ToLower() == (context.UserName.ToLower() + "_" + companycode.ToLower()) && x.company_code == companycode).SingleOrDefault();
    if (users == null)
    {
        Transport tp = db.Transport.Where(x => x.username == context.UserName).SingleOrDefault();
        if (tp != null) { /* ok */ }
        else
        {
            context.SetError("invalid_grant", "Anda tidak terdaftar di plant / company code ini.");
            return;
        }
    }
}
```

This exact message only fires when: a `companycode` WAS sent (rules out yesterday's Transport/no-company scenario, which the user confirmed is a different, already-fixed message), the `UserName == "<username>_<companycode>"` (case-insensitively) `&& company_code == companycode` (case-**sensitively**) lookup found nothing, AND the account isn't a Transport account either.

**Bug 1 — asymmetric case-sensitivity in the same lookup.** Line 41 lowercases *both sides* of the `UserName` comparison (`.ToLower() == (...).ToLower()`), but compares `company_code == companycode` with **no** case normalization at all. If the JWT/cookie's `companyCode` value ever differs in case from what's stored in `AspNetUsers.company_code` (e.g. `"pkg"` vs `"PKG"`) — which nothing in the surrounding code guarantees stays consistent — the `UserName` half can match while the `company_code` half silently fails, and the whole `.SingleOrDefault()` returns null. This is an inconsistency in one WHERE clause: one side is defensively lowercased, the other isn't.

**Bug 2 — `companyCode` and `username` drift apart after switching companies.** `src\context\CompanyContext.tsx`'s `switchCompany()` calls:

```ts
await updateSession({
  aspnetToken: json.aspnetToken,
  companyCode: json.companyCode,
  ...(json.menuGroup !== undefined && { menuGroup: json.menuGroup }),
  ...(json.menuItems !== undefined && { menuItems: json.menuItems }),
});
```

— it never passes `username`. `src\lib\auth.ts`'s `jwt` callback, `trigger === "update"` branch, only ever updates `token.companyCode`, never `token.username`:

```ts
if (updateData.aspnetToken) token.aspnetToken = updateData.aspnetToken;
if (updateData.companyCode) token.companyCode = updateData.companyCode;
```

So after a user switches from company `PKG` to `PGN`, `token.companyCode` becomes `"pgn"` but `token.username` is still stuck at whatever it was at original login (e.g. `"wahyu_pkg"`) — the two fields now describe *different* companies. Any code that reconstructs a username from `token.username` and re-combines it with the *current* `token.companyCode` (both `relogin` and `switch-company` do this) produces a combination ASP.NET has never seen.

**Bug 3 — unsafe "strip everything after the last underscore" username reconstruction.** `src\app\api\auth\relogin\route.ts` (and an identical copy in `src\app\api\user\switch-company\route.ts`) currently does:

```ts
const lastUnderscore = rawUsername ? rawUsername.lastIndexOf("_") : -1;
const username = (rawUsername && lastUnderscore > 0 && lastUnderscore < rawUsername.length - 1)
  ? rawUsername.slice(0, lastUnderscore)
  : rawUsername;
```

This assumes `rawUsername` is *always* `<bare_login>_<COMPANYCODE>`. But per yesterday's investigated fix, accounts authenticated *without* a `companycode` (Transport/rekanan, via `ApplicationOAuthProvider.cs`'s `else` branch) get `data.username` = their bare login, stored **with no suffix at all** — and that bare login can legitimately contain underscores (e.g. `"budi_transport1"`). Blindly stripping "everything after the last underscore" mangles such a username into something that doesn't exist in `AspNetUsers`. This is a latent bug, not necessarily the one hit by the specific report just confirmed (that one had a `companyCode` present, which points more directly at Bugs 1-2), but it's a second, independent way to produce this exact same error string, already flagged as a risk during yesterday's code review, and cheap and safe to close at the same time.

**Why all three, not just one:** the user confirmed the error has a `companyCode` present (rules out yesterday's bug), and confirmed the *exact* backend message, which per the code above can only come from the one branch shown. Bug 1 and Bug 2 are the most direct, evidence-backed explanations for a *registered* account failing this specific check; Bug 3 is a related, already-identified risk in the same code path that should be closed in the same pass rather than risk a third bug report on this feature.

---

## File Map

| File | Repo | Change |
|---|---|---|
| `SISTROAWESOME\Provider\ApplicationOAuthProvider.cs` | `sistropigroup` | Task 1: case-insensitive `company_code` comparison |
| `src\lib\auth.ts` | `SISTROV2-next` | Task 2: let `token.username` be updated via session `update()` |
| `src\app\api\user\switch-company\route.ts` | `SISTROV2-next` | Task 2: return the new `username`, keep session in sync |
| `src\context\CompanyContext.tsx` | `SISTROV2-next` | Task 2: pass the new `username` into `updateSession()` |
| `src\app\api\auth\relogin\route.ts` | `SISTROV2-next` | Task 3: safe, verified-suffix-only username reconstruction |
| `src\app\api\user\switch-company\route.ts` | `SISTROV2-next` | Task 4: same safe-suffix fix (strip the *old* company's suffix) |
| `src\components\auth\SignInForm.tsx` | `SISTROV2-next` | Task 5: sync `companyCode` on relogin, hard-navigate to eliminate a post-relogin token race |

---

## Task 1: Backend — case-insensitive `company_code` comparison

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Provider\ApplicationOAuthProvider.cs` (method `GrantResourceOwnerCredentials`, ~line 31-55)

### Context

Same repo/branch situation as yesterday: the primary checkout of `sistropigroup` is on branch `pengajuan-armada-copy-up-to-prod` with substantial **unrelated** uncommitted changes that must not be touched. Yesterday's fix for the *other* relogin bug already set up and used an isolated worktree at `C:\Users\weka\Indigo\sistropigroup\.worktrees\fix-tiket-checkpoint-permissions` for an unrelated feature — **do not reuse that one** (different, unrelated fix, would mix unrelated history). Set up a **new** isolated worktree for this fix.

- [ ] **Step 1: Set up an isolated workspace for this fix**

Use the `superpowers:using-git-worktrees` skill (or your platform's native worktree tool) to create an isolated workspace for `C:\Users\weka\Indigo\sistropigroup` on a **new branch created from `origin/pengajuan-armada-copy-up-to-prod`** (confirmed yesterday to be the real, current, non-diverging mainline — NOT `origin/main`, which is a stale 2023 ref). Name the branch `fix-relogin-companycode-case`. If no native tool is available, the manual fallback is:

```bash
cd C:\Users\weka\Indigo\sistropigroup
git worktree add .worktrees/fix-relogin-companycode-case -b fix-relogin-companycode-case origin/pengajuan-armada-copy-up-to-prod
```

(`.worktrees/` is already gitignored from yesterday's fix — no `.gitignore` step needed this time.)

All remaining steps in this task run from that isolated workspace's `SISTROAWESOME\Provider\ApplicationOAuthProvider.cs`, not the primary checkout.

- [ ] **Step 2: Read the current `GrantResourceOwnerCredentials` method in full**

Read from `public override async Task GrantResourceOwnerCredentials(OAuthGrantResourceOwnerCredentialsContext context)` through its closing brace, to confirm the exact current text — line numbers may have drifted slightly since this plan was written.

- [ ] **Step 3: Fix the case-insensitive comparison**

Find this exact line:

```csharp
                users = db.AspNetUsers.AsEnumerable().Where(x => x.UserName.ToLower() == (context.UserName.ToLower() + "_" + companycode.ToLower()) && x.company_code == companycode).SingleOrDefault();
```

Replace with:

```csharp
                users = db.AspNetUsers.AsEnumerable().Where(x => x.UserName.ToLower() == (context.UserName.ToLower() + "_" + companycode.ToLower()) && x.company_code.ToLower() == companycode.ToLower()).SingleOrDefault();
```

(Only the `company_code` half of the `&&` changes — add `.ToLower()` to both sides of that comparison, matching the pattern the `UserName` half already uses on the same line.)

- [ ] **Step 4: Build**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\.worktrees\fix-relogin-companycode-case\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /v:m /nologo
```

(Adjust the `.csproj` path if `git worktree add` reports a different location. Expect the same pre-existing build-environment fixups from yesterday's session — a `packages` junction, `DataTablesParser.dll`, `SqlServerTypes` DLLs — may be needed again for a *brand new* worktree; if the worktree tool you use shares/reuses the existing `.worktrees/fix-tiket-checkpoint-permissions` environment setup, these may already be in place.)

Expected: exit code 0, `SISTROAWESOME -> ...\bin\SISTROAWESOME.dll`, no `error CS`.

- [ ] **Step 5: Commit**

```bash
git add SISTROAWESOME/Provider/ApplicationOAuthProvider.cs
git commit -m "fix: case-insensitive company_code comparison in /Token re-auth

The account lookup in GrantResourceOwnerCredentials lowercased both
sides of the UserName comparison but compared company_code
case-sensitively in the same WHERE clause -- an inconsistency that
could silently reject a correctly-registered account whenever the
companycode value's casing (from a JWT/cookie on the Next.js side)
didn't exactly match what's stored in AspNetUsers.company_code,
surfacing as 'Anda tidak terdaftar di plant / company code ini.' even
though the account and company both genuinely exist."
```

---

## Task 2: Frontend — keep `token.username` in sync after a company switch

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\lib\auth.ts` (jwt callback, ~line 238-256)
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\api\user\switch-company\route.ts` (~line 88-119)
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\context\CompanyContext.tsx` (~line 108-119)

### Context

Switching companies today updates the session's `companyCode` but never its `username` — so after a switch, `token.username`'s embedded company suffix (for accounts that have one) silently goes stale, no longer matching `token.companyCode`. Anything that later reconstructs a username from the two (relogin, or switching again) recombines a *mismatched* pair. This task makes `username` travel alongside `companyCode`/`aspnetToken` on every switch, exactly the way it already does at initial login.

Work from: `C:\Users\weka\Indigo\SISTROV2-next`

- [ ] **Step 1: Let the `jwt` callback accept a `username` update**

In `src\lib\auth.ts`, find this exact block (inside the `jwt` callback, `trigger === "update"` branch):

```ts
      if (trigger === "update" && updateData) {
        if (updateData.aspnetToken) token.aspnetToken = updateData.aspnetToken;
        if (updateData.companyCode) token.companyCode = updateData.companyCode;
        if (updateData.menuGroup !== undefined) token.menuGroup = updateData.menuGroup;
        if (updateData.menuGroups !== undefined) token.menuGroups = updateData.menuGroups;
        if (updateData.menuItems !== undefined) token.menuItems = updateData.menuItems;
        if (updateData.role !== undefined) token.role = updateData.role;
        if (updateData.roles !== undefined) token.roles = updateData.roles;
```

Replace with:

```ts
      if (trigger === "update" && updateData) {
        if (updateData.aspnetToken) token.aspnetToken = updateData.aspnetToken;
        if (updateData.companyCode) token.companyCode = updateData.companyCode;
        // Keep username in sync with companyCode on every update -- ASP.NET stores usernames
        // as "<bare_login>_<COMPANYCODE>" for accounts with a fixed company, so username and
        // companyCode must change together (e.g. on a company switch) or a later re-auth
        // (relogin, or switching again) reconstructs a stale, mismatched combination that
        // ASP.NET rejects with "Anda tidak terdaftar di plant / company code ini."
        if (updateData.username) token.username = updateData.username;
        if (updateData.menuGroup !== undefined) token.menuGroup = updateData.menuGroup;
        if (updateData.menuGroups !== undefined) token.menuGroups = updateData.menuGroups;
        if (updateData.menuItems !== undefined) token.menuItems = updateData.menuItems;
        if (updateData.role !== undefined) token.role = updateData.role;
        if (updateData.roles !== undefined) token.roles = updateData.roles;
```

- [ ] **Step 2: Return the new `username` from `switch-company`**

In `src\app\api\user\switch-company\route.ts`, find this exact block:

```ts
    return NextResponse.json({
      success: true,
      activeCompany: companyCode,
      aspnetToken: data.access_token,
      companyCode: data.companycode ?? companyCode,
      menuGroup: resolvedMenuGroup,
      menuItems: resolvedMenuItems,
    });
```

Replace with:

```ts
    return NextResponse.json({
      success: true,
      activeCompany: companyCode,
      aspnetToken: data.access_token,
      companyCode: data.companycode ?? companyCode,
      username: data.username,
      menuGroup: resolvedMenuGroup,
      menuItems: resolvedMenuItems,
    });
```

(`data.username` is already present on every successful `/Token` response — it's the same field `src\lib\auth.ts`'s `authorize()` already reads at initial login via `username: data.username`. This just forwards it through on a switch too, instead of dropping it.)

- [ ] **Step 3: Pass the new `username` into the session update**

In `src\context\CompanyContext.tsx`, find this exact block (inside `switchCompany`):

```ts
        if (json.aspnetToken) {
          setActiveAspnetToken(json.aspnetToken);
          // Await session update so server-side API routes get the new token
          // before queries refetch via invalidateQueries below
          await updateSession({
            aspnetToken: json.aspnetToken,
            companyCode: json.companyCode,
            ...(json.menuGroup !== undefined && { menuGroup: json.menuGroup }),
            ...(json.menuItems !== undefined && { menuItems: json.menuItems }),
          }).catch((err) =>
            console.warn("[CompanyContext] updateSession error:", err)
          );
        }
```

Replace with:

```ts
        if (json.aspnetToken) {
          setActiveAspnetToken(json.aspnetToken);
          // Await session update so server-side API routes get the new token
          // before queries refetch via invalidateQueries below
          await updateSession({
            aspnetToken: json.aspnetToken,
            companyCode: json.companyCode,
            ...(json.username !== undefined && { username: json.username }),
            ...(json.menuGroup !== undefined && { menuGroup: json.menuGroup }),
            ...(json.menuItems !== undefined && { menuItems: json.menuItems }),
          }).catch((err) =>
            console.warn("[CompanyContext] updateSession error:", err)
          );
        }
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: no new errors (the only pre-existing, unrelated error from yesterday's session, in `src/app/api/admin/products/[id]/route.ts`, is not touched by this task and should still be the only one, if present).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/user/switch-company/route.ts src/context/CompanyContext.tsx
git commit -m "fix: keep session username in sync with companyCode on company switch

switchCompany() updated companyCode/aspnetToken on every switch but
never username -- so after switching, the JWT's username (still
suffixed with the OLD company) and companyCode (now the NEW company)
described two different points in time. Any later re-auth that
reconstructs a username from the two (relogin, or switching again)
combined a stale, mismatched pair that ASP.NET rejects with 'Anda
tidak terdaftar di plant / company code ini.' even for a fully valid
account. Now username travels alongside companyCode on every switch,
exactly like it already does at initial login."
```

---

## Task 3: Frontend — safe username reconstruction in `relogin/route.ts`

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\api\auth\relogin\route.ts` (lines 28-34)

### Context

This closes the latent Bug 3 described in Root Cause: blind "strip everything after the last underscore" mangles usernames for accounts that were authenticated *without* a companycode (their stored username has no suffix, and can itself contain underscores). Only strip a suffix when it's verified to actually be `"_" + companyCode`.

Work from: `C:\Users\weka\Indigo\SISTROV2-next`

- [ ] **Step 1: Replace the stripping logic**

Find this exact block (current lines 28-34):

```ts
    // rawToken.username = full DB username as stored by ASP.NET e.g. "wahyu_pkg"
    // (ASP.NET /Token always stores <bare_login>_<COMPANYCODE> as the DB UserName)
    // Strip last _COMPANY suffix so re-auth sends bare username to /Token
    const lastUnderscore = rawUsername ? rawUsername.lastIndexOf("_") : -1;
    const username = (rawUsername && lastUnderscore > 0 && lastUnderscore < rawUsername.length - 1)
      ? rawUsername.slice(0, lastUnderscore)
      : rawUsername;
```

Replace with:

```ts
    // rawToken.username = full DB username as stored by ASP.NET. For accounts that logged in
    // WITH a companyCode, this is "<bare_login>_<COMPANYCODE>" (e.g. "wahyu_pkg"). For accounts
    // that logged in WITHOUT one (e.g. Transport/rekanan), it's just the bare login as-is, with
    // NO suffix -- and that bare login can itself legitimately contain underscores (e.g.
    // "budi_transport1"). Blindly stripping "everything after the last underscore" mangles those
    // bare logins into a wrong username. Only strip the suffix when we can verify it's actually
    // "_<our known companyCode>" -- never guess.
    let username = rawUsername;
    if (rawUsername && companyCode) {
      const suffix = "_" + companyCode;
      if (rawUsername.toLowerCase().endsWith(suffix.toLowerCase())) {
        username = rawUsername.slice(0, rawUsername.length - suffix.length);
      }
    }
```

(`companyCode` is already computed above this block, at the existing lines 22-26 — no reordering needed.)

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: no errors referencing `src/app/api/auth/relogin/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/relogin/route.ts
git commit -m "fix: only strip a verified companyCode suffix from username on relogin

Previously stripped 'everything after the last underscore' from the
session's stored username, assuming it always ends in _COMPANYCODE.
Accounts that logged in without a companyCode (Transport/rekanan) have
no such suffix at all -- their bare login is stored as-is and can
itself contain underscores, which the old logic wrongly chopped off.
Now only strips the suffix when it's verified to actually be
'_<our known companyCode>'."
```

---

## Task 4: Frontend — same safe-suffix fix in `switch-company/route.ts`

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\api\user\switch-company\route.ts` (~line 39-45)

### Context

`switch-company/route.ts` has an identical copy of the same unsafe stripping logic. Unlike `relogin` (which re-authenticates for the *same* company the user is already in, so the *current* `companyCode` is the right suffix to strip), `switch-company` is re-authenticating for a **new, different** company — the suffix actually present on the *current* `rawUsername` reflects the **old** company, which is `rawToken?.companyCode` (read *before* it gets overwritten), not the new target `companyCode` from the request body. Getting this distinction right matters: using the wrong reference company here would silently never strip (since the target company almost never matches the old suffix), which is still safe (falls back to sending the untouched raw username) but not as robust as it should be for accounts that do have a fixed company.

Work from: `C:\Users\weka\Indigo\SISTROV2-next`

- [ ] **Step 1: Replace the stripping logic**

Find this exact block (current lines ~39-45, right after `rawToken`/`rawUsername`/`encodedPw` are read):

```ts
    // rawToken.username = full DB username as stored by ASP.NET e.g. "wahyu_pkg"
    // (ASP.NET /Token always stores <bare_login>_<COMPANYCODE> as the DB UserName)
    // Strip last _COMPANY suffix so re-auth sends bare username to /Token
    const lastUnderscore = rawUsername ? rawUsername.lastIndexOf("_") : -1;
    const username = (rawUsername && lastUnderscore > 0 && lastUnderscore < rawUsername.length - 1)
      ? rawUsername.slice(0, lastUnderscore)
      : rawUsername;
```

Replace with:

```ts
    // rawToken.username = full DB username as stored by ASP.NET. For accounts that logged in
    // WITH a companyCode, this is "<bare_login>_<COMPANYCODE>" (e.g. "wahyu_pkg"). For accounts
    // that logged in WITHOUT one (e.g. Transport/rekanan), it's just the bare login as-is, with
    // NO suffix -- and that bare login can itself legitimately contain underscores. Blindly
    // stripping "everything after the last underscore" mangles those bare logins into a wrong
    // username. We're switching TO `companyCode` (the new target, already validated above), so
    // the suffix actually present on the CURRENT rawUsername -- if any -- is the OLD company,
    // i.e. rawToken.companyCode (read here before it's overwritten by this switch). Only strip
    // when that's verified to actually be the current suffix -- never guess.
    const oldCompanyCode = rawToken?.companyCode as string | undefined;
    let username = rawUsername;
    if (rawUsername && oldCompanyCode) {
      const suffix = "_" + oldCompanyCode;
      if (rawUsername.toLowerCase().endsWith(suffix.toLowerCase())) {
        username = rawUsername.slice(0, rawUsername.length - suffix.length);
      }
    }
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: no errors referencing `src/app/api/user/switch-company/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/switch-company/route.ts
git commit -m "fix: only strip the verified OLD companyCode suffix on company switch

Same unsafe 'strip everything after the last underscore' pattern as
relogin/route.ts, fixed the same way -- except here the suffix to
strip (if any) is the company being switched FROM (rawToken.companyCode,
read before this switch overwrites it), not the new target company."
```

---

## Task 5: Frontend — sync `companyCode` and eliminate the post-relogin token race

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\components\auth\SignInForm.tsx` (`handleAutoRelogin`, ~line 33-48)

### Context

Confirmed by the user: right after clicking "Ya, Login Lagi" and having it succeed, a *separate* call fails with `{"success":false,"error":"ASP.NET MyCompanies failed: 401"}` — from `src\app\api\user\active-company\route.ts`'s `GET` handler, which forwards `session.user.aspnetToken` as a Bearer token to ASP.NET's `/api/Company/MyCompanies`. A 401 there means ASP.NET rejected that specific bearer token as invalid, immediately after `relogin` had just handed back a freshly-issued one.

Two concrete bugs in `handleAutoRelogin`, read directly:

```ts
const handleAutoRelogin = async () => {
  setReloginLoading(true);
  setError("");
  try {
    const res = await fetch("/api/auth/relogin", { method: "POST" });
    const json = await res.json();
    if (json.success && json.aspnetToken) {
      // Update the NextAuth session client-side with the new token
      await update({ aspnetToken: json.aspnetToken });
      // Redirect back
      router.push(callbackUrl);
    } else {
      setError(json.error || "Gagal login otomatis, silakan login manual.");
    }
```

**Bug A — `companyCode` is silently dropped.** `relogin/route.ts`'s success response already includes `companyCode: data.companycode ?? companyCode` (see its final `return NextResponse.json({...})`), but `handleAutoRelogin` only ever passes `aspnetToken` to `update()` — the session's `companyCode` never gets refreshed here. If ASP.NET issued the new token under a `companycode` different from what the stale session already had (plausible any time a session sat invalidated for a while and the account's assignment changed, or after Task 1-4's fixes make cross-company relogin actually reach ASP.NET instead of failing earlier), the session ends up with a token/companyCode pair that were never issued together.

**Bug B — `router.push()` is a soft (client-side) navigation, which races the session cookie.** `update()` is awaited, so NextAuth's `/api/auth/session` round-trip (which sets a fresh encrypted JWT cookie via `Set-Cookie`) does complete before `router.push()` runs. But `router.push()` only triggers a **client-side** transition — it does not force the browser to re-send a fresh top-level request, and any component that mounts fresh on that transition (e.g. `CompanyContext`'s `fetchCompanies`, wrapped around the whole authenticated app, which is plausibly *not* rendered while `SignInForm` itself is showing on `/login`) fires its own `fetch("/api/user/active-company")` essentially concurrently with the navigation. That route reads the session **server-side** via `getServerSession(authOptions)` on a **new** request — which should see the updated cookie by then, but doing a full navigation removes any doubt entirely instead of relying on exact timing guarantees across Next.js's request/cache layers. A hard navigation (`window.location.href`) forces the entire app to remount from a fresh top-level request, guaranteeing every subsequent fetch (including `CompanyContext`'s very first one) reads the already-updated session — eliminating this whole class of race by construction rather than by timing luck.

- [ ] **Step 1: Read the current file to confirm the exact block**

Read `src\components\auth\SignInForm.tsx` and confirm the current text of `handleAutoRelogin` (shown above) — it may have drifted slightly since this plan was written.

- [ ] **Step 2: Fix both bugs**

Find this exact block:

```ts
      if (json.success && json.aspnetToken) {
        // Update the NextAuth session client-side with the new token
        await update({ aspnetToken: json.aspnetToken });
        // Redirect back
        router.push(callbackUrl);
      } else {
```

Replace with:

```ts
      if (json.success && json.aspnetToken) {
        // Update the NextAuth session client-side with the new token and companyCode together --
        // relogin/route.ts's response already includes companyCode, but it was previously dropped
        // here, risking a token/companyCode pair that were never actually issued together.
        await update({ aspnetToken: json.aspnetToken, companyCode: json.companyCode });
        // Hard navigation (not router.push) so the whole app remounts from a fresh request,
        // guaranteeing every component that reads the session on the way back in (e.g.
        // CompanyContext's first fetch to /api/user/active-company) sees the just-updated
        // token/companyCode instead of racing a client-side transition against the session
        // cookie having fully propagated.
        window.location.href = callbackUrl;
      } else {
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: no errors referencing `src/components/auth/SignInForm.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/SignInForm.tsx
git commit -m "fix: sync companyCode and hard-navigate after successful relogin

handleAutoRelogin only passed aspnetToken to the session update() call,
silently dropping the companyCode that relogin/route.ts's response
already includes -- risking a token/companyCode pair that were never
issued together. It also used router.push() (a soft, client-side
navigation) to return to the app, which raced the session cookie
against whatever component mounts fresh on that transition (e.g.
CompanyContext's first fetch to /api/user/active-company, observed
failing with 'ASP.NET MyCompanies failed: 401' immediately after a
successful relogin). Switched to a hard navigation so the whole app
remounts from a fresh request, reading the already-updated session
instead of racing it."
```

---

## Task 6: Manual verification

**Prerequisite:** Task 1's backend fix must be running the freshly built DLL for the ASP.NET-side verification steps. Follow `AGENTS.md`'s cross-project startup: from `C:\Users\weka\Indigo\sistropigroup`, run `.\start-dev.ps1` (local IIS Express backend + Next.js) — note this points IIS Express at the **primary checkout**, not the Task 1 worktree; either merge Task 1's single commit onto a branch IIS Express actually serves first, or point IIS Express at the worktree path manually for this verification.

- [ ] **Step 1: Reproduce the exact reported bug**

Log in as an account that has a `companyCode` (a regular Staff/Admin account, not Transport). Switch companies at least once via the company switcher (to exercise Task 2's fix path). Force a session invalidation (log in as the same account from a second browser/session, or navigate to `/login?session_expired=true` directly). Click "Ya, Login Lagi".

Expected (before this fix, for comparison): `{"success": false, "error": "Anda tidak terdaftar di plant / company code ini."}`.

Expected (after this fix): request succeeds, dialog closes, redirected back to `callbackUrl`, fully logged back in under the **currently active** company (the one last switched to, not the original login company).

- [ ] **Step 2: Confirm a same-company relogin (no switch) still works**

Log in normally, do NOT switch companies, force a session invalidation, click "Ya, Login Lagi". Expected: succeeds, same as before all these fixes (this path was never broken, confirming no regression).

- [ ] **Step 3: Confirm Transport/rekanan relogin (from yesterday's fix) still works**

Repeat yesterday's verification: log in as a Transport/rekanan account (no companyCode), force a session invalidation, click "Ya, Login Lagi". Expected: still succeeds — confirms Task 3's safer stripping logic didn't regress the no-companyCode case (the `if (rawUsername && companyCode)` guard means it's a no-op when `companyCode` is falsy, same as before).

- [ ] **Step 4: Confirm switching companies multiple times in a row still works**

Log in, switch to company A, switch to company B, switch back to company A. Expected: each switch succeeds and the UI reflects the correct active company each time — confirms Task 2's `username` sync doesn't break the switch flow itself.

- [ ] **Step 5: Confirm the post-relogin 401 is gone**

Repeat Step 1 (or Step 3, for a Transport account), but this time watch the browser Network tab immediately after "Ya, Login Lagi" succeeds and the page reloads. Confirm the request to `/api/user/active-company` (fired by `CompanyContext` on mount) returns `{"success": true, ...}`, not `{"success": false, "error": "ASP.NET MyCompanies failed: 401"}`. Confirm the company switcher (if visible for this account/role) shows the correct active company immediately, with no flash of empty/wrong state.

---

## Self-Review

**Spec coverage:** The user's reports cover, in order: (1) "Anda tidak terdaftar di plant / company code ini." — Task 1 (case-insensitivity) and Task 2 (username/companyCode sync) are the two most directly evidenced root causes for that exact error firing against a real, registered account; Task 3/4 close a related, already-identified risk in the same code path (unsafe username reconstruction) before it causes a third bug report. (2) `{"success":false,"error":"ASP.NET MyCompanies failed: 401"}` immediately after a successful relogin — Task 5 fixes the two concrete bugs found in `handleAutoRelogin` (dropped `companyCode`, soft-navigation race). Task 6 verifies all of the above together plus the two previously-fixed/working paths for regressions.

**Placeholder scan:** None — every task has complete before/after code, exact commands, exact commit messages.

**Type consistency:** `username` is threaded consistently as an optional string through `CompanyContext.switchCompany`'s `updateSession()` call → `auth.ts`'s `jwt` callback `updateData.username` → `token.username`, matching the existing pattern already used for `companyCode`/`aspnetToken`/`menuGroup`/`menuItems` in the same function. `oldCompanyCode` (Task 4) and `companyCode` (Task 3) are both `string | undefined`, matching how `companyCode`/`rawToken?.companyCode` are already typed everywhere else in these two files. Task 5's `update({ aspnetToken, companyCode: json.companyCode })` uses the exact same `companyCode` field name/shape the `jwt` callback's `trigger === "update"` branch already handles (`updateData.companyCode`) — no new field introduced, just an existing one that was being dropped.

**Risk assessment:**
- Task 1 (backend): LOW — a one-clause `.ToLower()` addition mirroring an already-established pattern on the same line; can only make previously-failing-due-to-case lookups succeed, cannot make a previously-succeeding lookup fail (case-insensitive matching is strictly more permissive, not less, for this single field).
- Task 2 (frontend): LOW-MEDIUM — adds a new field to an existing sync mechanism (session `update()`), following the exact same conditional-inclusion pattern already used for the three other fields it sits alongside; the only behavior change is that `username` now updates when it previously silently didn't.
- Task 3/4 (frontend): LOW — replaces a blind heuristic with a verified, exact-match check; strictly safer (can only skip stripping when previously it would have guessed, never strips something it previously wouldn't have when the guess happened to be right).
- Task 5 (frontend): LOW — `companyCode` addition to `update()` mirrors an existing, already-returned field being wired through, same as Task 2. The `router.push` → `window.location.href` swap trades a soft navigation for a hard one on exactly one path (post-relogin only, not general app navigation) — slightly slower (full page load vs. client transition) but eliminates a whole class of session-propagation race by construction; acceptable tradeoff for a security-relevant, infrequent (only fires on session recovery) flow.
