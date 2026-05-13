import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isSuperAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/UserAccount/UpdateProfil', token, {
      method: 'POST',
      body: JSON.stringify({
        Id:              body.id,
        UserName:        body.username,
        Email:           body.email,
        Password:        body.password || "",
        IsIdentik:       body.isIdentik ?? false,
        MfaRemember:     body.mfaRemember ?? false,
        CurrentPassword: body.currentPassword,
        fullname:        body.fullname || "",
        PhoneNumber:     body.phoneNumber || "",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Gagal menyimpan perubahan");
      return NextResponse.json({ success: false, error: text }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
