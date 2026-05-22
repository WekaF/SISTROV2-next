import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    if (!token) {
      return NextResponse.json({ success: false, error: "No backend session token" }, { status: 401 });
    }

    const body = await req.json();
    const { nomorDO } = body;

    if (!nomorDO) {
      return NextResponse.json({ success: false, error: "Nomor DO is required" }, { status: 400 });
    }

    // Legacy ASP.NET parses req.Form["nomorDO"] which expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append("nomorDO", nomorDO);

    const res = await aspnetFetchServer("/api/Tiket/getNomorDO", token, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ success: false, error: errorText || "Failed to track DO" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
