import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    
    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    // Delegate action to legacy API
    const endpoint = body.action === 'validate' ? '/api/POSTO/DataTable_Upload' : '/api/POSTO/TransferUpload';
    
    const res = await aspnetFetchServer(endpoint, token, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
