import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await query(`
      SELECT id, username, email, fullname, department, bagian, sapvendorcode
      FROM users WHERE id=$1
    `, [(session.user as any).id]);
    const user = result.rows[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { fullName, email, department, bagian } = await req.json();
    await query(`UPDATE users SET fullname=$1, email=$2, department=$3, bagian=$4 WHERE id=$5`,
      [fullName, email, department, bagian, (session.user as any).id]);
    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
