import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const VIEWER_ROLES = ["superadmin", "ti", "admin", "pod", "viewer", "adminarmada", "adminsumbu"];

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    VIEWER_ROLES.includes(r.toLowerCase())
  );
}

async function fetchAllDashboardData(token: string) {
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

  const [stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData] =
    await Promise.all([
      safe("/api/Home/MonitorStats"),
      safe("/api/Home/GetTiketTrendPerPlant"),
      safe("/api/Home/GetTiketTrendPerHour"),
      safe("/api/Home/GetDurasiProsesMuat"),
      safe("/api/Home/GetMonthlyOverview"),
      safe("/api/Home/GetPlantLeaderboard"),
      safe("/api/Home/GetTopDurasiTiket"),
      safe("/api/Home/GetTopProdukVolume"),
      safe("/api/Home/MonitorMapData"),
    ]);

  return { stats, trendPlant, trendHour, durasi, monthly, leaderboard, durasiTickets, topProduk, mapData };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const data = await fetchAllDashboardData(token);
  return NextResponse.json(data);
}
