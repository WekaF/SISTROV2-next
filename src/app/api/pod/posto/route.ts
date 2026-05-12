import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const date = searchParams.get('date') || '';
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/POSTO/DataTable', token, {
      method: 'POST',
      body: JSON.stringify({
        Search: search,
        Date: date
      })
    });

    if (!res.ok) throw new Error("Failed to fetch POSTO from API");
    const data = await res.json();
    
    // Normalize response if necessary
    const rawData = data.data || data;
    const normalized = Array.isArray(rawData) ? rawData.map((po: any) => ({
      id: po.noposto || po.NoPosto || po.ID,
      date: po.tglposto || po.TglPosto,
      transportir: po.transportir || po.TransportirName || po.transport,
      transportirid: po.transport || po.TransportirCode,
      product: po.produkname || po.ProductName || po.produk,
      productid: po.produk || po.ProductCode,
      qty: po.qty || po.Qty,
      realization: po.qtyrealisasi || po.QtyRealisasi,
      asal: po.asalname || po.AsalName || po.asal,
      tujuan: po.tujuanname || po.TujuanName || po.tujuan,
      wilayah: po.wilayah || po.Wilayah,
      bagian: po.bagian || po.Bagian,
      company: po.companycode || po.CompanyCode,
      status: po.status_desc || po.StatusDesc || (po.status === '1' ? 'Active' : po.status === '3' ? 'Completed' : 'Unknown')
    })) : [];

    return NextResponse.json({ success: true, data: normalized });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
