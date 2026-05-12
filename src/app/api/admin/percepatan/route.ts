import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Sumbu/SumbuPercepatan', token, { method: 'POST', body: JSON.stringify({}) });
    if (!res.ok) throw new Error("Failed to fetch percepatan from API");
    
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/Sumbu/SaveSumbuPercepatan', token, {
      method: 'POST',
      body: JSON.stringify({
        kodePlant: body.kodePlant,
        idGrupTruk: body.idGrupTruk || 0,
        idSumbu: body.idSumbu,
        muatanPercepatan: body.muatanPercepatan,
        tanggalAwal: body.tanggalAwal,
        tanggalAkhir: body.tanggalAkhir
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Percepatan updated/created successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const plant = (searchParams.get('plant') || "").trim();
    const sumbu = searchParams.get('sumbu');
    const grup = searchParams.get('grup') || '0';
    const token = (session?.user as any)?.aspnetToken as string;

    // Assuming a similar pattern for removal or updating with 0/null
    const res = await aspnetFetchServer('/api/Sumbu/SaveSumbuPercepatan', token, {
      method: 'POST',
      body: JSON.stringify({
        kodePlant: plant,
        idGrupTruk: parseInt(grup),
        idSumbu: parseInt(sumbu || '0'),
        muatanPercepatan: 0, // Setting to 0 effectively removes it in some systems
        tanggalAwal: null,
        tanggalAkhir: null
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Percepatan deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
