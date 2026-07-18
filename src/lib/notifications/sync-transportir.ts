import { prismaLog } from "@/lib/prisma";
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
  const existing = await prismaLog.notificationSourceState.findUnique({
    where: { userId_sourceType_sourceId: { userId, sourceType, sourceId } },
  });
  if (!existing) {
    await prismaLog.notificationSourceState.create({
      data: { userId, sourceType, sourceId, lastStatus: currentStatus },
    });
    return "new";
  }
  if (existing.lastStatus !== currentStatus) {
    await prismaLog.notificationSourceState.update({
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
  await prismaLog.notification.upsert({
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
