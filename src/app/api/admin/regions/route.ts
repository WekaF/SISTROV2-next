import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const roles = (session?.user as any)?.roles || [];
    if (!session?.user || !roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Wilayah/Data', token);
    if (!res.ok) throw new Error("Failed to fetch regions from API");
    
    const data: any[] = await res.json();
    return NextResponse.json({ success: true, data: data.map(r => ({
      id: r.id || r.ID,
      code: r.code || r.Abbrev,
      name: r.name || r.Keterangan
    }))});
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
