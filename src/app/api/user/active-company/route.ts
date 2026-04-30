import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  console.log("GET /api/user/active-company hit");
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log("Unauthorized session");
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const cookieStore = await cookies();
    const activeCompanyCookie = cookieStore.get("sistro_active_company")?.value;

    const result = await query(`
      SELECT 
        c.company_code,
        c.company as company_name,
        c.is_active
      FROM users_companies uc
      JOIN companies c ON uc.company_code = c.company_code
      WHERE uc.user_id = $1 AND c.is_active = true
    `, [userId]);

    const companies = result.rows;
    const activeCompany = companies.find(c => c.company_code === activeCompanyCookie) || companies[0] || null;

    return NextResponse.json({
      success: true,
      companies,
      activeCompany
    });
  } catch (error: any) {
    console.error("Error in active-company route:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
