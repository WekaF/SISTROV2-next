# Fix Tiket Action-Button Permissions (Ganti Shift / Delete) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix ticket action-button permissions (Edit / Ganti Shift / Hapus) so they consistently key off the ticket's real lifecycle stage (`statuspemuatan`) across every page that renders `TicketActions`, instead of the wrong/missing field they read today.

**Architecture:** Root cause is cross-repo. The ASP.NET backend (`sistropigroup`) already has the correct business rule baked into its legacy server-rendered buttons (`DataTablePeriodeTiket`'s `Action` HTML column): Edit/Reschedule only while `statuspemuatan == "booking"`, Delete blocked once `statuspemuatan == "release"`. But `DataTablePeriodeTiket` never puts the raw `position`/`statuspemuatan` fields into the JSON it returns to the Next.js frontend (`DataTableFilterLegacy` does, `DataTablePeriodeTiket` doesn't) — so every page built on that endpoint receives `undefined`, and either fails closed (buttons vanish for everyone, even eligible "booking" tickets) or, worse, gets defaulted to a hardcoded fallback that's always-permissive. Separately, the Next.js `TicketActions` component itself was gating on the wrong field: it compares a padded `position` code against `"00"`/`"01"`, but real backend position codes are `"00"` → `"01"` → `"02"`...→`"07"` (not `"00"`/`"01"` as two adjacent "pre-checkpoint" stages — `"01"` already means the ticket was scanned in at Security, i.e. **past** the checkpoint). The fix: (1) backend adds the two missing fields to `DataTablePeriodeTiket`'s projection, (2) frontend `TicketActions` is rewired to gate on `statuspemuatan` (`"booking"` / `"waiting"` / `"progress"` / `"release"`) exactly like the backend's own legacy rule, and (3) all three frontend call sites are updated to pass that field instead of the raw position code.

**Tech Stack:** ASP.NET Framework 4.5 (C#, Entity Framework 6) for the backend at `C:\Users\weka\Indigo\sistropigroup`; Next.js 16 / React / TypeScript for the frontend at `C:\Users\weka\Indigo\SISTROV2-next`.

---

## Root Cause (verified by reading the code directly, not guessed)

**Ticket lifecycle fields, confirmed in `sistropigroup\SISTROAWESOME\api\TiketController.cs` and `Helper\TiketHelper.cs`:**

- `Tiket.position` — a granular checkpoint code: `"00"` (booked, not yet scanned) → `"01"` (Security check-in, off to Timbangan) → `"02"`...`"06"` (weighing/loading steps) → `"07"` (Checkout Security Pass — driver has left) → `"08"` (arrived at Pelabuhan, port-bound tickets only) → separate `"21"`/`"22"` branch for the DW2_INBAG flow.
- `Tiket.statuspemuatan` — a coarser 4-value lifecycle: `"booking"` (ticket created, position `"00"`, i.e. "Siap Dicetak" — not yet checked in anywhere) → `"waiting"` / `"progress"` (somewhere inside the checkpoint flow) → `"release"` (fully done — checked out through Security, or an equivalent final state; set at `TiketController.cs:900`, `:1337`, `:1809`, `:6757`, `Helper/TiketHelper.cs:215`, etc.).

**Backend's own existing (legacy, server-rendered) permission rule**, `TiketController.cs` inside `DataTablePeriodeTiket` (~line 4290-4297):

```csharp
+ (isStaffArea && x.Posto1.updatedby == getUser() && x.position == "00" ? edit1 + "" + x.bookingno + edit2 : "")
+ (User.IsInRole("Transport") && x.position == "00" ? edit1 + "" + x.bookingno + edit2 : "")
+ ((isStaffArea || (myCompanyCode == "LOG4MENENG" && isCandalGudang)) && x.Posto1.updatedby == getUser() &&
   (new[] { "booking", "progress", "waiting" }).Contains(x.statuspemuatan, StringComparer.OrdinalIgnoreCase) ? delete1 + "" + x.bookingno + delete2 : "")
+ (isStaffArea &&
   (new[] { "booking" }).Contains(x.statuspemuatan, StringComparer.OrdinalIgnoreCase) ? reschedule1 + "" + x.bookingno + reschedule2 : "")
```

Translated: **Edit/Reschedule only while `statuspemuatan == "booking"`. Delete allowed for `booking`/`progress`/`waiting`, blocked once `"release"`.** This is the authoritative rule already proven correct in production — this plan just makes the Next.js frontend follow it consistently.

**What's broken today, confirmed by reading each file:**

1. `sistropigroup\SISTROAWESOME\api\TiketController.cs`, method `DataTablePeriodeTiket` (~line 4277-4298): the `TiketView` projection it builds for the JSON API response does **not** include `position` or `statuspemuatan` at all (only a human-readable `positionString` label). Compare to `DataTableFilterLegacy` (~line 3705-3706), which does select both. Every Next.js page built on `DataTablePeriodeTiket` therefore never receives the raw status the frontend needs to gate buttons.
2. `SISTROV2-next\src\components\ticket\TicketActions.tsx` (~line 63-83): gates `canEdit`/`canReschedule` on a padded `status` prop compared against `"00"`/`"01"`, and `canDelete` has **no status check at all**. Even where the backend does send the field (`DataTableFilterLegacy`-backed pages), `"01"` is the wrong value to treat as still-editable — it means the ticket already passed Security.
3. `SISTROV2-next\src\app\tiket\page.tsx` (~line 88-96): passes `status={t.position}` — always `undefined` today (see #1) — and never sets `showDelete`, so Delete never renders here regardless of status. This is the page at `/tiket?posto=...` from the bug report: "siap dicetak" (booking) tickets are missing their Edit/Ganti-Shift/Delete buttons entirely, because the missing `position` field makes every row look ineligible.
4. `SISTROV2-next\src\app\admin\tickets\page.tsx` (~line 32-40): passes `status={row.position || row.status}` and `showDelete={true}` — but since `TicketActions.canDelete` has no status gating (#2), Delete shows for **every** ticket including ones already `"release"` (checked out by Security / finished). This is the second bug report.
5. `SISTROV2-next\src\components\ticket\TicketBookingDetail.tsx` (~line 459-465): passes `status={row.position || "00"}` — the `|| "00"` fallback means every row on this page (which also uses the broken `DataTablePeriodeTiket` endpoint, so `row.position` is always `undefined`) is treated as **freshly booked**, so Edit/Reschedule show for every ticket regardless of real status. This is the most likely source of "masih bisa ubah shift padahal tiket sudah masuk checkpoint."

All three frontend call sites also pass a `postoGuid` prop that `TicketActions` declares in its TypeScript interface but never actually reads (the component destructures `posto`, not `postoGuid`) — so the Delete permission's SO-posto check for Transport users (`isTransport && isSOPosto`) has silently never worked outside `admin/tickets/page.tsx` (the one file that happens to pass `posto` correctly already). Fixed as part of touching those exact lines below.

---

## File Map

| File | Repo | Change |
|---|---|---|
| `SISTROAWESOME\api\TiketController.cs` | `sistropigroup` | Task 1: add `position`/`statuspemuatan` to `DataTablePeriodeTiket`'s JSON projection |
| `src\components\ticket\TicketActions.tsx` | `SISTROV2-next` | Task 2: gate Edit/Reschedule/Delete on `statuspemuatan`, not raw `position` |
| `src\app\tiket\page.tsx` | `SISTROV2-next` | Task 3: pass `statuspemuatan`, fix `posto` prop name, enable `showDelete` |
| `src\app\admin\tickets\page.tsx` | `SISTROV2-next` | Task 4: pass `statuspemuatan` instead of `position` |
| `src\components\ticket\TicketBookingDetail.tsx` | `SISTROV2-next` | Task 5: pass `statuspemuatan`, drop the always-permissive `|| "00"` fallback, fix `posto` prop name |

---

## Task 1: Backend — return `position`/`statuspemuatan` from `DataTablePeriodeTiket`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` (method `DataTablePeriodeTiket`, ~line 4179-4321)

### Context

`sistropigroup` is currently checked out on branch `pengajuan-armada-copy-up-to-prod` with substantial **unrelated** uncommitted changes (`git status` shows modified `Global.asax.cs`, `Helper/RabbitMQHelper.cs`, `Web.config`, `api/BookingQueueController.cs`, `api/HomeController.cs`, `packages.config`, plus several `.claude/worktrees/*` entries and untracked plan files — none of this is from this task). **Do not commit onto that branch or touch those files.** Start from a clean isolated workspace on `origin/main` instead.

- [ ] **Step 1: Set up an isolated workspace for this fix**

Use the `superpowers:using-git-worktrees` skill (or your platform's native worktree tool) to create an isolated workspace for `C:\Users\weka\Indigo\sistropigroup` on a **new branch created from `origin/main`** (not from the currently checked-out `pengajuan-armada-copy-up-to-prod`, and not touching its uncommitted changes). Name the branch `fix-tiket-checkpoint-permissions`. If no native tool is available, the manual fallback is:

```bash
cd C:\Users\weka\Indigo\sistropigroup
git worktree add .worktrees/fix-tiket-checkpoint-permissions -b fix-tiket-checkpoint-permissions origin/main
```

All remaining steps in this task run from that isolated workspace's `SISTROAWESOME\api\TiketController.cs`, not the primary checkout.

- [ ] **Step 2: Read the current `DataTablePeriodeTiket` method in full**

Read from `public JsonResult<object> DataTablePeriodeTiket()` (search for that exact string) through its closing `catch (Exception ex)` block, to confirm the exact current text — line numbers may have drifted slightly since this plan was written.

- [ ] **Step 3: Add the two missing fields to the `TiketView` projection**

Find this exact block inside the method (the `List<TiketView> dt = datapaging.AsEnumerable().Select(...)` assignment):

```csharp
                List<TiketView> dt = datapaging.AsEnumerable().Select((x, i) => new TiketView
                {
                    number = i + 1,
                    id = x.id,
                    bookingno = x.bookingno,
                    tanggalString = String.Format("{0:dd MMMM yyyy}", x.tanggal),
                    shift = x.Kuota4Shift.shift,
                    nopol = x.nopol,
                    driver = x.driver,
                    updatedonString = String.Format("{0:dd MMMM yyyy}", x.updatedon),
                    qty = x.qty,
                    //positionString = x.M_Status1.keterangan,
                    positionString = th.statusTiket(x.bookingno, x.position, x.Posto1.company_code),
```

Replace with:

```csharp
                List<TiketView> dt = datapaging.AsEnumerable().Select((x, i) => new TiketView
                {
                    number = i + 1,
                    id = x.id,
                    bookingno = x.bookingno,
                    tanggalString = String.Format("{0:dd MMMM yyyy}", x.tanggal),
                    shift = x.Kuota4Shift.shift,
                    nopol = x.nopol,
                    driver = x.driver,
                    updatedonString = String.Format("{0:dd MMMM yyyy}", x.updatedon),
                    qty = x.qty,
                    // Raw status fields needed by the Next.js frontend (SISTROV2-next TicketActions
                    // component) to gate Edit/Reschedule/Delete buttons per ticket. Previously omitted
                    // here (unlike DataTableFilterLegacy, which already selects both) — the frontend
                    // silently failed closed (hid all action buttons) for every row from this endpoint,
                    // since it never received a statuspemuatan/position value to check.
                    position = x.position,
                    statuspemuatan = x.statuspemuatan,
                    //positionString = x.M_Status1.keterangan,
                    positionString = th.statusTiket(x.bookingno, x.position, x.Posto1.company_code),
```

Leave the rest of the `new TiketView { ... }` block (the `Action = ...` legacy HTML string) exactly as-is — it's unused by the Next.js frontend but still consumed elsewhere, don't touch it.

- [ ] **Step 4: Build**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /v:m /nologo
```

Expected: exit code 0, `SISTROAWESOME -> ...\bin\SISTROAWESOME.dll`, no `error CS`.

- [ ] **Step 5: Commit**

```bash
git add SISTROAWESOME/api/TiketController.cs
git commit -m "fix: return position and statuspemuatan from DataTablePeriodeTiket

The Next.js frontend's TicketActions component needs these raw status
fields to gate Edit/Reschedule/Delete buttons per ticket. This endpoint
was the only one of the two DataTable JSON APIs that omitted them
(DataTableFilterLegacy already selects both) -- every page built on
DataTablePeriodeTiket therefore received undefined and either hid all
action buttons or fell back to an always-permissive default."
```

---

## Task 2: Frontend — gate `TicketActions` on `statuspemuatan`

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\components\ticket\TicketActions.tsx` (lines 20-85)

### Context

This is the shared component all three ticket-list pages use for their action buttons. Today it takes a `status` prop (fed a raw `position` code by callers) and compares it against `"00"`/`"01"` — wrong, because `"01"` in the backend means the ticket already passed Security (see Root Cause above). This task renames the prop to `statuspemuatan` and rewrites the three permission checks to match the backend's own rule: Edit/Reschedule only while `statuspemuatan === "booking"`, Delete blocked once `statuspemuatan === "release"`.

Work from: `C:\Users\weka\Indigo\SISTROV2-next`

- [ ] **Step 1: Rename the `status` prop to `statuspemuatan` in the interface**

Find this exact block (lines 20-32):

```tsx
interface TicketActionsProps {
  bookingNo: string;
  id?: string;
  status?: string;
  currentNopol?: string;
  currentDriver?: string;
  postoGuid?: string;
  posto?: string;
  showView?: boolean;
  showPrint?: boolean;
  showDelete?: boolean;
  className?: string;
}
```

Replace with:

```tsx
interface TicketActionsProps {
  bookingNo: string;
  id?: string;
  statuspemuatan?: string;
  currentNopol?: string;
  currentDriver?: string;
  postoGuid?: string;
  posto?: string;
  showView?: boolean;
  showPrint?: boolean;
  showDelete?: boolean;
  className?: string;
}
```

- [ ] **Step 2: Rewrite the permission logic**

Find this exact block (lines 34-83):

```tsx
export function TicketActions({
  bookingNo,
  id,
  status,
  currentNopol,
  currentDriver,
  posto,
  showView = true,
  showPrint = true,
  showDelete = false,
  className = "",
}: TicketActionsProps) {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = normalizeRole((session?.user as any)?.roleName || (session?.user as any)?.role);
  
  const isSuperAdmin = userRole === "superadmin" || userRole === "ti";
  const isStaffArea = userRole === "staffarea";
  const isTransport = userRole === "transport" || userRole === "rekanan";
  const isMonitoringRole = isReadOnlyRole(userRole) || userRole === "gudang";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const router = useRouter();

  // Loading state
  if (sessionStatus === "loading") {
    return <div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-none" />;
  }

  // Normalize status to string for comparison, but if undefined/null, do not default to "00"
  // as this will bypass the checkpoint restriction for incomplete API responses.
  const currentStatus = status != null && status !== "" ? String(status).padStart(2, '0') : null;

  // Permission: Edit allowed if role is authorized AND status is '00'
  const canEdit = (isSuperAdmin || isStaffArea || isTransport) && currentStatus === "00";
  
  // Permission: Reschedule allowed ONLY for superadmin/staffarea AND ticket not yet at any checkpoint 
  // (status "00" = Booking, "01" = Siap Dicetak)
  const canReschedule = (isSuperAdmin || isStaffArea) && (currentStatus === "00" || currentStatus === "01");

  // Permission: View/Print allowed for these roles
  const canInteract = isSuperAdmin || isStaffArea || isTransport || isMonitoringRole;

  // Posto codes starting with anything other than "5" are SO-type (same heuristic
  // already used in TicketEditModal below to pick GP vs kontainer input mode).
  const isSOPosto = !!posto && posto.charAt(0) !== "5";

  // Permission: Delete allowed for SuperAdmin/TI and StaffArea always;
  // Transport only when the ticket's posto is SO-type.
  const canDelete = isSuperAdmin || isStaffArea || (isTransport && isSOPosto);
```

Replace with:

```tsx
export function TicketActions({
  bookingNo,
  id,
  statuspemuatan,
  currentNopol,
  currentDriver,
  posto,
  showView = true,
  showPrint = true,
  showDelete = false,
  className = "",
}: TicketActionsProps) {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = normalizeRole((session?.user as any)?.roleName || (session?.user as any)?.role);
  
  const isSuperAdmin = userRole === "superadmin" || userRole === "ti";
  const isStaffArea = userRole === "staffarea";
  const isTransport = userRole === "transport" || userRole === "rekanan";
  const isMonitoringRole = isReadOnlyRole(userRole) || userRole === "gudang";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const router = useRouter();

  // Loading state
  if (sessionStatus === "loading") {
    return <div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-none" />;
  }

  // Normalize statuspemuatan for comparison, but if undefined/null/empty, do not default to a
  // permissive value ("booking") -- that would bypass the checkpoint restriction whenever an API
  // response is missing this field. Missing data must fail closed (buttons hidden), not open.
  const normalizedStatus = statuspemuatan != null && statuspemuatan !== ""
    ? String(statuspemuatan).toLowerCase()
    : null;

  // Permission: Edit allowed if role is authorized AND ticket is still in "booking" stage
  // (backend position "00" -- not yet checked in at Security).
  const canEdit = (isSuperAdmin || isStaffArea || isTransport) && normalizedStatus === "booking";

  // Permission: Reschedule allowed ONLY for superadmin/staffarea AND ticket is still in "booking"
  // stage. Once Security scans the ticket in, statuspemuatan moves to "waiting"/"progress"/"release"
  // (backend position "01" and beyond) -- the ticket has entered the checkpoint flow and its shift
  // can no longer change.
  const canReschedule = (isSuperAdmin || isStaffArea) && normalizedStatus === "booking";

  // Permission: View/Print allowed for these roles
  const canInteract = isSuperAdmin || isStaffArea || isTransport || isMonitoringRole;

  // Posto codes starting with anything other than "5" are SO-type (same heuristic
  // already used in TicketEditModal below to pick GP vs kontainer input mode).
  const isSOPosto = !!posto && posto.charAt(0) !== "5";

  // Permission: Delete allowed for SuperAdmin/TI and StaffArea always; Transport only when the
  // ticket's posto is SO-type -- AND only while the ticket hasn't been released yet. "release" means
  // the ticket already checked out through Security (or finished an equivalent flow) -- matches the
  // backend's own delete gating in TiketController.cs (DataTablePeriodeTiket's legacy Action column),
  // which whitelists statuspemuatan booking/progress/waiting and excludes release.
  const canDelete = (isSuperAdmin || isStaffArea || (isTransport && isSOPosto))
    && normalizedStatus != null
    && ["booking", "progress", "waiting"].includes(normalizedStatus);
```

Note: `status: sessionStatus` on the first line of the function body is `useSession()`'s own `status` field (loading/authenticated/unauthenticated) — unrelated to the prop we just renamed, leave it as-is.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: errors in the 3 caller files (`tiket/page.tsx`, `admin/tickets/page.tsx`, `TicketBookingDetail.tsx`) still passing the old `status` prop — that's expected until Tasks 3-5 fix them. No errors should point at `TicketActions.tsx` itself.

- [ ] **Step 4: Commit**

```bash
git add src/components/ticket/TicketActions.tsx
git commit -m "fix: gate ticket Edit/Reschedule/Delete on statuspemuatan, not raw position code

TicketActions compared a padded 'position' prop against \"00\"/\"01\", but
backend position \"01\" already means the ticket was scanned in at
Security -- past the checkpoint, not before it. Delete had no status
gating at all. Rewired to match the backend's own legacy permission
rule (TiketController.cs DataTablePeriodeTiket Action column): Edit and
Reschedule only while statuspemuatan is \"booking\"; Delete allowed for
booking/progress/waiting, blocked once \"release\"."
```

---

## Task 3: Frontend — fix `/tiket` page (rekanan ticket list, `?posto=` view)

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\tiket\page.tsx` (lines 84-97)

### Context

This is the page from the bug report (`https://sistrov2-next.vercel.app/tiket?posto=...`). Its `TicketData` interface already declares `statuspemuatan?: string;` (line 29) — no interface change needed here, just wire it through to `TicketActions` instead of the never-populated `position` field, and turn on `showDelete` so eligible ("booking") tickets get their Delete button too (per the bug report: "siap dicetak" tickets currently have neither Edit/Ganti-Shift nor Delete). Also fixes the `postoGuid` → `posto` prop-name mismatch documented in Root Cause, so the Transport-role SO-posto delete check actually works here.

Work from: `C:\Users\weka\Indigo\SISTROV2-next`

- [ ] **Step 1: Update the `action` column**

Find this exact block (lines 84-97):

```tsx
  const columns: DataTableColumn<TicketData>[] = [
    {
      key: "action",
      header: "Aksi",
      render: (t) => (
        <TicketActions 
          bookingNo={t.bookingno} 
          status={t.position} 
          currentNopol={t.Nopol || t.nopol}
          currentDriver={t.DriverName || t.driver}
          postoGuid={t.posto}
        />
      ),
    },
```

Replace with:

```tsx
  const columns: DataTableColumn<TicketData>[] = [
    {
      key: "action",
      header: "Aksi",
      render: (t) => (
        <TicketActions 
          bookingNo={t.bookingno} 
          statuspemuatan={t.statuspemuatan} 
          currentNopol={t.Nopol || t.nopol}
          currentDriver={t.DriverName || t.driver}
          posto={t.posto}
          showDelete={true}
        />
      ),
    },
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: no errors referencing `src/app/tiket/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/tiket/page.tsx
git commit -m "fix: wire statuspemuatan into TicketActions on /tiket page, enable delete

Previously passed the raw 'position' field (always undefined from this
page's DataTablePeriodeTiket-backed fetch) and never enabled showDelete,
so booking-stage tickets were missing Edit/Ganti-Shift/Delete entirely.
Also fixes postoGuid -> posto prop name (TicketActions never actually
read postoGuid), so the Transport SO-posto delete check works here."
```

---

## Task 4: Frontend — fix `/admin/tickets` page

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\admin\tickets\page.tsx` (lines 27-42)

### Context

This is the page from the second bug report (`https://sistrov2-next.vercel.app/admin/tickets`) — tickets already checked out by Security or finished still show a Delete button. This page already uses `DataTableFilterLegacy`, which already returns `statuspemuatan` in every row (confirmed by reading `TiketController.cs:3705`), so this is a pure frontend prop swap — no backend change needed for this page.

Work from: `C:\Users\weka\Indigo\SISTROV2-next`

- [ ] **Step 1: Update the `actions` column**

Find this exact block (lines 27-42):

```tsx
    {
      key: "actions",
      header: "Aksi",
      render: (row: any) => (
        <TicketActions
          bookingNo={row.bookingno}
          status={row.position || row.status}
          currentNopol={row.nopol}
          currentDriver={row.driver}
          posto={row.posto}
          showDelete={true}
          className="justify-start"
        />
      ),
    },
```

Replace with:

```tsx
    {
      key: "actions",
      header: "Aksi",
      render: (row: any) => (
        <TicketActions
          bookingNo={row.bookingno}
          statuspemuatan={row.statuspemuatan}
          currentNopol={row.nopol}
          currentDriver={row.driver}
          posto={row.posto}
          showDelete={true}
          className="justify-start"
        />
      ),
    },
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: no errors referencing `src/app/admin/tickets/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/tickets/page.tsx
git commit -m "fix: gate admin tickets delete button on statuspemuatan

TicketActions.canDelete now blocks once a ticket is 'release' (checked
out through Security / finished) -- this page just needed to pass the
real statuspemuatan field instead of the raw position code."
```

---

## Task 5: Frontend — fix `TicketBookingDetail` (booking/[guid] page)

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\components\ticket\TicketBookingDetail.tsx` (lines 457-465)

### Context

This component (used by `/tiket/booking/[guid]`) also uses the `DataTablePeriodeTiket` endpoint (fixed in Task 1) and today passes `status={row.position || "00"}` — the `|| "00"` fallback means **every** ticket on this page is currently treated as freshly booked (since `row.position` was always `undefined` before Task 1), so Edit/Ganti-Shift show for every ticket regardless of real status. This is the most likely source of "masih bisa ubah shift padahal tiket sudah masuk checkpoint" from the bug report. This page doesn't set `showDelete`, so it stays off here (out of scope — not requested for this page).

Work from: `C:\Users\weka\Indigo\SISTROV2-next`

- [ ] **Step 1: Update the action button render**

Find this exact block (lines 457-465):

```tsx
                    render: (row: any) => (
                      <div className="flex justify-center gap-3 py-2">
                        <TicketActions
                          bookingNo={row.bookingno}
                          status={row.position || "00"}
                          currentNopol={row.nopol}
                          currentDriver={row.driver}
                          postoGuid={row.posto || guid}
                        />
```

Replace with:

```tsx
                    render: (row: any) => (
                      <div className="flex justify-center gap-3 py-2">
                        <TicketActions
                          bookingNo={row.bookingno}
                          statuspemuatan={row.statuspemuatan}
                          currentNopol={row.nopol}
                          currentDriver={row.driver}
                          posto={row.posto || guid}
                        />
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit -p .
```

Expected: no errors referencing `src/components/ticket/TicketBookingDetail.tsx`, and no errors anywhere else in the project (this was the last of the three `TicketActions` callers).

- [ ] **Step 3: Commit**

```bash
git add src/components/ticket/TicketBookingDetail.tsx
git commit -m "fix: stop defaulting booking-detail tickets to always-editable

The '|| \"00\"' fallback treated every ticket on this page as freshly
booked (position was always undefined from DataTablePeriodeTiket before
the Task 1 backend fix), so Edit/Ganti-Shift showed regardless of real
checkpoint status. Now passes the real statuspemuatan field and lets it
fail closed like every other TicketActions caller."
```

---

## Task 6: Manual verification

**Prerequisite:** Backend (Task 1) must be running the freshly built DLL, not the old one — restart the local backend if it was already running. Follow `AGENTS.md`'s cross-project startup: from `C:\Users\weka\Indigo\sistropigroup`, run `.\start-dev.ps1` (local IIS Express backend + Next.js), or run the frontend alone with `npm run dev:local` (from `SISTROV2-next`) against an already-running local backend.

- [ ] **Step 1: Confirm the backend actually returns the new fields**

With the local backend running, open the Next.js dev server and load `/tiket?posto=<a real posto guid with tickets in different statuspemuatan states>`. Open browser DevTools → Network tab, find the `DataTablePeriodeTiket` POST request/response, and confirm each row in `data[]` now has non-null `position` and `statuspemuatan` values (previously absent).

- [ ] **Step 2: Verify button visibility matches this table, on both `/tiket?posto=...` and `/admin/tickets`**

| `statuspemuatan` | Edit button | Ganti Shift button | Hapus button |
|---|---|---|---|
| `"booking"` (Siap Dicetak, position `00`) | Shows (role-gated: SuperAdmin/TI, StaffArea, Transport) | Shows (role-gated: SuperAdmin/TI, StaffArea only) | Shows (role-gated) |
| `"waiting"` | Hidden | Hidden | Shows (role-gated) |
| `"progress"` | Hidden | Hidden | Shows (role-gated) |
| `"release"` (checked out by Security / finished) | Hidden | Hidden | **Hidden** |
| missing/null (shouldn't happen post-fix, but confirms fail-closed) | Hidden | Hidden | Hidden |

Specifically re-test the two reported bugs:
- On `/tiket?posto=088e99e2-5e26-41ba-94cd-548cd25d56d1` (or any posto with a `"booking"`-stage ticket), confirm that ticket now shows Edit, Ganti Shift, and Hapus buttons (previously missing).
- On `/admin/tickets`, find a ticket already checked out by Security or finished (`statuspemuatan === "release"`) and confirm its Hapus button is now gone.

- [ ] **Step 2: Log in as a Transport/rekanan user and confirm Ganti Shift is correctly hidden for that role**

Per the permission rule, `canReschedule` only allows SuperAdmin/TI/StaffArea — Transport should never see the Ganti Shift button regardless of ticket status. Confirm this still holds (unchanged by this fix, but worth re-confirming alongside the rest).

- [ ] **Step 3: Spot-check `/tiket/booking/[guid]`**

Open any POSTO's booking-detail page (`/tiket/booking/<guid>`), and confirm the "Riwayat Tiket" list at the bottom now correctly hides Edit/Ganti-Shift for tickets that aren't in `"booking"` stage (previously always shown due to the `|| "00"` fallback).

---

## Self-Review

**Spec coverage:**
- ✅ "pastikan semua page yang mengandung data tiket agar tidak bisa rubah shift jika ... sudah masuk checkpoint" — `canReschedule` now requires `statuspemuatan === "booking"` exactly, across all 3 pages that render `TicketActions` (Tasks 2-5).
- ✅ "ada data yang masih tiket siap dicetak tetapi tidak ada button edit ganti shift dan hapus" (on `/tiket?posto=...`) — root cause (missing `position`/`statuspemuatan` from `DataTablePeriodeTiket`) fixed in Task 1; `/tiket/page.tsx` wired to the fixed field and `showDelete` enabled in Task 3.
- ✅ "tiket yang sudah checkout security atau sudah selesai kenapa ada button hapus?" (on `/admin/tickets`) / "harusnya tiket jika sudah selesai tidak bisa dihapus" — `canDelete` now excludes `statuspemuatan === "release"`, fixed in Task 2, wired on `/admin/tickets` in Task 4.
- ✅ "pastikan SEMUA page" — the third `TicketActions` caller (`TicketBookingDetail.tsx`, not explicitly named in the bug report but discovered by grepping every usage) is also fixed in Task 5, including its more severe always-permissive fallback bug.

**Placeholder scan:** None — every task has exact before/after code, exact file paths, exact build/type-check commands.

**Type consistency:** `statuspemuatan` prop name is identical across `TicketActionsProps` (Task 2), and all three call sites (Tasks 3, 4, 5). Values compared (`"booking"`, `"waiting"`, `"progress"`, `"release"`) are identical to the literal strings found in the backend source (`Helper/TiketHelper.cs`, `TiketController.cs`, `RabbitMQHelper.cs`) — not invented.

**Risk assessment:**
- Task 1 (backend): LOW risk — purely additive projection fields, no query/business-logic change, mirrors an existing pattern already proven in `DataTableFilterLegacy`.
- Tasks 2-5 (frontend): LOW-MEDIUM risk — this tightens who can see Edit/Reschedule/Delete buttons (previously-too-permissive `TicketBookingDetail.tsx`, previously-ungated `canDelete`) and loosens it elsewhere (previously-too-strict fail-closed-on-missing-data on `/tiket?posto=...`). Both directions are intentional per the bug report; Task 6 explicitly re-verifies both directions per page.
