import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { normalizeRole } from "@/lib/role-utils";
import { cookies } from "next/headers";

const ALLOWED = new Set(["staffarea", "gudang", "pod", "superadmin", "ti", "admin", "security", "jembatan_timbang"]);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allRoles: string[] = ((session.user as any)?.roles as string[] | undefined) ?? [(session.user as any)?.role];
  const allowed = allRoles.some(r => ALLOWED.has(normalizeRole(r)));
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let companyCode = searchParams.get("companyCode");

  if (!companyCode) {
    const cookieStore = await cookies();
    companyCode = cookieStore.get("sistro_active_company")?.value || (session?.user as any)?.companyCode || null;
  }

  const url = companyCode
    ? `/api/CompanyDashboard/GetStats?companyCode=${encodeURIComponent(companyCode)}`
    : "/api/CompanyDashboard/GetStats";

  try {
    const res = await aspnetFetchServer(url, token);
    if (!res.ok) {
      return NextResponse.json({ error: "Backend error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[StaffArea Dashboard] fetch error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
