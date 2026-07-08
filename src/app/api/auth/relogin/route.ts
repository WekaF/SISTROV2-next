import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const ASPNET_API_URL = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "sistro-dev-secret-change-in-production";

export const POST = async function(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Try to get raw JWT to access _pw for re-auth
    const rawToken = await getToken({ req: request, secret: NEXTAUTH_SECRET });
    const rawUsername = rawToken?.username as string | undefined;
    const encodedPw = rawToken?._pw as string | undefined;
    
    // Fallback companyCode from cookie if missing from token
    let companyCode = rawToken?.companyCode as string | undefined;
    if (!companyCode) {
      companyCode = request.cookies.get("sistro_active_company")?.value;
    }

    // rawToken.username = full DB username as stored by ASP.NET e.g. "wahyu_pkg"
    // (ASP.NET /Token always stores <bare_login>_<COMPANYCODE> as the DB UserName)
    // Strip last _COMPANY suffix so re-auth sends bare username to /Token
    const lastUnderscore = rawUsername ? rawUsername.lastIndexOf("_") : -1;
    const username = (rawUsername && lastUnderscore > 0 && lastUnderscore < rawUsername.length - 1)
      ? rawUsername.slice(0, lastUnderscore)
      : rawUsername;

    if (!username || !encodedPw) {
      return NextResponse.json({
        success: false,
        error: "Session data incomplete for auto-relogin",
      });
    }

    if (!companyCode) {
      return NextResponse.json({
        success: false,
        error: "Company code hilang dari session, silakan login manual.",
      });
    }

    // Re-auth to ASP.NET with current companyCode to get fresh token
    const password = Buffer.from(encodedPw, "base64").toString("utf-8");
    const params = new URLSearchParams({
      grant_type: "password",
      username,
      password,
      companycode: companyCode,
    });

    const tokenRes = await fetch(`${ASPNET_API_URL}/Token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => tokenRes.statusText);
      let errMsg = "Gagal relogin";
      try { errMsg = JSON.parse(text)?.error_description || text || errMsg; } catch {}
      console.error("[relogin] ASP.NET re-auth failed:", errMsg);
      return NextResponse.json({
        success: false,
        error: errMsg,
      });
    }

    const data = await tokenRes.json();

    return NextResponse.json({
      success: true,
      aspnetToken: data.access_token,
      companyCode: data.companycode ?? companyCode,
    });
  } catch (error: any) {
    console.error("[relogin POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
};
