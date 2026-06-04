"use client";
import React, { useState } from "react";
import { Building2, Globe, Loader2, Save, Trash2, Pencil } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CompanyMenuTemplateRow {
  id: number;
  companyCode: string | null;
  menuGroup: string;
  menuItems: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CompanyItem {
  code: string;
  name: string;
}

const MENU_GROUPS = [
  { value: "superadmin",       label: "SuperAdmin / TI" },
  { value: "admin",            label: "Admin" },
  { value: "candal",           label: "Candal" },
  { value: "staffarea",        label: "Staff Area" },
  { value: "viewer",           label: "Viewer" },
  { value: "transport",        label: "Transport / Rekanan" },
  { value: "security",         label: "Security" },
  { value: "gudang",           label: "Gudang" },
  { value: "jembatan_timbang", label: "Jembatan Timbang" },
  { value: "pod",              label: "POD / AdminArmada" },
  { value: "pkd",              label: "PKD / Pelabuhan" },
  { value: "eksternal",        label: "Eksternal" },
];

const GROUP_COLOR: Record<string, string> = {
  superadmin:       "bg-red-100 text-red-800",
  admin:            "bg-orange-100 text-orange-800",
  candal:           "bg-yellow-100 text-yellow-800",
  staffarea:        "bg-blue-100 text-blue-800",
  viewer:           "bg-purple-100 text-purple-800",
  transport:        "bg-green-100 text-green-800",
  security:         "bg-pink-100 text-pink-800",
  gudang:           "bg-teal-100 text-teal-800",
  jembatan_timbang: "bg-cyan-100 text-cyan-800",
  pod:              "bg-indigo-100 text-indigo-800",
  pkd:              "bg-lime-100 text-lime-800",
  eksternal:        "bg-gray-100 text-gray-600",
};

function MenuGroupBadge({ group }: { group: string }) {
  const meta = MENU_GROUPS.find(g => g.value === group);
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${GROUP_COLOR[group] || "bg-gray-100 text-gray-600"}`}>
      {meta?.label ?? group}
    </span>
  );
}

const GLOBAL_KEY = "__global__";

export default function CompanyMenuPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // drafts: key is companyCode or "__global__", value is menuGroup string
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // editing: set of keys currently in edit mode
  const [editing, setEditing] = useState<Set<string>>(new Set());

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<CompanyMenuTemplateRow[]>({
    queryKey: ["company-menu-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/company-menu-template");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const json = await res.json();
      return json.data as CompanyMenuTemplateRow[];
    },
  });

  const { data: companies = [], isLoading: loadingCompanies } = useQuery<CompanyItem[]>({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const json = await res.json();
      return json.data as CompanyItem[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ companyCode, menuGroup }: { companyCode: string | null; menuGroup: string }) => {
      const res = await fetch("/api/admin/company-menu-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, menuGroup }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: (_: unknown, vars: { companyCode: string | null; menuGroup: string }) => {
      queryClient.invalidateQueries({ queryKey: ["company-menu-templates"] });
      const key = vars.companyCode ?? GLOBAL_KEY;
      setEditing(prev => { const n = new Set(prev); n.delete(key); return n; });
      setDrafts(prev => { const n = { ...prev }; delete n[key]; return n; });
      addToast({ title: "Disimpan", variant: "success" });
    },
    onError: (err: Error) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (companyCode: string | null) => {
      const url =
        companyCode === null
          ? "/api/admin/company-menu-template?global=true"
          : `/api/admin/company-menu-template?companyCode=${encodeURIComponent(companyCode)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus");
      }
      return res.json();
    },
    onSuccess: (_: unknown, companyCode: string | null) => {
      queryClient.invalidateQueries({ queryKey: ["company-menu-templates"] });
      const key = companyCode ?? GLOBAL_KEY;
      setEditing(prev => { const n = new Set(prev); n.delete(key); return n; });
      setDrafts(prev => { const n = { ...prev }; delete n[key]; return n; });
      addToast({ title: "Dihapus", variant: "success" });
    },
    onError: (err: Error) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const globalTemplate = templates.find(t => t.companyCode === null);
  const overrideMap = new Map<string, CompanyMenuTemplateRow>(
    templates.filter(t => t.companyCode !== null).map(t => [t.companyCode!, t])
  );

  const isLoading = loadingTemplates || loadingCompanies;
  const isMutating = saveMutation.isPending || deleteMutation.isPending;

  function startEdit(key: string, currentGroup: string) {
    setDrafts(prev => ({ ...prev, [key]: currentGroup }));
    setEditing(prev => new Set(prev).add(key));
  }

  function cancelEdit(key: string) {
    setEditing(prev => { const n = new Set(prev); n.delete(key); return n; });
    setDrafts(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  function handleSave(key: string) {
    const menuGroup = drafts[key];
    if (!menuGroup) return;
    const companyCode = key === GLOBAL_KEY ? null : key;
    saveMutation.mutate({ companyCode, menuGroup });
  }

  function handleDelete(companyCode: string | null) {
    deleteMutation.mutate(companyCode);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Pengaturan Menu per Perusahaan</h1>
          <p className="text-sm text-muted-foreground">
            Atur menu group global (default semua perusahaan) dan override per perusahaan.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
        </div>
      )}

      {/* Section 1: Global Template */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Global Template</CardTitle>
          </div>
          <CardDescription>
            Berlaku untuk semua perusahaan yang tidak memiliki override khusus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing.has(GLOBAL_KEY) ? (
            <div className="flex items-center gap-3 flex-wrap">
              <select
                className="border rounded px-2 py-1 text-sm bg-background w-52"
                value={drafts[GLOBAL_KEY] ?? ""}
                onChange={e => setDrafts(prev => ({ ...prev, [GLOBAL_KEY]: e.target.value }))}
              >
                <option value="">-- pilih menu group --</option>
                {MENU_GROUPS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>

              <button
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                onClick={() => handleSave(GLOBAL_KEY)}
                disabled={isMutating || !drafts[GLOBAL_KEY]}
              >
                {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Simpan
              </button>

              <button
                className="text-xs px-3 py-1.5 border rounded hover:bg-muted disabled:opacity-50"
                onClick={() => cancelEdit(GLOBAL_KEY)}
                disabled={isMutating}
              >
                Batal
              </button>

              {globalTemplate && (
                <button
                  className="flex items-center gap-1 text-xs px-3 py-1.5 text-destructive border border-destructive/40 rounded hover:bg-destructive/10 disabled:opacity-50"
                  onClick={() => handleDelete(null)}
                  disabled={isMutating}
                >
                  {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Hapus Global Template
                </button>
              )}
            </div>
          ) : globalTemplate ? (
            <div className="flex items-center gap-4">
              <MenuGroupBadge group={globalTemplate.menuGroup} />
              <button
                className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded hover:bg-muted"
                onClick={() => startEdit(GLOBAL_KEY, globalTemplate.menuGroup)}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">Belum ada global template. Perusahaan akan menggunakan role default.</p>
              <button
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                onClick={() => startEdit(GLOBAL_KEY, "")}
              >
                <Globe className="w-3 h-3" />
                Set Global Template
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Override per Perusahaan */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Override per Perusahaan</CardTitle>
          </div>
          <CardDescription>
            Tentukan menu group khusus untuk perusahaan tertentu, mengesampingkan global template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 px-3">Perusahaan</th>
                  <th className="text-left py-2 px-3">Kode</th>
                  <th className="text-left py-2 px-3">Menu Group</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {companies.map(company => {
                  const override = overrideMap.get(company.code);
                  const isEditingRow = editing.has(company.code);

                  // Determine effective group and status badge
                  let effectiveGroup: string | null = null;
                  let statusBadge: React.ReactNode;

                  if (override) {
                    effectiveGroup = override.menuGroup;
                    statusBadge = (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                        Custom override
                      </span>
                    );
                  } else if (globalTemplate) {
                    effectiveGroup = globalTemplate.menuGroup;
                    statusBadge = (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Inherit global
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Role default
                      </span>
                    );
                  }

                  return (
                    <tr key={company.code} className={isEditingRow ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
                      <td className="py-2 px-3 font-medium">{company.name}</td>
                      <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{company.code}</td>

                      {/* Menu Group column */}
                      <td className="py-2 px-3">
                        {isEditingRow ? (
                          <select
                            className="border rounded px-2 py-1 text-sm bg-background w-48"
                            value={drafts[company.code] ?? ""}
                            onChange={e =>
                              setDrafts(prev => ({ ...prev, [company.code]: e.target.value }))
                            }
                          >
                            <option value="">-- pilih menu group --</option>
                            {MENU_GROUPS.map(g => (
                              <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                          </select>
                        ) : effectiveGroup ? (
                          <MenuGroupBadge group={effectiveGroup} />
                        ) : (
                          <span className="text-muted-foreground text-xs italic">—</span>
                        )}
                      </td>

                      {/* Status column */}
                      <td className="py-2 px-3">{statusBadge}</td>

                      {/* Actions column */}
                      <td className="py-2 px-3">
                        {isEditingRow ? (
                          <div className="flex items-center gap-2">
                            <button
                              className="flex items-center gap-1 text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                              onClick={() => handleSave(company.code)}
                              disabled={isMutating || !drafts[company.code]}
                            >
                              {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              Simpan
                            </button>
                            <button
                              className="text-xs px-2 py-1 border rounded hover:bg-muted disabled:opacity-50"
                              onClick={() => cancelEdit(company.code)}
                              disabled={isMutating}
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              className="flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-muted"
                              onClick={() => startEdit(company.code, override?.menuGroup ?? "")}
                            >
                              <Pencil className="w-3 h-3" />
                              {override ? "Edit" : "Set Override"}
                            </button>
                            {override && (
                              <button
                                className="flex items-center gap-1 text-xs px-2 py-1 text-destructive border border-destructive/40 rounded hover:bg-destructive/10 disabled:opacity-50"
                                onClick={() => handleDelete(company.code)}
                                disabled={isMutating}
                                title="Hapus override"
                              >
                                {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!isLoading && companies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground text-sm">
                      Tidak ada data perusahaan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
