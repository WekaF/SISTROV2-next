# Fix Labels + Tambah Pos 04 di Live Monitoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perbaiki label pos agar sesuai master data resmi SISTRO dan tambahkan section Pos 04 (Checkout Gudang Pemuatan) di live-monitoring.

**Architecture:** Semua perubahan di satu file frontend. Backend `DataTableMonitorPosition` sudah support `position` parameter apapun — tinggal fetch pos 04 parallel. Tidak ada perubahan backend.

**Master data posisi resmi:**
- 02 = Armada sampai di Timbang Kosong (antri mau masuk gudang)
- 03 = Armada tiba di Gudang (sedang dimuati)
- 04 = Checkout Gudang Pemuatan (selesai muat, menunggu keluar)

**Tech Stack:** Next.js 16, React, TypeScript.

---

## File Map

| File | Change |
|---|---|
| `src/app/antrian/live-monitoring/page.tsx` | Semua perubahan: state pos 04, fetch pos 04, fix semua label, tambah section pos 04 |

---

## Task 1: Tambah pos 04 fetch + fix semua label + tambah section UI

**Files:**
- Modify: `src/app/antrian/live-monitoring/page.tsx`

### Perubahan yang diperlukan

**A. State baru (setelah `realQueue` state, sekitar line 68):**

Tambah:
```typescript
const [realCheckout, setRealCheckout] = useState<RealTicket[]>([]);
const [totalCheckout, setTotalCheckout] = useState(0);
```

**B. Fetch pos 04 parallel (di dalam `fetchBays`, sekitar line 125–128):**

Sebelum:
```typescript
        const [baysResult, queueResult] = await Promise.all([
          apiTable<{ data: any[]; recordsTotal: number }>("/api/Tiket/DataTableMonitorPosition", { ...basePayload, length: 200, position: "03" }),
          apiTable<{ data: any[]; recordsTotal: number }>("/api/Tiket/DataTableMonitorPosition", { ...basePayload, length: 200, position: "02" }),
        ]);
```

Sesudah:
```typescript
        const [baysResult, queueResult, checkoutResult] = await Promise.all([
          apiTable<{ data: any[]; recordsTotal: number }>("/api/Tiket/DataTableMonitorPosition", { ...basePayload, length: 200, position: "03" }),
          apiTable<{ data: any[]; recordsTotal: number }>("/api/Tiket/DataTableMonitorPosition", { ...basePayload, length: 200, position: "02" }),
          apiTable<{ data: any[]; recordsTotal: number }>("/api/Tiket/DataTableMonitorPosition", { ...basePayload, length: 200, position: "04" }),
        ]);
```

**C. Set state pos 04 (dalam `if (!cancelled)` block):**

Tambah setelah `setTotalQueue(...)`:
```typescript
          setRealCheckout(Array.isArray(checkoutResult?.data) ? checkoutResult.data : []);
          setTotalCheckout(checkoutResult?.recordsTotal ?? checkoutResult?.data?.length ?? 0);
```

**D. Fix label page title (sekitar line 158–159):**

Sebelum:
```tsx
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Live Monitor Pintu Pemuatan</h1>
        <p className="text-sm text-gray-500 mt-1">Pemantauan real-time loading bay per plant</p>
```

Sesudah:
```tsx
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Live Monitor Antrian Gudang</h1>
        <p className="text-sm text-gray-500 mt-1">Pemantauan real-time armada Pos 02 · 03 · 04 per plant</p>
```

**E. Fix CardTitle + CardDescription (sekitar line 165–171):**

Sebelum:
```tsx
              Live Monitor Pintu Pemuatan (Loading Bays) & Antrean Gudang
            </CardTitle>
            <CardDescription className="text-xs text-gray-400 font-bold">
              Pemantauan real-time proses pengisian pupuk ke truk di dermaga muat (loading bay) masing-masing produsen pupuk
```

Sesudah:
```tsx
              Live Monitor Proses Muat Gudang — Pos 02 · 03 · 04
            </CardTitle>
            <CardDescription className="text-xs text-gray-400 font-bold">
              Armada Timbang Kosong (Pos 02) · Sedang Dimuat (Pos 03) · Checkout Gudang (Pos 04)
```

**F. Fix summary strip — 3 kartu (sekitar line 188–222):**

Ganti seluruh blok summary strip:
```tsx
          {/* Summary strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100 dark:border-gray-800/80 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-50 text-amber-500 dark:bg-amber-950/20 rounded-xl shrink-0">
                <Warehouse className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Pos 02 — Antrian Timbang Kosong</span>
                <span className="text-sm font-black text-gray-800 dark:text-white mt-0.5 block">
                  {realQueue.length} Truk Mengantre
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 rounded-xl shrink-0">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Pos 03 — Sedang Dimuat di Gudang</span>
                <span className="text-sm font-black text-gray-800 dark:text-white mt-0.5 block">
                  {realBays.length} Truk Sedang Dimuat
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-purple-50 text-purple-500 dark:bg-purple-950/20 rounded-xl shrink-0">
                <Activity className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Pos 04 — Checkout Gudang Pemuatan</span>
                <span className="text-sm font-black text-gray-800 dark:text-white mt-0.5 block">
                  {totalCheckout} Truk Selesai Muat
                </span>
              </div>
            </div>
          </div>
```

**G. Fix empty state text di bay grid (sekitar line 230):**

Sebelum:
```tsx
              <div className="col-span-full text-center py-10 text-gray-400 text-sm">Tidak ada truk sedang dimuat untuk plant ini.</div>
```

Sesudah:
```tsx
              <div className="col-span-full text-center py-10 text-gray-400 text-sm">Tidak ada truk sedang dimuat di Pos 03 untuk plant ini.</div>
```

**H. Fix "Pintu Siap Digunakan" text (sekitar line 353):**

Sebelum:
```tsx
                      <p className="text-[9px] text-gray-400/70">Menunggu panggilan truk berikutnya dari antrean Pos 02</p>
```

Sesudah:
```tsx
                      <p className="text-[9px] text-gray-400/70">Menunggu panggilan truk dari antrian Timbang Kosong (Pos 02)</p>
```

**I. Tambah section Pos 04 antara bay grid dan queue strip (sebelum `{/* Queue strip */}`):**

Setelah penutup `</div>` bay grid (sekitar line 359) dan sebelum `{/* Queue strip */}`:

```tsx
          {/* Pos 04 — Checkout Gudang Pemuatan */}
          {realCheckout.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
              <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3.5 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-purple-500" />
                Pos 04 — Checkout Gudang Pemuatan ({realCheckout.length} Truk Selesai Muat)
              </h4>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {realCheckout.map((q, idx) => (
                  <div key={idx} className="bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 p-3 rounded-xl min-w-[200px] flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-100/80 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-black">
                        #{idx + 1}
                      </div>
                      <div>
                        <span className="text-xs font-black text-gray-800 dark:text-white block">{q.nopol}</span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">{q.driver} • {q.produkString}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col gap-0.5 items-end">
                      <span className="text-[9px] font-mono font-bold text-gray-600 dark:text-gray-300">{q.bookingno}</span>
                      <span className="text-[8px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded font-bold">Selesai Muat</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
```

**J. Fix queue section header (sekitar line 363–365):**

Sebelum:
```tsx
            <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3.5 flex items-center gap-1.5">
              <Warehouse className="h-4 w-4 text-brand-500" />
              Antrean Truk Berikutnya di Gerbang Gudang (Pos 02)
            </h4>
```

Sesudah:
```tsx
            <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3.5 flex items-center gap-1.5">
              <Warehouse className="h-4 w-4 text-amber-500" />
              Pos 02 — Antrian Timbang Kosong (Menunggu Masuk Gudang)
            </h4>
```

---

- [ ] **Step 1: Read file lines 60–75** — konfirmasi state declarations dan exact text.

- [ ] **Step 2: Tambah state `realCheckout` dan `totalCheckout`** (setelah `realQueue` state).

- [ ] **Step 3: Read lines 120–145** — konfirmasi exact Promise.all block.

- [ ] **Step 4: Edit fetch — tambah pos 04 ke Promise.all + set state.**

- [ ] **Step 5: Read lines 155–175** — konfirmasi page title + CardTitle exact text.

- [ ] **Step 6: Edit D + E — fix page title, CardTitle, CardDescription.**

- [ ] **Step 7: Read lines 185–225** — konfirmasi summary strip exact text.

- [ ] **Step 8: Edit F — replace seluruh summary strip dengan versi baru (3 kartu dengan label pos resmi).**

- [ ] **Step 9: Read lines 225–235** — konfirmasi empty state text.

- [ ] **Step 10: Edit G — fix empty state text.**

- [ ] **Step 11: Read lines 348–370** — konfirmasi "Pintu Siap Digunakan" + queue header exact text.

- [ ] **Step 12: Edit H — fix "Pintu Siap Digunakan" text.**

- [ ] **Step 13: Edit I — insert pos 04 section SEBELUM `{/* Queue strip */}` comment.**

- [ ] **Step 14: Edit J — fix queue section header.**

- [ ] **Step 15: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: 0 errors.

- [ ] **Step 16: Commit**

```bash
git add src/app/antrian/live-monitoring/page.tsx
git commit -m "feat: add pos 04 section + fix position labels to match SISTRO master data"
```

---

## Self-Review

**Spec coverage:**
- ✅ Label pos 02 = "Antrian Timbang Kosong" (bukan "Antrean Gudang")
- ✅ Label pos 03 = "Sedang Dimuat di Gudang" (bukan "Status Docks Aktif")
- ✅ Pos 04 = section baru "Checkout Gudang Pemuatan" dengan kartu purple
- ✅ Summary strip: pos 02 + pos 03 + pos 04 (ganti fake "34 Menit" card)
- ✅ Page title dan CardTitle diupdate
- ✅ Fetch pos 04 parallel (tidak tambah latency)
- ✅ Pos 04 section hanya muncul kalau ada data (conditional render)

**Placeholder scan:** None — semua JSX lengkap.

**Type consistency:** `realCheckout: RealTicket[]` — sama dengan `realQueue` dan `realBays`.
