# SISTRO Next MFA Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring SISTRO Next's login flow to parity with sistrogroup's Identik MFA (OTP) flow — a user with `IsIdentik=true` gets prompted for an OTP after password, exactly as the MVC app already does.

**Architecture:**
- ASP.NET (`sistropigroup/SISTROAWESOME`): `MfaController.cs` currently requires an authenticated caller and has no `IsIdentik` gate (unlike the MVC `AccountController`, which only calls the external Identik API for users flagged `IsIdentik=true`). We open the two existing MFA actions to anonymous callers, add the missing `IsIdentik` gate so non-MFA users never round-trip to the external provider, and add a `verifyotp` API action (currently only exists in MVC).
- Next.js (`SISTROV2-next`): the login form already calls ASP.NET directly through the existing `/aspnet-proxy` rewrite (see `GetUserCompanies` usage in `SignInForm.tsx`) — so `mfa/login` and `mfa/sendotpmethod` are called the same way, no new proxy routes needed for those. The one exception is OTP verification: turning a verified OTP into "authorize() can trust this without re-checking MFA" requires signing a token with `NEXTAUTH_SECRET`, which only exists server-side — that's the one new route (`/api/auth/mfa-verify`). `lib/auth.ts`'s `authorize()` is extended to check MFA requirement and to trust a valid signed `mfaToken`.

**Tech Stack:** ASP.NET Web API (C#), Next.js 16 App Router, NextAuth v4, Node.js `crypto` (HMAC-SHA256)

---

## Verified Findings (Pre-Plan)

**Q: Is MFA already implemented in SISTRO Next?**
> No. `src/lib/auth.ts`'s `authorize()` only calls `/Token` — no `/api/mfa/*` calls, no OTP UI. A 2026-05-15 plan (`sistropigroup/docs/superpowers/plans/2026-05-15-smart-login-company-mfa.md`) designed this integration but was never executed — none of its files exist in `src/`.

**Q: Does sistrogroup gate MFA per-user, or is it all-or-nothing?**
> Per-user. `AccountController.cs:1028` — `isIdentikUser = user.IsIdentik.HasValue && user.IsIdentik.Value`. Transport users are always forced non-Identik (`AccountController.cs:1046-1049`). Only Identik users hit the external MFA provider; everyone else uses local password auth.
>
> **Bug found:** `MfaController.cs` (the API used by SPA/mobile clients) has **no such gate** — its `Login` action calls the external Identik API for *any* username as long as the global `Web.config` `Mfa` flag is `true` (currently `true` in production). If SISTRO Next called this endpoint as-is, every login — including the majority of non-Identik users — would take a needless round-trip to `identik-api.pupuk-indonesia.com`, and if that third party is slow or down, every login in the new flow degrades or errors. This plan adds the missing gate to `MfaController.Login` as part of Task 1 — it doesn't just wire up the endpoint, it fixes a real parity bug.

**Q: Can the frontend call the MFA endpoints directly instead of via a Next.js proxy route?**
> Yes, for two of the three. The browser already calls ASP.NET directly through `/aspnet-proxy/*` (see `SignInForm.tsx:66-67`'s `GetUserCompanies` call) — that rewrite (`next.config.ts:23-30`) passes through any path/method with no auth required on the ASP.NET side. `mfa/login` and `mfa/sendotpmethod` can be called the same way once `[AllowAnonymous]` is added. `verifyotp` is the exception — turning "OTP correct" into a signed `mfaToken` requires `NEXTAUTH_SECRET`, which must never reach the browser, so that one call has to go through a Next.js server route.

**Q: What username format do the MFA endpoints expect?**
> The bare (un-suffixed) username, matching the `AspNetUsers.username1` column — not `AspNetUsers.UserName`, which stores the `<login>_<COMPANYCODE>` form used by `/Token`. `MfaController.Login` matches `x.username1 == request.Username` with no stripping, so the caller must pass the bare username directly (same value as `credentials.username` in `auth.ts`, before any company suffix is appended for `/Token`). `SendOtpMethod`/`VerifyOtp` strip everything before the first `_` defensively, so passing the bare username to those is also safe.

---

## File Map

### ASP.NET (`sistropigroup/SISTROAWESOME/`)
| File | Action | Purpose |
|------|--------|---------|
| `api/MfaController.cs` | **Modify** | Add `[AllowAnonymous]`, add `IsIdentik` gate to `Login`, add `POST /api/mfa/verifyotp` |

### Next.js (`SISTROV2-next/src/`)
| File | Action | Purpose |
|------|--------|---------|
| `app/api/auth/mfa-verify/route.ts` | **Create** | Server-side: calls ASP.NET `verifyotp`, issues signed `mfaToken` on success |
| `lib/auth.ts` | **Modify** | Add `mfaToken` credential, `verifyMfaToken()` helper, MFA-required check in `authorize()` |
| `components/auth/MfaOtpStep.tsx` | **Create** | OTP method-select + code-entry UI, shown after password step |
| `components/auth/SignInForm.tsx` | **Modify** | Catch `MFA_REQUIRED` from `signIn()`, render `MfaOtpStep`, retry `signIn()` with `mfaToken` |

---

## Task 1: ASP.NET — MfaController Gating + verifyotp Endpoint

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\MfaController.cs`

**Context:** Three changes to one file: (1) let unauthenticated callers reach `Login`/`SendOtpMethod` — required because the caller is mid-login and has no bearer token yet; (2) add the `IsIdentik` gate that's missing today (see "Verified Findings" above); (3) add a `verifyotp` action mirroring the existing MVC `AccountController.VerifyOtp` (`Controllers/AccountController.cs:1205`), minus the cookie sign-in (SISTRO Next uses the bearer-token `/Token` flow, not ASP.NET Identity cookies).

- [ ] **Step 1: Add `[AllowAnonymous]` to `Login` and `SendOtpMethod`**

In `MfaController.cs`, change:

```csharp
[HttpPost]
[Route("login")]
public async Task<IHttpActionResult> Login(LoginMfaRequest request)
```
to:
```csharp
[HttpPost]
[AllowAnonymous]
[Route("login")]
public async Task<IHttpActionResult> Login(LoginMfaRequest request)
```

And change:
```csharp
[HttpPost]
[Route("sendotpmethod")]
public async Task<IHttpActionResult> SendOtpMethod(MfaOtpMethodRequest request)
```
to:
```csharp
[HttpPost]
[AllowAnonymous]
[Route("sendotpmethod")]
public async Task<IHttpActionResult> SendOtpMethod(MfaOtpMethodRequest request)
```

- [ ] **Step 2: Add the `IsIdentik` gate to `Login`**

Inside `Login`, immediately after the `isMfa` check (right after `var isMfa = Convert.ToBoolean(useMfa);`), before the `if (isMfa)` block that calls the external API, insert an early return for non-Identik users:

```csharp
var useMfa = ConfigurationManager.AppSettings["Mfa"];
var isMfa = Convert.ToBoolean(useMfa);

if (isMfa)
{
    var lookupUser = db.AspNetUsers.FirstOrDefault(x => x.username1 == request.Username);
    bool isIdentikUser = lookupUser != null && lookupUser.IsIdentik.HasValue && lookupUser.IsIdentik.Value;

    if (!isIdentikUser)
    {
        result.Success = true;
        result.Message = "";
        result.IsMfaRequired = false;
        return Ok(result);
    }
}
```

This sits right before the existing `if (isMfa) { var loginData = new { ... } ...` block — the existing block stays completely unchanged, it's just now only reached for Identik users. (The existing `else { result.Success = true; ... }` at the bottom, for when `isMfa` is globally `false`, also stays unchanged.)

- [ ] **Step 3: Add `_mfaService` field and the `verifyotp` action**

Add a field near the top of the class, alongside the existing `gh`/`db`/`logger` fields:

```csharp
protected GeneralHelper gh = new GeneralHelper();
protected sistroEntities db = new sistroEntities();
private static readonly Logger logger = LogManager.GetCurrentClassLogger();
private readonly MfaService _mfaService = new MfaService();
```

Add this action after `SendOtpMethod`, before `EncryptString`:

```csharp
[HttpPost]
[AllowAnonymous]
[Route("verifyotp")]
public async Task<IHttpActionResult> VerifyOtp(MfaVerify request)
{
    var result = new MfaResponse();
    try
    {
        string cleanUsername;
        int underscoreIndex = request.Username.IndexOf('_');
        cleanUsername = (underscoreIndex > 0)
            ? request.Username.Substring(0, underscoreIndex)
            : request.Username;

        AspNetUsers user;
        using (var ctx = new sistroEntities())
        {
            user = ctx.AspNetUsers.FirstOrDefault(x => x.username1 == cleanUsername);
        }

        if (user == null)
        {
            result.Success = false;
            result.Message = "Pengguna tidak ditemukan.";
            return Ok(result);
        }

        var mfaVerifyRequest = new MfaVerifyRequest
        {
            two_factor_id = user.MfaId,
            code = request.Code,
            device_id = cleanUsername + "_SISTRO"
        };

        var verifyResult = await _mfaService.VerifyMfaAsync(mfaVerifyRequest);
        result.Success = verifyResult.Success;
        result.Message = verifyResult.Message ?? (verifyResult.Success ? "Verifikasi berhasil." : "Kode OTP tidak valid.");
        return Ok(result);
    }
    catch (Exception ex)
    {
        result.Success = false;
        result.Message = "Internal Error: " + (ex.InnerException?.Message ?? ex.Message);
        return Ok(result);
    }
}
```

- [ ] **Step 4: Build and test manually**

Build the solution (Visual Studio or `msbuild`), then with the local/dev backend running:

```
POST http://localhost:8090/api/mfa/login
Content-Type: application/json

{"Username": "<a non-Identik username, e.g. a transport/local test account>", "Password": "<their real password>"}
```
Expected: `{"Success": true, "Message": "", "IsMfaRequired": false, ...}` — and no delay from an external call (this exercises the new gate).

```
POST http://localhost:8090/api/mfa/login
Content-Type: application/json

{"Username": "<a real Identik test username>", "Password": "<their real password>"}
```
Expected: `{"Success": true, "IsMfaRequired": true, ...}` if they don't have "remember device" active.

```
POST http://localhost:8090/api/mfa/verifyotp
Content-Type: application/json

{"Username": "<the Identik username>", "Code": "<the OTP just received>"}
```
Expected: `{"Success": true, "Message": "Verifikasi berhasil.", ...}`. With a wrong code: `{"Success": false, "Message": "Kode OTP tidak valid.", ...}`.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/MfaController.cs
git commit -m "feat(mfa): allow anonymous pre-auth MFA calls, gate Login by IsIdentik, add verifyotp"
```

---

## Task 2: Next.js — mfa-verify Route (OTP Verify + Signed Token)

**Files:**
- Create: `C:\Users\weka\Indigo\SISTROV2-next\src\app\api\auth\mfa-verify\route.ts`

**Context:** This is the only new Next.js route this plan adds. It calls ASP.NET's `verifyotp` server-side, and on success signs a short-lived token (`username`, `companycode`, expiry, HMAC-SHA256 signature) that `authorize()` in Task 3 will verify to skip re-checking MFA when `signIn()` runs a second time.

- [ ] **Step 1: Create the route**

```typescript
// SISTROV2-next/src/app/api/auth/mfa-verify/route.ts
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const ASPNET_API_URL = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";
const MFA_TOKEN_TTL_MS = 5 * 60 * 1000;

export function signMfaToken(username: string, companycode: string): string {
  const secret = process.env.NEXTAUTH_SECRET!;
  const exp = Date.now() + MFA_TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ u: username, c: companycode, exp })).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyMfaToken(token: string, username: string, companycode: string): boolean {
  try {
    const secret = process.env.NEXTAUTH_SECRET!;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;

    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() > data.exp) return false;
    if (data.u !== username || data.c !== (companycode ?? "")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const { username, companycode, code } = await request.json();

  if (!username || !code) {
    return NextResponse.json({ success: false, error: "username dan code wajib" }, { status: 400 });
  }

  try {
    const res = await fetch(`${ASPNET_API_URL}/api/mfa/verifyotp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Username: username, Code: code }),
    });
    const data = await res.json();

    if (!data.Success) {
      return NextResponse.json({ success: false, message: data.Message ?? "Kode OTP tidak valid." });
    }

    const mfaToken = signMfaToken(username, companycode ?? "");
    return NextResponse.json({ success: true, mfaToken });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
```

> **Note:** `signMfaToken`/`verifyMfaToken` are exported so Task 3 can import `verifyMfaToken` into `auth.ts` without duplicating the signing logic.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
npx tsc --noEmit
```
Expected: no errors referencing `mfa-verify/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/mfa-verify/route.ts
git commit -m "feat(auth): add mfa-verify route to verify OTP and issue signed mfaToken"
```

---

## Task 3: Next.js — auth.ts MFA Check + Token Verification

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\lib\auth.ts`

**Context:** `authorize()` needs two additions after the existing `/Token` call succeeds (right after the `data = await res.json();` try/catch block, before the `roles` parsing that already exists at line ~146): (1) if a valid signed `mfaToken` was passed, skip the MFA check entirely; (2) otherwise call `/api/mfa/login` and throw `"MFA_REQUIRED"` if `IsMfaRequired` comes back `true`. Everything else in the file (menu group resolution, role priority, JWT/session callbacks, audit logging) is untouched.

- [ ] **Step 1: Add the `mfaToken` credential field**

In the `credentials` object passed to `CredentialsProvider`, add a fourth field:

```typescript
credentials: {
  username:    { label: "Username", type: "text" },
  password:    { label: "Password", type: "password" },
  companycode: { label: "Company Code", type: "text" },
  mfaToken:    { label: "MFA Token", type: "text" },
},
```

- [ ] **Step 2: Import `verifyMfaToken` at the top of the file**

```typescript
import { verifyMfaToken } from "@/app/api/auth/mfa-verify/route";
```

- [ ] **Step 3: Insert the MFA check in `authorize()`**

Immediately after the existing block that does `data = await res.json();` and its surrounding try/catch (i.e., right before the line `const roles: string[] = data.role`), insert:

```typescript
// MFA check — skip if a freshly-verified, signed mfaToken was supplied.
const mfaTokenValid = credentials.mfaToken
  ? verifyMfaToken(credentials.mfaToken, credentials.username, credentials.companycode ?? "")
  : false;

if (!mfaTokenValid) {
  try {
    const mfaRes = await fetch(`${ASPNET_API_URL}/api/mfa/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Username: credentials.username, Password: credentials.password }),
    });
    if (mfaRes.ok) {
      const mfaData = await mfaRes.json();
      if (mfaData.IsMfaRequired === true) {
        throw new Error("MFA_REQUIRED");
      }
    }
  } catch (err: any) {
    if (err.message === "MFA_REQUIRED") throw err;
    // MFA provider unreachable/erroring — fail open to normal login rather than
    // locking every user out because a third-party service is down.
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
npx tsc --noEmit
```
Expected: no errors referencing `auth.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(auth): check MFA requirement and verify signed mfaToken in authorize()"
```

---

## Task 4: Next.js — MfaOtpStep Component

**Files:**
- Create: `C:\Users\weka\Indigo\SISTROV2-next\src\components\auth\MfaOtpStep.tsx`

**Context:** Shown by `SignInForm` after `signIn()` throws `MFA_REQUIRED`. Sends the OTP via `sendotpmethod` directly through `/aspnet-proxy` (no signing needed there — it's just "send a code", nothing to trust), then verifies through the Task 2 route. Styled to match the plain HTML inputs already used in `SignInForm.tsx` (that file doesn't use the `@/components/form/*` wrapper components the older draft assumed).

- [ ] **Step 1: Create the component**

```tsx
// SISTROV2-next/src/components/auth/MfaOtpStep.tsx
"use client";
import React, { useState } from "react";
import { API_BASE } from "@/lib/api-client";

interface Props {
  username: string;
  companycode: string;
  onVerified: (mfaToken: string) => void;
  onBack: () => void;
}

export default function MfaOtpStep({ username, companycode, onVerified, onBack }: Props) {
  const [method, setMethod]       = useState<"email" | "sms" | null>(null);
  const [otpCode, setOtpCode]     = useState("");
  const [error, setError]         = useState("");
  const [sending, setSending]     = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent]           = useState(false);

  async function sendOtp(selectedMethod: "email" | "sms") {
    setSending(true);
    setError("");
    setMethod(selectedMethod);
    try {
      const res = await fetch(`${API_BASE}/api/mfa/sendotpmethod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Username: username, MethodId: selectedMethod }),
      });
      const data = await res.json();
      if (!data.Success) {
        setError(data.Message || "Gagal mengirim OTP.");
        setMethod(null);
      } else {
        setSent(true);
      }
    } catch {
      setError("Tidak dapat mengirim OTP.");
      setMethod(null);
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp() {
    if (!otpCode.trim()) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, companycode, code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Kode OTP tidak valid.");
      } else {
        onVerified(data.mfaToken);
      }
    } catch {
      setError("Tidak dapat memverifikasi OTP.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto text-gray-900 dark:text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Verifikasi Dua Langkah</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Pilih metode untuk menerima kode OTP.</p>
      </div>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-500/30 rounded-md">
          {error}
        </div>
      )}

      {!sent ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => sendOtp("email")}
            disabled={sending}
            className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold text-sm rounded-xl disabled:opacity-70"
          >
            {sending && method === "email" ? "Mengirim..." : "Kirim ke Email"}
          </button>
          <button
            type="button"
            onClick={() => sendOtp("sms")}
            disabled={sending}
            className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold text-sm rounded-xl disabled:opacity-70"
          >
            {sending && method === "sms" ? "Mengirim..." : "Kirim ke SMS"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-green-600 dark:text-green-400">
            Kode OTP telah dikirim via {method === "email" ? "Email" : "SMS"}.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kode OTP</label>
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Masukkan kode OTP"
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-50/50 dark:bg-[#0f172a]/50 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <button
            type="button"
            onClick={verifyOtp}
            disabled={verifying || otpCode.length < 4}
            className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold text-sm rounded-xl disabled:opacity-70"
          >
            {verifying ? "Memverifikasi..." : "Verifikasi & Masuk"}
          </button>
          <button
            type="button"
            onClick={() => { setSent(false); setMethod(null); setOtpCode(""); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Ganti metode
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="w-full mt-6 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        Kembali ke halaman login
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
npx tsc --noEmit
```
Expected: no errors referencing `MfaOtpStep.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/MfaOtpStep.tsx
git commit -m "feat(auth): add MfaOtpStep component for OTP method selection and verification"
```

---

## Task 5: Next.js — Wire MfaOtpStep into SignInForm

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\components\auth\SignInForm.tsx`

**Context:** `SignInForm.tsx` already has company auto-lookup (`GetUserCompanies`), a full-page loading overlay, and a session-expired relogin dialog — none of that changes. We add: a `phase` state (`"login" | "mfa"`), catch `MFA_REQUIRED` from `signIn()`, render `MfaOtpStep` when in that phase, and retry `signIn()` with the returned `mfaToken` when OTP verification succeeds.

- [ ] **Step 1: Add imports and state**

At the top of the file, add the import:

```typescript
import MfaOtpStep from "@/components/auth/MfaOtpStep";
```

Inside the component, alongside the other `useState` calls (after `const [isChecked, setIsChecked] = useState(false);`), add:

```typescript
const [phase, setPhase] = useState<"login" | "mfa">("login");
const [companycode, setCompanycode] = useState("");
```

- [ ] **Step 2: Capture `companycode` and handle `MFA_REQUIRED` in `handleSubmit`**

Replace the body of `handleSubmit` (the whole function) with:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError("");

  try {
    const res = await fetch(
      `${API_BASE}/api/Company/GetUserCompanies?username=${encodeURIComponent(username.trim().toLowerCase())}`
    );
    const companies: { company_code: string }[] = res.ok ? await res.json() : [];
    const resolvedCompanycode = companies.length > 0 ? companies[0].company_code : "";
    setCompanycode(resolvedCompanycode);

    await doSignIn(resolvedCompanycode);
  } catch {
    setError("Terjadi kesalahan. Silakan coba lagi.");
    setIsLoading(false);
  }
};

async function doSignIn(cc: string, mfaToken?: string) {
  const result = await signIn("credentials", {
    redirect: false,
    username: username.trim().toLowerCase(),
    password,
    companycode: cc,
    callbackUrl,
    ...(mfaToken ? { mfaToken } : {}),
  });

  if (result?.error) {
    if (result.error === "MFA_REQUIRED") {
      setPhase("mfa");
      setIsLoading(false);
      return;
    }
    const lowerError = result.error.toLowerCase();
    const isSystemError =
      lowerError.includes("network") ||
      lowerError.includes("timeout") ||
      lowerError.includes("fetch failed") ||
      lowerError.includes("econnrefused") ||
      lowerError.includes("kesalahan sistem");
    setError(isSystemError ? "Terjadi kesalahan sistem, silakan coba lagi." : "Akun tidak terdaftar");
    setIsLoading(false);
  } else if (result?.ok) {
    setShowFullPageLoading(true);
    router.push(callbackUrl);
  } else {
    setError("Terjadi kesalahan. Silakan coba lagi.");
    setIsLoading(false);
  }
}

async function handleMfaVerified(mfaToken: string) {
  setIsLoading(true);
  setError("");
  try {
    await doSignIn(companycode, mfaToken);
  } catch {
    setError("Terjadi kesalahan. Silakan coba lagi.");
    setIsLoading(false);
  }
}
```

This removes the old inline `signIn(...)` call from `handleSubmit` (now delegated to `doSignIn`) — same behavior for the non-MFA path, plus the new `MFA_REQUIRED` branch.

- [ ] **Step 3: Render `MfaOtpStep` when `phase === "mfa"`**

Immediately after the `return (` that starts the component's JSX (before the `<>` fragment wrapping the full-page loading overlay), add an early return:

```tsx
if (phase === "mfa") {
  return (
    <MfaOtpStep
      username={username.trim().toLowerCase()}
      companycode={companycode}
      onVerified={handleMfaVerified}
      onBack={() => setPhase("login")}
    />
  );
}

return (
  <>
    {/* ...existing JSX unchanged... */}
```

(The existing `return (\n    <>` becomes the second `return` shown above — everything after it, the full-page loading overlay through the closing `</>`, stays exactly as it is today.)

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
npx tsc --noEmit
```
Expected: no errors referencing `SignInForm.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/SignInForm.tsx
git commit -m "feat(login): switch to MfaOtpStep when authorize() reports MFA_REQUIRED"
```

---

## Task 6: Manual Testing Checklist

Requires both backends running (`sistropigroup`'s IIS Express/API and `npm run dev` in `SISTROV2-next`), and at least one real Identik-registered test account plus one ordinary non-Identik account. Cannot be automated — depends on the live external Identik provider (`identik-api.pupuk-indonesia.com`).

- [ ] **Scenario A: Non-Identik user (most accounts)**
  1. Log in with a normal local/transport account.
  2. Should log straight in — no OTP step, no perceptible extra delay (confirms the Task 1 Step 2 gate is working; check backend logs / response time to be sure the external Identik API was never called).

- [ ] **Scenario B: Identik user, MFA required**
  1. Log in with an Identik-flagged account (`IsIdentik = true` in `AspNetUsers`) with 2FA not remembered on this device.
  2. Form should switch to `MfaOtpStep`.
  3. Choose Email or SMS → OTP arrives → enter code → "Verifikasi & Masuk" → lands on dashboard.

- [ ] **Scenario C: Wrong OTP code**
  1. Same as B, but enter an incorrect code.
  2. Error message shown ("Kode OTP tidak valid." or the message the provider returned); can retry without reloading the page.

- [ ] **Scenario D: MFA globally disabled**
  1. Temporarily set `Web.config`'s `<add key="Mfa" value="false" />`, restart the backend.
  2. Every login — Identik or not — should skip the OTP step entirely (`Login`'s `else` branch already returns `IsMfaRequired: false` unconditionally). Revert the config change afterward.

- [ ] **Scenario E: Identik provider unreachable**
  1. Temporarily point `MfaBaseUrl` in `Web.config` at an unreachable host, restart the backend.
  2. Log in with an Identik account — `authorize()`'s catch block should swallow the fetch failure and fall through to normal login (per Task 3 Step 3's fail-open comment) rather than blocking the user. Revert the config change afterward.

---

## Catatan Keamanan (carried over + updated from the 2026-05-15 draft)

- `mfaToken` is signed with `NEXTAUTH_SECRET` (HMAC-SHA256, timing-safe compare) — cannot be forged without the server secret, and expires after 5 minutes.
- `[AllowAnonymous]` on `login`/`sendotpmethod`/`verifyotp` is safe because none of them grant access to any resource — they only relay to/from the external MFA provider using server-held credentials (`MfaAppId`/`MfaApiKey`), and `verifyotp`'s success still requires a live `/Token` call afterward to actually get a session.
- **Known limitation, not fixed by this plan:** `sendotpmethod`/`verifyotp`'s "strip everything before the first underscore" username handling (pre-existing ASP.NET behavior, unchanged here) would mangle a bare username that legitimately contains an underscore. In practice Identik users are NIK-based (numeric), so this hasn't been an issue — but it's the same footgun already called out in `SISTROV2-next/src/app/api/auth/relogin/route.ts`'s comments for a different endpoint. Worth a real fix (e.g. an unambiguous separator) if Identik ever onboards a username format with underscores.
- **Known limitation, not fixed by this plan:** the new `IsIdentik` gate in `MfaController.Login` (Task 1 Step 2) looks up `AspNetUsers` by `username1` alone, with no company-code disambiguation and no Transport-table cross-check — the same simplification `Login` already made before this plan touched it. This mirrors production behavior closely enough for the common case (one `username1` per person in practice), but isn't a byte-for-byte match of `AccountController`'s fuller check (which also forces Transport users non-Identik explicitly). Flag for hardening if a person ever holds both an Identik-flagged row and a Transport row under the same bare username.

---

## Self-Review

**Spec coverage:** User asked whether SISTRO Next's "user settings" use MFA like sistrogroup, after studying sistrogroup's MFA code. Covered: MFA gap identified, root cause of why (never executed), sistrogroup's actual per-user gating mechanism studied and a bug in it found and fixed, and a full parity implementation planned reusing the existing `/aspnet-proxy` pattern instead of the heavier 4-proxy-route design from the stale 2026-05-15 draft.

**Placeholder scan:** No TBD/TODO markers; every step has complete, runnable code.

**Type consistency:** `verifyMfaToken`/`signMfaToken` signatures match between Task 2 (definition) and Task 3 (import + call). `MfaOtpStep` props (`username`, `companycode`, `onVerified`, `onBack`) match how Task 5 invokes it. `doSignIn(cc, mfaToken?)` signature matches both call sites (`handleSubmit` and `handleMfaVerified`).
