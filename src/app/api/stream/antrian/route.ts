import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

import { cookies } from "next/headers";

async function fetchCount(token: string, companyCode?: string, position?: string) {
  const url = companyCode
    ? `/api/Antrian/DataTable?companyCode=${encodeURIComponent(companyCode)}`
    : "/api/Antrian/DataTable";

  const params = new URLSearchParams();
  params.append("start", "0");
  params.append("length", "1");
  params.append("mode", "aktif");
  if (position) {
    params.append("position", position);
  }

  try {
    const res = await aspnetFetchServer(url, token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.recordsTotal ?? 0;
    }
  } catch (err) {
    console.error(`[fetchCount] Error fetching position ${position}:`, err);
  }
  return 0;
}

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
    const [total, securityIn, sedangMuat, selesaiMuat] = await Promise.all([
      fetchCount(token, companyCode),
      fetchCount(token, companyCode, "01"), // Security In
      fetchCount(token, companyCode, "03"), // Sedang Muat (Tiba di Gudang)
      fetchCount(token, companyCode, "04"), // Selesai Muat
    ]);

    return NextResponse.json({
      total,
      securityIn,
      sedangMuat,
      selesaiMuat,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("[Antrian stream] fetch error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
