import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    ["superadmin", "admin", "ti"].includes(r.toLowerCase())
  );
}

// GET All Users for current plant context
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = (session?.user as any)?.aspnetToken as string;

    // Use requested endpoint: getUserAll
    const res = await aspnetFetchServer('/api/UserAccount/getUserAll', token);
    if (!res.ok) throw new Error("Failed to fetch users from API");

    const payload = await res.json();
    // Legacy API returns data inside 'data' property
    const data: any[] = payload.data || payload || [];

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET Single User Detail
// Usage: /api/admin/users/plant?username=xxx
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });

    const token = (session?.user as any)?.aspnetToken as string;
    
    // Use requested endpoint: GetUserDetail
    const res = await aspnetFetchServer(`/api/UserAccount/GetUserDetail?username=${username}`, token);
    if (!res.ok) throw new Error("Failed to fetch user detail");
    
    const payload = await res.json();
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// UPDATE User Profile
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const body = await req.json();

    // Mapping payload to match legacy UpdateProfil expectations
    const payload = {
      Id: body.id,
      UserName: body.username,
      Email: body.email,
      Password: body.password || "",
      IsIdentik: body.isIdentik === true,
      MfaRemember: body.mfaRemember === true,
      CurrentPassword: body.adminPassword // Password of the admin performing the update
    };

    // Use requested endpoint: UpdateProfil
    const res = await aspnetFetchServer('/api/UserAccount/UpdateProfil', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Update profile gagal");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
