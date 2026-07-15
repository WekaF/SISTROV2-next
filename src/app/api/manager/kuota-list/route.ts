import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { resolveScopeCompanies } from "@/lib/manager-scope";

function isManager(session: any): boolean {
  const groups: string[] = (session?.user as any)?.menuGroups || [];
  const single = (session?.user as any)?.menuGroup as string | undefined;
  return !!session?.user && (groups.includes("manager") || single === "manager");
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isManager(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const userId = (session?.user as any)?.id as string;

    const scope = await resolveScopeCompanies(userId, token);
    if (!scope.companyCodes || scope.companyCodes.length === 0) {
      return NextResponse.json({ data: [], draw: "1", recordsTotal: 0, recordsFiltered: 0 });
    }

    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams({
      companies: scope.companyCodes.join(","),
      draw: searchParams.get("draw") || "1",
      start: searchParams.get("start") || "0",
      length: searchParams.get("length") || "25",
    });
    const search = searchParams.get("search[value]");
    if (search) qs.set("search[value]", search);

    const res = await aspnetFetchServer(`/api/KuotaLevel4/DataTableMulti?${qs.toString()}`, token);
    if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text().catch(() => res.statusText)}`);
    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
