# Network Status Badge: Weak vs Offline Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the header network badge from showing "Offline" for connections that are merely slow, so it only reports true disconnection as offline.

**Architecture:** `classifyNetworkStatus()` in `src/hooks/use-network-latency.ts` currently collapses two different situations into one `"offline"` bucket: (a) the ping genuinely failed/timed out/browser reports offline, and (b) the ping succeeded but took ≥500ms. Users see a red "Offline" badge in cases of (b) even though they're connected — just slow. Split (b) into a new `"weak"` status, keep `"offline"` reserved for actual disconnection.

**Tech Stack:** Next.js 16 client hook (React `useState`/`useEffect`), no new dependencies.

---

## Root Cause (already diagnosed — do not re-investigate)

Read `src/hooks/use-network-latency.ts:16-24`:

```ts
export function classifyNetworkStatus(
  latencyMs: number | null,
  isOnline: boolean
): NetworkStatus {
  if (!isOnline || latencyMs === null) return "offline";
  if (latencyMs < GOOD_THRESHOLD_MS) return "good";
  if (latencyMs < SLOW_THRESHOLD_MS) return "slow";
  return "offline";
}
```

The last line (`return "offline"`) fires whenever the `/api/ping` fetch **succeeded** but took 500ms or more (`SLOW_THRESHOLD_MS`). That is a real, connected, successful response — just a slow one. It is being mislabeled identically to a hard failure (fetch threw, aborted after the 3s timeout, or `navigator.onLine` is false). This is what makes the badge flip to "Offline" far more often than the network is actually down: any latency spike ≥500ms (busy server, brief LAN hiccup, GC pause) trips the same red "Offline" state as a real outage.

The existing self-check at `src/hooks/use-network-latency.selfcheck.mts:13-16` documents this as intentional:
```ts
// offline: 500ms or more, or no measurement, or browser reports offline
assert.equal(classifyNetworkStatus(500, true), "offline");
```
That assertion is the bug encoded as a spec. This plan changes the intended behavior: 500ms+ *with a successful response* becomes `"weak"`, not `"offline"`. `"offline"` is reserved for `latencyMs === null` (fetch failed/timed out) or `isOnline === false` (browser reports no connection).

---

## File Structure

- Modify: `src/hooks/use-network-latency.ts` — add `"weak"` to the `NetworkStatus` union, fix `classifyNetworkStatus` branching.
- Modify: `src/hooks/use-network-latency.selfcheck.mts` — update assertions to the corrected contract, add a case proving `"weak"` is distinct from `"offline"`.
- Modify: `src/components/header/NetworkStatusBadge.tsx` — add a style entry for `"weak"` (amber/orange, still the connected `Wifi` icon, not `WifiOff`) and a distinct label so users can tell "slow" from "weak" from "offline" at a glance.

No new files, no new dependencies.

---

### Task 1: Split "weak" (high-latency, still connected) out of "offline"

**Files:**
- Modify: `src/hooks/use-network-latency.selfcheck.mts`
- Modify: `src/hooks/use-network-latency.ts`
- Modify: `src/components/header/NetworkStatusBadge.tsx`

- [ ] **Step 1: Update the self-check to assert the corrected contract (this will fail against current code)**

Replace the full contents of `src/hooks/use-network-latency.selfcheck.mts` with:

```ts
// src/hooks/use-network-latency.selfcheck.mts
import assert from "node:assert/strict";
import { classifyNetworkStatus } from "./use-network-latency.ts";

// good: under 150ms
assert.equal(classifyNetworkStatus(0, true), "good");
assert.equal(classifyNetworkStatus(149, true), "good");

// slow: 150ms up to (not including) 500ms
assert.equal(classifyNetworkStatus(150, true), "slow");
assert.equal(classifyNetworkStatus(499, true), "slow");

// weak: 500ms or more, but the ping still succeeded and browser is online
assert.equal(classifyNetworkStatus(500, true), "weak");
assert.equal(classifyNetworkStatus(5000, true), "weak");

// offline: only when there's no measurement (fetch failed/timed out) or the
// browser itself reports no connection — never for a merely slow response
assert.equal(classifyNetworkStatus(null, true), "offline");
assert.equal(classifyNetworkStatus(20, false), "offline");
assert.equal(classifyNetworkStatus(5000, false), "offline");

console.log("use-network-latency self-check: all assertions passed");
```

- [ ] **Step 2: Run the self-check to confirm it fails against current code**

Run: `node --experimental-strip-types src/hooks/use-network-latency.selfcheck.mts`
Expected: `AssertionError` on the line `assert.equal(classifyNetworkStatus(500, true), "weak")` (current code returns `"offline"`).

- [ ] **Step 3: Fix `classifyNetworkStatus` and add the `"weak"` status**

In `src/hooks/use-network-latency.ts`, change:

```ts
export type NetworkStatus = "good" | "slow" | "offline";
```

to:

```ts
export type NetworkStatus = "good" | "slow" | "weak" | "offline";
```

Then change:

```ts
export function classifyNetworkStatus(
  latencyMs: number | null,
  isOnline: boolean
): NetworkStatus {
  if (!isOnline || latencyMs === null) return "offline";
  if (latencyMs < GOOD_THRESHOLD_MS) return "good";
  if (latencyMs < SLOW_THRESHOLD_MS) return "slow";
  return "offline";
}
```

to:

```ts
export function classifyNetworkStatus(
  latencyMs: number | null,
  isOnline: boolean
): NetworkStatus {
  if (!isOnline || latencyMs === null) return "offline";
  if (latencyMs < GOOD_THRESHOLD_MS) return "good";
  if (latencyMs < SLOW_THRESHOLD_MS) return "slow";
  return "weak";
}
```

- [ ] **Step 4: Run the self-check to confirm it passes**

Run: `node --experimental-strip-types src/hooks/use-network-latency.selfcheck.mts`
Expected: `use-network-latency self-check: all assertions passed`

- [ ] **Step 5: Style the `"weak"` state in the badge**

In `src/components/header/NetworkStatusBadge.tsx`, change:

```tsx
const STATUS_STYLES: Record<string, string> = {
  good: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  slow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  offline: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};
```

to:

```tsx
const STATUS_STYLES: Record<string, string> = {
  good: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  slow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  weak: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  offline: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};
```

`"weak"` keeps the `Wifi` icon (only `"offline"` gets `WifiOff`) since the connection is up — this is already correct in the existing `Icon = status === "offline" ? WifiOff : Wifi` line, no change needed there. The `latencyMs`-based label (`${Math.round(latencyMs)}ms`) already applies to `"weak"` since it only special-cases `"offline"`, so no change needed to the label logic either.

- [ ] **Step 6: Manual verification in the browser**

Run: `npm run dev`
Open the app, confirm the header badge still renders normally (green "Xms" under normal conditions). To confirm the new "weak" path renders correctly without needing to induce real network lag, temporarily add `throw new Error("test")` inside `measurePingLatency`'s `try` block in `src/hooks/use-network-latency.ts` — no wait, that produces `null` → `"offline"`, not `"weak"`. Instead temporarily change `SLOW_THRESHOLD_MS` to `0` in the same file, reload the page, confirm the badge turns orange with an `Nms` label (not red "Offline"). Revert the temporary threshold change afterward — do not commit it.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-network-latency.ts src/hooks/use-network-latency.selfcheck.mts src/components/header/NetworkStatusBadge.tsx
git commit -m "fix(network-badge): distinguish weak (slow but connected) from offline"
```

---

## Why this addresses "kenapa sering offline dan jaringan lemah"

Before this fix, *every* successful-but-slow ping (≥500ms) rendered as a red "Offline" badge — indistinguishable from a real outage. That is very likely the direct cause of the user's report of frequent "offline" — the backend was actually reachable, just responding slowly (e.g. dev server load, LAN hiccups to `192.168.188.170:8090` on other requests, general "jaringan lemah"), and the badge overstated it as a full outage. After this fix, that case now correctly reads "weak" (orange, still shows the ms figure, `Wifi` icon retained) — the badge stops crying wolf, and a genuine "Offline" (red, `WifiOff`) now only fires when the ping actually fails or the browser itself reports disconnection.

## Out of scope (do not add unless asked)

- Retry/backoff before declaring a ping failed — not evidenced as needed; the 3s `FETCH_TIMEOUT_MS` already gives slow responses room before falling to `null`.
- Surfacing backend-specific latency (the `/aspnet-proxy` round trip) — `/api/ping` intentionally measures only the Next.js server itself (`src/app/api/ping/route.ts` returns 204 with no backend call), keeping the measurement cheap and dependency-free. Widening it to also probe the backend is a separate, bigger change and isn't what was asked.
- A tooltip/i18n pass on the badge — not requested; the existing English label pattern (`Xms` / `Offline`) is kept, just extended with the `weak` bucket.
