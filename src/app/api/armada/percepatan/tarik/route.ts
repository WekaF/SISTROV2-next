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
    const res = await aspnetFetchServer(`/api/Sumbu/TarikSumbuPercepatan?${params.toString()}`, token, {
      method: 'GET'
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const raw: any[] = data.data ?? data ?? [];
    const normalized = raw.map((item: any) => ({
      Id: item.Id ?? item.id ?? 0,
      IdGrupTruk: item.IdGrupTruk ?? item.idGrupTruk ?? 0,
      jenistruk: item.jenistruk ?? '',
      nama: item.nama ?? '',
      muatan: item.muatan ?? 0,
      muatanPercepatan: item.muatanPercepatan ?? item.MuatanPercepatan ?? null,
    }));
    return NextResponse.json({ success: true, data: normalized });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
