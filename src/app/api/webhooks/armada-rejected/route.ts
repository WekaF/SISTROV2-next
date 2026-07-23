import { NextRequest, NextResponse } from "next/server";
import { createArmadaRejectedNotification } from "@/lib/notifications/sync-transportir";
import { broadcast } from "@/lib/notifications/sse-hub";

interface ArmadaRejectedPayload {
  username?: string;
  armadaReviewId?: number;
  nopol?: string;
  alasan?: string;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("Token");
  if (!token || token !== process.env.SISTRO_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ArmadaRejectedPayload | null;
  if (!body?.username || !body?.armadaReviewId || !body?.nopol) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await createArmadaRejectedNotification(body.username, body.armadaReviewId, body.nopol);
  broadcast(body.username, "notification", {});

  return NextResponse.json({ ok: true });
}
