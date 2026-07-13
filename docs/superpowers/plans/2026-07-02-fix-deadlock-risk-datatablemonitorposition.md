# Fix Deadlock Risk di DataTableMonitorPosition

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Endpoint `DataTableMonitorPosition` (dipoll tiap 30 detik dari live-monitoring, sekarang eager-load JOIN besar setelah fix N+1) berisiko deadlock dengan transaksi booking tiket yang sedang berjalan, karena keduanya menyentuh tabel `Posto` dan `Kuota4Shift` secara bersamaan. Bikin query monitoring ini tidak pernah ambil lock yang bisa bentrok — supaya tidak mem-fail-kan transaksi user lain (driver/transport yang lagi booking tiket).

**Root Cause (terverifikasi):**
- `createTiketBaru` (`TiketController.cs:1960`) dan method serupa di `MobileTransportController.cs:1012` — dipakai tiap kali user booking tiket baru — jalankan raw SQL `SELECT * FROM Kuota4Shift WITH (UPDLOCK) ...` dan `SELECT * FROM Posto WITH (UPDLOCK) ...` di dalam explicit transaction (`db.Database.BeginTransaction()`), untuk mencegah double-booking kuota. Lock ini **ditahan sampai transaksi commit/rollback**.
- `DataTableMonitorPosition` (`TiketController.cs:3596`) — endpoint yang kita bangun sesi lalu — JOIN ke `Posto1` (tabel `Posto`) dan `Kuota4Shift` lewat `.Include()`, di bawah isolation level default (`READ COMMITTED`). Query ini dipoll tiap 30 detik oleh setiap viewer yang buka `/antrian/live-monitoring`, dan untuk company `PI` (semua plant) scan-nya jauh lebih besar (lintas semua plant, bukan 1 company).
- Kedua sisi menyentuh tabel yang sama (`Posto`, `Kuota4Shift`) dengan mode lock berbeda (UPDLOCK vs shared read lock) dan urutan akses berbeda (booking: Kuota4Shift dulu baru Posto; monitoring: JOIN bebas urutan lewat query planner) — kombinasi klasik penyebab deadlock di SQL Server. Kalau kena, SQL Server pilih salah satu transaksi jadi "victim" dan di-kill — bisa jadi transaksi booking user lain yang gagal, bukan query monitoring kita.

**Fix:** Jalankan bagian eksekusi query `DataTableMonitorPosition` (yang materialize data + hitung total) di bawah `READ UNCOMMITTED` isolation level, khusus untuk request itu saja, lalu **selalu** reset balik ke `READ COMMITTED` di blok `finally` sebelum method selesai — supaya connection yang balik ke pool tidak "bocor" isolation level ini ke request lain yang tidak terkait. Endpoint ini murni untuk tampilan dashboard (bukan sumber kebenaran finansial/kuota), jadi baca data yang mungkin sedikit "kotor" (belum commit) aman — trade-off standar untuk endpoint monitoring vs OLTP write path.

**Kenapa bukan fix di level database (RCSI):** Alternatif "benar" jangka panjang adalah enable `READ_COMMITTED_SNAPSHOT` di level database (menghilangkan reader-writer blocking untuk SEMUA query, otomatis). Itu perubahan besar (`ALTER DATABASE`), berdampak ke seluruh sistem (bukan cuma endpoint ini), butuh testing beban dan approval DBA — di luar scope perubahan kode ini. Dicatat sebagai rekomendasi lanjutan, bukan dieksekusi di plan ini.

**Tech Stack:** ASP.NET Framework 4.5 C#, Entity Framework 6, SQL Server.

---

## File Map

| File | Change |
|---|---|
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` | `DataTableMonitorPosition`: bungkus eksekusi query (materialize + count) dengan `SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED` → `finally` reset ke `READ COMMITTED` |

---

## Task 1: Isolasi query monitoring dari lock booking tiket

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` (method `DataTableMonitorPosition`, line 3683-3745)

### Context

Kode saat ini (line 3683-3745) — eksekusi query langsung tanpa isolasi:

```csharp
                List<TiketView> dt = datapaging.AsEnumerable().Select((x, i) => new TiketView
                {
                    number = i + 1,
                    id = x.id,
                    bookingno = x.bookingno,
                    tiketno = x.tiketno,
                    posto = x.posto,
                    idshift = x.idshift,
                    shift = x.Kuota4Shift != null ? x.Kuota4Shift.shift : "",
                    tanggal = x.tanggal,
                    tanggalPOSTO = x.Posto1 != null ? String.Format("{0:dd MMMM yyyy}", x.Posto1.tglposto) : "",
                    tanggalString = String.Format("{0:dd MMMM yyyy}", x.tanggal),
                    idtransport = x.idtransport,
                    transportString = x.Transport != null ? x.Transport.nama : "",
                    idproduk = x.idproduk,
                    produkString = x.Produk != null ? x.Produk.Nama : "",
                    asal = (x.Posto1 != null && x.Posto1.Gudang != null) ? x.Posto1.Gudang.Deskripsi : "",
                    tujuan = (x.Posto1 != null && x.Posto1.Gudang1 != null) ? (x.Posto1.Gudang1.Deskripsi == null ? "" : x.Posto1.Gudang1.Deskripsi) : "",
                    gudangtujuan = x.Antrian != null ? (x.Antrian.Gudang_SPPT != null ? x.Antrian.Gudang_SPPT.deskripsi : x.Antrian.storageID) : "",
                    nopol = x.nopol,
                    driver = x.driver,
                    qty = x.qty,
                    qtyPOSTO = x.Posto1 != null ? x.Posto1.qty : 0,
                    statuspemuatan = x.statuspemuatan,
                    position = x.position,
                    positionString = x.M_Status1 != null ? x.M_Status1.keterangan : "",
                    timesec = x.timesec,
                    timekosong = x.timekosong,
                    timegudang = x.timegudang,
                    timemuat = x.timemuat,
                    timeisi = x.timeisi,
                    string_timesec = x.timesec.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timesec.Value) : "",
                    string_timekosong = x.timekosong.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timekosong.Value) : "",
                    string_timegudang = x.timegudang.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timegudang.Value) : "",
                    string_timemuat = x.timemuat.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timemuat.Value) : "",
                    string_timeisi = x.timeisi.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timeisi.Value) : "",
                    string_timeout = x.timeout.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timeout.Value) : "",
                    donumber = x.donumber,
                    Kabupaten = (x.Posto1 != null && x.Posto1.Gudang1 != null) ? x.Posto1.Gudang1.Kabupaten : "",
                    updatedby = x.updatedby,
                    updatedon = x.updatedon,
                    updatedonString = String.Format("{0:dd MMMM yyyy}", x.updatedon),
                    revised = x.revised,
                    validsecurity = x.validsecurity,
                    validisi = x.validisi,
                    emergencystatus = x.emergencystatus,
                    statusticket = x.statusticket,
                    holdreason = x.holdreason,
                    deletereason = x.deletereason,
                    pic = x.pic,
                    percepatan = x.Posto1 != null ? x.Posto1.Percepatan : "",
                    company = x.Posto1 != null ? x.Posto1.company_code : "",
                    Action = ""
                }).ToList();

                long count = datasearch.Count();
                return Json((object)new
                {
                    data = dt,
                    draw = drawStr,
                    recordsTotal = count,
                    recordsFiltered = count
                });
```

- [ ] **Step 1: Edit — bungkus dengan isolation level READ UNCOMMITTED + finally reset**

Ganti seluruh blok di atas (line 3683-3745, dari `List<TiketView> dt = datapaging...` sampai `});` penutup `Json`) menjadi:

```csharp
                // Reporting query — never block or get blocked by the ticket-booking hot path
                // (createTiketBaru / MobileTransportController use WITH (UPDLOCK) on Posto and
                // Kuota4Shift, tables this query also joins through). READ UNCOMMITTED means this
                // dashboard poll takes no shared locks, eliminating deadlock risk against writers.
                // Always reset in finally — the underlying connection returns to the pool and must
                // not leak this isolation level into an unrelated request.
                db.Database.ExecuteSqlCommand("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED");
                List<TiketView> dt;
                long count;
                try
                {
                    dt = datapaging.AsEnumerable().Select((x, i) => new TiketView
                    {
                        number = i + 1,
                        id = x.id,
                        bookingno = x.bookingno,
                        tiketno = x.tiketno,
                        posto = x.posto,
                        idshift = x.idshift,
                        shift = x.Kuota4Shift != null ? x.Kuota4Shift.shift : "",
                        tanggal = x.tanggal,
                        tanggalPOSTO = x.Posto1 != null ? String.Format("{0:dd MMMM yyyy}", x.Posto1.tglposto) : "",
                        tanggalString = String.Format("{0:dd MMMM yyyy}", x.tanggal),
                        idtransport = x.idtransport,
                        transportString = x.Transport != null ? x.Transport.nama : "",
                        idproduk = x.idproduk,
                        produkString = x.Produk != null ? x.Produk.Nama : "",
                        asal = (x.Posto1 != null && x.Posto1.Gudang != null) ? x.Posto1.Gudang.Deskripsi : "",
                        tujuan = (x.Posto1 != null && x.Posto1.Gudang1 != null) ? (x.Posto1.Gudang1.Deskripsi == null ? "" : x.Posto1.Gudang1.Deskripsi) : "",
                        gudangtujuan = x.Antrian != null ? (x.Antrian.Gudang_SPPT != null ? x.Antrian.Gudang_SPPT.deskripsi : x.Antrian.storageID) : "",
                        nopol = x.nopol,
                        driver = x.driver,
                        qty = x.qty,
                        qtyPOSTO = x.Posto1 != null ? x.Posto1.qty : 0,
                        statuspemuatan = x.statuspemuatan,
                        position = x.position,
                        positionString = x.M_Status1 != null ? x.M_Status1.keterangan : "",
                        timesec = x.timesec,
                        timekosong = x.timekosong,
                        timegudang = x.timegudang,
                        timemuat = x.timemuat,
                        timeisi = x.timeisi,
                        string_timesec = x.timesec.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timesec.Value) : "",
                        string_timekosong = x.timekosong.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timekosong.Value) : "",
                        string_timegudang = x.timegudang.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timegudang.Value) : "",
                        string_timemuat = x.timemuat.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timemuat.Value) : "",
                        string_timeisi = x.timeisi.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timeisi.Value) : "",
                        string_timeout = x.timeout.HasValue ? String.Format("{0:dd MMMM yyyy HH:mm}", x.timeout.Value) : "",
                        donumber = x.donumber,
                        Kabupaten = (x.Posto1 != null && x.Posto1.Gudang1 != null) ? x.Posto1.Gudang1.Kabupaten : "",
                        updatedby = x.updatedby,
                        updatedon = x.updatedon,
                        updatedonString = String.Format("{0:dd MMMM yyyy}", x.updatedon),
                        revised = x.revised,
                        validsecurity = x.validsecurity,
                        validisi = x.validisi,
                        emergencystatus = x.emergencystatus,
                        statusticket = x.statusticket,
                        holdreason = x.holdreason,
                        deletereason = x.deletereason,
                        pic = x.pic,
                        percepatan = x.Posto1 != null ? x.Posto1.Percepatan : "",
                        company = x.Posto1 != null ? x.Posto1.company_code : "",
                        Action = ""
                    }).ToList();

                    count = datasearch.Count();
                }
                finally
                {
                    db.Database.ExecuteSqlCommand("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
                }

                return Json((object)new
                {
                    data = dt,
                    draw = drawStr,
                    recordsTotal = count,
                    recordsFiltered = count
                });
```

Perhatikan: field-field di dalam `new TiketView { ... }` TIDAK berubah sama sekali — hanya struktur di sekelilingnya (deklarasi `dt`/`count` di luar try, isolation level SET sebelum, `finally` reset sesudah).

- [ ] **Step 2: Verify compile**

```powershell
cd "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME"
msbuild SISTROAWESOME.csproj /t:Build /p:Configuration=Debug /v:m
```

Expected: Build succeeded, 0 errors. `db.Database.ExecuteSqlCommand(string)` adalah API standar `System.Data.Entity.Database` (sudah di-import line 7) — tidak perlu dependency baru.

- [ ] **Step 3: Commit backend**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "fix: isolate DataTableMonitorPosition reads from booking-transaction locks (deadlock risk)"
```

---

## Task 2: Verifikasi manual

**Catatan:** ikuti pola sesi sebelumnya — pastikan backend dev environment (Web.config → SISTROSTAGING) stabil sebelum tes, dan app pool sudah restart supaya perubahan aktif.

- [ ] **Step 1: Buka `/antrian/live-monitoring`, biarkan polling jalan beberapa menit** sambil ada aktivitas booking tiket normal (kalau memungkinkan, minta orang lain booking tiket di waktu bersamaan) — pastikan tidak ada error 500 baru dan booking tiket tetap sukses.

- [ ] **Step 2: Cek response `DataTableMonitorPosition` di Network tab** — pastikan tetap mengembalikan data (bukan error), dan waktu response tidak melonjak dibanding sebelum fix ini.

---

## Self-Review

**Spec coverage:**
- ✅ Root cause deadlock teridentifikasi & diverifikasi lewat kode nyata (`WITH (UPDLOCK)` di `createTiketBaru` dan `MobileTransportController`, tabel yang sama di-JOIN `DataTableMonitorPosition`)
- ✅ Fix scoped ke endpoint yang kita miliki/aktif dipoll (`DataTableMonitorPosition`), tidak menyentuh transaksi booking (yang justru harus tetap pakai UPDLOCK — itu benar untuk mencegah double-booking kuota)
- ✅ Isolation level SELALU direset (`finally`) — mencegah bocor ke request lain lewat connection pooling
- ✅ Tidak mengubah field/logic proyeksi TiketView — murni pembungkus isolasi
- ✅ Dicatat eksplisit kenapa fix DB-level (RCSI) tidak dieksekusi di sini — di luar scope perubahan kode, high blast radius, butuh approval terpisah

**Placeholder scan:** None — semua kode lengkap, bukan referensi "sama seperti sebelumnya".

**Catatan tambahan (di luar scope, FYI):** `DataTableFilterLegacy` (endpoint asal yang di-copy jadi `DataTableMonitorPosition`, dipakai `ViewerDashboard` dan halaman lain) punya pola JOIN yang sama ke `Posto`/`Kuota4Shift` — berpotensi risiko deadlock serupa. Tidak diperbaiki di plan ini karena scope-nya lebih luas (dipakai banyak role/halaman, butuh review terpisah). Kandidat fix lanjutan kalau ada laporan serupa dari endpoint itu.
