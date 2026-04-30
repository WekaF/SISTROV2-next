import { NextRequest, NextResponse } from "next/server";
import { query, getPool } from "@/lib/db";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const result = await query(`
      SELECT h.id, TO_CHAR(h.tanggal, 'YYYY-MM-DD') as date, p.nama as product,
        h.kuota as quota,
        COALESCE((SELECT SUM(k4.kuota) FROM kuota4shift k4
          WHERE k4.level3 IN (SELECT id FROM kuota3bagian WHERE level2 IN (SELECT id FROM kuota2wilayah WHERE level1=h.id))), 0) as booked,
        h.activated as status
      FROM kuota1header h LEFT JOIN produk p ON h.idproduk = p.id::varchar
      ORDER BY h.tanggal DESC
    `);
    return NextResponse.json({
      success: true, data: result.rows,
      metrics: {
        totalDailyQuota: result.rows.reduce((a, r) => a + (Number(r.quota)||0), 0),
        totalBooked: result.rows.reduce((a, r) => a + (Number(r.booked)||0), 0),
        totalRealization: 0
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: [], metrics: { totalDailyQuota: 0, totalBooked: 0, totalRealization: 0 } });
  }
}

export async function POST(req: NextRequest) {
  const client = await getPool().connect();
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role?.toLowerCase();
    if (userRole !== 'pod' && userRole !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }
    const { header, wilayah, areas, shifts } = await req.json();
    const updatedby = (session?.user as any)?.id || null;
    await client.query("BEGIN");
    const mappingRes = await client.query(`SELECT abbrev, scope FROM m_bagian`);
    const areaMapping: Record<string,string> = {};
    for (const r of mappingRes.rows) areaMapping[r.abbrev] = r.scope;
    const hRes = await client.query(`INSERT INTO kuota1header (guid,idproduk,tanggal,kuota,activated,updatedby) VALUES ($1,$2,$3,$4,'1',$5) RETURNING id`,
      [crypto.randomUUID(), String(header.productId), header.startDate, Number(header.totalQuota), updatedby]);
    const hId = hRes.rows[0].id;
    for (const [wKey, wVal] of Object.entries(wilayah)) {
      const val = Number(wVal); if (val <= 0) continue;
      const wRes = await client.query(`INSERT INTO kuota2wilayah (guid,level1,wilayah,tanggal,idproduk,kuota,activated) VALUES ($1,$2,$3,$4,$5,$6,'1') RETURNING id`,
        [crypto.randomUUID(), hId, wKey, header.startDate, String(header.productId), val]);
      const wId = wRes.rows[0].id;
      for (const [aKey, aVal] of Object.entries(areas)) {
        const aAmount = Number(aVal); if (aAmount <= 0 || areaMapping[aKey] !== wKey) continue;
        const bRes = await client.query(`INSERT INTO kuota3bagian (guid,level2,bagian,tanggal,idproduk,kuota,activated) VALUES ($1,$2,$3,$4,$5,$6,'1') RETURNING id`,
          [crypto.randomUUID(), wId, aKey, header.startDate, String(header.productId), aAmount]);
        const bId = bRes.rows[0].id;
        const areaShifts = (shifts as any)[aKey];
        if (areaShifts) {
          for (const [sNum, sVal] of Object.entries(areaShifts)) {
            const sAmount = Number(sVal); if (sAmount <= 0) continue;
            await client.query(`INSERT INTO kuota4shift (guid,level3,tanggal,shift,idproduk,kuota,activated) VALUES ($1,$2,$3,$4,$5,$6,'1')`,
              [crypto.randomUUID(), bId, header.startDate, String(sNum), String(header.productId), sAmount]);
          }
        }
      }
    }
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Quota saved successfully", id: hId });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally { client.release(); }
}
