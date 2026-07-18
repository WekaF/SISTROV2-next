# Notification Detail Links + All-Notifications Page — Design

## Problem

The notification system built earlier today (Prisma models, sync jobs, `GET/PATCH /api/notifications`, header bell dropdown) works, but has 2 gaps:

1. Clicking a notification does nothing — no navigation to the thing it's about.
2. Read state is all-or-nothing: opening the dropdown marks every notification read at once (not the modern "read when you actually engage with it" pattern), and there's no page to browse notification history beyond the dropdown's last-30 cap.

## Goal

Clicking any notification (dropdown or a new full `/notifications` page) marks that one notification read and navigates to the page showing the thing it's about. Add a `/notifications` page with infinite scroll and a read/unread filter.

## Scope decisions (confirmed)

- `/notifications` page: full list, infinite scroll (not a fixed page-1-only list), with a "Semua" / "Belum dibaca" filter.
- Mark-as-read becomes per-item, triggered by clicking a notification — not "mark everything read when the dropdown opens." This applies to both the dropdown and the new full page (same click handler, reused).
- No new detail-fetching logic on any target page — every target page already has a way to show one specific record (a detail modal opened by ID, or a search filter); this feature only adds a `useSearchParams()` read-on-mount that calls the *existing* handler.

## Backend changes (`sistropigroup`)

None. All 4 target pages' existing detail-view/search mechanisms are reused as-is.

## Database change (`SISTROV2-next` — Postgres/Prisma)

Add one nullable column to `Notification`:

```prisma
model Notification {
  // ...existing fields...
  sourceLabel String?  // nopol/noposto — the human-readable identifier needed
                        // for target pages that filter by text (e.g. /armada's
                        // Nopol search), not just a numeric sourceId
}
```

Populated at creation time in both sync files (`sync-transportir.ts`, `sync-staffarea.ts`) — `row.nopol` or `row.noposto` is already in scope at every `createNotificationOnce(...)` call site, so this is a parameter addition, not new data-fetching.

## Frontend changes (`SISTROV2-next`)

### 1. `prisma/schema.prisma` + migration
Add `sourceLabel String?` to `Notification`. Run `prisma migrate dev`, regenerate client.

### 2. `src/lib/notifications/types.ts`
Add `sourceLabel?: string | null` to `NotificationDTO`. Add a new file:

### 3. `src/lib/notifications/href.ts` (new)
```typescript
export function getNotificationHref(
  type: string,
  sourceId: string,
  sourceLabel: string | null,
): string {
  switch (type) {
    case "POSTO_BARU":
      return `/posto?id=${encodeURIComponent(sourceId)}`;
    case "ARMADA_APPROVED":
    case "ARMADA_REJECTED":
    case "PENGAJUAN_BARU":
      return `/armada/pengajuan?id=${encodeURIComponent(sourceId)}`;
    case "ARMADA_BLOCKED":
    case "ARMADA_UNBLOCKED":
      return sourceLabel
        ? `/armada?nopol=${encodeURIComponent(sourceLabel)}`
        : "/armada";
    default:
      return "/";
  }
}
```

### 4. `createNotificationOnce` (both sync files) — add `sourceLabel` param
Every call site already has `row.nopol`/`row.noposto` available; pass it through.

### 5. `src/lib/notifications/sync-transportir.ts` / `sync-staffarea.ts`
Update `createNotificationOnce` calls to pass the label (posto: `row.noposto`; armada review/blokir: `row.nopol`).

### 6. `src/app/api/notifications/route.ts`
Extend `GET` to accept optional `cursor` (last-seen notification `id`, for infinite scroll) and `unreadOnly` query params, defaulting to today's behavior (`take: 30`, no filter) when absent — the dropdown's existing call (`fetch("/api/notifications")`, no params) keeps working unchanged.

### 7. `src/components/ui/DataTable.tsx`
Add an optional `initialSearch?: string` prop, used to seed the component's internal search state on mount (currently owned entirely internally, no way to seed it). One shared change — every page using `DataTable` gets deep-link-by-search support, not just `/armada`.

### 8. `src/app/armada/page.tsx`
Read `?nopol=` via `useSearchParams()`; pass to `DataTable`'s new `initialSearch`.

### 9. `src/app/posto/page.tsx`
Read `?id=` via `useSearchParams()`; on mount, if present, call the existing `handleView(id, noposto)` (already opens the detail modal by ID).

### 10. `src/app/armada/pengajuan/page.tsx`
Read `?id=` via `useSearchParams()`; on mount, if present, call the existing `setIsViewMode(true); setEditId(id)` (already opens the review-detail modal by ID).

### 11. `src/components/header/NotificationDropdown.tsx`
- Remove the "mark all read on open" behavior.
- Each notification item becomes a `<Link href={getNotificationHref(...)}>` (or `onClick` navigate), which also fires `PATCH /api/notifications/read { id }` for that one item (reusing the already-built single-id path — no route change needed there).
- Restore a "View All Notifications" link at the bottom, now pointing to the real `/notifications` page.

### 12. `src/app/notifications/page.tsx` (new)
- `useInfiniteQuery` against the extended `GET /api/notifications` (cursor-based).
- Tabs: "Semua" / "Belum dibaca" (passes `unreadOnly` to the query).
- Each row: same click-to-mark-read-and-navigate behavior as the dropdown (share one small component/hook between the two rather than duplicating the click handler).

## Testing / verification

No test framework in this repo (established convention this session) — `npx tsc --noEmit` after each file, then a manual pass: click each of the 6 notification types (or as many as can be triggered) from both the dropdown and `/notifications`, confirm navigation + the modal/filter opens on the target page, confirm the clicked item's unread dot disappears without affecting other items.

## Out of scope

- Deleting/dismissing notifications.
- Per-type notification preferences/settings.
- Real-time push (still 30s polling, unchanged).
- Grouping notifications by day/type on the `/notifications` page — flat reverse-chronological list only.
