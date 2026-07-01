import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  if (!session?.user) return false;
  const username = ((session.user as any).username as string ?? "").toLowerCase();
  if (username === "pi_admin") return true;
  const roles: string[] = (session.user as any).roles ?? [];
  return roles.some((r) =>
    ["superadmin", "ti", "viewer", "pkd"].includes(r.toLowerCase())
  );
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = (session!.user as any).aspnetToken as string;
    const body = await req.text();

    const res = await aspnetFetchServer("/api/Tiket/DashboardTiket", token, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return NextResponse.json(
        { success: false, error: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
