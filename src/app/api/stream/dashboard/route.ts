import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { resolveScopeCompanies } from "@/lib/manager-scope";

const VIEWER_ROLES = ["superadmin", "ti", "admin", "pod", "viewer", "adminarmada", "adminsumbu", "manager"];

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    VIEWER_ROLES.includes(r.toLowerCase())
  );
}

async function fetchAllDashboardData(
  token: string,
  period: string | undefined,
  month: string | undefined,
  year: string | undefined,
  companiesParam: string | undefined
) {
  const safe = async (path: string) => {
    try {
      const res = await aspnetFetchServer(path, token);
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.error("[Dashboard] fetch error for", path, err);
      return null;
    }
  };

  const withCompanies = (path: string, extra?: Record<string, string>) => {
    const queryParams = new URLSearchParams(extra);
    if (companiesParam !== undefined) queryParams.set("companies", companiesParam);
    const qs = queryParams.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const statsExtra: Record<string, string> = {};
  if (period) statsExtra.period = period;
  if (month) statsExtra.month = month;
  if (year) statsExtra.year = year;

  const [stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData] =
    await Promise.all([
      safe(withCompanies("/api/Home/MonitorStats", statsExtra)),
      safe(withCompanies("/api/Home/GetTiketTrendPerPlant")),
      safe(withCompanies("/api/Home/GetTiketTrendPerHour")),
      safe(withCompanies("/api/Home/GetDurasiProsesMuat")),
      safe(withCompanies("/api/Home/GetMonthlyOverview")),
      safe(withCompanies("/api/Home/GetPlantLeaderboard")),
      safe(withCompanies("/api/Home/GetTopDurasiTiket")),
      safe(withCompanies("/api/Home/GetTopProdukVolume")),
      // MonitorMapData's param is named `companyFilter`, not `companies` (see Task 2 Step 9)
      safe((() => {
        const p = new URLSearchParams();
        if (companiesParam !== undefined) p.set("companyFilter", companiesParam);
        const qs = p.toString();
        return qs ? `/api/Home/MonitorMapData?${qs}` : "/api/Home/MonitorMapData";
      })()),
    ]);

  return { stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  const userId = (session?.user as any)?.id as string;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || undefined;
  const month = searchParams.get("month") || undefined;
  const year = searchParams.get("year") || undefined;

  const scope = await resolveScopeCompanies(userId, token);
  // companyCodes === null means "no restriction" — the `companies` param is
  // omitted entirely so every HomeController endpoint behaves exactly as it
  // does today. A non-null (possibly empty) array is always passed through,
  // so an empty scope can never be mistaken for "no filter".
  const companiesParam = scope.companyCodes !== null ? scope.companyCodes.join(",") : undefined;

  const data = await fetchAllDashboardData(token, period, month, year, companiesParam);

  return NextResponse.json({
    ...data,
    scope: scope.tier !== "none" ? { tier: scope.tier, label: scope.label } : null,
  });
}
