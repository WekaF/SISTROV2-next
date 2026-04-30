import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || (role !== 'superadmin' && role !== 'admin')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    let sql = `
      SELECT f.*, t.name as transportername, s.nama as axlename
      FROM m_fleet f
      LEFT JOIN m_transport t ON f.vendorcode = t.vendorcode
      LEFT JOIN sumbu s ON f.sumbuid = s.id
    `;
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      sql += ` WHERE f.nopol ILIKE $1 OR t.name ILIKE $1`;
    }
    sql += ` ORDER BY f.createdat DESC`;
    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || (role !== 'superadmin' && role !== 'admin')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { Nopol, IsVerified, ExpiryDate } = await req.json();
    if (!Nopol) return NextResponse.json({ success: false, error: "Nopol is required" }, { status: 400 });
    await query(`UPDATE m_fleet SET isverified=$1, expirydate=$2, updatedat=NOW() WHERE nopol=$3`,
      [IsVerified || false, ExpiryDate || null, Nopol]);
    return NextResponse.json({ success: true, message: "Fleet updated successfully" });
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
    const nopol = searchParams.get('nopol');
    if (!nopol) return NextResponse.json({ success: false, error: "nopol is required" }, { status: 400 });
    await query(`DELETE FROM m_fleet WHERE nopol=$1`, [nopol]);
    return NextResponse.json({ success: true, message: "Fleet deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
