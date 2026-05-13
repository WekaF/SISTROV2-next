import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const SUPERADMIN_ROLES = ["ti", "superadmin"];

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/superadmin")) {
    const roles: string[] = (token?.roles as string[]) || [];
    const isSuperAdmin = roles.some((r) => SUPERADMIN_ROLES.includes(r.toLowerCase()));
    if (!token || !isSuperAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/superadmin/:path*"],
};
