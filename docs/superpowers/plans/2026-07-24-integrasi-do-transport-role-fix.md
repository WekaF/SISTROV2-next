# Integrasi Tiket DO — Allow Transport Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users with the `Transport` role (ekspeditur/forwarder accounts) successfully use the "Integrasi Tiket SISTRO & DO" scan flow, which currently rejects them outright regardless of ticket state.

**Architecture:** The scan flow (`/scan/integrasi` in SISTROV2-next) calls three ASP.NET Web API endpoints on `GudangLini3Controller` in sequence: `DetailDataVerifikasi` (validate ticket), `DetailDataVerifikasiDo` (validate DO barcode), `Verifikasi` (write `donumber` onto the ticket). Only the first of the three has a role whitelist, and it omits `Transport` — so any ekspeditur account is blocked at step 1, before the code ever looks at `donumber`. The fix is a one-line whitelist addition in the backend controller.

**Tech Stack:** ASP.NET Framework 4.5 Web API (C#), EF6, backend repo `C:\Users\weka\Indigo\sistropigroup`.

---

## Root Cause (confirmed)

Bug report: ekspeditur test account `SISTRO_DEV` (role `Transport`, id `f2d0576a-d467-4cbd-ba70-cb7dbada0b9f` in `SISTROSTAGING`) hits "CEK" on a booking number in the Integrasi Tiket DO screen and always gets rejected, even for tickets confirmed to have `donumber IS NULL`. The frontend shows a generic toast ("Data tidak valid atau sudah terintegrasi") but the actual HTTP response body is `"Anda tidak diperkenankan menscan tiket"`.

That exact string is returned by `GudangLini3Controller.DetailDataVerifikasi` at `sistropigroup/SISTROAWESOME/api/GudangLini3Controller.cs:265-274`:

```csharp
if (User.IsInRole("Gudang") || User.IsInRole("Security") || User.IsInRole("Timbangan") || User.IsInRole("TI"))
{
    dataMentah = db.Tiket.Where(x => (x.bookingno == barcode || x.tiketno == barcode));
}
else
{
    dataMentah = null;
    return Content(HttpStatusCode.BadRequest, "Anda tidak diperkenankan menscan tiket");
}
```

`Transport` is not in that list, so the check short-circuits before the query — `donumber` is never inspected, which is why the report of "padahal donumber null" is real but irrelevant to the actual failure. Confirmed via DB: `AspNetRoles` has no separate "Ekspeditur" role — `Transport` is the role that represents forwarder/ekspeditur accounts in this system.

The other two endpoints in the same wizard (`DetailDataVerifikasiDo` at line 373, `Verifikasi` at line 443) have **no role check at all**, so they already work for any authenticated user — confirming this whitelist on step 1 is the one gap, not a deliberate access-control boundary.

**Confirmed by user:** validation should allow `Transport`, in addition to the existing `Gudang`, `Security`, `Timbangan` (and `TI`, already present — left untouched since removing it wasn't requested).

**Scope note:** This endpoint does not filter by company/destination for any role (the `tujuan` filter is commented out at line 267, and `Verifikasi` has no scoping at all) — adding `Transport` does not introduce a new class of exposure beyond what already exists for the four other roles today. Tightening that scoping is a separate concern, out of scope for this fix.

---

## File Structure

- Modify: `sistropigroup/SISTROAWESOME/api/GudangLini3Controller.cs:265` — add `Transport` to the role whitelist in `DetailDataVerifikasi`.

No frontend changes needed — `SISTROV2-next/src/app/scan/integrasi/page.tsx` and the proxy route already call the right endpoints; they just need the backend to stop rejecting the `Transport` role.

---

### Task 1: Add `Transport` to the `DetailDataVerifikasi` role whitelist

**Files:**
- Modify: `sistropigroup/SISTROAWESOME/api/GudangLini3Controller.cs:265`

**Context on verification approach:** This controller has no unit test coverage (`ClassLibrary1` test project has no `GudangLini3Controller` tests), and `vstest.console.exe` test discovery is broken in this environment regardless (throws `Object reference not set to an instance of an object` for every MSTest class — a pre-existing environment issue, documented from prior debugging). The established project convention is: MSBuild build success (0 errors) as the compile-correctness signal, plus a manual run against the dev server as the behavioral check. This plan follows that convention rather than introducing a new test harness for one line of code.

- [ ] **Step 1: Edit the role check**

In `sistropigroup/SISTROAWESOME/api/GudangLini3Controller.cs`, change:

```csharp
                if (User.IsInRole("Gudang") || User.IsInRole("Security") || User.IsInRole("Timbangan") || User.IsInRole("TI"))
```

to:

```csharp
                if (User.IsInRole("Gudang") || User.IsInRole("Security") || User.IsInRole("Timbangan") || User.IsInRole("TI") || User.IsInRole("Transport"))
```

This is the only line that changes. The `else` branch (the rejection message and `dataMentah = null`) stays as-is — it still protects the endpoint from roles with no business reason to scan tickets.

- [ ] **Step 2: Build to confirm no compile errors**

Run (from a bash shell):

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```

Expected: `0 Error(s)` in the build summary.

- [ ] **Step 3: Manual verification against the dev server**

1. Start the backend + frontend (from `sistropigroup` root): `.\start-dev.ps1`
2. Log in as the `SISTRO_DEV` account (role `Transport`).
3. Navigate to `/scan/integrasi`.
4. Enter booking number `SISTRO_DEV_OTXCQRn2N` (confirmed in `SISTROSTAGING.Tiket` with `donumber IS NULL`) and click CEK.
5. Expected: ticket card shows "VALID" (`tipe: "success"`), no more "Anda tidak diperkenankan menscan tiket" — confirms the whitelist change took effect and the flow now reaches the `donumber` check instead of being rejected upfront.
6. (Optional, to confirm the full wizard) scan/enter a DO barcode and click "Integrasi Tiket" to confirm `Verifikasi` completes and sets `donumber` on the ticket.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && git add SISTROAWESOME/api/GudangLini3Controller.cs && git commit -m "fix(gudang-lini3): allow Transport role to scan tickets for DO integration"
```

---

## Self-Review

- **Spec coverage:** The one requirement — "let transport users integrate, same as gudang/security/timbangan" — is covered by Task 1's single-line change; `TI` (already present) is preserved, nothing removed.
- **Placeholder scan:** No TBD/TODO — the exact before/after code is given, exact build command, exact manual test data (real booking number pulled from `SISTROSTAGING`).
- **Type consistency:** N/A — single boolean-expression edit, no new identifiers introduced.
