import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id: noPosto } = await params;
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/POSTO/DetailData', token, {
      method: 'POST',
      body: JSON.stringify({ noposto: noPosto })
    });

    if (!res.ok) throw new Error("POSTO not found on API");
    const data = await res.json();
    
    return NextResponse.json({ success: true, data: {
      id: data.noposto || data.NoPosto || noPosto,
      date: data.tglposto || data.TglPosto,
      expirydate: data.tgljatuhtempo || data.TglJatuhTempo,
      transportir: data.transportirname || data.TransportirName,
      transportirid: data.transport || data.TransportirCode,
      product: data.produkname || data.ProductName,
      productid: data.produk || data.ProductCode,
      qty: data.qty || data.Qty,
      realization: data.qtyrealisasi || data.QtyRealisasi,
      asal: data.asal || data.Asal,
      tujuan: data.tujuan || data.Tujuan,
      wilayah: data.wilayah || data.Wilayah,
      bagian: data.bagian || data.Bagian,
      company: data.companycode || data.CompanyCode,
      status: data.status_desc || data.StatusDesc,
      initialqty: data.initialqty || data.InitialQty,
      charter: data.charter || data.Charter,
      percepatan: data.percepatan || data.Percepatan
    }});
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id: noPosto } = await params;
    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/POSTO/UpdateData', token, {
      method: 'POST',
      body: JSON.stringify({
        NoPosto: noPosto,
        TglPosto: body.date,
        Qty: body.qty,
        TglJatuhTempo: body.expiryDate
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "POSTO updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { id: noPosto } = await params;
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/POSTO/DeleteData', token, {
      method: 'POST',
      body: JSON.stringify({ noposto: noPosto })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "POSTO deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
