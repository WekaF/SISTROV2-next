import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

const ASPNET_API_URL = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const activeCompanyCookie = cookieStore.get("sistro_active_company")?.value;
    const aspnetToken = (session.user as any).aspnetToken as string | undefined;
    const sessionCompanyCode = (session.user as any).companyCode as string | null;

    if (!aspnetToken) {
      return NextResponse.json({ success: false, error: "No ASP.NET token" }, { status: 401 });
    }

    // Fetch companies where this user has an account (per-username mapping in AspNetUsers)
    const aspnetRes = await fetch(`${ASPNET_API_URL}/api/Company/MyCompanies`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aspnetToken}`,
      },
    });

    if (!aspnetRes.ok) {
      const errText = await aspnetRes.text().catch(() => "");
      console.error("[active-company GET] ASP.NET error:", aspnetRes.status, errText);
      throw new Error(`ASP.NET MyCompanies failed: ${aspnetRes.status}`);
    }

    const aspnetCompanies: Array<{ company_code: string; company: string }> =
      await aspnetRes.json();

    const companies = aspnetCompanies.map((c) => ({
      company_code: c.company_code,
      company: c.company,
    }));

    // Determine active company:
    // 1. Cookie override (valid in list)  2. Session JWT company  3. First in list
    const activeCompany =
      (activeCompanyCookie && companies.find((c) => c.company_code === activeCompanyCookie)?.company_code) ||
      (sessionCompanyCode && companies.find((c) => c.company_code === sessionCompanyCode)?.company_code) ||
      companies[0]?.company_code ||
      null;

    return NextResponse.json({
      success: true,
      data: { companies, activeCompany },
    });
  } catch (error: any) {
    console.error("[active-company GET]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { companyCode } = await request.json();
    if (!companyCode) {
      return NextResponse.json({ success: false, error: "companyCode required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set("sistro_active_company", companyCode, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return NextResponse.json({ success: true, activeCompany: companyCode });
  } catch (error: any) {
    console.error("[active-company POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

