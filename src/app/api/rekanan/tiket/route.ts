import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sapVendorCode = (session?.user as any)?.companyCode;
    const userRoles = (session?.user as any)?.roles || [];
    if (!session?.user || !userRoles.includes('rekanan') || !sapVendorCode) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const params: any[] = [sapVendorCode];
    let statusFilter = '';
    if (status) { params.push(status); statusFilter = `AND t.statuspemuatan=$2`; }
    const result = await query(`
      SELECT t.*, p.nama as productname FROM tiket t
      LEFT JOIN produk p ON t.idproduk = p.kode
      WHERE t.idtransport=$1 ${statusFilter} ORDER BY t.updatedon DESC
    `, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sapVendorCode = (session?.user as any)?.companyCode;
    const userRoles = (session?.user as any)?.roles || [];
    if (!session?.user || !userRoles.includes('rekanan') || !sapVendorCode) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { NoPosto, Nopol, DriverName, DriverPhone, ProductId } = await req.json();
    if (!NoPosto || !Nopol || !DriverName) return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const countRes = await query(`SELECT COUNT(*) as count FROM tiket WHERE bookingno LIKE 'BK-${dateStr}%'`);
    const nextNum = (Number(countRes.rows[0].count) + 1).toString().padStart(4, '0');
    const bookingNo = `BK-${dateStr}-${nextNum}`;
    await query(`
      INSERT INTO tiket (bookingno, posto, nopol, driver, idproduk, idtransport, updatedon, statuspemuatan)
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),'1')
    `, [bookingNo, NoPosto, Nopol, DriverName, ProductId||"", sapVendorCode]);
    return NextResponse.json({ success: true, message: "Ticket booked successfully", data: { bookingNo } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
