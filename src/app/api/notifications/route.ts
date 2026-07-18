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
    // id tiebreaker: createdAt alone isn't unique (TIMESTAMP(3), millisecond
    // precision — same-millisecond rows are possible), which cursor pagination
    // needs to stay stable across page boundaries.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    ...(cursor ? { skip: 1, cursor: { id: Number(cursor) } } : {}),
  });
  const unreadCount = await prismaLog.notification.count({
    where: { userId: user.username, isRead: false },
  });
  const nextCursor = notifications.length === take ? notifications[notifications.length - 1].id : null;

  return NextResponse.json({ data: notifications, unreadCount, nextCursor });
}
