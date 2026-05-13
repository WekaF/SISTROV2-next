import { getToken } from "next-auth/jwt";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ADMIN_ROLES = ["ti", "superadmin", "admin", "adminsumbu"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Logging for all matched requests
  // console.log(`[Proxy Log] ${request.method} ${pathname}`);

  // RBAC for /superadmin and /admin
  // We exclude /api routes from this specific RBAC check to avoid interfering with session fetching
  if ((pathname.startsWith("/superadmin") || pathname.startsWith("/admin")) && !pathname.startsWith("/api/auth")) {
    try {
      const secret = process.env.NEXTAUTH_SECRET;
      if (!secret) {
        console.error("[Proxy Error] NEXTAUTH_SECRET is not defined!");
      }

      const token = await getToken({ req: request, secret });
      const roles: string[] = (token?.roles as string[]) || [];
      const normalizedRoles = roles.map(r => r.toLowerCase());
      const hasAccess = normalizedRoles.some((r) => ALLOWED_ADMIN_ROLES.includes(r));

      // Detailed logging for admin paths
      console.log(`[Proxy Debug] Path: ${pathname}, Token: ${!!token}, Roles: ${JSON.stringify(roles)}, hasAccess: ${hasAccess}`);

      if (!token || !hasAccess) {
        console.warn(`[Proxy Warn] Access Denied for ${pathname}. Token exists: ${!!token}, Roles: ${JSON.stringify(roles)}. Redirecting to /`);
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch (error) {
      console.error(`[Proxy Error] Exception in proxy RBAC:`, error);
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth (auth endpoints)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
