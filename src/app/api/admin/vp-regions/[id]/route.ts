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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { name } = body as { name: string };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama region wajib diisi" }, { status: 400 });
    }

    const username = (session?.user as any)?.username ?? "unknown";

    try {
      const updated = await prismaLog.vpRegion.update({
        where: { id },
        data: {
          name: name.trim(),
          updatedBy: username,
        },
        include: { wilayahs: true },
      });

      return NextResponse.json({ success: true, data: updated });
    } catch (dbError: any) {
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Nama region sudah dipakai" },
          { status: 409 }
        );
      }
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
    const id = parseInt(resolvedParams.id, 10);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Check if region has wilayahs assigned
    const wilayahCount = await prismaLog.vpRegionWilayah.count({
      where: { vpRegionId: id },
    });

    if (wilayahCount > 0) {
      return NextResponse.json(
        { error: "Region masih punya wilayah terpasang, lepas dulu sebelum hapus" },
        { status: 409 }
      );
    }

    try {
      await prismaLog.vpRegion.delete({
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
