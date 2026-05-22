import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ASPNET = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

function getToken(session: any): string {
  return (session?.user as any)?.aspnetToken || "";
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const start = (page - 1) * limit;

    const params = new URLSearchParams({
      draw: "1",
      start: String(start),
      length: String(limit),
      "search[value]": search,
      "order[0][column]": "0",
      "order[0][dir]": "asc",
      "columns[0][name]": "nama",
      "columns[1][name]": "kode",
      "columns[2][name]": "username",
      "columns[3][name]": "singkatan",
    });

    const res = await fetch(`${ASPNET}/api/Transportir/DataTable`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${getToken(session)}`,
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }

    const json = await res.json();
    const total = json.recordsFiltered ?? json.recordsTotal ?? 0;

    return NextResponse.json({
      success: true,
      data: json.data || [],
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { nama, kode, singkatan, username, email, isCharter } = body;
    if (!nama || !kode) {
      return NextResponse.json({ success: false, error: "Nama dan kode wajib diisi" }, { status: 400 });
    }

    const res = await fetch(`${ASPNET}/api/Transportir/AddData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken(session)}`,
      },
      body: JSON.stringify({ nama, kode, singkatan, username, email, isCharter: isCharter || false }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Transportir berhasil ditambahkan" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
