# Relogin Alert Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline amber "card" shown on the login page when a session is force-expired with a proper modal alert dialog, so the user cannot miss it and must explicitly choose "Ya, Login Lagi" or "Batal".

**Architecture:** Add a new `AlertDialog` UI primitive wrapper at `src/components/ui/alert-dialog.tsx`, built the same way the existing `src/components/ui/dialog.tsx` wraps `@base-ui/react/dialog`, but wrapping `@base-ui/react/alert-dialog` instead (already installed in `node_modules`, no new dependency needed). `@base-ui/react/alert-dialog`'s `Root` intentionally omits `modal` and pointer-dismissal props — it is always modal and does not close on outside click/Escape, which is exactly the "force an explicit decision" behavior wanted here. Then swap the inline `<div>` card in `src/components/auth/SignInForm.tsx:109-141` for this `AlertDialog`, controlled by the existing `sessionExpired` boolean derived from the `session_expired` query param. No new state is needed: navigating away (via `router.push`) changes the query param, which naturally closes the dialog through the `open` prop.

**Tech Stack:** Next.js 16, React, `@base-ui/react` (already a dependency, same primitive family already used for `Dialog`), Tailwind CSS, `lucide-react` icons.

---

## Context: what exists today

`src/components/auth/SignInForm.tsx:109-141` currently renders an always-inline warning card when `sessionExpired` is true:

```tsx
{sessionExpired && (
  <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-lg">
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
      <div>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
          Sesi Berakhir
        </h3>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          Akun anda digunakan oleh user lain, apakah ingin login lagi?
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleAutoRelogin}
            disabled={reloginLoading}
            className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors disabled:opacity-50"
          >
            {reloginLoading ? "Memproses..." : "Ya, Login Lagi"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/login")}
            disabled={reloginLoading}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-transparent border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded transition-colors disabled:opacity-50"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

This is easy to miss because it just sits above the login form. Everything else in the file (`handleAutoRelogin`, `sessionExpired`, `reloginLoading`, `router`, `searchParams`) stays as-is — only the JSX block above gets replaced.

No test runner (vitest/jest/playwright) is configured in this project (`package.json` has no `test` script or test dependency), so this plan verifies behavior manually in the browser instead of with automated tests.

---

### Task 1: Add the `AlertDialog` UI primitive

**Files:**
- Create: `src/components/ui/alert-dialog.tsx`
- Reference: `src/components/ui/dialog.tsx` (pattern to mirror)

- [ ] **Step 1: Create the wrapper component**

Create `src/components/ui/alert-dialog.tsx` with this exact content:

```tsx
"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import { cn } from "@/lib/utils"

function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({ className, ...props }: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-white dark:bg-gray-dark p-6 shadow-xl transition duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 sm:rounded-2xl",
          className
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-1.5 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-bold leading-none tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
}
```

This is a 1:1 structural mirror of `src/components/ui/dialog.tsx`, swapping the import to `@base-ui/react/alert-dialog`. `AlertDialogPrimitive.Root` (from that package) does not accept `modal`/pointer-dismissal props because it is always modal and non-dismissible by outside click or Escape — that's the built-in "force a decision" behavior, so no extra props are needed here.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no new errors referencing `alert-dialog.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/alert-dialog.tsx
git commit -m "feat: add AlertDialog UI primitive"
```

---

### Task 2: Use `AlertDialog` for the relogin prompt in `SignInForm`

**Files:**
- Modify: `src/components/auth/SignInForm.tsx`

- [ ] **Step 1: Import the new component**

In `src/components/auth/SignInForm.tsx`, add this import alongside the existing `lucide-react` import (near line 6):

```tsx
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
```

- [ ] **Step 2: Replace the inline card with the alert dialog**

Replace the whole block at `src/components/auth/SignInForm.tsx:109-141` (the `{sessionExpired && (...)}` card shown above) with:

```tsx
<AlertDialog open={sessionExpired}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <AlertDialogTitle>Sesi Berakhir</AlertDialogTitle>
          <AlertDialogDescription>
            Akun anda digunakan oleh user lain, apakah ingin login lagi?
          </AlertDialogDescription>
        </div>
      </div>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <button
        type="button"
        onClick={() => router.push("/login")}
        disabled={reloginLoading}
        className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-transparent border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded transition-colors disabled:opacity-50"
      >
        Batal
      </button>
      <button
        type="button"
        onClick={handleAutoRelogin}
        disabled={reloginLoading}
        className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors disabled:opacity-50"
      >
        {reloginLoading ? "Memproses..." : "Ya, Login Lagi"}
      </button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

No other code in the file changes: `handleAutoRelogin`, `sessionExpired`, `reloginLoading`, `router` all stay exactly as they are today. The dialog's `open` prop is driven directly by `sessionExpired`; clicking "Batal" calls `router.push("/login")`, which drops the `session_expired` query param, which flips `sessionExpired` back to `false` and closes the dialog — same mechanism the old card relied on, no new state.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors in `SignInForm.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/SignInForm.tsx
git commit -m "feat: show relogin prompt as a modal alert dialog"
```

---

### Task 3: Manual verification in the browser

**Why manual:** No test runner is configured in this project, and this is a purely visual/interaction change to a login-page dialog — the fastest reliable check is driving it in a real browser per this project's `verify` convention for UI changes.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (or `npm run dev:local` if the local ASP.NET backend is running)

- [ ] **Step 2: Trigger the dialog**

Navigate to: `http://localhost:3000/login?session_expired=true`

Expected:
- A modal dialog appears centered on screen with a dark overlay behind it (not an inline card above the form).
- Title "Sesi Berakhir", description "Akun anda digunakan oleh user lain, apakah ingin login lagi?", amber warning icon.
- Clicking outside the dialog or pressing Escape does NOT close it (forces an explicit choice — this is the alert-dialog behavior, confirm it matches expectations).

- [ ] **Step 3: Verify "Batal"**

Click "Batal". Expected: dialog closes, URL becomes `/login` (no `session_expired` param), plain login form shown.

- [ ] **Step 4: Verify "Ya, Login Lagi"**

Reload `http://localhost:3000/login?session_expired=true`, click "Ya, Login Lagi". Expected: button shows "Memproses...", then either redirects to `callbackUrl` on success or shows the red error banner below (existing `error` state) on failure — same as before, just reached through the dialog.

- [ ] **Step 5: Verify dark mode**

Toggle dark mode (if the app has a theme toggle, or via OS dark mode) and repeat Step 2. Expected: dialog background, text, and button colors all remain readable (uses the same `dark:` classes as before).

---

## Self-Review

**Spec coverage:** User asked for the relogin notice to be an alert dialog instead of just a card, so it's informative/hard to miss. Task 1 adds the primitive, Task 2 swaps the card for it while preserving all existing handlers and copy, Task 3 verifies it actually pops up as a modal. Covered.

**Placeholder scan:** No TBD/TODO; every step has full code or an exact command with expected output.

**Type consistency:** `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription` are named identically between Task 1 (definition/export) and Task 2 (import/usage). `sessionExpired`, `reloginLoading`, `handleAutoRelogin`, `router` are untouched existing identifiers from the current file, verified above at `src/components/auth/SignInForm.tsx:18-41`.
