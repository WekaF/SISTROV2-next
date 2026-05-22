import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { normalizeRole } from "@/lib/role-utils";
import { cookies } from "next/headers";

const ALLOWED = new Set(["staffarea", "gudang", "pod"]);

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allRoles: string[] = ((session.user as any)?.roles as string[] | undefined) ?? [(session.user as any)?.role];
  const allowed = allRoles.some(r => ALLOWED.has(normalizeRole(r)));
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const token = (session?.user as any)?.aspnetToken as string;
    
    // Get companyCode from query params, falling back to cookie then session
    const { searchParams } = new URL(request.url);
    let companyCode = searchParams.get("companyCode");
    
    if (!companyCode) {
      const cookieStore = await cookies();
      companyCode = cookieStore.get("sistro_active_company")?.value || (session?.user as any)?.companyCode || null;
    }

    const url = companyCode
      ? `/api/CompanyDashboard/GetStats?companyCode=${encodeURIComponent(companyCode)}`
      : "/api/CompanyDashboard/GetStats";
    const res = await aspnetFetchServer(url, token);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[StaffArea Dashboard] backend ${res.status}: ${body}`);
      return NextResponse.json(
        { error: `Backend error ${res.status}`, detail: body },
        { status: res.status === 401 ? 401 : 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[StaffArea Dashboard] fetch threw:", error.message);
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
