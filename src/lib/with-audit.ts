import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logEvent } from "@/lib/audit-logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

function getClientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAudit(handler: RouteHandler): (req: NextRequest, context?: any) => Promise<NextResponse> {
  return async (req, context) => {
    const MUTABLE_METHODS = ["POST", "PUT", "DELETE", "PATCH"];
    if (!MUTABLE_METHODS.includes(req.method)) {
      return handler(req, context);
    }

    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const response = await handler(req, context);
    const pathname = new URL(req.url).pathname;

    await logEvent({
      eventType:   "API_CALL",
      userId:      user?.id,
      username:    user?.username,
      role:        user?.role,
      companyCode: user?.companyCode,
      ipAddress:   getClientIp(req),
      userAgent:   req.headers.get("user-agent") ?? undefined,
      resource:    pathname,
      method:      req.method,
      statusCode:  response.status,
    });

    return response;
  };
}
