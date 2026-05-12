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
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminArmada/List', token);
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    let allData: any[] = await res.json();
    if (!Array.isArray(allData)) allData = [];

    if (search) {
      allData = allData.filter((a: any) =>
        (a.Nopol || '').toLowerCase().includes(search) ||
        (a.TransportCode || '').toLowerCase().includes(search) ||
        (a.JenisKendaraan || '').toLowerCase().includes(search) ||
        (a.StatusArmada || '').toLowerCase().includes(search)
      );
    }

    const total = allData.length;
    const offset = (page - 1) * limit;
    const paginated = allData.slice(offset, offset + limit).map((a: any, i: number) => ({
      no: offset + i + 1,
      id: a.Id,
      transportCode: a.TransportCode || '',
      nopol: a.Nopol || '',
      updatedBy: a.UpdatedBy || '',
      updatedOn: a.UpdatedOn || null,
      sumbu: a.Sumbu || '',
      jenisKendaraan: a.JenisKendaraan || '',
      qtyMax: a.QtyMax ?? null,
      kir: a.Kir || '',
      jbi: a.Jbi ?? null,
      beratKendaraan: a.BeratKendaraan ?? null,
      beratPenumpang: a.BeratPenumpang ?? null,
      approver: a.Approver || '',
      approve: a.Approve ?? null,
      revised: a.Revised || '',
      charter: a.Charter ?? null,
      tahunPembuatan: a.TahunPembuatan ?? null,
      noRangkaStnk: a.NoRangkaStnk || '',
      noMesinStnk: a.NoMesinStnk || '',
      masaBerlakuKir: a.MasaBerlakuKir || null,
      noRangkaKir: a.NoRangkaKir || '',
      noMesinKir: a.NoMesinKir || '',
      statusArmada: a.StatusArmada || '',
      mappingCount: a.MappingCount || 0,
      plants: a.Plants || '',
    }));

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
