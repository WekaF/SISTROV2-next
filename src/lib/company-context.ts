import { cookies } from "next/headers";
import { query } from "./db";

export async function getActiveCompanyCode(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const activeCode = cookieStore.get("sistro_active_company")?.value;
  if (activeCode) return activeCode;

  try {
    const result = await query<{ companycode: string }>(
      `SELECT companycode FROM usercompanies WHERE userid=$1 ORDER BY isprimary DESC LIMIT 1`,
      [userId]
    );
    if (result.rows.length > 0) return result.rows[0].companycode;
  } catch (error) {
    console.error("getActiveCompanyCode Error:", error);
  }

  return null;
}
