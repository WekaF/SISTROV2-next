import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { withAudit } from "@/lib/with-audit";
import { resolveCompanyMenuTemplate } from "@/lib/company-menu";

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

    // Session created before _pw was stored (old session) — can't re-auth
    // without the password. Fail closed instead of switching the cookie to
    // a company the token was never actually authenticated against.
    if (!username || !encodedPw) {
      return NextResponse.json({
        success: false,
        error: "Sesi Anda perlu diperbarui. Silakan logout dan login kembali sebelum berganti plant.",
      }, { status: 409 });
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
      let errMsg = "Gagal berganti plant. Akun Anda mungkin tidak terdaftar pada plant ini.";
      try { errMsg = JSON.parse(text)?.error_description || errMsg; } catch {}
      console.error("[switch-company] ASP.NET re-auth failed:", errMsg, "| raw:", text);
      // Re-auth failed — the cookie was never set (Step 1), so the active
      // company stays exactly where it was before this request.
      return NextResponse.json({ success: false, error: errMsg }, { status: 409 });
    }

    const data = await tokenRes.json();

    // Resolve menu for new company: user-level override (ASP.NET) wins, else company template
    const userMenuGroup = (data.user_menu_group || "").trim();
    const userMenuItemsRaw = (data.user_menu_items || "").trim();
    let userMenuItems: string[] | null = null;
    try { if (userMenuItemsRaw) userMenuItems = JSON.parse(userMenuItemsRaw); } catch {}

    let resolvedMenuGroup: string | null = null;
    let resolvedMenuItems: string[] | null = null;

    if (userMenuGroup) {
      resolvedMenuGroup = userMenuGroup;
      resolvedMenuItems = userMenuItems; // keep user-level item overrides
    } else {
      const companyTemplate = await resolveCompanyMenuTemplate(
        data.companycode ?? companyCode
      ).catch(() => null);
      if (companyTemplate) {
        resolvedMenuGroup = companyTemplate.menuGroup;
        resolvedMenuItems = userMenuItems ?? companyTemplate.menuItems;
      }
    }

    // Re-auth confirmed the account exists on the target company — only now
    // is it safe to persist the cookie, so cookie and token can never disagree.
    const cookieStore = await cookies();
    cookieStore.set("sistro_active_company", companyCode, {
      httpOnly: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    return NextResponse.json({
      success: true,
      activeCompany: companyCode,
      aspnetToken: data.access_token,
      companyCode: data.companycode ?? companyCode,
      username: data.username,
      menuGroup: resolvedMenuGroup,
      menuItems: resolvedMenuItems,
    });
  } catch (error: any) {
    console.error("[switch-company POST]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
})
