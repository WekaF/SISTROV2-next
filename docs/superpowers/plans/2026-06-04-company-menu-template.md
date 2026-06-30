# Company Menu Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan layer "Company Menu Template" sehingga admin bisa mengatur menu satu kali (global) dan berlaku untuk semua perusahaan, dengan opsi override per perusahaan.

**Architecture:** Tambah lapisan baru antara role-default dan user-override. Resolution priority (tertinggi dulu): User Override → Company Template → Global Template → Role Default. Template disimpan di PostgreSQL via Prisma (`CompanyMenuTemplate` table), bukan di ASP.NET.

**Tech Stack:** Next.js 16, Prisma/PostgreSQL (`prismaLog` from `src/lib/prisma.ts`), NextAuth JWT, React Query, Shadcn UI (Card, Toast)

---

## Penjelasan Konsep

### Masalah Sekarang

Menu system saat ini bekerja seperti ini:

```
Role (ASP.NET) → RoleMenuGroup → UserMenuGroup (override per user)
```

Tidak ada layer "per perusahaan" — semua perusahaan dapat menu yang sama dari role mereka.

### Solusi: Company Menu Template

Tambah lapisan baru di tengah:

```
Role Default → [GLOBAL TEMPLATE] → [COMPANY OVERRIDE] → User Override
```

| Layer | Siapa atur | Berlaku untuk |
|---|---|---|
| **Role Default** | Sistem/ASP.NET | Semua user dengan role tersebut |
| **Global Template** (baru) | SuperAdmin/TI | Semua perusahaan (kecuali ada override) |
| **Company Override** (baru) | SuperAdmin/TI | Satu perusahaan spesifik |
| **User Override** | SuperAdmin/TI | Satu user spesifik |

### Cara Kerja

**Skenario yang diminta user:**
> "Mahesa mengeset menu di Company A → semua company langsung ikut"

→ Mahesa set **Global Template**. Semua company otomatis menggunakan global template.
Tidak perlu konfigurasi satu per satu.

**Skenario override:**
> Company B butuh menu berbeda dari global

→ Buat **Company Override** untuk Company B saja.
Company lain tetap pakai global template.

**Priority chain:**
```
1. User-level override (paling tinggi — per-user setting tetap jalan)
2. Company-specific override (company B dapat menu berbeda)
3. Global template (semua company ikut ini, kecuali ada override)
4. Role default (fallback jika tidak ada template sama sekali)
```

**Admin page baru:** `Pengaturan → Company Menu`
- Section "Global Template" → satu setting berlaku semua company
- Tabel "Override per Perusahaan" → list semua company, tampilkan status (inherit global / custom)
- Edit/hapus override per company

---

## File Structure

| File | Action | Tanggung Jawab |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `CompanyMenuTemplate` model |
| `src/lib/company-menu.ts` | Create | Helper: resolve menu template for a companyCode |
| `src/app/api/admin/company-menu-template/route.ts` | Create | CRUD API: GET list, POST/PUT save, DELETE clear |
| `src/lib/auth.ts` | Modify | Integrate company template in login `authorize()` |
| `src/app/api/user/switch-company/route.ts` | Modify | Resolve menu for new company on switch |
| `src/context/CompanyContext.tsx` | Modify | Pass `menuGroup`/`menuItems` to `updateSession` on switch |
| `src/app/superadmin/settings/company-menu/page.tsx` | Create | Admin UI for managing templates |

---

## Task 1: Add CompanyMenuTemplate to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add model to schema**

Append to `prisma/schema.prisma`:

```prisma
model CompanyMenuTemplate {
  id          Int      @id @default(autoincrement())
  companyCode String?  @unique  // null = global template; non-null = per-company override
  menuGroup   String
  menuItems   String?  // JSON array of path strings, null = use all items in menuGroup
  createdBy   String
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([companyCode])
}
```

- [ ] **Step 2: Run migration**

```powershell
cd c:\Users\weka\Indigo\SISTROV2-next
npx prisma migrate dev --name add_company_menu_template
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Verify client regenerated**

```powershell
npx prisma generate
```

Expected: `PrismaClient` now has `companyMenuTemplate` property.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add CompanyMenuTemplate model for per-company menu config"
```

---

## Task 2: Create Company Menu Resolution Helper

**Files:**
- Create: `src/lib/company-menu.ts`

- [ ] **Step 1: Create helper file**

Create `src/lib/company-menu.ts`:

```typescript
import { prismaLog } from "@/lib/prisma";

export interface CompanyMenuResolution {
  menuGroup: string;
  menuItems: string[] | null;
  source: "company-override" | "global-template";
}

/**
 * Resolve menu template for a given companyCode.
 * Priority: company-specific override → global template (companyCode = null).
 * Returns null if no template is configured at all.
 */
export async function resolveCompanyMenuTemplate(
  companyCode: string | null | undefined
): Promise<CompanyMenuResolution | null> {
  // 1. Try company-specific override
  if (companyCode) {
    const specific = await prismaLog.companyMenuTemplate.findUnique({
      where: { companyCode },
    });
    if (specific) {
      return {
        menuGroup: specific.menuGroup,
        menuItems: specific.menuItems ? JSON.parse(specific.menuItems) : null,
        source: "company-override",
      };
    }
  }

  // 2. Fall back to global template (companyCode IS NULL)
  const global = await prismaLog.companyMenuTemplate.findUnique({
    where: { companyCode: null },
  });
  if (global) {
    return {
      menuGroup: global.menuGroup,
      menuItems: global.menuItems ? JSON.parse(global.menuItems) : null,
      source: "global-template",
    };
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/company-menu.ts
git commit -m "feat: add resolveCompanyMenuTemplate helper"
```

---

## Task 3: Create CRUD API Route

**Files:**
- Create: `src/app/api/admin/company-menu-template/route.ts`

- [ ] **Step 1: Create API route**

Create `src/app/api/admin/company-menu-template/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

function isAuthorized(session: any): boolean {
  const roles: string[] = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r) =>
    ["superadmin", "ti"].includes(r.toLowerCase())
  );
}

// GET /api/admin/company-menu-template
// Returns all templates: global (companyCode=null) + all company overrides
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prismaLog.companyMenuTemplate.findMany({
    orderBy: [{ companyCode: "asc" }],
  });

  return NextResponse.json({ success: true, data: templates });
}

// POST /api/admin/company-menu-template
// Body: { companyCode: string | null, menuGroup: string, menuItems?: string[] | null }
// Creates or updates (upsert) a template
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { companyCode, menuGroup, menuItems } = body as {
    companyCode: string | null;
    menuGroup: string;
    menuItems?: string[] | null;
  };

  if (!menuGroup) {
    return NextResponse.json({ error: "menuGroup required" }, { status: 400 });
  }

  const username = (session?.user as any)?.username ?? "unknown";

  const existing = await prismaLog.companyMenuTemplate.findUnique({
    where: { companyCode: companyCode ?? null },
  });

  const menuItemsJson = menuItems && menuItems.length > 0
    ? JSON.stringify(menuItems)
    : null;

  if (existing) {
    const updated = await prismaLog.companyMenuTemplate.update({
      where: { companyCode: companyCode ?? null },
      data: { menuGroup, menuItems: menuItemsJson, updatedBy: username },
    });
    return NextResponse.json({ success: true, data: updated });
  } else {
    const created = await prismaLog.companyMenuTemplate.create({
      data: {
        companyCode: companyCode ?? null,
        menuGroup,
        menuItems: menuItemsJson,
        createdBy: username,
      },
    });
    return NextResponse.json({ success: true, data: created });
  }
}

// DELETE /api/admin/company-menu-template?companyCode=XYZ
// Removes the override for that company (or global if companyCode not provided)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(session))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const companyCode = searchParams.has("companyCode")
    ? searchParams.get("companyCode")
    : null;

  const existing = await prismaLog.companyMenuTemplate.findUnique({
    where: { companyCode },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prismaLog.companyMenuTemplate.delete({
    where: { companyCode },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/company-menu-template/route.ts
git commit -m "feat: add CRUD API for company menu templates"
```

---

## Task 4: Integrate Company Template in Login Flow (auth.ts)

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Import the helper at top of auth.ts**

In `src/lib/auth.ts`, after the existing imports (around line 3), add:

```typescript
import { resolveCompanyMenuTemplate } from "@/lib/company-menu";
```

- [ ] **Step 2: Call resolveCompanyMenuTemplate inside authorize()**

In `src/lib/auth.ts`, in the `authorize()` function, after line 161 (where `menuItems` is parsed from `userMenuItemsRaw`), add:

```typescript
        // Company-level template lookup (between role default and user override)
        const companyTemplate = await resolveCompanyMenuTemplate(
          credentials.companycode || null
        ).catch(() => null); // never fail login due to template lookup
```

- [ ] **Step 3: Apply company template in menu resolution**

Replace the `menuGroups` resolution block (lines 163–181 in auth.ts) with:

```typescript
        let menuGroups: string[];
        if (userMenuGroup) {
          // User-level override (highest priority — admin assigned this user a specific menu)
          menuGroups = [userMenuGroup];
        } else if (companyTemplate) {
          // Company-level template (applies to all users in this company not overridden)
          menuGroups = [companyTemplate.menuGroup];
        } else {
          // Derive from all roles, in priority order (role default fallback)
          const sortedRoles = [...roles].sort((a, b) => {
            const pa = ROLE_PRIORITY.indexOf(a) === -1 ? ROLE_PRIORITY.length : ROLE_PRIORITY.indexOf(a);
            const pb = ROLE_PRIORITY.indexOf(b) === -1 ? ROLE_PRIORITY.length : ROLE_PRIORITY.indexOf(b);
            return pa - pb;
          });
          menuGroups = [];
          for (const r of sortedRoles) {
            const key = Object.keys(roleMenuGroupsMap).find(k => k.toLowerCase() === r.toLowerCase());
            const g = key ? roleMenuGroupsMap[key] : null;
            if (g && !menuGroups.includes(g)) menuGroups.push(g);
          }
          if (menuGroups.length === 0) menuGroups.push("eksternal");
        }

        // menuItems: user-level override (highest) → company template → null
        const effectiveMenuItems = menuItems ?? companyTemplate?.menuItems ?? null;
```

- [ ] **Step 4: Update return value to use effectiveMenuItems**

In the `return` block of `authorize()` (around line 186), change `menuItems` to `effectiveMenuItems`:

```typescript
        return {
          id:            data.userid,
          name:          data.fullname,
          email:         data.email,
          role:          highestRole,
          roles,
          menuGroup,
          menuGroups,
          menuItems:     effectiveMenuItems,   // was: menuItems
          companyCode:   data.companycode ?? null,
          aspnetToken:   data.access_token,
          username:      data.username,
          transportCode: data.transportcode ?? null,
          _pw: Buffer.from(credentials.password).toString("base64"),
        };
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: apply company menu template during login authorization"
```

---

## Task 5: Integrate Company Template in switch-company Route

When user switches company, the menu must also update to reflect the new company's template.

**Files:**
- Modify: `src/app/api/user/switch-company/route.ts`

- [ ] **Step 1: Import resolveCompanyMenuTemplate**

At the top of `src/app/api/user/switch-company/route.ts`, after existing imports, add:

```typescript
import { resolveCompanyMenuTemplate } from "@/lib/company-menu";
```

- [ ] **Step 2: Resolve company template after successful re-auth**

In `switch-company/route.ts`, after line 87 (`const data = await tokenRes.json();`), add:

```typescript
    // Resolve menu for new company (company template takes priority over role default)
    // User-level override (data.user_menu_group from ASP.NET) still wins
    const userMenuGroup = (data.user_menu_group || "").trim();
    let resolvedMenuGroup: string | null = null;
    let resolvedMenuItems: string[] | null = null;

    if (userMenuGroup) {
      resolvedMenuGroup = userMenuGroup;
    } else {
      const companyTemplate = await resolveCompanyMenuTemplate(
        data.companycode ?? companyCode
      ).catch(() => null);
      if (companyTemplate) {
        resolvedMenuGroup = companyTemplate.menuGroup;
        resolvedMenuItems = companyTemplate.menuItems;
      }
    }
```

- [ ] **Step 3: Include resolved menu in response**

Replace the `return NextResponse.json(...)` at the end with:

```typescript
    return NextResponse.json({
      success: true,
      activeCompany: companyCode,
      aspnetToken: data.access_token,
      companyCode: data.companycode ?? companyCode,
      menuGroup: resolvedMenuGroup,
      menuItems: resolvedMenuItems,
    });
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/switch-company/route.ts
git commit -m "feat: resolve company menu template on company switch"
```

---

## Task 6: Update CompanyContext to Sync Menu on Switch

**Files:**
- Modify: `src/context/CompanyContext.tsx`

- [ ] **Step 1: Pass menuGroup/menuItems to updateSession**

In `src/context/CompanyContext.tsx`, find the `updateSession({ aspnetToken, companyCode })` call (around line 112–116). Replace it with:

```typescript
          await updateSession({
            aspnetToken: json.aspnetToken,
            companyCode: json.companyCode,
            ...(json.menuGroup !== undefined && { menuGroup: json.menuGroup }),
            ...(json.menuItems !== undefined && { menuItems: json.menuItems }),
          }).catch((err) =>
            console.warn("[CompanyContext] updateSession error:", err)
          );
```

This passes `menuGroup` and `menuItems` from the switch-company response into the JWT, so `session.user.menuGroup` reflects the new company's template immediately.

- [ ] **Step 2: Commit**

```bash
git add src/context/CompanyContext.tsx
git commit -m "feat: sync menu group/items in session on company switch"
```

---

## Task 7: Create Admin UI Page

**Files:**
- Create: `src/app/superadmin/settings/company-menu/page.tsx`

This page has two sections:
1. **Global Template** — satu setting berlaku semua company
2. **Override per Perusahaan** — tabel semua company dengan status dan edit

- [ ] **Step 1: Create the admin page**

Create `src/app/superadmin/settings/company-menu/page.tsx`:

```tsx
"use client";

import React, { useState } from "react";
import { Building2, Globe, Loader2, Save, Trash2, Pencil, Check } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── types ───────────────────────────────────────────────────────────────────

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

// ─── constants ───────────────────────────────────────────────────────────────

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
  superadmin: "bg-red-100 text-red-800",
  admin: "bg-orange-100 text-orange-800",
  candal: "bg-yellow-100 text-yellow-800",
  staffarea: "bg-blue-100 text-blue-800",
  viewer: "bg-purple-100 text-purple-800",
  transport: "bg-green-100 text-green-800",
  security: "bg-pink-100 text-pink-800",
  gudang: "bg-teal-100 text-teal-800",
  jembatan_timbang: "bg-cyan-100 text-cyan-800",
  pod: "bg-indigo-100 text-indigo-800",
  pkd: "bg-lime-100 text-lime-800",
  eksternal: "bg-gray-100 text-gray-600",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function groupLabel(value: string): string {
  return MENU_GROUPS.find((g) => g.value === value)?.label ?? value;
}

function MenuGroupBadge({ value }: { value: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${GROUP_COLOR[value] ?? "bg-gray-100 text-gray-600"}`}>
      {groupLabel(value)}
    </span>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function CompanyMenuPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Pending edits: companyCode → draft menuGroup
  // null key = global template
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Set<string>>(new Set());

  // ── fetch templates ──────────────────────────────────────────────────────
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["company-menu-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/company-menu-template");
      if (!res.ok) throw new Error("Gagal mengambil data template");
      const json = await res.json();
      return (json.data ?? []) as CompanyMenuTemplateRow[];
    },
  });

  // ── fetch companies ──────────────────────────────────────────────────────
  const { data: companies = [], isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const res = await fetch("/api/admin/companies");
      if (!res.ok) throw new Error("Gagal mengambil daftar perusahaan");
      const json = await res.json();
      return (json.data ?? []) as CompanyItem[];
    },
  });

  // ── save mutation ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({
      companyCode,
      menuGroup,
    }: {
      companyCode: string | null;
      menuGroup: string;
    }) => {
      const res = await fetch("/api/admin/company-menu-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode, menuGroup }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
      return json;
    },
    onSuccess: (_: any, vars: { companyCode: string | null }) => {
      queryClient.invalidateQueries({ queryKey: ["company-menu-templates"] });
      const key = vars.companyCode ?? "__global__";
      setDrafts((prev) => { const n = { ...prev }; delete n[key]; return n; });
      setEditing((prev) => { const n = new Set(prev); n.delete(key); return n; });
      addToast({ title: "Template disimpan", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  // ── delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (companyCode: string | null) => {
      const url = companyCode
        ? `/api/admin/company-menu-template?companyCode=${companyCode}`
        : `/api/admin/company-menu-template`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-menu-templates"] });
      addToast({ title: "Override dihapus", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  // ── derived ──────────────────────────────────────────────────────────────
  const globalTemplate = templates.find((t) => t.companyCode === null);
  const overrideMap = new Map(
    templates.filter((t) => t.companyCode !== null).map((t) => [t.companyCode!, t])
  );

  function getDraft(key: string): string {
    return drafts[key] ?? "";
  }

  function isEditingKey(key: string): boolean {
    return editing.has(key);
  }

  function startEdit(key: string, currentGroup: string) {
    setDrafts((prev) => ({ ...prev, [key]: currentGroup }));
    setEditing((prev) => new Set(prev).add(key));
  }

  function cancelEdit(key: string) {
    setDrafts((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setEditing((prev) => { const n = new Set(prev); n.delete(key); return n; });
  }

  // ── render ────────────────────────────────────────────────────────────────
  const isLoading = loadingTemplates || loadingCompanies;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Pengaturan Menu per Perusahaan</h1>
          <p className="text-sm text-muted-foreground">
            Set global template sekali — berlaku semua perusahaan. Override per perusahaan jika perlu tampilan berbeda.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
        </div>
      )}

      {/* ── Global Template ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Global Template</CardTitle>
          </div>
          <CardDescription>
            Berlaku untuk semua perusahaan yang tidak memiliki override.
            Kosongkan untuk menonaktifkan global template (fallback ke role default).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            {isEditingKey("__global__") ? (
              <>
                <select
                  className="border rounded px-2 py-1.5 text-sm bg-background w-56"
                  value={getDraft("__global__")}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, __global__: e.target.value }))}
                >
                  <option value="">-- pilih menu group --</option>
                  {MENU_GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
                <button
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                  disabled={!getDraft("__global__") || saveMutation.isPending}
                  onClick={() => saveMutation.mutate({ companyCode: null, menuGroup: getDraft("__global__") })}
                >
                  {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Simpan
                </button>
                <button
                  className="text-xs px-3 py-1.5 border rounded hover:bg-muted"
                  onClick={() => cancelEdit("__global__")}
                >
                  Batal
                </button>
                {globalTemplate && (
                  <button
                    className="flex items-center gap-1 text-xs px-3 py-1.5 text-destructive border border-destructive rounded hover:bg-destructive/10"
                    onClick={() => {
                      cancelEdit("__global__");
                      deleteMutation.mutate(null);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" /> Hapus Global Template
                  </button>
                )}
              </>
            ) : globalTemplate ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Menu Group:</span>
                  <MenuGroupBadge value={globalTemplate.menuGroup} />
                </div>
                <button
                  className="flex items-center gap-1 text-xs px-3 py-1.5 border rounded hover:bg-muted"
                  onClick={() => startEdit("__global__", globalTemplate.menuGroup)}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Belum ada global template. Semua perusahaan pakai role default.</p>
                <button
                  className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  onClick={() => startEdit("__global__", "admin")}
                >
                  <Globe className="w-3 h-3" /> Set Global Template
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Per-Company Overrides ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Override per Perusahaan</CardTitle>
          <CardDescription>
            Perusahaan dengan override akan mengabaikan global template.
            Perusahaan tanpa override inherit global template (atau role default jika tidak ada global).
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
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {companies.map((company) => {
                  const key = company.code;
                  const override = overrideMap.get(key);
                  const isEdit = isEditingKey(key);
                  const effectiveGroup = override?.menuGroup ?? globalTemplate?.menuGroup ?? null;

                  return (
                    <tr key={key} className={isEdit ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
                      <td className="py-2 px-3 font-medium">{company.name}</td>
                      <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{key}</td>
                      <td className="py-2 px-3">
                        {isEdit ? (
                          <select
                            className="border rounded px-2 py-1 text-sm bg-background w-48"
                            value={getDraft(key)}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                          >
                            <option value="">-- pilih --</option>
                            {MENU_GROUPS.map((g) => (
                              <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                          </select>
                        ) : effectiveGroup ? (
                          <MenuGroupBadge value={effectiveGroup} />
                        ) : (
                          <span className="text-muted-foreground text-xs">Role default</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {override ? (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                            Custom override
                          </span>
                        ) : globalTemplate ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Inherit global
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Role default</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          {isEdit ? (
                            <>
                              <button
                                className="flex items-center gap-1 text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                                disabled={!getDraft(key) || saveMutation.isPending}
                                onClick={() => saveMutation.mutate({ companyCode: key, menuGroup: getDraft(key) })}
                              >
                                {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Simpan
                              </button>
                              <button
                                className="text-xs px-2 py-1 border rounded hover:bg-muted"
                                onClick={() => cancelEdit(key)}
                              >
                                Batal
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-muted"
                                onClick={() => startEdit(key, override?.menuGroup ?? globalTemplate?.menuGroup ?? "admin")}
                              >
                                <Pencil className="w-3 h-3" />
                                {override ? "Edit" : "Set Override"}
                              </button>
                              {override && (
                                <button
                                  className="flex items-center gap-1 text-xs px-2 py-1 text-destructive border border-destructive rounded hover:bg-destructive/10"
                                  onClick={() => deleteMutation.mutate(key)}
                                  disabled={deleteMutation.isPending}
                                  title="Hapus override, kembali ke global template"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {companies.length === 0 && !loadingCompanies && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground text-sm py-6">
                      Tidak ada data perusahaan
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/superadmin/settings/company-menu/page.tsx
git commit -m "feat: add company menu template admin page"
```

---

## Task 8: Add Navigation Link to New Page

The new page needs to appear in the sidebar/settings navigation for superadmin.

**Files:**
- Investigate: `src/lib/menu-catalog.ts` and `src/lib/menu-configs.tsx`

- [ ] **Step 1: Add to menu catalog**

In `src/lib/menu-catalog.ts`, find the settings/admin group and add:

```typescript
{ path: "/superadmin/settings/company-menu", label: "Menu per Perusahaan" },
```

Place it after the existing `role-menu` and `user-menu` entries in the superadmin group.

- [ ] **Step 2: Add to superadmin MENU_CONFIGS**

In `src/lib/menu-configs.tsx`, in the `MENU_CONFIGS.superadmin` (or TI) section, add a `NavItem` for the new page alongside `role-menu` and `user-menu`:

```typescript
{ name: "Menu per Perusahaan", path: "/superadmin/settings/company-menu" },
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/menu-catalog.ts src/lib/menu-configs.tsx
git commit -m "feat: add company-menu page to superadmin nav"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Set menu once → apply to all companies | Task 4 (global template in auth login) |
| Per-company override option | Task 3 API + Task 7 UI (override per perusahaan) |
| Menu syncs on company switch | Task 5 + Task 6 |
| Admin UI to manage templates | Task 7 |
| Navigation link | Task 8 |

### Priority Chain Verified

- User override (`userMenuGroup` from ASP.NET) → wins ✓  
- Company-specific override (companyCode match in DB) → wins over global ✓  
- Global template (companyCode IS NULL) → wins over role default ✓  
- Role default (existing logic) → fallback if no template ✓  

### Edge Cases Handled

- `resolveCompanyMenuTemplate` wrapped in `.catch(() => null)` in auth.ts → login never fails due to DB issue ✓
- `companyCode` may be `null` at login (no company selected) → global template still checked ✓  
- Delete override → company falls back to global (no orphan data) ✓  
- No global, no override → existing role-based logic unchanged ✓
