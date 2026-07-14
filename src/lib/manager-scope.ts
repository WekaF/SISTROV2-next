import { aspnetFetchServer } from "@/lib/api-client";

export type ManagerScopeResult =
  | { tier: "avp"; wilayahCode: string }
  | { tier: "vp"; vpRegionId: string; wilayahCodes: string[] }
  | { tier: "direksi"; companyCode: string }
  | { tier: "none" };

/**
 * Resolve a user's manager scope tier. For tier "vp", also resolves
 * the full list of wilayah codes currently assigned to that region,
 * since VP grouping is superadmin-editable and can change at any time.
 *
 * Backed by the ASP.NET ManagerScope/VpRegion controllers (SISTROAWESOME),
 * so a valid backend bearer token is required — pass `session.user.aspnetToken`.
 */
export async function getManagerScope(userId: string, token: string): Promise<ManagerScopeResult> {
  const scopeRes = await aspnetFetchServer(`/api/ManagerScope/Get?userId=${encodeURIComponent(userId)}`, token);
  if (scopeRes.status === 404) return { tier: "none" };
  if (!scopeRes.ok) throw new Error(`Backend ${scopeRes.status}: ${await scopeRes.text().catch(() => scopeRes.statusText)}`);

  const scope = await scopeRes.json();

  if (scope.Tier === "avp" && scope.WilayahCode) {
    return { tier: "avp", wilayahCode: scope.WilayahCode };
  }

  if (scope.Tier === "vp" && scope.VpRegionId) {
    const regionsRes = await aspnetFetchServer("/api/VpRegion/List", token);
    if (!regionsRes.ok) throw new Error(`Backend ${regionsRes.status}: ${await regionsRes.text().catch(() => regionsRes.statusText)}`);
    const regions: any[] = await regionsRes.json();
    const region = regions.find((r) => r.Id === scope.VpRegionId);
    return { tier: "vp", vpRegionId: scope.VpRegionId, wilayahCodes: region?.WilayahCodes || [] };
  }

  if (scope.Tier === "direksi" && scope.CompanyCode) {
    return { tier: "direksi", companyCode: scope.CompanyCode };
  }

  return { tier: "none" };
}
