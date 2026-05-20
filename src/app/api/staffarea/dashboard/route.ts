import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { normalizeRole } from "@/lib/role-utils";

const ALLOWED = new Set(["staffarea", "gudang", "pod"]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allRoles: string[] = ((session.user as any)?.roles as string[] | undefined) ?? [(session.user as any)?.role];
  const allowed = allRoles.some(r => ALLOWED.has(normalizeRole(r)));
  if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const companyCode = (session?.user as any)?.companyCode as string | undefined;
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
