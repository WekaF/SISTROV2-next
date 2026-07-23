import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const { id } = await params;
    const { Deskripsi, Alamat, Kecamatan, Kabupaten, Propinsi } = await req.json();

    const res = await aspnetFetchServer('/api/SuperadminGudang/Sync', token, {
      method: 'POST',
      body: JSON.stringify({ id, deskripsi: Deskripsi, alamat: Alamat, kecamatan: Kecamatan, kabupaten: Kabupaten, propinsi: Propinsi }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    return NextResponse.json({ success: true, message: "Warehouse updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const { id } = await params;

    const res = await aspnetFetchServer('/api/SuperadminGudang/DeleteGudang', token, {
      method: 'POST',
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`API error: ${res.status} ${errText}`);
    }

    return NextResponse.json({ success: true, message: "Warehouse deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
