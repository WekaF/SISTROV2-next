import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id: noPosto } = await params;
    const result = await query(`
      SELECT po.noposto as id, TO_CHAR(po.tglposto,'YYYY-MM-DD') as date, TO_CHAR(po.tgljatuhtempo,'YYYY-MM-DD') as expirydate,
        COALESCE(u.fullname, po.transport) as transportir, po.transport as transportirid,
        COALESCE(p.nama, po.produk) as product, po.produk as productid,
        po.qty, po.qtyrealisasi as realization, po.asal, po.tujuan, po.wilayah, po.bagian,
        po.companycode as company, po.status as statuscode,
        CASE po.status WHEN '1' THEN 'Active' WHEN '2' THEN 'In Progress' WHEN '3' THEN 'Completed' WHEN '0' THEN 'Cancelled' ELSE 'Unknown' END as status,
        po.initialqty, po.charter, po.percepatan
      FROM posto po
      LEFT JOIN produk p ON po.produk = p.kode
      LEFT JOIN users u ON po.transport = u.sapvendorcode
      WHERE po.noposto=$1
    `, [noPosto]);
    if (result.rows.length === 0) return NextResponse.json({ success: false, error: "POSTO not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id: noPosto } = await params;
    const { date, qty, expiryDate } = await req.json();
    await query(`UPDATE posto SET tglposto=$1, qty=$2, tgljatuhtempo=$3, updatedon=NOW(), updatedby=$4 WHERE noposto=$5`,
      [date, Number(qty), expiryDate||null, (session.user as any)?.id||null, noPosto]);
    return NextResponse.json({ success: true, message: "POSTO updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id: noPosto } = await params;
    await query(`DELETE FROM posto WHERE noposto=$1`, [noPosto]);
    return NextResponse.json({ success: true, message: "POSTO deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
