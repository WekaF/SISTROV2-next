import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'superadmin' && role !== 'admin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const result = await query(`SELECT * FROM sumbu ORDER BY id ASC`);
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
    const body = await req.json();
    const { nama, jenistruk, tahun, muatan, idGrupTruk } = body;
    await query(`
      INSERT INTO sumbu (nama, jenistruk, tahun, muatan, idgruptruk, updatedon, updatedby)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
    `, [nama, jenistruk, tahun, muatan, idGrupTruk || 0, session?.user?.email || 'administrator']);
    return NextResponse.json({ success: true, message: "Sumbu created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'superadmin' && role !== 'admin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id, nama, jenistruk, tahun, muatan, idGrupTruk } = await req.json();
    await query(`
      UPDATE sumbu SET nama=$1, jenistruk=$2, tahun=$3, muatan=$4, idgruptruk=$5, updatedon=NOW(), updatedby=$6
      WHERE id=$7
    `, [nama, jenistruk, tahun, muatan, idGrupTruk || 0, session?.user?.email || 'administrator', id]);
    return NextResponse.json({ success: true, message: "Sumbu updated successfully" });
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
    const id = searchParams.get('id');
    await query(`DELETE FROM sumbu WHERE id=$1`, [id]);
    return NextResponse.json({ success: true, message: "Sumbu deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
