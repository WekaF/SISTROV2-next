import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { resolveScopeCompanies } from "@/lib/manager-scope";

function isManager(session: any): boolean {
  const groups: string[] = (session?.user as any)?.menuGroups || [];
  const single = (session?.user as any)?.menuGroup as string | undefined;
  return !!session?.user && (groups.includes("manager") || single === "manager");
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const userId = (session?.user as any)?.id as string;

    const scope = await resolveScopeCompanies(userId, token);
    if (!scope.companyCodes || scope.companyCodes.length === 0) {
      return NextResponse.json({ error: "Belum ada scope (wilayah/company) yang di-assign" }, { status: 403 });
    }
    const companies = scope.companyCodes.join(",");

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";

    const [statsRes, trendRes] = await Promise.all([
      aspnetFetchServer(`/api/CompanyDashboard/GetStatsMulti?companies=${encodeURIComponent(companies)}`, token),
      aspnetFetchServer(`/api/CompanyDashboard/GetManagerStatsMulti?companies=${encodeURIComponent(companies)}&period=${period}`, token),
    ]);

    if (!statsRes.ok) throw new Error(`Backend ${statsRes.status}: ${await statsRes.text().catch(() => statsRes.statusText)}`);
    if (!trendRes.ok) throw new Error(`Backend ${trendRes.status}: ${await trendRes.text().catch(() => trendRes.statusText)}`);

    return NextResponse.json({
      stats: await statsRes.json(),
      trend: await trendRes.json(),
      scopeLabel: scope.label,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
