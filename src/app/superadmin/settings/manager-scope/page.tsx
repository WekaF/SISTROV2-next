"use client";
import React, { useState } from "react";
import { ShieldCheck, Search, Loader2, X, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface UserRow {
  id: string;
  username: string;
  fullname: string;
}

interface Wilayah {
  id: string;
  code: string;
  name: string;
}

interface Company {
  code: string;
  name: string;
}

interface VpRegion {
  id: number;
  name: string;
}

type Tier = "avp" | "vp" | "direksi";

interface ManagerScope {
  id: number;
  userId: string;
  tier: Tier;
  wilayahCode: string | null;
  vpRegionId: number | null;
  companyCode: string | null;
  vpRegion: { id: number; name: string } | null;
}

const TIER_LABELS: Record<Tier, string> = {
  avp: "AVP",
  vp: "VP",
  direksi: "Direksi",
};

export default function ManagerScopePage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const [tier, setTier] = useState<Tier | "">("");
  const [wilayahCode, setWilayahCode] = useState("");
  const [vpRegionId, setVpRegionId] = useState("");
  const [companyCode, setCompanyCode] = useState("");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<UserRow[]>;
    },
  });

  const { data: wilayahData = [] } = useQuery({
    queryKey: ["admin-regions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/regions");
      if (!res.ok) throw new Error("Failed to fetch regions");
      const json = await res.json();
      return json.data as Wilayah[];
    },
  });

  const { data: companyData = [] } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const res = await fetch("/api/admin/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      const json = await res.json();
      return json.data as Company[];
    },
  });

  const { data: vpRegionData = [] } = useQuery({
    queryKey: ["vp-regions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vp-regions");
      if (!res.ok) throw new Error("Failed to fetch VP regions");
      const json = await res.json();
      return json.data as VpRegion[];
    },
  });

  const { data: currentScope, isLoading: scopeLoading } = useQuery({
    queryKey: ["manager-scope", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;
      const res = await fetch(`/api/admin/manager-scope?userId=${encodeURIComponent(selectedUser.id)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch scope");
      const json = await res.json();
      return json.data as ManagerScope;
    },
    enabled: !!selectedUser,
  });

  const resetForm = () => {
    setTier("");
    setWilayahCode("");
    setVpRegionId("");
    setCompanyCode("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { userId: selectedUser!.id, tier };
      if (tier === "avp") body.wilayahCode = wilayahCode;
      if (tier === "vp") body.vpRegionId = Number(vpRegionId);
      if (tier === "direksi") body.companyCode = companyCode;

      const res = await fetch("/api/admin/manager-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan scope");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-scope", selectedUser?.id] });
      resetForm();
      addToast({ title: "Manager scope disimpan", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/manager-scope?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus scope");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-scope", selectedUser?.id] });
      addToast({ title: "Manager scope dihapus", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const users = usersData || [];
  const filteredUsers = searchTerm.length < 2
    ? []
    : users.filter((u) =>
        (u.fullname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || "").toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 20);

  const canSave =
    (tier === "avp" && !!wilayahCode) ||
    (tier === "vp" && !!vpRegionId) ||
    (tier === "direksi" && !!companyCode);

  const scopeValueLabel = (scope: ManagerScope) => {
    if (scope.tier === "avp") {
      const w = wilayahData.find((x) => x.code === scope.wilayahCode);
      return w ? `${w.name} (${w.code})` : scope.wilayahCode;
    }
    if (scope.tier === "vp") {
      return scope.vpRegion?.name ?? `Region #${scope.vpRegionId}`;
    }
    const c = companyData.find((x) => x.code === scope.companyCode);
    return c ? `${c.name} (${c.code})` : scope.companyCode;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Manager Scope</h1>
          <p className="text-sm text-muted-foreground">Kelola tier dan cakupan (AVP/VP/Direksi) untuk setiap user</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" /> Pilih User
            </CardTitle>
            <CardDescription>Ketik minimal 2 karakter untuk mencari</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Cari nama atau username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => { setSearchTerm(""); setSelectedUser(null); resetForm(); }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {usersLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat users...
              </div>
            )}

            {filteredUsers.length > 0 && (
              <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                      selectedUser?.id === u.id ? "bg-primary/10 font-medium" : ""
                    }`}
                    onClick={() => { setSelectedUser(u); resetForm(); }}
                  >
                    <div className="font-medium">{u.fullname || u.username}</div>
                    <div className="text-xs text-muted-foreground">{u.username}</div>
                  </button>
                ))}
              </div>
            )}

            {searchTerm.length >= 2 && filteredUsers.length === 0 && !usersLoading && (
              <p className="text-sm text-muted-foreground">Tidak ada user ditemukan</p>
            )}
          </CardContent>
        </Card>

        {/* Scope Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4" /> Manager Scope
              {selectedUser && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  — {selectedUser.fullname || selectedUser.username}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {selectedUser ? "Tier dan cakupan yang berlaku untuk user ini" : "Pilih user terlebih dahulu"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedUser && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Pilih user dari panel kiri
              </div>
            )}

            {selectedUser && scopeLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat scope...
              </div>
            )}

            {selectedUser && !scopeLoading && currentScope && (
              <div className="flex items-center justify-between px-3 py-2 border rounded-md">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{TIER_LABELS[currentScope.tier]}</Badge>
                  <span className="text-sm">{scopeValueLabel(currentScope)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(currentScope.id)}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            )}

            {selectedUser && !scopeLoading && !currentScope && (
              <div className="space-y-3">
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={tier}
                  onChange={(e) => {
                    setTier(e.target.value as Tier | "");
                    setWilayahCode("");
                    setVpRegionId("");
                    setCompanyCode("");
                  }}
                >
                  <option value="">-- Pilih Tier --</option>
                  <option value="avp">AVP</option>
                  <option value="vp">VP</option>
                  <option value="direksi">Direksi</option>
                </select>

                {tier === "avp" && (
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={wilayahCode}
                    onChange={(e) => setWilayahCode(e.target.value)}
                  >
                    <option value="">-- Pilih Wilayah --</option>
                    {wilayahData.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                )}

                {tier === "vp" && (
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={vpRegionId}
                    onChange={(e) => setVpRegionId(e.target.value)}
                  >
                    <option value="">-- Pilih VP Region --</option>
                    {vpRegionData.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                )}

                {tier === "direksi" && (
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                  >
                    <option value="">-- Pilih Company --</option>
                    {companyData.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                )}

                <Button
                  size="sm"
                  disabled={!canSave || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
