# Fix: Tampilkan Plant dan Gudang Muat di Kartu Live Monitoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kartu truk di live-monitoring menampilkan plant asal (company_code dari tiket, bukan dari user session) dan gudang muat (gudang_sppt/storageID dari Antrian).

**Architecture:**
- Backend `DataTableMonitorPosition` belum mengirim field `company` (company_code POSTO). Perlu tambah ke projection.
- Frontend: field `gudangtujuan` sudah datang dari API tapi tidak di-render. Field `company` belum datang — perlu dari backend dulu.
- Khusus Pupuk Indonesia (PI/PKI): karena kita pakai `ticket.company` (dari POSTO tiket aslinya), bukan `activeCompanyCode`, plant yang tampil tetap PKG/PKC/PIM/dll — tidak berubah jadi PI.

**Tech Stack:** ASP.NET Framework 4.5 C# (backend), Next.js 16 TypeScript (frontend).

---

## File Map

| File | Change |
|---|---|
| `sistropigroup/SISTROAWESOME/api/TiketController.cs` | Tambah `company = x.Posto1.company_code` ke projection `DataTableMonitorPosition` |
| `src/app/antrian/live-monitoring/page.tsx` | Tambah `company` + `gudangtujuan` ke `RealTicket` interface; update card header (plant badge) + info grid (gudang muat) |

---

## Task 1: Backend — populate field `company` di DataTableMonitorPosition

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs`

### Context

`TiketView.company` property sudah ada di `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Models\TiketView.cs` (line 87):
```csharp
public string company { get; set; }
```

Method `DataTableMonitorPosition` (sekitar line 3595+) punya projection `Select((x, i) => new TiketView { ... })` yang di-copy dari `DataTableFilterLegacy`. Di sana, field `company` tidak di-set. Kita perlu tambah:
```csharp
company = x.Posto1.company_code,
```

Di `DataTableFilterLegacy` (line 3526–3578), field terakhir sebelum `Action = ""` adalah `percepatan = x.Posto1.Percepatan`. Kita tambah `company` setelah `percepatan`:

**Cari dalam method `DataTableMonitorPosition`** (bukan DataTableFilterLegacy) bagian:
```csharp
                    percepatan = x.Posto1.Percepatan,
                    Action = ""
```

Ganti jadi:
```csharp
                    percepatan = x.Posto1.Percepatan,
                    company = x.Posto1.company_code,
                    Action = ""
```

- [ ] **Step 1: Read TiketController.cs sekitar line 3660–3730** (area projection DataTableMonitorPosition) untuk menemukan baris `percepatan = x.Posto1.Percepatan,` di dalam method `DataTableMonitorPosition`.

- [ ] **Step 2: Edit — tambah `company = x.Posto1.company_code`**

Gunakan Edit tool, cari exact string di dalam `DataTableMonitorPosition` (bukan DataTableFilterLegacy — pastikan benar method-nya):

```csharp
                    percepatan = x.Posto1.Percepatan,
                    Action = ""
                }).ToList();

                long count = datasearch.Count();
                return Json((object)new
                {
                    data = dt,
```

Ganti jadi:
```csharp
                    percepatan = x.Posto1.Percepatan,
                    company = x.Posto1.company_code,
                    Action = ""
                }).ToList();

                long count = datasearch.Count();
                return Json((object)new
                {
                    data = dt,
```

- [ ] **Step 3: Commit backend**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "feat: expose company_code in DataTableMonitorPosition response"
```

---

## Task 2: Frontend — tampilkan plant badge + gudang muat di kartu

**Files:**
- Modify: `src/app/antrian/live-monitoring/page.tsx`

### Context

**`RealTicket` interface saat ini** (sekitar line 25–35):
```typescript
interface RealTicket {
  bookingno: string;
  tiketno?: string;
  nopol: string;
  driver: string;
  produkString: string;
  transportString: string;
  qty: number;
  posto: string;
  timemuat?: string;
}
```

Perlu tambah `company` dan `gudangtujuan`.

**Card header saat ini** (sekitar line 264):
```tsx
<span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">{bay.warehouseName || bay.bay}</span>
```

Di mana `warehouseName` di-set (sekitar line 238):
```typescript
warehouseName: ticket.produkString,   // ← SALAH: harusnya gudang, bukan produk
```

**Info grid saat ini** (sekitar line 297–309) punya 2 kolom: Kode Booking + No. POSTO, lalu 1 baris full-width: Transportir.

### Yang perlu diubah

**1. Tambah ke `RealTicket` interface:**
```typescript
  company?: string;
  gudangtujuan?: string;
```

**2. Perbaiki `warehouseName`** di bay object construction (line ~238):
```typescript
// Sebelum:
warehouseName: ticket.produkString,
// Sesudah:
warehouseName: ticket.gudangtujuan || "",
```

**3. Update card header** — tambah plant badge sebelum status badge:

Sebelum:
```tsx
<div className="flex justify-between items-start">
  <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">{bay.warehouseName || bay.bay}</span>
```

Sesudah:
```tsx
<div className="flex justify-between items-start">
  <div className="flex flex-col gap-0.5">
    <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest">
      {ticket.company || activeCompanyCode}
    </span>
    <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
      {bay.warehouseName || "Gudang Belum Ditentukan"}
    </span>
  </div>
```

**4. Tambah baris "Gudang Muat"** di info grid, setelah baris Transportir:

Sebelum (closing baris transportir):
```tsx
                        <div className="col-span-2 border-t border-gray-100/50 dark:border-gray-800/30 pt-1 mt-1">
                          <span className="text-gray-400 block font-semibold">Transportir</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 truncate block" title={bay.transportir}>{bay.transportir}</span>
                        </div>
                      </div>
```

Sesudah:
```tsx
                        <div className="col-span-2 border-t border-gray-100/50 dark:border-gray-800/30 pt-1 mt-1">
                          <span className="text-gray-400 block font-semibold">Transportir</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 truncate block" title={bay.transportir}>{bay.transportir}</span>
                        </div>
                        {ticket.gudangtujuan && (
                          <div className="col-span-2 border-t border-gray-100/50 dark:border-gray-800/30 pt-1 mt-1">
                            <span className="text-gray-400 block font-semibold">Gudang Muat</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block" title={ticket.gudangtujuan}>{ticket.gudangtujuan}</span>
                          </div>
                        )}
                      </div>
```

- [ ] **Step 1: Read `src/app/antrian/live-monitoring/page.tsx` lines 25–40** — konfirmasi exact `RealTicket` interface.

- [ ] **Step 2: Edit — tambah `company` dan `gudangtujuan` ke `RealTicket`**

```typescript
interface RealTicket {
  bookingno: string;
  tiketno?: string;
  nopol: string;
  driver: string;
  produkString: string;
  transportString: string;
  qty: number;
  posto: string;
  timemuat?: string;
  company?: string;
  gudangtujuan?: string;
}
```

- [ ] **Step 3: Edit — perbaiki `warehouseName` (baris ~238)**

```typescript
// Cari:
warehouseName: ticket.produkString,
// Ganti:
warehouseName: ticket.gudangtujuan || "",
```

- [ ] **Step 4: Edit — update card header (plant badge + gudang nama)**

Cari exact string:
```tsx
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">{bay.warehouseName || bay.bay}</span>
```

Ganti:
```tsx
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest">
                        {ticket.company || activeCompanyCode}
                      </span>
                      <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        {bay.warehouseName || "Gudang Belum Ditentukan"}
                      </span>
                    </div>
```

- [ ] **Step 5: Edit — tambah baris Gudang Muat di info grid**

Cari exact string:
```tsx
                        <div className="col-span-2 border-t border-gray-100/50 dark:border-gray-800/30 pt-1 mt-1">
                          <span className="text-gray-400 block font-semibold">Transportir</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 truncate block" title={bay.transportir}>{bay.transportir}</span>
                        </div>
                      </div>
```

Ganti:
```tsx
                        <div className="col-span-2 border-t border-gray-100/50 dark:border-gray-800/30 pt-1 mt-1">
                          <span className="text-gray-400 block font-semibold">Transportir</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 truncate block" title={bay.transportir}>{bay.transportir}</span>
                        </div>
                        {ticket.gudangtujuan && (
                          <div className="col-span-2 border-t border-gray-100/50 dark:border-gray-800/30 pt-1 mt-1">
                            <span className="text-gray-400 block font-semibold">Gudang Muat</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate block" title={ticket.gudangtujuan}>{ticket.gudangtujuan}</span>
                          </div>
                        )}
                      </div>
```

- [ ] **Step 6: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: no errors (atau hanya pre-existing errors tidak terkait file ini).

- [ ] **Step 7: Commit**

```bash
cd c:\Users\weka\Indigo\SISTROV2-next
git add src/app/antrian/live-monitoring/page.tsx
git commit -m "feat: show plant badge and gudang muat on loading bay cards"
```

---

## Self-Review

**Spec coverage:**
- ✅ Plant (company_code) tampil di kartu — dari `ticket.company` (bukan `activeCompanyCode`)
- ✅ Gudang muat tampil — dari `ticket.gudangtujuan` (Antrian.Gudang_SPPT.deskripsi atau storageID)
- ✅ Switch ke PI: kartu tetap tampil plant aslinya (PKG/PKC/dll) karena pakai `ticket.company`
- ✅ `warehouseName` difix dari `produkString` ke `gudangtujuan`
- ✅ Gudang muat di info grid hanya muncul kalau ada nilainya (conditional render)

**Placeholder scan:** None.

**Type consistency:** `RealTicket.company?: string` dan `gudangtujuan?: string` — diakses dengan optional chaining atau falsy check di semua tempat.
