# Remove Two Dashboard Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove two cards from the main (Viewer) dashboard — "Live Monitor Pintu Pemuatan (Loading Bays) & Antrean Gudang" and "Pusat Analisis Hambatan Antrean & Alur Logistik (Manajemen Operasional)" — without touching the underlying pages or menu entries they link to.

**Architecture:** Both cards are inline JSX blocks inside the single-file component `src/components/dashboard/ViewerDashboard.tsx`. This component renders exclusively for `role === "viewer"` (routed from `src/components/dashboard/DashboardClient.tsx:98`), which is the main dashboard view. No other component references these card blocks. Deleting the two JSX blocks is sufficient; both icons used in their headers (`Activity`, `AlertTriangle`) are also used elsewhere in the file, so no import cleanup is needed. The standalone pages at `/antrian/live-monitoring` and `/antrian/analisis-hambatan` and their menu entries in `src/lib/menu-configs.tsx` are untouched — only the dashboard card display goes.

**Tech Stack:** Next.js 16, React, TypeScript.

---

### Task 1: Remove "Live Monitor Pintu Pemuatan (Loading Bays) & Antrean Gudang" card

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx:1283-1505`

- [ ] **Step 1: Confirm current block boundaries**

Run: `rtk grep -n "1.7. Live Warehouse Loading Docks" src/components/dashboard/ViewerDashboard.tsx`
Expected output includes: `1284:      {/* 1.7. Live Warehouse Loading Docks & Bay Monitor (NEW VISUAL) */}`

If the line number differs from 1284, re-read the file around the reported line before proceeding — line numbers may have drifted since this plan was written.

- [ ] **Step 2: Delete the card block**

Using the Read tool, view `src/components/dashboard/ViewerDashboard.tsx` from line 1280 to line 1510 to see the exact current text. The block to delete starts at the blank line immediately after the previous card's closing `</Card>` and the comment `{/* 1.7. Live Warehouse Loading Docks & Bay Monitor (NEW VISUAL) */}`, and ends at the blank line immediately before the comment `{/* 2. Premium MoM Month-over-Month Overview Panel (Optimized with Cascading Animations) */}`.

Concretely, delete everything from (and including):
```tsx
      {/* 1.7. Live Warehouse Loading Docks & Bay Monitor (NEW VISUAL) */}
      <Card className="shadow-theme-xs hover:shadow-md transition-all duration-300 mb-6 animate-slide-up-fade border border-gray-100 dark:border-gray-800">
```
through (and including) the matching closing tags and trailing blank line:
```tsx
        </CardContent>
      </Card>

```
so that the file goes directly from the previous card's `</Card>` to:
```tsx
      {/* 2. Premium MoM Month-over-Month Overview Panel (Optimized with Cascading Animations) */}
```
with exactly one blank line of separation preserved (matching the existing spacing convention between cards in this file).

Use the Edit tool with the full text you read in this range as `old_string` and an empty `new_string`.

- [ ] **Step 3: Verify no leftover unused declarations**

Run: `rtk grep -n "dockCompanies\|selectedDockCompany" src/components/dashboard/ViewerDashboard.tsx`

If matches remain outside the deleted block (e.g. a `useState`/`useEffect` that only fed this card), leave them — this project does not enforce `noUnusedLocals` (confirmed: no such flag in `tsconfig.json`), so unused state does not break the build. Do not go hunting for a bigger cleanup; this task is scoped to removing the card's visible output only.

- [ ] **Step 4: Build check**

Run: `rtk next build`
Expected: build succeeds with no new TypeScript errors in `ViewerDashboard.tsx`.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/dashboard/ViewerDashboard.tsx
rtk git commit -m "fix: remove loading bays card from main dashboard"
```

---

### Task 2: Remove "Pusat Analisis Hambatan Antrean & Alur Logistik (Manajemen Operasional)" card

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx` (line numbers shifted down after Task 1's deletion — re-locate via grep)

- [ ] **Step 1: Locate current block boundaries**

Run: `rtk grep -n "8.5. Analisis Antrean" src/components/dashboard/ViewerDashboard.tsx`
Expected output includes a line like: `NNNN:      {/* 8.5. Analisis Antrean & Hambatan Operasional (Queue Stage & Bottleneck Analysis) */}`

Note the reported line number `NNNN` — this replaces the pre-Task-1 line number 2364 referenced below.

- [ ] **Step 2: Delete the card block**

Using the Read tool, view the file from `NNNN - 5` to `NNNN + 180` to see the exact current text. The block to delete starts at the blank line immediately after the previous card's closing `</Card>` and the comment `{/* 8.5. Analisis Antrean & Hambatan Operasional (Queue Stage & Bottleneck Analysis) */}`, is wrapped in a `{stats && ( ... )}` conditional, and ends at the blank line immediately before the comment `{/* 9. Extreme Ticket Duration Analysis (Top 10 Fastest & Longest) */}`.

Concretely, delete everything from (and including):
```tsx
      {/* 8.5. Analisis Antrean & Hambatan Operasional (Queue Stage & Bottleneck Analysis) */}
      {stats && (
        <Card className="shadow-theme-xs hover:shadow-md transition-all duration-300 mt-6 animate-slide-up-fade border border-gray-100 dark:border-gray-800">
```
through (and including) the matching closing tags and trailing blank line:
```tsx
          </CardContent>
        </Card>
      )}

```
so that the file goes directly from the previous card's closing `</Card>` (with its own `)}` if wrapped in a conditional) to:
```tsx
      {/* 9. Extreme Ticket Duration Analysis (Top 10 Fastest & Longest) */}
```
with exactly one blank line of separation preserved.

Use the Edit tool with the full text you read in this range as `old_string` and an empty `new_string`.

- [ ] **Step 3: Build check**

Run: `rtk next build`
Expected: build succeeds with no new TypeScript errors in `ViewerDashboard.tsx`.

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/dashboard/ViewerDashboard.tsx
rtk git commit -m "fix: remove bottleneck analysis card from main dashboard"
```

---

### Task 3: Manual verification in browser

**Files:** None (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (or `npm run dev:local` if the local ASP.NET backend is running)

- [ ] **Step 2: Log in as a Viewer-role user and load the dashboard**

Navigate to the main dashboard route. Confirm:
- The "Live Monitor Pintu Pemuatan (Loading Bays) & Antrean Gudang" card is gone.
- The "Pusat Analisis Hambatan Antrean & Alur Logistik (Manajemen Operasional)" card is gone.
- The cards immediately before and after each removed card (SLA card → MoM Overview panel; Plant Performance Ranking table → Extreme Ticket Duration Analysis) render with normal spacing, no leftover gap or broken layout.
- No console errors related to `dockCompanies`, `stats`, or removed card state.

- [ ] **Step 3: Confirm underlying pages still work**

Navigate to `/antrian/live-monitoring` and `/antrian/analisis-hambatan` directly (or via the sidebar menu). Confirm both pages still load normally — only the dashboard cards were removed, not the pages or menu links.
