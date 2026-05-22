// src/app/api/stream/staffarea/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { normalizeRole } from "@/lib/role-utils";
import { cookies } from "next/headers";

const STREAM_INTERVAL_MS = 30_000;
const ALLOWED = new Set(["staffarea", "gudang", "pod", "superadmin", "ti", "admin"]);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allRoles: string[] = ((session.user as any)?.roles as string[] | undefined) ?? [(session.user as any)?.role];
  const allowed = allRoles.some(r => ALLOWED.has(normalizeRole(r)));
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  // Get companyCode from query params, falling back to cookie then session
  const { searchParams } = new URL(req.url);
  let companyCode = searchParams.get("companyCode");

  if (!companyCode) {
    const cookieStore = await cookies();
    companyCode = cookieStore.get("sistro_active_company")?.value || (session?.user as any)?.companyCode || null;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (req.signal.aborted) return;
        try {
          const url = companyCode
            ? `/api/CompanyDashboard/GetStats?companyCode=${encodeURIComponent(companyCode)}`
            : "/api/CompanyDashboard/GetStats";
          const res = await aspnetFetchServer(url, token);
          if (res.ok) {
            const data = await res.json();
            const line = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(line));
          } else {
            console.error("[SSE Staff Area] Backend returned non-200:", res.status);
          }
        } catch (err) {
          console.error("[SSE Staff Area] Send error:", err);
        }
      };

      // Send immediately on connect
      await send();

      const interval = setInterval(send, STREAM_INTERVAL_MS);

      req.signal.onabort = () => {
        clearInterval(interval);
        controller.close();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
