# Notification Detail Links + All-Notifications Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking any notification (dropdown or a new `/notifications` page) marks that one notification read and navigates to the page showing the thing it's about. Add a `/notifications` page with a load-more list and a read/unread filter.

**Architecture:** One nullable Prisma column (`sourceLabel`) carries the human-facing identifier (nopol/noposto/guid) each target page's existing detail-view mechanism needs — no new detail-fetch logic anywhere, every target page already has a way to show one record by ID (a query-driven detail modal, or a search filter). One shared `getNotificationHref()` maps `(type, sourceId, sourceLabel)` to a URL. One shared `DataTable` prop (`initialSearch`) gives every table-based page deep-link-by-search for free.

**Tech Stack:** Next.js 16 App Router, TypeScript, `@tanstack/react-query` (`useInfiniteQuery` for the new page), Prisma/Postgres.

**Full spec:** `docs/superpowers/specs/2026-07-18-notification-detail-links-design.md`

**No test framework in this repo** (established convention) — verification is `npx tsc --noEmit` after each task, then a manual click-through pass at the end (Task 11).

---

### Task 1: Prisma — add `sourceLabel` to `Notification`

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\prisma\schema.prisma`

- [ ] **Step 1: Add the field**

Find (currently L44-57):
```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  userId    String   // session.user.username
  type      String   // "POSTO_BARU" | "ARMADA_APPROVED" | "ARMADA_REJECTED" | "ARMADA_BLOCKED" | "ARMADA_UNBLOCKED" | "PENGAJUAN_BARU"
  title     String
  message   String
  sourceId  String   // backend entity id (posto id / armada review id), for display/debugging
  dedupeKey String   @unique // `${userId}:${type}:${sourceId}`
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```
Replace with:
```prisma
model Notification {
  id           Int      @id @default(autoincrement())
  userId       String   // session.user.username
  type         String   // "POSTO_BARU" | "ARMADA_APPROVED" | "ARMADA_REJECTED" | "ARMADA_BLOCKED" | "ARMADA_UNBLOCKED" | "PENGAJUAN_BARU"
  title        String
  message      String
  sourceId     String   // backend entity id: Posto.guid for POSTO_BARU, ArmadaReview.ID or Armada.ID (as string) otherwise
  sourceLabel  String?  // human-facing identifier the target page's detail view needs: noposto, or nopol
  dedupeKey    String   @unique // `${userId}:${type}:${sourceId}`
  isRead       Boolean  @default(false)
  createdAt    DateTime @default(now())

  @@index([userId, isRead])
  @@index([userId, createdAt])
}
```

- [ ] **Step 2: Generate and run the migration**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx prisma migrate dev --name add_notification_source_label
```
Expected: creates `prisma/migrations/<timestamp>_add_notification_source_label/migration.sql` (an `ALTER TABLE "Notification" ADD COLUMN "sourceLabel" TEXT;`) and applies it without error.

- [ ] **Step 3: Verify the client regenerated**

```bash
grep -c "sourceLabel" node_modules/.prisma/client/index.d.ts
```
Expected: nonzero.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```
Expected: 0 errors (nothing references `sourceLabel` yet, this just confirms the schema/client change alone doesn't break anything).

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Notification.sourceLabel for deep-link target pages"
```

---

### Task 2: Sync files — pass `sourceLabel` through, fix posto's identifier to use `guid`

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\lib\notifications\sync-transportir.ts`
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\lib\notifications\sync-staffarea.ts`

`POSTOController.DataTable()` (the backend endpoint `sync-transportir.ts`'s posto block calls) projects both `id` (numeric) and `guid` (string) per row (`Models/ArmadaView.cs`-adjacent `POSTOView`, confirmed in `POSTOController.cs:255-256`). The frontend's existing posto detail-view handler (`src/app/posto/page.tsx`'s `handleView(id: string, noposto?: string)`, used at `posto/page.tsx:219`) expects the **guid**, not the numeric id — `POSTO_BARU` notifications must track/carry the guid as `sourceId` for the deep link to work, not the numeric id used so far. There are currently zero `NotificationSourceState` rows of `sourceType: "posto"` in the database (confirmed this session — the posto sync never successfully wrote anything until an earlier fix today), so switching identifiers now has no migration/backward-compat concern.

- [ ] **Step 1: `sync-transportir.ts` — add `guid` to `PostoRow`, switch posto tracking to use it**

Find (L5-8):
```typescript
interface PostoRow {
  id: number;
  noposto: string;
}
```
Replace with:
```typescript
interface PostoRow {
  id: number;
  guid: string;
  noposto: string;
}
```

- [ ] **Step 2: `sync-transportir.ts` — add `sourceLabel` param to `createNotificationOnce`**

Find (L50-63):
```typescript
async function createNotificationOnce(
  userId: string,
  type: string,
  title: string,
  message: string,
  sourceId: string,
) {
  const dedupeKey = `${userId}:${type}:${sourceId}`;
  await prismaLog.notification.upsert({
    where: { dedupeKey },
    update: {},
    create: { userId, type, title, message, sourceId, dedupeKey },
  });
}
```
Replace with:
```typescript
async function createNotificationOnce(
  userId: string,
  type: string,
  title: string,
  message: string,
  sourceId: string,
  sourceLabel: string | null,
) {
  const dedupeKey = `${userId}:${type}:${sourceId}`;
  await prismaLog.notification.upsert({
    where: { dedupeKey },
    update: {},
    create: { userId, type, title, message, sourceId, sourceLabel, dedupeKey },
  });
}
```

- [ ] **Step 3: `sync-transportir.ts` — posto block: track by `guid`, pass `noposto` as label**

Find (L90-105):
```typescript
    for (const row of data) {
      const result = await seedOrDiff(userId, "posto", String(row.id), "seen");
      if (result === "new" && hasPriorPostoSync) {
        await createNotificationOnce(
          userId,
          "POSTO_BARU",
          "Posto baru",
          `Posto baru ${row.noposto} telah dibuat untuk Anda.`,
          String(row.id),
        );
      }
    }
```
Replace with:
```typescript
    for (const row of data) {
      const result = await seedOrDiff(userId, "posto", row.guid, "seen");
      if (result === "new" && hasPriorPostoSync) {
        await createNotificationOnce(
          userId,
          "POSTO_BARU",
          "Posto baru",
          `Posto baru ${row.noposto} telah dibuat untuk Anda.`,
          row.guid,
          row.noposto,
        );
      }
    }
```

- [ ] **Step 4: `sync-transportir.ts` — armada review block: pass `row.nopol` as label**

Find (L133-151):
```typescript
      if (result === "changed") {
        if (row.aprrovestatus === "Sudah diapprove") {
          await createNotificationOnce(
            userId,
            "ARMADA_APPROVED",
            "Armada disetujui",
            `Pengajuan armada ${row.nopol} telah disetujui.`,
            String(row.ID),
          );
        } else if (row.aprrovestatus === "Ditolak/Revisi") {
          await createNotificationOnce(
            userId,
            "ARMADA_REJECTED",
            "Armada ditolak",
            `Pengajuan armada ${row.nopol} ditolak / perlu revisi.`,
            String(row.ID),
          );
        }
      }
```
Replace with:
```typescript
      if (result === "changed") {
        if (row.aprrovestatus === "Sudah diapprove") {
          await createNotificationOnce(
            userId,
            "ARMADA_APPROVED",
            "Armada disetujui",
            `Pengajuan armada ${row.nopol} telah disetujui.`,
            String(row.ID),
            row.nopol,
          );
        } else if (row.aprrovestatus === "Ditolak/Revisi") {
          await createNotificationOnce(
            userId,
            "ARMADA_REJECTED",
            "Armada ditolak",
            `Pengajuan armada ${row.nopol} ditolak / perlu revisi.`,
            String(row.ID),
            row.nopol,
          );
        }
      }
```

- [ ] **Step 5: `sync-transportir.ts` — armada blocked block: pass `row.nopol` as label**

Find (L177-195):
```typescript
      if (result === "changed" || (result === "new" && row.IsBlocked)) {
        if (row.IsBlocked) {
          await createNotificationOnce(
            userId,
            "ARMADA_BLOCKED",
            "Armada diblokir",
            `Armada ${row.nopol} telah diblokir.`,
            String(row.ID),
          );
        } else {
          await createNotificationOnce(
            userId,
            "ARMADA_UNBLOCKED",
            "Armada dibuka blokirnya",
            `Armada ${row.nopol} tidak lagi diblokir.`,
            String(row.ID),
          );
        }
      }
```
Replace with:
```typescript
      if (result === "changed" || (result === "new" && row.IsBlocked)) {
        if (row.IsBlocked) {
          await createNotificationOnce(
            userId,
            "ARMADA_BLOCKED",
            "Armada diblokir",
            `Armada ${row.nopol} telah diblokir.`,
            String(row.ID),
            row.nopol,
          );
        } else {
          await createNotificationOnce(
            userId,
            "ARMADA_UNBLOCKED",
            "Armada dibuka blokirnya",
            `Armada ${row.nopol} tidak lagi diblokir.`,
            String(row.ID),
            row.nopol,
          );
        }
      }
```

- [ ] **Step 6: `sync-staffarea.ts` — add `sourceLabel: row.nopol` to the notification upsert**

Find (L68-80):
```typescript
    if (!hasPriorSync) continue;

    const dedupeKey = `${userId}:PENGAJUAN_BARU:${row.ID}`;
    await prismaLog.notification.upsert({
      where: { dedupeKey },
      update: {},
      create: {
        userId,
        type: "PENGAJUAN_BARU",
        title: "Pengajuan armada baru",
        message: `${row.transportir} mengajukan armada ${row.nopol} untuk disetujui.`,
        sourceId,
        dedupeKey,
      },
    });
```
Replace with:
```typescript
    if (!hasPriorSync) continue;

    const dedupeKey = `${userId}:PENGAJUAN_BARU:${row.ID}`;
    await prismaLog.notification.upsert({
      where: { dedupeKey },
      update: {},
      create: {
        userId,
        type: "PENGAJUAN_BARU",
        title: "Pengajuan armada baru",
        message: `${row.transportir} mengajukan armada ${row.nopol} untuk disetujui.`,
        sourceId,
        sourceLabel: row.nopol,
        dedupeKey,
      },
    });
```

- [ ] **Step 7: Typecheck**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/lib/notifications/sync-transportir.ts src/lib/notifications/sync-staffarea.ts
git commit -m "feat: carry sourceLabel through notification sync, track posto by guid"
```

---

### Task 3: `getNotificationHref` helper

**Files:**
- Create: `C:\Users\weka\Indigo\SISTROV2-next\src\lib\notifications\href.ts`

- [ ] **Step 1: Write the file**

```typescript
/**
 * Maps a notification to the URL it should navigate to when clicked.
 * Every target page already has an existing way to show one specific record
 * (a detail modal driven by a query param, or a search filter) — this only
 * builds the URL, it does not add any new detail-fetch logic anywhere.
 */
export function getNotificationHref(
  type: string,
  sourceId: string,
  sourceLabel: string | null,
): string {
  switch (type) {
    case "POSTO_BARU": {
      const params = new URLSearchParams({ id: sourceId });
      if (sourceLabel) params.set("noposto", sourceLabel);
      return `/posto?${params.toString()}`;
    }
    case "ARMADA_APPROVED":
    case "ARMADA_REJECTED":
    case "PENGAJUAN_BARU":
      return `/armada/pengajuan?id=${encodeURIComponent(sourceId)}`;
    case "ARMADA_BLOCKED":
    case "ARMADA_UNBLOCKED":
      return sourceLabel ? `/armada?nopol=${encodeURIComponent(sourceLabel)}` : "/armada";
    default:
      return "/";
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/lib/notifications/href.ts
git commit -m "feat: add getNotificationHref for notification click-to-navigate"
```

---

### Task 4: Extend `GET /api/notifications` for pagination + unread filter

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\api\notifications\route.ts`

- [ ] **Step 1: Rewrite the GET handler**

Find (the whole file, L1-45):
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";
import { normalizeRole } from "@/lib/role-utils";
import { syncTransportirNotifications } from "@/lib/notifications/sync-transportir";
import { syncStaffareaNotifications } from "@/lib/notifications/sync-staffarea";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username || !user?.aspnetToken) {
    return NextResponse.json({ data: [], unreadCount: 0 }, { status: 401 });
  }

  const role = normalizeRole(user.role);
  const syncSession = {
    username: user.username,
    companyCode: user.companyCode ?? null,
    aspnetToken: user.aspnetToken,
  };

  try {
    if (role === "transport" || role === "rekanan") {
      await syncTransportirNotifications(syncSession);
    } else if (role === "staffarea" || role === "pod") {
      await syncStaffareaNotifications(syncSession);
    }
  } catch (err) {
    console.error("[notifications] sync failed", err);
    // Fall through and still return whatever notifications already exist.
  }

  const notifications = await prismaLog.notification.findMany({
    where: { userId: user.username },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const unreadCount = await prismaLog.notification.count({
    where: { userId: user.username, isRead: false },
  });

  return NextResponse.json({ data: notifications, unreadCount });
}
```
Replace with:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";
import { normalizeRole } from "@/lib/role-utils";
import { syncTransportirNotifications } from "@/lib/notifications/sync-transportir";
import { syncStaffareaNotifications } from "@/lib/notifications/sync-staffarea";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username || !user?.aspnetToken) {
    return NextResponse.json({ data: [], unreadCount: 0, nextCursor: null }, { status: 401 });
  }

  const role = normalizeRole(user.role);
  const syncSession = {
    username: user.username,
    companyCode: user.companyCode ?? null,
    aspnetToken: user.aspnetToken,
  };

  try {
    if (role === "transport" || role === "rekanan") {
      await syncTransportirNotifications(syncSession);
    } else if (role === "staffarea" || role === "pod") {
      await syncStaffareaNotifications(syncSession);
    }
  } catch (err) {
    console.error("[notifications] sync failed", err);
    // Fall through and still return whatever notifications already exist.
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const unreadOnly = searchParams.get("unreadOnly") === "1";
  const take = Math.min(Number(searchParams.get("take")) || 30, 100);

  const notifications = await prismaLog.notification.findMany({
    where: {
      userId: user.username,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: Number(cursor) } } : {}),
  });
  const unreadCount = await prismaLog.notification.count({
    where: { userId: user.username, isRead: false },
  });
  const nextCursor = notifications.length === take ? notifications[notifications.length - 1].id : null;

  return NextResponse.json({ data: notifications, unreadCount, nextCursor });
}
```

This stays backward-compatible with the dropdown's existing no-param call (`fetch("/api/notifications")`) — `cursor`/`unreadOnly` absent means the exact same query as before (`take: 30`, no `isRead` filter), plus the response now also carries `nextCursor` (an extra field the dropdown's current code simply ignores, since it only reads `data`/`unreadCount`).

- [ ] **Step 2: Typecheck**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/app/api/notifications/route.ts
git commit -m "feat: add cursor pagination and unread filter to GET /api/notifications"
```

---

### Task 5: `DataTable` — add `initialSearch` prop

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\components\ui\DataTable.tsx`

- [ ] **Step 1: Add the prop to the interface**

Find (L35-51):
```typescript
interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  queryKey: (string | number | null | undefined)[];
  fetcher: (params: DataTableParams) => Promise<DataTableResult<T>>;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  rowKey: (row: T) => string | number | null | undefined;
  rowClassName?: (row: T) => string;
  emptyText?: string;
  refetchInterval?: number;
  borderless?: boolean;
  striped?: boolean;
  compact?: boolean;
  hideGlobalSearch?: boolean; // New prop to hide global search
}
```
Replace with:
```typescript
interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  queryKey: (string | number | null | undefined)[];
  fetcher: (params: DataTableParams) => Promise<DataTableResult<T>>;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  rowKey: (row: T) => string | number | null | undefined;
  rowClassName?: (row: T) => string;
  emptyText?: string;
  refetchInterval?: number;
  borderless?: boolean;
  striped?: boolean;
  compact?: boolean;
  hideGlobalSearch?: boolean; // New prop to hide global search
  initialSearch?: string; // Seeds the search box on mount (e.g. from a ?nopol= deep link)
}
```

- [ ] **Step 2: Seed both `search` and `debouncedSearch` from it**

Find (L53-72):
```typescript
export function DataTable<T>({
  columns,
  queryKey,
  fetcher,
  searchPlaceholder = "Cari...",
  toolbar,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  rowKey,
  rowClassName,
  emptyText = "Data tidak ditemukan.",
  refetchInterval,
  borderless = false,
  striped = false,
  compact = false,
  hideGlobalSearch = false, // Default to false
}: DataTableProps<T>) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
```
Replace with:
```typescript
export function DataTable<T>({
  columns,
  queryKey,
  fetcher,
  searchPlaceholder = "Cari...",
  toolbar,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  rowKey,
  rowClassName,
  emptyText = "Data tidak ditemukan.",
  refetchInterval,
  borderless = false,
  striped = false,
  compact = false,
  hideGlobalSearch = false, // Default to false
  initialSearch,
}: DataTableProps<T>) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(initialSearch ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch ?? "");
```

Seeding `debouncedSearch` too (not just `search`) means a deep-linked page fires its filtered fetch immediately on mount, instead of waiting out the normal 400ms typing-debounce for no reason.

- [ ] **Step 3: Typecheck**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/components/ui/DataTable.tsx
git commit -m "feat: add initialSearch prop to DataTable for deep-linking"
```

---

### Task 6: `/armada` — read `?nopol=` and prefill the table search

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\armada\page.tsx`

`useSearchParams()` requires the component to be inside a `<Suspense>` boundary (Next.js App Router requirement) — this page currently has no such wrapper, so this task also restructures the file's export into an inner content component + a Suspense-wrapped default export, matching the existing pattern already used in `src/app/tiket/page.tsx`.

- [ ] **Step 1: Add imports**

Find (L2):
```tsx
import React, { useState, useEffect } from "react";
```
Replace with:
```tsx
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
```

- [ ] **Step 2: Rename the component function, read the query param**

Find (L85, the start of the component):
```tsx
export default function ArmadaPage() {
  const { data: session } = useSession();
```
Replace with:
```tsx
function ArmadaPageContent() {
  const searchParams = useSearchParams();
  const initialNopolSearch = searchParams.get("nopol") ?? undefined;
  const { data: session } = useSession();
```

- [ ] **Step 3: Pass it into `DataTable`**

Find (L726-731):
```tsx
          <DataTable
            columns={columns}
            queryKey={["armada", role, companyCode]}
            fetcher={fetcher}
            rowKey={(f) => f.__key}
            searchPlaceholder={isRekanan ? "Cari Nopol..." : "Cari Nopol atau Transporter..."}
```
Replace with:
```tsx
          <DataTable
            columns={columns}
            queryKey={["armada", role, companyCode]}
            fetcher={fetcher}
            rowKey={(f) => f.__key}
            searchPlaceholder={isRekanan ? "Cari Nopol..." : "Cari Nopol atau Transporter..."}
            initialSearch={initialNopolSearch}
```

- [ ] **Step 4: Add the Suspense-wrapped default export at the end of the file**

Find (the last 5 lines of the file — the closing of `ArmadaPageContent`, formerly `ArmadaPage`):
```tsx
        </DialogContent>
      </Dialog>
    </div>
  );
}
```
Replace with:
```tsx
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ArmadaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Memuat data armada...</div>}>
      <ArmadaPageContent />
    </Suspense>
  );
}
```

**Note on Step 4's "Find" text:** this file has multiple `<Dialog>` blocks (submission, delete, edit, blokir), so the literal 5-line closing pattern may not be unique. This edit must land at the very end of the file (the true final `}` closing `ArmadaPageContent`, confirmed via `tail -5` on the file before editing) — if the Edit tool reports the match isn't unique, append after the last occurrence specifically (verify with `tail` first), not the first one it finds.

- [ ] **Step 5: Typecheck**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/app/armada/page.tsx
git commit -m "feat: /armada reads ?nopol= to prefill search for notification deep links"
```

---

### Task 7: `/posto` — read `?id=&noposto=` and auto-open the detail modal

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\posto\page.tsx`

Same Suspense restructure as Task 6, applied to this file.

- [ ] **Step 1: Add imports**

Find (L2):
```tsx
import React, { useState } from "react";
```
Replace with:
```tsx
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
```

- [ ] **Step 2: Rename the component function**

Find (L17):
```tsx
export default function PostoPage() {
```
Replace with:
```tsx
function PostoPageContent() {
  const searchParams = useSearchParams();
```

- [ ] **Step 3: Auto-open the detail modal when `?id=` is present**

Find (the end of `handleView`'s definition, L116-133):
```tsx
  const handleView = async (id: string, noposto?: string) => {
    try {
      const res = await apiTable("/api/POSTO/DetailData", { guid: id, noposto: noposto || id, cmd: 'refresh' });
      const data = res?.response || (res?.noposto ? res : res?.data) || res;

      // Ensure guid is preserved from the 'id' parameter if missing in response
      const enrichedData = {
        ...data,
        guid: data.guid || data.Guid || id
      };

      setSelectedPosto(enrichedData);
      setIsViewOpen(true);
    } catch (error: any) {
      console.error("Detail Fetch Error:", error);
      addToast({ title: "Error", description: "Gagal memuat detail POSTO", variant: "destructive" });
    }
  };
```
Replace with:
```tsx
  const handleView = async (id: string, noposto?: string) => {
    try {
      const res = await apiTable("/api/POSTO/DetailData", { guid: id, noposto: noposto || id, cmd: 'refresh' });
      const data = res?.response || (res?.noposto ? res : res?.data) || res;

      // Ensure guid is preserved from the 'id' parameter if missing in response
      const enrichedData = {
        ...data,
        guid: data.guid || data.Guid || id
      };

      setSelectedPosto(enrichedData);
      setIsViewOpen(true);
    } catch (error: any) {
      console.error("Detail Fetch Error:", error);
      addToast({ title: "Error", description: "Gagal memuat detail POSTO", variant: "destructive" });
    }
  };

  // Deep link from a notification: /posto?id=<guid>&noposto=<noposto>
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      handleView(id, searchParams.get("noposto") ?? undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 4: Add the Suspense-wrapped default export at the end of the file**

Find (the last lines of the file):
```tsx
    </div>
  );
}
```
Replace with:
```tsx
    </div>
  );
}

export default function PostoPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Memuat data posto...</div>}>
      <PostoPageContent />
    </Suspense>
  );
}
```

**Note on Step 4's "Find" text:** same caveat as Task 6 Step 4 — confirm this lands at the true end of the file (`tail -5` before editing), not an earlier, similarly-closed block.

- [ ] **Step 5: Typecheck**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/app/posto/page.tsx
git commit -m "feat: /posto reads ?id= to auto-open detail modal for notification deep links"
```

---

### Task 8: `/armada/pengajuan` — read `?id=` and auto-open the review detail modal

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\armada\pengajuan\page.tsx`

Same Suspense restructure as Tasks 6-7. This page's `editId`/`isViewMode` state already drives an independent `useQuery(["armada-review-detail", editId], ...)` (`pengajuan/page.tsx:375-388`) that fetches `/api/Armada/DetailDataReview` by numeric ID — setting `editId` directly works regardless of whether that row is currently loaded/visible in the page's own `DataTable`, so no table-search wiring is needed here (unlike Task 6).

- [ ] **Step 1: Add imports**

Find (L2):
```tsx
import { useState, useRef, useCallback, useMemo } from "react";
```
Replace with:
```tsx
import { useState, useRef, useCallback, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
```

- [ ] **Step 2: Rename the component function**

Find (L238):
```tsx
export default function ArmadaPengajuanPage() {
```
Replace with:
```tsx
function ArmadaPengajuanPageContent() {
  const searchParams = useSearchParams();
```

- [ ] **Step 3: Auto-open the detail modal when `?id=` is present**

Find (L272-273):
```tsx
  const [editId, setEditId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
```
Replace with:
```tsx
  const [editId, setEditId] = useState<number | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // Deep link from a notification: /armada/pengajuan?id=<ArmadaReview.ID>
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setIsViewMode(true);
      setEditId(Number(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 4: Add the Suspense-wrapped default export at the end of the file**

Find (the last lines of the file):
```tsx
        </DialogContent>
      </Dialog>
    </div>
  );
}
```
Replace with:
```tsx
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ArmadaPengajuanPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Memuat data pengajuan...</div>}>
      <ArmadaPengajuanPageContent />
    </Suspense>
  );
}
```

**Note on Step 4's "Find" text:** same caveat as Task 6 Step 4 — confirm this lands at the true end of the file (`tail -5` before editing), not an earlier, similarly-closed block.

- [ ] **Step 5: Typecheck**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/app/armada/pengajuan/page.tsx
git commit -m "feat: /armada/pengajuan reads ?id= to auto-open detail modal for notification deep links"
```

---

### Task 9: `NotificationDropdown` — per-item mark-read + navigate, restore "View All"

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\components\header\NotificationDropdown.tsx`

- [ ] **Step 1: Replace the whole file**

Find (the entire current file, L1-125):
```tsx
"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Bell, X } from "lucide-react";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { data: [] as NotificationItem[], unreadCount: 0 };
      return res.json() as Promise<{ data: NotificationItem[]; unreadCount: number }>;
    },
    refetchInterval: 30_000,
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const notifying = unreadCount > 0;

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function toggleDropdown() {
    setIsOpen((prev) => {
      const next = !prev;
      if (next && unreadCount > 0) {
        markAllRead.mutate();
      }
      return next;
    });
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-10 w-10 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-cyan-900/20"
        onClick={toggleDropdown}
      >
        {notifying && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-500 flex">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <Bell className="h-5 w-5" />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[400px] w-[320px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark lg:right-0 sm:w-[350px]"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <button
            onClick={closeDropdown}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto no-scrollbar">
          {notifications.length === 0 ? (
            <li className="py-8 text-center text-xs text-gray-400 italic">
              Tidak ada notifikasi.
            </li>
          ) : (
            notifications.map((n) => (
              <li key={n.id}>
                <DropdownItem
                  onItemClick={closeDropdown}
                  className="flex gap-3 rounded-lg border-b border-gray-50 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <div className="flex flex-col text-left">
                    <p className="text-theme-sm text-gray-800 dark:text-gray-200">
                      <span className="font-semibold">{n.title}</span>
                    </p>
                    <p className="text-theme-xs text-gray-500">{n.message}</p>
                    <p className="text-theme-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="ml-auto mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                  )}
                </DropdownItem>
              </li>
            ))
          )}
        </ul>
      </Dropdown>
    </div>
  );
}
```
Replace with:
```tsx
"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Bell, X } from "lucide-react";
import { getNotificationHref } from "@/lib/notifications/href";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  sourceId: string;
  sourceLabel: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { data: [] as NotificationItem[], unreadCount: 0 };
      return res.json() as Promise<{ data: NotificationItem[]; unreadCount: number }>;
    },
    refetchInterval: 30_000,
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const notifying = unreadCount > 0;

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleItemClick(n: NotificationItem) {
    if (!n.isRead) markRead.mutate(n.id);
    closeDropdown();
    router.push(getNotificationHref(n.type, n.sourceId, n.sourceLabel));
  }

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-10 w-10 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-cyan-900/20"
        onClick={toggleDropdown}
      >
        {notifying && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-500 flex">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <Bell className="h-5 w-5" />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[400px] w-[320px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark lg:right-0 sm:w-[350px]"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <button
            onClick={closeDropdown}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto no-scrollbar">
          {notifications.length === 0 ? (
            <li className="py-8 text-center text-xs text-gray-400 italic">
              Tidak ada notifikasi.
            </li>
          ) : (
            notifications.map((n) => (
              <li key={n.id}>
                <DropdownItem
                  onItemClick={() => handleItemClick(n)}
                  className="flex gap-3 rounded-lg border-b border-gray-50 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <div className="flex flex-col text-left">
                    <p className="text-theme-sm text-gray-800 dark:text-gray-200">
                      <span className="font-semibold">{n.title}</span>
                    </p>
                    <p className="text-theme-xs text-gray-500">{n.message}</p>
                    <p className="text-theme-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="ml-auto mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                  )}
                </DropdownItem>
              </li>
            ))
          )}
        </ul>

        <Link
          href="/notifications"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-auto text-xs font-medium text-center text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          View All Notifications
        </Link>
      </Dropdown>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/components/header/NotificationDropdown.tsx
git commit -m "feat: dropdown marks-read and navigates per item, restore View All link"
```

---

### Task 10: `/notifications` — new all-notifications page

**Files:**
- Create: `C:\Users\weka\Indigo\SISTROV2-next\src\app\notifications\page.tsx`

- [ ] **Step 1: Write the page**

```tsx
"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { getNotificationHref } from "@/lib/notifications/href";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  sourceId: string;
  sourceLabel: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsPageResponse {
  data: NotificationItem[];
  unreadCount: number;
  nextCursor: number | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["notifications-full", filter],
    queryFn: async ({ pageParam }: { pageParam: number | null }) => {
      const params = new URLSearchParams({ take: "20" });
      if (pageParam) params.set("cursor", String(pageParam));
      if (filter === "unread") params.set("unreadOnly", "1");
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) return { data: [], unreadCount: 0, nextCursor: null } as NotificationsPageResponse;
      return res.json() as Promise<NotificationsPageResponse>;
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-full"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  function handleClick(n: NotificationItem) {
    if (!n.isRead) markRead.mutate(n.id);
    router.push(getNotificationHref(n.type, n.sourceId, n.sourceLabel));
  }

  const items = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
          Notifikasi
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Semua notifikasi Anda.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          Semua
        </Button>
        <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>
          Belum Dibaca
        </Button>
      </div>

      <Card className="shadow-theme-xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-gray-400 italic flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 opacity-30" />
              Tidak ada notifikasi.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-semibold">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.isRead && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasNextPage && (
            <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Muat Lebih Banyak"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

This uses a "Muat Lebih Banyak" (load more) button rather than scroll-triggered auto-fetch — same end result (paginated access to full history beyond the dropdown's 30-item cap) without adding an `IntersectionObserver`-based scroll-detection dependency for a first version.

- [ ] **Step 2: Typecheck**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/app/notifications/page.tsx
git commit -m "feat: add /notifications page with load-more and read/unread filter"
```

---

### Task 11: End-to-end manual verification

**Files:** none (verification only, no commit)

- [ ] **Step 1: Confirm build/dev server picks up the new route**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Then restart the dev server (new route files under `src/app/**` sometimes need a fresh Turbopack process to register, observed earlier this session) and confirm `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:<port>/notifications` returns `200` (or a redirect if unauthenticated, not `404`).

- [ ] **Step 2: Click-through as transportir**

Trigger (or reuse existing) `POSTO_BARU`, `ARMADA_APPROVED`/`REJECTED`, and `ARMADA_BLOCKED`/`UNBLOCKED` notifications. For each, from the dropdown:
- Confirm clicking navigates to the expected page (`/posto`, `/armada/pengajuan`, `/armada` respectively).
- Confirm the relevant detail modal opens (posto/pengajuan) or the table search is prefilled with the right nopol (`/armada`).
- Confirm only that one notification's unread dot clears — reopen the dropdown and confirm the others are still marked unread.

- [ ] **Step 3: Click-through as staffarea/pod**

Trigger a `PENGAJUAN_BARU` notification, click it, confirm it navigates to `/armada/pengajuan?id=...` and opens the correct submission's detail view.

- [ ] **Step 4: `/notifications` page**

Open it directly (via the dropdown's "View All Notifications" link and by URL). Confirm:
- More than 30 historical notifications (if available) load via "Muat Lebih Banyak".
- The "Belum Dibaca" tab shows only unread items and updates correctly after clicking one.
- Clicking a row here also navigates + marks read, same as the dropdown.
