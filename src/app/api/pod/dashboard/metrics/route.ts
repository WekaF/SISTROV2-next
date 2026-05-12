import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "pod") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Home/GetViewerDashboardStats', token);
    if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
    
    const data = await res.json();
    return NextResponse.json({
      tonnage: data.TotalTonnage || data.totalTonnage || 0,
      totalTickets: data.TotalTickets || data.totalTickets || 0,
      completed: data.Completed || data.completed || 0,
      inProcess: data.InProcess || data.inProcess || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ tonnage: 0, totalTickets: 0, completed: 0, inProcess: 0, mocked: true, error: error.message });
  }
}
