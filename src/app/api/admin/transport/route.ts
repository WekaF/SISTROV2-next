import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const params: any[] = [];
    let where = '';
    if (search) { params.push(`%${search}%`); where = `WHERE vendorcode ILIKE $1 OR name ILIKE $1 OR email ILIKE $1`; }

    const countResult = await query(`SELECT COUNT(*) as total FROM m_transport ${where}`, params);
    const total = Number(countResult.rows[0].total);
    const result = await query(`SELECT * FROM m_transport ${where} ORDER BY createdat DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
    return NextResponse.json({ success: true, data: result.rows, pagination: { total, page, limit, totalPages: Math.ceil(total/limit) } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { VendorCode, Name, Address, Email, Phone, ID, username, singkatan, isCharter, startCharter, endCharter } = await req.json();
    if (!VendorCode || !Name) return NextResponse.json({ success: false, error: "VendorCode and Name are required" }, { status: 400 });
    const check = await query(`SELECT 1 FROM m_transport WHERE vendorcode=$1`, [VendorCode]);
    if (check.rows.length > 0) return NextResponse.json({ success: false, error: "VendorCode already exists" }, { status: 400 });
    await query(`
      INSERT INTO m_transport (vendorcode, name, address, email, phone, isactive, createdat, updatedat, id, username, singkatan, ischarter, startcharter, endcharter)
      VALUES ($1,$2,$3,$4,$5,true,NOW(),NOW(),$6,$7,$8,$9,$10,$11)
    `, [VendorCode, Name, Address||null, Email||null, Phone||null, ID||null, username||null, singkatan||null, isCharter||false, startCharter||null, endCharter||null]);
    return NextResponse.json({ success: true, message: "Transport created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { VendorCode, Name, Address, Email, Phone, IsActive, ID, username, singkatan, isCharter, startCharter, endCharter } = await req.json();
    if (!VendorCode) return NextResponse.json({ success: false, error: "VendorCode is required" }, { status: 400 });
    await query(`
      UPDATE m_transport SET name=$1, address=$2, email=$3, phone=$4, isactive=$5, updatedat=NOW(), id=$6, username=$7, singkatan=$8, ischarter=$9, startcharter=$10, endcharter=$11
      WHERE vendorcode=$12
    `, [Name, Address||null, Email||null, Phone||null, IsActive||false, ID||null, username||null, singkatan||null, isCharter||false, startCharter||null, endCharter||null, VendorCode]);
    return NextResponse.json({ success: true, message: "Transport updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const vendorCode = searchParams.get('vendorCode');
    if (!vendorCode) return NextResponse.json({ success: false, error: "vendorCode is required" }, { status: 400 });
    await query(`DELETE FROM m_transport WHERE vendorcode=$1`, [vendorCode]);
    return NextResponse.json({ success: true, message: "Transport deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
