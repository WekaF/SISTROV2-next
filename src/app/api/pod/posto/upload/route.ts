import { NextRequest, NextResponse } from "next/server";
import { query, getPool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getActiveCompanyCode } from "@/lib/company-context";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { action, records, mapping } = await req.json();
    if (!records || !Array.isArray(records)) return NextResponse.json({ success: false, error: "Invalid data format" }, { status: 400 });
    const userId = (session.user as any).id;
    const companyCode = await getActiveCompanyCode(userId);
    if (!companyCode) return NextResponse.json({ success: false, error: "User has no active company environment." }, { status: 403 });
    const plantRes = await query(`SELECT posto_tipe FROM company WHERE company_code=$1 LIMIT 1`, [companyCode]);
    const plantPostoTipe = plantRes.rows[0]?.posto_tipe || null;
    const wilayah = mapping?.wilayah || null;

    if (action === 'validate') {
      const validatedRecords = [];
      let validCount = 0, duplicateCount = 0;
      for (const record of records) {
        const noposto = record.NoPOSTO?.toString() || "";
        if (!noposto) { validatedRecords.push({ ...record, isDuplicate: false, isValid: false, error: "NoPOSTO is required" }); continue; }
        const checkRes = await query(`SELECT 1 FROM posto WHERE noposto=$1`, [noposto]);
        const isDuplicate = checkRes.rows.length > 0;
        let recordBagian = null, recordWilayah = wilayah, recordTipe = null, foundMapping = false;
        const tujuan = record.Tujuan?.toString() || "";
        const asal = record.Asal?.toString() || "";
        const searchCode = tujuan || asal;
        const isPostoNumber = noposto.startsWith('5');
        try {
          if (isPostoNumber) {
            if (searchCode && wilayah) {
              const r = await query(`SELECT abbrev as bagian, scope as wilayah, tipe FROM m_bagiandetail WHERE company_code=$1 AND scope=$2 ORDER BY CASE WHEN tipe=$3 THEN 0 ELSE 1 END LIMIT 1`, [searchCode, wilayah, plantPostoTipe||'POALL']);
              if (r.rows.length > 0) { recordBagian=r.rows[0].bagian; recordWilayah=r.rows[0].wilayah; recordTipe=r.rows[0].tipe; foundMapping=true; }
            }
            if (!foundMapping && plantPostoTipe === 'POCLUSTER' && searchCode && wilayah) {
              const gRes = await query(`SELECT propinsi FROM gudang WHERE id=$1 LIMIT 1`, [searchCode]);
              if (gRes.rows[0]?.propinsi) {
                const propSearch = `%${String(gRes.rows[0].propinsi).replace('Jawa ','Ja')}%`;
                const cRes = await query(`SELECT abbrev as bagian, scope as wilayah, tipe FROM m_bagian WHERE (abbrev ILIKE $1 OR keterangan ILIKE $1) AND scope=$2 AND tipe='POCLUSTER' AND (company_code=$3 OR company_code IS NULL) LIMIT 1`, [propSearch, wilayah, companyCode]);
                if (cRes.rows.length > 0) { recordBagian=cRes.rows[0].bagian; recordWilayah=cRes.rows[0].wilayah; recordTipe=cRes.rows[0].tipe; foundMapping=true; }
              }
            }
            if (!foundMapping && wilayah) {
              const fRes = await query(`SELECT abbrev, scope, tipe FROM m_bagian WHERE scope=$1 AND (company_code=$2 OR company_code IS NULL) ORDER BY CASE WHEN tipe=$3 THEN 0 WHEN abbrev='POALL' THEN 1 ELSE 2 END LIMIT 1`, [wilayah, companyCode, plantPostoTipe||'POALL']);
              if (fRes.rows.length > 0) { recordBagian=fRes.rows[0].abbrev; recordWilayah=fRes.rows[0].scope; recordTipe=fRes.rows[0].tipe; }
            }
          } else {
            const soRes = await query(`SELECT abbrev, scope, tipe FROM m_bagian WHERE abbrev='SOALL' OR (tipe='SOALL' AND scope=$1) ORDER BY CASE WHEN abbrev='SOALL' THEN 0 ELSE 1 END LIMIT 1`, [wilayah]);
            if (soRes.rows.length > 0) { recordBagian=soRes.rows[0].abbrev; recordWilayah=soRes.rows[0].scope; recordTipe=soRes.rows[0].tipe; }
            else { recordBagian='SOALL'; recordTipe='SOALL'; }
          }
        } catch(err) { console.error("Mapping error", err); }
        if (isDuplicate) duplicateCount++; else validCount++;
        validatedRecords.push({ ...record, isDuplicate, isValid: !isDuplicate, bagian: recordBagian, wilayah: recordWilayah, tipe: recordTipe });
      }
      return NextResponse.json({ success: true, data: { records: validatedRecords, summary: { total: records.length, valid: validCount, duplicates: duplicateCount }, context: { companyCode, wilayah, tipe: plantPostoTipe } } });

    } else if (action === 'submit') {
      const validRecords = records.filter((r: any) => r.isValid);
      const client = await getPool().connect();
      try {
        await client.query("BEGIN");
        let inserted = 0;
        for (const record of validRecords) {
          const noposto = record.NoPOSTO?.toString() || "";
          await client.query(`
            INSERT INTO posto (guid, noposto, tglposto, asal, tujuan, transport, produk, qty, status, tglakhir, tgljatuhtempo, charter, percepatan, idgruptruk, companycode, tipe, bagian, wilayah, initialqty, qtyrealisasi)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BARU',$9,$10,$11,$12,$13,$14,$15,$16,$17,$8,0)
          `, [crypto.randomUUID(), noposto, record.TglPOSTO?new Date(record.TglPOSTO):null, record.Asal?.toString()||"", record.Tujuan?.toString()||"", record.Transport?.toString()||"", record.Produk?.toString()||"", record.Qty||0, record.TglAkhir?new Date(record.TglAkhir):null, record.TglJatuhTempo?new Date(record.TglJatuhTempo):null, record.Charter||0, record.Percepatan?'1':'0', record.IdGrupTruk||null, companyCode, record.tipe, record.bagian, record.wilayah]);
          inserted++;
        }
        await client.query("COMMIT");
        return NextResponse.json({ success: true, message: `Inserted ${inserted} records` });
      } catch (err: any) { await client.query("ROLLBACK"); throw err; }
      finally { client.release(); }
    }
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
