# Overdue Tickets Modal (Eskalasi Diperlukan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Eskalasi Diperlukan" alert on StaffAreaDashboard clickable so staff can see the full list of overdue tickets (>2 jam aktif) in a modal.

**Architecture:** Backend endpoint `GET /api/StaffDashboard/GetOverdueAlerts` already exists and returns the full list. We add a Next.js proxy route, build a modal component, then wire it into the alert banner.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Lucide icons, existing `aspnetFetchServer` pattern, no new dependencies.

---

## File Map

| Action | File |
|--------|------|
| Create | `src/app/api/staffarea/overdue-alerts/route.ts` |
| Create | `src/components/dashboard/OverdueTicketsModal.tsx` |
| Modify | `src/components/dashboard/StaffAreaDashboard.tsx` |

---

## Task 1: Next.js API Route — proxy to GetOverdueAlerts

Backend endpoint already works: `GET /api/StaffDashboard/GetOverdueAlerts?companyCode=XXX`

Returns:
```json
{
  "companyCode": "XXX",
  "totalOverdue": 3,
  "tickets": [
    {
      "tiketno": "TK-001",
      "nopol": "B 1234 XY",
      "driver": "Budi Santoso",
      "position": "03",
      "posisiLabel": "Proses Timbang",
      "timesec": "2026-05-20T04:00:00Z",
      "durasimenit": 145.0
    }
  ],
  "generatedAt": "2026-05-20T06:25:00Z"
}
```

**Files:**
- Create: `src/app/api/staffarea/overdue-alerts/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/staffarea/overdue-alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { normalizeRole } from "@/lib/role-utils";
import { cookies } from "next/headers";

const ALLOWED = new Set(["staffarea", "gudang", "pod"]);

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allRoles: string[] = ((session.user as any)?.roles as string[] | undefined) ?? [(session.user as any)?.role];
  const allowed = allRoles.some(r => ALLOWED.has(normalizeRole(r)));
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = (session?.user as any)?.aspnetToken as string;

    const { searchParams } = new URL(request.url);
    let companyCode = searchParams.get("companyCode");

    if (!companyCode) {
      const cookieStore = await cookies();
      companyCode = cookieStore.get("sistro_active_company")?.value || (session?.user as any)?.companyCode || null;
    }

    const url = companyCode
      ? `/api/StaffDashboard/GetOverdueAlerts?companyCode=${encodeURIComponent(companyCode)}`
      : "/api/StaffDashboard/GetOverdueAlerts";

    const res = await aspnetFetchServer(url, token);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[OverdueAlerts] backend ${res.status}: ${body}`);
      return NextResponse.json(
        { error: `Backend error ${res.status}`, detail: body },
        { status: res.status === 401 ? 401 : 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[OverdueAlerts] fetch threw:", error.message);
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
```

- [ ] **Step 2: Verify route file exists**

Check file was created at `src/app/api/staffarea/overdue-alerts/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/staffarea/overdue-alerts/route.ts
git commit -m "feat: add /api/staffarea/overdue-alerts proxy route"
```

---

## Task 2: OverdueTicketsModal component

**Files:**
- Create: `src/components/dashboard/OverdueTicketsModal.tsx`

**Props interface:**
```typescript
interface OverdueTicketsModalProps {
  open: boolean;
  onClose: () => void;
  companyCode?: string;
}
```

**Data types:**
```typescript
interface OverdueTicket {
  tiketno: string;
  nopol: string;
  driver: string;
  position: string;
  posisiLabel: string;
  timesec: string | null;
  durasimenit: number;
}

interface OverdueAlertsResponse {
  companyCode: string;
  totalOverdue: number;
  tickets: OverdueTicket[];
  generatedAt: string;
}
```

- [ ] **Step 1: Create the modal component**

```typescript
// src/components/dashboard/OverdueTicketsModal.tsx
"use client";
import { useEffect, useState } from "react";
import { X, AlertTriangle, Clock, Truck } from "lucide-react";

interface OverdueTicket {
  tiketno: string;
  nopol: string;
  driver: string;
  position: string;
  posisiLabel: string;
  timesec: string | null;
  durasimenit: number;
}

interface OverdueAlertsResponse {
  companyCode: string;
  totalOverdue: number;
  tickets: OverdueTicket[];
  generatedAt: string;
}

interface OverdueTicketsModalProps {
  open: boolean;
  onClose: () => void;
  companyCode?: string;
}

function formatDurasi(menit: number): string {
  const jam = Math.floor(menit / 60);
  const sisa = Math.round(menit % 60);
  if (jam === 0) return `${sisa} menit`;
  return `${jam} jam ${sisa} menit`;
}

export default function OverdueTicketsModal({ open, onClose, companyCode }: OverdueTicketsModalProps) {
  const [data, setData] = useState<OverdueAlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    const url = companyCode
      ? `/api/staffarea/overdue-alerts?companyCode=${encodeURIComponent(companyCode)}`
      : "/api/staffarea/overdue-alerts";

    fetch(url)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<OverdueAlertsResponse>;
      })
      .then(setData)
      .catch(e => setError(e.message ?? "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [open, companyCode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900/50">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-red-800 dark:text-red-300">
              Eskalasi Diperlukan
            </h2>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              Tiket aktif &gt;2 jam belum selesai
              {data && ` — ${data.totalOverdue} tiket`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Memuat...
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center justify-center py-12 text-sm text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && data && data.tickets.length === 0 && (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Tidak ada tiket overdue.
            </div>
          )}

          {!loading && !error && data && data.tickets.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-5 py-2.5">No. Tiket</th>
                  <th className="text-left px-4 py-2.5">Nopol</th>
                  <th className="text-left px-4 py-2.5">Driver</th>
                  <th className="text-left px-4 py-2.5">Posisi</th>
                  <th className="text-right px-5 py-2.5">Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {data.tickets.map((t) => (
                  <tr key={t.tiketno} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {t.tiketno}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300">
                        <Truck className="h-3.5 w-3.5 text-gray-400" />
                        {t.nopol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                      {t.driver || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                        {t.posisiLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400 font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDurasi(t.durasimenit)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {data && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 text-right">
            Data per: {new Date(data.generatedAt).toLocaleTimeString("id-ID")}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify component renders without errors by checking imports exist**

Verify these imports resolve in your project:
- `lucide-react` — already used in `StaffAreaDashboard.tsx` ✓
- No new dependencies needed

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/OverdueTicketsModal.tsx
git commit -m "feat: add OverdueTicketsModal component for escalation list"
```

---

## Task 3: Wire modal into StaffAreaDashboard

**Files:**
- Modify: `src/components/dashboard/StaffAreaDashboard.tsx` (lines 1–10 imports, lines 33–37 state, lines 163–174 alert section)

Current alert (lines 163–174) is a plain `<div>`. We convert it to a button that opens the modal.

- [ ] **Step 1: Add import for modal and state**

In `StaffAreaDashboard.tsx`, add modal import after existing imports (after line 11):

```typescript
import OverdueTicketsModal from "@/components/dashboard/OverdueTicketsModal";
```

- [ ] **Step 2: Add modal open state**

After the existing state declarations (after line 37 `const [refreshing, setRefreshing] = useState(false);`), add:

```typescript
const [overdueModalOpen, setOverdueModalOpen] = useState(false);
```

- [ ] **Step 3: Replace the alert div with a clickable button**

Find and replace the overdue alert section (lines 163–174):

**Old code:**
```tsx
      {/* ── Overdue alert ──────────────────────────────────────────────────── */}
      {(stats?.overdueCount ?? 0) > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Eskalasi Diperlukan — <strong>{stats?.overdueCount}</strong> tiket &gt;2 jam belum selesai</p>
            <p className="text-xs font-normal mt-0.5 text-red-500">
              Koordinasikan dengan Gudang segera.
            </p>
          </div>
        </div>
      )}
```

**New code:**
```tsx
      {/* ── Overdue alert ──────────────────────────────────────────────────── */}
      {(stats?.overdueCount ?? 0) > 0 && (
        <>
          <button
            onClick={() => setOverdueModalOpen(true)}
            className="w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold">Eskalasi Diperlukan — <strong>{stats?.overdueCount}</strong> tiket &gt;2 jam belum selesai</p>
              <p className="text-xs font-normal mt-0.5 text-red-500">
                Klik untuk lihat daftar tiket · Koordinasikan dengan Gudang segera.
              </p>
            </div>
          </button>

          <OverdueTicketsModal
            open={overdueModalOpen}
            onClose={() => setOverdueModalOpen(false)}
            companyCode={activeCompanyCode ?? stats?.companyCode}
          />
        </>
      )}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/StaffAreaDashboard.tsx
git commit -m "feat: make escalation alert clickable, opens overdue tickets modal"
```

---

## Task 4: Manual verification

- [ ] **Step 1: Start dev server**

```bash
# From SISTROV2-next root:
npm run dev
# or from sistropigroup root:
.\start-dev.ps1
```

- [ ] **Step 2: Navigate to dashboard as StaffArea/Gudang role**

Go to `http://localhost:3000/dashboard`.

- [ ] **Step 3: Verify alert is clickable**

If `overdueCount > 0`: red alert banner appears. Click it → modal opens with table of overdue tickets (tiketno, nopol, driver, posisi, durasi).

If `overdueCount === 0`: alert not shown (correct behavior, nothing to click).

- [ ] **Step 4: Verify modal behavior**

- Modal opens on click ✓
- Clicking backdrop or X closes modal ✓
- Table sorted by durasi descending (longest first, handled by backend) ✓
- Durasi formatted as "X jam Y menit" ✓
- Loading state shows "Memuat..." ✓
- Error state shows error message ✓

---

## Self-Review: Spec Coverage

| Requirement | Covered |
|-------------|---------|
| Section "Eskalasi Diperlukan — N tiket >2 jam belum selesai" | ✓ Task 3 — alert becomes clickable |
| Staff area dashboard | ✓ StaffAreaDashboard.tsx modified |
| Buka tiket (see ticket list) | ✓ Modal shows tiketno, nopol, driver, posisi, durasi |
| Munculkan dalam page atau modal | ✓ Modal approach chosen (no new page needed, stays on dashboard) |
| Backend data | ✓ GetOverdueAlerts already returns all needed fields |
| Company switcher compatibility | ✓ companyCode passed to API route + modal |
