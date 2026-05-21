import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isSuperAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = (session?.user as any)?.aspnetToken as string;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const res = await aspnetFetchServer(`/api/UserMenuGroup/List?search=${encodeURIComponent(search)}`, token);
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`Backend ${res.status}: ${body}`);
    }
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = (session?.user as any)?.aspnetToken as string;
    const body = await req.json();
    const res = await aspnetFetchServer("/api/UserMenuGroup/Set", token, {
      method: "POST",
      body: JSON.stringify({ UserId: body.userId, MenuGroup: body.menuGroup }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
