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

    // rawToken.username = full DB username as stored by ASP.NET. For accounts that logged in
    // WITH a companyCode, this is "<bare_login>_<COMPANYCODE>" (e.g. "wahyu_pkg"). For accounts
    // that logged in WITHOUT one (e.g. Transport/rekanan), it's just the bare login as-is, with
    // NO suffix -- and that bare login can itself legitimately contain underscores (e.g.
    // "budi_transport1"). Blindly stripping "everything after the last underscore" mangles those
    // bare logins into a wrong username. Only strip the suffix when we can verify it's actually
    // "_<our known companyCode>" -- never guess.
    let username = rawUsername;
    if (rawUsername && companyCode) {
      const suffix = "_" + companyCode;
      if (rawUsername.toLowerCase().endsWith(suffix.toLowerCase())) {
        username = rawUsername.slice(0, rawUsername.length - suffix.length);
      }
    }

    if (!username || !encodedPw) {
      return NextResponse.json({
        success: false,
        error: "Session data incomplete for auto-relogin",
      });
    }

    // companyCode is optional here, not required. Accounts without a fixed plant (e.g.
    // Transport/rekanan, whose AspNetUsers.company_code is legitimately null in the backend)
    // authenticate at ASP.NET's /Token with no companycode field at all -- see
    // ApplicationOAuthProvider.GrantResourceOwnerCredentials's Transport-table fallback branch.
    // This mirrors exactly what src/lib/auth.ts's authorize() already does on the original
    // login (only appends companycode when one was actually supplied), so re-login behaves
    // the same way the first login did instead of hard-failing accounts that never had one.
    const password = Buffer.from(encodedPw, "base64").toString("utf-8");
    const params = new URLSearchParams({
      grant_type: "password",
      username,
      password,
    });
    if (companyCode) {
      params.append("companycode", companyCode);
    }

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
