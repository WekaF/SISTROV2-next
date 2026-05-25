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

    const res = await aspnetFetchServer('/api/UserAccount/ChangePassword2', token, {
      method: 'POST',
      body: JSON.stringify({
        oldpassword: body.oldpassword,
        newpassword: body.newpassword
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText || "Gagal mengganti password" }, { status: res.status });
    }

    const successMsg = await res.text();
    return NextResponse.json({ message: successMsg || "Sukses Mengganti Password" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
