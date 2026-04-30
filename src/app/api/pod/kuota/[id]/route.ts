import { NextRequest, NextResponse } from "next/server";
import { query, getPool } from "@/lib/db";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    const headerRes = await query(`
      SELECT guid, id, TO_CHAR(tanggal,'YYYY-MM-DD') as startdate, TO_CHAR(tanggal,'YYYY-MM-DD') as enddate,
        idproduk as productid, kuota as totalquota, updatedby FROM kuota1header WHERE id=$1
    `, [numericId]);
    if (headerRes.rows.length === 0) return NextResponse.json({ success: false, error: "Data not found" }, { status: 404 });
    const headerData = headerRes.rows[0];
    const wilayahRes = await query(`
      SELECT w.id, w.wilayah as abbrev, w.kuota, m.keterangan as name
      FROM kuota2wilayah w LEFT JOIN m_wilayah m ON w.wilayah=m.abbrev WHERE w.level1=$1
    `, [numericId]);
    const wilayah: Record<string,number> = {};
    const wilayahDisplay: Record<string,number> = {};
    wilayahRes.rows.forEach((w: any) => { wilayah[w.abbrev]=w.kuota; wilayahDisplay[w.name||w.abbrev]=w.kuota; });
    const bagianRes = await query(`
      SELECT b.id, b.bagian as abbrev, b.kuota, m.keterangan as name
      FROM kuota3bagian b JOIN kuota2wilayah w ON b.level2=w.id LEFT JOIN m_bagian m ON b.bagian=m.abbrev
      WHERE w.level1=$1
    `, [numericId]);
    const areas: Record<string,number> = {};
    const areasDisplay: Record<string,number> = {};
    const bagianIds: number[] = [];
    bagianRes.rows.forEach((b: any) => { areas[b.abbrev]=b.kuota; areasDisplay[b.name||b.abbrev]=b.kuota; bagianIds.push(b.id); });
    const shifts: Record<string,Record<number,number>> = {};
    const shiftsDisplay: Record<string,Record<number,number>> = {};
    if (bagianIds.length > 0) {
      const shiftRes = await query(`
        SELECT s.shift, s.kuota, b.bagian as abbrev, m.keterangan as name
        FROM kuota4shift s JOIN kuota3bagian b ON s.level3=b.id LEFT JOIN m_bagian m ON b.bagian=m.abbrev
        WHERE s.level3=ANY($1)
      `, [bagianIds]);
      shiftRes.rows.forEach((s: any) => {
        if (!shifts[s.abbrev]) shifts[s.abbrev]={};
        shifts[s.abbrev][parseInt(s.shift)]=s.kuota;
        const n=s.name||s.abbrev;
        if (!shiftsDisplay[n]) shiftsDisplay[n]={};
        shiftsDisplay[n][parseInt(s.shift)]=s.kuota;
      });
    }
    return NextResponse.json({ success: true, data: { header: headerData, wilayah, areas, shifts, display: { wilayah: wilayahDisplay, areas: areasDisplay, shifts: shiftsDisplay } } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await getPool().connect();
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role?.toLowerCase();
    if (userRole !== 'pod' && userRole !== 'superadmin') return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    const { id } = await params;
    const numericId = parseInt(id);
    await client.query("BEGIN");
    await client.query(`DELETE FROM kuota4shift WHERE level3 IN (SELECT id FROM kuota3bagian WHERE level2 IN (SELECT id FROM kuota2wilayah WHERE level1=$1))`, [numericId]);
    await client.query(`DELETE FROM kuota3bagian WHERE level2 IN (SELECT id FROM kuota2wilayah WHERE level1=$1)`, [numericId]);
    await client.query(`DELETE FROM kuota2wilayah WHERE level1=$1`, [numericId]);
    await client.query(`DELETE FROM kuota1header WHERE id=$1`, [numericId]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally { client.release(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await getPool().connect();
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role?.toLowerCase();
    if (userRole !== 'pod' && userRole !== 'superadmin') return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    const { id } = await params;
    const numericId = parseInt(id);
    const { header, wilayah, areas, shifts } = await req.json();
    const updatedby = (session?.user as any)?.id || null;
    await client.query("BEGIN");
    await client.query(`DELETE FROM kuota4shift WHERE level3 IN (SELECT id FROM kuota3bagian WHERE level2 IN (SELECT id FROM kuota2wilayah WHERE level1=$1))`, [numericId]);
    await client.query(`DELETE FROM kuota3bagian WHERE level2 IN (SELECT id FROM kuota2wilayah WHERE level1=$1)`, [numericId]);
    await client.query(`DELETE FROM kuota2wilayah WHERE level1=$1`, [numericId]);
    const mappingRes = await client.query(`SELECT abbrev, scope FROM m_bagian`);
    const areaMapping: Record<string,string> = {};
    for (const r of mappingRes.rows) areaMapping[r.abbrev]=r.scope;
    await client.query(`UPDATE kuota1header SET idproduk=$1, tanggal=$2, kuota=$3, updatedby=$4 WHERE id=$5`,
      [String(header.productId), header.startDate, Number(header.totalQuota), updatedby, numericId]);
    for (const [wKey, wVal] of Object.entries(wilayah)) {
      const val = Number(wVal); if (val<=0) continue;
      const wRes = await client.query(`INSERT INTO kuota2wilayah (guid,level1,wilayah,tanggal,idproduk,kuota,activated) VALUES ($1,$2,$3,$4,$5,$6,'1') RETURNING id`,
        [crypto.randomUUID(), numericId, wKey, header.startDate, String(header.productId), val]);
      const wId = wRes.rows[0].id;
      for (const [aKey, aVal] of Object.entries(areas)) {
        const aAmount = Number(aVal); if (aAmount<=0 || areaMapping[aKey]!==wKey) continue;
        const bRes = await client.query(`INSERT INTO kuota3bagian (guid,level2,bagian,tanggal,idproduk,kuota,activated) VALUES ($1,$2,$3,$4,$5,$6,'1') RETURNING id`,
          [crypto.randomUUID(), wId, aKey, header.startDate, String(header.productId), aAmount]);
        const bId = bRes.rows[0].id;
        const areaShifts = (shifts as any)[aKey];
        if (areaShifts) {
          for (const [sNum, sVal] of Object.entries(areaShifts)) {
            const sAmount = Number(sVal); if (sAmount<=0) continue;
            await client.query(`INSERT INTO kuota4shift (guid,level3,tanggal,shift,idproduk,kuota,activated) VALUES ($1,$2,$3,$4,$5,$6,'1')`,
              [crypto.randomUUID(), bId, header.startDate, String(sNum), String(header.productId), sAmount]);
          }
        }
      }
    }
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Quota updated successfully", id: numericId });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally { client.release(); }
}
