import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { normalizeRole } from "@/lib/role-utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const primaryRole = (session?.user as any)?.role as string | undefined;
  const allRoles: string[] = ((session?.user as any)?.roles as string[] | undefined) ?? [];

  const normalizedPrimary = normalizeRole(primaryRole);
  const normalizedRoles = allRoles.map(normalizeRole);

  const hasAccess = normalizedPrimary === "superadmin" || normalizedPrimary === "viewer" ||
                    normalizedRoles.includes("superadmin") || normalizedRoles.includes("viewer");

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  try {
    const res = await aspnetFetchServer("/api/ResumeApi/Summary", token);
    if (!res.ok) {
      return NextResponse.json({ error: "Backend error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Resume Transit] fetch error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
