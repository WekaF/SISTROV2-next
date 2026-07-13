# Header Notifications — Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `NotificationDropdown` in the header with real notifications: for Transportir — posto baru, armada disetujui/ditolak, armada diblokir/dibuka-blokir; for StaffArea/POD — pengajuan armada baru yang company-nya cocok dengan approver mereka.

**Architecture:** No event system exists anywhere in either repo for these cases (the legacy `HomeController.pushNotifikasi` + `sp_notifikasi` stored proc only half-covers Transportir — posto-baru and armada-*ditolak*, never approve, never staff-side, never blokir — and its core logic lives in an opaque SQL stored procedure not present in this repo, so it is **not** reused here; see "Prior art" below). Instead: a small new Postgres `Notification` table (this repo's existing Prisma/Postgres side-db) is populated by a polling-diff job that runs inline whenever a client polls `GET /api/notifications`. That job fetches each user's own scoped data from three ASP.NET backend endpoints (two already exist, mostly as-is; one is new for "blokir" which doesn't exist anywhere yet) and diffs it against a small `NotificationSourceState` cursor table to detect first-seen items / status transitions, writing new `Notification` rows only for genuinely new events (no historical flood on first run). The header polls `GET /api/notifications` every 30s via react-query, matching the existing polling convention used elsewhere in this codebase (`src/hooks/use-staffarea-stream.ts`).

**Prior art (context, not reused):** `SISTROAWESOME/api/HomeController.cs` has `pushNotifikasi()` (line ~130, live, wired to the legacy Razor `_Layout.cshtml` via Firebase push) and `pushNotifikasi_read()` (line ~229). Its list content comes entirely from SQL Server stored procedure `sp_notifikasi` (called from `Helper/TiketHelper.cs:771`), whose logic is not checked into either repo. It only logs posto-creation (`LogPosto`, one insert site: `POSTOController.cs:1036-1048`) and armada-*rejection* (`LogArmadaReview`, one insert site: `ArmadaController.cs:1041-1058`, inside `TolakDataReview`) — approval is never logged, there's no staff-side equivalent, and no blokir concept exists. Extending an opaque stored procedure is riskier than a small self-contained system, so this plan builds the new system standalone.

**Tech Stack:** Next.js 16 (App Router, TypeScript), `@tanstack/react-query`, Prisma + PostgreSQL (this repo's existing side-db, currently only `AuditLog`/`CompanyMenuTemplate`), ASP.NET Framework 4.5 Web API backend (`sistropigroup/SISTROAWESOME`), EF6 Database-First (`SistroEntities.edmx`) for `Armada`.

**No test framework exists in this repo** (`package.json` has no vitest/jest/playwright) and the backend has no test project touching these controllers. Per established convention, this plan uses manual verification steps (`curl`, browser) instead of introducing new test scaffolding — do not add a test framework as part of this work.

---

## Context you need before starting

- Session shape (`src/lib/auth.ts`): `session.user.username`, `.role` (normalized: `"transport"`, `"rekanan"`, `"pod"`, `"staffarea"`, etc. via `src/lib/role-utils.ts` `normalizeRole()`), `.companyCode`, `.aspnetToken`, `.transportCode`.
- Client-side backend calls go through `useApi()` (`src/hooks/use-api.ts`) → `apiFetch(path)` → fetches `${API_BASE}${path}` where `API_BASE = "/aspnet-proxy"` on the client (rewritten by `next.config.ts` straight to the ASP.NET backend — **no Next.js API route wraps these calls**, e.g. `apiFetch("/api/Armada/DataTableReview")` hits `/aspnet-proxy/api/Armada/DataTableReview` directly).
- Server-side (route handlers) use `aspnetFetchServer(path, token)` from `src/lib/api-client.ts`.
- `ArmadaController` (`SISTROAWESOME/api/ArmadaController.cs`) is `[RoutePrefix("api/Armada")]`, extends `BaseLoggedApiController` which exposes `db` (EF context), `myCompanyCode`, `isTransport`, `isAdminArmada`, `gh` (`GeneralHelper`, use `gh.DateTimeNowSistro(myCompanyCode)` instead of `DateTime.Now` — established convention in this file).
- `POSTOController` (`SISTROAWESOME/api/POSTOController.cs`) already filters its `DataTable()` action by identity: `x.pos.Transport1.username == username` for transportir, `x.pos.company_code == effectiveCompanyCode` otherwise (line 228) — reused as-is for posto notifications, no backend change needed.
- `ArmadaController.DataTableReview()` (line 2734) already filters by identity: `x.Transport.username == namauser` (transportir) vs `x.approver == myCompanyCode` (staff) — line 2761 — reused as-is for both "approve/reject" (transportir) and "pengajuan baru" (staffarea) notifications. Its projection (`ArmadaView`, `Models/ArmadaView.cs:8`) already declares `public int ID` but the projection at line ~2773 never sets it — that's the one small backend fix needed (Task 4).
- Armada has **no** blocked/active concept at all. This plan adds it from scratch (Task 1 + 2).

---

## Task 1: Backend DB — add blokir columns to `Armada`

**Files:**
- Create: `docs/sql/10_add_armada_blokir_columns.sql`
- Create: `docs/armada_blokir_columns_guide.md`
- Modify (manual, via Visual Studio Designer — cannot be scripted): `SISTROAWESOME/BDO/SistroEntities.edmx`, which regenerates `SISTROAWESOME/BDO/Armada.cs`

`Armada` is mapped Database-First via `SistroEntities.edmx` (not EF Code-First migrations — the `Migrations/` folder in this project is for a *different*, Identity-related DbContext). So the column must be added to SQL Server first, then the EDMX model refreshed in Visual Studio — it cannot be done by hand-editing `BDO/Armada.cs` (it's regenerated from a template and any manual edit is overwritten).

- [ ] **Step 1: Write the SQL script**

`docs/sql/10_add_armada_blokir_columns.sql`:
```sql
-- Adds blokir (block/unblock) tracking columns to Armada.
-- Run once against the target SQL Server database, then refresh
-- SistroEntities.edmx in Visual Studio (see armada_blokir_columns_guide.md).

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Armada') AND name = 'is_blocked'
)
BEGIN
    ALTER TABLE dbo.Armada ADD is_blocked BIT NOT NULL CONSTRAINT DF_Armada_is_blocked DEFAULT (0);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Armada') AND name = 'blocked_on'
)
BEGIN
    ALTER TABLE dbo.Armada ADD blocked_on DATETIME NULL;
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Armada') AND name = 'blocked_by'
)
BEGIN
    ALTER TABLE dbo.Armada ADD blocked_by NVARCHAR(100) NULL;
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.Armada') AND name = 'blocked_reason'
)
BEGIN
    ALTER TABLE dbo.Armada ADD blocked_reason NVARCHAR(500) NULL;
END
```

- [ ] **Step 2: Write the guide doc**

`docs/armada_blokir_columns_guide.md`:
```markdown
# Armada blokir columns — deployment guide

## What
Adds 4 columns to `dbo.Armada`: `is_blocked` (bit, default 0), `blocked_on`,
`blocked_by`, `blocked_reason`. Backs the new admin "blokir armada" feature.

## How to apply
1. Run `armada_blokir_columns.sql` against the target SQL Server database (SSMS).
2. Open `SISTROAWESOME/SISTROAWESOME.sln` in Visual Studio.
3. Open `SISTROAWESOME/BDO/SistroEntities.edmx`, right-click the design
   surface → "Update Model from Database" → Refresh tab → check `Armada` →
   Finish. This regenerates `BDO/Armada.cs` with the 4 new properties.
4. Rebuild the solution, redeploy the API.
5. No app restart needed for the SQL step alone, but the API must be
   rebuilt/redeployed to pick up the new EF-mapped columns.
```

- [ ] **Step 3: Run the script against the dev database, then update the EDMX in Visual Studio**

Follow the guide above. Verify afterward that `SISTROAWESOME/BDO/Armada.cs` now contains `IsBlocked`, `BlockedOn`, `BlockedBy`, `BlockedReason` properties (exact PascalCase names EF generates from the snake_case columns — confirm the actual generated names after the refresh, since EDMX pluralization/naming conventions can differ; adjust Task 2/3 code below to match if EF generates different casing, e.g. `is_blocked` verbatim instead of `IsBlocked`).

- [ ] **Step 4: Commit**

```bash
git add docs/sql/10_add_armada_blokir_columns.sql docs/armada_blokir_columns_guide.md
git commit -m "docs: add SQL script for armada blokir columns"
```
(Commit the EDMX/BDO regeneration together with Task 2's controller change, in the backend repo, once the DB step has actually been run.)

---

## Task 2: Backend — `ToggleBlokir` endpoint

**Files:**
- Modify: `SISTROAWESOME/api/ArmadaController.cs` (add new action near `ChangeData`, line ~1840)

- [ ] **Step 1: Add the action**

Insert directly after `ChangeData` (after line 1873 in the current file):

```csharp
        public class ToggleBlokirRequest
        {
            public int ID { get; set; }
            public bool IsBlocked { get; set; }
            public string Reason { get; set; }
        }

        [HttpPost]
        public IHttpActionResult ToggleBlokir(ToggleBlokirRequest req)
        {
            try
            {
                Armada exist = db.Armada.Where(x => x.ID == req.ID).SingleOrDefault();
                if (exist == null)
                {
                    return Content(HttpStatusCode.BadRequest, "Maaf... Data tidak ada di database.");
                }
                exist.IsBlocked = req.IsBlocked;
                exist.BlockedOn = req.IsBlocked ? gh.DateTimeNowSistro(myCompanyCode) : (DateTime?)null;
                exist.BlockedBy = req.IsBlocked ? User.Identity.Name : null;
                exist.BlockedReason = req.IsBlocked ? req.Reason : null;
                db.Entry(exist).State = EntityState.Modified;
                db.SaveChanges();
                return Content(HttpStatusCode.OK, "Any object");
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.BadRequest, "Something error. Please check data...");
            }
        }
```

Property names `IsBlocked`/`BlockedOn`/`BlockedBy`/`BlockedReason` assume EF generates PascalCase from the snake_case columns during the Task 1 EDMX refresh — verify against the actual regenerated `BDO/Armada.cs` and adjust here if the names differ (e.g. `is_blocked` verbatim).

- [ ] **Step 2: Restrict to admin roles**

This action should only be callable by TI/Admin/SuperAdmin, not by the transportir who owns the vehicle. `BaseLoggedApiController` already exposes `isAdminArmada`/`isTransport` flags used elsewhere in this file (e.g. line 2482) — guard at the top of the method body:

```csharp
                if (isTransport)
                {
                    return Content(HttpStatusCode.Forbidden, "Anda tidak memiliki akses untuk aksi ini.");
                }
```
Add this check right after the `try` line, before the `db.Armada.Where(...)` lookup.

- [ ] **Step 3: Manually verify**

Rebuild, redeploy. With an admin bearer token:
```bash
curl -X POST http://localhost:8090/api/Armada/ToggleBlokir \
  -H "Authorization: Bearer <admin_token>" -H "Content-Type: application/json" \
  -d '{"ID": 123, "IsBlocked": true, "Reason": "Uji coba"}'
```
Expected: `200 OK`. Re-run with `"IsBlocked": false` to confirm unblock clears `BlockedOn`/`BlockedBy`/`BlockedReason`.

- [ ] **Step 4: Commit** (backend repo)

```bash
git add SISTROAWESOME/api/ArmadaController.cs SISTROAWESOME/BDO/Armada.cs SISTROAWESOME/BDO/SistroEntities.edmx SISTROAWESOME/BDO/SistroEntities.Designer.cs
git commit -m "feat: add armada blokir toggle endpoint"
```

---

## Task 3: Backend — `GetOwnArmadaStatus` endpoint (clean status feed for polling)

**Files:**
- Modify: `SISTROAWESOME/api/ArmadaController.cs`

This gives the Next.js notification sync a clean, non-HTML-laden JSON source for the transportir's own fleet status (needed to detect blokir/unblokir transitions — nothing else in this controller exposes `is_blocked` cleanly).

- [ ] **Step 1: Add the action**

Add near `GetTransportirData` (line ~49):

```csharp
        public class ArmadaStatusItem
        {
            public int ID { get; set; }
            public string nopol { get; set; }
            public string status_armada { get; set; }
            public bool IsBlocked { get; set; }
            public string BlockedReason { get; set; }
            public Nullable<System.DateTime> BlockedOn { get; set; }
            public Nullable<System.DateTime> updatedon { get; set; }
        }

        [HttpGet]
        public List<ArmadaStatusItem> GetOwnArmadaStatus()
        {
            string namauser = User.Identity.Name;
            return db.Armada
                .Where(x => x.Transport.username == namauser)
                .Select(x => new ArmadaStatusItem
                {
                    ID = x.ID,
                    nopol = x.nopol,
                    status_armada = x.status_armada,
                    IsBlocked = x.IsBlocked,
                    BlockedReason = x.BlockedReason,
                    BlockedOn = x.BlockedOn,
                    updatedon = x.updatedon
                })
                .ToList();
        }
```

- [ ] **Step 2: Manually verify**

```bash
curl http://localhost:8090/api/Armada/GetOwnArmadaStatus -H "Authorization: Bearer <transportir_token>"
```
Expected: `200 OK`, JSON array of the caller's own vehicles only (verify against a different transportir's token that the lists differ / are scoped).

- [ ] **Step 3: Commit** (backend repo)

```bash
git add SISTROAWESOME/api/ArmadaController.cs
git commit -m "feat: add GetOwnArmadaStatus endpoint for notification polling"
```

---

## Task 4: Backend — expose `ID` on `DataTableReview` rows

**Files:**
- Modify: `SISTROAWESOME/api/ArmadaController.cs:2773` (inside `DataTableReview()`)

Currently the `ArmadaView` projection in `DataTableReview()` never sets `ID` (only embeds it inside the `Action` HTML string). The Next.js sync job needs a clean numeric ID per row to dedupe.

- [ ] **Step 1: Add the field to the projection**

In the existing projection (around line 2773-2791), add `ID = x.ID,` as the first field:

```csharp
                List<ArmadaView> dt = datapaging.AsEnumerable().Select((x, i) => new ArmadaView
                {
                    ID = x.ID,
                    number = i + 1,
                    username = x.Transport.username,
```
(leave every other line unchanged).

- [ ] **Step 2: Manually verify**

```bash
curl -X POST "http://localhost:8090/api/Armada/DataTableReview" \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/x-www-form-urlencoded" \
  -d "draw=1&start=0&length=10&search[value]="
```
Expected: each row in `data[]` now has a non-zero `ID` field matching the id embedded in its `Action` HTML string.

- [ ] **Step 3: Commit** (backend repo)

```bash
git add SISTROAWESOME/api/ArmadaController.cs
git commit -m "fix: expose ID field on DataTableReview rows"
```

---

## Task 5: Prisma — `Notification` + `NotificationSourceState` models

**Files:**
- Modify: `prisma/schema.prisma`

This is the **first** Prisma migration ever generated in this repo (`prisma/migrations/` doesn't exist yet) — it establishes the convention.

- [ ] **Step 1: Add the models**

Append to `prisma/schema.prisma` (after `CompanyMenuTemplate`, following the existing `AuditLog` field-naming style — `Int` autoincrement id, `createdAt`/`updatedAt`):

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

model NotificationSourceState {
  id         Int      @id @default(autoincrement())
  userId     String
  sourceType String   // "posto" | "armada_review" | "armada_blocked"
  sourceId   String
  lastStatus String   // last-seen status string used to detect transitions
  updatedAt  DateTime @updatedAt

  @@unique([userId, sourceType, sourceId])
}
```

- [ ] **Step 2: Generate and run the migration**

```bash
npx prisma migrate dev --name add_notifications
```
Expected: creates `prisma/migrations/<timestamp>_add_notifications/migration.sql` and applies it to the local Postgres DB without error.

- [ ] **Step 3: Verify the client generates correctly**

```bash
npx prisma generate
```
Expected: no errors, `@prisma/client` types now include `Notification`/`NotificationSourceState`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Notification and NotificationSourceState models"
```

---

## Task 6: Notification sync — Transportir (posto baru, approve/reject, blokir)

**Files:**
- Create: `src/lib/notifications/types.ts`
- Create: `src/lib/notifications/sync-transportir.ts`

- [ ] **Step 1: Shared types**

`src/lib/notifications/types.ts`:
```typescript
export type NotificationType =
  | "POSTO_BARU"
  | "ARMADA_APPROVED"
  | "ARMADA_REJECTED"
  | "ARMADA_BLOCKED"
  | "ARMADA_UNBLOCKED"
  | "PENGAJUAN_BARU";

export interface NotificationDTO {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SyncSession {
  username: string;
  companyCode: string | null;
  aspnetToken: string;
}
```

- [ ] **Step 2: Write the transportir sync function**

`src/lib/notifications/sync-transportir.ts`:
```typescript
import { prisma } from "@/lib/prisma";
import { aspnetFetchServer } from "@/lib/api-client";
import type { SyncSession } from "./types";

interface PostoRow {
  id: number;
  noposto: string;
}

interface ArmadaReviewRow {
  ID: number;
  nopol: string;
  aprrovestatus: string; // "Menunggu Approve" | "Sudah diapprove" | "Ditolak/Revisi"
}

interface ArmadaStatusRow {
  ID: number;
  nopol: string;
  IsBlocked: boolean;
}

async function seedOrDiff(
  userId: string,
  sourceType: string,
  sourceId: string,
  currentStatus: string,
): Promise<"new" | "changed" | "unchanged"> {
  const existing = await prisma.notificationSourceState.findUnique({
    where: { userId_sourceType_sourceId: { userId, sourceType, sourceId } },
  });
  if (!existing) {
    await prisma.notificationSourceState.create({
      data: { userId, sourceType, sourceId, lastStatus: currentStatus },
    });
    return "new";
  }
  if (existing.lastStatus !== currentStatus) {
    await prisma.notificationSourceState.update({
      where: { userId_sourceType_sourceId: { userId, sourceType, sourceId } },
      data: { lastStatus: currentStatus },
    });
    return "changed";
  }
  return "unchanged";
}

async function createNotificationOnce(
  userId: string,
  type: string,
  title: string,
  message: string,
  sourceId: string,
) {
  const dedupeKey = `${userId}:${type}:${sourceId}`;
  await prisma.notification.upsert({
    where: { dedupeKey },
    update: {},
    create: { userId, type, title, message, sourceId, dedupeKey },
  });
}

export async function syncTransportirNotifications(session: SyncSession) {
  const userId = session.username;

  // 1. Posto baru — cold start (first sighting) never notifies, only seeds state.
  const postoRes = await aspnetFetchServer(
    "/api/POSTO/DataTable",
    session.aspnetToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "draw=1&start=0&length=50&search[value]=",
    },
  );
  if (postoRes.ok) {
    const { data } = (await postoRes.json()) as { data: PostoRow[] };
    for (const row of data) {
      const result = await seedOrDiff(userId, "posto", String(row.id), "seen");
      if (result === "new") {
        await createNotificationOnce(
          userId,
          "POSTO_BARU",
          "Posto baru",
          `Posto baru ${row.noposto} telah dibuat untuk Anda.`,
          String(row.id),
        );
      }
    }
  }

  // 2. Armada approve/reject — first sighting seeds state without notifying;
  //    only a real status transition (e.g. pending -> approved) notifies.
  const reviewRes = await aspnetFetchServer(
    "/api/Armada/DataTableReview",
    session.aspnetToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "draw=1&start=0&length=50&search[value]=",
    },
  );
  if (reviewRes.ok) {
    const { data } = (await reviewRes.json()) as { data: ArmadaReviewRow[] };
    for (const row of data) {
      const result = await seedOrDiff(
        userId,
        "armada_review",
        String(row.ID),
        row.aprrovestatus,
      );
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
    }
  }

  // 3. Armada blokir/buka-blokir — first sighting seeds state without notifying.
  const statusRes = await aspnetFetchServer(
    "/api/Armada/GetOwnArmadaStatus",
    session.aspnetToken,
  );
  if (statusRes.ok) {
    const rows = (await statusRes.json()) as ArmadaStatusRow[];
    for (const row of rows) {
      const statusKey = row.IsBlocked ? "blocked" : "active";
      const result = await seedOrDiff(
        userId,
        "armada_blocked",
        String(row.ID),
        statusKey,
      );
      if (result === "changed") {
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
    }
  }
}
```

- [ ] **Step 3: Manually verify with a Node REPL or a throwaway script**

Confirm `prisma.notificationSourceState` / `prisma.notification` table names match `npx prisma studio` — Prisma lower-camels the model name for the client accessor (`Notification` → `prisma.notification`, `NotificationSourceState` → `prisma.notificationSourceState`), consistent with existing usage of `prisma.auditLog` elsewhere in this codebase (check `src/lib/audit.ts` or similar for the exact accessor pattern already in use, and match it).

- [ ] **Step 4: Commit**

```bash
git add src/lib/notifications/types.ts src/lib/notifications/sync-transportir.ts
git commit -m "feat: add transportir notification sync (posto, approve/reject, blokir)"
```

---

## Task 7: Notification sync — StaffArea/POD (pengajuan baru)

**Files:**
- Create: `src/lib/notifications/sync-staffarea.ts`

- [ ] **Step 1: Write the staffarea sync function**

Reuses the same `/api/Armada/DataTableReview` endpoint — when called with a staffarea/pod session token, the backend's own `isTransport` flag is false, so its filter (`ArmadaController.cs:2761`) automatically scopes to `x.approver == myCompanyCode` instead. Only rows still pending (`"Menunggu Approve"`) generate a notification, and only on first sighting (no notification for already-old pending items discovered on the very first sync for a user).

`src/lib/notifications/sync-staffarea.ts`:
```typescript
import { prisma } from "@/lib/prisma";
import { aspnetFetchServer } from "@/lib/api-client";
import type { SyncSession } from "./types";

interface ArmadaReviewRow {
  ID: number;
  nopol: string;
  transportir: string;
  aprrovestatus: string;
}

export async function syncStaffareaNotifications(session: SyncSession) {
  const userId = session.username;

  const reviewRes = await aspnetFetchServer(
    "/api/Armada/DataTableReview",
    session.aspnetToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `draw=1&start=0&length=50&search[value]=${
        session.companyCode ? `&companyCode=${encodeURIComponent(session.companyCode)}` : ""
      }`,
    },
  );
  if (!reviewRes.ok) return;

  const { data } = (await reviewRes.json()) as { data: ArmadaReviewRow[] };
  for (const row of data) {
    if (row.aprrovestatus !== "Menunggu Approve") continue;

    const existing = await prisma.notificationSourceState.findUnique({
      where: {
        userId_sourceType_sourceId: {
          userId,
          sourceType: "armada_review_pending",
          sourceId: String(row.ID),
        },
      },
    });
    if (existing) continue;

    await prisma.notificationSourceState.create({
      data: {
        userId,
        sourceType: "armada_review_pending",
        sourceId: String(row.ID),
        lastStatus: "pending",
      },
    });
    await prisma.notification.upsert({
      where: { dedupeKey: `${userId}:PENGAJUAN_BARU:${row.ID}` },
      update: {},
      create: {
        userId,
        type: "PENGAJUAN_BARU",
        title: "Pengajuan armada baru",
        message: `${row.transportir} mengajukan armada ${row.nopol} untuk disetujui.`,
        sourceId: String(row.ID),
        dedupeKey: `${userId}:PENGAJUAN_BARU:${row.ID}`,
      },
    });
  }
}
```

Note (explicit trade-off, flag to the user before shipping): read/unread and "seen" state here is tracked per logged-in `username`, not per company — if two staff share the same `approver` company code, each gets their own independent notification feed/read-state (since `userId` = username). This matches how `Notification`/`NotificationSourceState` are keyed throughout this plan and avoids needing a separate per-company shared-state design; call it out if the user actually wants one shared read-state per company.

- [ ] **Step 2: Commit**

```bash
git add src/lib/notifications/sync-staffarea.ts
git commit -m "feat: add staffarea/pod notification sync for pending armada submissions"
```

---

## Task 8: API routes

**Files:**
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/read/route.ts`

- [ ] **Step 1: GET route — sync then list**

`src/app/api/notifications/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const notifications = await prisma.notification.findMany({
    where: { userId: user.username },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const unreadCount = await prisma.notification.count({
    where: { userId: user.username, isRead: false },
  });

  return NextResponse.json({ data: notifications, unreadCount });
}
```

- [ ] **Step 2: PATCH route — mark read**

`src/app/api/notifications/read/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: user.username, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await prisma.notification.updateMany({
    where: { id, userId: user.username },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify `src/lib/prisma.ts` exists with a shared client export**

Check the existing Prisma client singleton pattern already used by `AuditLog` writes elsewhere in this codebase (grep for `from "@/lib/prisma"` or similar) and reuse the exact same import path — do not create a second Prisma client instance.

- [ ] **Step 4: Manual verification**

With the dev server running and logged in as a transportir:
```bash
curl http://localhost:3000/api/notifications -H "Cookie: <session-cookie>"
```
Expected: `200`, `{ data: [...], unreadCount: N }`. Trigger a real posto upload or armada rejection in another tab, call again, confirm a new item appears with `isRead: false`. Then:
```bash
curl -X PATCH http://localhost:3000/api/notifications/read -H "Cookie: <session-cookie>" -H "Content-Type: application/json" -d '{"all": true}'
```
Expected: `200`, subsequent GET shows `unreadCount: 0`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/notifications
git commit -m "feat: add notifications API routes (sync+list, mark read)"
```

---

## Task 9: Wire up `NotificationDropdown`

**Files:**
- Modify: `src/components/header/NotificationDropdown.tsx`

- [ ] **Step 1: Read the current file to preserve its markup/styling shell**

The two hardcoded `<li>` items (lines ~56-103) and the `isOpen`/`notifying` local state (lines ~10-11) get replaced by real data; keep the existing dropdown container/animation markup as-is.

- [ ] **Step 2: Replace static data with a polling query**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// Inside the component, replacing the old `notifying` useState:
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
```

- [ ] **Step 3: Render the real list, call `markAllRead` on dropdown open**

Replace the two hardcoded `<li>` blocks with a `.map()` over `notifications`, each rendering `title`/`message`/relative `createdAt`. Call `markAllRead.mutate()` in the existing toggle-open handler (wherever `setIsOpen(true)` currently happens), so opening the bell clears the unread badge — matching common bell-dropdown UX and avoiding an extra "mark individual read" click interaction that has no existing design precedent in this codebase.

- [ ] **Step 4: Manually verify in the browser**

Run `npm run dev`, log in as a transportir account with at least one pending/rejected armada review or posto, open the header bell, confirm real items render and the badge clears after opening. Then log in as a staffarea/pod account with a pending submission scoped to their company, confirm the pengajuan-baru item appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/header/NotificationDropdown.tsx
git commit -m "feat: wire NotificationDropdown to real notification data"
```

---

## Task 10: Admin UI — Blokir/Buka Blokir toggle

**Files:**
- Modify: `src/app/armada/page.tsx`

- [ ] **Step 1: Add the mutation**

Following the existing mutation pattern in this file (`useMutation` + `apiFetch` + `queryClient.invalidateQueries`):

```typescript
const toggleBlokirMutation = useMutation({
  mutationFn: async ({ id, isBlocked, reason }: { id: number; isBlocked: boolean; reason?: string }) => {
    const res = await apiFetch("/api/Armada/ToggleBlokir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID: id, IsBlocked: isBlocked, Reason: reason ?? "" }),
    });
    if (!res.ok) throw new Error(await res.text());
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["armada-fleet"] }); // match this file's existing fleet list queryKey
    addToast({ type: "success", message: "Status blokir armada diperbarui." });
  },
  onError: () => addToast({ type: "error", message: "Gagal memperbarui status blokir." }),
});
```
Confirm the exact existing fleet-list `queryKey` used in this file (it wasn't captured verbatim in this plan's research pass) and substitute it in place of the placeholder `"armada-fleet"` above.

- [ ] **Step 2: Add the button, gated to admin roles**

Near the existing `isRekanan` role check (line ~70), add:
```typescript
const isAdminRole = !isRekanan; // TI/SuperAdmin/Admin — mirrors this file's existing binary role split
```
Render a "Blokir" / "Buka Blokir" button in the fleet table's action column, visible only `{isAdminRole && (...)}`, calling `toggleBlokirMutation.mutate({ id: row.ID, isBlocked: !row.IsBlocked })`. Wrap the "Blokir" direction in a confirmation `Dialog` (this file already imports `Dialog`/`DialogContent`/etc. for the delete-armada flow — reuse the same component, prompting for an optional `reason` text input before calling the mutation).

- [ ] **Step 3: Manually verify in the browser**

Log in as TI/Admin, open Armada list, block a vehicle with a reason, confirm the badge/status updates after the mutation succeeds. Toggle it back to unblocked. Log in as a `rekanan`/`transport` user and confirm the Blokir button is not rendered at all.

- [ ] **Step 4: Commit**

```bash
git add src/app/armada/page.tsx
git commit -m "feat: add armada blokir toggle to admin fleet page"
```

---

## Task 11: Transportir UI — "Diblokir" badge

**Files:**
- Modify: `src/app/armada/pengajuan/page.tsx`

- [ ] **Step 1: Fetch own armada status**

Add a query using the new backend endpoint, alongside the existing `transportir-list`/`sumbu-data` queries in this file:
```typescript
const { data: ownArmadaStatus = [] } = useQuery({
  queryKey: ["own-armada-status"],
  queryFn: async () => {
    const res = await apiFetch("/api/Armada/GetOwnArmadaStatus");
    if (!res.ok) return [];
    return res.json();
  },
  enabled: !!session && isTransport,
});
```

- [ ] **Step 2: Render the badge**

Wherever this page renders each armada row (near where `aprrovestatus`/status badges are already shown), look up the matching entry from `ownArmadaStatus` by `nopol` or `ID` and render an additional red "Diblokir" `Badge` when `IsBlocked` is true, alongside the existing approve/reject status badges.

- [ ] **Step 3: Manually verify in the browser**

Using the Task 10 admin toggle, block one of a test transportir's vehicles, then log in as that transportir and confirm the "Diblokir" badge appears on `armada/pengajuan`. Unblock it, confirm the badge disappears on next refetch/reload.

- [ ] **Step 4: Commit**

```bash
git add src/app/armada/pengajuan/page.tsx
git commit -m "feat: show Diblokir badge on transportir's own armada list"
```

---

## Task 12: End-to-end verification

- [ ] Backend rebuilt and redeployed with Task 1-4 changes (DB columns present, `ToggleBlokir`/`GetOwnArmadaStatus` reachable, `DataTableReview` rows carry `ID`).
- [ ] `npx prisma migrate deploy` (or `dev`) applied against whichever Postgres instance the running Next.js app points at.
- [ ] As a transportir: upload a new posto, confirm a "Posto baru" notification appears within 30s (next poll) without needing a page reload.
- [ ] As staffarea/pod (with a matching `companyCode`): have a transportir submit a new armada pengajuan with `approver` set to that company, confirm a "Pengajuan armada baru" notification appears for the staff user and NOT for a staff user with a different company code.
- [ ] As that same staff user, approve the submission; confirm the submitting transportir receives an "Armada disetujui" notification. Repeat with reject → "Armada ditolak".
- [ ] As TI/Admin, block one of the transportir's vehicles with a reason; confirm the transportir receives an "Armada diblokir" notification and sees the "Diblokir" badge on `armada/pengajuan`. Unblock; confirm "dibuka blokirnya" notification and badge removal.
- [ ] Confirm opening the bell dropdown clears the unread badge count (`GET /api/notifications` returns `unreadCount: 0` afterward).
- [ ] Confirm re-opening the dropdown later does NOT re-notify for the same already-seen events (idempotency via `dedupeKey`/`NotificationSourceState`).

---

## Self-review notes

- **Spec coverage:** Transportir #1 posto baru → Task 6 step 1. #2 approve/reject → Task 6 step 2 (+ backend Task 4 for clean IDs). #3 blokir → Tasks 1/2/3/6 step 3/10/11. StaffArea/POD pengajuan-baru-by-approver → Task 7 (relies on existing `approver == myCompanyCode` backend filter, no backend change needed there).
- **Known trade-off to confirm with the user before/while implementing:** notification "new-ness" is entirely defined by this plan's own `NotificationSourceState` cursor (cold start = seed only, no historical flood) — it deliberately does not reuse the legacy `LogArmadaReview`/`LogPosto`/`sp_notifikasi` system, so any events that occurred before this feature ships will never generate a backfilled notification. If backfill is wanted, that requires an extra one-off task querying historical `ArmadaReview`/`Posto` rows on first deploy — not included here.
- **Known trade-off #2:** staffarea/pod read-state is per-username, not shared per-company (see note in Task 7) — flagged inline, not resolved, pending user input if it matters.
