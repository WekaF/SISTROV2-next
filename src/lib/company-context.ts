import { cookies } from "next/headers";

export async function getActiveCompanyCode(_userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const activeCode = cookieStore.get("sistro_active_company")?.value;
  if (activeCode) return activeCode;
  return null;
}
