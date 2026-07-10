import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

import { cookies } from "next/headers";

async function fetchWarehouseSummary(token: string, companyCode?: string) {
  const url = companyCode
    ? `/api/Antrian/DataTable?companyCode=${encodeURIComponent(companyCode)}`
    : "/api/Antrian/DataTable";

  const params = new URLSearchParams();
  params.append("start", "0");
  params.append("length", "5000"); // fetch enough to cover active queues
  params.append("mode", "aktif");
  params.append("search[value]", "");
  params.append("search[regex]", "false");
  params.append("order[0][column]", "0");
  params.append("order[0][dir]", "desc");
  params.append("columns[0][data]", "id");
  params.append("columns[0][name]", "id");
  params.append("columns[0][searchable]", "true");
  params.append("columns[0][orderable]", "true");
  params.append("columns[0][search][value]", "");
  params.append("columns[0][search][regex]", "false");

  try {
    const res = await aspnetFetchServer(url, token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    
    if (res.ok) {
      const data = await res.json();
      const records = data.data || [];
      const summary = records.reduce((acc: Record<string, number>, curr: any) => {
        // Find the storage property, accounting for case-insensitivity or possible names
        const storageId = curr.gudangMuatId || curr.StorageId || curr.storageid || curr.storageID || curr.gudangMuat;
        if (storageId) {
          acc[storageId] = (acc[storageId] || 0) + 1;
        }
        return acc;
      }, {});
      return summary;
    }
  } catch (err) {
    console.error(`[fetchWarehouseSummary] Error:`, err);
  }
  return {};
}

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
  params.append("search[value]", "");
  params.append("search[regex]", "false");
  params.append("order[0][column]", "0");
  params.append("order[0][dir]", "desc");
  params.append("columns[0][data]", "id");
  params.append("columns[0][name]", "id");
  params.append("columns[0][searchable]", "true");
  params.append("columns[0][orderable]", "true");
  params.append("columns[0][search][value]", "");
  params.append("columns[0][search][regex]", "false");

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
    const [total, securityIn, sedangMuat, selesaiMuat, timbangKosong, timbangIsi, securityOut, warehouseCounts] = await Promise.all([
      fetchCount(token, companyCode),
      fetchCount(token, companyCode, "01"), // Security In
      fetchCount(token, companyCode, "03"), // Sedang Muat (Tiba di Gudang)
      fetchCount(token, companyCode, "04"), // Selesai Muat
      fetchCount(token, companyCode, "02"), // Timbang Kosong
      fetchCount(token, companyCode, "06"), // Timbang Isi
      fetchCount(token, companyCode, "07"), // Keluar Security
      fetchWarehouseSummary(token, companyCode),
    ]);

    return NextResponse.json({
      total,
      securityIn,
      securityOut,
      timbangKosong,
      timbangIsi,
      jembatanTimbang: (timbangKosong || 0) + (timbangIsi || 0),
      sedangMuat,
      selesaiMuat,
      warehouseCounts,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("[Antrian stream] fetch error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
