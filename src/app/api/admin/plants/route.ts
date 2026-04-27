import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const result = await query(`
      SELECT c.id, c.company_code as code, c.company as name, c.regionid,
        r.name as regionname, c.has_security, c.timbangan, c.has_gudang,
        c.is_so, c.is_percepatan, c.is_status_plant, c.is_tahun_pembuatan, c.is_odol, c.posto_tipe
      FROM company c LEFT JOIN regions r ON c.regionid = r.id
      ORDER BY c.company ASC
    `);
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
    const { code, name, regionId, hasSecurity, hasTimbangan, hasGudang, isSo, isPercepatan, isStatusPlant, isTahunPembuatan, isOdol, postoTipe } = await req.json();
    if (!code || !name) return NextResponse.json({ success: false, error: "Code and Name are required" }, { status: 400 });
    const check = await query(`SELECT 1 FROM company WHERE company_code=$1`, [code]);
    if (check.rows.length > 0) return NextResponse.json({ success: false, error: "Company Code already exists" }, { status: 400 });
    await query(`
      INSERT INTO company (company_code, company, regionid, has_security, timbangan, has_gudang, is_so, is_percepatan, is_status_plant, is_tahun_pembuatan, is_odol, posto_tipe, createdat)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
    `, [code, name, regionId||null, hasSecurity||false, hasTimbangan||false, hasGudang||false, isSo||false, isPercepatan||false, isStatusPlant||false, isTahunPembuatan||false, isOdol||false, postoTipe||null]);
    return NextResponse.json({ success: true, message: "Plant created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id, code, name, regionId, hasSecurity, hasTimbangan, hasGudang, isSo, isPercepatan, isStatusPlant, isTahunPembuatan, isOdol, postoTipe } = await req.json();
    if (!id || !code || !name) return NextResponse.json({ success: false, error: "ID, Code and Name are required" }, { status: 400 });
    await query(`
      UPDATE company SET company_code=$1, company=$2, regionid=$3, has_security=$4, timbangan=$5, has_gudang=$6,
        is_so=$7, is_percepatan=$8, is_status_plant=$9, is_tahun_pembuatan=$10, is_odol=$11, posto_tipe=$12
      WHERE id=$13
    `, [code, name, regionId||null, hasSecurity||false, hasTimbangan||false, hasGudang||false, isSo||false, isPercepatan||false, isStatusPlant||false, isTahunPembuatan||false, isOdol||false, postoTipe||null, id]);
    return NextResponse.json({ success: true, message: "Plant updated successfully" });
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
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    await query(`DELETE FROM company WHERE id=$1`, [id]);
    return NextResponse.json({ success: true, message: "Plant deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
