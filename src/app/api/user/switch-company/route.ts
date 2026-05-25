import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { withAudit } from "@/lib/with-audit";

const ASPNET_API_URL = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "sistro-dev-secret-change-in-production";

export const POST = withAudit(async function(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { companyCode } = await request.json();
    if (!companyCode) {
      return NextResponse.json({ success: false, error: "companyCode required" }, { status: 400 });
    }

    // Set the active company cookie regardless
    const cookieStore = await cookies();
    cookieStore.set("sistro_active_company", companyCode, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    // Try to get raw JWT to access _pw for re-auth
    const rawToken = await getToken({ req: request, secret: NEXTAUTH_SECRET });
    const rawUsername = rawToken?.username as string | undefined;
    const encodedPw = rawToken?._pw as string | undefined;

    // rawToken.username = full DB username as stored by ASP.NET e.g. "wahyu_pkg"
    // (ASP.NET /Token always stores <bare_login>_<COMPANYCODE> as the DB UserName)
    // Strip last _COMPANY suffix so re-auth sends bare username to /Token
    const lastUnderscore = rawUsername ? rawUsername.lastIndexOf("_") : -1;
    const username = (rawUsername && lastUnderscore > 0 && lastUnderscore < rawUsername.length - 1)
      ? rawUsername.slice(0, lastUnderscore)
      : rawUsername;

    // If session was created before _pw was stored (old session),
    // return success with cookie set but no new ASP.NET token.
    // Full token sync will happen on next login.
    if (!username || !encodedPw) {
      return NextResponse.json({
        success: true,
        activeCompany: companyCode,
        aspnetToken: null,
        needsRelogin: true, // hint to client that token is not synced
      });
    }

    // Re-auth to ASP.NET with new companyCode to get fresh token
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
      let errMsg = "Gagal berganti plant";
      try { errMsg = JSON.parse(text)?.error_description || text || errMsg; } catch {}
      // Even if ASP.NET re-auth fails, cookie is already set — return partial success
      console.error("[switch-company] ASP.NET re-auth failed:", errMsg);
      return NextResponse.json({
        success: true,
        activeCompany: companyCode,
        aspnetToken: null,
        needsRelogin: true,
      });
    }

    const data = await tokenRes.json();

    return NextResponse.json({
      success: true,
      activeCompany: companyCode,
      aspnetToken: data.access_token,
      companyCode: data.companycode ?? companyCode,
    });
  } catch (error: any) {
    console.error("[switch-company POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
})
