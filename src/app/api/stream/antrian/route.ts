import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const STREAM_INTERVAL_MS = 30_000;

async function fetchAntrianSummary(token: string, companyCode?: string) {
  try {
    const body: Record<string, unknown> = { Page: 1, Length: 1, mode: "aktif" };
    if (companyCode) body.companyCode = companyCode;

    const res = await aspnetFetchServer("/api/Antrian/DataTable", token, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      total: data.recordsTotal ?? 0,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  const companyCode = new URL(req.url).searchParams.get("companyCode") ?? undefined;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (req.signal.aborted) return;
        try {
          const payload = await fetchAntrianSummary(token, companyCode);
          if (payload) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          }
        } catch {
          // silent — client reconnects via onerror
        }
      };

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
