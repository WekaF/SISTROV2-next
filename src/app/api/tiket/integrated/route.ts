import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    if (!token) {
      return NextResponse.json({ success: false, error: "No backend session token" }, { status: 401 });
    }

    const res = await aspnetFetchServer("/api/Home/GetIntegratedTicketsNext", token, {
      method: "GET"
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ success: false, error: errorText || "Failed to fetch integrated tickets" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
