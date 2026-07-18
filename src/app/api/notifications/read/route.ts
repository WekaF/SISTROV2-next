import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.all === true) {
    await prismaLog.notification.updateMany({
      where: { userId: user.username, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await prismaLog.notification.updateMany({
    where: { id, userId: user.username },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
