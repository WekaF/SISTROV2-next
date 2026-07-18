import { prismaLog } from "@/lib/prisma";
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
      // ArmadaController.DataTableReview() builds a dynamic `OrderBy(columns[order[0][column]].name + " " + order[0][dir])`
      // from these params — omitting them makes it `OrderBy("  ")`, which throws
      // (caught by that action's try/catch, silently returning an empty list
      // instead of erroring) — so this call always came back with 0 rows without
      // these. "ID" matches ArmadaReview.cs's actual (uppercase) property name.
      body: "draw=1&start=0&length=50&search[value]=&columns[0][name]=ID&order[0][column]=0&order[0][dir]=asc",
    },
  );
  if (!reviewRes.ok) return;

  let { data } = (await reviewRes.json()) as { data: ArmadaReviewRow[] };
  if (!Array.isArray(data)) data = [];

  // Cold-start guard: on a user's very first sync, every currently-pending row
  // would otherwise be "first sighting" simultaneously and flood-notify. Check
  // once, before processing any row, whether this user has ANY prior source-state
  // rows for this sourceType — if not, this run is their baseline: seed silently.
  const hasPriorSync = (await prismaLog.notificationSourceState.count({
    where: { userId, sourceType: "armada_review_pending" },
  })) > 0;

  for (const row of data) {
    if (row.aprrovestatus !== "Menunggu Approve") continue;

    const sourceId = String(row.ID);
    const existing = await prismaLog.notificationSourceState.findUnique({
      where: {
        userId_sourceType_sourceId: {
          userId,
          sourceType: "armada_review_pending",
          sourceId,
        },
      },
    });
    if (existing) continue;

    // upsert (not create) — safe against a concurrent poll racing this same
    // (userId, sourceType, sourceId) between the findUnique above and here.
    await prismaLog.notificationSourceState.upsert({
      where: {
        userId_sourceType_sourceId: {
          userId,
          sourceType: "armada_review_pending",
          sourceId,
        },
      },
      create: { userId, sourceType: "armada_review_pending", sourceId, lastStatus: "pending" },
      update: { lastStatus: "pending" },
    });

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
  }
}
