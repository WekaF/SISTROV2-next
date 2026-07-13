# Ganti window.confirm/alert Native Browser dengan ConfirmDialog/Toast Sesuai Desain App

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hilangkan semua pemakaian `window.confirm()` / `confirm()` / `alert()` bawaan browser di seluruh app (termasuk di halaman POSTO `/posto` yang ditunjukkan user via screenshot) dan ganti dengan komponen dialog/toast yang sudah ada di desain sistem: `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) untuk konfirmasi ya/tidak, dan `useToast` (`src/components/ui/toast.tsx`) untuk notifikasi info/error/warning.

**Root cause:** Beberapa halaman ditulis lebih awal sebelum `ConfirmDialog` dan `useToast` ada, jadi masih pakai `window.confirm(...)` untuk konfirmasi hapus/toggle status, dan `alert(...)` untuk pesan error/validasi. Dialog native ini tidak bisa di-style, terlihat "bocor" dari desain SISTRO (lihat screenshot: dialog `localhost:3000 says` di halaman POSTO), dan tidak konsisten dengan halaman lain yang sudah pakai `ConfirmDialog`/`toast` (contoh: `src/app/superadmin/settings/fleet/page.tsx`, `src/components/ticket/TicketActions.tsx`).

**Architecture:** Pola yang sudah established di codebase (dipakai di `fleet/page.tsx` dan banyak halaman lain) dipertahankan:
- Untuk `confirm()`: pisahkan handler jadi 2 — satu untuk *trigger* (simpan target ke state, buka dialog), satu untuk *aksi asli* (dipanggil oleh `onConfirm` prop `ConfirmDialog`). Render `<ConfirmDialog open={...} onOpenChange={...} onConfirm={...} variant="danger|warning" .../>` di JSX.
- Untuk `alert()`: panggil `addToast({ title, description, variant })` dari `useToast()` — sudah dipakai luas di app, tinggal ganti pemanggilan di file yang belum ada import-nya.
- Untuk `profile/page.tsx` (kasus khusus: alert dipanggil dari dalam modal konfirmasi password), pesan error ditampilkan inline di dalam modal itu sendiri (bukan toast, karena toast akan tertutup backdrop modal) — pola yang sama seperti `message` state yang sudah dipakai file ini.

**Tech Stack:** Next.js 16, React, TypeScript. Tidak ada test runner terpasang di project ini (`package.json` tidak punya `vitest`/`jest`/`playwright`) — verifikasi tiap task pakai `npx tsc --noEmit` + cek manual di browser (`npm run dev`).

---

## File Map

| File | Perubahan |
|---|---|
| `src/app/posto/page.tsx` | `window.confirm` hapus POSTO → `ConfirmDialog` |
| `src/app/posto/so/page.tsx` | `window.confirm` hapus SO → `ConfirmDialog` |
| `src/app/ticket/page.tsx` | `confirm()` hapus tiket → `ConfirmDialog` |
| `src/app/gudang/page.tsx` | `window.confirm` toggle status gudang → `ConfirmDialog` |
| `src/app/armada/mapping-zero-odol/page.tsx` | 3x `confirm()` (hapus mapping, toggle ZERO ODOL, toggle PERCEPATAN) → `ConfirmDialog` |
| `src/app/kuota/level3/[id]/page.tsx` | 2x `alert()` → `addToast` |
| `src/app/kuota/level2/[id]/page.tsx` | 2x `alert()` → `addToast` |
| `src/app/profile/page.tsx` | 1x `alert()` → error inline di dalam modal konfirmasi password |
| `src/app/posto/upload/page.tsx` | 5x `alert()` → `addToast` |

---

## Task 1: `src/app/posto/page.tsx` — ganti confirm hapus POSTO

**Files:**
- Modify: `src/app/posto/page.tsx:11` (tambah import)
- Modify: `src/app/posto/page.tsx:177-185` (`handleDelete`)
- Modify: `src/app/posto/page.tsx:236` (tombol Hapus)
- Modify: `src/app/posto/page.tsx:636` (tambah `ConfirmDialog` sebelum penutup)

- [ ] **Step 1: Tambah import `ConfirmDialog`**

Sebelum (`src/app/posto/page.tsx:11`):
```tsx
import { useToast } from "@/components/ui/toast";
```

Sesudah:
```tsx
import { useToast } from "@/components/ui/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
```

- [ ] **Step 2: Pecah `handleDelete` jadi trigger + confirm handler, tambah state target**

Sebelum (`src/app/posto/page.tsx:177-185`):
```tsx
  const handleDelete = async (id: string, noposto?: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus POSTO ${noposto || id}?`)) return;
    try {
      const res = await apiFetch("/api/POSTO/DeleteData", { method: "POST", body: JSON.stringify({ guid: id, noposto: noposto }) });
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["posto"] });
    } catch {
      addToast({ title: "Error", description: "Error saat menghapus data", variant: "destructive" });
    }
  };
```

Sesudah:
```tsx
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; noposto?: string } | null>(null);

  const handleDeleteClick = (id: string, noposto?: string) => {
    setDeleteTarget({ id, noposto });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { id, noposto } = deleteTarget;
    try {
      const res = await apiFetch("/api/POSTO/DeleteData", { method: "POST", body: JSON.stringify({ guid: id, noposto: noposto }) });
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["posto"] });
    } catch {
      addToast({ title: "Error", description: "Error saat menghapus data", variant: "destructive" });
    }
  };
```

- [ ] **Step 3: Update tombol Hapus supaya memanggil trigger, bukan handler lama**

Sebelum (`src/app/posto/page.tsx:236`):
```tsx
              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 rounded-none h-7" onClick={() => handleDelete(id, noposto)}>
```

Sesudah:
```tsx
              <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 rounded-none h-7" onClick={() => handleDeleteClick(id, noposto)}>
```

- [ ] **Step 4: Render `ConfirmDialog` di akhir JSX, sebelum penutup komponen**

Sebelum (`src/app/posto/page.tsx:634-639`):
```tsx
          </Card>
        </div>
      )}
    </div>
  );
}
```

Sesudah:
```tsx
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus POSTO"
        description={`Apakah Anda yakin ingin menghapus POSTO ${deleteTarget?.noposto || deleteTarget?.id}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
```

- [ ] **Step 5: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: 0 error terkait `src/app/posto/page.tsx`.

- [ ] **Step 6: Manual verify di browser**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npm run dev
```
Buka `http://localhost:3000/posto`, klik tombol **Hapus** di salah satu baris POSTO. Konfirmasi:
- Dialog yang muncul adalah `ConfirmDialog` bergaya SISTRO (rounded card, ikon merah, tombol "Batal"/"Hapus"), **bukan** popup `localhost:3000 says` bawaan browser.
- Klik "Batal" → dialog tertutup, tidak ada request dikirim.
- Klik "Hapus" → data terhapus, tabel refresh.

- [ ] **Step 7: Commit**

```bash
git add src/app/posto/page.tsx
git commit -m "fix: replace native confirm dialog with ConfirmDialog on POSTO delete"
```

---

## Task 2: `src/app/posto/so/page.tsx` — ganti confirm hapus SO

**Files:**
- Modify: `src/app/posto/so/page.tsx:14` (tambah import)
- Modify: `src/app/posto/so/page.tsx:111-122` (`handleDelete`)
- Modify: `src/app/posto/so/page.tsx:307` (tombol Hapus)
- Modify: `src/app/posto/so/page.tsx:506` (tambah `ConfirmDialog`)

- [ ] **Step 1: Tambah import `ConfirmDialog`**

Sebelum (`src/app/posto/so/page.tsx:14`):
```tsx
import { useToast } from "@/components/ui/toast";
```

Sesudah:
```tsx
import { useToast } from "@/components/ui/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
```

- [ ] **Step 2: Pecah `handleDelete` jadi trigger + confirm handler**

Sebelum (`src/app/posto/so/page.tsx:111-122`):
```tsx
  const handleDelete = async (noposto: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus SO ${noposto}?`)) return;
    try {
      const res = await apiFetch("/api/POSTO/DeleteData", {
        method: "POST",
        body: JSON.stringify({ noposto }),
      });
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["so"] });
    } catch {
      addToast({ title: "Error", description: "Error saat menghapus data SO", variant: "destructive" });
    }
  };
```

Sesudah:
```tsx
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDeleteClick = (noposto: string) => {
    setDeleteTarget(noposto);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch("/api/POSTO/DeleteData", {
        method: "POST",
        body: JSON.stringify({ noposto: deleteTarget }),
      });
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["so"] });
    } catch {
      addToast({ title: "Error", description: "Error saat menghapus data SO", variant: "destructive" });
    }
  };
```

- [ ] **Step 3: Update tombol Hapus**

Sebelum (`src/app/posto/so/page.tsx:307`):
```tsx
                onClick={() => handleDelete(noposto)}
```

Sesudah:
```tsx
                onClick={() => handleDeleteClick(noposto)}
```

- [ ] **Step 4: Render `ConfirmDialog` sebelum penutup komponen**

Sebelum (`src/app/posto/so/page.tsx:504-510`):
```tsx
            </CardHeader>
          </Card>
        </div>
      )}
    </div>
  );
}
```

Sesudah:
```tsx
            </CardHeader>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus SO"
        description={`Apakah Anda yakin ingin menghapus SO ${deleteTarget}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
```

- [ ] **Step 5: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: 0 error terkait `src/app/posto/so/page.tsx`.

- [ ] **Step 6: Manual verify di browser**

Buka `http://localhost:3000/posto/so` (role yang punya `canDeletePosto`, mis. superadmin/staffarea), klik **Hapus** di salah satu baris. Konfirmasi dialog SISTRO muncul (bukan native), Batal/Hapus berfungsi.

- [ ] **Step 7: Commit**

```bash
git add src/app/posto/so/page.tsx
git commit -m "fix: replace native confirm dialog with ConfirmDialog on SO delete"
```

---

## Task 3: `src/app/ticket/page.tsx` — ganti confirm hapus tiket

**Files:**
- Modify: `src/app/ticket/page.tsx:24` (tambah import)
- Modify: `src/app/ticket/page.tsx:138-141` (`handleDelete`)
- Modify: `src/app/ticket/page.tsx:289` (tombol Hapus Tiket)
- Modify: `src/app/ticket/page.tsx:373` (tambah `ConfirmDialog`)

- [ ] **Step 1: Tambah import `ConfirmDialog`**

Sebelum (`src/app/ticket/page.tsx:24`):
```tsx
import { useToast } from "@/components/ui/toast";
```

Sesudah:
```tsx
import { useToast } from "@/components/ui/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
```

- [ ] **Step 2: Ganti `handleDelete` jadi trigger + confirm handler**

Sebelum (`src/app/ticket/page.tsx:138-141`):
```tsx
  const handleDelete = (bookingno: string) => {
    if (!confirm(`Hapus tiket ${bookingno}?`)) return;
    deleteMutation.mutate(bookingno);
  };
```

Sesudah:
```tsx
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDeleteClick = (bookingno: string) => {
    setDeleteTarget(bookingno);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget);
    setDeleteTarget(null);
  };
```

- [ ] **Step 3: Update tombol Hapus Tiket**

Sebelum (`src/app/ticket/page.tsx:289`):
```tsx
                              onClick={() => handleDelete(bn)}
```

Sesudah:
```tsx
                              onClick={() => handleDeleteClick(bn)}
```

- [ ] **Step 4: Render `ConfirmDialog` sebelum penutup komponen**

Sebelum (`src/app/ticket/page.tsx:371-376`):
```tsx
          </Card>
        </div>
      )}
    </div>
  );
}
```

Sesudah:
```tsx
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus Tiket"
        description={`Apakah Anda yakin ingin menghapus tiket ${deleteTarget}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
```

- [ ] **Step 5: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: 0 error terkait `src/app/ticket/page.tsx`.

- [ ] **Step 6: Manual verify di browser**

Buka `http://localhost:3000/ticket` sebagai role admin/superadmin, klik ikon **Hapus Tiket** (ikon tempat sampah merah) di salah satu baris. Konfirmasi dialog SISTRO muncul, Batal/Hapus berfungsi, toast "Berhasil"/"Error" tetap muncul seperti sebelumnya (dari `deleteMutation`).

- [ ] **Step 7: Commit**

```bash
git add src/app/ticket/page.tsx
git commit -m "fix: replace native confirm dialog with ConfirmDialog on ticket delete"
```

---

## Task 4: `src/app/gudang/page.tsx` — ganti confirm toggle status gudang

**Files:**
- Modify: `src/app/gudang/page.tsx:23` (tambah import)
- Modify: `src/app/gudang/page.tsx:197-213` (`handleToggleAktif`)
- Modify: `src/app/gudang/page.tsx:268` (switch toggle status)
- Modify: `src/app/gudang/page.tsx:595` (tambah `ConfirmDialog`)

- [ ] **Step 1: Tambah import `ConfirmDialog`**

Sebelum (`src/app/gudang/page.tsx:23`):
```tsx
import { useToast } from "@/components/ui/toast";
```

Sesudah:
```tsx
import { useToast } from "@/components/ui/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
```

- [ ] **Step 2: Pecah `handleToggleAktif` jadi trigger + confirm handler**

Sebelum (`src/app/gudang/page.tsx:197-213`):
```tsx
  const handleToggleAktif = async (row: GudangData, currentAktif: boolean) => {
    const nextStatus = !currentAktif;
    if (!window.confirm(`Yakin mengubah status gudang ${row.namagudang} menjadi ${nextStatus ? 'Aktif' : 'Nonaktif'}?`)) {
      return;
    }

    try {
      await apiJson("/api/Gudang/GudangMuatSetting", {
        method: "POST",
        body: JSON.stringify({ id: row.id, aktif: nextStatus ? "true" : "false" })
      });
      addToast({ title: "Sukses", description: `Gudang ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gudang-list"] });
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengubah status gudang", variant: "destructive" });
    }
  };
```

Sesudah:
```tsx
  const [toggleTarget, setToggleTarget] = useState<{ row: GudangData; nextStatus: boolean } | null>(null);

  const handleToggleAktifClick = (row: GudangData, currentAktif: boolean) => {
    setToggleTarget({ row, nextStatus: !currentAktif });
  };

  const handleToggleAktifConfirm = async () => {
    if (!toggleTarget) return;
    const { row, nextStatus } = toggleTarget;
    try {
      await apiJson("/api/Gudang/GudangMuatSetting", {
        method: "POST",
        body: JSON.stringify({ id: row.id, aktif: nextStatus ? "true" : "false" })
      });
      addToast({ title: "Sukses", description: `Gudang ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gudang-list"] });
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengubah status gudang", variant: "destructive" });
    }
  };
```

- [ ] **Step 3: Update switch toggle status**

Sebelum (`src/app/gudang/page.tsx:268`):
```tsx
              onClick={() => handleToggleAktif(row, isAktif)}
```

Sesudah:
```tsx
              onClick={() => handleToggleAktifClick(row, isAktif)}
```

- [ ] **Step 4: Render `ConfirmDialog` sebelum penutup komponen**

Sebelum (`src/app/gudang/page.tsx:593-598`):
```tsx
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Sesudah:
```tsx
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title="Ubah Status Gudang"
        description={`Yakin mengubah status gudang ${toggleTarget?.row.namagudang} menjadi ${toggleTarget?.nextStatus ? 'Aktif' : 'Nonaktif'}?`}
        onConfirm={handleToggleAktifConfirm}
        confirmText="Ya, Ubah"
        cancelText="Batal"
        variant="warning"
      />
    </div>
  );
}
```

- [ ] **Step 5: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: 0 error terkait `src/app/gudang/page.tsx`.

- [ ] **Step 6: Manual verify di browser**

Buka `http://localhost:3000/gudang` dengan role yang punya akses penuh gudang (`isGudangFull`), klik toggle switch status Aktif/Nonaktif di salah satu baris. Konfirmasi dialog SISTRO muncul dengan warna warning (oranye), Batal/Ya Ubah berfungsi.

- [ ] **Step 7: Commit**

```bash
git add src/app/gudang/page.tsx
git commit -m "fix: replace native confirm dialog with ConfirmDialog on gudang status toggle"
```

---

## Task 5: `src/app/armada/mapping-zero-odol/page.tsx` — ganti 3 confirm (hapus mapping, toggle ZERO ODOL, toggle PERCEPATAN)

**Files:**
- Modify: `src/app/armada/mapping-zero-odol/page.tsx:28` (tambah import)
- Modify: `src/app/armada/mapping-zero-odol/page.tsx:297-306` (tombol hapus mapping)
- Modify: `src/app/armada/mapping-zero-odol/page.tsx:446-451` (switch ZERO ODOL)
- Modify: `src/app/armada/mapping-zero-odol/page.tsx:473-478` (switch PERCEPATAN)
- Modify: `src/app/armada/mapping-zero-odol/page.tsx:575` (tambah 3x `ConfirmDialog`)

- [ ] **Step 1: Tambah import `ConfirmDialog` dan state untuk 3 dialog**

Sebelum (`src/app/armada/mapping-zero-odol/page.tsx:22-28`):
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
```

Sesudah:
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
```

Sebelum (`src/app/armada/mapping-zero-odol/page.tsx:59-66`):
```tsx
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    id: 0,
    startdatetime: "",
    enddatetime: "",
    tujuan: "",
  });
```

Sesudah:
```tsx
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    id: 0,
    startdatetime: "",
    enddatetime: "",
    tujuan: "",
  });
  const [deleteMappingTarget, setDeleteMappingTarget] = useState<number | null>(null);
  const [showOdolConfirm, setShowOdolConfirm] = useState(false);
  const [showPercepatanConfirm, setShowPercepatanConfirm] = useState(false);

  const handleDeleteMappingConfirm = () => {
    if (deleteMappingTarget == null) return;
    deleteMappingMutation.mutate(deleteMappingTarget);
    setDeleteMappingTarget(null);
  };
```

> Catatan: `handleDeleteMappingConfirm` memanggil `deleteMappingMutation` yang baru didefinisikan lebih bawah di file (line ~194) — aman di JavaScript/TypeScript karena function component body dieksekusi ulang tiap render dan closure ini baru benar-benar dipanggil saat user klik tombol confirm, bukan saat definisi. Tidak perlu diurutkan ulang.

- [ ] **Step 2: Ganti tombol hapus mapping (delete-per-row) supaya trigger dialog, bukan `confirm()` langsung**

Sebelum (`src/app/armada/mapping-zero-odol/page.tsx:297-306`):
```tsx
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("Hapus mapping ini?")) {
                      deleteMappingMutation.mutate(id);
                    }
                  }}
                >
```

Sesudah:
```tsx
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                  onClick={() => setDeleteMappingTarget(id)}
                >
```

- [ ] **Step 3: Ganti switch ZERO ODOL**

Sebelum (`src/app/armada/mapping-zero-odol/page.tsx:446-451`):
```tsx
                <button
                  onClick={() => {
                    if (confirm(`Apakah Anda Yakin ingin ${isOdolActive ? 'menonaktifkan' : 'mengaktifkan'} ZERO ODOL?`)) {
                      toggleOdolMutation.mutate(!isOdolActive);
                    }
                  }}
```

Sesudah:
```tsx
                <button
                  onClick={() => setShowOdolConfirm(true)}
```

- [ ] **Step 4: Ganti switch PERCEPATAN**

Sebelum (`src/app/armada/mapping-zero-odol/page.tsx:473-478`):
```tsx
                <button
                  onClick={() => {
                    if (confirm(`Apakah Anda Yakin ingin ${isPercepatanActive ? 'menonaktifkan' : 'mengaktifkan'} PERCEPATAN?`)) {
                      togglePercepatanMutation.mutate(!isPercepatanActive);
                    }
                  }}
```

Sesudah:
```tsx
                <button
                  onClick={() => setShowPercepatanConfirm(true)}
```

- [ ] **Step 5: Render 3x `ConfirmDialog` sebelum penutup komponen**

Sebelum (`src/app/armada/mapping-zero-odol/page.tsx:573-579`):
```tsx
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Sesudah:
```tsx
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteMappingTarget !== null}
        onOpenChange={(open) => !open && setDeleteMappingTarget(null)}
        title="Hapus Mapping"
        description="Apakah Anda yakin ingin menghapus mapping ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDeleteMappingConfirm}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />

      <ConfirmDialog
        open={showOdolConfirm}
        onOpenChange={setShowOdolConfirm}
        title="Ubah Status ZERO ODOL"
        description={`Apakah Anda yakin ingin ${isOdolActive ? 'menonaktifkan' : 'mengaktifkan'} ZERO ODOL?`}
        onConfirm={() => toggleOdolMutation.mutate(!isOdolActive)}
        confirmText="Ya, Ubah"
        cancelText="Batal"
        variant="warning"
      />

      <ConfirmDialog
        open={showPercepatanConfirm}
        onOpenChange={setShowPercepatanConfirm}
        title="Ubah Status PERCEPATAN"
        description={`Apakah Anda yakin ingin ${isPercepatanActive ? 'menonaktifkan' : 'mengaktifkan'} PERCEPATAN?`}
        onConfirm={() => togglePercepatanMutation.mutate(!isPercepatanActive)}
        confirmText="Ya, Ubah"
        cancelText="Batal"
        variant="warning"
      />
    </div>
  );
}
```

- [ ] **Step 6: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: 0 error terkait `src/app/armada/mapping-zero-odol/page.tsx`.

- [ ] **Step 7: Manual verify di browser**

Buka `http://localhost:3000/armada/mapping-zero-odol` dengan role yang punya `canManage` (superadmin/staffarea/pod/admin/candal/ti):
- Klik ikon hapus (Trash2) di salah satu baris tabel mapping → dialog SISTRO merah "Hapus Mapping" muncul.
- Klik switch **ZERO ODOL** → dialog SISTRO oranye "Ubah Status ZERO ODOL" muncul.
- Klik switch **PERCEPATAN** → dialog SISTRO oranye "Ubah Status PERCEPATAN" muncul.
Semua tidak lagi memunculkan popup `localhost:3000 says` bawaan browser.

- [ ] **Step 8: Commit**

```bash
git add src/app/armada/mapping-zero-odol/page.tsx
git commit -m "fix: replace native confirm dialogs with ConfirmDialog on zero-odol mapping page"
```

---

## Task 6: `src/app/kuota/level3/[id]/page.tsx` — ganti 2x alert dengan toast

**Files:**
- Modify: `src/app/kuota/level3/[id]/page.tsx:14` (tambah import)
- Modify: `src/app/kuota/level3/[id]/page.tsx:54` (tambah `addToast`)
- Modify: `src/app/kuota/level3/[id]/page.tsx:126` (`alert(json.error...)`)
- Modify: `src/app/kuota/level3/[id]/page.tsx:142` (`alert("Terjadi kesalahan sistem")`)

- [ ] **Step 1: Tambah import `useToast`**

Sebelum (`src/app/kuota/level3/[id]/page.tsx:13-17`):
```tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Badge from "@/components/ui/badge/Badge"
import { useSession } from "next-auth/react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
```

Sesudah:
```tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Badge from "@/components/ui/badge/Badge"
import { useSession } from "next-auth/react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
```

- [ ] **Step 2: Ambil `addToast` dari hook**

Sebelum (`src/app/kuota/level3/[id]/page.tsx:53-54`):
```tsx
  const id = params.id as string
  const l1 = searchParams.get("l1") || ""
```

Sesudah:
```tsx
  const id = params.id as string
  const l1 = searchParams.get("l1") || ""
  const { addToast } = useToast()
```

- [ ] **Step 3: Ganti 2x `alert(...)` di `saveEdit`**

Sebelum (`src/app/kuota/level3/[id]/page.tsx:118-143`):
```tsx
      const json = await res.json()
      if (!json.success) {
        // Rollback
        setData(previousData)
        setHeader(previousHeader)
        setEditModal({ open: true, row: targetRow })
        setEditKuota(String(targetRow.kuota))
        alert(json.error || "Gagal menyimpan")
      } else {
        // Background sync with server
        const refreshRes = await fetch(`/api/kuota/level3/${id}`)
        const refreshJson = await refreshRes.json()
        if (refreshJson.success) {
          setHeader(refreshJson.header)
          setData(refreshJson.data)
        }
      }
    } catch {
      // Rollback
      setData(previousData)
      setHeader(previousHeader)
      setEditModal({ open: true, row: targetRow })
      setEditKuota(String(targetRow.kuota))
      alert("Terjadi kesalahan sistem")
    } finally {
      setSaving(false)
    }
```

Sesudah:
```tsx
      const json = await res.json()
      if (!json.success) {
        // Rollback
        setData(previousData)
        setHeader(previousHeader)
        setEditModal({ open: true, row: targetRow })
        setEditKuota(String(targetRow.kuota))
        addToast({ title: "Gagal", description: json.error || "Gagal menyimpan", variant: "destructive" })
      } else {
        // Background sync with server
        const refreshRes = await fetch(`/api/kuota/level3/${id}`)
        const refreshJson = await refreshRes.json()
        if (refreshJson.success) {
          setHeader(refreshJson.header)
          setData(refreshJson.data)
        }
      }
    } catch {
      // Rollback
      setData(previousData)
      setHeader(previousHeader)
      setEditModal({ open: true, row: targetRow })
      setEditKuota(String(targetRow.kuota))
      addToast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" })
    } finally {
      setSaving(false)
    }
```

- [ ] **Step 4: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: 0 error terkait `src/app/kuota/level3/[id]/page.tsx`.

- [ ] **Step 5: Manual verify di browser**

Buka halaman detail Kuota Level 3 (`http://localhost:3000/kuota/level3/<guid-valid>`) dengan role `candal`/`superadmin`/`admin`, klik edit kuota area, masukkan nilai kurang dari `kuota_terpesan` lalu paksa submit (atau matikan network sebentar untuk memicu path error) — konfirmasi toast merah muncul, bukan `alert()` bawaan browser.

- [ ] **Step 6: Commit**

```bash
git add "src/app/kuota/level3/[id]/page.tsx"
git commit -m "fix: replace native alert with toast on kuota level3 edit error"
```

---

## Task 7: `src/app/kuota/level2/[id]/page.tsx` — ganti 2x alert dengan toast

**Files:**
- Modify: `src/app/kuota/level2/[id]/page.tsx:14` (tambah import)
- Modify: `src/app/kuota/level2/[id]/page.tsx:53` (tambah `addToast`)
- Modify: `src/app/kuota/level2/[id]/page.tsx:126` (`alert(json.error...)`)
- Modify: `src/app/kuota/level2/[id]/page.tsx:142` (`alert("Terjadi kesalahan sistem")`)

- [ ] **Step 1: Tambah import `useToast`**

Sebelum (`src/app/kuota/level2/[id]/page.tsx:14-18`):
```tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Badge from "@/components/ui/badge/Badge"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
```

Sesudah:
```tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Badge from "@/components/ui/badge/Badge"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/components/ui/toast"
```

- [ ] **Step 2: Ambil `addToast` dari hook**

Sebelum (`src/app/kuota/level2/[id]/page.tsx:52-53`):
```tsx
  const params = useParams()
  const id = params.id as string
```

Sesudah:
```tsx
  const params = useParams()
  const id = params.id as string
  const { addToast } = useToast()
```

- [ ] **Step 3: Ganti 2x `alert(...)` di `saveEdit`**

Sebelum (`src/app/kuota/level2/[id]/page.tsx:118-143`):
```tsx
      const json = await res.json()
      if (!json.success) {
        // Rollback
        setData(previousData)
        setHeader(previousHeader)
        setEditModal({ open: true, row: targetRow })
        setEditKuota(String(targetRow.kuota))
        alert(json.error || "Gagal menyimpan")
      } else {
        // Background sync with server
        const refreshRes = await fetch(`/api/kuota/level2/${id}`)
        const refreshJson = await refreshRes.json()
        if (refreshJson.success) {
          setHeader(refreshJson.header)
          setData(refreshJson.data)
        }
      }
    } catch {
      // Rollback
      setData(previousData)
      setHeader(previousHeader)
      setEditModal({ open: true, row: targetRow })
      setEditKuota(String(targetRow.kuota))
      alert("Terjadi kesalahan sistem")
    } finally {
      setSaving(false)
    }
```

Sesudah:
```tsx
      const json = await res.json()
      if (!json.success) {
        // Rollback
        setData(previousData)
        setHeader(previousHeader)
        setEditModal({ open: true, row: targetRow })
        setEditKuota(String(targetRow.kuota))
        addToast({ title: "Gagal", description: json.error || "Gagal menyimpan", variant: "destructive" })
      } else {
        // Background sync with server
        const refreshRes = await fetch(`/api/kuota/level2/${id}`)
        const refreshJson = await refreshRes.json()
        if (refreshJson.success) {
          setHeader(refreshJson.header)
          setData(refreshJson.data)
        }
      }
    } catch {
      // Rollback
      setData(previousData)
      setHeader(previousHeader)
      setEditModal({ open: true, row: targetRow })
      setEditKuota(String(targetRow.kuota))
      addToast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" })
    } finally {
      setSaving(false)
    }
```

- [ ] **Step 4: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: 0 error terkait `src/app/kuota/level2/[id]/page.tsx`.

- [ ] **Step 5: Manual verify di browser**

Sama seperti Task 6 tapi di `http://localhost:3000/kuota/level2/<guid-valid>`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/kuota/level2/[id]/page.tsx"
git commit -m "fix: replace native alert with toast on kuota level2 edit error"
```

---

## Task 8: `src/app/profile/page.tsx` — ganti alert password verifikasi dengan pesan inline di modal

**Files:**
- Modify: `src/app/profile/page.tsx:44-45` (tambah state error)
- Modify: `src/app/profile/page.tsx:90-99` (`handleProfileSubmitClick` — reset error saat modal dibuka)
- Modify: `src/app/profile/page.tsx:102-106` (`handleConfirmSave` — ganti alert)
- Modify: `src/app/profile/page.tsx:515-528` (modal — tampilkan error inline)

> Catatan kenapa bukan toast: modal konfirmasi password (`showConfirmModal`) dirender full-screen dengan backdrop blur di atas seluruh halaman (`fixed inset-0 ... z-50`), jadi toast yang muncul di pojok kanan bawah akan tetap terlihat, tapi UX lebih baik kalau pesan error langsung menempel di field yang salah, di dalam modal itu sendiri — pola yang sama seperti file ini sudah pakai (`message` state untuk tab Profile/Reset Password).

- [ ] **Step 1: Tambah state `confirmError`**

Sebelum (`src/app/profile/page.tsx:43-45`):
```tsx
  // Verify Password Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
```

Sesudah:
```tsx
  // Verify Password Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
```

- [ ] **Step 2: Reset `confirmError` saat modal dibuka**

Sebelum (`src/app/profile/page.tsx:90-99`):
```tsx
  // Pre-validate Profile Form
  const handleProfileSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullname || !profileForm.email) {
      setMessage({ type: "error", text: "Nama dan Email tidak boleh kosong" });
      return;
    }
    setMessage(null);
    setConfirmPassword("");
    setShowConfirmModal(true);
  };
```

Sesudah:
```tsx
  // Pre-validate Profile Form
  const handleProfileSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullname || !profileForm.email) {
      setMessage({ type: "error", text: "Nama dan Email tidak boleh kosong" });
      return;
    }
    setMessage(null);
    setConfirmPassword("");
    setConfirmError(null);
    setShowConfirmModal(true);
  };
```

- [ ] **Step 3: Ganti `alert(...)` di `handleConfirmSave` dengan `setConfirmError(...)`**

Sebelum (`src/app/profile/page.tsx:102-106`):
```tsx
  // Actual Profile Save with Password Verification
  const handleConfirmSave = async () => {
    if (!confirmPassword) {
      alert("Password verifikasi wajib diisi!");
      return;
    }
```

Sesudah:
```tsx
  // Actual Profile Save with Password Verification
  const handleConfirmSave = async () => {
    if (!confirmPassword) {
      setConfirmError("Password verifikasi wajib diisi!");
      return;
    }
```

- [ ] **Step 4: Tampilkan `confirmError` di dalam modal, dan bersihkan saat user mengetik**

Sebelum (`src/app/profile/page.tsx:515-528`):
```tsx
              <div className="space-y-1.5">
                <Label>Masukkan Password Anda</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-10 text-xs font-semibold"
                    placeholder="Masukkan Password Anda"
                    autoFocus
                  />
                </div>
              </div>
            </div>
```

Sesudah:
```tsx
              <div className="space-y-1.5">
                <Label>Masukkan Password Anda</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(null); }}
                    className="pl-10 h-10 text-xs font-semibold"
                    placeholder="Masukkan Password Anda"
                    autoFocus
                  />
                </div>
                {confirmError && (
                  <p className="text-xs text-red-500 font-bold">{confirmError}</p>
                )}
              </div>
            </div>
```

- [ ] **Step 5: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: 0 error terkait `src/app/profile/page.tsx`.

- [ ] **Step 6: Manual verify di browser**

Buka `http://localhost:3000/profile`, ubah nama/email, klik "Simpan Profil" untuk membuka modal konfirmasi, lalu klik "Konfirmasi & Simpan" **tanpa** mengisi password. Konfirmasi:
- Tidak ada `alert()` bawaan browser yang muncul.
- Teks merah "Password verifikasi wajib diisi!" muncul tepat di bawah field password, di dalam modal.
- Mulai mengetik di field password → pesan error hilang.

- [ ] **Step 7: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "fix: replace native alert with inline error on profile password confirmation"
```

---

## Task 9: `src/app/posto/upload/page.tsx` — ganti 5x alert dengan toast

**Files:**
- Modify: `src/app/posto/upload/page.tsx:30-31` (tambah import)
- Modify: `src/app/posto/upload/page.tsx:141` (tambah `addToast`)
- Modify: `src/app/posto/upload/page.tsx:227` (`alert("Pilih wilayah terlebih dahulu")`)
- Modify: `src/app/posto/upload/page.tsx:270` (`alert("Terjadi kesalahan saat validasi")`)
- Modify: `src/app/posto/upload/page.tsx:311` (`alert("Tidak ada data valid untuk disimpan")`)
- Modify: `src/app/posto/upload/page.tsx:377` (`alert("Gagal menyimpan data")`)
- Modify: `src/app/posto/upload/page.tsx:381` (`alert("Terjadi kesalahan saat menyimpan")`)

- [ ] **Step 1: Tambah import `useToast`**

Sebelum (`src/app/posto/upload/page.tsx:29-32`):
```tsx
import * as XLSX from 'xlsx';
import { useApi } from "@/hooks/use-api";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
```

Sesudah:
```tsx
import * as XLSX from 'xlsx';
import { useApi } from "@/hooks/use-api";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Ambil `addToast` dari hook**

Sebelum (`src/app/posto/upload/page.tsx:140-141`):
```tsx
  const { data: session } = useSession();
  const { apiJson, apiFetch, token } = useApi();
```

Sesudah:
```tsx
  const { data: session } = useSession();
  const { apiJson, apiFetch, token } = useApi();
  const { addToast } = useToast();
```

- [ ] **Step 3: Ganti `alert("Pilih wilayah terlebih dahulu")` di `handleFileChange`**

Sebelum (`src/app/posto/upload/page.tsx:224-228`):
```tsx
      if (validInitialRows.length > 0 && selectedWilayah) {
        triggerValidation(validInitialRows, selectedWilayah);
      } else if (!selectedWilayah) {
        alert("Pilih wilayah terlebih dahulu");
      }
```

Sesudah:
```tsx
      if (validInitialRows.length > 0 && selectedWilayah) {
        triggerValidation(validInitialRows, selectedWilayah);
      } else if (!selectedWilayah) {
        addToast({ title: "Peringatan", description: "Pilih wilayah terlebih dahulu", variant: "warning" });
      }
```

- [ ] **Step 4: Ganti `alert("Terjadi kesalahan saat validasi")` di `triggerValidation`**

Sebelum (`src/app/posto/upload/page.tsx:268-271`):
```tsx
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat validasi");
    } finally {
```

Sesudah:
```tsx
    } catch (err) {
      console.error(err);
      addToast({ title: "Error", description: "Terjadi kesalahan saat validasi", variant: "destructive" });
    } finally {
```

- [ ] **Step 5: Ganti `alert("Tidak ada data valid untuk disimpan")` di `handleSubmit`**

Sebelum (`src/app/posto/upload/page.tsx:308-312`):
```tsx
    const validRows = validationResult.listposto.filter(item => !isRowError(item));
    if (validRows.length === 0) {
      alert("Tidak ada data valid untuk disimpan");
      return;
    }
```

Sesudah:
```tsx
    const validRows = validationResult.listposto.filter(item => !isRowError(item));
    if (validRows.length === 0) {
      addToast({ title: "Peringatan", description: "Tidak ada data valid untuk disimpan", variant: "warning" });
      return;
    }
```

- [ ] **Step 6: Ganti 2x `alert(...)` sisanya di `handleSubmit`**

Sebelum (`src/app/posto/upload/page.tsx:371-385`):
```tsx
      if (res.ok) {
        setSubmitDone(true);
        setValidationResult(null);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        alert("Gagal menyimpan data");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSubmitting(false);
    }
  };
```

Sesudah:
```tsx
      if (res.ok) {
        setSubmitDone(true);
        setValidationResult(null);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        addToast({ title: "Gagal", description: "Gagal menyimpan data", variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      addToast({ title: "Error", description: "Terjadi kesalahan saat menyimpan", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
```

- [ ] **Step 7: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-Object -First 30
```
Expected: 0 error terkait `src/app/posto/upload/page.tsx`.

- [ ] **Step 8: Manual verify di browser**

Buka `http://localhost:3000/posto/upload`:
- Pilih file Excel dulu sebelum memilih wilayah (kalau UI memungkinkan) atau langsung cek path lain — pastikan tidak ada `alert()` browser yang muncul di skenario "Pilih wilayah terlebih dahulu", "Tidak ada data valid untuk disimpan", dan error saat submit; semua tampil sebagai toast di pojok kanan bawah.

- [ ] **Step 9: Commit**

```bash
git add src/app/posto/upload/page.tsx
git commit -m "fix: replace native alert with toast on POSTO upload validation and submit"
```

---

## Self-Review

**Spec coverage:**
- ✅ "perbaiki confirm dialog disini" (screenshot halaman `/posto`) → Task 1.
- ✅ "perbaiki semua confirm dialognya cek diseluruh fungsi di apps ini" → seluruh `window.confirm`/`confirm()` di codebase di-grep (`Grep` atas `window\.confirm|confirm\(`), semua 7 titik di 5 file tercakup (Task 1–5). Tidak ada sisa — hasil grep ulang setelah plan ini disusun hanya menyisakan pemakaian di dalam `src/components/ui/ConfirmDialog.tsx` sendiri (bukan `window.confirm`, itu memang nama komponennya) dan `src/app/so/page.tsx` yang sudah pakai `Dialog`/`DialogFooter` custom (bukan native), jadi tidak perlu diubah.
- ✅ "jangan gunakan alert standar js gunakan sesuai dengan desain yang di apps ini" → seluruh `alert(...)` di-grep, 10 titik di 4 file tercakup (Task 6–9), diganti `addToast` (atau pesan inline khusus untuk modal password di Task 8 karena toast tertutup backdrop modal).

**Placeholder scan:** Semua step berisi kode before/after lengkap, tidak ada TODO/placeholder/"tambahkan validasi di sini".

**Type consistency:** Nama handler baru (`handleDeleteClick`/`handleDeleteConfirm`, `handleToggleAktifClick`/`handleToggleAktifConfirm`) konsisten dipakai persis sama di step definisi dan step pemanggilan pada tiap task. Prop `ConfirmDialog` (`open`, `onOpenChange`, `title`, `description`, `onConfirm`, `confirmText`, `cancelText`, `variant`) dipakai sesuai signature asli di `src/components/ui/ConfirmDialog.tsx:15-26` — tidak ada prop yang di-invent.
