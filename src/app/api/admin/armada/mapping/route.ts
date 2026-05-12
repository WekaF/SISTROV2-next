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
    const armadaId = searchParams.get('armadaId');
    if (!armadaId) return NextResponse.json({ success: false, error: "armadaId wajib diisi." }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer(
      `/api/SuperadminArmada/Mappings?armadaId=${encodeURIComponent(armadaId)}`,
      token
    );
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`API error: ${res.status} ${err}`);
    }

    const data: any[] = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { armadaId, companyCode } = await req.json();
    if (!armadaId || !companyCode) {
      return NextResponse.json({ success: false, error: "armadaId dan companyCode wajib diisi." }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminArmada/AddMapping', token, {
      method: 'POST',
      body: JSON.stringify({ ArmadaId: armadaId, CompanyCode: companyCode }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Mapping berhasil ditambahkan." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: "Mapping ID wajib diisi." }, { status: 400 });
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) return NextResponse.json({ success: false, error: "ID harus berupa angka." }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminArmada/RemoveMapping', token, {
      method: 'POST',
      body: JSON.stringify({ Id: idNum }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Mapping berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
