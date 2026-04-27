import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    const userRoles = (session.user as any).roles || [];
    const isRekanan = userRoles.includes('rekanan');
    const sapVendorCode = (session.user as any).companyCode;

    const params: any[] = [];
    let filters = '';
    if (isRekanan && sapVendorCode) { params.push(sapVendorCode); filters += ` AND po.transport=$${params.length}`; }
    if (search) { params.push(`%${search}%`); filters += ` AND (po.noposto ILIKE $${params.length} OR u.fullname ILIKE $${params.length} OR po.transport ILIKE $${params.length})`; }
    if (date) { params.push(date); filters += ` AND DATE(po.tglposto)=$${params.length}`; }

    const result = await query(`
      SELECT po.noposto as id, TO_CHAR(po.tglposto,'YYYY-MM-DD') as date,
        COALESCE(u.fullname, po.transport) as transportir, po.transport as transportirid,
        COALESCE(p.nama, po.produk) as product, po.produk as productid,
        po.qty, po.qtyrealisasi as realization,
        COALESCE(ga.deskripsi, po.asal) as asal, COALESCE(gt.deskripsi, po.tujuan) as tujuan,
        po.wilayah, po.bagian, po.companycode as company, po.status as statuscode,
        CASE po.status WHEN '1' THEN 'Active' WHEN '2' THEN 'In Progress' WHEN '3' THEN 'Completed' WHEN '0' THEN 'Cancelled' ELSE 'Unknown' END as status
      FROM posto po
      LEFT JOIN produk p ON po.produk = p.kode
      LEFT JOIN users u ON po.transport = u.sapvendorcode
      LEFT JOIN gudang ga ON po.asal = ga.id
      LEFT JOIN gudang gt ON po.tujuan = gt.id
      WHERE 1=1 ${filters}
      ORDER BY po.tglposto DESC, po.noposto DESC
    `, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
