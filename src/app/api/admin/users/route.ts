import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isSuperAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRoles = (session?.user as any)?.roles || [];
    const isAdmin = !!session?.user && userRoles.some((r: string) => ["superadmin", "admin", "ti"].includes(r.toLowerCase()));
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/UserAccount/ListUser', token);
    if (!res.ok) throw new Error("Failed to fetch users from API");
    
    const data: any[] = await res.json();
    // Normalize data structure to match what the frontend expects
    const mapped = data.map(u => ({
      id: u.userid || u.id,
      username: u.username,
      email: u.email,
      fullname: u.fullname,
      status: 'Active', // Legacy API doesn't always return status, assuming active
      roles: u.role ? u.role.split(',').map((r: string) => r.trim()) : [],
      companies: u.company_code ? [u.company_code] : (u.companycode ? [u.companycode] : []),
      sapvendorcode: u.sapvendorcode || u.sap
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    // Register basic user data
    const registerRes = await aspnetFetchServer('/api/UserAccount/Register', token, {
      method: 'POST',
      body: JSON.stringify({
        Username: body.username,
        Password: body.password,
        FullName: body.fullName,
        Email: body.email,
        IsActive: body.isActive !== false,
        SAPVendorCode: body.sapVendorCode || null
      })
    });

    if (!registerRes.ok) {
      const err = await registerRes.text();
      return NextResponse.json({ success: false, error: err }, { status: registerRes.status });
    }

    // Role assignments
    if (body.roles && body.roles.length > 0) {
      for (const roleName of body.roles) {
        await aspnetFetchServer('/api/UserAccount/AddtoRole', token, {
          method: 'POST',
          body: JSON.stringify({ username: body.username, role: roleName })
        });
      }
    }

    return NextResponse.json({ success: true, message: "User registered successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/UserAccount/UpdateUserProfile', token, {
      method: 'POST',
      body: JSON.stringify({
        Id: body.id,
        FullName: body.fullName,
        Email: body.email,
        IsActive: body.isActive
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/UserAccount/DeleteData', token, {
      method: 'POST',
      body: JSON.stringify({ id })
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
