import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const RESTRICTED_ROLES = ["ti", "superadmin"];

function isAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    ["superadmin", "admin", "ti"].includes(r.toLowerCase())
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyCode: string | null = (session?.user as any)?.companyCode ?? null;
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/UserAccount/ListUser', token);
    if (!res.ok) throw new Error("Failed to fetch users from API");

    const payload = await res.json();
    const data: any[] = payload.data || payload || [];

    const mapped = data
      .filter((u) => {
        if (!companyCode) return false;
        return (u.company_code || "") === companyCode;
      })
      .map((u) => ({
        id:       u.Id || u.id || u.userid,
        username: u.UserName || u.username,
        fullname: u.fullname,
        email:    u.email || null,
        roles:    Array.isArray(u.roles) ? u.roles : (u.role ? u.role.split(',').map((r: string) => r.trim()) : []),
        company:  u.company_code || "",
        isactive: u.isactive ?? true,
      }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const companyCode: string | null = (session?.user as any)?.companyCode ?? null;
    const token = (session?.user as any)?.aspnetToken as string;
    const body = await req.json();

    const requestedRoles: string[] = body.roles || [];
    const hasRestrictedRole = requestedRoles.some((r) =>
      RESTRICTED_ROLES.includes(r.toLowerCase())
    );
    if (hasRestrictedRole) {
      return NextResponse.json(
        { success: false, error: "Tidak boleh assign role superadmin/TI" },
        { status: 403 }
      );
    }

    const updateRes = await aspnetFetchServer('/api/UserAccount/UpdateUserProfile', token, {
      method: 'POST',
      body: JSON.stringify({
        UserId: body.id,
        FullName: body.fullName,
        Email: body.email,
        IsActive: body.isActive !== false,
        CompanyCode: companyCode,
      })
    });

    if (!updateRes.ok) {
      const errData = await updateRes.json().catch(() => ({}));
      throw new Error(errData?.message || "Update profile gagal");
    }

    const userRes = await aspnetFetchServer(`/api/UserAccount/GetUserDetail?userId=${body.id}`, token);
    if (!userRes.ok) throw new Error("Gagal fetch data user");
    const userData = await userRes.json();

    if (companyCode && (userData.company_code || "") !== companyCode) {
      return NextResponse.json(
        { success: false, error: "Tidak dapat mengubah user dari plant lain" },
        { status: 403 }
      );
    }

    const currentRoles: string[] = Array.isArray(userData.roles)
      ? userData.roles
      : (userData.role ? userData.role.split(',').map((r: string) => r.trim()) : []);

    const roleErrors: string[] = [];

    const toRemove = currentRoles.filter((r) => !requestedRoles.includes(r));
    for (const role of toRemove) {
      const res = await aspnetFetchServer('/api/UserAccount/RemoveUserFromRole', token, {
        method: 'POST',
        body: JSON.stringify({ UserId: body.id, RoleName: role })
      });
      if (!res.ok) roleErrors.push(`Gagal hapus role ${role}`);
    }

    const toAdd = requestedRoles.filter((r) => !currentRoles.includes(r));
    for (const role of toAdd) {
      const res = await aspnetFetchServer('/api/UserAccount/AddtoRole', token, {
        method: 'POST',
        body: JSON.stringify({ UserId: body.id, RoleName: role })
      });
      if (!res.ok) roleErrors.push(`Gagal tambah role ${role}`);
    }

    return NextResponse.json({ success: true, roleErrors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
