import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ success: false, error: "name dan code wajib diisi." }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const resolvedParams = await params;
    const res = await aspnetFetchServer('/api/SuperadminProduk/UpdateProduct', token, {
      method: 'POST',
      body: JSON.stringify({
        Id: resolvedParams.id,
        Nama: body.name,
        Kode: body.code,
        Tipe: body.isSubsidi ? 'subsidi' : null,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Produk berhasil diupdate." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const resolvedParams = await params;
    const res = await aspnetFetchServer('/api/SuperadminProduk/DeleteProduct', token, {
      method: 'POST',
      body: JSON.stringify({
        Id: resolvedParams.id,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Produk berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
