import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Temporary diagnostic route — DELETE after confirming which ASPNET_API_URL
// value is actually resolved at runtime on Vercel. Gated behind the same
// admin auth as the gudang/products routes so it isn't publicly exposed.
export async function GET() {
  const session = await getServerSession(authOptions);
  const roles = (session?.user as any)?.roles || [];
  const isAuth = !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
  if (!isAuth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    NEXT_PUBLIC_ASPNET_API_URL: process.env.NEXT_PUBLIC_ASPNET_API_URL || null,
    ASPNET_API_URL: process.env.ASPNET_API_URL || null,
    VERCEL_ENV: process.env.VERCEL_ENV || null,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || null,
  });
}
