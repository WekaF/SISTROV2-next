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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params: any[] = [];
    if (search) {
      params.push(`%${search}%`);
      whereClause = `WHERE id ILIKE $1 OR deskripsi ILIKE $1 OR kabupaten ILIKE $1 OR propinsi ILIKE $1`;
    }

    const countParams = [...params];
    const dataParams = [...params];
    dataParams.push(limit, offset);

    const [countResult, result] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM gudang ${whereClause}`, countParams),
      query(`
        SELECT g.id, g.deskripsi, g.alamat, g.kecamatan, g.kabupaten, g.propinsi,
          (SELECT COUNT(*) FROM gudangtujuanmapping WHERE warehouseid = g.id) as tujuancount,
          (SELECT COUNT(*) FROM gudangmuatmapping WHERE warehouseid = g.id) as muatcount
        FROM gudang g ${whereClause}
        ORDER BY deskripsi ASC LIMIT $${params.length+1} OFFSET $${params.length+2}
      `, dataParams)
    ]);

    const total = Number(countResult.rows[0].total);
    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
