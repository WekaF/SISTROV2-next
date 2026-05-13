import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function hasAccess(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    ["superadmin", "ti", "staffarea"].includes(r.toLowerCase())
  );
}

// GET All Shifts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!hasAccess(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = (session?.user as any)?.aspnetToken as string;

    // Use legacy endpoint: DataMapping (returns all)
    const res = await aspnetFetchServer('/api/Shift/DataMapping', token);
    if (!res.ok) throw new Error("Failed to fetch shifts from legacy API");

    const data = await res.json();
    const result = data.data || data;
    return NextResponse.json(Array.isArray(result) ? result : []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET Single Shift Detail
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasAccess(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const abbrev = searchParams.get('abbrev');
    if (!abbrev) return NextResponse.json({ error: "Abbrev is required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    
    // Use legacy endpoint: DetailData
    const res = await aspnetFetchServer('/api/Shift/DetailData', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abbrev })
    });
    
    if (!res.ok) throw new Error("Failed to fetch shift detail");
    
    const payload = await res.json();
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// UPDATE Shift
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!hasAccess(session)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const body = await req.json();

    // Mapping payload to match legacy ChangeData expectations
    const payload = {
      abbrev: body.abbrev,
      keterangan: body.keterangan,
      scope: body.scope,
      level: body.level,
      starttime: body.starttime,
      endtime: body.endtime
    };

    // Use legacy endpoint: ChangeData
    const res = await aspnetFetchServer('/api/Shift/ChangeData', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Gagal mengubah data shift");
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
