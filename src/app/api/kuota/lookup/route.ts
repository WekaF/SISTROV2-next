import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const productsResult = await query<{ id: number; name: string; code: string }>(`
      SELECT DISTINCT p.id, p.nama as name, p.kode as code
      FROM produk p
      JOIN produkmapping pm ON p.id = pm.produkid
      WHERE pm.companycode IN (
        SELECT companycode FROM usercompanies WHERE userid = $1
      ) AND (p.deleted IS NULL OR p.deleted = false)
    `, [userId]);

    const wilayahResult = await query<{ id: string; name: string }>(
      "SELECT abbrev as id, keterangan as name FROM m_wilayah ORDER BY abbrev"
    );

    const areasResult = await query<{ id: string; name: string; wilayahId: string }>(
      `SELECT abbrev as id, keterangan as name, scope as "wilayahId" FROM m_bagian ORDER BY abbrev`
    );

    return NextResponse.json({
      success: true,
      products: productsResult.rows,
      wilayah: wilayahResult.rows,
      areas: areasResult.rows
    });
  } catch (error: any) {
    console.error("Lookup Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
