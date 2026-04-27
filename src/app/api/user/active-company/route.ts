import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const result = await query(`
      SELECT TRIM(c.company_code) as company_code, c.company, uc.isprimary
      FROM usercompanies uc JOIN company c ON TRIM(uc.companycode) = TRIM(c.company_code)
      WHERE uc.userid=$1 ORDER BY uc.isprimary DESC, c.company ASC
    `, [userId]);
    const companies = result.rows;
    const cookieStore = await cookies();
    const activeCompanyCookie = cookieStore.get("sistro_active_company")?.value;
    const activeCompany = activeCompanyCookie || companies[0]?.company_code || null;
    return NextResponse.json({ success: true, data: { companies, activeCompany } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { companyCode } = await req.json();
    if (!companyCode) return NextResponse.json({ success: false, error: "Company code is required" }, { status: 400 });
    const userId = (session.user as any).id;
    const check = await query(`SELECT 1 FROM usercompanies WHERE userid=$1 AND companycode=$2`, [userId, companyCode]);
    if (check.rows.length === 0) return NextResponse.json({ success: false, error: "Access denied to this company" }, { status: 403 });
    const cookieStore = await cookies();
    cookieStore.set("sistro_active_company", companyCode, { path: "/", maxAge: 60*60*24*7, httpOnly: false, secure: process.env.NODE_ENV==="production" });
    return NextResponse.json({ success: true, message: "Active company updated" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
