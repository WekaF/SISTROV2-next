# Fix: Tiket Tidak Muncul di Live Monitoring (listbagian Filter)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tiket yang posisinya 03 (dan 02) milik company yang benar tetapi bagian/departemennya berbeda dari `UserBagian` claim user tidak disaring habis saat live monitoring.

**Root Cause:** `DataTableFilterLegacy` di ASP.NET backend (line 3505) memfilter tiket berdasarkan `listbagian` (klaim UserBagian dari JWT token). Saat user tidak punya klaim untuk bagian "UREA SUB" atau "NPK 151012", tiket tersebut hilang — meski sudah di pos 03 dan company yang benar.

```
SISTRO_JUPT_rFN3OWxQi → bagian = "UREA SUB"   → tidak ada di listbagian user → filtered out
SISTRO_AMT_9Fen3Zcim  → bagian = "NPK 151012" → tidak ada di listbagian user → filtered out
```

**Fix:** Saat parameter `position` dikirim (mode monitoring), bypass filter `listbagian`. Company filter dan position filter tetap berlaku — hanya departemen-restriction yang dilewati.

**Scope:** 1 file backend ASP.NET.

---

## File Map

| File | Change |
|---|---|
| `sistropigroup/SISTROAWESOME/api/TiketController.cs` | Line 3505: tambah `|| !string.IsNullOrEmpty(position)` |

---

## Task 1: Bypass listbagian filter when position parameter is provided

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` line 3505

### Context

Baris 3505 saat ini:
```csharp
: (bypassCompanyFilter || string.IsNullOrEmpty(effectiveCompanyCode) || listbagian.Contains(x.Kuota4Shift.Kuota3Bagian.bagian) || x.Kuota4Shift.Kuota3Bagian.bagian == "CHARTER")
```

Kondisi ini hanya lolos kalau:
- `bypassCompanyFilter` = true (Viewer tanpa company), ATAU
- `effectiveCompanyCode` kosong, ATAU
- bagian tiket ada di `listbagian` user, ATAU
- bagian tiket = "CHARTER"

Tiket PKG bagian "UREA SUB"/"NPK 151012" tidak lolos karena user tidak punya claim tersebut.

**Fix yang aman:** tambah `|| !string.IsNullOrEmpty(position)` — artinya kalau caller minta filter by specific position (live monitoring), jangan batasi per departemen. Company filter tetap jalan di baris 3507, position filter tetap jalan di baris 3513.

- [ ] **Step 1: Edit TiketController.cs line 3505**

**Before:**
```csharp
                    (isTransport ? x.updatedby.ToLower() == namauser.ToLower()
                        : (isSecurity || isTimbangan || isGudang) ? x.position != "0"
                        : (bypassCompanyFilter || string.IsNullOrEmpty(effectiveCompanyCode) || listbagian.Contains(x.Kuota4Shift.Kuota3Bagian.bagian) || x.Kuota4Shift.Kuota3Bagian.bagian == "CHARTER")
                    ) &&
```

**After:**
```csharp
                    (isTransport ? x.updatedby.ToLower() == namauser.ToLower()
                        : (isSecurity || isTimbangan || isGudang) ? x.position != "0"
                        : (bypassCompanyFilter || string.IsNullOrEmpty(effectiveCompanyCode) || !string.IsNullOrEmpty(position) || listbagian.Contains(x.Kuota4Shift.Kuota3Bagian.bagian) || x.Kuota4Shift.Kuota3Bagian.bagian == "CHARTER")
                    ) &&
```

Hanya tambah `|| !string.IsNullOrEmpty(position)` — satu kondisi.

- [ ] **Step 2: Verify compile**

```powershell
cd "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME"
msbuild SISTROAWESOME.csproj /t:Build /p:Configuration=Debug 2>&1 | Select-String -Pattern "error|warning" | Select-Object -First 20
```

Expected: 0 errors.

- [ ] **Step 3: Commit backend**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "fix: bypass listbagian filter in DataTableFilterLegacy when position param provided"
```

- [ ] **Step 4: Restart IIS Express / backend, verify tiket muncul**

Restart backend lalu cek di browser:
```
http://localhost:3000/antrian/live-monitoring
```

Tiket `SISTRO_JUPT_rFN3OWxQi` dan `SISTRO_AMT_9Fen3Zcim` harus muncul di bay cards (pos 03).

---

## Self-Review

**Spec coverage:**
- ✅ Tiket pos 03 company PKG semua bagian muncul di live-monitoring
- ✅ Company filter tetap berlaku (line 3507) — tidak bocor ke company lain
- ✅ Position filter tetap berlaku (line 3513) — hanya pos yang diminta
- ✅ isTransport dan isSecurity/isTimbangan/isGudang path tidak berubah
- ✅ Tanpa `position` param → behavior lama (listbagian tetap aktif)

**Security check:** Bypass hanya aktif kalau `position` dikirim DAN company filter masih jalan. Tidak ada data perusahaan lain yang bocor.

**Placeholder scan:** None.
