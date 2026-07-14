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
 * regional grouping data (SUMBAGUT, SUMBAGSEL, KALIMANTAN, etc.), used as
 * the "wilayah" master data for AVP/VP manager-hierarchy scope mapping.
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

    const groups: string[] = await res.json();
    return NextResponse.json({
      success: true,
      data: groups.map((g) => ({ id: g, code: g, name: g })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
