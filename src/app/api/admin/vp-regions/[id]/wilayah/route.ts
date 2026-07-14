import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles: string[] = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r) =>
    ["superadmin", "ti"].includes(r.toLowerCase())
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    if (!body.wilayahCode || typeof body.wilayahCode !== "string") {
      return NextResponse.json({ error: "wilayahCode required" }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/VpRegion/AssignWilayah", token, {
      method: "POST",
      body: JSON.stringify({ VpRegionId: id, WilayahCode: body.wilayahCode }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const assignment = await res.json();
    return NextResponse.json({
      success: true,
      data: { id: assignment.Id, vpRegionId: assignment.VpRegionId, wilayahCode: assignment.WilayahCode },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await params; // region id not needed, wilayahCode is globally unique
    const { searchParams } = new URL(req.url);
    const wilayahCode = searchParams.get("wilayahCode");
    if (!wilayahCode) return NextResponse.json({ error: "wilayahCode required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/VpRegion/UnassignWilayah", token, {
      method: "POST",
      body: JSON.stringify({ WilayahCode: wilayahCode }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
