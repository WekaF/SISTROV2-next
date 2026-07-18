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
