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
    
    // We send form-urlencoded data just in case ASP.NET DataTables endpoint requires it
    const params = new URLSearchParams({
      draw: '1', start: '0', length: '9999',
      'search[value]': '', 'search[regex]': 'false',
      'order[0][column]': '0', 'order[0][dir]': 'asc',
      'columns[0][name]': 'Id',
    });
    
    const res = await aspnetFetchServer('/api/Sumbu/SumbuPercepatan', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) throw new Error("Failed to fetch percepatan from API");
    
    const data = await res.json();
    const raw: any[] = data.data ?? data ?? [];
    
    const normalized = raw.map((item: any) => ({
      KodePlant: item.KodePlant || item.kodePlant || (session?.user as any)?.companyCode || '',
      IdSumbu: item.Id ?? item.id ?? item.IdSumbu ?? item.idSumbu ?? 0,
      IdGrupTruk: item.IdGrupTruk ?? item.idGrupTruk ?? 0,
      MuatanPercepatan: item.muatanPercepatan ?? item.MuatanPercepatan ?? 0,
      TanggalAwal: item.validFrom ?? item.TanggalAwal ?? null,
      TanggalAkhir: item.validTo ?? item.TanggalAkhir ?? null,
      nama: item.nama ?? '',
      jenistruk: item.jenistruk ?? '',
      muatan: item.muatan ?? 0,
    }));
    
    return NextResponse.json({ success: true, data: normalized });
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

    const items: any[] = Array.isArray(body) ? body : [body];
    const payload = items.map((item) => ({
      KodePlant: item.kodePlant || item.KodePlant || '',
      IdGrupTruk: Number(item.idGrupTruk || item.IdGrupTruk || 0),
      IdSumbu: Number(item.idSumbu || item.IdSumbu || 0),
      MuatanPercepatan: Number(item.muatanPercepatan || item.MuatanPercepatan || 0),
      TanggalAwal: item.tanggalAwal || item.TanggalAwal || null,
      TanggalAkhir: item.tanggalAkhir || item.TanggalAkhir || null,
    }));

    const res = await aspnetFetchServer('/api/Sumbu/SaveSumbuPercepatan', token, {
      method: 'POST',
      body: JSON.stringify(payload),
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

    // Creating array of 1 element with 0 muatanPercepatan to delete/clear
    const payload = [{
      KodePlant: plant,
      IdGrupTruk: parseInt(grup),
      IdSumbu: parseInt(sumbu || '0'),
      MuatanPercepatan: 0,
      TanggalAwal: null,
      TanggalAkhir: null
    }];

    const res = await aspnetFetchServer('/api/Sumbu/SaveSumbuPercepatan', token, {
      method: 'POST',
      body: JSON.stringify(payload)
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
