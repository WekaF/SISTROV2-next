import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { normalizeRole } from "@/lib/role-utils";

export default async function TransitRedirectPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const username = session?.user?.username;
  const primaryRole = (session?.user as any)?.role as string | undefined;
  const allRoles: string[] = ((session?.user as any)?.roles as string[] | undefined) ?? [];

  const normalizedPrimary = normalizeRole(primaryRole);
  const normalizedRoles = allRoles.map(normalizeRole);

  const isPiAdmin = username?.toLowerCase() === "pi_admin";
  const hasAccess = isPiAdmin ||
                    normalizedPrimary === "superadmin" || normalizedPrimary === "pkd" || normalizedPrimary === "viewer" ||
                    normalizedRoles.includes("superadmin") || normalizedRoles.includes("pkd") || normalizedRoles.includes("viewer");

  if (hasAccess) {
    redirect("/resume-transit");
  } else {
    redirect("/");
  }
}
