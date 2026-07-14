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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    const managerScope = await prismaLog.managerScope.findUnique({
      where: { userId },
      include: { vpRegion: true },
    });

    if (!managerScope) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: managerScope });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { userId, tier, wilayahCode, vpRegionId, companyCode } = body as {
      userId?: string;
      tier?: string;
      wilayahCode?: string;
      vpRegionId?: number;
      companyCode?: string;
    };

    // Validation
    if (!userId || !userId.trim()) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }

    if (!tier || !tier.trim()) {
      return NextResponse.json({ error: "tier wajib diisi" }, { status: 400 });
    }

    const normalizedTier = tier.trim().toLowerCase();
    if (!["avp", "vp", "direksi"].includes(normalizedTier)) {
      return NextResponse.json(
        { error: "tier harus salah satu dari: avp, vp, direksi" },
        { status: 400 }
      );
    }

    // Tier-specific validation and data construction
    let updateData: any;

    if (normalizedTier === "avp") {
      if (!wilayahCode || !wilayahCode.trim()) {
        return NextResponse.json({ error: "wilayahCode wajib diisi untuk tier avp" }, { status: 400 });
      }
      updateData = {
        userId: userId.trim(),
        tier: normalizedTier,
        wilayahCode: wilayahCode.trim(),
        vpRegionId: null,
        companyCode: null,
      };
    } else if (normalizedTier === "vp") {
      if (vpRegionId === undefined || vpRegionId === null) {
        return NextResponse.json({ error: "vpRegionId wajib diisi untuk tier vp" }, { status: 400 });
      }
      updateData = {
        userId: userId.trim(),
        tier: normalizedTier,
        wilayahCode: null,
        vpRegionId: vpRegionId,
        companyCode: null,
      };
    } else if (normalizedTier === "direksi") {
      if (!companyCode || !companyCode.trim()) {
        return NextResponse.json({ error: "companyCode wajib diisi untuk tier direksi" }, { status: 400 });
      }
      updateData = {
        userId: userId.trim(),
        tier: normalizedTier,
        wilayahCode: null,
        vpRegionId: null,
        companyCode: companyCode.trim(),
      };
    }

    const username = (session?.user as any)?.username ?? "unknown";

    try {
      const upserted = await prismaLog.managerScope.upsert({
        where: { userId: userId.trim() },
        create: {
          ...updateData,
          createdBy: username,
        },
        update: {
          ...updateData,
          updatedBy: username,
        },
        include: { vpRegion: true },
      });

      return NextResponse.json({ success: true, data: upserted }, { status: 201 });
    } catch (dbError: any) {
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "userId sudah dipakai" },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "id harus berupa angka" }, { status: 400 });
    }

    try {
      await prismaLog.managerScope.delete({
        where: { id },
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
