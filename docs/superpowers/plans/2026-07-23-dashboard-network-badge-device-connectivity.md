# Dashboard Network Badge: Device Connectivity Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the backend-stream-dependent "Offline" badge in all three dashboards with the existing `NetworkStatusBadge` component that reflects actual device connectivity.

**Architecture:** The inline `streamStatus === "error" → "Offline"` badge in AdminDashboard, StaffAreaDashboard, and ViewerDashboard fires whenever the ASP.NET backend is unreachable — unrelated to whether the user's device has a network connection. `NetworkStatusBadge` already exists and pings `/api/ping` (local Next.js, no backend dependency). Swap the inline badge with `<NetworkStatusBadge />` in all three files. The `lastUpdated` timestamp beside each badge is kept — it still shows when data was last fetched.

**Tech Stack:** React/TSX, existing `NetworkStatusBadge` component — no new dependencies, no new files.

---

## File Structure

- Modify: `src/components/dashboard/AdminDashboard.tsx` — add import, replace inline stream badge
- Modify: `src/components/dashboard/StaffAreaDashboard.tsx` — add import, replace inline stream badge
- Modify: `src/components/dashboard/ViewerDashboard.tsx` — add import, replace inline stream badge

---

### Task 1: AdminDashboard

**Files:**
- Modify: `src/components/dashboard/AdminDashboard.tsx`

- [ ] **Step 1: Add import**

In `src/components/dashboard/AdminDashboard.tsx`, add after the last existing import line:

```tsx
import NetworkStatusBadge from "@/components/header/NetworkStatusBadge";
```

- [ ] **Step 2: Replace inline badge**

Find (lines ~351–358):

```tsx
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${streamStatus === "live" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : streamStatus === "error" ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
              }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${streamStatus === "live" ? "bg-emerald-500 animate-pulse"
                : streamStatus === "error" ? "bg-red-500" : "bg-gray-400 animate-pulse"
                }`} />
              {streamStatus === "live" ? "Live" : streamStatus === "error" ? "Offline" : "Connecting..."}
            </span>
```

Replace with:

```tsx
            <NetworkStatusBadge />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/AdminDashboard.tsx
git commit -m "fix(dashboard): replace stream-status badge with device NetworkStatusBadge (Admin)"
```

---

### Task 2: StaffAreaDashboard

**Files:**
- Modify: `src/components/dashboard/StaffAreaDashboard.tsx`

- [ ] **Step 1: Add import**

In `src/components/dashboard/StaffAreaDashboard.tsx`, add after the last existing import line:

```tsx
import NetworkStatusBadge from "@/components/header/NetworkStatusBadge";
```

- [ ] **Step 2: Replace inline badge**

Find (lines ~202–211):

```tsx
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              streamStatus === "live" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : streamStatus === "error" ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
              : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                streamStatus === "live" ? "bg-emerald-500 animate-pulse"
                : streamStatus === "error" ? "bg-red-500" : "bg-gray-400 animate-pulse"
              }`} />
              {streamStatus === "live" ? "Live" : streamStatus === "error" ? "Offline" : "Connecting..."}
            </span>
```

Replace with:

```tsx
            <NetworkStatusBadge />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/StaffAreaDashboard.tsx
git commit -m "fix(dashboard): replace stream-status badge with device NetworkStatusBadge (StaffArea)"
```

---

### Task 3: ViewerDashboard

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx`

- [ ] **Step 1: Add import**

In `src/components/dashboard/ViewerDashboard.tsx`, add after the last existing import line:

```tsx
import NetworkStatusBadge from "@/components/header/NetworkStatusBadge";
```

- [ ] **Step 2: Replace inline badge**

Find (lines ~1075–1091):

```tsx
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${streamStatus === "live"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : streamStatus === "error"
                  ? "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${streamStatus === "live"
                  ? "bg-emerald-500 animate-pulse"
                  : streamStatus === "error"
                    ? "bg-red-500"
                    : "bg-gray-400 animate-pulse"
                  }`}
              />
              {streamStatus === "live" ? "Live" : streamStatus === "error" ? "Offline" : "Connecting..."}
            </span>
```

Replace with:

```tsx
            <NetworkStatusBadge />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ViewerDashboard.tsx
git commit -m "fix(dashboard): replace stream-status badge with device NetworkStatusBadge (Viewer)"
```
