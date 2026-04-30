import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const dbRole = (session?.user as any)?.role || "viewer";

  return <DashboardClient session={session} dbRole={dbRole} />;
}
