# MFA Identik Password-Gate Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix SISTRO Next login so that `IsIdentik=true` users are authenticated against the external Identik API (their real password store), not the local ASP.NET Identity password hash — matching how the MVC app (`AccountController.LoginAjax`) already treats Identik as the sole source of truth for these users.

**Architecture:** The root cause is in `sistropigroup`'s OAuth token endpoint (`ApplicationOAuthProvider.GrantResourceOwnerCredentials`, backs `/Token`), not in the Next.js MFA code added earlier. `/Token` currently validates every user — Identik or not — against the local ASP.NET Identity password hash (`userManager.FindAsync`). For Identik users that hash is not the credential of record (confirmed: local and Identik passwords are two different secrets by design), so `/Token` rejects them with "username atau password salah." before the MFA logic in `SISTROV2-next/src/lib/auth.ts` ever runs. The fix: extract the already-verified-working Identik login call (currently inlined in `MfaController.Login`) into a reusable `MfaService.LoginAsync` helper, then make `GrantResourceOwnerCredentials` call it for Identik users instead of the local password check — issuing the OAuth ticket only once Identik confirms the login (immediately, or after `/Token` signals `MFA_REQUIRED` and the client completes the existing OTP flow). Once `/Token` itself can signal `MFA_REQUIRED`, the separate pre-check call SISTRO Next currently makes to `/api/mfa/login` before `/Token` becomes redundant and is removed.

**Tech Stack:** ASP.NET Web API / OWIN OAuth (C#), EF6, Next.js 16 App Router, NextAuth v4.

---

## Verified Findings (Pre-Plan)

**Q: Why does `/Token` reject a correctly-typed Identik password?**
> `ApplicationOAuthProvider.GrantResourceOwnerCredentials` ([ApplicationOAuthProvider.cs:70-76](file:///C:/Users/weka/Indigo/sistropigroup/SISTROAWESOME/Provider/ApplicationOAuthProvider.cs)) calls `userManager.FindAsync(username, context.Password)` for every user, which checks the password against the local `AspNetUsers` hash. Confirmed via `ApplicationOAuthProvider.cs:74`: `context.SetError("invalid_grant", "username atau password salah.")` fires specifically when this local check fails — and confirmed via audit log (`sistro_logs.AuditLog`, `LOGIN_FAILED` / `"username atau password salah."`) that this is exactly what's happening for user `91010257`, an Identik user testing with their real Identik password. User confirmed local and Identik passwords are two different credentials by design.

**Q: Does MVC have the same bug?**
> No — `AccountController.LoginAjax` ([AccountController.cs:1051-1123](file:///C:/Users/weka/Indigo/sistropigroup/SISTROAWESOME/Controllers/AccountController.cs)) never checks the local password hash for `isIdentikUser==true`. It sends the submitted password straight to `_mfaService.LoginMfaAsync` (Identik) and only calls `SignInManager.SignInAsync` once Identik confirms success. Local password validation is skipped entirely for these users.

**Q: Can we reuse `MfaService.LoginMfaAsync` (the method MVC already calls)?**
> No. It's a stale/legacy path: it POSTs to `{MfaBaseUrl}/login` (no `/auth` segment) and deserializes the raw response directly into `LoginResponse` — a class with no `[JsonProperty]` attributes and no field that matches Identik's real nested `data.two_factor_id` shape. `IsMfaRequired` on that class can never be populated from a real Identik response. The endpoint that's actually been validated against the real Identik API this session is the one inlined in `MfaController.Login` ([MfaController.cs:87-115](file:///C:/Users/weka/Indigo/sistropigroup/SISTROAWESOME/api/MfaController.cs)): POSTs to `{MfaBaseUrl}/auth/login` and deserializes into `SISTROAWESOME.Models.MfaResponse`/`Data` ([MfaModels.cs:28-51](file:///C:/Users/weka/Indigo/sistropigroup/SISTROAWESOME/Models/Mfa/MfaModels.cs)), which has correct `[JsonProperty("two_factor_id")]`/`[JsonProperty("auth_code")]` mappings. This plan extracts *that* logic into a new `MfaService.LoginAsync`, and leaves the legacy `LoginMfaAsync`/`LoginResponse` (MVC-only) untouched — not in scope, not proven broken in production, too risky to touch here.

**Q: Once `/Token` can reject with `MFA_REQUIRED`, does the Next.js side already handle it?**
> Yes, almost entirely already. `SISTROV2-next/src/lib/auth.ts`'s existing `/Token` failure path ([auth.ts:125-134](file:///C:/Users/weka/Indigo/SISTROV2-next/src/lib/auth.ts)) already parses `error_description` from a non-OK `/Token` response and throws it as `Error(errMsg)`. If the OAuth provider sets `context.SetError("mfa_required", "MFA_REQUIRED")`, this existing code throws `Error("MFA_REQUIRED")` automatically — which `SignInForm.tsx`'s existing `result.error === "MFA_REQUIRED"` check ([SignInForm.tsx:94](file:///C:/Users/weka/Indigo/SISTROV2-next/src/components/auth/SignInForm.tsx)) already handles, unchanged. Only two small edits are needed on the Next.js side: (1) remove the now-redundant separate `/api/mfa/login` pre-check block (it duplicates what `/Token` now does, and doubles the number of calls to the external Identik API per login), (2) don't audit-log `LOGIN_FAILED` when the caught error is exactly `"MFA_REQUIRED"` — that's not a failed login, it's progressing to the OTP step.

---

## File Map

### ASP.NET (`sistropigroup/SISTROAWESOME/`)
| File | Action | Purpose |
|------|--------|---------|
| `Helper/MfaService.cs` | **Modify** | Add `LoginAsync(username, password)` + `IdentikAuthResult` — the reusable, *correct* Identik login call (status-code-driven, matches `MfaController.Login`'s already-verified logic), including the `MfaId`/`MfaEmailId`/`MfaSmsId`/`MfaRemember` bookkeeping side effect. |
| `api/MfaController.cs` | **Modify** | Refactor `Login` to call `_mfaService.LoginAsync` instead of its own inline HTTP block — same behavior, single source of truth. |
| `Provider/ApplicationOAuthProvider.cs` | **Modify** | `GrantResourceOwnerCredentials`: for `IsIdentik==true` users, validate via `_mfaService.LoginAsync` instead of the local password hash; signal `MFA_REQUIRED` via `context.SetError` when Identik demands OTP. |

### Next.js (`SISTROV2-next/src/`)
| File | Action | Purpose |
|------|--------|---------|
| `lib/auth.ts` | **Modify** | Remove the now-redundant post-`/Token` `/api/mfa/login` pre-check block; skip audit-logging the `MFA_REQUIRED` throw as a failure. |

---

## Task 1: `MfaService.LoginAsync` — Reusable, Correct Identik Login Call

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Helper\MfaService.cs`

**Context:** This file already has `LoginMfaAsync`/`LoginMfaRequest`/`LoginResponse` (legacy, MVC-only — do not touch). We're adding a *new*, separate method and result type. Current top-of-file usings (lines 1-8):
```csharp
using Newtonsoft.Json;
using SISTROAWESOME.Models;
using System;
using System.Configuration;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Net;
```
`SISTROAWESOME.Models` (for `MfaResponse`) is already imported. `sistroEntities`/`AspNetUsers` (`SISTROAWESOME.BDO`), `System.Linq` (for `FirstOrDefault`), and `System.Data.Entity` (for `EntityState`) are not yet imported in this file.

- [ ] **Step 1: Add the missing usings**

At the top of `MfaService.cs`, change:
```csharp
using Newtonsoft.Json;
using SISTROAWESOME.Models;
using System;
using System.Configuration;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Net;
```
to:
```csharp
using Newtonsoft.Json;
using SISTROAWESOME.Models;
using System;
using System.Configuration;
using System.Data.Entity;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Net;
using SISTROAWESOME.BDO;
```

- [ ] **Step 2: Add `IdentikAuthResult` and `LoginAsync`**

Immediately after the closing brace of `LoginMfaAsync` (after `MfaService.cs:39`, i.e. right before the blank line that precedes `public async Task<MfaResponse> VerifyMfaAsync(...)`), insert:

```csharp
        public async Task<IdentikAuthResult> LoginAsync(string username, string password)
        {
            var loginData = new { username, password };
            var endPointLogin = $"{_mfaBaseUrl}/auth/login";
            var jsonPayload = JsonConvert.SerializeObject(loginData);
            var content = new StringContent(jsonPayload, System.Text.Encoding.UTF8, "application/json");

            HttpResponseMessage response = await _httpClient.PostAsync(endPointLogin, content);
            var responseContent = await response.Content.ReadAsStringAsync();
            var resp = JsonConvert.DeserializeObject<MfaResponse>(responseContent);

            var result = new IdentikAuthResult();

            if (response.StatusCode == HttpStatusCode.OK)
            {
                if (resp?.Data != null)
                {
                    if (!string.IsNullOrEmpty(resp.Data.TwoFactorId))
                    {
                        using (var ctx = new sistroEntities())
                        {
                            var user = ctx.AspNetUsers.FirstOrDefault(x => x.username1 == username);
                            if (user != null)
                            {
                                user.MfaId = resp.Data.TwoFactorId;
                                resp.Data.MfaMethods?.ForEach(m =>
                                {
                                    if (!string.IsNullOrEmpty(m.Email)) user.MfaEmailId = m.Id;
                                    if (!string.IsNullOrEmpty(m.MobilePhone)) user.MfaSmsId = m.Id;
                                });
                                user.MfaRemember = false; // Reset status remember device
                                ctx.Entry(user).State = EntityState.Modified;
                                await ctx.SaveChangesAsync();
                            }
                        }
                        result.Success = true;
                        result.IsMfaRequired = true;
                        result.Message = resp.Message ?? "MFA Required";
                    }
                    else if (!string.IsNullOrEmpty(resp.Data.Token) || !string.IsNullOrEmpty(resp.Data.Auth_Code))
                    {
                        using (var ctx = new sistroEntities())
                        {
                            var user = ctx.AspNetUsers.FirstOrDefault(x => x.username1 == username);
                            if (user != null)
                            {
                                user.MfaRemember = !string.IsNullOrEmpty(resp.Data.Auth_Code);
                                await ctx.SaveChangesAsync();
                            }
                        }
                        result.Success = true;
                        result.IsMfaRequired = false;
                    }
                    else
                    {
                        result.Success = false;
                        result.Message = resp.Message ?? "Respons login tidak dikenali.";
                    }
                }
                else
                {
                    result.Success = false;
                    result.Message = resp?.Message ?? "API Error: Respons sukses (200) tetapi data payload tidak ditemukan.";
                }
            }
            else if (response.StatusCode == HttpStatusCode.NonAuthoritativeInformation || resp?.Status == 203)
            {
                result.Success = false;
                result.Message = resp?.Message ?? "Wajib Ganti Password.";
                result.RedirectUrl = resp?.Data?.Url;
            }
            else
            {
                result.Success = false;
                result.Message = resp?.Message ?? "Username atau Password salah.";
            }

            return result;
        }

```

- [ ] **Step 3: Add the `IdentikAuthResult` class**

Directly below the closing brace of `LoginResponseData` (after `MfaService.cs:83`, right before `public class MfaVerifyRequest`), insert:

```csharp
    public class IdentikAuthResult
    {
        public bool Success { get; set; }
        public bool IsMfaRequired { get; set; }
        public string Message { get; set; }
        public string RedirectUrl { get; set; } // Set when Identik demands a mandatory password change (203)
    }

```

- [ ] **Step 4: Build to confirm it compiles**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)`. (Warnings are pre-existing/unrelated — ignore.)

- [ ] **Step 5: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/Helper/MfaService.cs
git commit -m "feat(mfa): add MfaService.LoginAsync, the correct/reusable Identik login call"
```

---

## Task 2: Refactor `MfaController.Login` to Use the Shared Helper

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\MfaController.cs`

**Context:** `MfaController.Login`'s inline HTTP block (the one Task 1's `LoginAsync` was extracted from) still works correctly today — this step points it at the shared method instead, so there's only one implementation of "call Identik and interpret the response" instead of two that can drift apart. Current method body (`MfaController.cs`, inside the `if (isMfa)` block starting after the `IsIdentik` gate) builds `loginData`, calls Identik inline, and branches on `response.StatusCode`/`resp.Data`.

- [ ] **Step 1: Replace the inline Identik call with `_mfaService.LoginAsync`**

Replace the whole block from `var loginData = new { ... };` (right after the `IsIdentik` gate's closing `}`, before `return Ok(result);`) through the end of the `using (HttpClient client = ...)` block with:

```csharp
                    var mfaResult = await _mfaService.LoginAsync(request.Username, request.Password);
                    result.Success = mfaResult.Success;
                    result.Message = mfaResult.Message;
                    result.IsMfaRequired = mfaResult.IsMfaRequired;
                    result.url = mfaResult.RedirectUrl;
```

The full `Login` method (from the `if (isMfa)` block onward) should now read:

```csharp
                if (isMfa)
                {
                    var mfaResult = await _mfaService.LoginAsync(request.Username, request.Password);
                    result.Success = mfaResult.Success;
                    result.Message = mfaResult.Message;
                    result.IsMfaRequired = mfaResult.IsMfaRequired;
                    result.url = mfaResult.RedirectUrl;
                }
                else
                {
                    // isMfa = false. Lanjut ke login existing (non-Identik)
                    result.Success = true;
                    result.Message = "";
                    result.IsMfaRequired = false;
                }

                return Ok(result); // Atau kembalikan objek result jika di AccountController
```

Everything above this in `Login` (the `useMfa`/`isMfa` read, the `IsIdentik` early-return gate, the commented-out `baseDeviceId` block) stays exactly as-is. The `try`/`catch(Exception ex)` wrapping the whole method also stays as-is.

- [ ] **Step 2: Build**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)`.

- [ ] **Step 3: Restart IIS Express and manually re-verify `/api/mfa/login` still behaves the same**

```bash
taskkill //F //IM iisexpress.exe
"C:\Program Files\IIS Express\iisexpress.exe" /path:"C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME" /port:8090 &
```
Then:
```bash
curl -s -X POST http://localhost:8090/api/mfa/login -H "Content-Type: application/json" -d "{\"Username\":\"91010257\",\"Password\":\"wrongpass\"}"
```
Expected: same shape as before the refactor — `{"Success":false,"Message":"Invalid Credentials","IsMfaRequired":false,...}` (or equivalent rejection message from Identik). If this now errors or returns something structurally different, the refactor introduced a regression — stop and fix before continuing to Task 3.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/MfaController.cs
git commit -m "refactor(mfa): MfaController.Login delegates to MfaService.LoginAsync"
```

---

## Task 3: Fix `/Token` — the Actual Bug

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Provider\ApplicationOAuthProvider.cs`

**Context:** This is the fix that resolves "tidak bisa login menggunakan identik". `GrantResourceOwnerCredentials` currently (lines 31-100) resolves `users`/`username` via the existing company-code lookup (unchanged, lines 36-70), then unconditionally does `ApplicationUser user = await userManager.FindAsync(username, context.Password);` (line 71) — the local password check that Identik users can never pass. We branch that one line into two paths.

- [ ] **Step 1: Add an `MfaService` field**

Change:
```csharp
    public class ApplicationOAuthProvider : OAuthAuthorizationServerProvider
    {
        private readonly string _publicClientId;
        protected sistroEntities db = new sistroEntities();
```
to:
```csharp
    public class ApplicationOAuthProvider : OAuthAuthorizationServerProvider
    {
        private readonly string _publicClientId;
        protected sistroEntities db = new sistroEntities();
        private readonly MfaService _mfaService = new MfaService();
```
(`SISTROAWESOME.Helper` — where `MfaService` lives — is already imported at the top of this file via `using SISTROAWESOME.Helper;`, `ApplicationOAuthProvider.cs:12`. No new `using` needed.)

- [ ] **Step 2: Branch the password check on `IsIdentik`**

Replace:
```csharp
            String username = users == null ? context.UserName : users.UserName;
            ApplicationUser user = await userManager.FindAsync(username, context.Password);
            if (user == null)
            {
                context.SetError("invalid_grant", "username atau password salah.");
                return;
            }
```
with:
```csharp
            String username = users == null ? context.UserName : users.UserName;
            bool isIdentikUser = users != null && users.IsIdentik.HasValue && users.IsIdentik.Value;

            ApplicationUser user;
            if (isIdentikUser)
            {
                // Identik is the credential source of truth for these users — the local
                // ASP.NET Identity password hash is a different, unrelated secret and must
                // not gate login here (matches AccountController.LoginAjax's MVC behavior).
                var mfaResult = await _mfaService.LoginAsync(context.UserName, context.Password);
                if (!mfaResult.Success)
                {
                    context.SetError("invalid_grant", mfaResult.Message ?? "username atau password salah.");
                    return;
                }
                if (mfaResult.IsMfaRequired)
                {
                    context.SetError("mfa_required", "MFA_REQUIRED");
                    return;
                }
                user = await userManager.FindByNameAsync(username);
                if (user == null)
                {
                    context.SetError("invalid_grant", "username atau password salah.");
                    return;
                }
            }
            else
            {
                user = await userManager.FindAsync(username, context.Password);
                if (user == null)
                {
                    context.SetError("invalid_grant", "username atau password salah.");
                    return;
                }
            }
```

Everything below this (from `ClaimsIdentity oAuthIdentity = ...` onward, ticket issuance, session tracking) stays exactly as-is — it already just uses `user`/`username`, which are populated by either branch now.

- [ ] **Step 3: Build**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)`.

- [ ] **Step 4: Restart IIS Express and manually verify `/Token` for a non-Identik user still works**

```bash
taskkill //F //IM iisexpress.exe
"C:\Program Files\IIS Express\iisexpress.exe" /path:"C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME" /port:8090 &
```
Then, with a known non-Identik test account's real credentials:
```bash
curl -s -X POST http://localhost:8090/Token -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=password&username=<non-identik-username>&password=<their-real-password>&companycode=<their-company-code>"
```
Expected: a normal OAuth success response with `access_token`. This path is untouched by this change (still goes through the `else` branch / local password check) — confirms no regression for the majority of users.

- [ ] **Step 5: Manually verify `/Token` for the Identik user (91010257) now returns `MFA_REQUIRED` or succeeds instead of "username atau password salah"**

```bash
curl -s -X POST http://localhost:8090/Token -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=password&username=91010257&password=<their-real-identik-password>&companycode=PKG"
```
Expected: either a normal OAuth success (`access_token` present — Identik remembers this device) or an OAuth error body `{"error":"mfa_required","error_description":"MFA_REQUIRED"}`. Either is correct. **Not** expected: `{"error":"invalid_grant","error_description":"username atau password salah."}` — if that still appears with the *correct* Identik password, stop and re-check `users.IsIdentik` is actually `true` for this row (`SELECT IsIdentik FROM AspNetUsers WHERE username1='91010257'`) before going further.

- [ ] **Step 6: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/Provider/ApplicationOAuthProvider.cs
git commit -m "fix(auth): validate Identik users against Identik at /Token, not the local password hash"
```

---

## Task 4: Simplify Next.js `authorize()` — Remove the Now-Redundant Pre-Check

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\lib\auth.ts`

**Context:** Once Task 3 ships, `/Token` itself throws `Error("MFA_REQUIRED")` through the *existing* `/Token` failure-handling code (`auth.ts:125-134`, unchanged) whenever OTP is needed — no code change required for that part, it already works generically for any `error_description`. The separate `/api/mfa/login` block added after `/Token` (`auth.ts:148-183`) is now dead weight: for Identik users it duplicates a call `/Token` already just made (double the round-trips to the external Identik API per login), and for non-Identik users it's a wasted extra request that always returns `IsMfaRequired:false`. Delete it.

- [ ] **Step 1: Remove the redundant MFA pre-check block**

Delete this entire block (currently `auth.ts:148-183`, right after the `/Token` try/catch and right before `const roles: string[] = data.role`):

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
              if (mfaData.Success === false) {
                // Identik itself rejected this login (e.g. wrong password on its side,
                // account disabled) — surface its real message instead of letting the
                // already-successful /Token session through silently.
                const mfaErr: any = new Error(mfaData.Message || "Verifikasi MFA gagal.");
                mfaErr.isMfaFailure = true;
                throw mfaErr;
              }
            } else {
              console.error(`[auth] /api/mfa/login returned ${mfaRes.status} — failing open to normal login`);
            }
          } catch (err: any) {
            if (err.message === "MFA_REQUIRED" || err.isMfaFailure) throw err;
            // MFA provider unreachable/erroring — fail open to normal login rather than
            // locking every user out because a third-party service is down. Logged so an
            // outage or a bug in this check is visible instead of silently bypassing MFA.
            console.error("[auth] MFA check failed, failing open:", err);
          }
        }

```

After deletion, `authorize()` goes directly from the `/Token` try/catch (ending `auth.ts:146` — the closing `}` of the outer `catch (err: any) { ... }`) to `const roles: string[] = data.role`.

- [ ] **Step 2: Remove the now-unused `mfaToken` credential field and `verifyMfaToken` import**

Change:
```typescript
      credentials: {
        username:    { label: "Username", type: "text" },
        password:    { label: "Password", type: "password" },
        companycode: { label: "Company Code", type: "text" },
        mfaToken:    { label: "MFA Token", type: "text" },
      },
```
to:
```typescript
      credentials: {
        username:    { label: "Username", type: "text" },
        password:    { label: "Password", type: "password" },
        companycode: { label: "Company Code", type: "text" },
      },
```

Change:
```typescript
import { logEvent } from "@/lib/audit-logger";
import { resolveCompanyMenuTemplate } from "@/lib/company-menu";
import { verifyMfaToken } from "@/app/api/auth/mfa-verify/route";
```
to:
```typescript
import { logEvent } from "@/lib/audit-logger";
import { resolveCompanyMenuTemplate } from "@/lib/company-menu";
```

Note: `SignInForm.tsx`/`MfaOtpStep.tsx` still send `mfaToken` on the retry-after-OTP `signIn()` call, and `/api/auth/mfa-verify/route.ts` still signs and returns one. That's harmless — NextAuth silently ignores credential fields `authorize()` doesn't read — but it is now dead code. Leaving it in place is a deliberate, lower-risk choice for this plan (the retry-after-OTP path will work anyway: Task 3's `/Token` fix naturally succeeds on retry because Identik remembers the device from the OTP verification moments earlier). Removing the dead signing/verification code end-to-end is a follow-up cleanup, not required for the fix.

- [ ] **Step 3: Don't audit-log the `MFA_REQUIRED` throw as a failed login**

Change:
```typescript
        } catch (err: any) {
          if (err.message && !err.message.startsWith("Login gagal") && !(err.message.includes("error_description"))) {
            await logEvent({
              eventType: "LOGIN_FAILED",
              username:  credentials.username,
              metadata:  { reason: err.message },
            });
          }
          throw new Error(err?.message || "Tidak dapat terhubung ke server");
        }
```
to:
```typescript
        } catch (err: any) {
          if (
            err.message &&
            err.message !== "MFA_REQUIRED" &&
            !err.message.startsWith("Login gagal") &&
            !(err.message.includes("error_description"))
          ) {
            await logEvent({
              eventType: "LOGIN_FAILED",
              username:  credentials.username,
              metadata:  { reason: err.message },
            });
          }
          throw new Error(err?.message || "Tidak dapat terhubung ke server");
        }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
npx tsc --noEmit
```
Expected: no errors referencing `auth.ts`. (If `verifyMfaToken`'s export in `mfa-verify/route.ts` is now unused elsewhere too, that's fine — Next.js route files are allowed to export helpers nothing else imports.)

- [ ] **Step 5: Commit**

```bash
cd C:\Users\weka\Indigo\SISTROV2-next
git add src/lib/auth.ts
git commit -m "fix(auth): remove redundant MFA pre-check now that /Token itself signals MFA_REQUIRED"
```

---

## Task 5: End-to-End Manual Verification

Requires local backend rebuilt+restarted with all of Task 1-3 (`npm run dev:local` on the frontend side, pointing at `localhost:8090`), and both a real Identik test account (`91010257`) and a real non-Identik account.

- [ ] **Scenario A: Non-Identik user**
  1. Log in with a normal local/transport account, real password.
  2. Should log straight in, no OTP step. (Task 3's `else` branch — local password check, unchanged.)

- [ ] **Scenario B: Identik user, real Identik password, device not remembered**
  1. Log in with `91010257` + their real Identik password.
  2. If Identik doesn't already remember this device: form switches to `MfaOtpStep`, shows "Kirim ke Email" / "Kirim ke WhatsApp".
  3. Pick a method, receive code, enter it, submit.
  4. Should land on dashboard.

- [ ] **Scenario C: Identik user, device already remembered**
  1. Log in again with `91010257` immediately after Scenario B.
  2. Should log straight in, no OTP step (Identik's remember-device, same as MVC's behavior) — this is correct, not a bug.

- [ ] **Scenario D: Identik user, wrong Identik password**
  1. Log in with `91010257` + a deliberately wrong password.
  2. Should show an error (Identik's real rejection message, surfaced via `result.error` per the earlier `SignInForm.tsx` fix) — not a generic "Akun tidak terdaftar", and not a silent pass-through.

- [ ] **Scenario E: Non-Identik user, wrong password**
  1. Log in with a normal account + wrong password.
  2. Should show "username atau password salah." (unchanged — this still goes through `/Token`'s local-password `else` branch).

---

## Catatan Keamanan / Known Limitations (carried over, still true after this plan)

- `device_id` sent to Identik on login/verify is still `username + "_SISTRO"` (constant, not truly per-browser/device) — "remember device" is effectively global per user, not per physical device. Out of scope for this plan; flagged previously, not changed here per explicit instruction not to re-touch it without being asked.
- Legacy `MfaService.LoginMfaAsync`/`LoginResponse` (MVC-only path) is left untouched. If MVC's own Identik OTP prompt is ever reported as not appearing, that's a separate, pre-existing issue in that stale model — not introduced or fixed by this plan.

---

## Self-Review

**Spec coverage:** User confirmed local and Identik passwords are separate credentials by design, and Identik must be the sole validator for `IsIdentik=true` users, matching MVC. Covered: root cause found in `ApplicationOAuthProvider` (not the Next.js MFA code from the earlier plan), a correct/reusable Identik-login helper extracted from already-verified-working code, `/Token` fixed to use it for Identik users, redundant Next.js pre-check removed, and a full manual test matrix covering both user types and both password-correctness cases.

**Placeholder scan:** No TBD/TODO; every step has complete code, matching current file line numbers/content as read this session.

**Type consistency:** `IdentikAuthResult` (defined Task 1 Step 3) fields (`Success`, `IsMfaRequired`, `Message`, `RedirectUrl`) match exactly how Task 2 Step 1 (`MfaController.Login`) and Task 3 Step 2 (`ApplicationOAuthProvider`) consume it. `MfaService.LoginAsync(string username, string password)` signature matches both call sites.
