import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Data/DetailUser', token);
    if (!res.ok) throw new Error("Failed to fetch user profile");
    
    const data = await res.json();
    return NextResponse.json({
      id: data.id || data.ID,
      username: data.username || data.UserName,
      email: data.email || data.Email,
      fullname: data.fullname || data.FullName || data.Nama,
      department: data.department || data.Department,
      bagian: data.bagian || data.Bagian,
      sapvendorcode: data.sapvendorcode || data.SAPVendorCode
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;
    
    const res = await aspnetFetchServer('/api/UserAccount/UpdateUserProfile', token, {
      method: 'POST',
      body: JSON.stringify({
        FullName: body.fullName || body.fullname,
        Email: body.email,
        Department: body.department,
        Bagian: body.bagian
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
