# Tampilkan Pesan Gagal Asli Saat Scan Tiket Gagal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saat aksi VERIFIKASI di `/scan/tiket` gagal karena backend menolak dengan `HttpStatusCode.BadRequest`, toast harus menampilkan pesan gagal ASLI dari backend (mis. "Maaf Tiket belum diperkenankan masuk. Periode tidak cocok...."), bukan pesan generik kosong/"Gagal memproses aksi scan."

**Root cause:** `handleAction` di `src/app/scan/tiket/page.tsx:220-225` langsung memanggil `res.json()` tanpa cek `res.ok`. Backend endpoint `CheckinDW1_GP` (`sistropigroup/SISTROAWESOME/api/TiketController.cs:920`) punya DUA gaya response berbeda:
1. Sukses/warning/error-terkendali → `return Content(HttpStatusCode.OK, json)` dengan bentuk `{ role, text, gudangtujuan, validasi, position, log }` (lihat `TiketController.cs:1502-1511`).
2. Ditolak validasi keras (period mismatch, company tidak terdaftar, dll) → `return Content(HttpStatusCode.BadRequest, "pesan string mentah")` — LANGSUNG string, bukan object `{validasi, text}` (lihat `TiketController.cs:970`, `:1027`, `:1238`, `:1516`).

Contoh nyata kasus #2, `TiketController.cs:969-970`:
```csharp
string errormsg = "Maaf Tiket belum diperkenankan masuk. Periode tidak cocok . Jadwal muat anda : " + String.Format("{0:dd MMMM yyyy}", tiket.tanggal.Value.Date) + " shift " + tiket.Kuota4Shift.shift + ", waktu menunjukkan : " + String.Format("{0:dd MMMM yyyy HH:mm:ss}", dt);
return Content(HttpStatusCode.BadRequest, errormsg);
```

Karena frontend memanggil `await res.json()` tanpa cek `res.ok`, saat backend balas kasus #2: `result` jadi STRING JS biasa (bukan object), `result.validasi` dan `result.text` jadi `undefined`, kode jatuh ke branch `else` yang menampilkan toast `title: "Gagal", description: undefined` — pesan asli hilang. Ini yang bikin user cuma lihat error kosong/generik dan bingung kenapa gagal.

**Architecture:** Tambah pengecekan `res.ok` di awal `handleAction` SEBELUM parsing sebagai `ActionResponse`. Kalau tidak ok, baca body sebagai text, coba `JSON.parse` (backend Web API kadang membungkus string jadi JSON-quoted lewat content negotiation, kadang tidak) — pakai hasil parse kalau berupa string, fallback ke raw text kalau parse gagal. Tampilkan itu apa adanya di toast. Behavior untuk response OK (`validasi: success/warning/error`) tidak berubah.

**Tech Stack:** Next.js 16, React, TypeScript. Backend: ASP.NET `TiketController.CheckinDW1_GP` — tidak diubah (frontend harus tahan terhadap kedua bentuk response yang backend sudah kirim).

---

## File Map

| File | Change |
|---|---|
| `src/app/scan/tiket/page.tsx` | `handleAction`: cek `res.ok` sebelum parse, tampilkan pesan gagal asli kalau tidak ok |

---

## Task 1: Cek `res.ok` di `handleAction`, tampilkan pesan gagal backend apa adanya

**Files:**
- Modify: `src/app/scan/tiket/page.tsx:215-260`

### Perubahan yang diperlukan

Sebelum (state saat ini, sudah dikonfirmasi baca file):
```typescript
  const handleAction = async () => {
    if (!ticket) return;

    setIsActionLoading(true);
    try {
      const res = await apiFetch("/api/Tiket/CheckinDW1_GP", {
        method: "POST",
        body: JSON.stringify({ bookingno: ticket.bookingno })
      });

      const result: ActionResponse = await res.json();

      if (result.validasi === "success") {
        addToast({
          title: "Berhasil",
          description: result.text,
          variant: "success",
        });

        // Refetch full detail from server — response dari CheckinDW1_GP cuma bawa
        // kode posisi, bukan label/status lengkap. Jangan tebak di frontend.
        await fetchTicketDetail(ticket.bookingno);
        setBookingNo("");
      } else if (result.validasi === "warning") {
        addToast({
          title: "Peringatan",
          description: result.text,
          variant: "warning",
        });
      } else {
        addToast({
          title: "Gagal",
          description: result.text,
          variant: "destructive",
        });
      }
    } catch (err) {
      addToast({
        title: "Kesalahan",
        description: "Gagal memproses aksi scan.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };
```

Sesudah:
```typescript
  const handleAction = async () => {
    if (!ticket) return;

    setIsActionLoading(true);
    try {
      const res = await apiFetch("/api/Tiket/CheckinDW1_GP", {
        method: "POST",
        body: JSON.stringify({ bookingno: ticket.bookingno })
      });

      if (!res.ok) {
        // Backend bisa menolak dengan Content(BadRequest, "pesan string mentah")
        // yang TIDAK berbentuk {validasi, text}. Baca sebagai text dulu, coba
        // unwrap kalau ternyata JSON-quoted string, lalu tampilkan apa adanya.
        const rawBody = await res.text();
        let message = rawBody;
        try {
          const parsed = JSON.parse(rawBody);
          if (typeof parsed === "string") {
            message = parsed;
          } else if (parsed && typeof parsed.text === "string") {
            message = parsed.text;
          }
        } catch {
          // rawBody bukan JSON valid, pakai apa adanya
        }
        addToast({
          title: "Gagal",
          description: message || "Gagal memproses aksi scan.",
          variant: "destructive",
        });
        return;
      }

      const result: ActionResponse = await res.json();

      if (result.validasi === "success") {
        addToast({
          title: "Berhasil",
          description: result.text,
          variant: "success",
        });

        // Refetch full detail from server — response dari CheckinDW1_GP cuma bawa
        // kode posisi, bukan label/status lengkap. Jangan tebak di frontend.
        await fetchTicketDetail(ticket.bookingno);
        setBookingNo("");
      } else if (result.validasi === "warning") {
        addToast({
          title: "Peringatan",
          description: result.text,
          variant: "warning",
        });
      } else {
        addToast({
          title: "Gagal",
          description: result.text,
          variant: "destructive",
        });
      }
    } catch (err) {
      addToast({
        title: "Kesalahan",
        description: "Gagal memproses aksi scan.",
        variant: "destructive",
      });
    } finally {
      setIsActionLoading(false);
    }
  };
```

Catatan: `return` di dalam `try` tetap menjalankan blok `finally` (JS guarantee) — jadi `setIsActionLoading(false)` tetap jalan.

---

- [ ] **Step 1: Read `src/app/scan/tiket/page.tsx` lines 215–260** — konfirmasi exact text `handleAction` sebelum edit (isi sudah dikonfirmasi di plan ini, tapi cek ulang kalau ada perubahan lain sejak plan ditulis).

- [ ] **Step 2: Edit — tambah blok `if (!res.ok) { ... return; }` sebelum `const result: ActionResponse = await res.json();`, seperti kode "Sesudah" di atas.**

- [ ] **Step 3: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: 0 errors.

- [ ] **Step 4: Manual verify di browser** (tidak ada test runner terpasang di project ini — `package.json` tidak punya `vitest`/`jest`).

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npm run dev
```

Buka `http://localhost:3000/scan/tiket`, scan/cari tiket yang jadwalnya di luar periode shift saat ini (posisi masih "00", role Security, `myConfigCheckShift = "true"` di backend config). Klik VERIFIKASI. Konfirmasi:
- Toast muncul dengan title "Gagal" dan description berisi pesan lengkap dari backend, contoh: "Maaf Tiket belum diperkenankan masuk. Periode tidak cocok . Jadwal muat anda : 03 Juli 2026 shift 2, waktu menunjukkan : 03 Juli 2026 13.44.10" — bukan kosong/undefined.
- Untuk kasus sukses (tiket valid, posisi/shift cocok), behavior tidak berubah: toast "Berhasil" + status/log ter-refresh (dari fix sebelumnya).
- Untuk kasus warning (mis. duplikat sudah discan), toast "Peringatan" tetap tampil seperti sebelumnya.

Kalau tidak ada tiket yang gampang dipakai untuk reproduce kasus period-mismatch secara manual, cukup verifikasi lewat DevTools Network tab: simulasikan/lihat request yang dapat response 400 dari `CheckinDW1_GP`, pastikan toast menampilkan body response tersebut, bukan generik.

- [ ] **Step 5: Commit**

```bash
git add src/app/scan/tiket/page.tsx
git commit -m "fix: show actual backend error message on failed scan action instead of generic text"
```

---

## Self-Review

**Spec coverage:**
- ✅ Kalau scan gagal (`res.ok === false`), pesan gagal asli dari backend ditampilkan di toast, bukan generik.
- ✅ Contoh pesan spesifik user ("Periode tidak cocok...") tercakup — ini persis kasus `TiketController.cs:969-970` yang return `BadRequest` dengan raw string.
- ✅ Behavior existing (success/warning/error dalam body OK 200) tidak berubah.
- ✅ Dijelaskan root cause "kenapa ini error": frontend parse `res.json()` tanpa cek `res.ok`, jadi `result.text` jadi `undefined` untuk response BadRequest yang bentuknya raw string.

**Placeholder scan:** None — kode before/after lengkap, tidak ada TODO/placeholder.

**Type consistency:** `ActionResponse` interface tidak berubah. Variabel baru (`rawBody`, `message`, `parsed`) lokal di dalam `handleAction`, tidak bocor ke fungsi lain.
