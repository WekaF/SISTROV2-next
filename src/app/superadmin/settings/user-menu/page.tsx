"use client";
import React, { useState } from "react";
import { UserCog, Search, X, Loader2, ShieldCheck, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const MENU_GROUP_OPTIONS = [
  { value: "", label: "— Role default (otomatis) —" },
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Admin" },
  { value: "candal", label: "Candal" },
  { value: "staffarea", label: "Staff Area" },
  { value: "viewer", label: "Viewer" },
  { value: "manager", label: "Manager / Pimpinan" },
  { value: "transport", label: "Transport" },
  { value: "rekanan", label: "Rekanan" },
  { value: "security", label: "Security" },
  { value: "gudang", label: "Gudang" },
  { value: "jembatan_timbang", label: "Jembatan Timbang" },
  { value: "pod", label: "POD / Admin Armada" },
  { value: "pkd", label: "PKD / Pelabuhan" },
  { value: "eksternal", label: "Eksternal" },
];

interface UserMenuGroupRow {
  UserId: string;
  Username: string;
  Fullname: string;
  MenuGroup: string | null;
  Roles: string[];
}

export default function UserMenuGroupPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((window as any).__menuSearchTimer);
    (window as any).__menuSearchTimer = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["user-menu-group", debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return [];
      const res = await fetch(`/api/admin/user-menu-group?search=${encodeURIComponent(debouncedSearch)}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<UserMenuGroupRow[]>;
    },
    enabled: debouncedSearch.length >= 2,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ userId, menuGroup }: { userId: string; menuGroup: string }) => {
      const res = await fetch("/api/admin/user-menu-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, menuGroup }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan");
      }
    },
    onSuccess: (_, { userId }) => {
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["user-menu-group"] });
      addToast({ title: "Menu group disimpan", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const getMenuGroupValue = (user: UserMenuGroupRow) =>
    pendingChanges[user.UserId] !== undefined
      ? pendingChanges[user.UserId]
      : (user.MenuGroup ?? "");

  const isDirty = (user: UserMenuGroupRow) =>
    pendingChanges[user.UserId] !== undefined &&
    pendingChanges[user.UserId] !== (user.MenuGroup ?? "");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Menu Per User</h1>
          <p className="text-sm text-muted-foreground">
            Override menu sidebar untuk user tertentu. Kosong = otomatis dari role.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" /> Cari User
          </CardTitle>
          <CardDescription>Ketik minimal 2 karakter nama atau username</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari nama atau username..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setDebouncedSearch(""); }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat...
            </div>
          )}

          {!isLoading && debouncedSearch.length >= 2 && users.length === 0 && (
            <p className="text-sm text-muted-foreground">Tidak ada user ditemukan</p>
          )}

          {users.length > 0 && (
            <div className="border rounded-md divide-y">
              {users.map((user) => (
                <div key={user.UserId} className="px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{user.Fullname || user.Username}</div>
                    <div className="text-xs text-muted-foreground mb-1">{user.Username}</div>
                    <div className="flex flex-wrap gap-1">
                      {user.Roles.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs px-1.5 py-0">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      className={`border rounded-md px-2 py-1.5 text-sm bg-background w-48 ${
                        isDirty(user) ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" : ""
                      }`}
                      value={getMenuGroupValue(user)}
                      onChange={(e) =>
                        setPendingChanges((prev) => ({ ...prev, [user.UserId]: e.target.value }))
                      }
                    >
                      {MENU_GROUP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {isDirty(user) && (
                      <Button
                        size="sm"
                        disabled={saveMutation.isPending}
                        onClick={() =>
                          saveMutation.mutate({
                            userId: user.UserId,
                            menuGroup: pendingChanges[user.UserId],
                          })
                        }
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}

                    {!isDirty(user) && user.MenuGroup && (
                      <ShieldCheck className="w-4 h-4 text-green-500" aria-label="Override aktif" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
