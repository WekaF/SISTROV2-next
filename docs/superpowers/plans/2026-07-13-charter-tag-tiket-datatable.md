# Charter Tag di Datatable Tiket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tampilkan tag "Charter" di kolom status pada 3 datatable tiket (Admin Tickets, Daftar Tiket rekanan, Manager Tiket) untuk tiket yang berasal dari POSTO charter.

**Investigasi (sudah dikonfirmasi baca kode langsung):** Tag Charter **BELUM ADA** di ketiga halaman ini. Root cause: "charter" bukan salah satu nilai `status`/`position` tiket seperti dugaan awal — itu flag terpisah `Posto.charter` ("1"/"0") di tabel POSTO, sudah ada sebagai property `charter` di `TiketView` (backend C# model, `TiketView.cs:94`), tapi **tidak pernah diisi** di dua endpoint yang benar-benar dipakai frontend untuk populate datatable ini: `DataTableFilterLegacy` (`TiketController.cs:3576`) dan `DataTablePeriodeTiket` (`TiketController.cs:4180`). Konsekuensinya: response API tidak pernah mengirim field `charter` ke frontend sama sekali, jadi tidak ada cara UI menampilkan tag ini hari ini walau `Badge`/`positionString` sudah dipakai untuk status lain.

Bukti pattern charter sudah pernah dipakai di kode lama: method `DataTableFilter` (tidak dipakai frontend Next.js ini, legacy jQuery UI) sudah memberi tag HTML `<div class='txt_charter'>charter</div>` saat `Posto1.charter == "1"` (`TiketController.cs:6299`) — jadi field dan logikanya sudah pernah dipikirkan tim sebelumnya, tinggal disambungkan ke endpoint yang aktif dan dirender di React.

**Architecture:** Backend menambah satu baris projection (`charter = x.Posto1.charter`) di 2 method controller. Frontend menambah satu badge kondisional (`charter === "1"`) di kolom status yang sudah ada di 3 halaman — tidak menambah kolom baru, tidak mengubah request payload (backend selalu mengembalikan seluruh objek `TiketView`, field tambahan otomatis ikut terkirim tanpa perlu mengubah daftar `columns` di request DataTable).

**Tech Stack:** ASP.NET Framework 4.5 C# + Entity Framework 6 (backend, repo terpisah `C:\Users\weka\Indigo\sistropigroup`), Next.js 16 + React + TanStack Query DataTable (frontend, repo ini).

---

## File Map

| File | Change |
|---|---|
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` | Task 1: isi `charter` di projection `DataTableFilterLegacy` |
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` | Task 2: isi `charter` di projection `DataTablePeriodeTiket` |
| `src/app/admin/tickets/page.tsx` | Task 4: render tag Charter di kolom Status |
| `src/app/tiket/page.tsx` | Task 5: render tag Charter di kolom Posisi/Status + interface `TicketData` |
| `src/app/manager/tiket/page.tsx` | Task 6: render tag Charter di kolom Status + interface `TiketRow` |

---

## Task 1: Backend — isi field `charter` di `DataTableFilterLegacy`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` (method `DataTableFilterLegacy`, sekitar line 3576-3757)

### Context

Endpoint ini dipakai oleh `src/app/admin/tickets/page.tsx` dan (saat tanpa filter POSTO) oleh `src/app/tiket/page.tsx`. Projection `TiketView` di method ini sudah include navigasi `x.Posto1` (lihat `.Include(x => x.Posto1.Gudang)` dan `.Include(x => x.Posto1.Gudang1)` di query), jadi akses `x.Posto1.charter` tidak menambah query baru (no N+1 baru).

- [ ] **Step 1: Baca ulang method untuk konfirmasi baris persis saat ini**

Nomor baris di plan ini adalah referensi — file bisa sudah bergeser sejak terakhir dibaca. Cari string berikut sebagai jangkar (unik di file ini, muncul persis sekali di method `DataTableFilterLegacy`):

```csharp
                        percepatan = x.Posto1 != null ? x.Posto1.Percepatan : "",
                        Action = ""
                    }).ToList();

                    count = datasearch.Count();
                }
                finally
                {
                    db.Database.ExecuteSqlCommand("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
                    if (openedHere) db.Database.Connection.Close();
                }

                return Json((object)new
                {
                    data = dt,
                    draw = drawStr,
```

- [ ] **Step 2: Tambahkan field `charter` sebelum `Action = ""`**

Ganti:

```csharp
                        percepatan = x.Posto1 != null ? x.Posto1.Percepatan : "",
                        Action = ""
                    }).ToList();
```

Jadi:

```csharp
                        percepatan = x.Posto1 != null ? x.Posto1.Percepatan : "",
                        charter = x.Posto1 != null ? x.Posto1.charter : null,
                        Action = ""
                    }).ToList();
```

- [ ] **Step 3: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "feat: expose charter flag in DataTableFilterLegacy for ticket datatable tag"
```

---

## Task 2: Backend — isi field `charter` di `DataTablePeriodeTiket`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` (method `DataTablePeriodeTiket`, sekitar line 4180-4330)

### Context

Endpoint ini dipakai `src/app/tiket/page.tsx` saat halaman difilter per-POSTO (query param `?posto=...`, dipakai dari link "Riwayat Lengkap POSTO"). Query di method ini TIDAK pakai `.Include()` — akses `x.Posto1.charter` akan lazy-load, sama seperti akses `x.Posto1.company_code` dan `x.Posto1.updatedby` yang sudah dipakai method ini di baris lain (line 4245, 4298, 4300) — tidak menambah pola N+1 baru, konsisten dengan kode existing di method ini.

- [ ] **Step 1: Baca ulang method untuk konfirmasi baris persis saat ini**

Cari jangkar berikut (unik di file ini, ada di dalam method `DataTablePeriodeTiket`):

```csharp
                    positionString = th.statusTiket(x.bookingno, x.position, x.Posto1.company_code),
                    posto = x.posto,
                    Action = track1 + this.Url.Link("Default", new { Controller = "Tiket", Action = "Track", id = x.bookingno }) + track2 + "" +
```

- [ ] **Step 2: Tambahkan field `charter` setelah `posto = x.posto,`**

Ganti:

```csharp
                    positionString = th.statusTiket(x.bookingno, x.position, x.Posto1.company_code),
                    posto = x.posto,
                    Action = track1 + this.Url.Link("Default", new { Controller = "Tiket", Action = "Track", id = x.bookingno }) + track2 + "" +
```

Jadi:

```csharp
                    positionString = th.statusTiket(x.bookingno, x.position, x.Posto1.company_code),
                    posto = x.posto,
                    charter = x.Posto1 != null ? x.Posto1.charter : null,
                    Action = track1 + this.Url.Link("Default", new { Controller = "Tiket", Action = "Track", id = x.bookingno }) + track2 + "" +
```

- [ ] **Step 3: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "feat: expose charter flag in DataTablePeriodeTiket for ticket datatable tag"
```

---

## Task 3: Backend — build

**Files:** none (verifikasi saja)

- [ ] **Step 1: Build project backend**

```powershell
& "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\SISTROAWESOME.csproj" /t:Build /p:Configuration=Debug /v:m /nologo
```

Expected: exit code 0, `SISTROAWESOME -> ...\bin\SISTROAWESOME.dll`, tidak ada `error CS`.

---

## Task 4: Frontend — tag Charter di Admin Tickets

**Files:**
- Modify: `src/app/admin/tickets/page.tsx:111-128`

### Context

Kolom `positionString` ("Status") saat ini cuma render satu `Badge` untuk posisi tiket. Tambahkan `Badge` kedua kondisional untuk charter, tersusun vertikal di cell yang sama (tidak menambah kolom).

- [ ] **Step 1: Ganti render function kolom `positionString`**

Cari exact string:

```tsx
    {
      key: "positionString",
      header: "Status",
      sortColumn: 9,
      render: (row: any) => {
        const pos = row.position || "00";
        let variant: any = "default";
        if (pos === "00") variant = "info";
        if (pos === "10" || pos === "20") variant = "warning";
        if (pos === "30" || pos === "40") variant = "success";
        
        return (
          <Badge color={variant} size="sm" className="rounded-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
            {row.positionString || "PENDING"}
          </Badge>
        );
      },
    },
```

Ganti jadi:

```tsx
    {
      key: "positionString",
      header: "Status",
      sortColumn: 9,
      render: (row: any) => {
        const pos = row.position || "00";
        let variant: any = "default";
        if (pos === "00") variant = "info";
        if (pos === "10" || pos === "20") variant = "warning";
        if (pos === "30" || pos === "40") variant = "success";

        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge color={variant} size="sm" className="rounded-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
              {row.positionString || "PENDING"}
            </Badge>
            {row.charter === "1" && (
              <Badge color="indigo" size="sm" className="rounded-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                Charter
              </Badge>
            )}
          </div>
        );
      },
    },
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/tickets/page.tsx
git commit -m "feat: show Charter tag in admin tickets status column"
```

---

## Task 5: Frontend — tag Charter di Daftar Tiket (rekanan)

**Files:**
- Modify: `src/app/tiket/page.tsx:15-38` (interface `TicketData`)
- Modify: `src/app/tiket/page.tsx:182-198` (kolom `positionString`)

### Context

Halaman ini dipakai transportir lihat tiket sendiri. Kolom "Posisi / Status" saat ini render `positionString` + `Badge` untuk `statuspemuatan`. Tambahkan `Badge` charter di bawahnya.

- [ ] **Step 1: Tambah field `charter` ke interface `TicketData`**

Cari exact string:

```tsx
  statuspemuatan?: string;
  position: string;
  status: string;
```

Ganti jadi:

```tsx
  statuspemuatan?: string;
  position: string;
  status: string;
  charter?: string;
```

- [ ] **Step 2: Render badge Charter di kolom `positionString`**

Cari exact string:

```tsx
    {
      key: "positionString",
      header: "Posisi / Status",
      sortColumn: 9,
      render: (t) => (
        <div className="flex flex-col gap-1">
          <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight uppercase">
            {t.positionString ?? "-"}
          </div>
          {t.statuspemuatan && (
            <Badge color="info" size="sm" variant="light" className="w-fit font-bold italic">
              {t.statuspemuatan}
            </Badge>
          )}
        </div>
      ),
    },
```

Ganti jadi:

```tsx
    {
      key: "positionString",
      header: "Posisi / Status",
      sortColumn: 9,
      render: (t) => (
        <div className="flex flex-col gap-1">
          <div className="font-bold text-gray-900 dark:text-white font-mono text-sm tracking-tight uppercase">
            {t.positionString ?? "-"}
          </div>
          {t.statuspemuatan && (
            <Badge color="info" size="sm" variant="light" className="w-fit font-bold italic">
              {t.statuspemuatan}
            </Badge>
          )}
          {t.charter === "1" && (
            <Badge color="indigo" size="sm" variant="light" className="w-fit font-bold italic">
              Charter
            </Badge>
          )}
        </div>
      ),
    },
```

- [ ] **Step 3: Commit**

```bash
git add src/app/tiket/page.tsx
git commit -m "feat: show Charter tag in Daftar Tiket status column"
```

---

## Task 6: Frontend — tag Charter di Manager Tiket

**Files:**
- Modify: `src/app/manager/tiket/page.tsx:11-24` (interface `TiketRow`)
- Modify: `src/app/manager/tiket/page.tsx:193-197` (cell Status di tabel)

### Context

Halaman ini pakai tabel HTML native (bukan komponen `DataTable`), fetch langsung ke `DataTableFilterLegacy` lewat `fetch()`. Sama seperti Task 4/5, cukup tambah span kondisional di cell Status yang sudah ada.

- [ ] **Step 1: Tambah field `charter` ke interface `TiketRow`**

Cari exact string:

```tsx
interface TiketRow {
  number: number;
  bookingno: string;
  tiketno: string;
  tanggalString: string;
  nopol: string;
  driver: string;
  produkString: string;
  tujuan: string;
  qty: number | null;
  positionString: string;
  position: string;
  transportString: string;
}
```

Ganti jadi:

```tsx
interface TiketRow {
  number: number;
  bookingno: string;
  tiketno: string;
  tanggalString: string;
  nopol: string;
  driver: string;
  produkString: string;
  tujuan: string;
  qty: number | null;
  positionString: string;
  position: string;
  transportString: string;
  charter?: string;
}
```

- [ ] **Step 2: Render span Charter di cell Status**

Cari exact string:

```tsx
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${positionColor(r.position)}`}>
                    {r.positionString}
                  </span>
                </td>
```

Ganti jadi:

```tsx
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1 items-start">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${positionColor(r.position)}`}>
                      {r.positionString}
                    </span>
                    {r.charter === "1" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        Charter
                      </span>
                    )}
                  </div>
                </td>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/manager/tiket/page.tsx
git commit -m "feat: show Charter tag in Manager Tiket status column"
```

---

## Task 7: Frontend — typecheck

**Files:** none (verifikasi saja)

- [ ] **Step 1: Jalankan typecheck**

```bash
npx tsc --noEmit
```

Expected: tidak ada error baru terkait `src/app/admin/tickets/page.tsx`, `src/app/tiket/page.tsx`, atau `src/app/manager/tiket/page.tsx`.

---

## Task 8: Verifikasi manual end-to-end

**Files:** none

**Catatan:** butuh backend jalan (`start-dev.ps1` dari `sistropigroup`, atau `npm run dev` network backend) dan minimal 1 tiket dengan POSTO `charter = "1"` di database untuk verifikasi positif, plus 1 tiket non-charter untuk verifikasi negatif (tag TIDAK muncul untuk tiket biasa).

- [ ] **Step 1: Cari/pastikan ada tiket charter untuk tes** — query manual ke DB (`SELECT TOP 5 noposto, charter FROM Posto WHERE charter = '1'`) atau minta contoh bookingno dari user kalau tidak bisa akses DB langsung.

- [ ] **Step 2: Buka `/admin/tickets`** — cari baris dengan bookingno dari POSTO charter tsb, konfirmasi badge "Charter" (indigo) muncul di bawah badge Status. Cari baris tiket biasa, konfirmasi tag Charter TIDAK muncul.

- [ ] **Step 3: Buka `/tiket`** (login sebagai role transport/rekanan yang punya tiket charter, atau `/tiket?posto=<noposto_charter>`) — konfirmasi badge Charter muncul di kolom "Posisi / Status" untuk tiket charter, tidak muncul untuk tiket biasa.

- [ ] **Step 4: Buka `/manager/tiket`** — cari baris tiket charter di tabel "Data Tiket", konfirmasi tag Charter muncul di kolom Status.

- [ ] **Step 5: Screenshot ketiga halaman** (opsional tapi disarankan) untuk didokumentasikan ke user sebagai bukti selesai.

---

## Self-Review

**Spec coverage:**
- ✅ Pertanyaan "apakah sudah?" dijawab dengan investigasi root cause (field `charter` ada di model tapi tidak pernah di-populate ke 2 endpoint aktif)
- ✅ Tag Charter ditambahkan ke 3 halaman yang dikonfirmasi user: Admin Tickets, Daftar Tiket, Manager Tiket
- ✅ Backend diperbaiki di 2 endpoint (`DataTableFilterLegacy`, `DataTablePeriodeTiket`) — keduanya dipakai gabungan oleh 3 halaman frontend, tidak ada endpoint aktif yang terlewat untuk 3 halaman ini

**Placeholder scan:** Tidak ada — semua step berisi kode lengkap siap tempel, bukan deskripsi.

**Type consistency:** Nama field `charter` konsisten dipakai persis sama di semua layer: `Posto1.charter` (C#, sudah ada) → `TiketView.charter` (C#, sudah ada, tinggal diisi) → JSON response → `row.charter` / `t.charter` / `r.charter` (TypeScript, ditambahkan di 2 interface + 1 `any`-typed render). Kondisi truthy konsisten `=== "1"` di ketiga halaman, meniru pola legacy `charter == "1"` yang sudah dipakai di `TiketController.cs:6299` dan `:1498`.

**Risk assessment:**
- Backend (Task 1-2): RISIKO RENDAH — hanya menambah satu field read-only ke projection yang sudah ada, tidak mengubah filter/query/business logic apapun. `DataTableFilterLegacy` sudah `.Include(x => x.Posto1...)` jadi tidak nambah query; `DataTablePeriodeTiket` akan lazy-load `Posto1.charter` tapi method ini sudah lazy-load `Posto1` untuk field lain (`company_code`, `updatedby`) jadi tidak menambah pola N+1 baru yang belum ada.
- Frontend (Task 4-6): RISIKO RENDAH — badge kondisional murni presentasional, tidak mengubah data fetching/filtering/sorting.
- **Yang PERLU dikonfirmasi ke user sebelum eksekusi:** apakah field `Posto.charter` ("1"/"0") memang satu-satunya sumber kebenaran untuk "tiket charter" — ada indikasi lain di kode (`Kuota3Bagian.bagian == "CHARTER"`) bahwa charter juga terkait ke kuota/bagian bernama "CHARTER", bukan cuma flag Posto. Kalau ternyata ada tiket charter yang `Posto.charter` bukan "1" tapi `bagian == "CHARTER"`, tag ini tidak akan muncul untuk kasus itu — perlu dicek saat Task 8 (verifikasi manual) apakah kedua sumber ini selalu konsisten di data produksi.
