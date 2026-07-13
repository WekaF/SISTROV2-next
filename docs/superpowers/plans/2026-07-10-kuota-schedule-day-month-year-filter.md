# Kuota Schedule: Filter Harian/Bulanan/Tahunan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman `/kuota/schedule` bisa difilter per hari, per bulan, atau per tahun — dan saat filter itu di-set, DataTable maupun 4 kartu metrik ("Total Kuota", "Terpesan", "Proses Muat", "Realisasi") ikut menyesuaikan.

**Architecture:** Backend `KuotaLevel1Controller.DataTableFilter()` saat ini cuma dukung filter tanggal exact-match (`x.tanggal == tanggal`), jadi filter "bulan" atau "tahun" tidak pernah benar-benar bekerja — `DateTime.TryParse("2026-07")` berhasil parse tapi jadi tanggal 1 Juli, bukan seluruh bulan Juli. Solusinya: tambah dua parameter range baru `SD`/`ED` (pola yang sama persis dengan `LogDataReport()` di controller yang sama), lalu frontend menghitung `startDate`/`endDate` dari mode filter yang dipilih (harian/bulanan/tahunan) dan mengirim range itu, bukan tanggal tunggal. Endpoint metrics di `route.ts` sudah otomatis reuse filter yang sama (dia clone `body` lalu ambil semua row tanpa paging), jadi begitu range terpasang di query, kartu metrik ikut benar tanpa perubahan tambahan.

**Tech Stack:** Next.js 16 (App Router, TypeScript), ASP.NET Framework 4.5 Web API (backend di `sistropigroup`), `date-fns` (sudah jadi dependency, dipakai untuk hitung awal/akhir bulan & tahun).

---

## File Map

| File | Change |
|---|---|
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\KuotaLevel1Controller.cs` | `DataTableFilter()`: tambah param `SD`/`ED` (date range filter), sekalian fix bug silent-fail di `fil_tanggal` (parse gagal → diam-diam filter ke tanggal 0001-01-01) |
| `src/app/api/kuota/schedule/route.ts` | Ganti param `tanggal` (exact match, tidak pernah kepakai bener) jadi `startDate`/`endDate`, forward ke backend sebagai `SD`/`ED` |
| `src/app/kuota/schedule/page.tsx` | Ganti input `type="month"` tunggal jadi toggle mode Harian/Bulanan/Tahunan + input yang berubah sesuai mode, hitung `startDate`/`endDate`, pasang ke fetcher & `queryKey` |

---

## Task 1: Backend — tambah filter range `SD`/`ED` di `DataTableFilter()`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\KuotaLevel1Controller.cs:934-1027`

Endpoint ini dipanggil oleh `src/app/api/kuota/schedule/route.ts` (satu-satunya caller — sudah dicek, tidak ada consumer lain di frontend maupun `API_ENDPOINTS.md` yang bergantung pada perilaku lama).

- [ ] **Step 1: Baca ulang lines 934-1027 untuk konfirmasi teks persis sebelum edit**

```powershell
Get-Content "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\KuotaLevel1Controller.cs" | Select-Object -Skip 933 -First 94
```

- [ ] **Step 2: Tambah pembacaan param `SD`/`ED` setelah baris `effectiveCompanyCode` (baris 954-955)**

Sebelum:
```csharp
            string requestedCompanyCode = Request["companyCode"];
            string effectiveCompanyCode = !string.IsNullOrEmpty(requestedCompanyCode) ? requestedCompanyCode : myCompanyCode;
```

Sesudah:
```csharp
            string requestedCompanyCode = Request["companyCode"];
            string effectiveCompanyCode = !string.IsNullOrEmpty(requestedCompanyCode) ? requestedCompanyCode : myCompanyCode;
            string fil_SD = Request["SD"];
            string fil_ED = Request["ED"];
```

- [ ] **Step 3: Parse `SD`/`ED` jadi `DateTime` range, di blok yang sama dengan parsing `fil_tanggal`/`fil_updatedon` (baris 970-974)**

Sebelum:
```csharp
            //search data
            DateTime tanggal;
            bool tgl = DateTime.TryParse(fil_tanggal, out tanggal);

            DateTime updatedon;
            bool tglupdateon = DateTime.TryParse(fil_updatedon, out updatedon);
```

Sesudah:
```csharp
            //search data
            DateTime tanggal;
            bool tgl = DateTime.TryParse(fil_tanggal, out tanggal);

            DateTime updatedon;
            bool tglupdateon = DateTime.TryParse(fil_updatedon, out updatedon);

            DateTime startDate, endDate;
            bool hasSD = DateTime.TryParse(fil_SD, out startDate);
            bool hasED = DateTime.TryParse(fil_ED, out endDate);
            if (hasED) endDate = endDate.Date.AddDays(1).AddTicks(-1); // inklusif sampai akhir hari — pola sama dengan LogDataReport()
```

- [ ] **Step 4: Terapkan filter range ke query, sekaligus fix bug `fil_tanggal` (baris 982)**

Sebelum:
```csharp
                                        (string.IsNullOrEmpty(fil_tanggal) || x.tanggal == tanggal) &&
```

Sesudah:
```csharp
                                        (string.IsNullOrEmpty(fil_tanggal) || (tgl && x.tanggal == tanggal)) &&
                                        (!hasSD || x.tanggal >= startDate) &&
                                        (!hasED || x.tanggal <= endDate) &&
```

Catatan bug yang ikut kefix: sebelumnya kalau `fil_tanggal` gagal di-parse (misal format aneh), `tanggal` diam-diam jadi `DateTime.MinValue` (0001-01-01) dan filter jadi "cocokkan ke tanggal itu" — hasilnya selalu 0 baris tanpa error. Sekarang filter itu cuma aktif kalau parse-nya sukses (`tgl == true`).

- [ ] **Step 5: Build project (atau biarkan IIS Express auto-recompile) dan restart backend dev server supaya kena kompilasi ulang**

```powershell
cd "C:\Users\weka\Indigo\sistropigroup"
.\start-dev.ps1
```

Expected: server start tanpa compile error di window IIS Express / output build.

- [ ] **Step 6: Commit (repo backend)**

```bash
cd "C:\Users\weka\Indigo\sistropigroup"
git add SISTROAWESOME/api/KuotaLevel1Controller.cs
git commit -m "feat: add SD/ED date-range filter to KuotaLevel1 DataTableFilter"
```

---

## Task 2: Frontend proxy route — forward `startDate`/`endDate` sebagai `SD`/`ED`

**Files:**
- Modify: `src/app/api/kuota/schedule/route.ts:18, 52-54`

- [ ] **Step 1: Ganti pembacaan param `tanggal` jadi `startDate`/`endDate` (baris 18)**

Sebelum:
```typescript
    const tanggalFilter  = searchParams.get("tanggal")     || ""
    const produkFilter   = searchParams.get("produk")      || ""
    const statusFilter   = searchParams.get("status")      || ""
    const companyCode    = searchParams.get("companyCode") || ""
```

Sesudah:
```typescript
    const startDate       = searchParams.get("startDate")   || ""
    const endDate         = searchParams.get("endDate")     || ""
    const produkFilter   = searchParams.get("produk")      || ""
    const statusFilter   = searchParams.get("status")      || ""
    const companyCode    = searchParams.get("companyCode") || ""
```

- [ ] **Step 2: Ganti blok `if (tanggalFilter)` jadi kirim `SD`/`ED` (baris 52-54)**

Sebelum:
```typescript
    if (tanggalFilter) {
      body.append("columns[2][search][value]", tanggalFilter)
    }
    if (produkFilter) {
```

Sesudah:
```typescript
    if (startDate) {
      body.append("SD", startDate)
    }
    if (endDate) {
      body.append("ED", endDate)
    }
    if (produkFilter) {
```

- [ ] **Step 3: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: 0 error terkait `route.ts` (masih boleh ada pre-existing error tak terkait file ini, cek dulu baseline sebelum edit kalau ragu).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/kuota/schedule/route.ts
git commit -m "feat: forward startDate/endDate range filter to KuotaLevel1 backend"
```

---

## Task 3: Frontend page — toggle mode Harian/Bulanan/Tahunan

**Files:**
- Modify: `src/app/kuota/schedule/page.tsx`

- [ ] **Step 1: Tambah import `date-fns` (setelah baris 26, `import { useToast }...`)**

Sebelum:
```typescript
import { useToast } from "@/components/ui/toast"

interface QuotaRow {
```

Sesudah:
```typescript
import { useToast } from "@/components/ui/toast"
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns"

type QuotaFilterMode = "harian" | "bulanan" | "tahunan"

function getQuotaDateRange(mode: QuotaFilterMode, value: string): { startDate: string; endDate: string } {
  if (!value) return { startDate: "", endDate: "" }
  if (mode === "harian") return { startDate: value, endDate: value }
  if (mode === "bulanan") {
    const [y, m] = value.split("-").map(Number)
    if (!y || !m) return { startDate: "", endDate: "" }
    const ref = new Date(y, m - 1, 1)
    return { startDate: format(startOfMonth(ref), "yyyy-MM-dd"), endDate: format(endOfMonth(ref), "yyyy-MM-dd") }
  }
  const y = Number(value)
  if (!y || value.length !== 4) return { startDate: "", endDate: "" }
  const ref = new Date(y, 0, 1)
  return { startDate: format(startOfYear(ref), "yyyy-MM-dd"), endDate: format(endOfYear(ref), "yyyy-MM-dd") }
}

interface QuotaRow {
```

`getQuotaDateRange` ditaruh di module scope (bukan di dalam komponen) karena tidak bergantung pada state apapun — dipanggil ulang tiap render itu murah, tidak perlu `useMemo`.

- [ ] **Step 2: Ganti state `monthFilter` jadi `filterMode`/`filterValue` (baris 53-54)**

Sebelum:
```typescript
  const [isExporting, setIsExporting] = useState(false)
  const [monthFilter, setMonthFilter] = useState("")
```

Sesudah:
```typescript
  const [isExporting, setIsExporting] = useState(false)
  const [filterMode, setFilterMode] = useState<QuotaFilterMode>("bulanan")
  const [filterValue, setFilterValue] = useState("")
  const { startDate, endDate } = getQuotaDateRange(filterMode, filterValue)
```

- [ ] **Step 3: Ganti query string di `fetcher` — hapus param `tanggal`, pakai `startDate`/`endDate` (baris 99-124)**

Sebelum:
```typescript
  const fetcher = useCallback(async (params: DataTableParams) => {
    const qs = new URLSearchParams({
      draw:   String(params.draw),
      start:  String(params.start),
      length: String(params.length),
      search: params.search || "",
      tanggal: monthFilter || params.columnFilters?.tanggal || "",
      produk:  params.columnFilters?.produk  || "",
      status:  params.columnFilters?.status  || "",
    })
    if (activeCompanyCode) qs.set("companyCode", activeCompanyCode)
    const res = await fetch(`/api/kuota/schedule?${qs}`)
    const data = await res.json()
    if (!data.success) throw new Error(data.error || "Gagal memuat data")
    
    // Update metrics from response if available (only on page 1)
    if (data.metrics) {
      setMetrics(data.metrics)
    }

    return {
      data: data.data ?? [],
      recordsTotal:    data.recordsTotal    ?? 0,
      recordsFiltered: data.recordsFiltered ?? 0,
    }
  }, [activeCompanyCode])
```

Sesudah:
```typescript
  const fetcher = useCallback(async (params: DataTableParams) => {
    const qs = new URLSearchParams({
      draw:   String(params.draw),
      start:  String(params.start),
      length: String(params.length),
      search: params.search || "",
      produk:  params.columnFilters?.produk  || "",
      status:  params.columnFilters?.status  || "",
      startDate,
      endDate,
    })
    if (activeCompanyCode) qs.set("companyCode", activeCompanyCode)
    const res = await fetch(`/api/kuota/schedule?${qs}`)
    const data = await res.json()
    if (!data.success) throw new Error(data.error || "Gagal memuat data")
    
    // Update metrics from response if available (only on page 1)
    if (data.metrics) {
      setMetrics(data.metrics)
    }

    return {
      data: data.data ?? [],
      recordsTotal:    data.recordsTotal    ?? 0,
      recordsFiltered: data.recordsFiltered ?? 0,
    }
  }, [activeCompanyCode, startDate, endDate])
```

- [ ] **Step 4: Ganti `queryKey` dan `toolbar` di `<DataTable>` (baris 337-361)**

Sebelum:
```tsx
          <DataTable<QuotaRow>
            queryKey={["kuota-schedule", activeCompanyCode ?? "all", monthFilter]}
            fetcher={fetcher}
            columns={columns}
            rowKey={(r) => r.guid || r.id}
            searchPlaceholder="Cari produk..."
            defaultPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyText="Belum ada jadwal kuota."
            toolbar={
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4 shrink-0" />
                <Input
                  type="month"
                  className="h-8 w-36 text-xs bg-white dark:bg-gray-800"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                />
                {monthFilter && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500" onClick={() => setMonthFilter("")}>
                    ✕
                  </Button>
                )}
              </div>
            }
          />
```

Sesudah:
```tsx
          <DataTable<QuotaRow>
            queryKey={["kuota-schedule", activeCompanyCode ?? "all", filterMode, filterValue]}
            fetcher={fetcher}
            columns={columns}
            rowKey={(r) => r.guid || r.id}
            searchPlaceholder="Cari produk..."
            defaultPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyText="Belum ada jadwal kuota."
            toolbar={
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4 shrink-0" />
                <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
                  {(["harian", "bulanan", "tahunan"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setFilterMode(mode)
                        setFilterValue("")
                      }}
                      className={`px-2.5 h-8 text-xs font-semibold capitalize transition-colors ${
                        filterMode === mode
                          ? "bg-brand-500 text-white"
                          : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                {filterMode === "harian" && (
                  <Input
                    type="date"
                    className="h-8 w-36 text-xs bg-white dark:bg-gray-800"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                )}
                {filterMode === "bulanan" && (
                  <Input
                    type="month"
                    className="h-8 w-36 text-xs bg-white dark:bg-gray-800"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                )}
                {filterMode === "tahunan" && (
                  <Input
                    type="number"
                    placeholder="Tahun"
                    min={2015}
                    max={2100}
                    className="h-8 w-24 text-xs bg-white dark:bg-gray-800"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                )}
                {filterValue && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500" onClick={() => setFilterValue("")}>
                    ✕
                  </Button>
                )}
              </div>
            }
          />
```

- [ ] **Step 5: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```

Expected: 0 error baru di `src/app/kuota/schedule/page.tsx`.

- [ ] **Step 6: Manual verification — jalankan dev server dan test di browser**

```powershell
cd "C:\Users\weka\Indigo\sistropigroup"
.\start-dev.ps1
```

Buka `http://localhost:3000/kuota/schedule`, lalu untuk tiap mode:

1. **Bulanan (default):** pilih bulan yang ada datanya → DataTable cuma tampilkan baris tanggal di bulan itu, 4 kartu metrik berubah nilainya (bandingkan dengan total sebelum filter di-set).
2. **Harian:** klik toggle "harian" → pilih satu tanggal → DataTable cuma tampilkan 1 baris (atau baris-baris di tanggal itu kalau ada multi-produk), kartu metrik ikut mengecil ke jumlah hari itu saja.
3. **Tahunan:** klik toggle "tahunan" → isi tahun (mis. `2026`) → DataTable tampilkan seluruh baris tahun itu, kartu metrik jadi total setahun.
4. **Clear filter:** klik ✕ → DataTable & kartu balik ke agregat penuh (tidak terfilter).
5. Buka DevTools → Network → cek request ke `/api/kuota/schedule` membawa `startDate`/`endDate` yang benar sesuai mode yang dipilih, dan response `metrics` berubah mengikuti filter.

- [ ] **Step 7: Commit**

```bash
git add src/app/kuota/schedule/page.tsx
git commit -m "feat: add harian/bulanan/tahunan filter mode to kuota schedule page"
```

---

## Self-Review

**Spec coverage:**
- ✅ Filter per bulan — mode "bulanan", `type="month"` input, dihitung jadi range awal-akhir bulan via `date-fns`.
- ✅ Filter per tahun — mode "tahunan", `type="number"` input 4-digit, dihitung jadi range 1 Jan–31 Des.
- ✅ Filter per hari — mode "harian", `type="date"` input, `startDate === endDate === value`.
- ✅ DataTable menyesuaikan filter — `queryKey` include `filterMode`/`filterValue` supaya refetch, `fetcher` kirim `startDate`/`endDate` ke backend yang sekarang benar-benar melakukan range filter (bukan exact-match yang gagal untuk bulan/tahun).
- ✅ Kartu data (4 metric cards) menyesuaikan filter — `metrics` sudah diisi dari response `route.ts` yang meng-clone `body` request yang sama (termasuk `SD`/`ED` baru), jadi otomatis konsisten tanpa perubahan tambahan di sisi metrics.

**Placeholder scan:** Tidak ada `TODO`/`TBD` — semua step berisi kode lengkap yang bisa langsung ditempel.

**Type consistency:** `QuotaFilterMode` dipakai konsisten di `useState<QuotaFilterMode>`, parameter `getQuotaDateRange(mode: QuotaFilterMode, ...)`, dan literal array `(["harian", "bulanan", "tahunan"] as const)` di toolbar — ketiganya harus match persis kalau ada yang diubah nanti.

**Known out-of-scope gap (dicatat, sengaja tidak diperbaiki):** `handleExport()` (baris 60-97) membangun query string sendiri dan dari awal memang tidak pernah menerapkan filter tanggal apa pun (bug pre-existing, independen dari perubahan ini) — export selalu ambil semua data. Tidak diminta user, jadi tidak disentuh di plan ini; kalau mau export ikut filter aktif, itu task terpisah (tinggal tambah `startDate`/`endDate` ke `qs` di `handleExport` dengan cara yang sama seperti Step 3 Task 3).
