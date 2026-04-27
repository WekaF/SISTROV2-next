import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');
    if (!warehouseId) return NextResponse.json({ success: false, error: "Warehouse ID is required" }, { status: 400 });
    const result = await query(`
      SELECT pm.id, pm.companycode, c.company as companyname
      FROM gudangtujuanmapping pm JOIN company c ON pm.companycode = c.company_code
      WHERE pm.warehouseid=$1
    `, [warehouseId]);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { warehouseId, companyCode } = await req.json();
    if (!warehouseId || !companyCode) return NextResponse.json({ success: false, error: "Required fields missing" }, { status: 400 });
    const check = await query(`SELECT 1 FROM gudangtujuanmapping WHERE warehouseid=$1 AND companycode=$2`, [warehouseId, companyCode]);
    if (check.rows.length > 0) return NextResponse.json({ success: false, error: "Mapping already exists" }, { status: 400 });
    await query(`INSERT INTO gudangtujuanmapping (warehouseid, companycode, createdat) VALUES ($1, $2, NOW())`, [warehouseId, companyCode]);
    return NextResponse.json({ success: true, message: "Mapping created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const mappingId = searchParams.get('id');
    if (!mappingId) return NextResponse.json({ success: false, error: "Mapping ID is required" }, { status: 400 });
    await query(`DELETE FROM gudangtujuanmapping WHERE id=$1`, [mappingId]);
    return NextResponse.json({ success: true, message: "Mapping removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
