import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const roles = (session?.user as any)?.roles || [];
    if (!session?.user || !roles.some((r: string) => ["superadmin", "admin", "ti"].includes(r.toLowerCase()))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/UserAccount/DataRole', token);
    if (!res.ok) throw new Error("Failed to fetch roles from API");
    
    const data: any[] = await res.json();
    // Normalize data structure
    const mapped = data.map(r => ({
      id: r.id || r.Id,
      code: r.code || r.Name, // Adjust based on what API returns
      name: r.name || r.Name
    }));
    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
