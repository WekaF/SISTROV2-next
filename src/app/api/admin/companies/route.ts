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
    const res = await aspnetFetchServer('/api/Company/getCompanyListFitur', token);

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    const json = await res.json();
    const rawData = json.data ?? json;
    const items = Array.isArray(rawData) ? rawData : [];

    const mapped = items.map((c: any) => ({
      code: c.Kode ?? c.kode ?? c.company_code ?? c.code ?? "",
      name: c.Nama ?? c.nama ?? c.company ?? c.name ?? ""
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
