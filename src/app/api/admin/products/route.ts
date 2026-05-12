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
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminProduk/List', token);
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    let allData: any[] = await res.json();
    if (!Array.isArray(allData)) allData = [];

    if (search) {
      allData = allData.filter((p: any) =>
        (p.Nama || '').toLowerCase().includes(search) ||
        (p.Kode || '').toLowerCase().includes(search)
      );
    }

    const total = allData.length;
    const offset = (page - 1) * limit;
    const paginated = allData.slice(offset, offset + limit).map((p: any) => ({
      id: p.Id,
      name: p.Nama || '',
      code: p.Kode || '',
      isSubsidi: (p.Tipe || '').toLowerCase() === 'subsidi',
      mappingCount: p.MappingCount || 0,
      plants: p.Plants || '',
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ success: false, error: "name dan code wajib diisi." }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminProduk/AddProduct', token, {
      method: 'POST',
      body: JSON.stringify({
        Nama: body.name,
        Kode: body.code,
        Tipe: body.isSubsidi ? 'subsidi' : null,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Produk berhasil ditambahkan." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
