import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getDbConnection } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !["admin", "superadmin"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pool = await getDbConnection();
    
    // 1. Fetch Plant Counts
    const plantResult = await pool.request().query(`
      SELECT 
        SUM(CASE WHEN statusPlant = 1 THEN 1 ELSE 0 END) as activePlants,
        SUM(CASE WHEN statusPlant = 0 OR statusPlant IS NULL THEN 1 ELSE 0 END) as inactivePlants
      FROM Company
    `);

    // 2. Fetch Warehouse Count (with safety check)
    let warehouseCount = 0;
    try {
      const warehouseResult = await pool.request().query("SELECT COUNT(*) as count FROM Gudang");
      warehouseCount = warehouseResult.recordset[0]?.count || 0;
    } catch (e) {
      console.warn("Gudang table might not exist, using 0 as fallback.");
      // Fallback: maybe it's in a different table name or not yet created
      warehouseCount = 0; 
    }

    return NextResponse.json({
      activePlants: plantResult.recordset[0]?.activePlants || 0,
      inactivePlants: plantResult.recordset[0]?.inactivePlants || 0,
      totalWarehouses: warehouseCount,
      regions: 8 // Mocked for now as per dashboard requirements
    });
  } catch (error) {
    console.error("Admin Dashboard Status Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
