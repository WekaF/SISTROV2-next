# Network Status Widget — Design

**Date:** 2026-07-17
**Status:** Approved for planning

## Problem

Header has no indicator of the user's connection quality to the app. Users on flaky
internet (common for transport/field users) get no warning before an action fails —
they just see something silently not work. Add a small persistent badge showing
live latency/status, positioned above the "Active Plant" switcher in `AppHeader`.

## Reference

User-provided reference image: small rounded pill, light green background, signal-bar
icon on the left, `38ms` text on the right.

## Architecture

Three new pieces, no new dependencies:

1. **`src/app/api/ping/route.ts`** — trivial GET route, returns 204 immediately. No DB
   call, no auth check. Exists purely as a same-origin round-trip target so the browser
   can time "server responded" against "request sent." Reusing an existing data endpoint
   would conflate DB/backend latency with network latency — wrong signal for "is my
   internet ok."
2. **`src/hooks/use-network-latency.ts`** — client hook. Fetches `/api/ping` every 20s,
   times the round trip, classifies into a status. Also listens to `online`/`offline`
   window events for instant offline detection between polls (native browser API, zero
   cost).
3. **`src/components/header/NetworkStatusBadge.tsx`** — renders the pill using the
   hook's output. Static badge, no dropdown, no click behavior (matches reference —
   it's read-only).

### Data flow

```
NetworkStatusBadge
  └─ useNetworkLatency()
       ├─ setInterval(20s) → fetch('/api/ping') → measure Date.now() delta → classify
       ├─ window 'offline' event → immediately set status='offline', skip fetch
       └─ window 'online' event → immediately re-fetch to reclassify
```

Hook return shape:

```ts
type NetworkStatus = "good" | "slow" | "offline";
interface NetworkLatencyState {
  status: NetworkStatus;
  latencyMs: number | null; // null when offline
}
```

### Classification thresholds

- `latencyMs < 150` → `good` (green)
- `150 <= latencyMs < 500` → `slow` (yellow)
- `latencyMs >= 500`, fetch throws/times out, or `navigator.onLine === false` → `offline` (red)

### Fetch behavior

- `fetch('/api/ping', { cache: 'no-store' })`, timed via `performance.now()` before/after.
- 3s client-side timeout via `AbortController` — a hung request counts as `offline`, not
  an infinite "checking" state.
- No retry logic — the next interval tick (or the next `online` event) is the retry.

## Placement

`src/components/layout/AppHeader.tsx:93-98` — the existing icon cluster:

```tsx
<div className="flex items-center gap-3">
  <CompanySwitcher />
  <ThemeToggleButton />
  <NotificationDropdown />
</div>
```

becomes:

```tsx
<div className="flex items-center gap-3">
  <div className="flex flex-col items-end gap-1">
    <NetworkStatusBadge />
    <CompanySwitcher />
  </div>
  <ThemeToggleButton />
  <NotificationDropdown />
</div>
```

Badge renders for every logged-in user (transport/rekanan included) — connection
quality isn't tied to plant/company switching, unlike `CompanySwitcher` which hides
itself for transport roles.

## Visual spec

Three states, pill shape (`rounded-full`), icon + text, matches the AdminDashboard
stream-status pill convention already in the codebase:

| Status  | Background | Text/Icon color | Border      | Label            |
|---------|-----------|------------------|-------------|------------------|
| good    | `#dcfce7` (green-100) | `#15803d` (green-700) | `#bbf7d0` | `{latencyMs}ms` |
| slow    | `#fef9c3` (yellow-100) | `#a16207` (yellow-700) | `#fde68a` | `{latencyMs}ms` |
| offline | `#fee2e2` (red-100) | `#b91c1c` (red-700) | `#fecaca` | `Offline`       |

Icon: `lucide-react` `Wifi` icon (already a dependency, matches header's existing icon
usage) — swap to `WifiOff` for the `offline` state. Font size `text-[11px] font-semibold`,
padding `px-2.5 py-1`, matching the existing header badge sizing conventions.

## Error handling

- `/api/ping` itself can't meaningfully fail (no logic to fail) — if the server is
  fully down, the `fetch` call throws or the `AbortController` timeout fires, both
  handled by the `offline` branch.
- No error boundary needed — the hook never throws into render, all failure paths
  resolve to a valid `NetworkStatus`.

## Testing

This repo has no test framework installed (no vitest, jest, or similar) — confirmed by
checking `package.json`. Adding one just for this feature would violate the "no new
dependencies" constraint above, so the classification logic is checked without a
framework:

- The three-way branch (`good`/`slow`/`offline`) lives in a pure, exported function
  `classifyNetworkStatus(latencyMs, isOnline)` — no React, no DOM.
- A dependency-free self-check script (`use-network-latency.selfcheck.mts`) asserts the
  boundary values (149/150/499/500ms, `null`, and `isOnline=false`) using Node's built-in
  `node:assert/strict`, run via `node --experimental-strip-types` (Node 22.6+ built-in
  TypeScript support — no ts-node, no tsx, no new dependency).
- No test for `NetworkStatusBadge` itself — it's a pure render of the hook's output,
  covered visually by manual check in the browser (`npm run dev`).

## Out of scope (explicitly deferred)

- Measuring actual throughput (Mbps) — latency-only per user's chosen approach.
- Toast/notification on status change — persistent badge only, no popup per user's
  chosen approach.
- Historical/logged connection data — this is a live indicator, not analytics.
