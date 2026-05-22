# User-Menu Default Checkboxes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-populate per-item checkboxes in `/superadmin/settings/user-menu` with the user's effective menu group items when no per-item override (`MenuItems`) has been saved yet.

**Architecture:** Extract `MENU_CONFIGS` + path-extraction helper from `AppSidebar.tsx` into a shared `src/lib/menu-configs.ts`. Both the sidebar and the user-menu dialog import from that lib. `openItemDialog` uses the helper to seed `selected` from the user's effective group when `MenuItems` is null.

**Tech Stack:** React (useState), TypeScript, Next.js 16, existing `MENU_CONFIGS` record in `AppSidebar.tsx`

---

## Root Cause Summary

`openItemDialog` (line 167, `user-menu/page.tsx`) initializes the checkbox Set only from `user.MenuItems`. When `MenuItems` is `null` (no override saved yet), the Set is empty — all checkboxes blank. The user's effective menu from their `MenuGroup` or role is never used as the starting point.

---

## File Structure

| File | Action | What changes |
|------|--------|-------------|
| `src/lib/menu-configs.ts` | **Create** | Extracted `MENU_CONFIGS` record + `getPathsForGroup(group)` helper |
| `src/components/layout/AppSidebar.tsx` | **Modify** | Remove inline `MENU_CONFIGS`, import from `@/lib/menu-configs` |
| `src/app/superadmin/settings/user-menu/page.tsx` | **Modify** | Import `getPathsForGroup` + `normalizeRole`; seed `selected` from group when `MenuItems` is null |

---

## Task 1: Extract MENU_CONFIGS to shared lib

**Files:**
- Create: `src/lib/menu-configs.ts`

- [ ] **Step 1: Create `src/lib/menu-configs.ts`**

Copy `MENU_CONFIGS` from `AppSidebar.tsx:159-811` plus the `NavItem` type, `normalizeRole` function, `mergeNavItems` function, and `filterNavByPaths` function. Add `getPathsForGroup` helper. Final file:

```typescript
export type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Maps raw ASP.NET role strings → normalized sidebar group key
export function normalizeRole(raw: string | undefined): string {
  if (!raw) return "eksternal";
  const r = raw.toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    ti: "superadmin",
    superadmin: "superadmin",
    admin: "admin",
    adminsumbu: "admin",
    candalkuota: "candal",
    candaltruk: "candal",
    candaltruck: "candal",
    candalcontainer: "candal",
    candalgudangposto: "candal",
    candaldept: "candal",
    candalkapal: "candal",
    staffarea: "staffarea",
    staffarealayah1: "staffarea",
    staffarealayah2: "staffarea",
    staffarewilayah1: "staffarea",
    staffarewilayah2: "staffarea",
    staffareajatim: "staffarea",
    dataareabagianpoall: "staffarea",
    dataareabagiansoall: "staffarea",
    dataareabagianpojateng: "staffarea",
    dataareabagianpojatim: "staffarea",
    dataareabagianpopelabuhan: "staffarea",
    dataareabagianposulsel: "staffarea",
    dataareabagianposumbagsel: "staffarea",
    dataareabagianposumbagut: "staffarea",
    dataareababagianjawa: "staffarea",
    dataareabagiansojabar: "staffarea",
    dataareababagiansojabar: "staffarea",
    dataareababagianjateng: "staffarea",
    dataareababagianjatim: "staffarea",
    dataareababagiansoall: "staffarea",
    viewer: "viewer",
    pkg: "manager",
    viewerposto: "viewer",
    viewerarmada: "viewer",
    transport: "transport",
    transportsuraljalan: "transport",
    rekanan: "rekanan",
    security: "security",
    securitylini3: "security",
    gudang: "gudang",
    candalgudang: "gudang",
    gudanglini3: "gudang",
    chekerlini3: "gudang",
    checkerlini3: "gudang",
    admingudang: "gudang",
    admingudangcandalgudang: "gudang",
    timbangan: "jembatan_timbang",
    jembatan_timbang: "jembatan_timbang",
    adminarmada: "pod",
    pod: "pod",
    pelabuhanapp: "pkd",
    pelabuhanuppp: "pkd",
    terminal1: "pkd",
    terminal2: "pkd",
    pkd: "pkd",
  };
  if (r.startsWith("dataareabagian")) return "staffarea";
  return map[r] ?? "eksternal";
}

/** Flatten a group's nav+admin items into a plain path array. */
export function getPathsForGroup(group: string): string[] {
  const config = MENU_CONFIGS[group];
  if (!config) return [];
  const allItems = [...config.nav, ...config.admin];
  return allItems.flatMap((item) =>
    item.subItems
      ? item.subItems.map((s) => s.path)
      : item.path
      ? [item.path]
      : []
  );
}

export const MENU_CONFIGS: Record<string, { nav: NavItem[]; admin: NavItem[] }> = {
  // --- paste the full MENU_CONFIGS object from AppSidebar.tsx:159-811 here ---
  // (all groups: superadmin, admin, candal, staffarea, viewer, transport,
  //  rekanan, security, gudang, jembatan_timbang, pod, pkd, manager, eksternal)
};
```

> **Important:** The `NavItem` type here omits `icon` from required fields (it's optional `React.ReactNode`) — this lets non-React files import the type safely. AppSidebar still passes icons when building its nav items.

- [ ] **Step 2: Populate MENU_CONFIGS in the new file**

Open `src/components/layout/AppSidebar.tsx`, copy lines 159–811 (the full `MENU_CONFIGS` object body), paste into `src/lib/menu-configs.ts` replacing the comment placeholder. The object contains keys: `superadmin`, `admin`, `candal`, `staffarea`, `viewer`, `transport`, `rekanan`, `security`, `gudang`, `jembatan_timbang`, `pod`, `pkd`, `manager`, `eksternal`.

Remove all JSX icon props from the copied object (they reference imported components that aren't available in a non-component file). Change each `icon: <XyzIcon ... />` to `icon: undefined`. The sidebar re-adds icons from its own imports when it uses `MENU_CONFIGS` — see Task 2 for how.

- [ ] **Step 3: Verify the file compiles**

```bash
cd C:/Users/weka/Indigo/SISTROV2-next
rtk tsc --noEmit --skipLibCheck 2>&1 | head -40
```

Expected: no errors in `src/lib/menu-configs.ts`.

---

## Task 2: Update AppSidebar to import from shared lib

**Files:**
- Modify: `src/components/layout/AppSidebar.tsx`

- [ ] **Step 1: Replace local definitions with imports**

At the top of `AppSidebar.tsx`, add:

```typescript
import { normalizeRole, mergeNavItems, filterNavByPaths, MENU_CONFIGS } from "@/lib/menu-configs";
```

Remove the inline definitions of `normalizeRole` (lines 35–98), `mergeNavItems` (lines 100–141), `filterNavByPaths` (lines 143–157), and `MENU_CONFIGS` (lines 159–811) from `AppSidebar.tsx`.

- [ ] **Step 2: Re-add icons to MENU_CONFIGS in AppSidebar**

Since icons are JSX and can't live in the lib file, override nav items with icons in `AppSidebar.tsx` after the import. The cleanest approach: keep a separate `ICON_MAP` in AppSidebar and attach icons when building `navItems`/`adminItems`. However, the simplest no-regression approach is: **keep the icons in the lib by making the lib file a `.tsx` file** (`src/lib/menu-configs.tsx`).

Change the lib file extension to `.tsx` and restore the icon imports (copy the icon imports from AppSidebar):

```typescript
// src/lib/menu-configs.tsx  ← .tsx, not .ts
import {
  LayoutGrid, FileText, Settings, ChevronDown, Monitor, Truck,
  Scan, Package, ClipboardList, BarChart3, ArrowRightLeft,
  TableProperties, Ticket, CalendarCheck, Users, ShieldCheck,
  CalendarClock,
} from "lucide-react";
```

Then keep the icon JSX in the `MENU_CONFIGS` object as-is (copied from AppSidebar).

- [ ] **Step 3: Rename file if needed**

```bash
mv src/lib/menu-configs.ts src/lib/menu-configs.tsx
```

Update the import in AppSidebar to `@/lib/menu-configs` (no extension needed, TS resolves both).

- [ ] **Step 4: Verify no regressions in AppSidebar**

```bash
rtk tsc --noEmit --skipLibCheck 2>&1 | head -40
```

Expected: 0 errors.

---

## Task 3: Pre-populate checkboxes from effective group

**Files:**
- Modify: `src/app/superadmin/settings/user-menu/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `user-menu/page.tsx`, add:

```typescript
import { getPathsForGroup, normalizeRole } from "@/lib/menu-configs";
```

- [ ] **Step 2: Replace `openItemDialog` with group-seeded version**

Current code (lines 167–175):

```typescript
const openItemDialog = (user: UserMenuGroupRow) => {
  let selected = new Set<string>();
  if (user.MenuItems) {
    try {
      selected = new Set(JSON.parse(user.MenuItems) as string[]);
    } catch {}
  }
  setDialog({ user, selected });
};
```

Replace with:

```typescript
const openItemDialog = (user: UserMenuGroupRow) => {
  let selected: Set<string>;
  if (user.MenuItems) {
    try {
      selected = new Set(JSON.parse(user.MenuItems) as string[]);
    } catch {
      selected = new Set();
    }
  } else {
    // No per-item override yet → seed from effective menu group
    const effectiveGroup =
      user.MenuGroup ||
      normalizeRole(user.Roles?.[0]);
    selected = new Set(getPathsForGroup(effectiveGroup));
  }
  setDialog({ user, selected });
};
```

- [ ] **Step 3: Verify TypeScript**

```bash
rtk tsc --noEmit --skipLibCheck 2>&1 | head -40
```

Expected: 0 errors.

- [ ] **Step 4: Manual smoke test**

1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/superadmin/settings/user-menu`
3. Search a user who has no per-item override (`MenuItems = null`) but has a `MenuGroup` set (e.g., "candal")
4. Click the "Item" / list button to open the per-item dialog
5. Verify: checkboxes are pre-ticked with all paths from the `candal` group
6. Search a user who has no `MenuGroup` either — checkboxes should seed from their first role (normalized)
7. Search a user who *does* have per-item overrides — checkboxes should still show their saved items (existing behavior unchanged)

- [ ] **Step 5: Commit**

```bash
git add src/lib/menu-configs.tsx src/components/layout/AppSidebar.tsx src/app/superadmin/settings/user-menu/page.tsx
git commit -m "fix(user-menu): pre-populate item checkboxes from effective menu group

When MenuItems is null (no per-item override), seed the dialog's
checkbox Set from the user's MenuGroup (or role fallback) using
getPathsForGroup(). Extract MENU_CONFIGS to shared lib so both
AppSidebar and user-menu page can use it without duplication."
```

---

## Self-Review

**Spec coverage:**
- ✅ Checkboxes auto-populated when no override exists
- ✅ Existing saved overrides unchanged (branch `if (user.MenuItems)` runs first)
- ✅ Fallback to role normalization when `MenuGroup` also null
- ✅ MENU_CONFIGS extracted to avoid duplication (DRY)

**No placeholders:** All code shown in full.

**Type consistency:**
- `getPathsForGroup(group: string): string[]` — used in Task 3, defined in Task 1 ✅
- `normalizeRole(raw: string | undefined): string` — same signature in lib and AppSidebar ✅
- `user.Roles` is `string[]` per `UserMenuGroupRow` interface — `user.Roles?.[0]` safe ✅
