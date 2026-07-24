# MFA Revert (Login Lockout) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revert the MFA/OTP login feature so all users can log in again — reported symptom is a universal login failure ("semuanya error tidak bisa login", surfaced via account `mahesa` / password `mahesa123`), showing the generic message `Terjadi kesalahan sistem, silakan coba lagi.`

**Architecture:** The MFA feature touches exactly 4 files, confirmed by grepping the whole `src/` tree for every MFA-related symbol (`MfaOtpStep`, `mfa-verify`, `MFA_REQUIRED`, `mfaToken`) and by walking `git log` for every commit that ever touched `src/lib/auth.ts` or `src/components/auth/SignInForm.tsx` since the last pre-MFA commit (`1173752`) — every single commit in both histories is MFA-related, so there is no collateral feature to preserve by reverting to that commit's version of those two files. The other two MFA files (`src/app/api/auth/mfa-verify/route.ts`, `src/components/auth/MfaOtpStep.tsx`) did not exist before MFA and are pure additions, safe to delete outright. No test suite references MFA, no `package.json` dependency was added for it, and no other file in the repo imports any of the four.

One catch: `src/components/auth/SignInForm.tsx` currently has an **uncommitted** local edit (`git diff` shows it, not yet committed) that changes the non-MFA error fallback from a hardcoded string to `result.error || "Akun tidak terdaftar"`. That line sits inside the same function this revert rewrites, so a raw revert would silently discard it. Task 3 reapplies it by hand after the revert so no in-progress work is lost.

**Tech Stack:** Next.js 16 (NextAuth credentials provider), TypeScript, git

---

### Task 1: Delete the two MFA-only files

**Files:**
- Delete: `src/app/api/auth/mfa-verify/route.ts`
- Delete: `src/components/auth/MfaOtpStep.tsx`

These did not exist at commit `1173752` (last commit before MFA work started) and nothing outside the MFA feature imports them (confirmed via `grep -rln "MfaOtpStep\|mfa-verify\|MFA_REQUIRED\|mfaToken" src` — the only 4 hits are these 2 files plus `SignInForm.tsx` and `auth.ts`, handled in Tasks 2–3).

- [ ] **Step 1: Delete the files**

```bash
git rm src/app/api/auth/mfa-verify/route.ts
git rm src/components/auth/MfaOtpStep.tsx
```

- [ ] **Step 2: Confirm nothing else references them**

Run: `grep -rln "MfaOtpStep\|mfa-verify" src`
Expected: no output (empty) once Task 2 also removes the import in `SignInForm.tsx` — if this still lists `SignInForm.tsx` at this point, that's expected until Task 3.

---

### Task 2: Revert `src/lib/auth.ts` to its pre-MFA state

**Files:**
- Modify: `src/lib/auth.ts`

The only difference between the pre-MFA version (commit `1173752`) and the current file is two `if (errMsg !== "MFA_REQUIRED")` / `if (err.message !== "MFA_REQUIRED" && ...)` guards added around the `LOGIN_FAILED` audit-log calls in `authorize()`. Every commit that ever touched this file since `1173752` is MFA-related (`4747a1c`, `eb99d82`, `f199f4b`, `2994a19`), so restoring the whole file to that commit's content is a full, clean revert with no collateral loss.

- [ ] **Step 1: Restore the pre-MFA file content**

```bash
git checkout 1173752 -- src/lib/auth.ts
```

- [ ] **Step 2: Verify the diff only removes the MFA guards**

Run: `git diff HEAD -- src/lib/auth.ts`
Expected: a removal-only diff whose two hunks are exactly the `if (errMsg !== "MFA_REQUIRED")` block and the `err.message !== "MFA_REQUIRED" &&` condition shown above — nothing else changes in the file (unaffected: role priority list, `pickHighestRole`, JWT/session callbacks, `logEvent` calls elsewhere).

---

### Task 3: Revert `src/components/auth/SignInForm.tsx`, then reapply the uncommitted error-message fix

**Files:**
- Modify: `src/components/auth/SignInForm.tsx`

Same situation as Task 2 — every commit touching this file since `1173752` (`09fe62a`, `9ee9ddd`, `d3bd182`) is MFA-related, so the pre-MFA version is a full, clean revert of the OTP step (`phase` state, `doSignIn`/`handleMfaVerified` split, `MfaOtpStep` render branch, `companycode` state). This restores the original single `handleSubmit` that calls `signIn()` directly and treats any `result?.error` as either a system error or "Akun tidak terdaftar".

The uncommitted local edit currently on this file changes that last branch from a hardcoded string to `result.error || "Akun tidak terdaftar"`. Reapply it after the revert so that improvement isn't lost.

- [ ] **Step 1: Restore the pre-MFA file content**

```bash
git checkout 1173752 -- src/components/auth/SignInForm.tsx
```

- [ ] **Step 2: Reapply the uncommitted error-message fix**

In the reverted file, find this block inside `handleSubmit` (the `if (result?.error)` branch):

```typescript
        setError(isSystemError ? "Terjadi kesalahan sistem, silakan coba lagi." : "Akun tidak terdaftar");
```

Change it to:

```typescript
        setError(isSystemError ? "Terjadi kesalahan sistem, silakan coba lagi." : (result.error || "Akun tidak terdaftar"));
```

- [ ] **Step 3: Confirm no MFA references remain anywhere in src**

Run: `grep -rln "MfaOtpStep\|mfa-verify\|MFA_REQUIRED\|mfaToken" src`
Expected: no output (empty)

---

### Task 4: Typecheck, build, and manually verify login

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `auth.ts`, `SignInForm.tsx`, `mfa-verify`, or `MfaOtpStep`

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds; no missing-module errors for the deleted files

- [ ] **Step 3: Start dev server and manually log in as the affected account**

```bash
npm run dev
```

Open the login page, sign in with username `mahesa` / password `mahesa123`. Expected: no OTP/MFA step appears, login succeeds and redirects to the dashboard (or fails with a real backend error, not the generic `Terjadi kesalahan sistem, silakan coba lagi.` — if it still fails, the cause is not MFA and needs separate root-cause debugging with `superpowers:systematic-debugging`, not further reverting).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "revert(auth): remove MFA/OTP login step, restore direct credentials sign-in

MFA rollout broke login for all users (reported via mahesa account).
Reverts src/lib/auth.ts and SignInForm.tsx to pre-MFA state (commit 1173752)
and deletes the MFA-only mfa-verify route and MfaOtpStep component."
```

---

## Note on root cause

This plan restores the last known-good login path; it does not diagnose *why* the MFA change broke login for every account. If the goal is to bring MFA back later, that requires a separate investigation (start with `src/lib/auth.ts`'s pre-revert `authorize()` — likely candidates: the `/Token` endpoint's `MFA_REQUIRED` response shape not matching what `SignInForm.tsx` expected, or the mfa-verify route's signed-token flow) before re-attempting the feature.
