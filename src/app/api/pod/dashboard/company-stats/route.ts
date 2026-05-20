import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { normalizeRole } from "@/lib/role-utils";

const ALLOWED = new Set(["pod", "staffarea", "gudang"]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allRoles: string[] = ((session.user as any)?.roles as string[] | undefined) ?? [(session.user as any)?.role];
  if (!allRoles.some(r => ALLOWED.has(normalizeRole(r)))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const companyCode = (session?.user as any)?.companyCode as string | undefined;
    const url = companyCode
      ? `/api/CompanyDashboard/GetStats?companyCode=${encodeURIComponent(companyCode)}`
      : "/api/CompanyDashboard/GetStats";
    const res = await aspnetFetchServer(url, token);
    if (!res.ok) throw new Error(`ASP.NET returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[POD Company Stats]", error.message);
    return NextResponse.json({ error: "Failed to fetch company stats" }, { status: 500 });
  }
}
