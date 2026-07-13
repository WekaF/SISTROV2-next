# Fix N+1 Query di DataTableMonitorPosition (Live Monitoring Berat)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman `/antrian/live-monitoring` terasa berat karena endpoint `DataTableMonitorPosition` memicu ratusan-ribuan query SQL kecil (N+1) per polling cycle. Eager-load semua navigation property yang dipakai supaya jadi 1 query per posisi.

**Root Cause (terverifikasi):**
- `sistroEntities` (EF context yang dipakai `db` di semua ApiController) punya `LazyLoadingEnabled="true"` — `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\BDO\SistroEntities.edmx:3933`.
- `DataTableMonitorPosition` (`TiketController.cs:3596`) memanggil `datapaging.AsEnumerable()` — ini **memaksa materialisasi ke memory SEBELUM** proyeksi `.Select()` jalan. Setelah itu, tiap akses navigation property (`x.Kuota4Shift`, `x.Posto1`, `x.Posto1.Gudang`, `x.Posto1.Gudang1`, `x.Transport`, `x.Produk`, `x.Antrian`, `x.Antrian.Gudang_SPPT`, `x.M_Status1`) memicu lazy-load query terpisah ke DB — karena objeknya sudah jadi POCO biasa (bukan lagi bagian dari query yang bisa di-translate SQL), lazy loading proxy jalan per akses per baris.
- Frontend live-monitoring (`src/app/antrian/live-monitoring/page.tsx`) memanggil endpoint ini 3x paralel (posisi 02/03/04) dengan `length: 200`, polling tiap 30 detik. Dengan ~7 lazy-load per baris × up to 200 baris × 3 panggilan = berpotensi ribuan round-trip SQL kecil per siklus polling. Untuk company "PI" (semua plant, ditambahkan di sesi sebelumnya) jumlah baris makin besar karena tidak difilter per plant.

**Fix:** Tambah `.Include()` eager-loading berantai pada query `db.Tiket` sebelum `.Where()`, supaya EF generate 1 SQL query dengan JOIN untuk semua navigation property yang dibutuhkan proyeksi `TiketView`. `System.Data.Entity` sudah di-import di file ini (line 7) — lambda `.Include(x => x.NavProp)` langsung bisa dipakai.

**Verifikasi nama navigation property** (dari `BDO/Tiket.cs`, `BDO/POSTO.cs`, `BDO/Antrian.cs`):
- `Tiket.Kuota4Shift`
- `Tiket.Posto1` → `Posto1.Gudang`, `Posto1.Gudang1`
- `Tiket.Transport`
- `Tiket.Produk`
- `Tiket.Antrian` → `Antrian.Gudang_SPPT`
- `Tiket.M_Status1`

**Tech Stack:** ASP.NET Framework 4.5 C#, Entity Framework 6 (lazy loading proxies).

---

## File Map

| File | Change |
|---|---|
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` | `DataTableMonitorPosition`: tambah `.Include()` chain sebelum `.Where()` |

---

## Task 1: Eager-load navigation properties di DataTableMonitorPosition

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` (method `DataTableMonitorPosition`, sekitar line 3657-3659)

### Context

Kode saat ini:
```csharp
                // ponytail: no listbagian filter — monitoring sees all tickets at this position/company
                var datasearch = db.Tiket.Where(x =>
                    (isHoldingAll || x.Posto1.company_code.ToLower() == effectiveCompanyCode.ToLower()) &&
                    x.position == position &&
```

- [ ] **Step 1: Edit — tambah `.Include()` chain**

Cari exact string:
```csharp
                // ponytail: no listbagian filter — monitoring sees all tickets at this position/company
                var datasearch = db.Tiket.Where(x =>
                    (isHoldingAll || x.Posto1.company_code.ToLower() == effectiveCompanyCode.ToLower()) &&
                    x.position == position &&
```

Ganti jadi:
```csharp
                // Eager-load nav properties used by TiketView projection below —
                // without this, lazy loading (SistroEntities.edmx LazyLoadingEnabled=true)
                // fires ~7 separate SQL round-trips per row (N+1) once .AsEnumerable() materializes.
                var datasearch = db.Tiket
                    .Include(x => x.Kuota4Shift)
                    .Include(x => x.Posto1.Gudang)
                    .Include(x => x.Posto1.Gudang1)
                    .Include(x => x.Transport)
                    .Include(x => x.Produk)
                    .Include(x => x.Antrian.Gudang_SPPT)
                    .Include(x => x.M_Status1)
                    .Where(x =>
                    (isHoldingAll || x.Posto1.company_code.ToLower() == effectiveCompanyCode.ToLower()) &&
                    x.position == position &&
```

Baris-baris setelahnya (`(string.IsNullOrEmpty(SD) || ...`, dst sampai `.OrderBy(...)`) TIDAK berubah — hanya ganti bagian `db.Tiket.Where(x =>` menjadi chain `.Include(...)` di atas lalu `.Where(x =>`.

- [ ] **Step 2: Verify compile**

```powershell
cd "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME"
msbuild SISTROAWESOME.csproj /t:Build /p:Configuration=Debug /v:m
```

Expected: Build succeeded, 0 errors. Kalau msbuild tidak jalan di environment ini, verifikasi manual: semua nama navigation property (`Kuota4Shift`, `Posto1.Gudang`, `Posto1.Gudang1`, `Transport`, `Produk`, `Antrian.Gudang_SPPT`, `M_Status1`) sudah dikonfirmasi ada persis di `BDO/Tiket.cs`, `BDO/POSTO.cs`, `BDO/Antrian.cs` — jadi risiko typo compile error rendah, tapi tetap wajib dicoba build.

- [ ] **Step 3: Commit backend**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "perf: eager-load nav properties in DataTableMonitorPosition to fix N+1 queries"
```

---

## Task 2: Verifikasi manual dampak performa

**Catatan:** backend dev environment saat ini sedang dipakai pihak lain (Web.config → production DB, migrasi UserAreaScopes belum jalan — lihat temuan sesi debugging sebelumnya). Task ini BLOCKED sampai lingkungan backend stabil kembali.

- [ ] **Step 1: Setelah backend stabil, restart app pool / IIS Express** supaya perubahan `.Include()` aktif.

- [ ] **Step 2: Buka `/antrian/live-monitoring`, buka DevTools Network tab.**
  - Bandingkan waktu response `DataTableMonitorPosition` sebelum vs sesudah fix (harusnya turun signifikan, terutama untuk company besar / mode "Pupuk Indonesia (Semua Plant)").

- [ ] **Step 3 (opsional, kalau ada akses SQL Server Profiler / query log):** hitung jumlah query yang di-generate untuk 1 pemanggilan endpoint sebelum vs sesudah — harus turun dari puluhan/ratusan query jadi 1 query per posisi.

---

## Self-Review

**Spec coverage:**
- ✅ Root cause N+1 teridentifikasi & diverifikasi (edmx LazyLoadingEnabled=true, `.AsEnumerable()` sebelum proyeksi navigasi)
- ✅ Fix minimal: `.Include()` chain, tidak ubah logic filter/proyeksi/sorting yang sudah ada
- ✅ Semua nama navigation property diverifikasi dari source Model (`BDO/Tiket.cs`, `BDO/POSTO.cs`, `BDO/Antrian.cs`) — bukan tebakan
- ✅ Tidak menyentuh `Web.config` / `BaseApiController.cs` yang sedang dikerjakan pihak lain (di luar scope, berisiko tinggi)
- ✅ Tidak bundling perubahan lain (tidak ubah polling interval / length=200 di frontend — itu keputusan terpisah kalau setelah fix N+1 masih terasa berat)

**Placeholder scan:** None.

**Catatan tambahan (di luar scope task ini, FYI):** `DataTableFilterLegacy` (endpoint asal yang di-copy jadi `DataTableMonitorPosition`) kemungkinan besar punya N+1 yang sama karena pola kodenya identik — dipakai di halaman lain (mis. `/admin/tickets`). Tidak diperbaiki di plan ini karena user secara spesifik menunjuk `/antrian/live-monitoring`. Kalau halaman lain juga terasa berat, ini kandidat pertama untuk dicek.
