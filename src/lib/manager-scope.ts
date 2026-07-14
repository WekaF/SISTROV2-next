import { aspnetFetchServer } from "@/lib/api-client";

export type ManagerScopeResult =
  | { tier: "avp"; wilayahCode: string }
  | { tier: "vp"; vpRegionId: string; vpRegionName: string; wilayahCodes: string[] }
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
    return {
      tier: "vp",
      vpRegionId: scope.VpRegionId,
      vpRegionName: region?.Name ?? scope.VpRegionId,
      wilayahCodes: region?.WilayahCodes || [],
    };
  }

  if (scope.Tier === "direksi" && scope.CompanyCode) {
    return { tier: "direksi", companyCode: scope.CompanyCode };
  }

  return { tier: "none" };
}

export interface ScopeCompanies {
  tier: "avp" | "vp" | "direksi" | "none";
  /** null = no restriction (tier "none"); otherwise the exact set of company
   * codes to filter dashboard data to. An empty (non-null) array means
   * "restricted to nothing" — this must never be treated as "no filter". */
  companyCodes: string[] | null;
  /** Human-readable label for a scope badge, e.g. "SUMBAGUT" or "PKG". */
  label: string | null;
}

/**
 * Resolve a user's manager scope into the exact set of company codes their
 * dashboard should be filtered to. Never throws — on any failure it fails
 * closed (empty company list for a known-scoped user, "no scope" for a user
 * whose scope couldn't even be determined), so an error can never widen
 * access to unfiltered/global data.
 */
export async function resolveScopeCompanies(userId: string, token: string): Promise<ScopeCompanies> {
  let scope: ManagerScopeResult;
  try {
    scope = await getManagerScope(userId, token);
  } catch (err) {
    console.error("[dashboard-scope] getManagerScope failed, treating as no scope", err);
    return { tier: "none", companyCodes: null, label: null };
  }

  if (scope.tier === "none") {
    return { tier: "none", companyCodes: null, label: null };
  }

  if (scope.tier === "direksi") {
    return { tier: "direksi", companyCodes: [scope.companyCode], label: scope.companyCode };
  }

  const groups = scope.tier === "avp" ? scope.wilayahCode : scope.wilayahCodes.join(",");
  const label = scope.tier === "avp" ? scope.wilayahCode : scope.vpRegionName;

  try {
    const res = await aspnetFetchServer(`/api/Company/CodesByGroups?groups=${encodeURIComponent(groups)}`, token);
    if (!res.ok) throw new Error(`Backend ${res.status}: ${await res.text().catch(() => res.statusText)}`);
    const codes: string[] = await res.json();
    return { tier: scope.tier, companyCodes: codes, label };
  } catch (err) {
    console.error("[dashboard-scope] CodesByGroups failed, failing closed to empty scope", err);
    return { tier: scope.tier, companyCodes: [], label };
  }
}
