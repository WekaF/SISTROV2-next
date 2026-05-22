# Redirect All API Calls to sistro-dev.pupuk-indonesia.com

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pastikan semua API call dari Next.js mengarah ke `https://sistro-dev.pupuk-indonesia.com` (ganti dari `http://192.168.188.170:8090`).

**Architecture:** Backend URL dikontrol melalui dua mekanisme: (1) env var `ASPNET_API_URL` / `NEXT_PUBLIC_ASPNET_API_URL` yang dibaca di runtime, dan (2) hardcoded fallback string `"http://192.168.188.170:8090"` di 19 file sebagai nilai default bila env var tidak di-set. Kedua mekanisme harus diupdate.

**Tech Stack:** Next.js 16, TypeScript, env vars, proxy via `next.config.ts` rewrites.

---

## File Map

| File | Perubahan |
|------|-----------|
| `.env.local` | Update dua env var ke URL baru |
| `.env.example` | Update nilai contoh + komentar |
| `next.config.ts` | Update fallback string |
| `src/lib/api-client.ts` | Update fallback string |
| `src/lib/auth.ts` | Update fallback string |
| `src/app/api/user/switch-company/route.ts` | Update fallback string |
| `src/app/api/user/active-company/route.ts` | Update fallback string |
| `src/app/api/transport/dashboard/route.ts` | Update fallback string |
| `src/app/api/armada/upload/route.ts` | Update fallback string |
| `src/app/api/kuota/shifts/route.ts` | Update fallback string |
| `src/app/api/kuota/schedule/route.ts` | Update fallback string |
| `src/app/api/kuota/lookup/route.ts` | Update fallback string |
| `src/app/api/kuota/level2/[id]/route.ts` | Update fallback string |
| `src/app/api/kuota/level2/[id]/update/route.ts` | Update fallback string |
| `src/app/api/kuota/level3/[id]/route.ts` | Update fallback string |
| `src/app/api/kuota/level3/[id]/update/route.ts` | Update fallback string |
| `src/app/api/kuota/level4/[id]/route.ts` | Update fallback string |
| `src/app/api/pod/kuota/route.ts` | Update fallback string |
| `src/app/api/pod/kuota/[id]/route.ts` | Update fallback string |
| `src/app/api/admin/transport/route.ts` | Update fallback string |
| `src/app/api/admin/transport/users/route.ts` | Update fallback string |
| `src/app/api/admin/plants/route.ts` | Update fallback string |

---

## Task 1: Update Environment Files

**Files:**
- Modify: `.env.local`
- Modify: `.env.example`

- [ ] **Step 1: Update `.env.local`**

Ganti baris:
```
ASPNET_API_URL=http://192.168.188.170:8090
NEXT_PUBLIC_ASPNET_API_URL=http://192.168.188.170:8090
```
Menjadi:
```
ASPNET_API_URL=https://sistro-dev.pupuk-indonesia.com
NEXT_PUBLIC_ASPNET_API_URL=https://sistro-dev.pupuk-indonesia.com
```

- [ ] **Step 2: Update `.env.example`**

Ganti baris:
```
# Dev/testing  : http://192.168.188.170:8090
# Production   : https://sistro.pupuk-indonesia.com
ASPNET_API_URL=http://192.168.188.170:8090
NEXT_PUBLIC_ASPNET_API_URL=http://192.168.188.170:8090
```
Menjadi:
```
# Dev/testing  : https://sistro-dev.pupuk-indonesia.com
# Production   : https://sistro.pupuk-indonesia.com
ASPNET_API_URL=https://sistro-dev.pupuk-indonesia.com
NEXT_PUBLIC_ASPNET_API_URL=https://sistro-dev.pupuk-indonesia.com
```

- [ ] **Step 3: Commit**

```bash
git add .env.local .env.example
git commit -m "config: point ASPNET_API_URL to sistro-dev.pupuk-indonesia.com"
```

---

## Task 2: Update Core Config & Library Files

**Files:**
- Modify: `next.config.ts:3`
- Modify: `src/lib/api-client.ts:9`
- Modify: `src/lib/auth.ts:85`

- [ ] **Step 1: Update `next.config.ts` fallback (baris 3)**

```typescript
// before
const ASPNET_URL = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";

// after
const ASPNET_URL = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";
```

- [ ] **Step 2: Update `src/lib/api-client.ts` fallback (baris 9)**

```typescript
// before
  : (process.env.NEXT_PUBLIC_ASPNET_API_URL || process.env.ASPNET_API_URL || "http://192.168.188.170:8090");

// after
  : (process.env.NEXT_PUBLIC_ASPNET_API_URL || process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com");
```

- [ ] **Step 3: Update `src/lib/auth.ts` fallback (baris 85)**

```typescript
// before
const ASPNET_API_URL = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";

// after
const ASPNET_API_URL = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";
```

- [ ] **Step 4: Commit**

```bash
git add next.config.ts src/lib/api-client.ts src/lib/auth.ts
git commit -m "config: update fallback URL to sistro-dev.pupuk-indonesia.com"
```

---

## Task 3: Update API Route Handlers (Batch)

**Files (16 route handlers):**
- Modify: `src/app/api/user/switch-company/route.ts:9`
- Modify: `src/app/api/user/active-company/route.ts:6`
- Modify: `src/app/api/transport/dashboard/route.ts:5`
- Modify: `src/app/api/armada/upload/route.ts:6`
- Modify: `src/app/api/kuota/shifts/route.ts:6`
- Modify: `src/app/api/kuota/schedule/route.ts:5`
- Modify: `src/app/api/kuota/lookup/route.ts:5`
- Modify: `src/app/api/kuota/level2/[id]/route.ts:5`
- Modify: `src/app/api/kuota/level2/[id]/update/route.ts:6`
- Modify: `src/app/api/kuota/level3/[id]/route.ts:5`
- Modify: `src/app/api/kuota/level3/[id]/update/route.ts:6`
- Modify: `src/app/api/kuota/level4/[id]/route.ts:5`
- Modify: `src/app/api/pod/kuota/route.ts:6`
- Modify: `src/app/api/pod/kuota/[id]/route.ts:5`
- Modify: `src/app/api/admin/transport/route.ts:5`
- Modify: `src/app/api/admin/transport/users/route.ts:5`
- Modify: `src/app/api/admin/plants/route.ts:5`

Semua file ini punya pola yang sama:
```typescript
// before (baris pertama file, setelah import)
const ASPNET = process.env.ASPNET_API_URL || "http://192.168.188.170:8090"
// atau
const ASPNET_API_URL = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";
```

- [ ] **Step 1: Batch replace di semua route handlers**

Gunakan find-and-replace global di editor, atau jalankan dari PowerShell:

```powershell
$files = @(
  "src\app\api\user\switch-company\route.ts",
  "src\app\api\user\active-company\route.ts",
  "src\app\api\transport\dashboard\route.ts",
  "src\app\api\armada\upload\route.ts",
  "src\app\api\kuota\shifts\route.ts",
  "src\app\api\kuota\schedule\route.ts",
  "src\app\api\kuota\lookup\route.ts",
  "src\app\api\kuota\level2\[id]\route.ts",
  "src\app\api\kuota\level2\[id]\update\route.ts",
  "src\app\api\kuota\level3\[id]\route.ts",
  "src\app\api\kuota\level3\[id]\update\route.ts",
  "src\app\api\kuota\level4\[id]\route.ts",
  "src\app\api\pod\kuota\route.ts",
  "src\app\api\pod\kuota\[id]\route.ts",
  "src\app\api\admin\transport\route.ts",
  "src\app\api\admin\transport\users\route.ts",
  "src\app\api\admin\plants\route.ts"
)

foreach ($f in $files) {
  $content = Get-Content $f -Raw
  $updated = $content -replace 'http://192\.168\.188\.170:8090', 'https://sistro-dev.pupuk-indonesia.com'
  Set-Content $f $updated -Encoding utf8
}
```

- [ ] **Step 2: Verifikasi hasil replace**

```powershell
Select-String -Path "src\app\api\**\route.ts" -Pattern "192\.168\.188\.170"
```

Expected output: kosong (tidak ada hasil).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/
git commit -m "config: update API fallback URLs in route handlers"
```

---

## Task 4: Verify & Report

- [ ] **Step 1: Cek tidak ada sisa URL lama**

```powershell
Select-String -Path "src\**\*.ts","src\**\*.tsx","next.config.ts",".env.local" -Pattern "192\.168\.188\.170"
```

Expected: tidak ada hasil. Kalau masih ada, fix file tersebut.

- [ ] **Step 2: Cek semua env var sudah benar**

Baca `.env.local` dan pastikan:
```
ASPNET_API_URL=https://sistro-dev.pupuk-indonesia.com
NEXT_PUBLIC_ASPNET_API_URL=https://sistro-dev.pupuk-indonesia.com
```

- [ ] **Step 3: Build check (TypeScript)**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Buat report ke user**

Tulis summary: file apa yang diubah, URL lama vs baru, apakah ada sisa URL lama.

---

## Notes

- **Scratch files** (`scratch/test_*.js`, `scratch_test_tiket.js`) punya hardcoded `192.168.188.170` tapi itu test script manual, bukan bagian app. Tidak perlu diubah kecuali user minta.
- **`.env.local.localhost`** tidak perlu diubah — file itu untuk override ke `localhost:8090` saat dev lokal dengan IIS Express, bukan untuk staging.
- **Trailing slash**: URL target adalah `https://sistro-dev.pupuk-indonesia.com` tanpa trailing slash. Kode appends `/api/...` langsung ke URL ini.
- **CORS/firewall**: Setelah perubahan ini, pastikan server `sistro-dev.pupuk-indonesia.com` allow request dari origin Next.js dev (`localhost:3000`).
