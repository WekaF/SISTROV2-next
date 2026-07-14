# Manager Hierarchy Mapping (AVP / VP / DIREKSI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add the data tables and SuperAdmin CRUD screens needed to assign each manager user to one of three scope tiers — AVP (single wilayah), VP (a group of wilayah, i.e. Wilayah Barat/Timur), DIREKSI (single anper/company) — and let SuperAdmin dynamically redefine which wilayah belong to which VP region.

**Architecture:** Users, roles, wilayah master data, and companies already live in the ASP.NET backend (SQL Server) and are proxied into this app via `/api/admin/*` routes (confirmed: `/api/admin/regions` → ASP.NET `Wilayah/Data`, `/api/admin/companies` → ASP.NET `Company/getCompanyListFitur`, `/api/admin/users` → user list). This app's local Postgres (Prisma, `prismaLog` client) already holds one comparable app-owned config table (`CompanyMenuTemplate`) that overlays ASP.NET master data without duplicating it — this plan follows the same pattern. Three new local Prisma models are added:

- `VpRegion` — the two (or more) VP regions, e.g. "Wilayah Barat" / "Wilayah Timur". Superadmin-editable, not hardcoded.
- `VpRegionWilayah` — join table assigning each ASP.NET wilayah code to exactly one `VpRegion`. This is what makes the Barat/Timur grouping dynamic.
- `ManagerScope` — one row per manager user: which tier (`avp` | `vp` | `direksi`), and the matching scope value (`wilayahCode` for avp, `vpRegionId` for vp, `companyCode`/anper for direksi — confirmed anper = existing `company_code` 1:1, e.g. `PIM`/`PKT`/`PKG`/`PSP`/`PKC`, evidenced by `menu-catalog.ts` already using `PSP`/`PKT` as real company codes).

Two new SuperAdmin settings pages reuse the existing `area-scope` page's UI pattern (search-user-on-left, manage-scope-on-right, React Query + toast + ConfirmDialog):

- `/superadmin/settings/vp-regions` — manage which wilayah belong to which VP region.
- `/superadmin/settings/manager-scope` — assign a user to a tier + scope value.

**Out of scope (explicitly deferred, confirmed with user):** Aggregating live queue/dashboard *stats* across multiple companies for an AVP/VP viewer (e.g. summing `CompanyDashboard/GetStats` across every company under a wilayah or region) is NOT part of this plan. That requires either a new ASP.NET endpoint exposing company↔wilayah linkage, or N sequential client calls — neither confirmed/designed yet. This plan only builds the mapping data + admin CRUD so that future dashboard work has scope data to query against.

**Tech Stack:** Next.js 16 (App Router) API routes, Prisma 7 + `prismaLog` client (Postgres via `@prisma/adapter-pg`), NextAuth session (`session.user.roles`, `.aspnetToken`), React Query, existing UI kit (`@/components/ui/*`).

**Testing note:** This repo has no automated test runner configured (no vitest/jest in `package.json`, no `*.test.ts` outside `node_modules`). Steps below substitute `npx tsc --noEmit` type-checks and manual `curl`/browser verification for automated test-first steps, consistent with how the rest of this codebase is verified (see `src/app/api/admin/area-scope/route.ts` and its page — no test file exists for either).

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | Add `VpRegion`, `VpRegionWilayah`, `ManagerScope` models |
| `src/app/api/admin/vp-regions/route.ts` | GET (list regions with their wilayah codes), POST (create region) |
| `src/app/api/admin/vp-regions/[id]/route.ts` | PATCH (rename region), DELETE (remove region, only if empty) |
| `src/app/api/admin/vp-regions/[id]/wilayah/route.ts` | POST (assign a wilayah code to this region, upsert), DELETE `?wilayahCode=` (unassign) |
| `src/app/api/admin/manager-scope/route.ts` | GET `?userId=` (get a user's scope), POST (create/replace a user's scope), DELETE `?id=` |
| `src/lib/manager-scope.ts` | `getManagerScope(userId)` helper — reads `ManagerScope`, resolves `vpRegionId` → wilayah codes list, returns a typed scope object for future dashboard code to consume |
| `src/app/superadmin/settings/vp-regions/page.tsx` | SuperAdmin UI: list wilayah (from `/api/admin/regions`), assign each to a `VpRegion` |
| `src/app/superadmin/settings/manager-scope/page.tsx` | SuperAdmin UI: search user, pick tier, pick scope value, save |
| `src/lib/menu-configs.tsx:247-250` | Add two new nav entries under the SuperAdmin settings group |

---

## Task 1: Prisma schema — VpRegion, VpRegionWilayah, ManagerScope

**Files:**
- Modify: `prisma/schema.prisma`

- [x] **Step 1: Add the three models**

Append to `prisma/schema.prisma` (after `CompanyMenuTemplate`, which ends at line 42):

```prisma
model VpRegion {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  createdBy String
  updatedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  wilayahs      VpRegionWilayah[]
  managerScopes ManagerScope[]
}

model VpRegionWilayah {
  id          Int      @id @default(autoincrement())
  vpRegionId  Int
  wilayahCode String   @unique
  createdAt   DateTime @default(now())

  vpRegion VpRegion @relation(fields: [vpRegionId], references: [id], onDelete: Cascade)

  @@index([vpRegionId])
}

model ManagerScope {
  id          Int      @id @default(autoincrement())
  userId      String   @unique
  tier        String   // "avp" | "vp" | "direksi"
  wilayahCode String?  // set when tier = "avp"
  vpRegionId  Int?     // set when tier = "vp"
  companyCode String?  // set when tier = "direksi" (anper code, e.g. "PIM")
  createdBy   String
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  vpRegion VpRegion? @relation(fields: [vpRegionId], references: [id])

  @@index([tier])
  @@index([vpRegionId])
}
```

- [x] **Step 2: Generate and run the migration**

Run: `npx prisma migrate dev --name manager_hierarchy_mapping`
Expected: migration file created under `prisma/migrations/`, output ends with `Your database is now in sync with your schema.`

- [x] **Step 3: Regenerate Prisma client and type-check**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: both commands exit 0, no errors.

- [x] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add VpRegion, VpRegionWilayah, ManagerScope models"
```

---

## Task 2: VP Region CRUD API

**Files:**
- Create: `src/app/api/admin/vp-regions/route.ts`
- Create: `src/app/api/admin/vp-regions/[id]/route.ts`
- Create: `src/app/api/admin/vp-regions/[id]/wilayah/route.ts`

- [x] **Step 1: Write the list+create route**

`src/app/api/admin/vp-regions/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

function isSuperAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const regions = await prismaLog.vpRegion.findMany({
      include: { wilayahs: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(regions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const username = (session?.user as any)?.username || "unknown";
    const region = await prismaLog.vpRegion.create({
      data: { name: body.name, createdBy: username },
    });
    return NextResponse.json({ success: true, data: region });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [x] **Step 2: Write the rename+delete route**

`src/app/api/admin/vp-regions/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

function isSuperAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const username = (session?.user as any)?.username || "unknown";
    const region = await prismaLog.vpRegion.update({
      where: { id: Number(id) },
      data: { name: body.name, updatedBy: username },
    });
    return NextResponse.json({ success: true, data: region });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const regionId = Number(id);

    const wilayahCount = await prismaLog.vpRegionWilayah.count({ where: { vpRegionId: regionId } });
    if (wilayahCount > 0) {
      return NextResponse.json(
        { error: "Region masih punya wilayah terpasang, lepas dulu sebelum hapus" },
        { status: 409 }
      );
    }

    await prismaLog.vpRegion.delete({ where: { id: regionId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [x] **Step 3: Write the wilayah-assignment route**

`src/app/api/admin/vp-regions/[id]/wilayah/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

function isSuperAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    if (!body.wilayahCode || typeof body.wilayahCode !== "string") {
      return NextResponse.json({ error: "wilayahCode required" }, { status: 400 });
    }

    const assignment = await prismaLog.vpRegionWilayah.upsert({
      where: { wilayahCode: body.wilayahCode },
      create: { wilayahCode: body.wilayahCode, vpRegionId: Number(id) },
      update: { vpRegionId: Number(id) },
    });
    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await params; // region id not needed for delete, wilayahCode is globally unique
    const { searchParams } = new URL(req.url);
    const wilayahCode = searchParams.get("wilayahCode");
    if (!wilayahCode) return NextResponse.json({ error: "wilayahCode required" }, { status: 400 });

    await prismaLog.vpRegionWilayah.delete({ where: { wilayahCode } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [x] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [x] **Step 5: Manual verification**

Start dev server (`npm run dev`), sign in as a superadmin user, then from the browser console or a REST client:

```
POST /api/admin/vp-regions  { "name": "Wilayah Barat" }
POST /api/admin/vp-regions  { "name": "Wilayah Timur" }
GET  /api/admin/vp-regions
```

Expected: `GET` returns both regions, each with `wilayahs: []`.

- [x] **Step 6: Commit**

```bash
git add src/app/api/admin/vp-regions
git commit -m "feat: add VP region CRUD API"
```

---

## Task 3: Manager Scope CRUD API

**Files:**
- Create: `src/app/api/admin/manager-scope/route.ts`

- [x] **Step 1: Write the route**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

const VALID_TIERS = ["avp", "vp", "direksi"] as const;
type Tier = (typeof VALID_TIERS)[number];

function isSuperAdmin(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

function validateScopeBody(body: any): string | null {
  if (!body.userId || typeof body.userId !== "string") return "userId required";
  if (!VALID_TIERS.includes(body.tier)) return `tier must be one of ${VALID_TIERS.join(", ")}`;
  const tier = body.tier as Tier;
  if (tier === "avp" && !body.wilayahCode) return "wilayahCode required for tier=avp";
  if (tier === "vp" && !body.vpRegionId) return "vpRegionId required for tier=vp";
  if (tier === "direksi" && !body.companyCode) return "companyCode required for tier=direksi";
  return null;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const scope = await prismaLog.managerScope.findUnique({
      where: { userId },
      include: { vpRegion: true },
    });
    return NextResponse.json({ success: true, data: scope });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const validationError = validateScopeBody(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const username = (session?.user as any)?.username || "unknown";
    const data = {
      tier: body.tier as Tier,
      wilayahCode: body.tier === "avp" ? body.wilayahCode : null,
      vpRegionId: body.tier === "vp" ? Number(body.vpRegionId) : null,
      companyCode: body.tier === "direksi" ? body.companyCode : null,
    };

    const scope = await prismaLog.managerScope.upsert({
      where: { userId: body.userId },
      create: { userId: body.userId, ...data, createdBy: username },
      update: { ...data, updatedBy: username },
    });
    return NextResponse.json({ success: true, data: scope });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prismaLog.managerScope.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [x] **Step 3: Manual verification**

With a real `userId` from `/api/admin/users` and a `vpRegionId` from Task 2:

```
POST /api/admin/manager-scope  { "userId": "<id>", "tier": "vp", "vpRegionId": 1 }
GET  /api/admin/manager-scope?userId=<id>
```

Expected: `GET` returns the scope with `tier: "vp"`, `vpRegionId: 1`, `vpRegion: { name: "Wilayah Barat" }`.

- [x] **Step 4: Commit**

```bash
git add src/app/api/admin/manager-scope
git commit -m "feat: add manager scope CRUD API"
```

---

## Task 4: `getManagerScope` helper for future dashboard use

**Files:**
- Create: `src/lib/manager-scope.ts`

- [x] **Step 1: Write the helper**

```typescript
import { prismaLog } from "@/lib/prisma";

export type ManagerScopeResult =
  | { tier: "avp"; wilayahCode: string }
  | { tier: "vp"; vpRegionId: number; wilayahCodes: string[] }
  | { tier: "direksi"; companyCode: string }
  | { tier: "none" };

/**
 * Resolve a user's manager scope tier. For tier "vp", also resolves
 * the full list of wilayah codes currently assigned to that region,
 * since VP grouping is superadmin-editable and can change at any time.
 */
export async function getManagerScope(userId: string): Promise<ManagerScopeResult> {
  const scope = await prismaLog.managerScope.findUnique({ where: { userId } });
  if (!scope) return { tier: "none" };

  if (scope.tier === "avp" && scope.wilayahCode) {
    return { tier: "avp", wilayahCode: scope.wilayahCode };
  }

  if (scope.tier === "vp" && scope.vpRegionId) {
    const wilayahs = await prismaLog.vpRegionWilayah.findMany({
      where: { vpRegionId: scope.vpRegionId },
      select: { wilayahCode: true },
    });
    return { tier: "vp", vpRegionId: scope.vpRegionId, wilayahCodes: wilayahs.map((w) => w.wilayahCode) };
  }

  if (scope.tier === "direksi" && scope.companyCode) {
    return { tier: "direksi", companyCode: scope.companyCode };
  }

  return { tier: "none" };
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [x] **Step 3: Commit**

```bash
git add src/lib/manager-scope.ts
git commit -m "feat: add getManagerScope helper"
```

---

## Task 5: SuperAdmin page — VP Region wilayah grouping

**Files:**
- Create: `src/app/superadmin/settings/vp-regions/page.tsx`

- [x] **Step 1: Write the page**

```typescript
"use client";
import React, { useState } from "react";
import { Map, Loader2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Wilayah {
  id: string;
  code: string;
  name: string;
}

interface VpRegion {
  id: number;
  name: string;
  wilayahs: { id: number; wilayahCode: string }[];
}

export default function VpRegionsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [pendingWilayah, setPendingWilayah] = useState<string | null>(null);

  const { data: wilayahRes, isLoading: wilayahLoading } = useQuery({
    queryKey: ["admin-regions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/regions");
      if (!res.ok) throw new Error("Failed to fetch wilayah");
      return res.json() as Promise<{ success: boolean; data: Wilayah[] }>;
    },
  });

  const { data: vpRegions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ["vp-regions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vp-regions");
      if (!res.ok) throw new Error("Failed to fetch VP regions");
      return res.json() as Promise<VpRegion[]>;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ regionId, wilayahCode }: { regionId: number; wilayahCode: string }) => {
      const res = await fetch(`/api/admin/vp-regions/${regionId}/wilayah`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wilayahCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign wilayah");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vp-regions"] });
      setPendingWilayah(null);
      addToast({ title: "Wilayah dipindahkan", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
      setPendingWilayah(null);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async ({ regionId, wilayahCode }: { regionId: number; wilayahCode: string }) => {
      const res = await fetch(
        `/api/admin/vp-regions/${regionId}/wilayah?wilayahCode=${encodeURIComponent(wilayahCode)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unassign wilayah");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vp-regions"] });
      addToast({ title: "Wilayah dilepas dari region", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const wilayahList = wilayahRes?.data || [];
  const assignedCodes = new Set(vpRegions.flatMap((r) => r.wilayahs.map((w) => w.wilayahCode)));
  const unassigned = wilayahList.filter((w) => !assignedCodes.has(w.code));

  if (wilayahLoading || regionsLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Map className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Mapping VP Region</h1>
          <p className="text-sm text-muted-foreground">Atur wilayah AVP mana masuk ke region VP mana</p>
        </div>
      </div>

      {unassigned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Belum Dipetakan</CardTitle>
            <CardDescription>Wilayah yang belum masuk region VP manapun</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unassigned.map((w) => (
              <Badge key={w.code} variant="outline">{w.name}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vpRegions.map((region) => (
          <Card key={region.id}>
            <CardHeader>
              <CardTitle className="text-base">{region.name}</CardTitle>
              <CardDescription>{region.wilayahs.length} wilayah</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {region.wilayahs.map((w) => {
                  const wilayahInfo = wilayahList.find((wl) => wl.code === w.wilayahCode);
                  return (
                    <Badge key={w.wilayahCode} className="flex items-center gap-1">
                      {wilayahInfo?.name || w.wilayahCode}
                      <button
                        onClick={() => unassignMutation.mutate({ regionId: region.id, wilayahCode: w.wilayahCode })}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={pendingWilayah || ""}
                onChange={(e) => {
                  const code = e.target.value;
                  if (code) {
                    setPendingWilayah(code);
                    assignMutation.mutate({ regionId: region.id, wilayahCode: code });
                  }
                }}
              >
                <option value="">-- Tambah wilayah ke {region.name} --</option>
                {wilayahList
                  .filter((w) => !region.wilayahs.some((rw) => rw.wilayahCode === w.code))
                  .map((w) => (
                    <option key={w.code} value={w.code}>{w.name}</option>
                  ))}
              </select>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [x] **Step 3: Manual verification**

Visit `/superadmin/settings/vp-regions` as superadmin. Confirm: both regions render, moving a wilayah from "Belum Dipetakan" into a region via the select works, clicking the `X` on a badge unassigns it and the wilayah reappears under "Belum Dipetakan".

- [x] **Step 4: Commit**

```bash
git add src/app/superadmin/settings/vp-regions
git commit -m "feat: add VP region mapping admin page"
```

---

## Task 6: SuperAdmin page — Manager Scope assignment

**Files:**
- Create: `src/app/superadmin/settings/manager-scope/page.tsx`

- [x] **Step 1: Write the page**

```typescript
"use client";
import React, { useState } from "react";
import { UserCog, Search, Loader2, X, Users, ShieldCheck } from "lucide-react";
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
  roles: string[];
}

interface Wilayah {
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

interface ManagerScope {
  id: number;
  userId: string;
  tier: "avp" | "vp" | "direksi";
  wilayahCode: string | null;
  vpRegionId: number | null;
  companyCode: string | null;
  vpRegion: VpRegion | null;
}

const TIER_LABELS: Record<string, string> = { avp: "AVP Wilayah", vp: "VP Wilayah", direksi: "Direksi (Anper)" };

export default function ManagerScopePage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [tier, setTier] = useState<"avp" | "vp" | "direksi" | "">("");
  const [scopeValue, setScopeValue] = useState("");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<UserRow[]>;
    },
  });

  const { data: wilayahRes } = useQuery({
    queryKey: ["admin-regions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/regions");
      if (!res.ok) throw new Error("Failed to fetch wilayah");
      return res.json() as Promise<{ success: boolean; data: Wilayah[] }>;
    },
  });

  const { data: companiesRes } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const res = await fetch("/api/admin/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json() as Promise<{ success: boolean; data: Company[] }>;
    },
  });

  const { data: vpRegions = [] } = useQuery({
    queryKey: ["vp-regions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vp-regions");
      if (!res.ok) throw new Error("Failed to fetch VP regions");
      return res.json() as Promise<VpRegion[]>;
    },
  });

  const { data: currentScopeRes, isLoading: scopeLoading } = useQuery({
    queryKey: ["manager-scope", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;
      const res = await fetch(`/api/admin/manager-scope?userId=${encodeURIComponent(selectedUser.id)}`);
      if (!res.ok) throw new Error("Failed to fetch scope");
      return res.json() as Promise<{ success: boolean; data: ManagerScope | null }>;
    },
    enabled: !!selectedUser,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: any = { userId: selectedUser!.id, tier };
      if (tier === "avp") body.wilayahCode = scopeValue;
      if (tier === "vp") body.vpRegionId = Number(scopeValue);
      if (tier === "direksi") body.companyCode = scopeValue;

      const res = await fetch("/api/admin/manager-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save scope");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-scope", selectedUser?.id] });
      addToast({ title: "Scope disimpan", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/manager-scope?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete scope");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-scope", selectedUser?.id] });
      setTier("");
      setScopeValue("");
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

  const wilayahList = wilayahRes?.data || [];
  const companyList = companiesRes?.data || [];
  const currentScope = currentScopeRes?.data || null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Manager Scope Assignment</h1>
          <p className="text-sm text-muted-foreground">Assign user ke tier AVP / VP / Direksi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    onClick={() => {
                      setSelectedUser(u);
                      setTier("");
                      setScopeValue("");
                    }}
                  >
                    <div className="font-medium">{u.fullname || u.username}</div>
                    <div className="text-xs text-muted-foreground">{u.username}</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4" /> Scope
              {selectedUser && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  — {selectedUser.fullname || selectedUser.username}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedUser && (
              <div className="text-center py-8 text-muted-foreground text-sm">
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
                <div>
                  <Badge variant="outline">{TIER_LABELS[currentScope.tier]}</Badge>
                  <span className="text-sm ml-2">
                    {currentScope.tier === "avp" && currentScope.wilayahCode}
                    {currentScope.tier === "vp" && currentScope.vpRegion?.name}
                    {currentScope.tier === "direksi" && currentScope.companyCode}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(currentScope.id)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {selectedUser && !scopeLoading && !currentScope && (
              <div className="space-y-3">
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={tier}
                  onChange={(e) => { setTier(e.target.value as any); setScopeValue(""); }}
                >
                  <option value="">-- Pilih Tier --</option>
                  <option value="avp">AVP Wilayah</option>
                  <option value="vp">VP Wilayah</option>
                  <option value="direksi">Direksi (Anper)</option>
                </select>

                {tier === "avp" && (
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={scopeValue}
                    onChange={(e) => setScopeValue(e.target.value)}
                  >
                    <option value="">-- Pilih Wilayah --</option>
                    {wilayahList.map((w) => (
                      <option key={w.code} value={w.code}>{w.name}</option>
                    ))}
                  </select>
                )}

                {tier === "vp" && (
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={scopeValue}
                    onChange={(e) => setScopeValue(e.target.value)}
                  >
                    <option value="">-- Pilih Region --</option>
                    {vpRegions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                )}

                {tier === "direksi" && (
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={scopeValue}
                    onChange={(e) => setScopeValue(e.target.value)}
                  >
                    <option value="">-- Pilih Anper/Company --</option>
                    {companyList.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                )}

                <Button
                  size="sm"
                  disabled={!tier || !scopeValue || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [x] **Step 3: Manual verification**

Visit `/superadmin/settings/manager-scope`. Search a user, assign tier `vp` + a region created in Task 2, confirm it saves and displays. Delete it (X button), confirm the form reappears for re-assignment. Repeat for `avp` (wilayah select) and `direksi` (company select).

- [x] **Step 4: Commit**

```bash
git add src/app/superadmin/settings/manager-scope
git commit -m "feat: add manager scope assignment admin page"
```

---

## Task 7: Wire new pages into SuperAdmin settings nav

**Files:**
- Modify: `src/lib/menu-configs.tsx:247-250`

- [x] **Step 1: Add nav entries**

In `src/lib/menu-configs.tsx`, the SuperAdmin settings submenu currently reads (lines 244-251):

```typescript
          { name: "Konfigurasi Rekanan", path: "/superadmin/settings/transport" },
          { name: "Force Delete Tiket", path: "/superadmin/settings/tiket" },
          { name: "Konfigurasi All User", path: "/admin/pengaturan/user" },
          { name: "Area Scope User", path: "/superadmin/settings/area-scope" },
          { name: "Role & Menu Group", path: "/superadmin/settings/role-menu" },
          { name: "Menu Per User", path: "/superadmin/settings/user-menu" },
          { name: "Menu per Perusahaan", path: "/superadmin/settings/company-menu" },
        ],
      },
    ],
```

Replace with:

```typescript
          { name: "Konfigurasi Rekanan", path: "/superadmin/settings/transport" },
          { name: "Force Delete Tiket", path: "/superadmin/settings/tiket" },
          { name: "Konfigurasi All User", path: "/admin/pengaturan/user" },
          { name: "Area Scope User", path: "/superadmin/settings/area-scope" },
          { name: "Role & Menu Group", path: "/superadmin/settings/role-menu" },
          { name: "Menu Per User", path: "/superadmin/settings/user-menu" },
          { name: "Menu per Perusahaan", path: "/superadmin/settings/company-menu" },
          { name: "Mapping VP Region", path: "/superadmin/settings/vp-regions" },
          { name: "Manager Scope Assignment", path: "/superadmin/settings/manager-scope" },
        ],
      },
    ],
```

- [x] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [x] **Step 3: Manual verification**

Log in as superadmin, open the sidebar, confirm both new items appear under Pengaturan and navigate correctly.

- [x] **Step 4: Commit**

```bash
git add src/lib/menu-configs.tsx
git commit -m "feat: add manager hierarchy pages to superadmin nav"
```

---

## Reference table (for the user, not a code artifact)

| Tier | Scope granularity | Example values | Stored in |
|---|---|---|---|
| AVP Wilayah | 1 wilayah | Sumbagut, Sumbagsel, Kalbar, Kalselteng, Jabar & Banten, Jateng & DIY, Jatimbalinusa, Sulamapa | `ManagerScope.wilayahCode` (ASP.NET wilayah code) |
| VP Wilayah | Group of wilayah (dynamic) | Wilayah Barat = {Sumbagut, Sumbagsel, Jabar&Banten, Kalbar, Jateng&DIY}; Wilayah Timur = {Jatimbalinusa, Sulamapa, Kalselteng} | `ManagerScope.vpRegionId` → `VpRegion` → `VpRegionWilayah[]` |
| Direksi (per Anper) | 1 company/anper | PIM, PKT, PKG, PSP, PKC | `ManagerScope.companyCode` (= existing ASP.NET company_code) |

---

## Self-Review Notes

- Spec coverage: AVP list (8 wilayah), VP list (2 regions with dynamic membership, superadmin-editable), DIREKSI per anper (5 companies, dashboard already scopes to `companyCode` today via `/manager`) — all three tiers have a storage model and an admin UI task above.
- Dashboard-side enforcement (DIREKSI seeing only their own anper's data) already works today because `/manager` filters by `session.user.companyCode` — no new task needed there; only AVP/VP aggregation is deferred per user's explicit scope decision.
- No placeholders: every step has runnable code, no "TBD"/"handle appropriately" language.
- Type consistency checked: `ManagerScope.tier` values (`"avp" | "vp" | "direksi"`) match across Prisma schema (Task 1), API validation (Task 3), helper (Task 4), and UI (Task 6). `wilayahCode` naming matches between `VpRegionWilayah`, `ManagerScope`, and the `/api/admin/regions` response shape (`{ code, name }`).
