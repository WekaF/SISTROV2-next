import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const ALLOWED_ROLES = ["superadmin", "ti", "adminsumbu", "adminarmada"];

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    ALLOWED_ROLES.includes(r.toLowerCase())
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Sumbu/SumbuPercepatan', token, {
      method: 'POST',
      body: JSON.stringify({})
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const token = (session?.user as any)?.aspnetToken as string;
    const body = await req.json();

    const items: any[] = Array.isArray(body) ? body : [body];

    const results = await Promise.all(items.map(async (item) => {
      const res = await aspnetFetchServer('/api/Sumbu/SaveSumbuPercepatan', token, {
        method: 'POST',
        body: JSON.stringify({
          KodePlant: item.kodePlant,
          IdGrupTruk: item.idGrupTruk || 0,
          IdSumbu: item.idSumbu,
          MuatanPercepatan: item.muatanPercepatan,
          TanggalAwal: item.tanggalAwal,
          TanggalAkhir: item.tanggalAkhir,
        })
      });
      return res.ok;
    }));

    const allOk = results.every(Boolean);
    if (!allOk) {
      return NextResponse.json({ success: false, error: "Sebagian data gagal disimpan" }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Konfigurasi percepatan berhasil disimpan" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
