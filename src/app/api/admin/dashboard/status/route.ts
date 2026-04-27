import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "superadmin"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const plantResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE has_security = true) as activeplants,
        COUNT(*) FILTER (WHERE has_security = false OR has_security IS NULL) as inactiveplants
      FROM company
    `);
    const warehouseResult = await query(`SELECT COUNT(*) as count FROM gudang`);
    return NextResponse.json({
      activePlants: Number(plantResult.rows[0]?.activeplants) || 0,
      inactivePlants: Number(plantResult.rows[0]?.inactiveplants) || 0,
      totalWarehouses: Number(warehouseResult.rows[0]?.count) || 0,
      regions: 8
    });
  } catch (error) {
    console.error("Admin Dashboard Status Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
