import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    if (!productId) return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/ProdukMapping/ProdukMappingList', token, {
      method: 'POST',
      body: JSON.stringify({ productId })
    });
    
    if (!res.ok) throw new Error("Failed to fetch product mappings from API");
    const data: any[] = await res.json();
    
    return NextResponse.json({ success: true, data: data.map(m => ({
      id: m.id || m.ID,
      companycode: m.company_code || m.companycode || m.CompanyCode,
      companyname: m.company || m.companyname || m.CompanyName
    }))});
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { productId, companyCode } = await req.json();
    if (!productId || !companyCode) return NextResponse.json({ success: false, error: "Required fields missing" }, { status: 400 });
    
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/ProdukMapping/SaveData', token, {
      method: 'POST',
      body: JSON.stringify({ productId, companyCode })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Mapping created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'superadmin') {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const mappingId = searchParams.get('id');
    if (!mappingId) return NextResponse.json({ success: false, error: "Mapping ID is required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/ProdukMapping/RemoveData', token, {
      method: 'POST',
      body: JSON.stringify({ id: mappingId })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Mapping removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
