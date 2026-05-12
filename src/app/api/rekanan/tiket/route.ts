import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRoles = (session?.user as any)?.roles || [];
    if (!session?.user || !userRoles.includes('rekanan')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer(`/api/MobileTransport/ListTiket?status=${status || ''}`, token);
    if (!res.ok) throw new Error("Failed to fetch tickets from API");
    
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRoles = (session?.user as any)?.roles || [];
    if (!session?.user || !userRoles.includes('rekanan')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/MobileTransport/PesanTiket', token, {
      method: 'POST',
      body: JSON.stringify({
        NoPosto: body.NoPosto,
        Nopol: body.Nopol,
        DriverName: body.DriverName,
        DriverPhone: body.DriverPhone,
        ProductId: body.ProductId
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, message: "Ticket booked successfully", data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
