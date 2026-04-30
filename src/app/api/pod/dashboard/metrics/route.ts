import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "pod") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [tonnageResult, activityResult] = await Promise.all([
      query(`SELECT COALESCE(SUM(qty),0) as totaltonnage FROM tiket WHERE DATE(tanggal)=CURRENT_DATE`),
      query(`SELECT COUNT(*) as totaltickets, COUNT(timegudang) as completed, COUNT(*) FILTER (WHERE timegudang IS NULL) as inprocess FROM tiket WHERE DATE(tanggal)=CURRENT_DATE`)
    ]);
    return NextResponse.json({
      tonnage: Number(tonnageResult.rows[0]?.totaltonnage) || 0,
      totalTickets: Number(activityResult.rows[0]?.totaltickets) || 0,
      completed: Number(activityResult.rows[0]?.completed) || 0,
      inProcess: Number(activityResult.rows[0]?.inprocess) || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ tonnage: 0, totalTickets: 0, completed: 0, inProcess: 0, mocked: true });
  }
}
