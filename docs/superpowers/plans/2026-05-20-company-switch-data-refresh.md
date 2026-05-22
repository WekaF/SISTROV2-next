# Company Switch Data Refresh Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix pages (posto, tiket, armada, dll) yang tidak refresh data saat user switch company via CompanySwitcher.

**Architecture:** Root cause adalah race condition — `CompanyContext.switchCompany()` memanggil `updateSession()` lalu langsung `invalidateQueries()`, tapi `useSession()` belum update karena NextAuth propagation async. Saat queries refetch, `useApi()` masih pakai Bearer token lama → ASP.NET kembalikan data company lama. Fix utama: simpan `aspnetToken` di CompanyContext state (update langsung), bukan hanya di session. Secondary fixes: halaman yang baca `session.user.companyCode` langsung (bukan CompanyContext) juga tidak update.

**Tech Stack:** Next.js 15, NextAuth v4, TanStack Query v5, TypeScript

---

## Root Cause Analysis

### Bug 1 (Primary — semua halaman yang pakai `useApi()`)

`src/context/CompanyContext.tsx:96-105`:
```
await updateSession({ aspnetToken, companyCode }); // resolves, tapi useSession() belum update
setActiveCompanyCode(code);
await queryClient.invalidateQueries({ queryKey: [] }); // queries refetch dgn token LAMA
```

`useApi()` di `src/hooks/use-api.ts:17`:
```
const token = (session?.user as any)?.aspnetToken // dari useSession() → masih OLD token
```

Saat query refetch → `apiTable("/api/POSTO/DataTableFilter", payload)` kirim Bearer token lama → ASP.NET filter berdasarkan token → data company lama dikembalikan.

### Bug 2 (Secondary — `armada/percepatan`)

`src/app/armada/percepatan/page.tsx:41`:
```
const sessionPlant = (session?.user as any)?.companyCode || ""; // baca dari session langsung
```
queryKey `["armada-percepatan"]` tidak include companyCode. Global `invalidateQueries` AKAN trigger refetch, tapi API route `/api/armada/percepatan` juga baca token dari `getServerSession()` — kalau JWT cookie belum update, data masih lama.

### Bug 3 (Secondary — `admin/pengaturan/user`)

`src/app/admin/pengaturan/user/page.tsx:25`:
```
const companyCode = (session?.user as any)?.companyCode || ""; // baca dari session langsung
```
queryKey `["plant-users-all", companyCode]` — karena `companyCode` dari session tidak update, query tidak refetch dengan company baru.

---

## File Map

| File | Action | Alasan |
|------|--------|--------|
| `src/context/CompanyContext.tsx` | Modify | Tambah `aspnetToken` state, expose via context, update segera saat switch |
| `src/hooks/use-api.ts` | Modify | Baca token dari CompanyContext (segera) bukan hanya `useSession()` (delayed) |
| `src/app/armada/percepatan/page.tsx` | Modify | Ganti `session.user.companyCode` → `useCompany()`, tambah companyCode ke queryKey |
| `src/app/admin/pengaturan/user/page.tsx` | Modify | Ganti `session.user.companyCode` → `useCompany()` |

---

## Task 1: Tambah `aspnetToken` ke CompanyContext

**Files:**
- Modify: `src/context/CompanyContext.tsx`

- [ ] **Step 1: Update `CompanyContextValue` interface — tambah `aspnetToken`**

Buka `src/context/CompanyContext.tsx`. Ganti interface:

```typescript
interface CompanyContextValue {
  companies: Company[];
  activeCompanyCode: string | null;
  aspnetToken: string | null;        // <-- tambah ini
  isLoading: boolean;
  switchCompany: (code: string) => Promise<void>;
}
```

- [ ] **Step 2: Tambah `aspnetToken` state di `CompanyProvider`**

Di dalam `CompanyProvider`, setelah baris `const sessionCompanyCode = ...`, tambah:

```typescript
// Fallback: aspnetToken from JWT session
const sessionAspnetToken = (session?.user as any)?.aspnetToken as string | null | undefined;

const [activeAspnetToken, setActiveAspnetToken] = useState<string | null>(null);
```

- [ ] **Step 3: Update `switchCompany` — set token SEGERA, jangan tunggu updateSession**

Ganti blok `switchCompany` (baris 80–112) seluruhnya:

```typescript
const switchCompany = useCallback(
  async (code: string) => {
    if (code === activeCompanyCode) return;
    try {
      const res = await fetch("/api/user/switch-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode: code }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal berganti plant");
      }

      // Update token state SEGERA (sebelum invalidateQueries)
      // sehingga saat queries refetch, useApi() sudah punya token baru
      if (json.aspnetToken) {
        setActiveAspnetToken(json.aspnetToken);
        // Update NextAuth session async (untuk persistence setelah page reload)
        // Tidak di-await — jangan delay query invalidation
        updateSession({
          aspnetToken: json.aspnetToken,
          companyCode: json.companyCode,
        }).catch((err) =>
          console.warn("[CompanyContext] updateSession error:", err)
        );
      }

      // Update local state & bust all query caches
      setActiveCompanyCode(code);
      await queryClient.invalidateQueries({ queryKey: [] });
    } catch (err) {
      console.error("[CompanyContext] switchCompany error:", err);
      throw err;
    }
  },
  [activeCompanyCode, queryClient, updateSession]
);
```

- [ ] **Step 4: Hitung `effectiveAspnetToken` dan expose di context**

Ganti baris `effectiveCompanyCode` dan `return` (baris 114–128):

```typescript
// Effective code: context state → session fallback
const effectiveCompanyCode = activeCompanyCode ?? sessionCompanyCode ?? null;
// Effective token: context state → session fallback
const effectiveAspnetToken = activeAspnetToken ?? sessionAspnetToken ?? null;

return (
  <CompanyContext.Provider
    value={{
      companies,
      activeCompanyCode: effectiveCompanyCode,
      aspnetToken: effectiveAspnetToken,
      isLoading,
      switchCompany,
    }}
  >
    {children}
  </CompanyContext.Provider>
);
```

- [ ] **Step 5: Export `useCompanySafe` untuk dipakai di hooks**

Tambah setelah `useCompany()`:

```typescript
/** Aman dipakai di luar CompanyProvider — kembalikan null jika di luar konteks */
export function useCompanySafe(): CompanyContextValue | null {
  return useContext(CompanyContext) ?? null;
}
```

- [ ] **Step 6: Verifikasi TypeScript tidak error**

```powershell
cd C:\Users\weka\Indigo\SISTROV2-next
rtk tsc --noEmit
```

Expected: 0 errors (atau hanya error yang tidak berhubungan dengan perubahan ini)

- [ ] **Step 7: Commit**

```bash
git add src/context/CompanyContext.tsx
git commit -m "fix: store aspnetToken in CompanyContext state for immediate availability on company switch"
```

---

## Task 2: Update `useApi()` — baca token dari CompanyContext

**Files:**
- Modify: `src/hooks/use-api.ts`

- [ ] **Step 1: Import `useCompanySafe`**

Tambah import di baris 1 (setelah `"use client";`):

```typescript
import { useCompanySafe } from "@/context/CompanyContext";
```

- [ ] **Step 2: Ganti sumber token**

Ganti baris `const token = (session?.user as any)?.aspnetToken...`:

```typescript
export function useApi() {
  const { data: session } = useSession();
  const companyCtx = useCompanySafe();

  // Prefer CompanyContext token (updated immediately on switch)
  // Fall back to session token (may lag by one NextAuth round-trip)
  const sessionToken = (session?.user as any)?.aspnetToken as string | undefined;
  const token = (companyCtx?.aspnetToken ?? sessionToken) as string | undefined;
  ...
```

Pastikan sisa function tidak berubah — hanya tambah `companyCtx` dan ganti 1 baris `token`.

- [ ] **Step 3: Verifikasi TypeScript tidak error**

```powershell
rtk tsc --noEmit
```

Expected: 0 errors baru

- [ ] **Step 4: Manual test — switch company di browser**

1. Buka app, login, pergi ke halaman Posto
2. Catat data yang ditampilkan (company A)
3. Switch ke company lain via CompanySwitcher
4. Data Posto harus refresh dan tampilkan data company baru

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-api.ts
git commit -m "fix: use CompanyContext aspnetToken in useApi to avoid session race condition on company switch"
```

---

## Task 3: Fix `armada/percepatan` — ganti `session.user.companyCode` → `useCompany()`

**Files:**
- Modify: `src/app/armada/percepatan/page.tsx`

- [ ] **Step 1: Tambah import `useCompany`, hapus `useSession` jika tidak dipakai lain**

Cek baris import di bagian atas file. `useSession` dipakai di baris 37. Cek apakah dipakai untuk hal lain selain `companyCode`. 

Tambah import:
```typescript
import { useCompany } from "@/context/CompanyContext";
```

- [ ] **Step 2: Ganti `sessionPlant` menggunakan `activeCompanyCode`**

Baris 37–41, ganti:
```typescript
// BEFORE:
const { data: session } = useSession();
// ...
const sessionPlant: string = (session?.user as any)?.companyCode || "";

// AFTER:
const { data: session } = useSession(); // biarkan jika masih dipakai oleh hal lain
const { activeCompanyCode } = useCompany();
const sessionPlant: string = activeCompanyCode || "";
```

- [ ] **Step 3: Tambah `sessionPlant` ke queryKey**

Cari baris `queryKey: ["armada-percepatan"]` (sekitar baris 52), ganti:

```typescript
queryKey: ["armada-percepatan", sessionPlant],
```

Ini memastikan query refetch otomatis ketika `activeCompanyCode` berubah, tanpa mengandalkan global invalidation.

- [ ] **Step 4: Verifikasi TypeScript**

```powershell
rtk tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/armada/percepatan/page.tsx
git commit -m "fix: use CompanyContext activeCompanyCode in armada/percepatan page"
```

---

## Task 4: Fix `admin/pengaturan/user` — ganti `session.user.companyCode` → `useCompany()`

**Files:**
- Modify: `src/app/admin/pengaturan/user/page.tsx`

- [ ] **Step 1: Tambah import `useCompany`**

Tambah setelah baris `import { useSession } from "next-auth/react";`:

```typescript
import { useCompany } from "@/context/CompanyContext";
```

- [ ] **Step 2: Ganti sumber `companyCode`**

Baris 25, ganti:
```typescript
// BEFORE:
const companyCode = (session?.user as any)?.companyCode || "";

// AFTER:
const { activeCompanyCode } = useCompany();
const companyCode = activeCompanyCode || "";
```

Pastikan `useSession` masih ada jika dipakai untuk hal lain di file ini (cek baris lain).

- [ ] **Step 3: Verifikasi TypeScript**

```powershell
rtk tsc --noEmit
```

- [ ] **Step 4: Manual test**

1. Login sebagai admin, buka halaman `/admin/pengaturan/user`
2. Data user ditampilkan untuk company aktif
3. Switch company → data user harus berubah sesuai company baru

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/pengaturan/user/page.tsx
git commit -m "fix: use CompanyContext activeCompanyCode in admin user settings page"
```

---

## Task 5: Verifikasi menyeluruh semua halaman utama

Tidak ada code change di task ini — ini adalah verification pass.

- [ ] **Step 1: Start dev server**

```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```

- [ ] **Step 2: Test posto page**

1. Login sebagai staffarea/superadmin dengan 2+ company
2. Buka `/posto`
3. Catat data (nomor posto, tanggal, dll)
4. Switch company via dropdown header
5. Data tabel harus berubah → data company baru

- [ ] **Step 3: Test tiket page**

1. Buka `/tiket`
2. Switch company
3. Data tiket harus berubah

- [ ] **Step 4: Test armada page**

1. Buka `/armada`
2. Switch company
3. Data armada harus berubah

- [ ] **Step 5: Test armada/percepatan**

1. Buka `/armada/percepatan`
2. Switch company
3. Data percepatan harus berubah

- [ ] **Step 6: Test bahwa halaman lain tidak rusak**

1. Test login/logout normal
2. Test navigasi antara halaman tanpa switch company
3. Test page reload setelah switch → data harus persist (via cookie + JWT)

---

## Self-Review

### Spec Coverage
- ✅ Posto tidak update → fixed via Task 1+2 (aspnetToken di context)
- ✅ Tiket tidak update → fixed via Task 1+2
- ✅ Armada percepatan tidak update → fixed via Task 3
- ✅ Admin user settings tidak update → fixed via Task 4
- ✅ Halaman lain yang pakai `useApi()` → fixed via Task 2 (semua pakai hook yang sama)

### Items di Luar Scope (tidak di-fix, by design)
- `ViewerDashboard` stream tidak scoped ke company — **intentional**: viewer role melihat data global semua plant
- `profile/page.tsx` baca `session.user.companyCode` — **display-only**, tidak pakai untuk data fetching
- Posto internal `invalidateQueries` queryKey mismatch (`["posto"]` vs `["posto", companyCode, dateFilter]`) — ini bug mutasi internal, bukan company switch, perbaiki di issue terpisah

### Type Consistency
- `useCompanySafe()` return type adalah `CompanyContextValue | null` — konsisten dengan `useCompany()` return type
- `aspnetToken: string | null` di `CompanyContextValue` — konsisten dengan type di state
- `companyCtx?.aspnetToken ?? sessionToken` — `??` operator safe untuk `null | undefined`
