import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  let companyCode = new URL(req.url).searchParams.get("companyCode") ?? undefined;
  if (!companyCode) {
    const cookieStore = await cookies();
    companyCode = cookieStore.get("sistro_active_company")?.value ?? undefined;
  }

  try {
    const body: Record<string, unknown> = { Page: 1, Length: 1, mode: "aktif" };
    if (companyCode) body.companyCode = companyCode;

    const url = companyCode
      ? `/api/Antrian/DataTable?companyCode=${encodeURIComponent(companyCode)}`
      : "/api/Antrian/DataTable";

    const res = await aspnetFetchServer(url, token, {
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
