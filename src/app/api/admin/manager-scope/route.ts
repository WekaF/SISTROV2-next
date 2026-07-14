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

function toScope(s: any) {
  return {
    id: s.Id,
    userId: s.UserId,
    tier: s.Tier,
    wilayahCode: s.WilayahCode,
    vpRegionId: s.VpRegionId,
    companyCode: s.CompanyCode,
    vpRegion: s.VpRegionId ? { id: s.VpRegionId, name: s.VpRegionName } : null,
  };
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

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer(`/api/ManagerScope/Get?userId=${encodeURIComponent(userId)}`, token);

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const scope = await res.json();
    return NextResponse.json({ success: true, data: toScope(scope) });
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
      vpRegionId?: string;
      companyCode?: string;
    };

    if (!userId || !userId.trim()) {
      return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
    }
    if (!tier || !tier.trim()) {
      return NextResponse.json({ error: "tier wajib diisi" }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/ManagerScope/Save", token, {
      method: "POST",
      body: JSON.stringify({
        UserId: userId.trim(),
        Tier: tier.trim(),
        WilayahCode: wilayahCode,
        VpRegionId: vpRegionId,
        CompanyCode: companyCode,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const scope = await res.json();
    return NextResponse.json({ success: true, data: toScope(scope) }, { status: 201 });
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
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/ManagerScope/Delete", token, {
      method: "POST",
      body: JSON.stringify({ Id: id }),
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
