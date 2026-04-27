import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const [wilayahRes, bagianRes] = await Promise.all([
      query(`SELECT abbrev, keterangan FROM m_wilayah ORDER BY keterangan ASC`),
      query(`SELECT abbrev, keterangan, scope as wilayah, tipe FROM m_bagian ORDER BY keterangan ASC`)
    ]);
    return NextResponse.json({ success: true, data: { wilayah: wilayahRes.rows, bagian: bagianRes.rows } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
