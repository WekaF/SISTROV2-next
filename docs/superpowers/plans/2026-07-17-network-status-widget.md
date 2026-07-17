# Network Status Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small persistent pill badge above the "Active Plant" switcher in the app header, showing live connection latency (good/slow/offline) so users on flaky connections get an early signal before an action silently fails.

**Architecture:** A trivial `/api/ping` route gives the browser a same-origin round-trip target. A client hook (`useNetworkLatency`) polls it every 20s, times the round trip with a 3s abort timeout, and also reacts instantly to the browser's native `online`/`offline` events. A pure `classifyNetworkStatus` function turns a latency number into one of three states. A small badge component renders the hook's output as a colored pill, stacked above `CompanySwitcher` in `AppHeader`.

**Tech Stack:** Next.js 16 App Router route handler, React hook (no new dependencies), `lucide-react` icons (already installed), Tailwind CSS. No test framework is installed in this repo — the one piece of branching logic (`classifyNetworkStatus`) gets a dependency-free self-check runnable via Node's built-in type-stripping (`node --experimental-strip-types`, Node 22.6+, confirmed on this machine's Node v22.12.0).

---

### Task 1: Ping route

**Files:**
- Create: `src/app/api/ping/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse(null, { status: 204 });
}
```

No auth check, no DB call — this route exists only as a same-origin timing target. It must respond as fast as the Next.js server itself can respond, with zero extra work, so the measured latency reflects network + server round-trip only. `export const dynamic = "force-dynamic"` stops Next.js from statically optimizing this route at build time — a cached/static response would silently defeat the whole point of live latency measurement.

- [ ] **Step 2: Verify manually**

Run: `npm run dev` (in one terminal), then in another:

```bash
curl -i http://localhost:3000/api/ping
```

Expected: `HTTP/1.1 204 No Content` with no body. Stop the dev server after confirming (Ctrl+C) — later tasks restart it.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ping/route.ts
git commit -m "feat: add /api/ping route for client latency measurement"
```

---

### Task 2: Latency classification + hook

**Files:**
- Create: `src/hooks/use-network-latency.ts`
- Create: `src/hooks/use-network-latency.selfcheck.mts`

- [ ] **Step 1: Write the self-check (it will fail — the module doesn't exist yet)**

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

// offline: 500ms or more, or no measurement, or browser reports offline
assert.equal(classifyNetworkStatus(500, true), "offline");
assert.equal(classifyNetworkStatus(null, true), "offline");
assert.equal(classifyNetworkStatus(20, false), "offline");

console.log("use-network-latency self-check: all assertions passed");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --experimental-strip-types src/hooks/use-network-latency.selfcheck.mts`
Expected: `Cannot find module '.../use-network-latency.ts'` (the module doesn't exist yet).

- [ ] **Step 3: Write the hook module**

```ts
// src/hooks/use-network-latency.ts
"use client";
import { useEffect, useState } from "react";

export type NetworkStatus = "good" | "slow" | "offline";

export interface NetworkLatencyState {
  status: NetworkStatus;
  latencyMs: number | null;
}

const POLL_INTERVAL_MS = 20_000;
const FETCH_TIMEOUT_MS = 3_000;
const GOOD_THRESHOLD_MS = 150;
const SLOW_THRESHOLD_MS = 500;

export function classifyNetworkStatus(
  latencyMs: number | null,
  isOnline: boolean
): NetworkStatus {
  if (!isOnline || latencyMs === null) return "offline";
  if (latencyMs < GOOD_THRESHOLD_MS) return "good";
  if (latencyMs < SLOW_THRESHOLD_MS) return "slow";
  return "offline";
}

async function measurePingLatency(): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = performance.now();
  try {
    const res = await fetch("/api/ping", { cache: "no-store", signal: controller.signal });
    if (!res.ok) return null;
    return performance.now() - start;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function useNetworkLatency(): NetworkLatencyState {
  const [state, setState] = useState<NetworkLatencyState>({ status: "good", latencyMs: null });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const isOnline = navigator.onLine;
      const latencyMs = isOnline ? await measurePingLatency() : null;
      if (!cancelled) {
        setState({ latencyMs, status: classifyNetworkStatus(latencyMs, isOnline) });
      }
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);

    function handleOffline() {
      if (!cancelled) setState({ status: "offline", latencyMs: null });
    }
    function handleOnline() {
      check();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return state;
}
```

- [ ] **Step 4: Run the self-check to verify it passes**

Run: `node --experimental-strip-types src/hooks/use-network-latency.selfcheck.mts`
Expected output (an `ExperimentalWarning` and/or `MODULE_TYPELESS_PACKAGE_JSON` warning line first is normal and harmless):
```
use-network-latency self-check: all assertions passed
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-network-latency.ts src/hooks/use-network-latency.selfcheck.mts
git commit -m "feat: add useNetworkLatency hook with classification self-check"
```

---

### Task 3: Badge component

**Files:**
- Create: `src/components/header/NetworkStatusBadge.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { Wifi, WifiOff } from "lucide-react";
import { useNetworkLatency } from "@/hooks/use-network-latency";

const STATUS_STYLES: Record<string, string> = {
  good: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  slow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  offline: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

export default function NetworkStatusBadge() {
  const { status, latencyMs } = useNetworkLatency();

  const label =
    status === "offline" ? "Offline" : latencyMs !== null ? `${Math.round(latencyMs)}ms` : "…";
  const Icon = status === "offline" ? WifiOff : Wifi;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[status]}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
```

`latencyMs === null` with `status === "good"` only happens in the brief window before the first `/api/ping` response lands (initial state) — the `…` placeholder covers that.

- [ ] **Step 2: Commit**

```bash
git add src/components/header/NetworkStatusBadge.tsx
git commit -m "feat: add NetworkStatusBadge component"
```

---

### Task 4: Wire into the header

**Files:**
- Modify: `src/components/layout/AppHeader.tsx:93-98`

- [ ] **Step 1: Add the import**

In `src/components/layout/AppHeader.tsx`, after the existing `CompanySwitcher` import (line 9):

```tsx
import CompanySwitcher from "../header/CompanySwitcher";
import NetworkStatusBadge from "../header/NetworkStatusBadge";
```

- [ ] **Step 2: Stack the badge above the switcher**

Replace this block (currently lines 93-98):

```tsx
        <div className="flex items-center gap-2 px-4 py-2 lg:gap-4 lg:px-0 lg:py-0">
          <div className="flex items-center gap-3">
            <CompanySwitcher />
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
```

with:

```tsx
        <div className="flex items-center gap-2 px-4 py-2 lg:gap-4 lg:px-0 lg:py-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <NetworkStatusBadge />
              <CompanySwitcher />
            </div>
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
```

The badge renders for every logged-in user, including transport/rekanan roles for whom `CompanySwitcher` returns `null` — connection quality isn't tied to plant switching. When `CompanySwitcher` renders `null`, the flex column just shows the badge alone, right-aligned.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `AppHeader.tsx`, `NetworkStatusBadge.tsx`, or `use-network-latency.ts`.

- [ ] **Step 4: Manual verification in the browser**

Run: `npm run dev`

Open `http://localhost:3000` (log in if prompted), and confirm:
- A small pill (icon + `Nms`) appears directly above the "Active Plant" button in the top-right of the header.
- It starts green (e.g. `12ms`) on a normal local connection.
- Open DevTools → Network tab → set throttling to "Offline", wait up to 20s (or toggle back online then offline to trigger the instant `offline` event path) → pill turns red and reads `Offline`.
- Set throttling back to "No throttling" or toggle the tab back online → pill returns to green within ~20s (or immediately, via the `online` event).

Stop the dev server after confirming (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppHeader.tsx
git commit -m "feat: show network status badge above Active Plant switcher"
```

---

## Out of scope (per design doc)

- Measuring throughput (Mbps) — latency-only.
- Toast/notification on status change — persistent badge only, no popup.
- Historical/logged connection data.
