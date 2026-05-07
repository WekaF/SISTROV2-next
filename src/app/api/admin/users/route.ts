import { NextResponse } from "next/server";
import { query, getPool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const userRoles = (session.user as any).roles || [];
    const isAdmin = userRoles.some((r: string) => ["superadmin", "admin", "ti"].includes(r.toLowerCase()));
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await query(`
      SELECT u.id, u.username, u.email, u.fullname, u.isactive, u.sapvendorcode,
        COALESCE(ARRAY_AGG(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') as roles,
        COALESCE(ARRAY_AGG(DISTINCT c.company_code) FILTER (WHERE c.company_code IS NOT NULL), '{}') as companies
      FROM users u
      LEFT JOIN userroles ur ON ur.userid = u.id
      LEFT JOIN roles r ON r.id = ur.roleid
      LEFT JOIN usercompanies uc ON uc.userid = u.id
      LEFT JOIN company c ON c.company_code = uc.companycode
      GROUP BY u.id ORDER BY u.fullname ASC
    `);
    return NextResponse.json(result.rows.map(u => ({ ...u, status: u.isactive ? 'Active' : 'Inactive' })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const client = await getPool().connect();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRoles = (session.user as any).roles || [];
    const isSuperAdmin = userRoles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, fullName, email, isActive, roles, companyIds } = await req.json();
    if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    
    await client.query("BEGIN");
    await client.query(`UPDATE users SET fullname=$1, email=$2, isactive=$3 WHERE id=$4`, [fullName, email, isActive, id]);
    
    if (roles && Array.isArray(roles)) {
      await client.query(`DELETE FROM userroles WHERE userid=$1`, [id]);
      for (const roleCode of roles) {
        await client.query(`INSERT INTO userroles (userid, roleid) SELECT $1, id FROM roles WHERE code=$2`, [id, roleCode]);
      }
    }
    
    if (companyIds && Array.isArray(companyIds)) {
      await client.query(`DELETE FROM usercompanies WHERE userid=$1`, [id]);
      for (const companyId of companyIds) {
        await client.query(`INSERT INTO usercompanies (userid, companycode, isprimary) SELECT $1, company_code, false FROM company WHERE id=$2`, [id, companyId]);
      }
    }
    
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRoles = (session.user as any).roles || [];
    const isSuperAdmin = userRoles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));

    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    
    await query(`DELETE FROM users WHERE id=$1`, [id]);
    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
