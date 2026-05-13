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
    
    const payload = await res.json();
    const data: any[] = payload.data || payload || [];
    // Normalize data — ListUser now returns roles[] directly
    const mapped = data.map(u => ({
      id:           u.Id || u.id || u.userid,
      username:     u.UserName || u.username,
      fullname:     u.fullname,
      email:        u.email || null,
      roles:        Array.isArray(u.roles) ? u.roles : (u.role ? u.role.split(',').map((r: string) => r.trim()) : []),
      companies:    u.company_code ? [u.company_code] : [],
      isactive:     u.isactive ?? true,
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
    const errors: string[] = [];

    // 1. Update basic profile
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

    // 2. Sync roles if provided
    if (Array.isArray(body.newRoles) && Array.isArray(body.currentRoles)) {
      const currentSet = new Set<string>(body.currentRoles.map((r: string) => r.toLowerCase()));
      const newSet     = new Set<string>(body.newRoles.map((r: string) => r.toLowerCase()));

      // Roles to add (in newRoles but not in currentRoles)
      const toAdd = body.newRoles.filter((r: string) => !currentSet.has(r.toLowerCase()));
      // Roles to remove (in currentRoles but not in newRoles)
      const toRemove = body.currentRoles.filter((r: string) => !newSet.has(r.toLowerCase()));

      for (const role of toAdd) {
        const addRes = await aspnetFetchServer('/api/UserAccount/AddtoRole', token, {
          method: 'POST',
          body: JSON.stringify({ guid: body.id, role })
        });
        if (!addRes.ok) {
          const msg = await addRes.text().catch(() => 'unknown error');
          errors.push(`Gagal tambah role "${role}": ${msg}`);
        }
      }

      for (const role of toRemove) {
        const removeRes = await aspnetFetchServer('/api/UserAccount/RemoveUserFromRole', token, {
          method: 'POST',
          body: JSON.stringify({ guid: body.id, role })
        });
        if (!removeRes.ok) {
          const msg = await removeRes.text().catch(() => 'unknown error');
          errors.push(`Gagal hapus role "${role}": ${msg}`);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ success: true, message: "Profil diperbarui, namun ada error pada sinkronisasi role.", roleErrors: errors });
    }

    return NextResponse.json({ success: true, message: "User dan role berhasil diperbarui" });
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
