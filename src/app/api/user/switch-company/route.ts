import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const ASPNET_API_URL = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "sistro-dev-secret-change-in-production";

export async function POST(request: NextRequest) {
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
    const username = rawToken?.username as string | undefined;
    const encodedPw = rawToken?._pw as string | undefined;

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
}
