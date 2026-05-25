import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  try {
    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/UserAccount/UpdateProfil', token, {
      method: 'POST',
      body: JSON.stringify({
        Id: body.id || body.Id,
        fullname: body.fullname || body.fullName,
        Email: body.email || body.Email,
        PhoneNumber: body.phonenumber || body.phoneNumber || body.PhoneNumber,
        CurrentPassword: body.currentPassword || body.CurrentPassword
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText || "Gagal memperbarui profil" }, { status: res.status });
    }

    const successMsg = await res.text();
    return NextResponse.json({ message: successMsg || "Sukses memperbarui profil" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
