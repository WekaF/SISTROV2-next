import { prismaLog } from "@/lib/prisma";

export type ManagerScopeResult =
  | { tier: "avp"; wilayahCode: string }
  | { tier: "vp"; vpRegionId: number; wilayahCodes: string[] }
  | { tier: "direksi"; companyCode: string }
  | { tier: "none" };

/**
 * Resolve a user's manager scope tier. For tier "vp", also resolves
 * the full list of wilayah codes currently assigned to that region,
 * since VP grouping is superadmin-editable and can change at any time.
 */
export async function getManagerScope(userId: string): Promise<ManagerScopeResult> {
  const scope = await prismaLog.managerScope.findUnique({ where: { userId } });
  if (!scope) return { tier: "none" };

  if (scope.tier === "avp" && scope.wilayahCode) {
    return { tier: "avp", wilayahCode: scope.wilayahCode };
  }

  if (scope.tier === "vp" && scope.vpRegionId) {
    const wilayahs = await prismaLog.vpRegionWilayah.findMany({
      where: { vpRegionId: scope.vpRegionId },
      select: { wilayahCode: true },
    });
    return { tier: "vp", vpRegionId: scope.vpRegionId, wilayahCodes: wilayahs.map((w) => w.wilayahCode) };
  }

  if (scope.tier === "direksi" && scope.companyCode) {
    return { tier: "direksi", companyCode: scope.companyCode };
  }

  return { tier: "none" };
}
