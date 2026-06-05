import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetJson } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return (
    !!session?.user &&
    roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()))
  );
}

function getToken(session: any): string {
  return (session?.user as any)?.aspnetToken || "";
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

    const body = await req.json();
    const token = getToken(session);

    const data = await aspnetJson("/api/PlantInstall/Install", token, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
