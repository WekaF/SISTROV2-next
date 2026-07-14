import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

function isAuthorized(session: any): boolean {
  const roles: string[] = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r) =>
    ["superadmin", "ti"].includes(r.toLowerCase())
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const vpRegionId = parseInt(resolvedParams.id, 10);

    if (isNaN(vpRegionId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { wilayahCode } = body as { wilayahCode: string };

    if (!wilayahCode || !wilayahCode.trim()) {
      return NextResponse.json({ error: "wilayahCode wajib diisi" }, { status: 400 });
    }

    // Verify region exists
    const region = await prismaLog.vpRegion.findUnique({
      where: { id: vpRegionId },
    });

    if (!region) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    try {
      const upserted = await prismaLog.vpRegionWilayah.upsert({
        where: { wilayahCode: wilayahCode.trim() },
        update: { vpRegionId },
        create: {
          vpRegionId,
          wilayahCode: wilayahCode.trim(),
        },
      });

      return NextResponse.json({ success: true, data: upserted }, { status: 201 });
    } catch (dbError: any) {
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Wilayah code sudah dipakai" },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const vpRegionId = parseInt(resolvedParams.id, 10);

    if (isNaN(vpRegionId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const wilayahCode = searchParams.get("wilayahCode");

    if (!wilayahCode || !wilayahCode.trim()) {
      return NextResponse.json(
        { error: "Query parameter ?wilayahCode= wajib diisi" },
        { status: 400 }
      );
    }

    try {
      await prismaLog.vpRegionWilayah.delete({
        where: { wilayahCode: wilayahCode.trim() },
      });

      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      if (dbError.code === "P2025") {
        return NextResponse.json(
          { error: "Data tidak ditemukan" },
          { status: 404 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
