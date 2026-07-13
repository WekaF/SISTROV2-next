# Fix Refresh Status Posisi & Log Setelah Scan Tiket Sukses

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setelah aksi scan (`VERIFIKASI`) di `/scan/tiket` sukses, status posisi (badge + label) dan riwayat log harus ter-refresh dengan data asli dari server, bukan tebakan string di frontend.

**Architecture:** Root cause: `handleAction` di `src/app/scan/tiket/page.tsx` menerima response `CheckinDW1_GP` yang cuma bawa `position` (kode, mis. `"03"`) dan `log`, TIDAK bawa `positionString` (label tampilan). Kode saat ini menebak `positionString` pakai `result.text.includes("Security In")` / `"Security Out"` — cuma benar untuk role Security, salah/stale untuk role Timbangan, Gudang, PelabuhanUPP (posisi 02–06, 08, dst). Field lain (`statuspemuatan`, `nomorantrian`, `labelantrian`, dll) juga tidak ikut ter-refresh sama sekali karena cuma di-patch manual 2 field.

Fix: extract logic fetch detail tiket dari `handleSearch` jadi fungsi `fetchTicketDetail(bookingno)` yang dipakai ulang, lalu panggil fungsi itu di `handleAction` setelah aksi sukses — supaya SEMUA field (posisi, label, log, status pemuatan, dst) ter-refresh dari sumber kebenaran (backend), bukan ditebak di frontend. Log sudah benar dari `result.log`, tapi tetap ikut ter-refresh otomatis lewat refetch supaya konsisten satu jalur data.

**Tech Stack:** Next.js 16, React, TypeScript. Backend: ASP.NET `TiketController.CheckinDW1_GP` (`sistropigroup/SISTROAWESOME/api/TiketController.cs:920`) — tidak perlu diubah, endpoint `DetailData` (dipakai `handleSearch`) sudah return semua field yang dibutuhkan.

---

## File Map

| File | Change |
|---|---|
| `src/app/scan/tiket/page.tsx` | Extract `fetchTicketDetail`, pakai di `handleSearch` dan `handleAction` |

---

## Task 1: Refetch detail tiket lengkap setelah aksi sukses

**Files:**
- Modify: `src/app/scan/tiket/page.tsx`

### Perubahan yang diperlukan

**A. Extract fungsi `fetchTicketDetail` (ganti isi `handleSearch`, sekitar line 173–207):**

Sebelum:
```typescript
  const handleSearch = async (e?: React.FormEvent, overrideNo?: string) => {
    e?.preventDefault();
    const cleanBookingNo = (overrideNo || bookingNo).trim();
    if (!cleanBookingNo) return;

    setIsLoading(true);
    setSearchError(null);
    setTicket(null);
    setLogs([]);

    try {
      const res = await apiFetch("/api/Tiket/DetailData", {
        method: "POST",
        body: JSON.stringify({ bookingno: cleanBookingNo })
      });

      if (res.ok) {
        const result: TicketResponse = await res.json();
        setTicket(result.data);

        // Sort logs: latest first
        const sortedLogs = [...(result.log || [])].sort((a, b) =>
          new Date(b.updatedon).getTime() - new Date(a.updatedon).getTime()
        );
        setLogs(sortedLogs);
      } else {
        const errorText = await res.text();
        setSearchError(errorText || "Tiket tidak ditemukan.");
      }
    } catch (err: any) {
      setSearchError("Terjadi kesalahan saat menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  };
```

Sesudah:
```typescript
  const fetchTicketDetail = async (cleanBookingNo: string): Promise<boolean> => {
    try {
      const res = await apiFetch("/api/Tiket/DetailData", {
        method: "POST",
        body: JSON.stringify({ bookingno: cleanBookingNo })
      });

      if (res.ok) {
        const result: TicketResponse = await res.json();
        setTicket(result.data);

        // Sort logs: latest first
        const sortedLogs = [...(result.log || [])].sort((a, b) =>
          new Date(b.updatedon).getTime() - new Date(a.updatedon).getTime()
        );
        setLogs(sortedLogs);
        return true;
      } else {
        const errorText = await res.text();
        setSearchError(errorText || "Tiket tidak ditemukan.");
        return false;
      }
    } catch (err: any) {
      setSearchError("Terjadi kesalahan saat menghubungi server.");
      return false;
    }
  };

  const handleSearch = async (e?: React.FormEvent, overrideNo?: string) => {
    e?.preventDefault();
    const cleanBookingNo = (overrideNo || bookingNo).trim();
    if (!cleanBookingNo) return;

    setIsLoading(true);
    setSearchError(null);
    setTicket(null);
    setLogs([]);

    await fetchTicketDetail(cleanBookingNo);
    setIsLoading(false);
  };
```

**B. Pakai `fetchTicketDetail` di `handleAction` setelah sukses, ganti manual patch (sekitar line 209–265):**

Sebelum:
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

        // Update local ticket with new position and logs from result
        if (ticket) {
          setTicket({
            ...ticket,
            position: result.position,
            positionString: result.text.includes("Security In") ? "Security In" :
              result.text.includes("Security Out") ? "Security Out / Selesai" :
                ticket.positionString
          });
        }
        const sortedLogs = [...(result.log || [])].sort((a, b) =>
          new Date(b.updatedon).getTime() - new Date(a.updatedon).getTime()
        );
        setLogs(sortedLogs);
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

**C. `ActionResponse` interface tetap dipakai** (untuk baca `validasi`, `text`) — tidak perlu diubah, sekitar line 71–78.

---

- [ ] **Step 1: Read `src/app/scan/tiket/page.tsx` lines 165–270** — konfirmasi exact text `handleSearch` dan `handleAction` sebelum edit (kode bisa saja sedikit berbeda dari draft di atas).

- [ ] **Step 2: Edit A — extract `fetchTicketDetail`, sederhanakan `handleSearch`.**

- [ ] **Step 3: Edit B — `handleAction` panggil `fetchTicketDetail` alih-alih patch manual.**

- [ ] **Step 4: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 20
```

Expected: 0 errors.

- [ ] **Step 5: Manual verify di browser** (tidak ada test runner terpasang di project ini — cek `package.json`, tidak ada `vitest`/`jest`).

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npm run dev
```

Buka `http://localhost:3000/scan/tiket`, scan/isi booking no valid, klik cari, lalu klik VERIFIKASI. Konfirmasi:
- Badge status posisi di header (`getPositionBadge`) berubah sesuai posisi baru, bukan stuck di label lama.
- Panel "Riwayat Status Tiket" nambah entry baru di paling atas dengan timestamp terbaru.
- Field lain (No. Antrian, Status Pemuatan) juga ikut update kalau backend mengubahnya.
- Ulangi untuk tiket dengan role selain Security (mis. posisi Timbangan/Gudang) — sebelum fix, label ini yang paling sering stale.

- [ ] **Step 6: Commit**

```bash
git add src/app/scan/tiket/page.tsx
git commit -m "fix: refetch full ticket detail after scan action instead of guessing position label"
```

---

## Self-Review

**Spec coverage:**
- ✅ Status posisi ter-refresh dari server (bukan tebakan string) setelah scan sukses
- ✅ Log ter-refresh (sudah benar sebelumnya, sekarang konsisten lewat satu jalur refetch)
- ✅ Semua field ticket lain (statuspemuatan, nomorantrian, labelantrian) ikut ter-refresh otomatis, bukan cuma 2 field

**Placeholder scan:** None — semua kode lengkap, before/after ditunjukkan penuh.

**Type consistency:** `fetchTicketDetail(cleanBookingNo: string): Promise<boolean>` dipakai identik di `handleSearch` dan `handleAction`. `TicketResponse`, `TicketDetailData`, `TicketLog` interface tidak berubah.
