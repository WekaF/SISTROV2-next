import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isSuperAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");

    if (type === "bagian-options") {
      const res = await aspnetFetchServer("/api/UserAreaScope/BagianOptions", token);
      if (!res.ok) throw new Error("Failed to fetch bagian options");
      return NextResponse.json(await res.json());
    }

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const res = await aspnetFetchServer(`/api/UserAreaScope/List?userId=${encodeURIComponent(userId)}`, token);
    if (!res.ok) throw new Error("Failed to fetch area scopes");
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const body = await req.json();

    const res = await aspnetFetchServer("/api/UserAreaScope/Add", token, {
      method: "POST",
      body: JSON.stringify({ UserId: body.userId, Wilayah: body.wilayah || null, Bagian: body.bagian }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: await res.json() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const res = await aspnetFetchServer("/api/UserAreaScope/Delete", token, {
      method: "POST",
      body: JSON.stringify({ Id: id }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
