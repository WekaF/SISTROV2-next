import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

function isAuthorized(session: any): boolean {
  const roles: string[] = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r) =>
    ["superadmin", "ti"].includes(r.toLowerCase())
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prismaLog.companyMenuTemplate.findMany({
    orderBy: [{ companyCode: "asc" }],
  });

  return NextResponse.json({ success: true, data: templates });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { companyCode, menuGroup, menuItems } = body as {
    companyCode: string | null;
    menuGroup: string;
    menuItems?: string[] | null;
  };

  if (!menuGroup?.trim()) {
    return NextResponse.json({ error: "menuGroup required" }, { status: 400 });
  }

  const username = (session?.user as any)?.username ?? "unknown";

  const existing = await prismaLog.companyMenuTemplate.findUnique({
    where: { companyCode: companyCode ?? null },
  });

  const menuItemsJson = menuItems && menuItems.length > 0
    ? JSON.stringify(menuItems)
    : null;

  if (existing) {
    const updated = await prismaLog.companyMenuTemplate.update({
      where: { companyCode: companyCode ?? null },
      data: { menuGroup, menuItems: menuItemsJson, updatedBy: username },
    });
    return NextResponse.json({ success: true, data: updated });
  } else {
    const created = await prismaLog.companyMenuTemplate.create({
      data: {
        companyCode: companyCode ?? null,
        menuGroup,
        menuItems: menuItemsJson,
        createdBy: username,
      },
    });
    return NextResponse.json({ success: true, data: created });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyCode = searchParams.has("companyCode")
    ? searchParams.get("companyCode")
    : null;

  const existing = await prismaLog.companyMenuTemplate.findUnique({
    where: { companyCode },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prismaLog.companyMenuTemplate.delete({
    where: { companyCode },
  });

  return NextResponse.json({ success: true });
}
