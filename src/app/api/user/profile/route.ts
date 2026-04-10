import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getDbConnection } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pool = await getDbConnection();
    const result = await pool.request()
      .input("id", sql.UniqueIdentifier, (session.user as any).id)
      .query(`
        SELECT Id, UserName, Email, FullName, Department, Bagian, AvatarUrl, NIK, SapVendorCode
        FROM Users
        WHERE Id = @id
      `);

    const user = result.recordset[0];
    if (!user) {
      console.warn("User not found for session ID:", (session.user as any).id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Returning profile data for user:", user.UserName);
    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { fullName, email, department, bagian, avatarUrl } = body;

    const pool = await getDbConnection();
    await pool.request()
      .input("id", sql.UniqueIdentifier, (session.user as any).id)
      .input("fullName", sql.VarChar, fullName)
      .input("email", sql.NVarChar, email)
      .input("department", sql.VarChar, department)
      .input("bagian", sql.VarChar, bagian)
      .input("avatarUrl", sql.NVarChar, avatarUrl)
      .query(`
        UPDATE Users
        SET 
          FullName = @fullName,
          Email = @email,
          Department = @department,
          Bagian = @bagian,
          AvatarUrl = @avatarUrl,
          UpdatedAt = GETUTCDATE()
        WHERE Id = @id
      `);

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
