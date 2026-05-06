// Maps raw ASP.NET role strings (lowercased) → normalized sidebar role
const ROLE_MAP: Record<string, string> = {
  ti:                     "superadmin",
  superadmin:             "superadmin",
  admin:                  "admin",
  adminsumbu:             "admin",
  candalkuota:            "candal",
  candaltruk:             "candal",
  candaltruck:            "candal",
  candalcontainer:        "candal",
  candalgudangposto:      "candal",
  candalgudang:           "gudang",
  admingudang:            "gudang",
  admingudangcandalgudang: "gudang",
  candaldept:             "candal",
  adminarmada:            "pod",
  security:               "security",
  securitylini3:          "security",
  timbangan:              "jembatan_timbang",
  gudang:                 "gudang",
  gudanglini3:            "gudang",
  chekerlini3:            "gudang",
  checkerlini3:           "gudang",
  staffarea:              "staffarea",
  staffarewilayah1:       "staffarea",
  staffarewilayah2:       "staffarea",
  staffarealayah1:        "staffarea",
  staffarealayah2:        "staffarea",
  staffareajatim:         "staffarea",
  viewer:                 "viewer",
  pkg:                    "viewer",
  viewerposto:            "viewer",
  viewerarmada:           "viewer",
  transport:              "transport",
  transportsuraljalan:    "transport",
  rekanan:                "rekanan",
  pelabuhanapp:           "pkd",
  pelabuhanuppp:          "pkd",
  terminal1:              "pkd",
  terminal2:              "pkd",
};

export function normalizeRole(rawRole: string | undefined | null): string {
  if (!rawRole) return "eksternal";
  const key = rawRole.toLowerCase().replace(/\s+/g, "");
  return ROLE_MAP[key] ?? "eksternal";
}

// Returns true for roles that should have full gudang management access
export function hasGudangAccess(
  role: string | undefined | null,
  roles: string[] = []
): boolean {
  const primary = normalizeRole(role);
  if (["gudang", "admin", "superadmin", "candal"].includes(primary)) return true;
  return roles.some((r) => ["gudang", "admin", "superadmin", "candal"].includes(normalizeRole(r)));
}

// Returns true for read-only monitoring roles (security, timbangan)
export function isReadOnlyRole(
  role: string | undefined | null,
  roles: string[] = []
): boolean {
  const primary = normalizeRole(role);
  if (["security", "jembatan_timbang"].includes(primary)) return true;
  return roles.some((r) => ["security", "jembatan_timbang"].includes(normalizeRole(r)));
}
