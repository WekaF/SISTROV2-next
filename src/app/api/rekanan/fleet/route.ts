import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRoles = (session?.user as any)?.roles || [];
    if (!session?.user || !userRoles.includes('rekanan')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/MobileTransport/ListArmadaPagination', token);
    if (!res.ok) throw new Error("Failed to fetch fleet from API");
    
    const data = await res.json();
    return NextResponse.json({ success: true, data: data.data || data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRoles = (session?.user as any)?.roles || [];
    if (!session?.user || !userRoles.includes('rekanan')) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/MobileTransport/AddArmada', token, {
      method: 'POST',
      body: JSON.stringify({
        Nopol: body.Nopol,
        SumbuId: body.SumbuId,
        Type: body.Type
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Fleet submitted successfully for verification" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
