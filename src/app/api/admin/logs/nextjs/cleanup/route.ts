import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || role?.toLowerCase() !== "ti") {
    return NextResponse.json({ error: "Unauthorized — hanya role TI" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const keepDays = Math.max(7, parseInt(searchParams.get("keepDays") ?? "90", 10));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);

  try {
    const result = await prismaLog.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return NextResponse.json({ deleted: result.count, cutoff: cutoff.toISOString() });
  } catch (err: any) {
    console.error("[logs/cleanup]", err.message);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
