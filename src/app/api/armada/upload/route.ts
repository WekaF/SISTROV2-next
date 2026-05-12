import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeRole } from "@/lib/role-utils";

const ASPNET = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";
const ALLOWED = ["pod", "superadmin", "admin"];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const role = normalizeRole((session.user as any).role);
    if (!ALLOWED.includes(role)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const token = (session.user as any).aspnetToken;
    const { records } = await req.json();
    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: "Data kosong" }, { status: 400 });
    }

    const res = await fetch(`${ASPNET}/api/Armada/UploadBulk`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(records),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ success: false, error: text || `Error ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
