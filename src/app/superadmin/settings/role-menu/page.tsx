"use client";
import React, { useState } from "react";
import { ShieldCheck, Loader2, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface RoleMenuGroupRow {
  RoleId: string;
  RoleName: string;
  MenuGroup: string;
  UserCount: number;
}

const MENU_GROUPS = [
  { value: "superadmin",       label: "SuperAdmin / TI" },
  { value: "admin",            label: "Admin" },
  { value: "candal",           label: "Candal (Kuota/Truk/Container)" },
  { value: "staffarea",        label: "Staff Area" },
  { value: "viewer",           label: "Viewer" },
  { value: "transport",        label: "Transport / Rekanan" },
  { value: "security",         label: "Security" },
  { value: "gudang",           label: "Gudang" },
  { value: "jembatan_timbang", label: "Jembatan Timbang" },
  { value: "pod",              label: "POD / AdminArmada" },
  { value: "pkd",              label: "PKD / Pelabuhan" },
  { value: "eksternal",        label: "Eksternal (akses minimal)" },
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

export default function RoleMenuPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["role-menu-groups"],
    queryFn: async () => {
      const res = await fetch("/api/admin/role-menu-groups");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<RoleMenuGroupRow[]>;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ roleId, menuGroup }: { roleId: string; menuGroup: string }) => {
      const res = await fetch("/api/admin/role-menu-groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, menuGroup }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      return data;
    },
    onSuccess: (_: any, vars: { roleId: string; menuGroup: string }) => {
      queryClient.invalidateQueries({ queryKey: ["role-menu-groups"] });
      setPendingChanges(prev => { const n = { ...prev }; delete n[vars.roleId]; return n; });
      addToast({ title: "Disimpan", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const handleChange = (roleId: string, menuGroup: string) => {
    setPendingChanges(prev => ({ ...prev, [roleId]: menuGroup }));
  };

  const handleSave = (roleId: string) => {
    const menuGroup = pendingChanges[roleId];
    if (menuGroup) saveMutation.mutate({ roleId, menuGroup });
  };

  const grouped = MENU_GROUPS.map(g => ({
    ...g,
    roles: rows.filter(r => (pendingChanges[r.RoleId] ?? r.MenuGroup) === g.value),
  })).filter(g => g.roles.length > 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Pengaturan Menu per Role</h1>
          <p className="text-sm text-muted-foreground">
            Atur tampilan menu sidebar berdasarkan role. Perubahan berlaku setelah user re-login.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Semua Role</CardTitle>
          <CardDescription>Pilih menu group untuk setiap role, lalu klik Simpan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-left py-2 px-3">User</th>
                  <th className="text-left py-2 px-3">Menu Group</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(row => {
                  const currentGroup = pendingChanges[row.RoleId] ?? row.MenuGroup;
                  const isDirty = !!pendingChanges[row.RoleId] && pendingChanges[row.RoleId] !== row.MenuGroup;
                  return (
                    <tr key={row.RoleId} className={isDirty ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
                      <td className="py-2 px-3 font-medium">{row.RoleName}</td>
                      <td className="py-2 px-3 text-muted-foreground">{row.UserCount}</td>
                      <td className="py-2 px-3">
                        <select
                          className="border rounded px-2 py-1 text-sm bg-background w-48"
                          value={currentGroup || ""}
                          onChange={e => handleChange(row.RoleId, e.target.value)}
                        >
                          <option value="">-- pilih --</option>
                          {MENU_GROUPS.map(g => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        {isDirty && (
                          <button
                            className="flex items-center gap-1 text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                            onClick={() => handleSave(row.RoleId)}
                            disabled={saveMutation.isPending}
                          >
                            {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Simpan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Preview Group</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {grouped.map(g => (
            <div key={g.value} className="border rounded-lg p-3 space-y-2">
              <div className={`text-xs font-semibold px-2 py-1 rounded-full inline-block ${GROUP_COLOR[g.value] || "bg-gray-100"}`}>
                {g.label}
              </div>
              <ul className="space-y-1">
                {g.roles.map(r => (
                  <li key={r.RoleId} className="text-xs flex justify-between">
                    <span>{r.RoleName}</span>
                    <span className="text-muted-foreground">{r.UserCount} users</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
