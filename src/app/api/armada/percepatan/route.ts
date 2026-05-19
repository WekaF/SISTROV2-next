import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const ALLOWED_ROLES = ["superadmin", "ti", "adminsumbu", "adminarmada", "pod", "admin"];

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
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const companyCode = (session?.user as any)?.companyCode || '';
    const raw: any[] = data.data ?? data ?? [];
    const normalized = raw.map((item: any) => ({
      KodePlant: item.KodePlant || item.kodePlant || companyCode,
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
    if (!isAuthorized(session)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const token = (session?.user as any)?.aspnetToken as string;
    const body = await req.json();

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
    return NextResponse.json({ success: true, message: "Konfigurasi percepatan berhasil disimpan" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
