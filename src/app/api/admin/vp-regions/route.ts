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

function toRegion(r: any) {
  return {
    id: r.Id,
    name: r.Name,
    wilayahs: (r.WilayahCodes || []).map((code: string) => ({ id: code, wilayahCode: code })),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/VpRegion/List", token);
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`Backend ${res.status}: ${body}`);
    }

    const regions: any[] = await res.json();
    return NextResponse.json({ success: true, data: regions.map(toRegion) });
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

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/VpRegion/Create", token, {
      method: "POST",
      body: JSON.stringify({ Name: body.name }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const created = await res.json();
    return NextResponse.json({ success: true, data: toRegion(created) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
