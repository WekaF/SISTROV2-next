import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isSuperAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/RoleMenuGroup/List", token);
    if (!res.ok) throw new Error("Failed to fetch role menu groups");
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = (session?.user as any)?.aspnetToken as string;
    const body = await req.json();
    const res = await aspnetFetchServer("/api/RoleMenuGroup/Update", token, {
      method: "POST",
      body: JSON.stringify({ RoleId: body.roleId, MenuGroup: body.menuGroup }),
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: await res.json() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
