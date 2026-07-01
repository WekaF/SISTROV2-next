// src/app/api/dashboard/loading-bays/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const ALLOWED = new Set([
  "superadmin", "ti", "admin", "pod", "viewer", "adminarmada", "adminsumbu"
]);

function isAuthorized(session: any): boolean {
  const roles: string[] = (session?.user as any)?.roles ?? [];
  return !!session?.user && roles.some((r) => ALLOWED.has(r.toLowerCase()));
}

const BASE_COLUMNS = [
  { data: "bookingno",       name: "bookingno",    searchable: false, orderable: true  },
  { data: "nopol",           name: "nopol",        searchable: false, orderable: false },
  { data: "driver",          name: "driver",       searchable: false, orderable: false },
  { data: "produkString",    name: "idproduk",     searchable: false, orderable: false },
  { data: "transportString", name: "idtransport",  searchable: false, orderable: false },
  { data: "qty",             name: "qty",          searchable: false, orderable: false },
  { data: "posto",           name: "posto",        searchable: false, orderable: false },
  { data: "tiketno",         name: "tiketno",      searchable: false, orderable: false },
];

async function fetchTicketsByPosition(
  token: string,
  companyCode: string | null,
  position: string,
  length: number
): Promise<any[]> {
  try {
    const body: any = {
      draw: 1,
      start: 0,
      length,
      search: { value: "" },
      position,
      order: [{ column: 0, dir: "desc" }],
      columns: BASE_COLUMNS,
    };
    if (companyCode) body.companyCode = companyCode;

    const res = await aspnetFetchServer("/api/Tiket/DataTableFilterLegacy", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const companyCode = searchParams.get("companyCode");

  const [bays, queue] = await Promise.all([
    fetchTicketsByPosition(token, companyCode, "03", 20),
    fetchTicketsByPosition(token, companyCode, "02", 10),
  ]);

  return NextResponse.json({ bays, queue });
}
