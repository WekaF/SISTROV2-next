# User Management Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pisahkan halaman manajemen user menjadi 2 menu terpisah — satu untuk Superadmin (semua plant) dan satu untuk Admin (plant sendiri saja).

**Architecture:** Superadmin keeps existing `/superadmin/settings/users` with added company filter. Admin gets new `/admin/pengaturan/user` page scoped to their `companyCode` from session. Sidebar menus split into two separate `MENU_PENGATURAN_SUPERADMIN` and `MENU_PENGATURAN_ADMIN` objects.

**Tech Stack:** Next.js 14 App Router, React Query (TanStack), NextAuth (JWT), ASP.NET API backend, shadcn/ui components

---

## Design Recommendation (Baca Dulu Sebelum Implementasi)

### Masalah Yang Ada Sekarang
1. `MENU_PENGATURAN_ADMIN` di sidebar dipakai oleh KEDUA role (superadmin dan admin)
2. URL di sidebar mengarah ke `/admin/pengaturan/user` — page ini **tidak ada**
3. Page yang ada (`/superadmin/settings/users`) tidak difilter per plant untuk admin
4. Tidak ada scoping — admin bisa lihat user dari plant lain

### Solusi: 2 Menu Terpisah

| Aspek | Superadmin | Admin |
|-------|-----------|-------|
| URL | `/superadmin/settings/users` | `/admin/pengaturan/user` |
| Lihat user | Semua plant | Plant sendiri saja (`companyCode`) |
| Buat user | ✅ Semua role, semua plant | ✅ Tapi role terbatas, plant auto |
| Edit user | ✅ Semua field | ✅ Terbatas (no superadmin role) |
| Hapus user | ✅ | ❌ Tidak boleh |
| Filter company | ✅ Dropdown filter | ❌ Auto (hidden) |
| Role yang bisa assign | Semua role | Semua KECUALI TI, superadmin |

### Role Yang Bisa Akses Tiap Menu
- `/superadmin/settings/users` → hanya `ti`, `superadmin`
- `/admin/pengaturan/user` → `admin`, (opsional: `candal`)

---

## File Map

| Status | Path | Tanggung Jawab |
|--------|------|----------------|
| MODIFY | `src/app/superadmin/settings/users/page.tsx` | Tambah company filter + company column di tabel |
| CREATE | `src/app/admin/pengaturan/user/page.tsx` | Halaman user management plant-scoped untuk Admin |
| CREATE | `src/app/api/admin/users/plant/route.ts` | API: GET/PUT user scoped ke company_code session |
| MODIFY | `src/components/app-sidebar.tsx` | Split MENU_PENGATURAN menjadi superadmin vs admin version |

---

## Task 1: Fix Sidebar — Split Pengaturan Menu

**Files:**
- Modify: `src/components/app-sidebar.tsx` (di sekitar baris 199–210)

- [ ] **Step 1: Buat dua versi MENU_PENGATURAN**

Cari baris yang ada `MENU_PENGATURAN_ADMIN` (sekitar baris 199), ganti dengan dua objek terpisah:

```typescript
const MENU_PENGATURAN_SUPERADMIN = {
  title: "Pengaturan",
  url: "#",
  icon: Settings,
  items: [
    { title: "Management User", url: "/superadmin/settings/users", icon: UserCog },
    { title: "User Transport", url: "/admin/pengaturan/rekanan", icon: Users },
    { title: "Company / Plant", url: "/admin/pengaturan/plant", icon: Factory },
    { title: "Produk", url: "/admin/pengaturan/produk", icon: Package },
    { title: "Mapping Produk Gudang", url: "/admin/pengaturan/mapping-produk", icon: Building2 },
    { title: "Fleet / Armada", url: "/superadmin/settings/fleet", icon: Truck },
  ],
}

const MENU_PENGATURAN_ADMIN = {
  title: "Pengaturan",
  url: "#",
  icon: Settings,
  items: [
    { title: "Management User", url: "/admin/pengaturan/user", icon: UserCog },
    { title: "Produk", url: "/admin/pengaturan/produk", icon: Package },
  ],
}
```

- [ ] **Step 2: Ganti di roleMenus — superadmin pakai MENU_PENGATURAN_SUPERADMIN**

Di `roleMenus` object (sekitar baris 214), update:
```typescript
superadmin: [
  // ... menu lain tidak berubah ...
  MENU_ARMADA_ADMIN,
  MENU_PENGATURAN_SUPERADMIN,  // ← ganti dari MENU_PENGATURAN_ADMIN
],
```

- [ ] **Step 3: Admin tetap pakai MENU_PENGATURAN_ADMIN**

```typescript
admin: [
  // ... menu lain tidak berubah ...
  MENU_ARMADA_ADMIN,
  MENU_PENGATURAN_ADMIN,  // ← sudah benar, tetap
],
```

- [ ] **Step 4: Build check**

```powershell
cd C:\Users\weka\Indigo\SISTROV2-next
rtk npx tsc --noEmit
```

Expected: no errors terkait sidebar

- [ ] **Step 5: Commit**

```
git add src/components/app-sidebar.tsx
git commit -m "fix: split pengaturan menu for superadmin vs admin roles"
```

---

## Task 2: Tambah Company Filter di Superadmin Users Page

**Files:**
- Modify: `src/app/superadmin/settings/users/page.tsx`

Tujuan: superadmin bisa filter tabel by company/plant, dan ada kolom "Plant" di tabel.

- [ ] **Step 1: Tambah state untuk company filter**

Di dalam component `UserConfigPage`, setelah baris `const [searchTerm, setSearchTerm] = useState("");`, tambahkan:

```typescript
const [companyFilter, setCompanyFilter] = useState<string>("all");
```

- [ ] **Step 2: Update filteredUsers untuk include company filter**

Ganti bagian `const filteredUsers = users.filter(...)` menjadi:

```typescript
const filteredUsers = users.filter((u: any) => {
  const matchSearch =
    (u.fullname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());

  const userCompany = (u.companies || [])[0] || "";
  const matchCompany = companyFilter === "all" || userCompany === companyFilter;

  return matchSearch && matchCompany;
});
```

- [ ] **Step 3: Tambah company filter dropdown di UI**

Cari bagian search input (ada `<Input placeholder="Cari..." ...>`), tambahkan dropdown di sebelahnya:

```tsx
{/* Company filter — tambahkan setelah search input */}
<select
  value={companyFilter}
  onChange={(e) => setCompanyFilter(e.target.value)}
  className="border rounded-md px-3 py-2 text-sm bg-background"
>
  <option value="all">Semua Plant</option>
  {availableCompanies.map((c: any) => (
    <option key={c.code || c.id} value={c.code || c.id}>
      {c.name || c.code}
    </option>
  ))}
</select>
```

- [ ] **Step 4: Tambah kolom "Plant" di tabel**

Di header tabel, tambahkan `<th>Plant</th>` setelah kolom Username.

Di baris data tabel, tambahkan cell:
```tsx
<td className="px-4 py-3 text-sm text-muted-foreground">
  {(u.companies || []).join(", ") || "-"}
</td>
```

- [ ] **Step 5: Build check**

```powershell
rtk npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```
git add src/app/superadmin/settings/users/page.tsx
git commit -m "feat: add company/plant filter and column to superadmin users page"
```

---

## Task 3: Buat API Route Plant-Scoped

**Files:**
- Create: `src/app/api/admin/users/plant/route.ts`

API ini dipakai halaman admin untuk GET user (filtered by company) dan PUT user (update nama/role, terbatas).

- [ ] **Step 1: Buat file route baru**

Buat `src/app/api/admin/users/plant/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

// Role yang TIDAK boleh di-assign oleh admin biasa
const RESTRICTED_ROLES = ["ti", "superadmin"];

function isAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) =>
    ["superadmin", "admin", "ti"].includes(r.toLowerCase())
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyCode: string | null = (session?.user as any)?.companyCode ?? null;
    const token = (session?.user as any)?.aspnetToken as string;

    const res = await aspnetFetchServer('/api/UserAccount/ListUser', token);
    if (!res.ok) throw new Error("Failed to fetch users from API");

    const payload = await res.json();
    const data: any[] = payload.data || payload || [];

    const mapped = data
      .filter((u) => {
        // Superadmin/TI: jangan pakai route ini, pakai /api/admin/users
        // Admin: filter by company_code session
        if (!companyCode) return false;
        return (u.company_code || "") === companyCode;
      })
      .map((u) => ({
        id:        u.Id || u.id || u.userid,
        username:  u.UserName || u.username,
        fullname:  u.fullname,
        email:     u.email || null,
        roles:     Array.isArray(u.roles) ? u.roles : (u.role ? u.role.split(',').map((r: string) => r.trim()) : []),
        company:   u.company_code || "",
        isactive:  u.isactive ?? true,
      }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const companyCode: string | null = (session?.user as any)?.companyCode ?? null;
    const token = (session?.user as any)?.aspnetToken as string;
    const body = await req.json();

    // Block assignment of restricted roles
    const requestedRoles: string[] = body.roles || [];
    const hasRestrictedRole = requestedRoles.some((r) =>
      RESTRICTED_ROLES.includes(r.toLowerCase())
    );
    if (hasRestrictedRole) {
      return NextResponse.json(
        { success: false, error: "Tidak boleh assign role superadmin/TI" },
        { status: 403 }
      );
    }

    // Update profile
    const updateRes = await aspnetFetchServer('/api/UserAccount/UpdateUserProfile', token, {
      method: 'POST',
      body: JSON.stringify({
        UserId: body.id,
        FullName: body.fullName,
        Email: body.email,
        IsActive: body.isActive !== false,
        CompanyCode: companyCode,
      })
    });

    if (!updateRes.ok) {
      const errData = await updateRes.json().catch(() => ({}));
      throw new Error(errData?.message || "Update profile gagal");
    }

    // Sync roles — get current roles first
    const userRes = await aspnetFetchServer(`/api/UserAccount/GetUserDetail?userId=${body.id}`, token);
    const userData = await userRes.json();
    const currentRoles: string[] = Array.isArray(userData.roles)
      ? userData.roles
      : (userData.role ? userData.role.split(',').map((r: string) => r.trim()) : []);

    const roleErrors: string[] = [];

    // Remove roles no longer wanted
    const toRemove = currentRoles.filter((r) => !requestedRoles.includes(r));
    for (const role of toRemove) {
      const res = await aspnetFetchServer('/api/UserAccount/RemoveUserFromRole', token, {
        method: 'POST',
        body: JSON.stringify({ UserId: body.id, RoleName: role })
      });
      if (!res.ok) roleErrors.push(`Gagal hapus role ${role}`);
    }

    // Add new roles
    const toAdd = requestedRoles.filter((r) => !currentRoles.includes(r));
    for (const role of toAdd) {
      const res = await aspnetFetchServer('/api/UserAccount/AddtoRole', token, {
        method: 'POST',
        body: JSON.stringify({ UserId: body.id, RoleName: role })
      });
      if (!res.ok) roleErrors.push(`Gagal tambah role ${role}`);
    }

    return NextResponse.json({ success: true, roleErrors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build check**

```powershell
rtk npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Test GET endpoint via browser (dev server harus running)**

Buka `http://localhost:3000/api/admin/users/plant` saat login sebagai `admin` role. Harus return array user dari plant sendiri saja.

- [ ] **Step 4: Commit**

```
git add src/app/api/admin/users/plant/route.ts
git commit -m "feat: add plant-scoped users API route for admin role"
```

---

## Task 4: Buat Halaman Admin User Management (Plant-Scoped)

**Files:**
- Create: `src/app/admin/pengaturan/user/page.tsx`

Halaman ini mirip dengan superadmin users page, tapi:
- Tidak ada filter company (auto dari session)
- Role dropdown exclude TI/superadmin
- Tidak ada tombol Delete
- Ada banner "Plant: [nama plant]"

- [ ] **Step 1: Buat folder dan file**

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\weka\Indigo\SISTROV2-next\src\app\admin\pengaturan\user"
```

Lalu buat `src/app/admin/pengaturan/user/page.tsx`:

```tsx
"use client";
import React, { useState } from "react";
import {
  Users, Search, UserPlus, ShieldCheck, Mail, UserCheck,
  Building, Key, Edit, X, Loader2, Eye, EyeOff,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

// Role yang tidak boleh di-assign oleh admin biasa
const RESTRICTED_ROLES = ["ti", "superadmin"];

export default function AdminUserPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);

  const companyCode = (session?.user as any)?.companyCode || "";

  const emptyForm = {
    id: "", username: "", password: "", fullName: "", email: "",
    isActive: true, roles: [] as string[],
  };
  const [formData, setFormData] = useState(emptyForm);

  const resetForm = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setSelectedUser(null);
    setShowPassword(false);
    setCurrentRoles([]);
  };

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["plant-users", companyCode],
    queryFn: async () => {
      const res = await fetch("/api/admin/users/plant");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch users");
      return (data || []) as any[];
    },
    enabled: !!companyCode,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles");
      const data = await res.json() as any[];
      // Filter out restricted roles — admin tidak boleh assign TI/superadmin
      return data.filter((r: any) =>
        !RESTRICTED_ROLES.includes((r.code || r.name || "").toLowerCase())
      );
    },
  });

  const users = usersData || [];
  const availableRoles = rolesData || [];

  const filteredUsers = users.filter((u: any) =>
    (u.fullname || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter((u: any) => u.isactive).length,
    rolesCount: new Set(users.flatMap((u: any) => u.roles || [])).size,
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/users/plant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success && !res.ok) throw new Error(data.error || "Update failed");
      return data;
    },
    onSuccess: (data: any) => {
      const desc = data.roleErrors?.length
        ? `Profil disimpan. Peringatan: ${data.roleErrors.join('; ')}`
        : "Data pengguna berhasil diperbarui.";
      addToast({
        title: "User Diperbarui",
        description: desc,
        variant: data.roleErrors?.length ? "warning" : "success",
      });
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["plant-users"] });
    },
    onError: (err: any) =>
      addToast({ title: "Gagal Update", description: err.message, variant: "destructive" }),
  });

  const openEdit = (user: any) => {
    const roles = user.roles || [];
    setFormData({
      id: user.id,
      username: user.username || "",
      password: "",
      fullName: user.fullname || "",
      email: user.email || "",
      isActive: user.isactive ?? true,
      roles,
    });
    setCurrentRoles(roles);
    setSelectedUser(user);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.fullName.trim()) {
      addToast({ title: "Validasi", description: "Nama lengkap wajib diisi.", variant: "warning" });
      return;
    }
    updateMutation.mutate({
      id: formData.id,
      fullName: formData.fullName,
      email: formData.email,
      isActive: formData.isActive,
      roles: formData.roles,
      currentRoles,
    });
  };

  const toggleRole = (roleName: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(roleName)
        ? prev.roles.filter((r) => r !== roleName)
        : [...prev.roles, roleName],
    }));
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Management User</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plant: <span className="font-semibold">{companyCode || "—"}</span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total User</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">User Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.rolesCount}</p>
                <p className="text-xs text-muted-foreground">Jenis Role</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, username, atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Nama Lengkap</th>
                    <th className="px-4 py-3 text-left font-medium">Username</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Tidak ada user ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{u.fullname || "-"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.username}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(u.roles || []).slice(0, 3).map((r: string) => (
                              <Badge key={r} variant="secondary" className="text-xs">
                                {r}
                              </Badge>
                            ))}
                            {(u.roles || []).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{u.roles.length - 3}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.isactive ? "default" : "secondary"}>
                            {u.isactive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(u)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Edit User</h2>
              <Button variant="ghost" size="sm" onClick={() => { setShowModal(false); resetForm(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Username</label>
                <Input value={formData.username} disabled className="mt-1 bg-muted" />
              </div>

              <div>
                <label className="text-sm font-medium">Nama Lengkap *</label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                  className="mt-1"
                  placeholder="Nama lengkap"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1"
                  placeholder="email@example.com"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Status Aktif</label>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {availableRoles.map((role: any) => {
                    const roleName = role.code || role.name || role;
                    const isChecked = formData.roles.includes(roleName);
                    return (
                      <label key={roleName} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRole(roleName)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{roleName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowModal(false); resetForm(); }}>
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```powershell
rtk npx tsc --noEmit
```

- [ ] **Step 3: Test halaman di browser**

Login sebagai user dengan role `admin`, buka `http://localhost:3000/admin/pengaturan/user`. Verifikasi:
- Hanya tampilkan user dari plant sendiri
- Role dropdown tidak ada TI/superadmin
- Tidak ada tombol Delete
- Edit berhasil simpan

- [ ] **Step 4: Commit**

```
git add src/app/admin/pengaturan/user/page.tsx
git commit -m "feat: add plant-scoped user management page for admin role"
```

---

## Task 5: Protect Routes dengan Middleware

**Files:**
- Modify atau Create: `src/middleware.ts`

Pastikan route `/superadmin/settings/*` hanya bisa diakses oleh `ti`/`superadmin`. Admin tidak bisa akses langsung.

- [ ] **Step 1: Cek apakah middleware.ts sudah ada**

```powershell
Test-Path "C:\Users\weka\Indigo\SISTROV2-next\src\middleware.ts"
```

Jika ada, baca isinya dulu. Jika tidak ada, buat baru.

- [ ] **Step 2: Tambahkan guard untuk /superadmin route**

Di `middleware.ts`, tambahkan logic untuk redirect admin ke `/admin/pengaturan/user` jika coba akses `/superadmin/settings/users`:

```typescript
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const SUPERADMIN_ROLES = ["ti", "superadmin"];
const ADMIN_ROLES = ["admin"];

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Protect /superadmin/* — hanya ti/superadmin
  if (pathname.startsWith("/superadmin")) {
    const roles: string[] = (token?.roles as string[]) || [];
    const isSuperAdmin = roles.some((r) => SUPERADMIN_ROLES.includes(r.toLowerCase()));
    if (!token || !isSuperAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/superadmin/:path*"],
};
```

> **Catatan:** Jika middleware sudah ada, merge logic ini — jangan replace keseluruhan file.

- [ ] **Step 3: Build check**

```powershell
rtk npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```
git add src/middleware.ts
git commit -m "feat: add route guard for /superadmin — restrict to ti/superadmin roles"
```

---

## Self-Review

**Spec coverage:**
- [x] Superadmin lihat semua user → Task 2 (company filter) 
- [x] Admin lihat user plant sendiri → Task 3 (plant API) + Task 4 (admin page)
- [x] Pisah menu sidebar → Task 1
- [x] Protect routes → Task 5
- [x] Admin tidak bisa assign TI/superadmin role → Task 3 (RESTRICTED_ROLES) + Task 4 (filtered availableRoles)
- [x] Admin tidak bisa delete → Task 4 (tidak ada delete button, PUT-only API)

**Gaps:**
- Reset password untuk admin page tidak di-implementasi — bisa tambahkan Task 6 jika diperlukan
- Tidak ada "Tambah User" untuk admin — by design, create user tetap di superadmin saja

**Type consistency:** semua interface menggunakan `id`, `username`, `fullname`, `email`, `roles[]`, `company`, `isactive` — konsisten.
