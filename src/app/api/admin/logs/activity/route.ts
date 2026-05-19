import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !role || !["superadmin", "ti"].includes(role.toLowerCase())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "50";
  const table = searchParams.get("table") ?? "";
  const user = searchParams.get("user") ?? "";

  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const params = new URLSearchParams({ page, limit });
    if (table) params.set("table", table);
    if (user) params.set("user", user);
    const res = await aspnetFetchServer(`/api/ActivityLog/GetActivityLog?${params}`, token);
    if (!res.ok) throw new Error(`ASP.NET returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[ActivityLog proxy]", error.message);
    return NextResponse.json({ error: "Failed to fetch activity log" }, { status: 500 });
  }
}
