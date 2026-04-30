import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { role, id: userId } = session.user as any;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const storageID = searchParams.get('storageID');
    const offset = (page - 1) * limit;

    const params: any[] = [userId];
    let roleFilter = role === 'pod' ? `AND g.company_code IN (SELECT companycode FROM usercompanies WHERE userid=$1)` : '';
    let storageFilter = storageID ? `AND a.storageid=$${params.length+1}` : '';
    if (storageID) params.push(storageID);

    const baseQuery = `
      FROM antrian a
      LEFT JOIN gudang_sppt g ON a.storageid = g.id
      LEFT JOIN tiket t ON a.ticketid = t.bookingno
      LEFT JOIN produk p ON t.idproduk = p.id::varchar
      WHERE 1=1 ${roleFilter} ${storageFilter}
    `;

    const countParams = [...params];
    const dataParams = [...params, limit, offset];
    const [countRes, result] = await Promise.all([
      query(`SELECT COUNT(*) as total ${baseQuery}`, countParams),
      query(`SELECT a.id, a.ticketid, a.storageid, g.deskripsi as storagename, a.updatedon as entrytime,
        a.status, a.pic, t.idproduk as productid, p.nama as productname,
        EXTRACT(EPOCH FROM (NOW()-a.updatedon))/60 as waitminutes
        ${baseQuery} ORDER BY a.updatedon ASC LIMIT $${params.length+1} OFFSET $${params.length+2}`, dataParams)
    ]);

    const summaryParams = [userId];
    const summaryResult = await query(`
      SELECT g.id as storageid, g.deskripsi as storagename, COUNT(*) as queuecount, g.company_code
      FROM antrian a JOIN gudang_sppt g ON a.storageid = g.id
      WHERE a.status IS NULL ${role === 'pod' ? 'AND g.company_code IN (SELECT companycode FROM usercompanies WHERE userid=$1)' : ''}
      GROUP BY g.id, g.deskripsi, g.company_code
    `, summaryParams);

    const total = Number(countRes.rows[0].total);
    return NextResponse.json({ success: true, data: result.rows, summary: summaryResult.rows, pagination: { total, page, limit, totalPages: Math.ceil(total/limit) } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
