import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ASPNET = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

function getToken(session: any): string {
  return (session?.user as any)?.aspnetToken || "";
}

function extractGuid(actionHtml: string): string {
  const match = actionHtml?.match(/(?:deleteItem|passwordItem)\s*\(\s*['"]([^'"]+)['"]\s*\)/);
  return match?.[1] || "";
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
      "order[0][column]": "1",
      "order[0][dir]": "asc",
      "columns[0][data]": "number",
      "columns[0][name]": "UserName",
      "columns[1][data]": "username",
      "columns[1][name]": "UserName",
      "columns[2][data]": "fullname",
      "columns[2][name]": "fullname",
      "columns[3][data]": "action",
      "columns[3][name]": "action",
      cmd: "refresh",
      role: "Transport",
    });

    const res = await fetch(`${ASPNET}/api/UserAccount/DataUser`, {
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
    const data = (json.data || []).map((row: any) => ({
      number: row.number,
      username: row.username,
      fullname: row.fullname,
      guid: extractGuid(row.action || ""),
    }));

    return NextResponse.json({
      success: true,
      data,
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

    const { username, password, fullname, kode, singkatan } = await req.json();
    if (!username || !password || !fullname || !kode) {
      return NextResponse.json({ success: false, error: "Username, password, nama, dan kode SAP wajib diisi" }, { status: 400 });
    }

    const res = await fetch(`${ASPNET}/api/UserAccount/Register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken(session)}` },
      body: JSON.stringify({ username, password, fullname, kode, singkatan, rolename: "Transport" }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "User transportir berhasil dibuat" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { guid, newpassword } = await req.json();
    if (!guid || !newpassword) {
      return NextResponse.json({ success: false, error: "guid dan newpassword wajib diisi" }, { status: 400 });
    }

    const res = await fetch(`${ASPNET}/api/UserAccount/ChangePassword`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken(session)}` },
      body: JSON.stringify({ guid, newpassword }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Password berhasil diperbarui" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const guid = searchParams.get("guid");
    if (!guid) return NextResponse.json({ success: false, error: "guid is required" }, { status: 400 });

    const res = await fetch(`${ASPNET}/api/UserAccount/DeleteData`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken(session)}` },
      body: JSON.stringify({ guid }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "User berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
