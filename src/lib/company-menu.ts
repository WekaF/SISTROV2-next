import { prismaLog } from "@/lib/prisma";

function parseMenuItems(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export interface CompanyMenuResolution {
  menuGroup: string;
  menuItems: string[] | null;
  source: "company-override" | "global-template";
}

/**
 * Resolve menu template for a given companyCode.
 * Priority: company-specific override → global template (companyCode = null).
 * Returns null if no template configured.
 */
export async function resolveCompanyMenuTemplate(
  companyCode: string | null | undefined
): Promise<CompanyMenuResolution | null> {
  // 1. Try company-specific override
  if (companyCode) {
    const specific = await prismaLog.companyMenuTemplate.findUnique({
      where: { companyCode },
    });
    if (specific) {
      return {
        menuGroup: specific.menuGroup,
        menuItems: parseMenuItems(specific.menuItems),
        source: "company-override",
      };
    }
  }

  // 2. Fall back to global template (companyCode IS NULL)
  const global = await prismaLog.companyMenuTemplate.findUnique({
    where: { companyCode: null },
  });
  if (global) {
    return {
      menuGroup: global.menuGroup,
      menuItems: parseMenuItems(global.menuItems),
      source: "global-template",
    };
  }

  return null;
}
