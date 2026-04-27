import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getWarehousesFromApg } from "@/lib/apg-service";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const externalWarehouses = await getWarehousesFromApg();
    const existingRes = await query(`SELECT id, deskripsi FROM gudang`);
    const existingMap = new Map(existingRes.rows.map((p: any) => [p.id, p.deskripsi]));

    let syncCount = 0, newCount = 0, errorCount = 0;
    for (const ext of externalWarehouses) {
      const id = (ext.Plant || "").toString().trim();
      const desc = (ext.PlantDesc || "").toString().trim();
      if (!id || !desc) continue;
      try {
        if (existingMap.has(id)) {
          if (existingMap.get(id) !== desc) {
            await query(`UPDATE gudang SET deskripsi=$1, alamat=$2, kecamatan=$3, kabupaten=$4, propinsi=$5 WHERE id=$6`,
              [desc, ext.Alamat||'', ext.KecmatName||'', ext.KotakabName||'', ext.RegioDesc||'', id]);
            syncCount++;
          }
        } else {
          await query(`INSERT INTO gudang (id, deskripsi, alamat, kecamatan, kabupaten, propinsi, tipe) VALUES ($1,$2,$3,$4,$5,$6,0)`,
            [id, desc, ext.Alamat||'', ext.KecmatName||'', ext.KotakabName||'', ext.RegioDesc||'']);
          newCount++;
        }
      } catch (e) { errorCount++; }
    }
    return NextResponse.json({ success: true, message: `Sync completed. Added: ${newCount}, Updated: ${syncCount}, Errors: ${errorCount}.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
