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
    const bookingno = searchParams.get('bookingno') || '';
    if (!bookingno) return NextResponse.json({ success: false, error: "Booking number is required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Tiket/DetailData', token, {
      method: 'POST',
      body: JSON.stringify({ bookingno })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: errText || "Tiket tidak ditemukan" }, { status: res.status });
    }
    const data = await res.json();
    
    // ASP.NET might return data wrapped or direct
    const ticketData = data.data || data;
    if (!ticketData || !ticketData.bookingno) {
      return NextResponse.json({ success: false, error: "Tiket tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: ticketData
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    if (!force) return NextResponse.json({ success: false, error: "Force delete requires ?force=true" }, { status: 400 });

    const body = await req.json();
    const bookingno = body.bookingno;
    if (!bookingno) return NextResponse.json({ success: false, error: "Booking number is required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    
    // Kirim request ke ForceDeleteSP menggunakan form POST
    const formParams = new URLSearchParams();
    formParams.append("bookingno", bookingno);

    const res = await aspnetFetchServer('/api/Tiket/ForceDeleteSP', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formParams.toString()
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Tiket deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
