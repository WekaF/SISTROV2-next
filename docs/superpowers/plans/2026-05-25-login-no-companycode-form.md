# Login Without Company Code Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User login hanya butuh username + password — tidak ada dropdown company code. Company code diekstrak otomatis dari username.

**Architecture:** Username di DB disimpan sebagai `username_COMPANYCODE` (contoh: `wahyu_PKG`). Frontend split string pada `_` terakhir untuk mengekstrak company code, lalu mengirimnya ke backend `/Token` secara transparan. **Tidak ada perubahan backend sama sekali.**

**Tech Stack:** Next.js 16, NextAuth.js, TypeScript, Tailwind CSS

---

## Analisis Backend (READ-ONLY — tidak perlu diubah)

Endpoint `/Token` di `SISTROAWESOME/Provider/ApplicationOAuthProvider.cs:36-68`:

```
Jika companycode dikirim:
  → cari UserName == (username + "_" + companycode).toLowerCase()
  → jika tidak ada → error

Jika companycode TIDAK dikirim:
  → hanya lolos user Transport
  → user biasa → error "Please provide company code"
```

**Contoh username di DB:**
| DB UserName | company_code |
|---|---|
| `wahyu_pkg` | `PKG` |
| `budi_pkc` | `PKC` |
| `driver123` | (Transport, tanpa company) |

**Parsing rule:**
- `wahyu_PKG` → username=`wahyu`, companycode=`PKG`
- `budi_pkc` → username=`budi`, companycode=`pkc`
- `driver123` → username=`driver123`, companycode=`""` (Transport user)
- `wahyu_eko_PKG` → split pada `_` terakhir → username=`wahyu_eko`, companycode=`PKG`

---

## File yang Diubah

| File | Aksi | Keterangan |
|---|---|---|
| `src/components/auth/SignInForm.tsx` | Modify | Hapus dropdown, auto-extract companycode dari username |
| `src/lib/auth.ts` | Tidak perlu diubah | Sudah handle optional companycode dengan benar |

---

## Task 1: Refactor SignInForm — Auto-extract company code dari username

**Files:**
- Modify: `src/components/auth/SignInForm.tsx`

**Logika parsing:**
```typescript
function parseUsernameCompany(raw: string): { username: string; companycode: string } {
  const lastUnderscore = raw.lastIndexOf("_");
  if (lastUnderscore === -1 || lastUnderscore === 0 || lastUnderscore === raw.length - 1) {
    return { username: raw, companycode: "" };
  }
  return {
    username: raw.slice(0, lastUnderscore),
    companycode: raw.slice(lastUnderscore + 1),
  };
}
```

- [ ] **Step 1: Tulis test manual (browser console) untuk parsing function**

Buka browser console dan test:
```javascript
function parseUsernameCompany(raw) {
  const lastUnderscore = raw.lastIndexOf("_");
  if (lastUnderscore === -1 || lastUnderscore === 0 || lastUnderscore === raw.length - 1) {
    return { username: raw, companycode: "" };
  }
  return {
    username: raw.slice(0, lastUnderscore),
    companycode: raw.slice(lastUnderscore + 1),
  };
}

console.assert(JSON.stringify(parseUsernameCompany("wahyu_PKG")) === '{"username":"wahyu","companycode":"PKG"}', "basic case");
console.assert(JSON.stringify(parseUsernameCompany("wahyu_eko_PKG")) === '{"username":"wahyu_eko","companycode":"PKG"}', "double underscore");
console.assert(JSON.stringify(parseUsernameCompany("driver123")) === '{"username":"driver123","companycode":""}', "no underscore");
console.assert(JSON.stringify(parseUsernameCompany("_PKG")) === '{"username":"_PKG","companycode":""}', "leading underscore");
console.assert(JSON.stringify(parseUsernameCompany("wahyu_")) === '{"username":"wahyu_","companycode":""}', "trailing underscore");
console.log("All pass");
```

Expected: `All pass` di console.

- [ ] **Step 2: Ganti isi SignInForm.tsx**

Ganti seluruh file `src/components/auth/SignInForm.tsx` dengan:

```tsx
"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

function parseUsernameCompany(raw: string): { username: string; companycode: string } {
  const lastUnderscore = raw.lastIndexOf("_");
  if (lastUnderscore === -1 || lastUnderscore === 0 || lastUnderscore === raw.length - 1) {
    return { username: raw, companycode: "" };
  }
  return {
    username: raw.slice(0, lastUnderscore),
    companycode: raw.slice(lastUnderscore + 1),
  };
}

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [usernameRaw, setUsernameRaw]   = useState("");
  const [password, setPassword]         = useState("");
  const [error, setError]               = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [isChecked, setIsChecked]       = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams?.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { username, companycode } = parseUsernameCompany(usernameRaw.trim());

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
        companycode,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error);
      } else if (res?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto text-gray-900 dark:text-white">
      <div className="flex flex-col justify-center flex-1 w-full">
        {/* Logos */}
        <div className="flex justify-center items-center gap-6 mb-8">
          <div>
            <img
              src="/images/logo/logopihd.png"
              alt="Pupuk Indonesia"
              className="h-10 object-contain grayscale dark:brightness-0 dark:invert"
            />
          </div>
          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
          <img
            src="/images/logo/Danantara_Indonesia_Logo_vector (Color).png"
            alt="Danantara"
            className="h-9 object-contain dark:hidden"
          />
          <img
            src="/images/logo/Danantara_Indonesia_Logo_vector (White).png"
            alt="Danantara"
            className="h-9 object-contain hidden dark:block"
          />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sistem Scheduling Truck Online
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Masuk ke akun Anda untuk melanjutkan
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-500/30 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Username / NIK
            </label>
            <input
              type="text"
              value={usernameRaw}
              onChange={(e) => setUsernameRaw(e.target.value)}
              placeholder="contoh: wahyu_PKG"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#1e2a44] border border-gray-300 dark:border-transparent rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              required
            />
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Format: <span className="font-mono">username_KODEPERUSAHAAN</span> (contoh: <span className="font-mono">wahyu_PKG</span>)
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kata Sandi</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1e2a44] border border-gray-300 dark:border-transparent rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="w-4 h-4 text-blue-600 dark:text-blue-500 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="remember" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                Tetap masuk
              </label>
            </div>
            <Link
              href="/register"
              className="text-xs text-blue-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Lupa Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 mt-2 bg-blue-600 text-white font-semibold text-sm rounded-md hover:bg-blue-700 shadow-sm transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            {isLoading ? "Masuk..." : "Masuk"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Bagian dari Pupuk Indonesia Group</p>
          <img
            src="/images/logo/logo-anper.png"
            alt="Anak Perusahaan"
            className="h-10 object-contain mx-auto dark:brightness-0 dark:invert dark:opacity-80"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Start dev server dan test login**

```powershell
# Di SISTROV2-next:
npm run dev
```

Buka `http://localhost:3000/login` dan test:

| Input Username | Password | Expected |
|---|---|---|
| `wahyu_PKG` | password_benar | Login berhasil, `companyCode = "PKG"` di session |
| `wahyu` (tanpa company) | password_benar | Error "Please provide company code" dari backend |
| `driver123` | password_benar | Login berhasil (Transport user) |
| `wahyu_eko_PKG` | password_benar | Login berhasil, `companyCode = "PKG"` |

Verifikasi di DevTools → Application → Cookies bahwa `next-auth.session-token` terbentuk.

- [ ] **Step 4: Verifikasi company switcher masih berfungsi**

Jika ada fitur company switcher (dari plan sebelumnya di `project_company_switcher.md`):
- Setelah login, coba switch company
- Pastikan re-auth menggunakan password yang tersimpan di `_pw` masih bekerja

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/SignInForm.tsx
git commit -m "feat: remove company code dropdown, auto-extract from username"
```

---

## Catatan Edge Cases

| Kasus | Behaviour |
|---|---|
| Username tanpa `_` (misal `driver123`) | `companycode=""` → lolos hanya jika Transport user |
| Username dengan `_` di awal (misal `_PKG`) | Diperlakukan sebagai no-underscore, `companycode=""` |
| Username dengan `_` di akhir (misal `wahyu_`) | Diperlakukan sebagai no-underscore, `companycode=""` |
| Company code huruf kecil (misal `wahyu_pkg`) | Backend sudah lowercase-compare, aman |

---

## Self-Review

- [x] Spec coverage: hapus dropdown → Task 1 Step 2 ✓
- [x] Auto-extract logic → `parseUsernameCompany()` di Step 1 ✓
- [x] Transport user masih bisa login → `companycode=""` → backend fallback ke Transport check ✓
- [x] Tidak ada perubahan backend ✓
- [x] auth.ts tidak perlu diubah — sudah handle optional companycode ✓
- [x] Company switcher tidak terdampak — switcher pakai stored `_pw` + companycode baru, tidak lewat form ✓
- [x] Placeholder check: tidak ada TBD/TODO dalam plan ✓
