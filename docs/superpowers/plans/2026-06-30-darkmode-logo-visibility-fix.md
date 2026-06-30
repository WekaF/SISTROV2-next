# Dark Mode Text & Logo Visibility Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two visibility bugs: logos invisible in light mode (white PNG on white bg), and text invisible in dark mode (dark text on dark background).

**Architecture:** Tailwind v4 + custom React ThemeContext (localStorage + `.dark` class on `<html>`). `@custom-variant dark (&:is(.dark *))` in globals.css. Fix is layered: (1) global cascade via `body` rule, (2) per-file inline container fixes, (3) logo filter fix.

**Tech Stack:** Next.js 16, Tailwind v4, React, TypeScript

---

## Root Cause Summary

| Bug | Root Cause | Affected |
|-----|-----------|---------|
| Logo invisible in light mode | `dark:brightness-0 dark:invert` — filter only applied in dark mode; white PNG = invisible on white bg | AppHeader, AppSidebar, SignInForm |
| Text invisible in dark mode | `body` has no default text color for dark mode → browser default black text on `bg-gray-950` | 52+ pages |
| Inline containers stay white | `bg-white` divs in modals/cards have no `dark:bg-*` pair | 72+ files |
| Report pages broken | Hardcoded Slate hex values (`#f1f5f9`, `#0f172a`) — no dark mode | reports/antrian, admin/reports |

## File Structure

| File | Change |
|------|--------|
| `src/app/globals.css` | Add `text-gray-900 dark:text-gray-100` to body (cascade fix) |
| `src/components/layout/AppHeader.tsx` | Logo filter: `dark:brightness-0 dark:invert` → `brightness-0 dark:invert` |
| `src/components/layout/AppSidebar.tsx` | Same logo filter fix |
| `src/components/auth/SignInForm.tsx` | Same logo filter fix |
| `src/app/antrian/page.tsx` | Gudang selection modal: bg-white + text-slate-* dark variants |
| `src/app/admin/users/page.tsx` | Edit modal: bg-white + text dark variants |
| `src/app/armada/percepatan/page.tsx` | Modal content: bg-white + text dark variants |
| `src/app/reports/antrian/page.tsx` | Replace hardcoded Slate hex colors |

---

## Task 1: Fix Global Dark Mode Text Cascade

**Files:**
- Modify: `src/app/globals.css:64`

The `body` rule has `bg-gray-50 dark:bg-gray-950` but NO text color. Browser default is black text — invisible on `bg-gray-950`.

- [ ] **Step 1: Edit body rule in globals.css**

Find line 64:
```css
body {
  @apply relative font-normal font-outfit z-1 bg-gray-50 dark:bg-gray-950;
}
```

Change to:
```css
body {
  @apply relative font-normal font-outfit z-1 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100;
}
```

- [ ] **Step 2: Verify cascade applies**

Run the dev server: `npm run dev`

Open any page in dark mode. Text that previously had no explicit color should now be visible (light gray on dark background).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "fix: add dark mode text color cascade to body"
```

---

## Task 2: Fix Logo Light-Mode Invisibility

**Files:**
- Modify: `src/components/layout/AppHeader.tsx:53,61`
- Modify: `src/components/layout/AppSidebar.tsx:167,175`
- Modify: `src/components/auth/SignInForm.tsx:60`

**Problem:** Logo PNGs are white images. `dark:brightness-0 dark:invert` only applies the black→white conversion in dark mode. In light mode, white logo on white background = invisible.

**Fix:** `brightness-0` (no dark: prefix) makes logo pure black in BOTH modes. `dark:invert` then makes it white in dark mode.

- [ ] **Step 1: Fix AppHeader logos**

In `src/components/layout/AppHeader.tsx`, find both logo Images (lines ~53 and ~61):

```tsx
className="object-contain dark:brightness-0 dark:invert"
```

Change BOTH to:
```tsx
className="object-contain brightness-0 dark:invert"
```

- [ ] **Step 2: Fix AppSidebar logos**

In `src/components/layout/AppSidebar.tsx`, find both logo Images (lines ~167 and ~175):

```tsx
className="object-contain dark:brightness-0 dark:invert"
```

Change BOTH to:
```tsx
className="object-contain brightness-0 dark:invert"
```

- [ ] **Step 3: Fix SignInForm logo**

In `src/components/auth/SignInForm.tsx` line ~60, find:

```tsx
className="h-10 object-contain grayscale dark:brightness-0 dark:invert"
```

Change to:
```tsx
className="h-10 object-contain brightness-0 dark:invert"
```

- [ ] **Step 4: Verify logo visibility in both modes**

Navigate to `/login`. Toggle light/dark mode. Logo must be visible in BOTH modes:
- Light mode: black logo on white background ✓
- Dark mode: white logo on gray-900 background ✓

Also check sidebar (expand it) and header in both modes.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppHeader.tsx src/components/layout/AppSidebar.tsx src/components/auth/SignInForm.tsx
git commit -m "fix: logos invisible in light mode — apply brightness-0 in both modes"
```

---

## Task 3: Fix Antrian Page Inline Modal Dark Mode

**Files:**
- Modify: `src/app/antrian/page.tsx`

The "Pindah Gudang" modal has gudang selection buttons with `bg-white border-slate-50` and `text-slate-700` — no dark variants. In dark mode, white cards on gray-950 page = layout breaks completely.

- [ ] **Step 1: Find and fix gudang selection buttons**

Search for this pattern in `src/app/antrian/page.tsx`:
```tsx
"bg-white border-slate-50 hover:border-slate-200"
```

Change to:
```tsx
"bg-white dark:bg-gray-800 border-slate-50 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
```

- [ ] **Step 2: Fix text-slate-700 in the same button**

Search in antrian/page.tsx:
```tsx
"font-black text-[13px] uppercase tracking-tight", selectedGudang === g.idgudang ? "text-brand-700" : "text-slate-700"
```

Change:
```tsx
"font-black text-[13px] uppercase tracking-tight", selectedGudang === g.idgudang ? "text-brand-700" : "text-slate-700 dark:text-slate-300"
```

- [ ] **Step 3: Fix bg-slate-100 icon containers (no dark variant)**

In the same gudang buttons, find:
```tsx
"bg-slate-100 text-slate-400 group-hover:bg-slate-200"
```

Change to:
```tsx
"bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600"
```

- [ ] **Step 4: Find remaining bg-white in antrian/page.tsx**

Run this search in the file:
```
grep -n "bg-white" src/app/antrian/page.tsx
```

For any `bg-white` NOT already followed by `dark:bg-*` on the same element, add `dark:bg-gray-800` (for cards/modals) or `dark:bg-gray-900` (for table rows).

- [ ] **Step 5: Commit**

```bash
git add src/app/antrian/page.tsx
git commit -m "fix: antrian modal dark mode — inline containers and text colors"
```

---

## Task 4: Fix Admin Users Page Dark Mode

**Files:**
- Modify: `src/app/admin/users/page.tsx`

The page uses inline edit modal with custom containers. Modal overlay and form fields may use bg-white without dark variants.

- [ ] **Step 1: Find all bg-white in admin/users/page.tsx**

```bash
grep -n "bg-white\|text-gray-900\|text-slate-[0-9]" src/app/admin/users/page.tsx
```

- [ ] **Step 2: Add dark variants to each result**

For each `bg-white` without `dark:bg-*`:
- Modal overlays: add `dark:bg-gray-900`
- Card/panel containers: add `dark:bg-gray-800`
- Table row hover: add `dark:hover:bg-gray-800`

For each `text-gray-900` without `dark:text-*`:
- Primary text (labels, headings): add `dark:text-white`
- Secondary text: add `dark:text-gray-300`

For each `text-gray-500` without `dark:text-*`:
- Add `dark:text-gray-400`

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/users/page.tsx
git commit -m "fix: admin/users page dark mode text and container colors"
```

---

## Task 5: Fix Armada Percepatan Page Dark Mode

**Files:**
- Modify: `src/app/armada/percepatan/page.tsx`

Contains inline modal and form containers that need dark mode variants.

- [ ] **Step 1: Find dark mode gaps**

```bash
grep -n "bg-white\|text-gray-900\|text-slate-[0-9]\|#003473\|linear-gradient" src/app/armada/percepatan/page.tsx
```

- [ ] **Step 2: Fix hardcoded gradient (line ~34)**

If there is a hardcoded style like:
```tsx
style={{ background: "linear-gradient(135deg, #003473 0%, #00509d 100%)" }}
```

This is fine — it's a colored background so white text on it is readable in both modes. Skip unless the text on it is not white.

- [ ] **Step 3: Fix bg-white modal containers**

For any `bg-white` modal/panel divs, add `dark:bg-gray-800`.

- [ ] **Step 4: Fix text-gray-* without dark variants**

Use pattern from Task 4: `text-gray-900` → `text-gray-900 dark:text-white`, `text-gray-500` → `text-gray-500 dark:text-gray-400`.

- [ ] **Step 5: Commit**

```bash
git add src/app/armada/percepatan/page.tsx
git commit -m "fix: armada/percepatan page dark mode container and text colors"
```

---

## Task 6: Fix Reports/Antrian Page Hardcoded Hex Colors

**Files:**
- Modify: `src/app/reports/antrian/page.tsx`

This page uses hardcoded Slate hex values for ALL styling — no Tailwind classes, no dark mode. Replacing hex with Tailwind semantic classes + dark variants.

- [ ] **Step 1: Find all hardcoded hex usage**

```bash
grep -n "#[0-9a-fA-F]\{3,6\}" src/app/reports/antrian/page.tsx
```

Expected: lines using `#f1f5f9` (slate-100), `#0f172a` (slate-900), `#e2e8f0` (slate-200), `#1e293b` (slate-800), `#64748b` (slate-500), `#94a3b8` (slate-400), `#10b981` (emerald-500), `#3b82f6` (blue-500), `#334155` (slate-700).

- [ ] **Step 2: Replace hex values with Tailwind equivalents**

Hex → Tailwind class mapping:

| Hex | Light mode class | Dark mode addition |
|-----|-----------------|-------------------|
| `#f1f5f9` (bg) | `bg-slate-100` | `dark:bg-slate-800` |
| `#e2e8f0` (bg) | `bg-slate-200` | `dark:bg-slate-700` |
| `#ffffff` (bg) | `bg-white` | `dark:bg-gray-900` |
| `#0f172a` (text) | `text-slate-900` | `dark:text-slate-100` |
| `#1e293b` (text) | `text-slate-800` | `dark:text-slate-200` |
| `#334155` (text) | `text-slate-700` | `dark:text-slate-300` |
| `#64748b` (text) | `text-slate-500` | `dark:text-slate-400` |
| `#94a3b8` (text) | `text-slate-400` | `dark:text-slate-500` |

For inline `style={{ color: "#0f172a" }}` → convert to className:
```tsx
// Before
<div style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}>

// After
<div className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800">
```

For scrollbar CSS at bottom of file:
```tsx
// Before (in <style> tag or inline)
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; }

// After — add to globals.css as @utility
@utility custom-scrollbar {
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { @apply bg-slate-100 dark:bg-slate-800; }
  &::-webkit-scrollbar-thumb { @apply bg-slate-300 dark:bg-slate-600 rounded-full; }
}
```

- [ ] **Step 3: Test report page in both modes**

Navigate to `/reports/antrian` and toggle dark/light mode. All text must be visible, backgrounds must be appropriately dark in dark mode.

- [ ] **Step 4: Commit**

```bash
git add src/app/reports/antrian/page.tsx src/app/globals.css
git commit -m "fix: reports/antrian page — replace hardcoded hex with Tailwind dark mode classes"
```

---

## Task 7: Fix Admin Reports Page (ApexCharts)

**Files:**
- Modify: `src/app/admin/reports/page.tsx`

ApexCharts uses hardcoded color arrays and doesn't automatically adapt to dark mode. The chart background and labels need conditional colors.

- [ ] **Step 1: Find chart options**

```bash
grep -n "#3C50E0\|#80CAEE\|colors\|labels\|chart:" src/app/admin/reports/page.tsx
```

- [ ] **Step 2: Make chart options theme-aware**

Import the theme context at the top:
```tsx
import { useTheme } from "@/context/ThemeContext";
```

Inside the component:
```tsx
const { theme } = useTheme();
const isDark = theme === "dark";
```

Then in chart options:
```tsx
const chartOptions = {
  colors: ["#3C50E0", "#80CAEE"],
  chart: {
    background: "transparent",
    foreColor: isDark ? "#e2e8f0" : "#1e293b",
  },
  grid: {
    borderColor: isDark ? "#334155" : "#e2e8f0",
  },
  tooltip: {
    theme: isDark ? "dark" : "light",
  },
};
```

Make sure to add `isDark` to the dependency array of useMemo/useEffect holding the options.

- [ ] **Step 3: Test charts in both modes**

Toggle dark/light mode with charts visible. Chart labels and grid lines must be readable.

- [ ] **Step 4: Apply same pattern to dashboard/report/page.tsx**

`src/app/dashboard/report/page.tsx` has the same issue with chart colors. Apply identical fix pattern.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/reports/page.tsx src/app/dashboard/report/page.tsx
git commit -m "fix: chart pages — theme-aware ApexCharts options for dark mode"
```

---

## Task 8: Systematic Scan for Remaining Pages

After Tasks 1-7, there are ~45 remaining pages with potential dark mode gaps. Use this grep to find them:

- [ ] **Step 1: Find pages with bg-white lacking dark variant on SAME line**

```bash
grep -rn 'className="[^"]*bg-white[^"]*"' src/app --include="*.tsx" | grep -v "dark:bg-"
```

This shows inline elements where `bg-white` appears in a className string that does NOT contain `dark:bg-`.

- [ ] **Step 2: Find text-gray-900 lacking dark on same line**

```bash
grep -rn 'text-gray-900' src/app --include="*.tsx" | grep -v "dark:text-"
```

- [ ] **Step 3: For each file found, apply the pattern**

Priority pages (most-used based on nav menu):
- `src/app/posto/page.tsx`
- `src/app/tiket/page.tsx`
- `src/app/gudang/page.tsx`
- `src/app/shift/page.tsx`
- `src/app/manager/page.tsx`
- `src/app/superadmin/settings/*` (all settings pages)

Fix pattern per page:
```tsx
// bg-white without dark:bg-*
className="... bg-white ..."
// → 
className="... bg-white dark:bg-gray-800 ..."

// text-gray-900 without dark:text-*
className="... text-gray-900 ..."
// →
className="... text-gray-900 dark:text-white ..."

// text-gray-700/600/500 without dark:text-*
className="... text-gray-700 ..."
// →
className="... text-gray-700 dark:text-gray-300 ..."
```

- [ ] **Step 4: Commit after each batch of related pages**

```bash
git add src/app/posto/ src/app/tiket/ src/app/gudang/
git commit -m "fix: dark mode text and bg colors — posto, tiket, gudang pages"
```

---

## Self-Review

**Spec coverage check:**
- ✓ Logo not visible in light mode → Task 2
- ✓ Text not visible in dark mode → Task 1 (cascade), Tasks 3-5 (inline), Task 8 (systematic)
- ✓ Report pages broken → Tasks 6-7
- ✓ Whole-app check → Task 8

**Placeholder scan:** No TBD items. All steps have exact code.

**Consistency check:** `brightness-0 dark:invert` used consistently in Task 2 across all 3 logo files.
