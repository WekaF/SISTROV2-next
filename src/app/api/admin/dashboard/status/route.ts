import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "superadmin"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Home/GetViewerDashboardStats', token);
    if (!res.ok) throw new Error("Failed to fetch dashboard stats");
    
    const data = await res.json();
    return NextResponse.json({
      activePlants: data.ActivePlants || data.activePlants || 0,
      inactivePlants: data.InactivePlants || data.inactivePlants || 0,
      totalWarehouses: data.TotalWarehouses || data.totalWarehouses || 0,
      regions: data.Regions || data.regions || 8
    });
  } catch (error) {
    console.error("Admin Dashboard Status Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
