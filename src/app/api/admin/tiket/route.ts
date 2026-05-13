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
    const search = searchParams.get('search') || '';
    const plantCode = searchParams.get('plant') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Tiket/DataTable', token, {
      method: 'POST',
      body: JSON.stringify({
        Page: page,
        Length: limit,
        Search: search,
        PlantCode: plantCode,
        Status: status,
        DateFrom: dateFrom,
        DateTo: dateTo
      })
    });

    if (!res.ok) throw new Error("Failed to fetch tickets from API");
    const data = await res.json();
    
    return NextResponse.json({
      success: true,
      data: data.data || data,
      pagination: { 
        total: data.recordsTotal || data.length, 
        page, 
        limit, 
        totalPages: Math.ceil((data.recordsTotal || data.length) / limit) 
      }
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
    const id = body.id;
    const reason = (body.reason || "").trim();
    if (!id) return NextResponse.json({ success: false, error: "Tiket ID is required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Tiket/DeleteData', token, {
      method: 'POST',
      body: JSON.stringify({ id, reason })
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
