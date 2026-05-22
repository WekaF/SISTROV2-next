import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !["superadmin", "ti"].includes(role?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page        = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit       = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const eventType   = searchParams.get("eventType") ?? undefined;
  const username    = searchParams.get("username") ?? undefined;
  const companyCode = searchParams.get("companyCode") ?? undefined;
  const dateFrom    = searchParams.get("dateFrom") ?? undefined;
  const dateTo      = searchParams.get("dateTo") ?? undefined;

  const where: Record<string, unknown> = {};
  if (eventType)   where.eventType   = eventType;
  if (username)    where.username    = { contains: username, mode: "insensitive" };
  if (companyCode) where.companyCode = companyCode;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
    };
  }

  try {
    const [total, rows] = await Promise.all([
      prismaLog.auditLog.count({ where: where as any }),
      prismaLog.auditLog.findMany({
        where:   where as any,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
    ]);

    return NextResponse.json({ data: rows, total, page, limit });
  } catch (err: any) {
    console.error("[logs/nextjs]", err.message);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
