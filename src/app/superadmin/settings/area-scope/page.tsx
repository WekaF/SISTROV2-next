"use client";
import React, { useState } from "react";
import {
  MapPin, Search, Plus, Trash2, Loader2, X, Users, ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface UserRow {
  id: string;
  username: string;
  fullname: string;
  roles: string[];
}

interface AreaScope {
  Id: string;
  UserId: string;
  Wilayah: string | null;
  Bagian: string;
}

interface BagianOption {
  abbrev: string;
  keterangan: string;
  scope: string;
}

export default function AreaScopePage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [selectedBagian, setSelectedBagian] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AreaScope | null>(null);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<UserRow[]>;
    },
  });

  const { data: bagianOptions = [] } = useQuery({
    queryKey: ["bagian-options"],
    queryFn: async () => {
      const res = await fetch("/api/admin/area-scope?type=bagian-options");
      if (!res.ok) throw new Error("Failed to fetch bagian options");
      return res.json() as Promise<BagianOption[]>;
    },
  });

  const { data: scopes = [], isLoading: scopesLoading } = useQuery({
    queryKey: ["area-scopes", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await fetch(`/api/admin/area-scope?userId=${encodeURIComponent(selectedUser.id)}`);
      if (!res.ok) throw new Error("Failed to fetch scopes");
      return res.json() as Promise<AreaScope[]>;
    },
    enabled: !!selectedUser,
  });

  const addMutation = useMutation({
    mutationFn: async (bagian: string) => {
      const res = await fetch("/api/admin/area-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser!.id, bagian }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add scope");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area-scopes", selectedUser?.id] });
      setSelectedBagian("");
      addToast({ title: "Scope ditambahkan", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/area-scope?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete scope");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["area-scopes", selectedUser?.id] });
      setDeleteTarget(null);
      addToast({ title: "Scope dihapus", variant: "success" });
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

  const scopesAlreadyHave = new Set(scopes.map((s) => s.Bagian));
  const availableToAdd = bagianOptions.filter((b) => !scopesAlreadyHave.has(b.abbrev));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MapPin className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Mapping Area Scope</h1>
          <p className="text-sm text-muted-foreground">Kelola data area (Bagian) yang dapat diakses oleh setiap user</p>
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
                  onClick={() => { setSearchTerm(""); setSelectedUser(null); }}
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
                    onClick={() => setSelectedUser(u)}
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
              <ShieldCheck className="w-4 h-4" /> Area Scope
              {selectedUser && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  — {selectedUser.fullname || selectedUser.username}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {selectedUser ? "Daftar bagian yang dapat diakses user ini" : "Pilih user terlebih dahulu"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedUser && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Pilih user dari panel kiri
              </div>
            )}

            {selectedUser && (
              <>
                {/* Add new scope */}
                <div className="flex gap-2">
                  <select
                    className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
                    value={selectedBagian}
                    onChange={(e) => setSelectedBagian(e.target.value)}
                  >
                    <option value="">-- Pilih Bagian --</option>
                    {availableToAdd.map((b) => (
                      <option key={b.abbrev} value={b.abbrev}>
                        {b.abbrev} — {b.keterangan}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!selectedBagian || addMutation.isPending}
                    onClick={() => selectedBagian && addMutation.mutate(selectedBagian)}
                  >
                    {addMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Scope list */}
                {scopesLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Memuat scopes...
                  </div>
                )}

                {!scopesLoading && scopes.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Belum ada area scope untuk user ini
                  </div>
                )}

                {!scopesLoading && scopes.length > 0 && (
                  <div className="space-y-2">
                    {scopes.map((scope) => (
                      <div
                        key={scope.Id}
                        className="flex items-center justify-between px-3 py-2 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{scope.Bagian}</Badge>
                          {scope.Wilayah && (
                            <span className="text-xs text-muted-foreground">Wilayah: {scope.Wilayah}</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(scope)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Hapus Area Scope"
        description={`Hapus akses bagian "${deleteTarget?.Bagian}" untuk user ini?`}
        confirmText="Hapus"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.Id); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
