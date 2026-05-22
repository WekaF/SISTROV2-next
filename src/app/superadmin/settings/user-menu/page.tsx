"use client";
import React, { useState } from "react";
import {
  UserCog, Search, X, Loader2, ShieldCheck, Save, List, Trash2,
} from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { MENU_CATALOG } from "@/lib/menu-catalog";
import { getPathsForGroup, normalizeRole } from "@/lib/menu-configs";

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
  MenuItems: string | null;
  Roles: string[];
}

interface MenuItemDialogState {
  user: UserMenuGroupRow;
  selected: Set<string>;
}

export default function UserMenuGroupPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { data: session, update: updateSession } = useSession();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<MenuItemDialogState | null>(null);

  const currentUserId = (session?.user as any)?.id;

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout((window as any).__menuSearchTimer);
    (window as any).__menuSearchTimer = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["user-menu-group", debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return [];
      const res = await fetch(
        `/api/admin/user-menu-group?search=${encodeURIComponent(debouncedSearch)}`
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<UserMenuGroupRow[]>;
    },
    enabled: debouncedSearch.length >= 2,
  });

  const saveGroupMutation = useMutation({
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
    onSuccess: (_, { userId, menuGroup }) => {
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["user-menu-group"] });
      addToast({ title: "Menu group disimpan", variant: "success" });

      if (userId === currentUserId) {
        updateSession({
          menuGroup: menuGroup || null,
          menuGroups: menuGroup ? [menuGroup] : null,
        }).catch((err) => console.warn("Failed to update session:", err));
      }
    },
    onError: (err: any) => addToast({ title: err.message, variant: "destructive" }),
  });

  const saveItemsMutation = useMutation({
    mutationFn: async ({
      userId,
      menuItems,
    }: {
      userId: string;
      menuItems: string[] | null;
    }) => {
      const res = await fetch("/api/admin/user-menu-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          menuItems:
            menuItems && menuItems.length > 0 ? JSON.stringify(menuItems) : "",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan");
      }
    },
    onSuccess: (_, { userId, menuItems }) => {
      setDialog(null);
      queryClient.invalidateQueries({ queryKey: ["user-menu-group"] });
      addToast({ title: "Menu items disimpan", variant: "success" });

      if (userId === currentUserId) {
        updateSession({
          menuItems: menuItems || null,
        }).catch((err) => console.warn("Failed to update session:", err));
      }
    },
    onError: (err: any) => addToast({ title: err.message, variant: "destructive" }),
  });

  const getMenuGroupValue = (user: UserMenuGroupRow) =>
    pendingChanges[user.UserId] !== undefined
      ? pendingChanges[user.UserId]
      : (user.MenuGroup ?? "");

  const isDirty = (user: UserMenuGroupRow) =>
    pendingChanges[user.UserId] !== undefined &&
    pendingChanges[user.UserId] !== (user.MenuGroup ?? "");

  const getMenuItemCount = (user: UserMenuGroupRow): number => {
    if (!user.MenuItems) return 0;
    try {
      return (JSON.parse(user.MenuItems) as string[]).length;
    } catch {
      return 0;
    }
  };

  const openItemDialog = (user: UserMenuGroupRow) => {
    let selected: Set<string>;
    if (user.MenuItems) {
      try {
        selected = new Set(JSON.parse(user.MenuItems) as string[]);
      } catch {
        selected = new Set();
      }
    } else {
      // No per-item override yet → seed from effective menu group
      const effectiveGroup = user.MenuGroup || normalizeRole(user.Roles?.[0]);
      selected = new Set(getPathsForGroup(effectiveGroup));
    }
    setDialog({ user, selected });
  };

  const toggleItem = (path: string) => {
    if (!dialog) return;
    const next = new Set(dialog.selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setDialog({ ...dialog, selected: next });
  };

  const handleSaveItems = () => {
    if (!dialog) return;
    const paths = Array.from(dialog.selected);
    saveItemsMutation.mutate({
      userId: dialog.user.UserId,
      menuItems: paths.length > 0 ? paths : null,
    });
  };

  const handleClearItems = () => {
    if (!dialog) return;
    saveItemsMutation.mutate({ userId: dialog.user.UserId, menuItems: null });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Menu Per User</h1>
          <p className="text-sm text-muted-foreground">
            Override menu sidebar untuk user tertentu. Per-item override lebih
            prioritas dari menu group.
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
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                }}
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
              {users.map((user) => {
                const itemCount = getMenuItemCount(user);
                return (
                  <div key={user.UserId} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {user.Fullname || user.Username}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {user.Username}
                      </div>
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
                        className={`border rounded-md px-2 py-1.5 text-sm bg-background w-44 ${
                          isDirty(user)
                            ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
                            : ""
                        }`}
                        value={getMenuGroupValue(user)}
                        onChange={(e) =>
                          setPendingChanges((prev) => ({
                            ...prev,
                            [user.UserId]: e.target.value,
                          }))
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
                          disabled={saveGroupMutation.isPending}
                          onClick={() =>
                            saveGroupMutation.mutate({
                              userId: user.UserId,
                              menuGroup: pendingChanges[user.UserId],
                            })
                          }
                        >
                          {saveGroupMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}

                      {!isDirty(user) && user.MenuGroup && itemCount === 0 && (
                        <ShieldCheck
                          className="w-4 h-4 text-green-500"
                          aria-label="Group override aktif"
                        />
                      )}

                      <Button
                        size="sm"
                        variant={itemCount > 0 ? "default" : "outline"}
                        onClick={() => openItemDialog(user)}
                        title="Set menu per item"
                      >
                        <List className="w-3.5 h-3.5" />
                        {itemCount > 0 && (
                          <span className="ml-1 text-xs">{itemCount}</span>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialog !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Menu Per Item — {dialog?.user.Fullname || dialog?.user.Username}
            </DialogTitle>
            {dialog && (
              <p className="text-xs text-muted-foreground">
                {dialog.selected.size} item dipilih.
                {dialog.user.MenuItems
                  ? " Override per-item aktif (mengabaikan menu group)."
                  : " Belum ada override per-item."}
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
            {MENU_CATALOG.map((group) => (
              <div key={group.category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.category}
                  </span>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      if (!dialog) return;
                      const allSelected = group.items.every((i) =>
                        dialog.selected.has(i.path)
                      );
                      const next = new Set(dialog.selected);
                      if (allSelected) {
                        group.items.forEach((i) => next.delete(i.path));
                      } else {
                        group.items.forEach((i) => next.add(i.path));
                      }
                      setDialog({ ...dialog, selected: next });
                    }}
                  >
                    {dialog && group.items.every((i) => dialog.selected.has(i.path))
                      ? "Hapus semua"
                      : "Pilih semua"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {group.items.map((item) => {
                    const checked = dialog?.selected.has(item.path) ?? false;
                    return (
                      <label
                        key={item.path}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-sm cursor-pointer select-none transition-colors ${
                          checked
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(item.path)}
                          className="w-3.5 h-3.5 accent-primary shrink-0"
                        />
                        <span className="truncate">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t pt-4 gap-2 sm:flex-row justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={saveItemsMutation.isPending || !dialog?.user.MenuItems}
              onClick={handleClearItems}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Hapus Override
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDialog(null)}>
                Batal
              </Button>
              <Button
                size="sm"
                disabled={saveItemsMutation.isPending}
                onClick={handleSaveItems}
              >
                {saveItemsMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                Simpan
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
