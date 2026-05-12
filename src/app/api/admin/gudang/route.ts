import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
    const search = (searchParams.get('search') || '').toLowerCase().trim();

    const token = (session?.user as any)?.aspnetToken as string;

    const remoteRes = await aspnetFetchServer('/api/SuperadminGudang/List', token);
    if (!remoteRes.ok) {
      const errText = await remoteRes.text().catch(() => remoteRes.statusText);
      throw new Error(`SISTRODEV API error: ${remoteRes.status} ${errText}`);
    }

    const allDataRaw = await remoteRes.json();
    let allData: any[] = Array.isArray(allDataRaw) ? allDataRaw : (allDataRaw.data || []);

    // Map C# response shape → page shape
    allData = allData.map((g: any) => ({
      ID: (g.id || '').toString(),
      Deskripsi: g.deskripsi || '',
      Alamat: g.alamat || '',
      Kecamatan: g.kecamatan || '',
      Kabupaten: g.kabupaten || '',
      Propinsi: g.propinsi || '',
      TujuanCount: g.tujuan_count || 0,
      MuatCount: g.muat_count || 0,
    }));

    if (search) {
      allData = allData.filter((g) =>
        g.ID?.toLowerCase().includes(search) ||
        g.Deskripsi?.toLowerCase().includes(search) ||
        g.Kabupaten?.toLowerCase().includes(search) ||
        g.Propinsi?.toLowerCase().includes(search)
      );
    }

    const total = allData.length;
    const offset = (page - 1) * limit;
    const paginatedData = allData.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
