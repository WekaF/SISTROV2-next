import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let where = `WHERE (deleted IS NULL OR deleted = false)`;
    if (search) { params.push(`%${search}%`); where += ` AND (nama ILIKE $1 OR kode ILIKE $1)`; }

    const countResult = await query(`SELECT COUNT(*) as total FROM produk ${where}`, params);
    const total = Number(countResult.rows[0].total);

    const dataParams = [...params, limit, offset];
    const result = await query(`
      SELECT p.id, p.nama as name, p.kode as code, p.issubsidi,
        (SELECT COUNT(*) FROM produkmapping pm WHERE pm.produkid = p.id) as mappingcount,
        STRING_AGG(c.company, ', ') as plants
      FROM produk p
      LEFT JOIN produkmapping pm2 ON pm2.produkid = p.id
      LEFT JOIN company c ON pm2.companycode = c.company_code
      ${where}
      GROUP BY p.id, p.nama, p.kode, p.issubsidi
      ORDER BY p.nama ASC LIMIT $${params.length+1} OFFSET $${params.length+2}
    `, dataParams);

    return NextResponse.json({ success: true, data: result.rows, pagination: { total, page, limit, totalPages: Math.ceil(total/limit) } });
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
    const { name, code, isSubsidi } = await req.json();
    if (!name || !code) return NextResponse.json({ success: false, error: "Name and Code are required" }, { status: 400 });
    const check = await query(`SELECT 1 FROM produk WHERE kode=$1 AND (deleted IS NULL OR deleted=false)`, [code]);
    if (check.rows.length > 0) return NextResponse.json({ success: false, error: "Product code already exists" }, { status: 400 });
    await query(`INSERT INTO produk (nama, kode, issubsidi, createdat, deleted) VALUES ($1,$2,$3,NOW(),false)`, [name, code, isSubsidi||false]);
    return NextResponse.json({ success: true, message: "Product created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
