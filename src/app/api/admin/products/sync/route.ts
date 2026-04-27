import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProductsFromApg } from "@/lib/apg-service";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const externalProducts = await getProductsFromApg();
    const existingRes = await query(`SELECT id, kode, nama FROM produk WHERE (deleted IS NULL OR deleted=false)`);
    const existingMap = new Map(existingRes.rows.map((p: any) => [p.kode, { id: p.id, name: p.nama }]));

    let syncCount = 0, newCount = 0, errorCount = 0;
    for (const ext of externalProducts) {
      const code = (ext.value || ext.VALUE || ext.id || ext.ID || "").toString().trim();
      let name = (ext.text || ext.TEXT || ext.name || ext.NAME || "").toString().trim();
      if (!code || !name) continue;
      if (name.startsWith(code)) name = name.substring(code.length).replace(/^[\s\-]+/, '').trim();
      try {
        const existing = existingMap.get(code);
        if (existing) {
          if (existing.name !== name) {
            await query(`UPDATE produk SET nama=$1 WHERE id=$2`, [name, existing.id]);
            syncCount++;
          }
        } else {
          await query(`INSERT INTO produk (nama, kode, issubsidi, createdat, deleted) VALUES ($1,$2,false,NOW(),false)`, [name, code]);
          newCount++;
        }
      } catch (e) { errorCount++; }
    }
    return NextResponse.json({ success: true, message: `Sync completed. Added: ${newCount}, Updated: ${syncCount}, Errors: ${errorCount}.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
