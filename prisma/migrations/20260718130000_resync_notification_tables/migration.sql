-- Corrective migration: recorded migration history says Notification and
-- NotificationSourceState were dropped by 20260714035850_manager_hierarchy_mapping
-- (that migration's generated SQL included DROP TABLE for both, a side effect of
-- being generated against a schema.prisma that was temporarily missing the
-- Notification model) and never recreated by any tracked migration afterward.
--
-- In reality, both tables exist in this database today with live data (populated
-- outside migration tracking sometime after 2026-07-14, likely via `prisma db push`
-- or manual SQL during earlier notification-system work). This migration brings
-- the tracked history back in line with actual reality: CREATE TABLE IF NOT EXISTS
-- so it's a no-op on this already-correct database, but produces the right result
-- on any fresh environment that replays migration history from scratch.

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationSourceState" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "lastStatus" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSourceState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSourceState_userId_sourceType_sourceId_key" ON "NotificationSourceState"("userId", "sourceType", "sourceId");
