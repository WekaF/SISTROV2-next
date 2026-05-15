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
    const res = await aspnetFetchServer('/api/Sumbu/TarikSumbuPercepatan', token, {
      method: 'GET'
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
