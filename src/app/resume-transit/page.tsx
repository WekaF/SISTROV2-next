import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { normalizeRole } from "@/lib/role-utils";
import ResumeTransitClient from "./ResumeTransitClient";

export default async function ResumeTransitPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const primaryRole = (session?.user as any)?.role as string | undefined;
  const allRoles: string[] = ((session?.user as any)?.roles as string[] | undefined) ?? [];

  const normalizedPrimary = normalizeRole(primaryRole);
  const normalizedRoles = allRoles.map(normalizeRole);

  const hasAccess = normalizedPrimary === "superadmin" || normalizedPrimary === "viewer" || 
                    normalizedRoles.includes("superadmin") || normalizedRoles.includes("viewer");

  if (!hasAccess) {
    redirect("/");
  }

  return <ResumeTransitClient />;
}
