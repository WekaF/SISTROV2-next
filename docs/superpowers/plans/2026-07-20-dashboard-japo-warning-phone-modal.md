# Dashboard JAPO Warning Card + Phone-Number Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Notifikasi Jatuh Tempo" (JAPO) warning card to the transportir dashboard listing outstanding POSTO due-dates, and a dismissible phone-number-missing modal for transportir users whose account has no phone number — porting the data/behavior scheme from the legacy ASP.NET app (`sistropigroup`) but rebuilt in this repo's own Tailwind/shadcn design language.

**Architecture:** Two new client components (`JapoWarningCard`, `PhoneNumberModal`) mounted inside the existing `TransportDashboard` component. Both call the ASP.NET backend directly through the existing `/aspnet-proxy` rewrite via the `useApi()` hook (same pattern already used by `src/app/pengajuan/jatuh-tempo/page.tsx`) — no new Next.js API route is needed. JAPO data comes from `GET /api/Apg/getDataNotif`; phone-number check/save comes from `GET /api/Home/PhoneNumberForModal` and `POST /api/Home/Simpan_PhoneNumberforModal`, all pre-existing backend endpoints.

**Tech Stack:** Next.js 16 (App Router), React Query (`@tanstack/react-query`), Tailwind CSS, shadcn-style `Dialog` (`@base-ui/react/dialog`), `lucide-react` icons, existing `useApi`/`useToast` hooks.

---

## Background (verified from source)

- **JAPO** = "Jatuh Tempo POSTO" — the due date for a transportir to finish goods-receipt against a PO. The old dashboard widget is titled **"Notifikasi Jatuh Tempo"**.
- Old widget: `sistropigroup/SISTROAWESOME/Views/Home/Index.cshtml:446-471` (card shell) + JS `getListNotif()` at line 1096, fed by `api/ApgController.cs:344-395` `getDataNotif()`, which returns `{ data: [PengajuanJapoView, ...] }`, already filtered server-side to only outstanding items for the logged-in transportir's vendor code. Displayed fields per row: `NoPosto`, `TglJatuhTempo` (formatted long date), `KuantumTerlambat` (ton). Card auto-hides content and shows a green "Semua Aman!" empty state when the list is empty.
- **This repo already calls the same `ApgController` routes** through `/aspnet-proxy` in `src/app/pengajuan/jatuh-tempo/page.tsx` (e.g. `apiTable("/api/Apg/DatatablePengajuanJapo", …)`), confirming `getDataNotif` is reachable the same way with zero new backend work.
- **Phone modal (old):** `sistropigroup/SISTROAWESOME/Views/Home/Index.cshtml:732-768` + JS at 803-805, 1069-1073. Triggered when `GET api/Home/PhoneNumberForModal` (`api/HomeController.cs:487-508`) returns an empty/null `PhoneNumber` for a Transport-role user. Saved via `POST api/Home/Simpan_PhoneNumberforModal` (`api/HomeController.cs:510-532`), which reads `param.PhoneNumber` from the JSON body and writes it to `AspNetUsers` for the **server-resolved** logged-in user (`myUserId`) — the client only needs to send `{ PhoneNumber: "..." }`, nothing else. **Not blocking**: has a "Tutup" (close) button, user can dismiss and keep using the app.
- New app target: `TransportDashboard` component at `src/components/dashboard/TransportDashboard.tsx`, rendered for `role === "transport" || role === "rekanan"` (`src/components/dashboard/DashboardClient.tsx:98`). It already establishes the card/color/icon conventions to match: shadcn `Card`/`CardHeader`/`CardTitle`/`CardContent` from `@/components/ui/card`, `shadow-theme-xs` on every card, amber (`bg-amber-50 dark:bg-amber-900/20`, `text-amber-600`) for warnings, red (`text-red-600`/`bg-red-50`) for overdue/critical, `lucide-react` icons (see `FleetHealth` and `PostoAnalytics`'s gap card in that file for the closest existing "warning list" patterns).
- Modal pattern already in this repo: `@/components/ui/dialog` (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`), used e.g. in `src/app/armada/page.tsx:914-919`.
- `useApi()` (`src/hooks/use-api.ts`) exposes `apiJson<T>(path, options)` and `apiFetch(path, options)`, auto-adding `Authorization: Bearer <aspnetToken>` and proxying through `/aspnet-proxy`.
- `useToast()` (`src/components/ui/toast.tsx`) exposes `addToast({ title, description, variant })`, `variant` one of `"default" | "success" | "destructive" | "warning" | "info"`.
- This repo has **no test framework installed** (`vitest`/`jest`/`@testing-library` absent from `package.json`, no `*.test.tsx` files anywhere) and no existing component tests for dashboard widgets — verification for this plan is manual, in the browser, per the project's own convention for UI changes.

## Scope note

This is one cohesive feature (dashboard warning card + related account-completeness modal), both driven by the same "transportir dashboard onboarding" need and touching the same single file (`TransportDashboard.tsx`) for wiring — not split into separate plans.

---

## File Structure

| File | Responsibility |
|---|---|
| Create: `src/components/dashboard/JapoWarningCard.tsx` | Fetches `getDataNotif`, renders the outstanding-JAPO list card (or "Semua Aman!" empty state) |
| Create: `src/components/dashboard/PhoneNumberModal.tsx` | Fetches phone-number status, shows dismissible modal + save form if missing |
| Modify: `src/components/dashboard/TransportDashboard.tsx` | Import and render both new components |

---

### Task 1: JAPO Warning Card

**Files:**
- Create: `src/components/dashboard/JapoWarningCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, CheckCircle2, Copy, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

interface JapoNotifItem {
  NoPosto: string;
  TglJatuhTempo: string;
  KuantumTerlambat: number;
}

function formatTanggalJapo(val?: string | null): string {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export function JapoWarningCard() {
  const { apiJson } = useApi();
  const { addToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["japo-notif"],
    queryFn: () => apiJson<{ data: JapoNotifItem[] }>("/api/Apg/getDataNotif"),
    staleTime: 1000 * 60 * 3,
  });

  const items = data?.data ?? [];

  const copyNoPosto = (nopo: string) => {
    navigator.clipboard.writeText(nopo);
    addToast({ title: "Disalin", description: `${nopo} disalin ke clipboard`, variant: "success" });
  };

  if (isLoading) {
    return (
      <Card className="shadow-theme-xs">
        <CardContent className="p-5 animate-pulse">
          <div className="h-5 w-40 bg-gray-100 dark:bg-gray-800 rounded mb-4" />
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-theme-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-amber-500" />
            Notifikasi Jatuh Tempo
          </CardTitle>
          <Link
            href="/pengajuan/jatuh-tempo"
            className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600"
          >
            Lihat Semua <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Semua Aman!</p>
            <p className="text-xs text-gray-400">Tidak ada tagihan atau jatuh tempo saat ini.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.NoPosto}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 dark:text-white font-mono truncate">
                      PO: {item.NoPosto}
                    </p>
                    <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-red-600 border border-red-100 dark:bg-gray-900 dark:border-red-900/40">
                      {formatTanggalJapo(item.TglJatuhTempo)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Terlambat: <span className="font-bold text-red-600">{item.KuantumTerlambat ?? 0} Ton</span>
                    </p>
                    <button
                      onClick={() => copyNoPosto(item.NoPosto)}
                      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-500"
                    >
                      <Copy className="h-3 w-3" /> Salin
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/JapoWarningCard.tsx
git commit -m "feat: add JAPO due-date warning card component"
```

---

### Task 2: Phone-Number Modal

**Files:**
- Create: `src/components/dashboard/PhoneNumberModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

export function PhoneNumberModal() {
  const { apiJson, apiFetch } = useApi();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["phone-number-modal"],
    queryFn: () => apiJson<{ PhoneNumber: string | null }>("/api/Home/PhoneNumberForModal"),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!data || dismissed) return;
    if (!data.PhoneNumber) setOpen(true);
  }, [data, dismissed]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setDismissed(true);
  };

  const handleSave = async () => {
    if (!phone.trim()) {
      addToast({ title: "Validasi", description: "No. Telp / HP tidak boleh kosong", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/Home/Simpan_PhoneNumberforModal", {
        method: "POST",
        body: JSON.stringify({ PhoneNumber: phone.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast({ title: "Berhasil", description: "No. Telp / HP berhasil disimpan", variant: "success" });
      setDismissed(true);
      setOpen(false);
    } catch (err: any) {
      addToast({ title: "Gagal", description: err?.message || "Gagal menyimpan No. Telp / HP", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
            <Phone className="h-6 w-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center">Informasi Akun Diperlukan</DialogTitle>
          <p className="text-center text-sm text-muted-foreground">
            Kami memerlukan nomor telepon Anda untuk melanjutkan.
          </p>
        </DialogHeader>
        <Input
          type="tel"
          placeholder="Masukkan No. Telp / No. Hp"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Tutup
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/PhoneNumberModal.tsx
git commit -m "feat: add missing-phone-number modal component"
```

---

### Task 3: Wire both into TransportDashboard

**Files:**
- Modify: `src/components/dashboard/TransportDashboard.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/components/dashboard/TransportDashboard.tsx`, after the existing `Card` import (line 10), add:

```tsx
import { JapoWarningCard } from "./JapoWarningCard";
import { PhoneNumberModal } from "./PhoneNumberModal";
```

- [ ] **Step 2: Mount `PhoneNumberModal` unconditionally at the top of the render, and `JapoWarningCard` as a new row right after the KPI row**

In the same file, find the main return block (currently starting `return (\n    <div className="space-y-6">`, around line 508). Change:

```tsx
  return (
    <div className="space-y-6">
      {/* Refresh button */}
      <div className="flex justify-end">
```

to:

```tsx
  return (
    <div className="space-y-6">
      <PhoneNumberModal />

      {/* Refresh button */}
      <div className="flex justify-end">
```

Then find the KPI row block (around lines 522-525):

```tsx
      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card) => <KpiCard key={card.label} {...card} />)}
      </div>
```

and add the JAPO card immediately after it, before the "Row 2" comment:

```tsx
      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card) => <KpiCard key={card.label} {...card} />)}
      </div>

      {/* Row 1.5 — JAPO warning */}
      <JapoWarningCard />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/TransportDashboard.tsx
git commit -m "feat: wire JAPO warning card and phone-number modal into transport dashboard"
```

---

### Task 4: Manual verification

No test framework exists in this repo for UI components (confirmed: no `vitest`/`jest`/`@testing-library` in `package.json`, no `*.test.tsx` files). Verify by running the app and exercising both features directly, per this project's own convention for frontend changes.

**Files:** none (verification only)

- [ ] **Step 1: Start both projects**

```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```

Wait for both the local IIS Express backend (port 8090) and the Next.js dev server to report ready.

- [ ] **Step 2: Log in as a transportir/rekanan user and open the dashboard**

Navigate to the dashboard route in the browser. Confirm:
- The "Notifikasi Jatuh Tempo" card renders below the KPI row.
- If the logged-in vendor has outstanding JAPO items, each row shows `PO: <NoPosto>`, a formatted due date badge, `Terlambat: N Ton`, and a working "Salin" button (click it, confirm a toast appears and the PO number is on the clipboard).
- If there are no outstanding items, the card shows the green "Semua Aman!" empty state instead.
- "Lihat Semua" navigates to `/pengajuan/jatuh-tempo`.

- [ ] **Step 3: Verify the phone-number modal**

Using a transportir test account known to have an empty `PhoneNumber` in `AspNetUsers` (check via `sqlcmd` against the backend DB, or temporarily clear it for a test account), reload the dashboard and confirm:
- The modal pops up automatically titled "Informasi Akun Diperlukan".
- Clicking "Tutup" or the backdrop closes it without saving, and it does not reopen on its own within the same page session (only re-check on a fresh reload).
- Entering a phone number and clicking "Simpan" shows a success toast, closes the modal, and reloading the dashboard no longer shows the modal (confirm the value persisted by checking `AspNetUsers.PhoneNumber` in the DB or by calling `GET /aspnet-proxy/api/Home/PhoneNumberForModal` again).
- For an account that already has a phone number, confirm the modal never appears.

- [ ] **Step 4: Check for regressions**

Confirm the rest of the transport dashboard (KPI cards, trend chart, Fleet Health, POSTO Analytics, tiket table) still render and refresh correctly — the new card/modal should not shift or break any existing layout.

---

## Self-Review Notes

- **Spec coverage:** JAPO warning card ✓ (Task 1 + 3), styled per SISTROV2-next's own design system rather than copied Bootstrap markup ✓, modal for missing phone number ✓ (Task 2 + 3), matching the old app's non-blocking/dismissible behavior ✓.
- **No placeholders:** all steps contain complete, runnable code; no TBD/"add validation later" markers.
- **Type consistency:** `JapoNotifItem` (Task 1) and the `{ PhoneNumber }` shape (Task 2) match the verified backend response shapes (`getDataNotif` → `{ data: [...] }`; `PhoneNumberForModal` → `{ PhoneNumber }`); `useApi()`/`useToast()` call signatures match their existing usage in `src/app/pengajuan/jatuh-tempo/page.tsx`.
