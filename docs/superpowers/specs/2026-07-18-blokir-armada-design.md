# Blokir Armada — Design

## Problem

`Armada` (fleet vehicle) already has an `IsBlocked`/`BlockedOn`/`BlockedBy`/`BlockedReason` model on the backend (EF6 EDMX + `ArmadaController.ToggleBlokir`, fixed for a `CS1061` build error and committed in `sistropigroup` commit `c3784da`), but no frontend UI calls it, and no read path anywhere in the system exposes or respects the flag:

- `/armada` and `/superadmin/settings/fleet` (the two armada listing/management pages) don't show blokir status and have no way to toggle it.
- The 4 backend endpoints that serve "pick an armada for this tiket" dropdowns (`ArmadaController.DataPagination`, `.DataPaginationPercepatan`, `MobileTransportController.ListArmadaPagination`, `.ListArmadaPaginationPercepatan`) don't filter out blocked armada — a blocked vehicle can still be booked.

## Goal

Add a "Blokir" column + toggle + confirmation dialog to both listing pages, and make blocked armada unselectable in every booking/tiket-creation flow (web + mobile).

## Scope decisions (confirmed)

- Both `/armada` and `/superadmin/settings/fleet` get the UI (not just one).
- Only `Admin`/`Superadmin`-type roles can toggle. Rekanan/transport users see the status badge (read-only), no toggle button — mirrors the existing `isRekanan` column-gating pattern already in `/armada`. (Backend already enforces this independently: `ToggleBlokir` returns `403 Forbidden` when `isTransport` — the frontend gating is defense-in-depth/UX, not the only guard.)
- Blocked armada must be excluded from booking/tiket-creation selection, not just flagged in the listing UI — requires touching the 4 duplicate pagination endpoints (web `ArmadaController` + mobile `MobileTransportController`), consistent with the project convention of fixing a confirmed root cause at every duplicate site.
- The 4 pagination endpoints are pre-existing copy-pasted duplicates of each other. This design adds the same one-line filter to all 4 as-is — it does **not** consolidate them into a shared helper. That refactor is out of scope (bigger diff, regression risk across 4 already-working booking endpoints, not needed to ship this feature).
- `TiketController.cs` is untouched — it only reads/writes `nopol` as a display field and does not perform armada selection.

## Backend changes (`sistropigroup`)

All additive (new fields / new filter clauses), no existing fields or logic removed.

### 1. Expose blokir status in the two listing DTOs

**`Models/ArmadaView.cs`** — add:
```csharp
public bool IsBlocked { get; set; }
public string BlockedReason { get; set; }
public Nullable<System.DateTime> BlockedOn { get; set; }
```
**`api/ArmadaController.cs::DataTable()`** (`Select` projection building `ArmadaView`, ~L2600) — add:
```csharp
IsBlocked = x.Armada1?.IsBlocked ?? false,
BlockedReason = x.Armada1?.BlockedReason ?? "",
BlockedOn = x.Armada1?.BlockedOn,
```
(matches the existing `?? ""` / `?.` null-guard convention already used for every other field in that same projection, since `x` is `ArmadaMapping` and `Armada1` is the nullable navigation property to `Armada`.)

**`Models/ArmadaSettingView.cs`** — add the same 3 properties.

**`api/SuperadminArmadaController.cs::List()`** (`Select` projection building `ArmadaSettingView`, ~L39) — add:
```csharp
IsBlocked = a.IsBlocked,
BlockedReason = a.BlockedReason,
BlockedOn = a.BlockedOn,
```
(here `a` is `Armada` directly, no null-guard needed — matches how every other field in this projection is written.)

### 2. Exclude blocked armada from booking selection (4 places)

In each of the 4 methods below, add one filter clause to the existing `IQueryable<ArmadaMapping>` chain, in the same style as the existing KIR-expiry filter (`masa_berlaku_kir >= today`, applied unconditionally, no feature flag):

```csharp
datasearch = datasearch.Where(x => x.Armada1.IsBlocked == false);
```

- `api/ArmadaController.cs::DataPagination` (~L3596)
- `api/ArmadaController.cs::DataPaginationPercepatan` (~L3709)
- `api/MobileTransportController.cs::ListArmadaPagination`
- `api/MobileTransportController.cs::ListArmadaPaginationPercepatan`

`IsBlocked` is a non-nullable `bool` (confirmed from the EDMX fix: `Armada.cs` declares `public bool IsBlocked { get; set; }`), and `Armada1` is accessed without a null-conditional here to match every sibling filter already in this exact chain (e.g. `x.Armada1.charter == true`, `x.Armada1.Transport.username == namauser`) — none of them null-guard `Armada1`, so this filter follows the same established (unguarded) convention rather than introducing a new pattern.

## Frontend changes (`SISTROV2-next`)

### 3. `ConfirmDialog` component — add an optional content slot

`src/components/ui/ConfirmDialog.tsx` gets a new optional `children?: React.ReactNode` prop, rendered between the description and the footer buttons. Existing callers (which pass no children) are unaffected. This lets the "Block" dialog embed a reason `<Input>` without a bespoke dialog component; "Unblock" uses the dialog with no children (plain confirm), matching its existing usage in the fleet page.

### 4. `src/app/armada/page.tsx`

- New `ArmadaStatusItem`-shaped fields on `FleetData`: `isBlocked: boolean`, `blockedReason?: string`, `blockedOn?: string`.
- New "Blokir" column in the `columns` array (inserted near the existing "Status" column, ~L546): a `Badge` — red/`variant="light"` `color="error"` labeled "Diblokir" when `isBlocked`, otherwise gray "Aktif".
- Action column (~L589-630): add a Block/Unblock icon button, rendered only when `!isRekanan` (same gating already applied to the Transportir/Kode Vendor columns at L449-466).
- New state: `blokirId: string | null`, `blokirAction: "block" | "unblock" | null`, `blokirReason: string` (mirrors the existing `deleteId`/`deleteReason` pair at L110-111).
- New `blokirMutation` (`useMutation`, mirrors `deleteMutation` at L343): `POST /api/Armada/ToggleBlokir` with body `{ ID, IsBlocked, Reason }`, invalidates the armada table query on success.
- New `ConfirmDialog` instance: `variant="danger"` + reason `<Input>` child when blocking, `variant="warning"` + no children when unblocking. Title/description swap based on `blokirAction`.

### 5. `src/app/superadmin/settings/fleet/page.tsx`

- Same column + dialog treatment as above, using the existing `ConfirmDialog` import already present in this file (currently only used for delete-mapping confirmation).
- `ArmadaRow` interface gets `isBlocked: boolean`, `blockedOn: string | null`, `blockedBy: string | null`, `blockedReason: string | null`.

### 6. New Next.js proxy route: `src/app/api/admin/armada/toggle-blokir/route.ts`

This page talks to the backend through the BFF proxy pattern (`aspnetFetchServer`), not `useApi` directly (see `src/app/api/admin/armada/route.ts` for the existing pattern). New `POST` route:
- Auth-gated the same way as the existing `route.ts`: `isAuthorized` checks `session.user.roles` includes `superadmin` or `ti`.
- Proxies to `POST /api/Armada/ToggleBlokir` via `aspnetFetchServer`, forwarding `{ ID, IsBlocked, Reason }`.

### 7. `src/app/api/admin/armada/route.ts` — GET handler mapping

Add to the existing per-row `.map(...)` (~L42-69): `isBlocked: a.IsBlocked ?? false`, `blockedOn: a.BlockedOn || null`, `blockedBy: a.BlockedBy || null`, `blockedReason: a.BlockedReason || null` — same style as every other field already mapped there.

## Testing / verification

`sistropigroup`'s `vstest.console.exe` test discovery is broken in this dev environment (pre-existing, documented) — verification there is: full-solution `MSBuild` build (0 errors) + hand-traced assertions against the 6 changed backend methods, same convention used for the prior `CS1061` fix.

Frontend: no existing test suite pattern was found for these two pages in this exploration — verification is a manual pass through the dev server: toggle block/unblock on both pages, confirm the badge updates, confirm a blocked armada disappears from the tiket-booking "Pilih Armada" dropdown (`TicketBookingDetail.tsx`) and the ticket-edit modal (`TicketActions.tsx`).

## Out of scope

- Refactoring the 4 duplicated pagination query methods into a shared helper.
- Any change to `TiketController.cs`.
- Mobile *app* UI changes (only the backend endpoints it calls are touched — no mobile client code lives in either repo explored here).
- Un-blocking requiring its own reason/audit trail beyond what `ToggleBlokir` already does (it already nulls `BlockedReason`/`BlockedBy`/`BlockedOn` on unblock).
