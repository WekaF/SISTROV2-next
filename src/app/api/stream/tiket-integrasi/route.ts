import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const STREAM_INTERVAL_MS = 30_000;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
          const res = await aspnetFetchServer("/api/Home/GetIntegratedTicketsNext", token);
          if (res.ok) {
            const data = await res.json();
            const line = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(line));
          } else {
            console.error("[SSE Tiket Integrasi] Backend returned non-200:", res.status);
          }
        } catch (err) {
          console.error("[SSE Tiket Integrasi] Send error:", err);
        }
      };

      // Send first payload immediately upon connection
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
