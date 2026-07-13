# Fix Empty Dashboard Cards (UTC vs Local Date Bug) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Antri Gudang / Sedang Dimuat / Selesai Dimuat / Total Tonase" stat cards (and the matching cards on the Security and Jembatan Timbang dashboards) show real, current-day counts instead of `0`.

**Architecture:** All three dashboards (`GudangDashboard.tsx`, `SecurityDashboard.tsx`, `JBTDashboard.tsx`) read their card numbers from one shared source: the `useStaffAreaStream` hook → Next.js route `/api/stream/staffarea` → ASP.NET endpoint `GET /api/CompanyDashboard/GetStats`. That endpoint computes "today" with `DateTime.UtcNow.Date`, but every ticket timestamp in the system (`Tiket.tanggal`, `timesec`, `updatedon`) is written using local server time (WIB baseline — see `GeneralHelper.DateTimeNowSistro`, and the `DateTime.Now.Date` / `DateTime.Today` pattern used throughout `AntrianController.cs`, `HomeController.cs`, `GudangController.cs`). Because WIB is UTC+7, `DateTime.UtcNow.Date` lags the local calendar date by up to 7 hours every day, so the "today" window in `GetStats` frequently excludes tickets that were, in local time, created today. The fix is a one-file, two-line change: use `DateTime.Now` instead of `DateTime.UtcNow` for the date-boundary and overdue-threshold calculations inside `GetStats`, matching the convention every other controller in this codebase already follows.

**Tech Stack:** ASP.NET Framework 4.5 Web API (backend, `C:\Users\weka\Indigo\sistropigroup`), Entity Framework 6, MSTest (existing test project `ClassLibrary1\SISTRO.Tests.csproj`). No frontend changes needed — the Next.js side already just displays whatever `GetStats` returns.

**Scope note:** `CompanyDashboardController.cs` has the same `UtcNow` pattern in `GetRealisasiChart`, `GetKuotaProgress`, `GetPeriodRange`, `GetManagerStats`, and `GetPostoSummary`. Those feed the Manager report pages, not the three dashboards named in the request, so they are **out of scope** for this plan. Fix them separately if those pages show the same symptom.

---

### Task 1: Fix the UTC/local date mismatch in `GetStats`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\CompanyDashboardController.cs:51` and `:112`

- [ ] **Step 1: Confirm current file state matches expectations**

Open `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\CompanyDashboardController.cs` and confirm lines 50-53 read:

```csharp
                // Use UTC date for "today"
                DateTime today    = DateTime.UtcNow.Date;
                DateTime tomorrow = today.AddDays(1);
                DateTime sevenDaysAgo = today.AddDays(-7);
```

and line 112 reads:

```csharp
                DateTime twoHoursAgo = DateTime.UtcNow.AddHours(-2);
```

If either has already changed (e.g. someone else fixed it), stop and re-read the surrounding method before continuing — do not blindly apply the diff below.

- [ ] **Step 2: Replace `UtcNow` with `Now` in the "today" boundary**

Change:

```csharp
                // Use UTC date for "today"
                DateTime today    = DateTime.UtcNow.Date;
                DateTime tomorrow = today.AddDays(1);
                DateTime sevenDaysAgo = today.AddDays(-7);
```

to:

```csharp
                // Use server local date for "today" — Tiket.tanggal/timesec/updatedon
                // are all written with local (WIB-baseline) time via DateTimeNowSistro,
                // so filtering with UtcNow.Date silently drops up to 7 hours of "today"
                // each day (UTC lags WIB by 7h).
                DateTime today    = DateTime.Now.Date;
                DateTime tomorrow = today.AddDays(1);
                DateTime sevenDaysAgo = today.AddDays(-7);
```

- [ ] **Step 3: Replace `UtcNow` with `Now` in the overdue threshold**

Change:

```csharp
                DateTime twoHoursAgo = DateTime.UtcNow.AddHours(-2);
```

to:

```csharp
                DateTime twoHoursAgo = DateTime.Now.AddHours(-2);
```

- [ ] **Step 4: Build the backend to confirm no compile errors**

Run (from `C:\Users\weka\Indigo\sistropigroup`):

```powershell
msbuild SISTROAWESOME.sln /p:Configuration=Debug /t:Build
```

Expected: `Build succeeded. 0 Error(s)`. (If `msbuild` isn't on PATH, open the solution in Visual Studio and use Build > Build Solution instead.)

- [ ] **Step 5: Commit the backend fix**

```bash
cd "C:\Users\weka\Indigo\sistropigroup"
git add SISTROAWESOME/api/CompanyDashboardController.cs
git commit -m "fix: use local time instead of UTC for GetStats today/overdue windows"
```

---

### Task 2: Verify all three dashboards show real data end-to-end

**Files:** none (manual verification only — this endpoint has no existing controller-level test harness; the repo's test project (`ClassLibrary1`) only unit-tests pure static helpers with no DB dependency, e.g. `PostoTipeHelperTest.cs`. Adding a DB-mocking integration test for an EF `DbContext`-bound controller would be new test infrastructure this codebase doesn't use anywhere — out of scope for a 2-line date fix.)

- [ ] **Step 1: Start both projects**

```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```

Wait for both the IIS Express backend (port 8090) and the Next.js dev server to report ready.

- [ ] **Step 2: Confirm `GetStats` returns non-UTC-shifted counts**

With the dev servers running and logged in (any role that can reach these dashboards — Security, Gudang/StaffArea, or TI/SuperAdmin), open in a browser or via curl with a valid session cookie/token:

```
http://localhost:3000/api/stream/staffarea
```

Expected: JSON body where `generatedAt` is close to current wall-clock time, and `antriAktif` / `proses` / `selesai` / `totalTonase` reflect today's actual ticket activity (compare against the ticket list table on any of the three dashboards — e.g. count of position `"02"` rows visible in the Gudang "Menunggu Dimuat" tab should be `>= antriAktif` is no longer a mismatch of "table has rows, card says 0").

- [ ] **Step 3: Visually check each dashboard**

Log in with a user whose role resolves to each dashboard and confirm the 4 (Gudang) / 3 (Security) / equivalent (JBT) stat cards at the top show numbers consistent with the ticket table below them, not `0` when trucks are clearly present in that state:

- Gudang dashboard (`/dashboard` as a Gudang-role user, or wherever `GudangDashboard` renders): "Antri Gudang", "Sedang Dimuat", "Selesai Dimuat", "Total Tonase"
- Security dashboard: "Antrian Gerbang", "Armada di Area", "Armada Keluar"
- JBT (Jembatan Timbang) dashboard: equivalent weighbridge cards

- [ ] **Step 4: Re-check near local midnight if possible, or reason about it**

The bug was specifically worst between 00:00–06:59 WIB (UTC date lagging behind local date). If you're testing outside that window, the fix still applies going forward — no additional action needed, just note in the PR/commit description that the original bug was time-of-day-dependent so a same-instant "before/after" comparison may not show a visible diff outside that window.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-06-fix-dashboard-cards-utc-date-bug.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
