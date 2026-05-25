# Fix Company Switch Token — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix company switch so `/posto/priority` (and all other pages) show data from the switched company, not the original login company.

**Architecture:** Root cause — `rawToken.username` in JWT = full DB username `wahyu_pkg`, not bare `wahyu`. `switch-company` route passes this full value to `/Token` as `username=wahyu_pkg&companycode=PKC`, backend builds `wahyu_pkg_pkc` (not in DB) → auth fails → `aspnetToken: null` → Bearer token never updates → `myCompanyCode` = original company forever. Fix: strip company suffix before re-auth.

**Tech Stack:** Next.js 16, NextAuth.js, TypeScript

---

## Root Cause Trace

```
1. Login: user types "wahyu", companycode = "pkg" (auto-detected)
   → ASP.NET /Token: finds "wahyu_pkg" in DB, returns token
   → token response: username = "wahyu_pkg" (full DB username)
   → JWT stores: rawToken.username = "wahyu_pkg"

2. Switch company to PKC:
   → switch-company/route.ts line 35: username = rawToken.username = "wahyu_pkg"
   → Re-auth: POST /Token username=wahyu_pkg&companycode=PKC
   → Backend builds: "wahyu_pkg" + "_" + "pkc" = "wahyu_pkg_pkc" — NOT in DB
   → /Token returns 400 error
   → route.ts line 71-76: returns { aspnetToken: null }
   → CompanyContext.switchCompany: if (!json.aspnetToken) → skip setActiveAspnetToken
   → activeAspnetToken stays as original "wahyu_pkg" token
   → useApi sends original Bearer token to DatatablePrioritas
   → myCompanyCode = "pkg" forever
```

## Files Changed

| File | Action | Note |
|---|---|---|
| `src/app/api/user/switch-company/route.ts` | Modify | Strip company suffix before re-auth |

---

## Task 1: Strip company suffix in switch-company route

**Files:**
- Modify: `src/app/api/user/switch-company/route.ts`

- [ ] **Step 1: Understand current state**

Read `src/app/api/user/switch-company/route.ts` lines 34-57.

Current code:
```typescript
const rawToken = await getToken({ req: request, secret: NEXTAUTH_SECRET });
const username = rawToken?.username as string | undefined;
const encodedPw = rawToken?._pw as string | undefined;

if (!username || !encodedPw) {
  return NextResponse.json({ success: true, activeCompany: companyCode, aspnetToken: null, needsRelogin: true });
}

const password = Buffer.from(encodedPw, "base64").toString("utf-8");
const params = new URLSearchParams({
  grant_type: "password",
  username,                  // BUG: "wahyu_pkg" instead of "wahyu"
  password,
  companycode: companyCode,
});
```

- [ ] **Step 2: Apply fix — strip company suffix from username**

Replace lines 34-57 with:

```typescript
const rawToken = await getToken({ req: request, secret: NEXTAUTH_SECRET });
const rawUsername = rawToken?.username as string | undefined;
const encodedPw = rawToken?._pw as string | undefined;

// rawToken.username = full DB username e.g. "wahyu_pkg"
// Strip last _COMPANY suffix to get bare username for re-auth
// e.g. "wahyu_pkg" → "wahyu", "wahyu_eko_pkg" → "wahyu_eko", "driver123" → "driver123"
const lastUnderscore = rawUsername ? rawUsername.lastIndexOf("_") : -1;
const username = (rawUsername && lastUnderscore > 0 && lastUnderscore < rawUsername.length - 1)
  ? rawUsername.slice(0, lastUnderscore)
  : rawUsername;

if (!username || !encodedPw) {
  return NextResponse.json({ success: true, activeCompany: companyCode, aspnetToken: null, needsRelogin: true });
}

const password = Buffer.from(encodedPw, "base64").toString("utf-8");
const params = new URLSearchParams({
  grant_type: "password",
  username,                  // now "wahyu" — backend builds "wahyu_pkc" correctly
  password,
  companycode: companyCode,
});
```

Exact edit — in `src/app/api/user/switch-company/route.ts`:

Old:
```typescript
    const rawToken = await getToken({ req: request, secret: NEXTAUTH_SECRET });
    const username = rawToken?.username as string | undefined;
    const encodedPw = rawToken?._pw as string | undefined;
```

New:
```typescript
    const rawToken = await getToken({ req: request, secret: NEXTAUTH_SECRET });
    const rawUsername = rawToken?.username as string | undefined;
    const encodedPw = rawToken?._pw as string | undefined;

    // rawToken.username = full DB username e.g. "wahyu_pkg"
    // Strip last _COMPANY suffix so re-auth sends bare username to /Token
    const lastUnderscore = rawUsername ? rawUsername.lastIndexOf("_") : -1;
    const username = (rawUsername && lastUnderscore > 0 && lastUnderscore < rawUsername.length - 1)
      ? rawUsername.slice(0, lastUnderscore)
      : rawUsername;
```

- [ ] **Step 3: Verify no TypeScript errors**

```powershell
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Manual test in browser**

1. Login as `wahyu` → should show data for `pkg` company on `/posto/priority`
2. Open company switcher → switch to `PKC`
3. On `/posto/priority`: click "Tampilkan" after selecting warehouses
4. Verify data shown is from PKC, not PKG

Also verify in browser DevTools → Network tab:
- After switch, the `Authorization: Bearer ...` header in the `/api/POSTO/DatatablePrioritas` request should be a DIFFERENT token than before switch
- Console should NOT show switch-company returning `aspnetToken: null`

- [ ] **Step 5: Commit**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
git add src/app/api/user/switch-company/route.ts
git commit -m "fix: strip company suffix from username before switch-company re-auth"
```

---

## Edge Cases

| Username | After strip | Re-auth to /Token | Backend finds |
|---|---|---|---|
| `wahyu_pkg` | `wahyu` | `username=wahyu&companycode=PKC` | `wahyu_pkc` ✓ |
| `wahyu_eko_pkg` | `wahyu_eko` | `username=wahyu_eko&companycode=PKC` | `wahyu_eko_pkc` ✓ |
| `driver123` (Transport, no `_`) | `driver123` (unchanged) | `username=driver123&companycode=PKC` | likely fails → `aspnetToken: null` |

Transport users typically don't have multiple companies, so the last case is fine — they stay on their original token (which doesn't need company filtering).

---

## Self-Review

- [x] Root cause identified: wrong username sent to /Token on re-auth ✓
- [x] Fix is self-contained: 1 file, 3 lines added ✓
- [x] Edge cases covered: multi-underscore username, no-underscore (Transport) ✓
- [x] No backend changes needed ✓
- [x] No other files need updating ✓
- [x] Type safety: `username` type is still `string | undefined` ✓
