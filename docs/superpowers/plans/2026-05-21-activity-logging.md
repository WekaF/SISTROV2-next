# Activity Logging (Next.js Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log siapa yang login + aktivitas API mutations ke database PostgreSQL terpisah dari SISTROGROUP backend, dengan admin UI untuk melihat log.

**Architecture:** Prisma ORM + PostgreSQL database terpisah (`LOG_DATABASE_URL`). Single `AuditLog` table dengan `eventType` enum. NextAuth `events` callbacks tangkap auth events. API route wrapper `withAudit()` tangkap mutation events. Admin UI di `/admin/logs/nextjs`.

**Tech Stack:** Prisma 6.x, PostgreSQL, Next.js 16 App Router, TanStack Query, existing shadcn UI components, `next-auth` events API.

---

## Architecture Decision: Mengapa PostgreSQL + Prisma

| Opsi | Verdict |
|------|---------|
| PostgreSQL + Prisma | ✅ **Dipakai** — self-hosted, full control, queryable, TS types |
| SQLite + Prisma | Oke untuk dev lokal tapi masalah di multi-instance/server |
| Pino + file JSON | Cepat tapi no query UI, butuh log shipper |
| Better Stack / Axiom | SaaS bagus tapi external dependency + biaya |
| OpenTelemetry + Loki | Terlalu kompleks untuk kebutuhan ini |

PostgreSQL terpilih karena: data internal, bisa diquery dengan filter, bisa bangun admin UI, TypeScript terintegrasi via Prisma, dan project ini sudah pernah pakai PostgreSQL (lihat komentar di `.env.example`).

---

## File Structure

```
prisma/
  schema.prisma              # Prisma schema — AuditLog model
  migrations/                # Generated migrations

src/
  lib/
    prisma.ts                # Singleton Prisma client (LOG DB)
    audit-logger.ts          # logEvent() function — never throws

  app/
    api/
      admin/
        logs/
          nextjs/
            route.ts         # GET: query AuditLog from Prisma DB

    admin/
      logs/
        nextjs/
          page.tsx           # Admin UI: tabel log + filter

.env.local                   # Tambah LOG_DATABASE_URL
.env.example                 # Dokumentasikan LOG_DATABASE_URL
```

---

## Task 1: Install Prisma + Setup Database

**Files:**
- Modify: `package.json` (via npm install)
- Create: `prisma/schema.prisma`
- Modify: `.env.local`
- Modify: `.env.example`

- [ ] **Step 1: Install Prisma packages**

```powershell
npm install prisma @prisma/client
```

Expected output: `added 2 packages` (atau serupa)

- [ ] **Step 2: Init Prisma**

```powershell
npx prisma init --datasource-provider postgresql
```

Expected: folder `prisma/` terbuat dengan `schema.prisma` default.

- [ ] **Step 3: Tulis AuditLog schema**

Ganti seluruh isi `prisma/schema.prisma` dengan:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("LOG_DATABASE_URL")
}

model AuditLog {
  id          Int      @id @default(autoincrement())
  eventType   String   // LOGIN | LOGOUT | LOGIN_FAILED | COMPANY_SWITCH | API_CALL
  userId      String?
  username    String?
  role        String?
  companyCode String?
  ipAddress   String?
  userAgent   String?
  resource    String?  // API path, e.g. /api/kuota/schedule
  method      String?  // HTTP method: GET, POST, PUT, DELETE
  statusCode  Int?
  metadata    Json?    // extra context (error reason, request body summary, etc.)
  createdAt   DateTime @default(now())

  @@index([eventType])
  @@index([userId])
  @@index([username])
  @@index([createdAt])
  @@index([companyCode])
}
```

- [ ] **Step 4: Tambah LOG_DATABASE_URL ke .env.local**

Buka `.env.local`, tambahkan di bawah baris `NEXTAUTH_SECRET`:

```env
# Separate PostgreSQL DB for Next.js activity logging
# Format: postgresql://USER:PASSWORD@HOST:5432/DBNAME
LOG_DATABASE_URL=postgresql://postgres:password@localhost:5432/sistro_logs
```

Ganti `USER`, `PASSWORD`, `HOST`, `DBNAME` sesuai environment.

- [ ] **Step 5: Dokumentasikan di .env.example**

Tambahkan di `.env.example` setelah bagian `NEXTAUTH_SECRET`:

```env
# Separate PostgreSQL database for Next.js activity logging
# Create DB first: CREATE DATABASE sistro_logs;
LOG_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/sistro_logs
```

- [ ] **Step 6: Buat database PostgreSQL**

Jalankan di PostgreSQL client (psql / pgAdmin / DBeaver):

```sql
CREATE DATABASE sistro_logs;
```

- [ ] **Step 7: Run migration**

```powershell
npx prisma migrate dev --name init-audit-log
```

Expected:
```
✔ Generated Prisma Client
✔ Applied migration `20260521000000_init_audit_log`
```

- [ ] **Step 8: Verify migration berhasil**

```powershell
npx prisma studio
```

Buka browser → verifikasi tabel `AuditLog` muncul. Close studio.

- [ ] **Step 9: Commit**

```bash
git add prisma/ .env.example
git commit -m "feat(logging): add Prisma schema for AuditLog — separate PostgreSQL DB"
```

---

## Task 2: Prisma Client Singleton + logEvent()

**Files:**
- Create: `src/lib/prisma.ts`
- Create: `src/lib/audit-logger.ts`

- [ ] **Step 1: Buat singleton Prisma client**

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaLog: PrismaClient | undefined;
};

export const prismaLog =
  globalForPrisma.prismaLog ??
  new PrismaClient({
    datasources: { db: { url: process.env.LOG_DATABASE_URL } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaLog = prismaLog;
}
```

> **Kenapa singleton?** Next.js dev mode hot-reload tanpa singleton = ratusan koneksi DB terbuka. Pattern `globalThis` adalah cara standar untuk Next.js.

- [ ] **Step 2: Buat audit-logger.ts**

Create `src/lib/audit-logger.ts`:

```typescript
import { prismaLog } from "@/lib/prisma";

export type AuditEventType =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "COMPANY_SWITCH"
  | "API_CALL";

interface LogEventData {
  eventType: AuditEventType;
  userId?: string;
  username?: string;
  role?: string;
  companyCode?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

export async function logEvent(data: LogEventData): Promise<void> {
  try {
    await prismaLog.auditLog.create({ data });
  } catch (err) {
    // Logging must never crash the app
    console.error("[audit-logger] failed to write log:", err);
  }
}
```

> **Kenapa tidak throw?** Log failure tidak boleh break aplikasi utama. Silent fail + console.error adalah pattern yang benar.

- [ ] **Step 3: Test manual — verifikasi logEvent bisa tulis ke DB**

Buat file sementara `src/app/api/test-log/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/audit-logger";

export async function GET() {
  await logEvent({
    eventType: "LOGIN",
    userId: "test-user-123",
    username: "testuser",
    role: "superadmin",
    companyCode: "PIHI",
    ipAddress: "127.0.0.1",
    resource: "/api/test-log",
    method: "GET",
    statusCode: 200,
    metadata: { note: "manual test" },
  });
  return NextResponse.json({ ok: true });
}
```

Jalankan dev server (`npm run dev`), buka `http://localhost:3000/api/test-log`.

Verify di `npx prisma studio` → tabel AuditLog → row baru muncul.

- [ ] **Step 4: Hapus test endpoint**

```bash
git rm src/app/api/test-log/route.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/prisma.ts src/lib/audit-logger.ts
git commit -m "feat(logging): add Prisma singleton + logEvent() — never throws"
```

---

## Task 3: Log Auth Events (Login, Logout, Failed Login)

**Files:**
- Modify: `src/lib/auth.ts`

NextAuth punya dua mekanisme:
- `events` callbacks → untuk LOGIN sukses dan LOGOUT
- `authorize()` function → untuk LOGIN_FAILED (karena throw error di sini)

- [ ] **Step 1: Baca ulang src/lib/auth.ts**

Sudah dibaca di awal. Lokasi yang akan dimodifikasi:
- `authorize()` function: tambah logEvent pada catch block dan setelah return
- Tambah `events` object setelah `pages` config

- [ ] **Step 2: Modifikasi authorize() — log failed + successful login**

Di `src/lib/auth.ts`, tambah import di baris pertama:

```typescript
import { logEvent } from "@/lib/audit-logger";
```

Ganti blok `try/catch` yang fetch ke backend di `authorize()`:

```typescript
// Di dalam authorize() — GANTI blok try/catch yang ada:
let data: any;
let clientIp: string | undefined;
try {
  const res = await fetch(`${ASPNET_API_URL}/Token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    let errMsg = "Login gagal";
    try { errMsg = JSON.parse(text)?.error_description || text || errMsg; } catch {}
    // Log failed login
    await logEvent({
      eventType: "LOGIN_FAILED",
      username: credentials.username,
      metadata: { reason: errMsg },
    });
    throw new Error(errMsg);
  }
  data = await res.json();
} catch (err: any) {
  if (err.message !== "Login gagal" && !err.message?.includes("error_description")) {
    // Network/connection error — also log
    await logEvent({
      eventType: "LOGIN_FAILED",
      username: credentials.username,
      metadata: { reason: err.message || "Connection error" },
    });
  }
  throw new Error(err?.message || "Tidak dapat terhubung ke server");
}
```

> **Catatan:** Blok try/catch di atas menggantikan blok yang sudah ada di `authorize()` (baris 108-126 di auth.ts). Perhatikan kondisi guard di catch untuk menghindari double-log.

- [ ] **Step 3: Tambah events callbacks ke authOptions**

Di `src/lib/auth.ts`, tambah `events` setelah `pages`:

```typescript
  // Setelah bagian pages: { signIn: "/login", error: "/login" }
  events: {
    async signIn({ user }) {
      await logEvent({
        eventType: "LOGIN",
        userId:      (user as any).id,
        username:    (user as any).username,
        role:        (user as any).role,
        companyCode: (user as any).companyCode,
      });
    },
    async signOut({ token }) {
      await logEvent({
        eventType: "LOGOUT",
        userId:      token?.sub,
        username:    token?.username as string | undefined,
        role:        token?.role as string | undefined,
        companyCode: token?.companyCode as string | undefined,
      });
    },
  },
```

- [ ] **Step 4: Log company switch event**

Di `src/lib/auth.ts`, di dalam `jwt` callback, cari blok `if (trigger === "update" && updateData)`:

```typescript
// Setelah: if (updateData.companyCode) token.companyCode = updateData.companyCode;
// Tambahkan:
if (updateData.aspnetToken || updateData.companyCode) {
  await logEvent({
    eventType:   "COMPANY_SWITCH",
    userId:      token.sub,
    username:    token.username as string | undefined,
    role:        token.role as string | undefined,
    companyCode: updateData.companyCode as string | undefined,
    metadata:    { previousCompany: token.companyCode },
  });
}
```

- [ ] **Step 5: Test login/logout flow**

Jalankan dev server. Login dengan user valid → cek `npx prisma studio` → row `LOGIN` muncul. Logout → row `LOGOUT` muncul. Login salah password → row `LOGIN_FAILED` muncul.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(logging): log auth events (LOGIN, LOGOUT, LOGIN_FAILED, COMPANY_SWITCH) via NextAuth events callbacks"
```

---

## Task 4: Log API Mutation Activities (withAudit wrapper)

**Files:**
- Create: `src/lib/with-audit.ts`
- Modify: beberapa route handlers yang penting (contoh: kuota update, posto, tiket)

Strategy: Bukan wrap SEMUA route, tapi wrap route-route yang penting/mutable (POST/PUT/DELETE yang mengubah data bisnis kritikal).

- [ ] **Step 1: Buat withAudit wrapper**

Create `src/lib/with-audit.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logEvent } from "@/lib/audit-logger";

type RouteHandler = (
  req: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

function getClientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}

export function withAudit(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    const MUTABLE_METHODS = ["POST", "PUT", "DELETE", "PATCH"];
    if (!MUTABLE_METHODS.includes(req.method)) {
      return handler(req, context);
    }

    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const response = await handler(req, context);
    const pathname = new URL(req.url).pathname;

    await logEvent({
      eventType:   "API_CALL",
      userId:      user?.id,
      username:    user?.username,
      role:        user?.role,
      companyCode: user?.companyCode,
      ipAddress:   getClientIp(req),
      userAgent:   req.headers.get("user-agent") ?? undefined,
      resource:    pathname,
      method:      req.method,
      statusCode:  response.status,
    });

    return response;
  };
}
```

- [ ] **Step 2: Terapkan withAudit ke route penting**

Contoh — `src/app/api/kuota/level2/[id]/update/route.ts`:

```typescript
// Tambah import di atas
import { withAudit } from "@/lib/with-audit";

// Wrap export handler
export const POST = withAudit(async function(req, context) {
  // ... existing handler code unchanged ...
});
```

Terapkan ke route-route ini (masing-masing hanya tambah import + wrap):
- `src/app/api/kuota/level2/[id]/update/route.ts`
- `src/app/api/kuota/level3/[id]/update/route.ts`
- `src/app/api/kuota/level4/[id]/route.ts` (jika ada POST/PUT)
- `src/app/api/pod/posto/route.ts`
- `src/app/api/pod/posto/[id]/route.ts`
- `src/app/api/armada/percepatan/route.ts`
- `src/app/api/user/switch-company/route.ts`

> **Tidak perlu wrap semua route.** GET-only routes dan proxy routes yang hanya meneruskan ke backend tidak perlu di-audit di Next.js layer (backend sudah punya lognya sendiri). Focus pada mutations yang diproses di Next.js atau yang secara bisnis kritikal.

- [ ] **Step 3: Test satu route**

Buka app, lakukan aksi yang memanggil salah satu route yang sudah di-wrap (misal update kuota). Cek `npx prisma studio` → tabel AuditLog → row `API_CALL` muncul dengan `resource`, `method`, dan `statusCode`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/with-audit.ts src/app/api/kuota/ src/app/api/pod/posto/ src/app/api/armada/ src/app/api/user/switch-company/
git commit -m "feat(logging): add withAudit() wrapper — log API mutations for key routes"
```

---

## Task 5: Admin API Route untuk Query AuditLog

**Files:**
- Create: `src/app/api/admin/logs/nextjs/route.ts`

- [ ] **Step 1: Buat API route**

Create `src/app/api/admin/logs/nextjs/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || !["superadmin", "ti"].includes(role?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const eventType  = searchParams.get("eventType") ?? undefined;
  const username   = searchParams.get("username") ?? undefined;
  const companyCode = searchParams.get("companyCode") ?? undefined;
  const dateFrom   = searchParams.get("dateFrom") ?? undefined;
  const dateTo     = searchParams.get("dateTo") ?? undefined;

  const where: Record<string, unknown> = {};
  if (eventType)   where.eventType   = eventType;
  if (username)    where.username    = { contains: username, mode: "insensitive" };
  if (companyCode) where.companyCode = companyCode;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo   ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
    };
  }

  try {
    const [total, rows] = await Promise.all([
      prismaLog.auditLog.count({ where }),
      prismaLog.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:  (page - 1) * limit,
        take:  limit,
      }),
    ]);

    return NextResponse.json({ data: rows, total, page, limit });
  } catch (err: any) {
    console.error("[logs/nextjs]", err.message);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test endpoint**

Dengan dev server jalan, buka:
```
http://localhost:3000/api/admin/logs/nextjs?limit=10
```

Expected JSON: `{ data: [...], total: N, page: 1, limit: 10 }`

Test filter: `?eventType=LOGIN&username=admin`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/logs/nextjs/route.ts
git commit -m "feat(logging): admin API route to query AuditLog with filters (eventType, username, companyCode, dateRange)"
```

---

## Task 6: Admin UI — Log Viewer Page

**Files:**
- Create: `src/app/admin/logs/nextjs/page.tsx`

Pattern mengikuti `src/app/admin/users/page.tsx` yang sudah ada: client component, TanStack Query, shadcn Card/Input/Button.

- [ ] **Step 1: Buat halaman log viewer**

Create `src/app/admin/logs/nextjs/page.tsx`:

```typescript
"use client";
import React, { useState } from "react";
import { Search, RefreshCw, LogIn, LogOut, AlertTriangle, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";

const PAGE_SIZE = 50;

const EVENT_BADGE: Record<string, { label: string; color: string }> = {
  LOGIN:          { label: "Login",          color: "bg-green-100 text-green-800" },
  LOGOUT:         { label: "Logout",         color: "bg-gray-100 text-gray-700" },
  LOGIN_FAILED:   { label: "Login Gagal",    color: "bg-red-100 text-red-800" },
  COMPANY_SWITCH: { label: "Ganti Company",  color: "bg-blue-100 text-blue-800" },
  API_CALL:       { label: "API Call",       color: "bg-purple-100 text-purple-800" },
};

export default function NextjsActivityLogPage() {
  const [page, setPage]             = useState(1);
  const [filterUsername, setFilterUsername] = useState("");
  const [filterEvent, setFilterEvent]       = useState("");
  const [filterCompany, setFilterCompany]   = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo]     = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    username: "", eventType: "", companyCode: "", dateFrom: "", dateTo: "",
  });

  const params = new URLSearchParams({
    page:  String(page),
    limit: String(PAGE_SIZE),
    ...(appliedFilters.username    ? { username:    appliedFilters.username }    : {}),
    ...(appliedFilters.eventType   ? { eventType:   appliedFilters.eventType }   : {}),
    ...(appliedFilters.companyCode ? { companyCode: appliedFilters.companyCode } : {}),
    ...(appliedFilters.dateFrom    ? { dateFrom:    appliedFilters.dateFrom }    : {}),
    ...(appliedFilters.dateTo      ? { dateTo:      appliedFilters.dateTo }      : {}),
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["nextjs-audit-log", page, appliedFilters],
    queryFn: async () => {
      const res = await fetch(`/api/admin/logs/nextjs?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal fetch log");
      return json as { data: any[]; total: number; page: number; limit: number };
    },
  });

  const rows  = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function applyFilters() {
    setPage(1);
    setAppliedFilters({
      username:    filterUsername,
      eventType:   filterEvent,
      companyCode: filterCompany,
      dateFrom:    filterDateFrom,
      dateTo:      filterDateTo,
    });
  }

  function resetFilters() {
    setFilterUsername(""); setFilterEvent(""); setFilterCompany("");
    setFilterDateFrom(""); setFilterDateTo("");
    setPage(1);
    setAppliedFilters({ username: "", eventType: "", companyCode: "", dateFrom: "", dateTo: "" });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity Log (Next.js)</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Input
              placeholder="Username..."
              value={filterUsername}
              onChange={(e) => setFilterUsername(e.target.value)}
            />
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
            >
              <option value="">Semua Event</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="LOGIN_FAILED">Login Gagal</option>
              <option value="COMPANY_SWITCH">Ganti Company</option>
              <option value="API_CALL">API Call</option>
            </select>
            <Input
              placeholder="Company Code..."
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            />
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={applyFilters}>
              <Search className="w-4 h-4 mr-2" /> Filter
            </Button>
            <Button size="sm" variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Memuat log...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Tidak ada data log</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-gray-600">
                  <th className="pb-2 pr-4">Waktu</th>
                  <th className="pb-2 pr-4">Event</th>
                  <th className="pb-2 pr-4">Username</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Company</th>
                  <th className="pb-2 pr-4">Resource</th>
                  <th className="pb-2 pr-4">IP</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => {
                  const badge = EVENT_BADGE[row.eventType] ?? { label: row.eventType, color: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 whitespace-nowrap text-xs text-gray-500">
                        {new Date(row.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-medium">{row.username ?? "-"}</td>
                      <td className="py-2 pr-4 text-xs">{row.role ?? "-"}</td>
                      <td className="py-2 pr-4 text-xs">{row.companyCode ?? "-"}</td>
                      <td className="py-2 pr-4 text-xs font-mono max-w-[180px] truncate" title={row.resource ?? ""}>
                        {row.method ? `[${row.method}] ` : ""}{row.resource ?? "-"}
                      </td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{row.ipAddress ?? "-"}</td>
                      <td className="py-2 text-xs">
                        {row.statusCode ? (
                          <span className={row.statusCode < 400 ? "text-green-600" : "text-red-600"}>
                            {row.statusCode}
                          </span>
                        ) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>Total: {total} log | Halaman {page}/{totalPages}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Prev
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Test UI**

Buka `http://localhost:3000/admin/logs/nextjs`. Harus tampil tabel dengan data log. Test filter per event type, username, dan date range.

- [ ] **Step 3: Tambah ke sidebar menu (opsional)**

Cari di `src/components/app-sidebar.tsx` atau `src/components/layout/AppSidebar.tsx` — tambah link ke `/admin/logs/nextjs` di bawah menu Logs/Admin.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/logs/nextjs/
git commit -m "feat(logging): admin UI log viewer page with filters (event, username, company, date range)"
```

---

## Task 7: Log Retention — Hapus Log Lama (Opsional tapi Direkomendasikan)

**Files:**
- Create: `src/app/api/admin/logs/nextjs/cleanup/route.ts`

Tanpa cleanup, tabel `AuditLog` akan terus membesar. Strategi: DELETE log yang lebih tua dari N hari via API endpoint yang bisa dipanggil manual atau via cron.

- [ ] **Step 1: Buat cleanup route**

Create `src/app/api/admin/logs/nextjs/cleanup/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismaLog } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || role?.toLowerCase() !== "ti") {
    return NextResponse.json({ error: "Unauthorized — hanya role TI" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const keepDays = Math.max(7, parseInt(searchParams.get("keepDays") ?? "90", 10));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);

  const result = await prismaLog.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return NextResponse.json({ deleted: result.count, cutoff: cutoff.toISOString() });
}
```

Panggil manual: `DELETE /api/admin/logs/nextjs/cleanup?keepDays=90`

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/logs/nextjs/cleanup/route.ts
git commit -m "feat(logging): log cleanup endpoint — DELETE logs older than N days (default 90)"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Log siapa yang login → Task 3 (LOGIN event di NextAuth `events.signIn`)
- [x] Log login gagal → Task 3 (LOGIN_FAILED di `authorize()` catch)
- [x] Log logout → Task 3 (LOGOUT di `events.signOut`)
- [x] Log company switch → Task 3 (COMPANY_SWITCH di jwt callback)
- [x] Log aktivitas API → Task 4 (`withAudit` wrapper)
- [x] Database terpisah dari SISTROGROUP → Task 1 (`LOG_DATABASE_URL` env var, separate PG DB)
- [x] Admin UI untuk melihat log → Task 6
- [x] Filter log → Task 5 + Task 6
- [x] Retention/cleanup → Task 7

**Placeholder scan:** Tidak ada TBD/TODO dalam plan ini.

**Type consistency:**
- `logEvent()` signature konsisten di semua task
- `prismaLog` (bukan `prisma`) dipakai konsisten untuk membedakan dari future general Prisma client
- `AuditEventType` union type konsisten dengan `eventType` column di schema

---

## Catatan Implementasi Tambahan

**IP address caveat:** Di balik proxy/nginx, pastikan `x-forwarded-for` header di-trust. Tambahkan ke nginx config: `proxy_set_header X-Forwarded-For $remote_addr;`

**Production:** Pastikan `LOG_DATABASE_URL` ada di environment production (Vercel, VPS, dll).

**Database PostgreSQL terpisah vs schema terpisah:** Plan ini pakai database terpisah (`sistro_logs`). Kalau mau pakai server yang sama cukup ganti nama DB di `LOG_DATABASE_URL`. Tidak perlu server PostgreSQL baru.

**Prisma generate setelah deploy:** Pastikan `npx prisma generate` dijalankan di build step. Tambahkan ke `package.json` scripts jika perlu: `"postinstall": "prisma generate"`.
