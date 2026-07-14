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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const regions = await prismaLog.vpRegion.findMany({
      include: { wilayahs: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: regions });
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

    const { name } = body as { name: string };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama region wajib diisi" }, { status: 400 });
    }

    const username = (session?.user as any)?.username ?? "unknown";

    try {
      const created = await prismaLog.vpRegion.create({
        data: {
          name: name.trim(),
          createdBy: username,
        },
        include: { wilayahs: true },
      });

      return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (dbError: any) {
      if (dbError.code === "P2002") {
        return NextResponse.json(
          { error: "Nama region sudah dipakai" },
          { status: 409 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
