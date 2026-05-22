// src/app/api/stream/resume-transit/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

import { normalizeRole } from "@/lib/role-utils";

const STREAM_INTERVAL_MS = 30_000;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const primaryRole = (session?.user as any)?.role as string | undefined;
  const allRoles: string[] = ((session?.user as any)?.roles as string[] | undefined) ?? [];

  const normalizedPrimary = normalizeRole(primaryRole);
  const normalizedRoles = allRoles.map(normalizeRole);

  const hasAccess = normalizedPrimary === "superadmin" || normalizedPrimary === "viewer" || 
                    normalizedRoles.includes("superadmin") || normalizedRoles.includes("viewer");

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (req.signal.aborted) return;
        try {
          const res = await aspnetFetchServer("/api/ResumeApi/Summary", token);
          if (res.ok) {
            const data = await res.json();
            const line = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(line));
          } else {
            console.error("[SSE Resume Transit] Backend returned non-200:", res.status);
          }
        } catch (err) {
          console.error("[SSE Resume Transit] Send error:", err);
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
