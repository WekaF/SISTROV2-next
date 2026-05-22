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
  if (!allRoles.some(r => ALLOWED.has(normalizeRole(r))))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = (session.user as any)?.aspnetToken as string;
    const { searchParams } = new URL(request.url);
    let companyCode = searchParams.get("companyCode");
    const idproduk = searchParams.get("idproduk") ?? "all";

    if (!companyCode) {
      const cookieStore = await cookies();
      companyCode = cookieStore.get("sistro_active_company")?.value || (session.user as any)?.companyCode || null;
    }

    let url = `/api/CompanyDashboard/GetRealisasiChart?idproduk=${encodeURIComponent(idproduk)}`;
    if (companyCode) url += `&companyCode=${encodeURIComponent(companyCode)}`;

    const res = await aspnetFetchServer(url, token);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({ error: `Backend error ${res.status}`, detail: body }, { status: res.status === 401 ? 401 : 502 });
    }
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
