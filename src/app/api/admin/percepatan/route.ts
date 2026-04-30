import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'superadmin' && role !== 'admin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const result = await query(`
      SELECT m.*, s.nama as sumbunama, s.jenistruk as axletype, c.company as plantname
      FROM m_percepatan m
      LEFT JOIN sumbu s ON m.idsumbu = s.id
      LEFT JOIN company c ON m.kodeplant = c.company_code
      ORDER BY m.kodeplant, m.idsumbu
    `);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'superadmin' && role !== 'admin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { kodePlant, idGrupTruk, idSumbu, muatanPercepatan, tanggalAwal, tanggalAkhir } = await req.json();
    await query(`
      INSERT INTO m_percepatan (kodeplant, idgruptruk, idsumbu, muatanpercepatan, tanggalawal, tanggalakhir)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (kodeplant, idgruptruk, idsumbu) DO UPDATE
      SET muatanpercepatan=$4, tanggalawal=$5, tanggalakhir=$6
    `, [(kodePlant||"").trim(), idGrupTruk||0, idSumbu, muatanPercepatan, tanggalAwal, tanggalAkhir]);
    return NextResponse.json({ success: true, message: "Percepatan updated/created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'superadmin' && role !== 'admin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const plant = (searchParams.get('plant') || "").trim();
    const sumbu = searchParams.get('sumbu');
    const grup = searchParams.get('grup') || '0';
    await query(`DELETE FROM m_percepatan WHERE kodeplant=$1 AND idsumbu=$2 AND idgruptruk=$3`, [plant, sumbu, grup]);
    return NextResponse.json({ success: true, message: "Percepatan deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
