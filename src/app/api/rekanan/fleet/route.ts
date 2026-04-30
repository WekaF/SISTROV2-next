import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const sapVendorCode = (session?.user as any)?.companyCode;
    const userRoles = (session?.user as any)?.roles || [];
    if (!session?.user || !userRoles.includes('rekanan') || !sapVendorCode) {
      return NextResponse.json({ success: false, error: "Unauthorized or missing vendor linkage" }, { status: 401 });
    }
    const result = await query(`
      SELECT f.*, s.nama as axlename FROM m_fleet f
      LEFT JOIN sumbu s ON f.sumbuid = s.id
      WHERE f.vendorcode=$1 ORDER BY f.createdat DESC
    `, [sapVendorCode]);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sapVendorCode = (session?.user as any)?.companyCode;
    const userRoles = (session?.user as any)?.roles || [];
    if (!session?.user || !userRoles.includes('rekanan') || !sapVendorCode) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { Nopol, SumbuId, Type } = await req.json();
    if (!Nopol) return NextResponse.json({ success: false, error: "Nopol is required" }, { status: 400 });
    const check = await query(`SELECT 1 FROM m_fleet WHERE nopol=$1`, [Nopol]);
    if (check.rows.length > 0) return NextResponse.json({ success: false, error: "Fleet with this Nopol already exists" }, { status: 400 });
    await query(`INSERT INTO m_fleet (nopol, vendorcode, sumbuid, type, isverified, createdat, updatedat) VALUES ($1,$2,$3,$4,false,NOW(),NOW())`,
      [Nopol, sapVendorCode, SumbuId||null, Type||null]);
    return NextResponse.json({ success: true, message: "Fleet submitted successfully for verification" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
