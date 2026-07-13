# Remove Booking Button From POSTO DataTable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the "Booking" action button from the `/posto` DataTable's action column, since rekanan/transport users already have a dedicated booking flow at `/tiket/booking`.

**Architecture:** Single-file frontend change — delete the conditional `isRekanan` Booking `<Button>` block from the `action` column's `render` function in `src/app/posto/page.tsx`. No backend or routing changes.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, `@/components/ui/button`, `lucide-react` icons.

---

## Investigation Notes (context, not a task)

User also asked why `/posto` data doesn't match `/tiket/booking`, and why many POSTO/SO rows seem to be missing from `/posto` and `/posto/so`. Traced both endpoints in the ASP.NET backend (`C:\Users\weka\Indigo\sistropigroup`):

- `/posto` (frontend) → `POSTOController.DataTableFilter` (backend): for non-transport (staff/admin) roles, scopes rows to `company_code == effectiveCompanyCode` (the company switcher) and, for `POCLUSTER`-type rows, to the staff's assigned `listbagian` (region) unless the role is one of SuperAdmin/TI/Admin/Viewer/PKG/StaffArea/AdminSumbu (`isAllowedCompanyOverride`). For transport/rekanan roles it instead scopes to `Transport1.username == username` (their own POSTOs only), no company/bagian restriction.
- `/posto/so` (frontend) → `SOController.DataTableFilter` (backend): same intent, but **does not read the `companyCode` override parameter at all** — it always filters by the logged-in staff's own `myCompanyCode`, ignoring the frontend's company switcher. This is a real bug (the SO page's company switcher silently does nothing), but the user explicitly chose to defer fixing it in this session — **out of scope for this plan**.
- `/tiket/booking` (frontend) → `POSTOController.AvailableBaru` (backend): always scopes to `Transport1.username == username` regardless of role, and additionally requires `status == "1"`, `tglakhir >= now` (not expired), and `qty - qtyrencana > 0` (booking quota remaining). It also has no `noposto` prefix filter, so it mixes PO (`noposto` starting with `"5"`) and SO (everything else) rows together in one list — whereas `/posto` only shows PO rows and `/posto/so` only shows SO rows (by design, split across two pages).

Net effect: `/tiket/booking` is intentionally a narrower "what can I book right now" view (active + not expired + has quota) merged across PO/SO, while `/posto` and `/posto/so` are broader historical listings split by type and scoped by company/region for staff. Row-count mismatches between these pages are expected given these different intentional filters — **except** for the SO company-override bug noted above, which the user has deferred.

---

## File Structure

- Modify: `src/app/posto/page.tsx:206-253` — the `action` column definition inside the `columns` array. Only the `isRekanan` Booking `<Button>` block (lines 215-223) is removed; the rest of the action column (View/Riwayat, Print, Edit, Hapus buttons) is untouched.

---

### Task 1: Remove the Booking button from the POSTO action column

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\posto\page.tsx:210-223`

- [ ] **Step 1: Read the current action column render function to confirm exact boundaries**

Open `src/app/posto/page.tsx` and confirm the `action` column's `render` function (starting at line 210) currently looks like this:

```tsx
      render: (p) => {
        const id = p.guid;
        const noposto = p.noposto;
        return (
          <div className="flex items-center justify-start gap-1.5">
            {isRekanan && (
              <Button
                size="sm"
                className="bg-[#003473] hover:bg-[#002855] text-white rounded-none shadow-lg shadow-blue-900/20 px-3 h-7 font-black uppercase text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95 border-none"
                onClick={() => window.location.href = `/tiket/booking?guid=${id}`}
              >
                <Ticket className="h-3 w-3 mr-1" /> Booking
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="bg-brand-50 text-brand-500 border-brand-200 hover:bg-brand-100 rounded-none h-7 font-bold text-[10px] uppercase tracking-wider"
              onClick={() => handleView(id, noposto)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> {isRekanan ? "Riwayat" : "View"}
            </Button>
```

This is a read/verify step — no code changes yet.

- [ ] **Step 2: Delete the `isRekanan` Booking button block**

In `src/app/posto/page.tsx`, remove exactly this block (the `{isRekanan && (...)}` Booking button), leaving the surrounding `<div>` and the View/Riwayat button untouched:

```tsx
            {isRekanan && (
              <Button
                size="sm"
                className="bg-[#003473] hover:bg-[#002855] text-white rounded-none shadow-lg shadow-blue-900/20 px-3 h-7 font-black uppercase text-[10px] tracking-widest transition-all hover:scale-105 active:scale-95 border-none"
                onClick={() => window.location.href = `/tiket/booking?guid=${id}`}
              >
                <Ticket className="h-3 w-3 mr-1" /> Booking
              </Button>
            )}
```

After deletion, the `render` function's `<div>` should start directly with the View/Riwayat `<Button>`:

```tsx
      render: (p) => {
        const id = p.guid;
        const noposto = p.noposto;
        return (
          <div className="flex items-center justify-start gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="bg-brand-50 text-brand-500 border-brand-200 hover:bg-brand-100 rounded-none h-7 font-bold text-[10px] uppercase tracking-wider"
              onClick={() => handleView(id, noposto)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> {isRekanan ? "Riwayat" : "View"}
            </Button>
```

Do not remove the `Ticket` import at the top of the file (`lucide-react` import on line 3) — it is still used later in the file's "Riwayat Tiket" section heading (around line 544, `<Ticket className="h-5 w-5" />`).

- [ ] **Step 3: Type-check the file**

Run:
```bash
rtk tsc
```
Expected: no new TypeScript errors introduced in `src/app/posto/page.tsx` (pre-existing unrelated errors elsewhere, if any, are out of scope).

- [ ] **Step 4: Manually verify in the browser**

Start the dev server if not already running (`npm run dev` from `c:\Users\weka\Indigo\SISTROV2-next`), log in as a rekanan/transport user, and open `/posto`. Expected: the action column for each row shows View/Riwayat, Print, and (if permitted) Edit/Hapus — no "Booking" button. Confirm booking is still reachable via the dedicated `/tiket/booking` page (unaffected by this change).

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/posto/page.tsx
rtk git commit -m "fix: remove Booking button from POSTO datatable action column"
```

---

## Self-Review

**Spec coverage:**
- "hilangkan button booking di datatable posto" → Task 1 removes exactly this button.
- "cek di data posto untuk rekanan atau ekspeditur ... kenapa tidak sama dengan tiket/booking" and "banyak posto yang tidak tampil di data posto/so" → root-caused in the Investigation Notes section (SO company-override bug + intentional booking-page filtering differences); user explicitly deferred fixing the backend bug in this session, so no task implements it.

**Placeholder scan:** No TODOs; all code blocks are verbatim current/target file content.

**Type consistency:** N/A — single JSX block removal, no new types, functions, or signatures introduced.
