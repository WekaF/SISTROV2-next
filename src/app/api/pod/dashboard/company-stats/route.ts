import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !role || role.toLowerCase() !== "pod") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/CompanyDashboard/GetStats", token);
    if (!res.ok) throw new Error(`ASP.NET returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[POD Company Stats]", error.message);
    return NextResponse.json({ error: "Failed to fetch company stats" }, { status: 500 });
  }
}
