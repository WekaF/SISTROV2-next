import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Company/Data', token);
    if (!res.ok) throw new Error("Failed to fetch companies from API");
    
    const data: any[] = await res.json();
    const mapped = data.map(c => ({
      id: c.id ?? 0,
      code: c.company_code ?? c.ID ?? '',
      name: c.company ?? c.Deskripsi ?? ''
    }));
    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
