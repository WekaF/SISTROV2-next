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
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);
    const offset = (page - 1) * limit;

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Produk/Data', token);
    if (!res.ok) throw new Error("Failed to fetch products from API");
    
    let allProducts: any[] = await res.json();
    
    // Filtering
    if (search) {
      const s = search.toLowerCase();
      allProducts = allProducts.filter(p => 
        (p.nama || p.Nama)?.toLowerCase().includes(s) || 
        (p.kode || p.Kode)?.toLowerCase().includes(s)
      );
    }

    const total = allProducts.length;
    const paginated = allProducts.slice(offset, offset + limit).map(p => ({
      id: p.id || p.ID,
      name: p.nama || p.Nama,
      code: p.kode || p.Kode,
      issubsidi: p.issubsidi || p.IsSubsidi || false,
      mappingcount: 0, // Placeholder
      plants: '' // Placeholder
    }));

    return NextResponse.json({ 
      success: true, 
      data: paginated, 
      pagination: { total, page, limit, totalPages: Math.ceil(total/limit) } 
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
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/Produk/AddProduk', token, {
      method: 'POST',
      body: JSON.stringify({
        Nama: body.name,
        Kode: body.code,
        IsSubsidi: body.isSubsidi || false
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Product created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
