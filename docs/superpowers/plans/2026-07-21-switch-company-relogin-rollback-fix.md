# Switch-Company Relogin Rollback Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `POST /api/user/switch-company` so a failed re-auth (account not registered on the target company, or a stale pre-`_pw` session) rolls back cleanly instead of silently succeeding — the `sistro_active_company` cookie must never point at a company the session's ASP.NET token isn't actually authenticated against.

**Architecture:** Single-file fix in the Next.js route handler. Today the route sets the `sistro_active_company` cookie unconditionally at the top of the function, then attempts an ASP.NET `/Token` re-auth; on re-auth failure it still returns `{ success: true, needsRelogin: true }`, so the client (`CompanyContext.tsx`) treats it as a success, shows a "Plant Diganti" toast, and every later API call silently uses the stale token from the *old* company while the UI claims the *new* one is active. The fix moves the cookie write to *after* re-auth succeeds, and changes both failure paths to return `success: false` with a real HTTP error status. No client-side changes are needed: `CompanyContext.tsx`'s existing `if (!res.ok || !json.success) throw` (line 102) already aborts the switch and leaves `activeCompanyCode`/`activeAspnetToken` untouched when it sees `success: false`, and `CompanySwitcher.tsx`'s existing catch block already shows a "Gagal Mengganti Plant" toast with the server's error message — this bug is purely a server-side response-shape problem.

**Tech Stack:** Next.js 16 App Router route handler, next-auth JWT (`getToken`), TypeScript. No test runner is configured in this repo (`package.json` has no `test` script, no vitest/jest devDependency) — verification here uses `tsc --noEmit` + `eslint` (both confirmed working below) plus a hand-trace of the two client files, matching the pattern already used in `docs/superpowers/plans/2026-07-17-armada-isblocked-cs1061-fix.md`.

**Baseline (verified before writing this plan):**
- `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i switch-company` → no output (file currently compiles clean).
- `npx eslint src/app/api/user/switch-company/route.ts` → exactly 1 pre-existing error: `121:19 Unexpected any. Specify a different type @typescript-eslint/no-explicit-any` (the `catch (error: any)` block). This is out of scope for this fix — not touched, must still be the only error after the fix.
- Confirmed via subagent investigation: `needsRelogin` (defined at `route.ts:55` and `:84`) has zero consumers anywhere in `src/` — safe to delete, nothing reads it.
- Confirmed: `src/context/CompanyContext.tsx:102` (`if (!res.ok || !json.success) throw new Error(json.error || "Gagal berganti plant")`) and `src/components/header/CompanySwitcher.tsx:38-44` (catch block → "Gagal Mengganti Plant" toast) already do the right thing for a `success: false` response — they just never see one today.

---

### Task 1: Make the cookie write depend on a confirmed re-auth, and fail closed on re-auth errors

**Files:**
- Modify: `src/app/api/user/switch-company/route.ts`

- [ ] **Step 1: Remove the unconditional cookie write that currently runs before re-auth is attempted**

Find (`route.ts`, right after the `companyCode` presence check):
```ts
    const { companyCode } = await request.json();
    if (!companyCode) {
      return NextResponse.json({ success: false, error: "companyCode required" }, { status: 400 });
    }

    // Set the active company cookie regardless
    const cookieStore = await cookies();
    cookieStore.set("sistro_active_company", companyCode, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    // Try to get raw JWT to access _pw for re-auth
```
Replace with:
```ts
    const { companyCode } = await request.json();
    if (!companyCode) {
      return NextResponse.json({ success: false, error: "companyCode required" }, { status: 400 });
    }

    // Try to get raw JWT to access _pw for re-auth
```
This deletes the cookie write from here — it moves to Step 3, right before the final success response, so the cookie only ever gets set once re-auth against the target company is confirmed to work.

- [ ] **Step 2: Turn the two silent `needsRelogin` success responses into real failures**

Find (the stale-session branch, no cookie mutation needed here since Step 1 already removed the write above it):
```ts
    // If session was created before _pw was stored (old session),
    // return success with cookie set but no new ASP.NET token.
    // Full token sync will happen on next login.
    if (!username || !encodedPw) {
      return NextResponse.json({
        success: true,
        activeCompany: companyCode,
        aspnetToken: null,
        needsRelogin: true, // hint to client that token is not synced
      });
    }
```
Replace with:
```ts
    // Session created before _pw was stored (old session) — can't re-auth
    // without the password. Fail closed instead of switching the cookie to
    // a company the token was never actually authenticated against.
    if (!username || !encodedPw) {
      return NextResponse.json({
        success: false,
        error: "Sesi Anda perlu diperbarui. Silakan logout dan login kembali sebelum berganti plant.",
      }, { status: 409 });
    }
```

Find (the ASP.NET re-auth failure branch):
```ts
    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => tokenRes.statusText);
      let errMsg = "Gagal berganti plant";
      try { errMsg = JSON.parse(text)?.error_description || text || errMsg; } catch {}
      // Even if ASP.NET re-auth fails, cookie is already set — return partial success
      console.error("[switch-company] ASP.NET re-auth failed:", errMsg);
      return NextResponse.json({
        success: true,
        activeCompany: companyCode,
        aspnetToken: null,
        needsRelogin: true,
      });
    }
```
Replace with:
```ts
    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => tokenRes.statusText);
      let errMsg = "Akun Anda tidak terdaftar pada plant ini.";
      try { errMsg = JSON.parse(text)?.error_description || errMsg; } catch {}
      console.error("[switch-company] ASP.NET re-auth failed:", errMsg);
      // Re-auth failed — the cookie was never set (Step 1), so the active
      // company stays exactly where it was before this request.
      return NextResponse.json({ success: false, error: errMsg }, { status: 409 });
    }
```

- [ ] **Step 3: Set the cookie only after re-auth is confirmed, right before the success response**

Find (the end of the function, right before the final success return):
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
  } catch (error: any) {
```
Replace with:
```ts
    // Re-auth confirmed the account exists on the target company — only now
    // is it safe to persist the cookie, so cookie and token can never disagree.
    const cookieStore = await cookies();
    cookieStore.set("sistro_active_company", companyCode, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    return NextResponse.json({
      success: true,
      activeCompany: companyCode,
      aspnetToken: data.access_token,
      companyCode: data.companycode ?? companyCode,
      username: data.username,
      menuGroup: resolvedMenuGroup,
      menuItems: resolvedMenuItems,
    });
  } catch (error: any) {
```

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "switch-company"
```
Expected: no output — same as baseline, no new type errors introduced.

- [ ] **Step 5: Lint**

Run:
```bash
npx eslint src/app/api/user/switch-company/route.ts
```
Expected: exactly 1 error, same as baseline — `121:19 Unexpected any ... @typescript-eslint/no-explicit-any` in the outer `catch (error: any)` block. No new errors on the lines touched in Steps 1-3. If that line number shifted because of the earlier deletions, confirm it's still pointing at the same `catch (error: any) {` and not a new occurrence.

- [ ] **Step 6: Hand-trace the client-side rollback (no code changes — confirm the existing client already does the right thing with the new response shape)**

Read `src/context/CompanyContext.tsx:91-132` (`switchCompany`). Confirm:
- With `success: false` in the JSON body, `res.ok` is `false` (status 409, from Step 2) so the guard at line 102 (`if (!res.ok || !json.success) throw new Error(json.error || "Gagal berganti plant")`) throws immediately, using the server's `error` message from Step 2 (e.g. `"Akun Anda tidak terdaftar pada plant ini."`).
- Because it throws before reaching line 108 (`if (json.aspnetToken)`) and line 124 (`setActiveCompanyCode(code)`), neither `activeAspnetToken` nor `activeCompanyCode` local state changes — the previously active company stays active in the UI.

Read `src/components/header/CompanySwitcher.tsx:26-47` (`handleSwitch`). Confirm the thrown error is caught at line 38, and the catch block fires `addToast({ title: "Gagal Mengganti Plant", description: err?.message || "Terjadi kesalahan. Coba lagi.", variant: "destructive" })` — so the user now sees the specific server error message (e.g. "Akun Anda tidak terdaftar pada plant ini.") instead of the previous false-positive "Plant Diganti" success toast.

- [ ] **Step 7: Manual QA (optional — only if you have two test accounts, one registered on a company the other isn't)**

Run the dev server (`npm run dev:local` or `npm run dev`), log in with an account registered on Company A only, open the plant switcher, and attempt to switch to a plant the account is not registered on (requires backend test data — skip if none available, Steps 4-6 are the available verification otherwise). Expected: destructive "Gagal Mengganti Plant" toast with a specific message, active-plant label in the header stays on Company A, and a subsequent page reload still shows Company A as active (cookie was never flipped).

- [ ] **Step 8: Commit**

```bash
git add src/app/api/user/switch-company/route.ts
git commit -m "fix: roll back company switch on failed re-auth instead of silently succeeding"
```

---

## Self-review notes

- **Spec coverage:** user confirmed (via `AskUserQuestion`) the desired fix behavior is "full rollback + error toast" for the `needsRelogin` bug found during investigation. Task 1 delivers exactly that: cookie only commits after confirmed re-auth (Steps 1 & 3), both failure paths return `success: false` (Step 2), and the existing client code already converts that into a rollback + destructive toast (Step 6 hand-trace confirms, no client edit needed).
- **Placeholder scan:** every step shows the literal before/after code, exact commands, and expected output. No "add error handling" or "similar to Task N" placeholders.
- **Type consistency:** the response shape `{ success: boolean, error?: string, activeCompany?, aspnetToken?, companyCode?, username?, menuGroup?, menuItems? }` stays a plain object literal (no shared TS interface exists for this route's response today, so none is introduced) — `success: false` responses only ever carry `{ success, error }`, matching what `CompanyContext.tsx:102` already checks (`json.error`) and nothing else. `needsRelogin` is fully removed (no dangling references — confirmed zero consumers in the investigation baseline).
