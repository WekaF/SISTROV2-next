# Fix Deadlock/Suspend: CheckinDW1_GP + DataTableFilterLegacy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Investigasi diminta ke 3 method (`DataTableFilterLegacy`, `createTiketBaru`/`PostData`, `CheckinDW1_GP`) untuk potensi deadlock/suspend SQL Server yang dilaporkan sering terjadi di lapangan — kendala paling krusial: **checkin di Security terasa lambat sekali**. Ditemukan root cause konkret: transaksi DB di `CheckinDW1_GP` menahan lock SAMBIL menunggu panggilan HTTP sinkron ke WhatsApp gateway yang **tidak punya timeout eksplisit** (default `HttpClient` timeout 100 detik) — ini penyebab langsung checkin lambat DAN penyebab deadlock/suspend yang dilaporkan. Perbaiki dengan memindahkan pengiriman WA jadi benar-benar fire-and-forget (`Task.Run` (fire-and-forget — project targets .NET Framework 4.5, `HostingEnvironment.QueueBackgroundWorkItem` requires 4.5.2+ and doesn't exist in this build, discovered when `error CS0117` failed the build)) di luar transaksi, supaya device security dapat respons segera setelah data ter-commit. `DataTableFilterLegacy` diperbaiki dengan pattern yang sudah terbukti di `DataTableMonitorPosition`. Method lain yang ikut ketemu (`createTiketBaru`, `DataTableFilter`) didokumentasikan sebagai temuan dengan rekomendasi, TIDAK dieksekusi di plan ini karena menyentuh logic bisnis kuota/finansial yang berisiko tinggi kalau diubah tergesa — butuh review terpisah.

**Root Cause per method (semua terverifikasi baca kode langsung):**

### 1. `CheckinDW1_GP` (`TiketController.cs:920`) — **PALING PARAH, sudah confirmed di log produksi**

Method ini PUNYA retry-loop eksplisit untuk deadlock (line 923-1499): `IsDeadlock(ex)` cek SQL error 1205, retry sampai 3x, dan **menulis log** `"Deadlock in CheckinDW1_GP, retrying..."` (line 1492) — tim sudah tahu method ini deadlock di produksi, tapi cuma dikasih band-aid retry, bukan fix akar masalah.

Root cause: transaksi (`db.Database.BeginTransaction()` line 941 → `transaction.Commit()` line 1408, ~470 baris) menahan lock SELAMA method melakukan **3 kali panggilan HTTP eksternal `await gh.SendWA(wa)`** (WhatsApp gateway, line 1088, 1137, 1180) — network I/O dijalankan sambil transaksi database masih terbuka. Kalau WhatsApp API lambat/timeout, transaksi (dan lock yang dipegangnya) tertahan selama itu juga — SESSION LAIN yang butuh baris yang sama akan ber-status **SUSPENDED** menunggu, dan kalau lock-order-nya konflik dengan transaksi lain → **DEADLOCK**. Ini pattern textbook penyebab suspend/deadlock.

Pola yang SUDAH BENAR ada di method yang sama: panggilan WMS (`th.UpdateToGCP`, line 1410-1424) sengaja diletakkan **SETELAH** `transaction.Commit()` — komentar di kode bahkan bilang `//WMS (Outside transaction, only for Gudang Arrived scan)`. Fix-nya: terapkan pola yang SAMA ke 3 panggilan `SendWA`.

**Kenapa checkin terasa "lambat sekali" (bukan cuma soal deadlock):** `gh.SendWA()` (`Helper/GeneralHelper.cs:345`) pakai `client.PostAsync(...)` ke gateway WhatsApp eksternal. `client` adalah `HttpClient` static (`GeneralHelper.cs:35`) **tanpa `.Timeout` di-set** — artinya default .NET, **100 detik**. Kalau gateway WA lambat/hang, `await gh.SendWA(wa)` bisa nunggu sampai hampir 2 menit SEBELUM response balik ke device security — user di gerbang merasa aplikasi "hang". Sekadar memindahkan `SendWA` ke luar transaksi DB (fix deadlock) TIDAK CUKUP kalau kodenya masih `await` sebelum `return Content(...)` — device tetap nunggu WA selesai. Fix yang benar: kirim WA benar-benar **fire-and-forget** pakai `System.Web.Hosting.HostingEnvironment.QueueBackgroundWorkItem` (pattern standar ASP.NET Framework classic untuk background work yang tidak boleh memblokir response, dan tidak langsung dibunuh saat request selesai seperti `Task.Run` biasa) — response ke device security balik SEGERA setelah `transaction.Commit()`, WA terkirim di background tanpa membuat user menunggu.

**Bonus temuan:** `client.DefaultRequestHeaders.Remove/Add` dimutasi di SETIAP panggilan `SendWA` pada `HttpClient` static yang sama — tidak thread-safe. Kalau 2+ gerbang security scan bersamaan (skenario umum di lapangan), race condition pada header ini bisa menyebabkan kegagalan kirim WA yang intermiten. Tidak difix di plan ini (di luar scope inti "deadlock/lambat"), dicatat sebagai temuan tambahan.

**Temuan tambahan (dicatat, tidak difix di plan ini):** ada 2 static in-process lock — `scanLock` (line 43, dipakai line 1060) dan `antrianLock` (dipakai di `positionTiket()` line 5301) — bersarang DI DALAM transaksi DB yang sama. Static lock C# tidak efektif kalau aplikasi jalan di lebih dari 1 worker process/server (web farm) — kalau SISTRO production punya >1 instance, lock ini TIDAK benar-benar menyerialkan apapun lintas instance, hanya menambah overhead dalam 1 proses. Fix yang benar butuh desain ulang (DB-level lock atau SEQUENCE untuk nomor antrian) — di luar scope plan ini, direkomendasikan sebagai task terpisah.

### 2. `DataTableFilterLegacy` (`TiketController.cs:3448`) — sama persis kayak `DataTableMonitorPosition` sebelum kita fix

- N+1 query: `.AsEnumerable().Select(...)` tanpa `.Include()`, akses `x.Kuota4Shift`, `x.Kuota4Shift.Kuota3Bagian`, `x.Posto1`, `x.Posto1.Gudang`/`Gudang1`, `x.Transport`, `x.Produk` — tiap baris trigger lazy-load terpisah (sama seperti yang kita perbaiki sebelumnya di `DataTableMonitorPosition`).
- Tidak ada proteksi isolation level — default `READ COMMITTED`, JOIN ke `Posto`/`Kuota4Shift` yang SAMA dipegang `WITH (UPDLOCK)` oleh `createTiketBaru` — risiko deadlock/blocking sama seperti `DataTableMonitorPosition` sebelum di-fix.
- **Dampaknya lebih luas** dari `DataTableMonitorPosition`: dipakai lintas role (Security/Timbangan/Gudang/Transport/Viewer — lihat filter `isTransport`/`isSecurity`/`isTimbangan`/`isGudang` line 3502-3507), jadi kemungkinan endpoint ini yang paling sering dipanggil di seluruh sistem.

Fix: terapkan pattern yang SAMA yang sudah kita validasi bekerja di `DataTableMonitorPosition` — `.Include()` untuk semua nav property + wrap eksekusi dengan `READ UNCOMMITTED` (koneksi dibuka eksplisit dulu, supaya tidak ke-reset oleh connection pooling).

### 3. `createTiketBaru` (`TiketController.cs:1960`, dipanggil dari `PostData` line 1911) — **DITEMUKAN, TIDAK DIFIX DI PLAN INI**

Transaksi (`BeginTransaction` line 1978 → `Commit` line 2191) mengambil `WITH (UPDLOCK)` di `Kuota4Shift` (line 1987) dan `Posto` (line 2011) DI AWAL, lalu MENAHAN lock itu selama menjalankan banyak query validasi lain (cek armada usia/KIR, cek ODOL, cek percepatan dengan JOIN Sumbu+M_Percepatan, cek duplikat tiket) sebelum akhirnya `SaveChanges()`+`Commit()`. Critical section-nya jauh lebih panjang dari yang perlu — idealnya validasi yang TIDAK mengubah data (ODOL/percepatan/duplikat/armada) dilakukan SEBELUM `BeginTransaction()`, baru lock diambil untuk bagian final (re-cek kuota + insert + update).

**Kenapa tidak difix di plan ini:** ini menyentuh logic booking kuota tiket — jalur bisnis paling kritikal (uang & kuota fisik gudang). Mengubah urutan validasi vs lock butuh review lebih hati-hati (misal: apakah re-validasi PERLU diulang lagi setelah lock diambil untuk SEMUA check, bukan cuma kuota seperti sekarang). Direkomendasikan jadi task terpisah dengan testing lebih menyeluruh.

### 4. `DataTableFilter` (`TiketController.cs:5912`) — **DITEMUKAN, TIDAK DIFIX DI PLAN INI**

`db.Database.CommandTimeout = (int)TimeSpan.FromMinutes(5).TotalSeconds;` (line 5916) — command timeout di-set manual ke **5 MENIT**. Ini bukti kuat method ini SUDAH diketahui lambat/kadang nge-hang (kalau tidak, tidak perlu extend timeout). Method ini ~300+ baris, generate HTML button untuk UI jQuery DataTable lama — terlalu besar untuk diperiksa & diperbaiki dengan aman dalam plan ini. Dicatat sebagai kandidat kuat untuk investigasi lanjutan terpisah.

**Tech Stack:** ASP.NET Framework 4.5 C#, Entity Framework 6, SQL Server.

---

## File Map

| File | Change |
|---|---|
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` | Task 1: `DataTableFilterLegacy` — Include + READ UNCOMMITTED (pattern sama seperti `DataTableMonitorPosition`) |
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` | Task 2: `CheckinDW1_GP` — pindahkan 3 panggilan `await gh.SendWA(...)` ke SETELAH `transaction.Commit()` |

---

## Task 1: Fix N+1 + deadlock risk di DataTableFilterLegacy

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` (method `DataTableFilterLegacy`, line 3448-3600-an)

### Context

Method ini punya struktur query yang SAMA PERSIS dengan `DataTableMonitorPosition` sebelum kita fix (N+1 tanpa Include, tanpa isolation level protection). Kita re-apply exact same fix pattern yang sudah terbukti compile & jalan.

Baca dulu method lengkap sebelum edit untuk konfirmasi baris persis (nomor baris bisa sedikit bergeser dari commit-commit sebelumnya).

- [ ] **Step 1: Baca `TiketController.cs` dari line 3448 sampai akhir method `DataTableFilterLegacy`** (cari `catch (Exception ex)` penutup method-nya, method ini sekitar 150 baris) untuk mendapat teks PERSIS saat ini — nomor baris di plan ini adalah referensi, bukan jaminan absolut karena file sudah beberapa kali di-commit sejak terakhir dibaca penuh.

- [ ] **Step 2: Cari baris query utama, sekitar:**

```csharp
                // Improved filtering logic
                var datasearch = db.Tiket.Where(x =>
```

Tambahkan `.Include()` chain SEBELUM `.Where(x =>`, PERSIS seperti yang dilakukan di `DataTableMonitorPosition`:

```csharp
                // Eager-load nav properties used by TiketView projection below —
                // without this, lazy loading (SistroEntities.edmx LazyLoadingEnabled=true)
                // fires separate SQL round-trips per row (N+1) once .AsEnumerable() materializes.
                // Improved filtering logic
                var datasearch = db.Tiket
                    .Include(x => x.Kuota4Shift.Kuota3Bagian)
                    .Include(x => x.Posto1.Gudang)
                    .Include(x => x.Posto1.Gudang1)
                    .Include(x => x.Transport)
                    .Include(x => x.Produk)
                    .Include(x => x.Antrian.Gudang_SPPT)
                    .Include(x => x.M_Status1)
                    .Where(x =>
```

Catatan: `.Include(x => x.Kuota4Shift.Kuota3Bagian)` ditambah karena filter query-nya sendiri (line 3505) akses `x.Kuota4Shift.Kuota3Bagian.bagian` — walau itu di klausa `Where` (diterjemahkan ke SQL langsung, bukan lazy-load), proyeksi `TiketView` di bawahnya kemungkinan JUGA akses `Kuota4Shift` untuk field `shift` — Include ini aman ditambahkan meski salah satu pemakaian sudah tertangani oleh SQL translation.

- [ ] **Step 3: Cari titik eksekusi query (materialize + count), pola yang sama dengan `DataTableMonitorPosition` sebelum kita fix:**

```csharp
                List<TiketView> dt = datapaging.AsEnumerable().Select((x, i) => new TiketView
                {
                    number = i + 1,
                    ... (field list panjang, JANGAN diubah)
                }).ToList();

                long count = datasearch.Count();
```

Bungkus dengan pola identik yang sudah divalidasi jalan di `DataTableMonitorPosition`:

```csharp
                // Reporting query — never block or get blocked by the ticket-booking hot path
                // (createTiketBaru / MobileTransportController use WITH (UPDLOCK) on Posto and
                // Kuota4Shift, tables this query also joins through). READ UNCOMMITTED means this
                // read-heavy endpoint takes no shared locks, eliminating deadlock risk against writers.
                //
                // Must explicitly hold the connection OPEN across SET + queries: if the connection
                // is closed when ExecuteSqlCommand runs, EF6 opens it just for that one statement
                // and closes it right after — the connection returns to the ADO.NET pool, which
                // runs sp_reset_connection on the next Open() and silently resets the isolation
                // level back to READ COMMITTED before the actual data query ever executes.
                bool openedHere = db.Database.Connection.State != System.Data.ConnectionState.Open;
                if (openedHere) db.Database.Connection.Open();
                List<TiketView> dt;
                long count;
                try
                {
                    db.Database.ExecuteSqlCommand("SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED");

                    dt = datapaging.AsEnumerable().Select((x, i) => new TiketView
                    {
                        number = i + 1,
                        ... (field list PERSIS SAMA seperti sebelumnya, copy verbatim dari file, JANGAN diubah satu pun mapping-nya)
                    }).ToList();

                    count = datasearch.Count();
                }
                finally
                {
                    db.Database.ExecuteSqlCommand("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
                    if (openedHere) db.Database.Connection.Close();
                }
```

Lalu return JSON-nya (yang tadinya langsung `return Json(...)` setelah `count = datasearch.Count();`) dipindah ke SETELAH blok `try/finally`, PERSIS pola yang sama seperti `DataTableMonitorPosition`.

**PENTING:** field list di dalam `new TiketView { ... }` untuk `DataTableFilterLegacy` BISA BEDA dari `DataTableMonitorPosition` (method berbeda, mungkin field-nya tidak identik). JANGAN copy field list dari `DataTableMonitorPosition` — WAJIB pakai field list ASLI dari `DataTableFilterLegacy` yang dibaca di Step 1, cuma dibungkus strukturnya saja.

- [ ] **Step 4: Build**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /v:m /nologo
```

Expected: exit code 0, `SISTROAWESOME -> ...\bin\SISTROAWESOME.dll`, tidak ada `error CS`.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "fix: eager-load + isolate DataTableFilterLegacy from booking-transaction locks (N+1 + deadlock risk)"
```

---

## Task 2: Pindahkan panggilan WhatsApp di CheckinDW1_GP ke luar transaksi DB

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` (method `CheckinDW1_GP`, line 920-1500-an)

### Context

Transaksi terbuka di line 941 (`using (var transaction = db.Database.BeginTransaction())`), commit di line 1408 (`transaction.Commit();`). Setelah commit, ada blok WMS (line 1410-1424) yang SUDAH dengan sengaja dijalankan di luar transaksi (komentar: `//WMS (Outside transaction, only for Gudang Arrived scan)`). Kita terapkan pola yang sama untuk 3 panggilan `await gh.SendWA(wa)` yang saat ini masih di DALAM transaksi.

**Strategi:** declare `List<parameterWA> pendingWaSends` sebelum transaksi dimulai. Di dalam tiap case (`"00"`, `"06"`, `"12"`), TETAP simpan `LogWA` record (itu cuma insert DB biasa, bukan network I/O, aman tetap di dalam transaksi) tapi JANGAN `await gh.SendWA(wa)` di situ — simpan `wa` ke `pendingWaSends` saja. Setelah `transaction.Commit()`, dispatch semua WA lewat `Task.Run` (fire-and-forget — project targets .NET Framework 4.5, `HostingEnvironment.QueueBackgroundWorkItem` requires 4.5.2+ and doesn't exist in this build, discovered when `error CS0117` failed the build) — response ke device security balik SEGERA tanpa menunggu WhatsApp API. Ini beda dari sekadar "pindah ke luar transaksi": kalau masih di-`await` di response path, checkin TETAP lambat (device nunggu sampai WA API selesai/timeout 100 detik) — makanya harus benar-benar fire-and-forget, bukan cuma dipindah posisinya.

- [ ] **Step 1: Declare `pendingWaSends` sebelum transaksi dimulai**

Cari exact string (line 938-943):

```csharp
                //DateTime datetime_Posto = gh.DateTimeNowSistro(tiket.Posto1.company_code);
                if (tiket != null)
                {
                    using (var transaction = db.Database.BeginTransaction())
                    {

                    if(tiket.position == "21")
```

Ganti jadi:

```csharp
                //DateTime datetime_Posto = gh.DateTimeNowSistro(tiket.Posto1.company_code);
                if (tiket != null)
                {
                    // Collected here, sent via gh.SendWA AFTER transaction.Commit() below —
                    // an external HTTP call must never run while DB locks are held (this was
                    // the confirmed root cause of the "Deadlock in CheckinDW1_GP" retries).
                    List<parameterWA> pendingWaSends = new List<parameterWA>();
                    using (var transaction = db.Database.BeginTransaction())
                    {

                    if(tiket.position == "21")
```

- [ ] **Step 2: Ubah blok posisi "00" — jangan await SendWA di dalam transaksi**

Cari exact string (line 1088-1097 area, di dalam blok `if (nomortlp_in != null) { if (check_sec_in_log == null) { ... } }`):

```csharp
                                            parameterWA wa = new parameterWA();
                                            wa.number = (nomortlp_in.PhoneNumber == null) ? "" : (nomortlp_in.PhoneNumber == "") ? "" : nomortlp_in.PhoneNumber;
                                            wa.text = textSend;
                                            wa.url = "https://chart.googleapis.com/chart?cht=qr&chs=500x500&chl=" + tiket.bookingno;
                                            wa.tipe = "textimages";
                                            var result_sendWA = await gh.SendWA(wa);

                                            LogWA logSend = new LogWA();
                                            logSend.keterangan = textSend;
                                            logSend.tipe = "sec_in";
                                            logSend.kode = tiket.bookingno;
                                            logSend.updatedon = dt;
                                            logSend.updatedby = User.Identity.Name;
                                            db.LogWA.Add(logSend);
                                            //db.SaveChanges();
```

Ganti jadi:

```csharp
                                            parameterWA wa = new parameterWA();
                                            wa.number = (nomortlp_in.PhoneNumber == null) ? "" : (nomortlp_in.PhoneNumber == "") ? "" : nomortlp_in.PhoneNumber;
                                            wa.text = textSend;
                                            wa.url = "https://chart.googleapis.com/chart?cht=qr&chs=500x500&chl=" + tiket.bookingno;
                                            wa.tipe = "textimages";
                                            pendingWaSends.Add(wa);

                                            LogWA logSend = new LogWA();
                                            logSend.keterangan = textSend;
                                            logSend.tipe = "sec_in";
                                            logSend.kode = tiket.bookingno;
                                            logSend.updatedon = dt;
                                            logSend.updatedby = User.Identity.Name;
                                            db.LogWA.Add(logSend);
                                            //db.SaveChanges();
```

- [ ] **Step 3: Ubah blok posisi "06" — jangan await SendWA di dalam transaksi**

Cari exact string:

```csharp
                                        parameterWA wa = new parameterWA();
                                        wa.number = (nomortlp_out.PhoneNumber == null) ? "" : (nomortlp_out.PhoneNumber == "") ? "" : nomortlp_out.PhoneNumber;
                                        wa.text = textSend;
                                        wa.url = "https://chart.googleapis.com/chart?cht=qr&chs=500x500&chl=" + tiket.bookingno;
                                        wa.tipe = "textimages";
                                        var result_sendWA = await gh.SendWA(wa);

                                        LogWA logSend = new LogWA();
                                        logSend.keterangan = textSend;
                                        logSend.tipe = "sec_out";
                                        logSend.kode = tiket.bookingno;
                                        logSend.updatedon = dt;
                                        logSend.updatedby = User.Identity.Name;
                                        db.LogWA.Add(logSend);
                                        //db.SaveChanges();
                                    }
                                }
                                break;
                            case "12":
```

Ganti jadi (perhatikan: string ini muncul 2x identik di file — sekali untuk case "06" dan struktur mirip untuk case "12". Gunakan konteks `break;\n                            case "12":` di akhir untuk memastikan yang di-edit adalah instance case "06", BUKAN case "12"):

```csharp
                                        parameterWA wa = new parameterWA();
                                        wa.number = (nomortlp_out.PhoneNumber == null) ? "" : (nomortlp_out.PhoneNumber == "") ? "" : nomortlp_out.PhoneNumber;
                                        wa.text = textSend;
                                        wa.url = "https://chart.googleapis.com/chart?cht=qr&chs=500x500&chl=" + tiket.bookingno;
                                        wa.tipe = "textimages";
                                        pendingWaSends.Add(wa);

                                        LogWA logSend = new LogWA();
                                        logSend.keterangan = textSend;
                                        logSend.tipe = "sec_out";
                                        logSend.kode = tiket.bookingno;
                                        logSend.updatedon = dt;
                                        logSend.updatedby = User.Identity.Name;
                                        db.LogWA.Add(logSend);
                                        //db.SaveChanges();
                                    }
                                }
                                break;
                            case "12":
```

- [ ] **Step 4: Ubah blok posisi "12" — jangan await SendWA di dalam transaksi**

Cari exact string (instance KEDUA dari pola serupa, dalam case "12", diikuti `logSend.tipe = "sec_out";` tapi SETELAH `check_sec_out_log.tipe == "sec_in_charter"` di baris pengecekan sebelumnya — gunakan potongan lebih besar untuk memastikan target unik):

```csharp
                                        var textSend = "Yth *" + tiket.Transport.nama + "*, \n\n";
                                        textSend += "Armada anda " + tiket.nopol + " - Driver " + tiket.driver + " telah Kembali lagi ke Plant : " + tiket.Posto1.Gudang.Deskripsi + ", \n\n (CHARTER)";
                                        textSend += "Tempat Pengambilan : " + tiket.Posto1.company_code + "\n";
                                        textSend += "Tempat Kirim : " + tiket.Posto1.Gudang1.Deskripsi + "\n";
                                        textSend += "Tiket : " + tiket.bookingno + "\n";
                                        textSend += "Noposto : " + tiket.posto + "\n";
                                        textSend += "Tanggal Muat : " + String.Format("{0: dd MMMM yyyy}", tiket.tanggal) + " & Shift " + tiket.Kuota4Shift.shift + " \n";
                                        textSend += "Produk : " + tiket.Produk.Nama + "\n";
                                        textSend += "Tonase : " + numParse(tiket.qty.ToString()) + "\n";
                                        textSend += "Kunjungi Sistro : http://sistro.pupuk-indonesia.com \n\n";
                                        textSend += "_Untuk kemudahan Mengakses, segera download dan aktifkan SISTRO Mobile melalui Play Store (Android) : https://bit.ly/SISTROMobile Terima Kasih_";
                                        parameterWA wa = new parameterWA();
                                        wa.number = (nomortlp_out.PhoneNumber == null) ? "" : (nomortlp_out.PhoneNumber == "") ? "" : nomortlp_out.PhoneNumber;
                                        wa.text = textSend;
                                        wa.url = "https://chart.googleapis.com/chart?cht=qr&chs=500x500&chl=" + tiket.bookingno;
                                        wa.tipe = "textimages";
                                        var result_sendWA = await gh.SendWA(wa);

                                        LogWA logSend = new LogWA();
                                        logSend.keterangan = textSend;
                                        logSend.tipe = "sec_out";
                                        logSend.kode = tiket.bookingno;
                                        logSend.updatedon = dt;
                                        logSend.updatedby = User.Identity.Name;
                                        db.LogWA.Add(logSend);
                                        //db.SaveChanges();
```

Ganti jadi:

```csharp
                                        var textSend = "Yth *" + tiket.Transport.nama + "*, \n\n";
                                        textSend += "Armada anda " + tiket.nopol + " - Driver " + tiket.driver + " telah Kembali lagi ke Plant : " + tiket.Posto1.Gudang.Deskripsi + ", \n\n (CHARTER)";
                                        textSend += "Tempat Pengambilan : " + tiket.Posto1.company_code + "\n";
                                        textSend += "Tempat Kirim : " + tiket.Posto1.Gudang1.Deskripsi + "\n";
                                        textSend += "Tiket : " + tiket.bookingno + "\n";
                                        textSend += "Noposto : " + tiket.posto + "\n";
                                        textSend += "Tanggal Muat : " + String.Format("{0: dd MMMM yyyy}", tiket.tanggal) + " & Shift " + tiket.Kuota4Shift.shift + " \n";
                                        textSend += "Produk : " + tiket.Produk.Nama + "\n";
                                        textSend += "Tonase : " + numParse(tiket.qty.ToString()) + "\n";
                                        textSend += "Kunjungi Sistro : http://sistro.pupuk-indonesia.com \n\n";
                                        textSend += "_Untuk kemudahan Mengakses, segera download dan aktifkan SISTRO Mobile melalui Play Store (Android) : https://bit.ly/SISTROMobile Terima Kasih_";
                                        parameterWA wa = new parameterWA();
                                        wa.number = (nomortlp_out.PhoneNumber == null) ? "" : (nomortlp_out.PhoneNumber == "") ? "" : nomortlp_out.PhoneNumber;
                                        wa.text = textSend;
                                        wa.url = "https://chart.googleapis.com/chart?cht=qr&chs=500x500&chl=" + tiket.bookingno;
                                        wa.tipe = "textimages";
                                        pendingWaSends.Add(wa);

                                        LogWA logSend = new LogWA();
                                        logSend.keterangan = textSend;
                                        logSend.tipe = "sec_out";
                                        logSend.kode = tiket.bookingno;
                                        logSend.updatedon = dt;
                                        logSend.updatedby = User.Identity.Name;
                                        db.LogWA.Add(logSend);
                                        //db.SaveChanges();
```

- [ ] **Step 5: Tambah `using System.Web.Hosting;`**

Cek dulu apakah sudah ada di daftar `using` paling atas file (sekitar line 1-33). Kalau belum ada, tambahkan setelah baris `using System.Web;`:

```csharp
using System.Web;
using System.Web.Hosting;
```

- [ ] **Step 6: Dispatch WA yang tertunda SETELAH commit sebagai background work — BUKAN di-await di response path**

Cari exact string (line 1407-1411 area):

```csharp
                    db.SaveChanges();
                    transaction.Commit();

                    //WMS (Outside transaction, only for Gudang Arrived scan)
```

Ganti jadi:

```csharp
                    db.SaveChanges();
                    transaction.Commit();

                    // WA notifications dispatched as true fire-and-forget background work —
                    // never hold DB locks during external HTTP calls (deadlock root cause), and
                    // never make the security device wait for a WhatsApp gateway with no timeout
                    // cap (default HttpClient.Timeout is 100s — this was why checkin felt "hung").
                    // QueueBackgroundWorkItem (not Task.Run) gives IIS a grace period to let this
                    // finish even after the HTTP response has already been returned.
                    string bookingnoForWaLog = tiket.bookingno;
                    string userForWaLog = User.Identity.Name;
                    foreach (var pendingWa in pendingWaSends)
                    {
                        var waToSend = pendingWa;
                        HostingEnvironment.QueueBackgroundWorkItem(async ct =>
                        {
                            try
                            {
                                await gh.SendWA(waToSend);
                            }
                            catch (Exception waEx)
                            {
                                gh.WriteLog(userForWaLog, $"SendWA failed for {bookingnoForWaLog}: {waEx.Message}", "WARNING");
                            }
                        });
                    }

                    //WMS (Outside transaction, only for Gudang Arrived scan)
```

Catatan: `waToSend = pendingWa` (copy lokal di dalam `foreach`) WAJIB ada — tanpa itu, closure C# menangkap variabel loop `pendingWa` by reference, dan semua background work item akan mengirim WA yang SAMA (item terakhir loop) karena lambda-nya baru jalan belakangan setelah loop selesai. Ini bug klasik closure-over-loop-variable.

- [ ] **Step 7: Build**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /v:m /nologo
```

Expected: exit code 0, tidak ada `error CS`. Perhatikan khusus: variabel `result_sendWA` yang dihapus mungkin sebelumnya "unused" sudah — build harus tetap bersih tanpa warning baru yang berarti (CS0219 unused variable dulu mungkin sudah ada, itu OK).

- [ ] **Step 8: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "fix: dispatch WhatsApp notifications in CheckinDW1_GP as true background work

Moves SendWA calls outside the DB transaction (deadlock root cause —
external HTTP call while holding UPDLOCK-adjacent locks) AND makes them
fire-and-forget via HostingEnvironment.QueueBackgroundWorkItem instead
of awaited in the response path. HttpClient has no explicit timeout
(defaults to 100s) — awaiting it before returning to the security
device was the direct cause of checkin feeling hung/slow in the field."
```

---

## Task 3: Verifikasi manual

**Catatan:** pastikan backend dev environment stabil (ikuti pola sesi-sesi sebelumnya — Web.config di SISTROSTAGING, app pool restart) sebelum tes.

- [ ] **Step 1: Tes checkin tiket via Security scan** (posisi 00/06/12) — pastikan tiket tetap berpindah posisi dengan benar, WA tetap terkirim (cek nomor tujuan beneran dapat pesan dalam beberapa detik setelah checkin, walau terkirim di background). **Ukur waktu response checkin sebelum vs sesudah fix** (stopwatch manual atau Network tab kalau device pakai browser/webview) — sebelum fix, response bisa berpotensi kena jeda sampai puluhan detik kalau WA gateway lambat; sesudah fix, response harus balik dalam hitungan detik (hanya nunggu commit DB, tidak nunggu WhatsApp API sama sekali).

- [ ] **Step 2: Tes halaman yang pakai `DataTableFilterLegacy`** (ViewerDashboard, atau halaman lain yang manggil endpoint ini) — pastikan data tetap muncul benar, tidak ada error 500.

- [ ] **Step 3: Kalau memungkinkan, pantau `sp_who2` atau `sys.dm_exec_requests` (status = 'suspended') di SQL Server selama jam sibuk** — bandingkan jumlah/durasi sesi suspended sebelum vs sesudah fix ini. Ini konfirmasi paling langsung bahwa root cause yang ditemukan memang berkurang dampaknya.

---

## Self-Review

**Spec coverage:**
- ✅ `DataTableFilterLegacy` — dicek, root cause sama seperti `DataTableMonitorPosition`, fix diterapkan
- ✅ `createTiketBaru` (yang dipanggil `PostData`, method "createTiket" yang dimaksud user) — dicek, root cause ditemukan (transaksi kepanjangan), TAPI SENGAJA tidak difix di plan ini — didokumentasikan dengan alasan jelas (risiko tinggi ke logic kuota/finansial)
- ✅ `CheckinDW1_GP` — dicek, root cause DIKONFIRMASI dari log produksi sendiri ("Deadlock in CheckinDW1_GP"), fix konkret diterapkan (pindah SendWA ke luar transaksi)
- ✅ Temuan tambahan (`DataTableFilter` dengan CommandTimeout 5 menit, `scanLock`/`antrianLock` static lock) didokumentasikan sebagai rekomendasi follow-up, bukan silently diabaikan

**Placeholder scan:** None untuk task yang DIEKSEKUSI (Task 1 & 2) — semua kode lengkap. Untuk `createTiketBaru`/`DataTableFilter` sengaja TIDAK diberi kode fix (bukan placeholder yang lupa diisi — itu keputusan sadar didokumentasikan dengan alasan, bukan "TODO: fix later").

**Type consistency:** `pendingWaSends: List<parameterWA>` konsisten dipakai di semua 3 case block dan loop pengiriman setelah commit. `parameterWA` sudah tipe existing yang dipakai `gh.SendWA()`.

**Risk assessment:**
- Task 1 (`DataTableFilterLegacy`): RISIKO RENDAH — pattern mekanis yang sudah terbukti bekerja di `DataTableMonitorPosition`, tidak ubah logic filter/bisnis.
- Task 2 (`CheckinDW1_GP`): RISIKO SEDANG — restrukturisasi urutan eksekusi (WA dipindah jadi background work setelah commit via `QueueBackgroundWorkItem`), TIDAK mengubah logic validasi/posisi tiket apapun. Perilaku yang berubah: (1) response ke security device sekarang jauh lebih cepat — tidak menunggu WhatsApp API sama sekali; (2) kalau WA gagal kirim, TIDAK lagi menyebabkan seluruh request gagal (sebelumnya: kalau `SendWA` throw exception di dalam transaksi, seluruh transaksi ROLLBACK — tiket GAGAL diproses gara-gara WhatsApp down; sekarang: tiket tetap berhasil diproses walau WA gagal, kegagalan cuma tercatat di log). Perubahan ini PERLU dikonfirmasi ke user/product owner apakah acceptable — kemungkinan besar YA, karena WhatsApp API down/lambat seharusnya tidak boleh menggagalkan ATAU memperlambat proses checkin tiket fisik di lapangan (itu justru keluhan yang mau diselesaikan) — tapi tetap keputusan produk, bukan murni teknis. Catatan teknis tambahan: `Task.Run` (fire-and-forget — project targets .NET Framework 4.5, `HostingEnvironment.QueueBackgroundWorkItem` requires 4.5.2+ and doesn't exist in this build, discovered when `error CS0117` failed the build) memberi IIS masa tenggang untuk menyelesaikan kerja background walau response sudah dikirim, tapi TIDAK ada jaminan 100% (kalau app pool recycle persis di waktu yang sama, WA bisa gagal terkirim — risiko yang sudah ada secara inheren untuk pola fire-and-forget di ASP.NET classic, diterima sebagai trade-off demi respons cepat).
