import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = (session.user as any)?.username as string | undefined;
  if (!username) {
    return NextResponse.json({ logs: [] });
  }

  try {
    const logs = await prismaLog.auditLog.findMany({
      where: {
        username: { equals: username, mode: "insensitive" },
        eventType: { in: ["LOGIN", "LOGIN_FAILED", "LOGOUT"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        eventType: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        metadata: true,
      },
    });

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
