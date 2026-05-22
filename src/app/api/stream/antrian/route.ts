import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  const companyCode = new URL(req.url).searchParams.get("companyCode") ?? undefined;

  try {
    const body: Record<string, unknown> = { Page: 1, Length: 1, mode: "aktif" };
    if (companyCode) body.companyCode = companyCode;

    const res = await aspnetFetchServer("/api/Antrian/DataTable", token, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Backend error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({
      total: data.recordsTotal ?? 0,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("[Antrian stream] fetch error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
