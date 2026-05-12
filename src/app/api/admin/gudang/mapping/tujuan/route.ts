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
    const warehouseId = searchParams.get('warehouseId');
    if (!warehouseId) return NextResponse.json({ success: false, error: "Warehouse ID is required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer(`/api/SuperadminGudang/Mappings?gudangId=${warehouseId}&type=tujuan`, token);

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    const mappings: any[] = await res.json();

    const data = mappings.map((m) => ({
      Id: `${m.gudang}|${m.company_code}`,
      CompanyCode: m.company_code,
      CompanyName: m.company_name || m.company_code,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const { warehouseId, companyCode } = await req.json();
    if (!warehouseId || !companyCode) return NextResponse.json({ success: false, error: "Required fields missing" }, { status: 400 });

    const res = await aspnetFetchServer('/api/SuperadminGudang/AddMapping', token, {
      method: 'POST',
      body: JSON.stringify({ 
        gudangId: warehouseId, 
        companyCode: companyCode, 
        type: 'tujuan' 
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(errText || `API error: ${res.status}`);
    }

    return NextResponse.json({ success: true, message: "Mapping created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const { searchParams } = new URL(req.url);
    // Format is now handled by looking up mappings, but we still need the composite keys for RemoveMapping
    const compoundId = searchParams.get('id');
    if (!compoundId) return NextResponse.json({ success: false, error: "Mapping ID is required" }, { status: 400 });

    const [gudangId, companyCode] = compoundId.split('|');
    
    const res = await aspnetFetchServer('/api/SuperadminGudang/RemoveMapping', token, {
      method: 'POST',
      body: JSON.stringify({ 
        gudangId: gudangId, 
        companyCode: companyCode, 
        type: 'tujuan' 
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(errText || `API error: ${res.status}`);
    }

    return NextResponse.json({ success: true, message: "Mapping removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
