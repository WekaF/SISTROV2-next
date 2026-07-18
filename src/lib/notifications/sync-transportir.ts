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
  const result: "new" | "changed" | "unchanged" = !existing
    ? "new"
    : existing.lastStatus !== currentStatus
      ? "changed"
      : "unchanged";

  if (result !== "unchanged") {
    // ponytail: upsert (not create/update) so a concurrent poll for the same
    // (userId, sourceType, sourceId) can't throw P2002 on the losing write.
    await prismaLog.notificationSourceState.upsert({
      where: { userId_sourceType_sourceId: { userId, sourceType, sourceId } },
      create: { userId, sourceType, sourceId, lastStatus: currentStatus },
      update: { lastStatus: currentStatus },
    });
  }

  return result;
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
      // POSTOController.DataTable() builds a dynamic `OrderBy("pos." + columns[order[0][column]].name + " " + order[0][dir])`
      // from these params — omitting them makes it `OrderBy("pos.  ")`, which throws
      // (uncaught, no try/catch in that action) and the request comes back non-ok.
      // "id" matches POSTO.cs's actual (lowercase) property name.
      body: "draw=1&start=0&length=50&search[value]=&columns[0][name]=id&order[0][column]=0&order[0][dir]=asc",
    },
  );
  if (postoRes.ok) {
    let { data } = (await postoRes.json()) as { data: PostoRow[] };
    if (!Array.isArray(data)) data = [];
    // Posto has no natural "status" to transition, so "new" (never-seen source id)
    // is the only signal available — but on a user's very first sync EVERY row is
    // simultaneously "new", which must NOT flood-notify. Distinguish cold start at
    // the (user, sourceType) level: if this user has no prior posto source-state
    // rows at all, this is their baseline sync — seed silently. Otherwise a "new"
    // row really is a newly-appeared posto since their last sync — notify.
    const hasPriorPostoSync = (await prismaLog.notificationSourceState.count({
      where: { userId, sourceType: "posto" },
    })) > 0;
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
  }

  // 2. Armada approve/reject — first sighting seeds state without notifying;
  //    only a real status transition (e.g. pending -> approved) notifies.
  const reviewRes = await aspnetFetchServer(
    "/api/Armada/DataTableReview",
    session.aspnetToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      // Same dynamic-OrderBy requirement as POSTO/DataTable above — this action
      // does have a try/catch, so a missing sort column doesn't 500, it silently
      // returns an empty list instead (equally broken, just a different failure
      // shape). "ID" matches ArmadaReview.cs's actual (uppercase) property name.
      body: "draw=1&start=0&length=50&search[value]=&columns[0][name]=ID&order[0][column]=0&order[0][dir]=asc",
    },
  );
  if (reviewRes.ok) {
    let { data } = (await reviewRes.json()) as { data: ArmadaReviewRow[] };
    if (!Array.isArray(data)) data = [];
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

  // 3. Armada blokir/buka-blokir — a real transition ("changed") always notifies.
  //    Unlike posto/pengajuan, first sighting of an ALREADY-blocked vehicle also
  //    notifies (no cold-start suppression here): a blocked vehicle is actionable
  //    info the owner needs regardless of whether they missed the actual toggle
  //    event, and a transportir's own fleet is small enough that this can't flood
  //    the way "every historical posto" could. First sighting of an already-ACTIVE
  //    vehicle stays quiet, same as before — nobody wants a "still fine" notice.
  const statusRes = await aspnetFetchServer(
    "/api/Armada/GetOwnArmadaStatus",
    session.aspnetToken,
  );
  if (statusRes.ok) {
    let rows = (await statusRes.json()) as ArmadaStatusRow[];
    if (!Array.isArray(rows)) rows = [];
    for (const row of rows) {
      const statusKey = row.IsBlocked ? "blocked" : "active";
      const result = await seedOrDiff(
        userId,
        "armada_blocked",
        String(row.ID),
        statusKey,
      );
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
    }
  }
}
