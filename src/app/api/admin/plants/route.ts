import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ASPNET = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti", "admin", "pod", "adminarmada"].includes(r.toLowerCase()));
}

function getToken(session: any): string {
  return (session?.user as any)?.aspnetToken || "";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const res = await fetch(`${ASPNET}/api/Company/GetPlantManagement`, {
      headers: { Authorization: `Bearer ${getToken(session)}` },
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json({ success: true, data: json.data ?? json });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const res = await fetch(`${ASPNET}/api/Company/UpdatePlant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken(session)}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json({ success: true, message: json.message ?? "Berhasil disimpan" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
