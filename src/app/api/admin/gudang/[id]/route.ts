import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = params;
    const { Deskripsi, Alamat, Kecamatan, Kabupaten, Propinsi } = await req.json();
    await query(`
      UPDATE gudang SET deskripsi=$1, alamat=$2, kecamatan=$3, kabupaten=$4, propinsi=$5 WHERE id=$6
    `, [Deskripsi, Alamat, Kecamatan, Kabupaten, Propinsi, id]);
    return NextResponse.json({ success: true, message: "Warehouse updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await query(`DELETE FROM gudang WHERE id=$1`, [params.id]);
    return NextResponse.json({ success: true, message: "Warehouse deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
