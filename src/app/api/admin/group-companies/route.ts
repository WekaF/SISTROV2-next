import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles: string[] = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r) =>
    ["superadmin", "ti"].includes(r.toLowerCase())
  );
}

/**
 * Distinct `Company.groupcompany` values — the real, already-populated
 * regional grouping data (SUMBAGUT, SUMBAGSEL, KALIMANTAN, etc.) — combined
 * with superadmin-added custom entries, used as the "wilayah" master data
 * for AVP/VP manager-hierarchy scope mapping.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/Company/GroupCompanies", token);
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`Backend ${res.status}: ${body}`);
    }

    const groups: any[] = await res.json();
    return NextResponse.json({
      success: true,
      data: groups.map((g) => ({ id: g.Id, code: g.Name, name: g.Name, isCustom: g.IsCustom })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/Company/GroupCompanies/Custom", token, {
      method: "POST",
      body: JSON.stringify({ Name: body.name }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const created = await res.json();
    return NextResponse.json({
      success: true,
      data: { id: created.Id, code: created.Name, name: created.Name, isCustom: true },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer("/api/Company/GroupCompanies/Custom/Delete", token, {
      method: "POST",
      body: JSON.stringify({ Id: id }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
