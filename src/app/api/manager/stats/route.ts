import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isManager(session: any): boolean {
  const groups: string[] = (session?.user as any)?.menuGroups || [];
  return !!session?.user && groups.some((g) => ["manager", "superadmin", "admin"].includes(g));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = (session?.user as any)?.aspnetToken as string;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";
    const res = await aspnetFetchServer(
      `/api/CompanyDashboard/GetManagerStats?period=${period}`, token
    );
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`Backend ${res.status}: ${body}`);
    }
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
