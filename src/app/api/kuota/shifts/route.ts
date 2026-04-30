import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const result = await query(`
      SELECT b.bagian as abbrev, MAX(m.keterangan) as area,
        SUM(CASE WHEN s.shift='1' THEN s.kuota ELSE 0 END) as shift1,
        SUM(CASE WHEN s.shift='2' THEN s.kuota ELSE 0 END) as shift2,
        SUM(CASE WHEN s.shift='3' THEN s.kuota ELSE 0 END) as shift3,
        COALESCE(SUM(s.kuota_out),0) as realization, COALESCE(SUM(s.kuota),0) as total
      FROM kuota4shift s
      JOIN kuota3bagian b ON s.level3 = b.id
      LEFT JOIN m_bagian m ON b.bagian = m.abbrev
      WHERE DATE(s.tanggal) = CURRENT_DATE
      GROUP BY b.bagian ORDER BY b.bagian ASC
    `);
    const summaryResult = await query(`
      SELECT shift, COALESCE(SUM(kuota_out),0) as totalout, COALESCE(SUM(kuota),0) as totalquota
      FROM kuota4shift WHERE DATE(tanggal) = CURRENT_DATE GROUP BY shift
    `);
    const summary = summaryResult.rows.reduce((acc: any, curr: any) => {
      acc[curr.shift] = { totalOut: curr.totalout, utilization: curr.totalquota > 0 ? (curr.totalout / curr.totalquota) * 100 : 0 };
      return acc;
    }, {});
    return NextResponse.json({ success: true, data: result.rows, summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
