# Live Monitoring: Default PKG + Mode Semua Plant untuk Pupuk Indonesia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman live-monitoring default ke Petrokimia Gresik (PKG) saat pertama dibuka; jika user memilih Pupuk Indonesia (PI), tampilkan antrian SEMUA plant sekaligus.

**Architecture:**
- Frontend: ganti pemakaian `activeCompanyCode` global (CompanyContext + `switchCompany` yang re-auth ASP.NET) dengan state lokal `selectedCompany` default `"PKG"`. Dropdown hanya set state lokal — instan, tanpa side effect ke halaman lain.
- Backend: `DataTableMonitorPosition` diberi bypass — jika `companyCode == "PI"` (holding, tidak punya tiket POSTO sendiri), lewati filter company sehingga tiket semua plant ikut. Badge plant di kartu sudah menampilkan `ticket.company` per tiket, jadi asal plant tetap terlihat.

**Fakta DB:** `Company` table: `company_code = "PI"`, `company = "Pupuk Indonesia"`, `groupcompany = "PIHC"`. Tiket selalu milik plant (PKG/PKC/PIM/...), tidak ada tiket ber-company PI — karena itu saat ini pilih PI = hasil kosong.

**Tech Stack:** Next.js 16 TypeScript (frontend), ASP.NET Framework 4.5 C# (backend).

---

## File Map

| File | Change |
|---|---|
| `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` | `DataTableMonitorPosition`: bypass filter company jika companyCode = PI |
| `src/app/antrian/live-monitoring/page.tsx` | State lokal `selectedCompany` default "PKG"; dropdown tidak lagi panggil `switchCompany` |

---

## Task 1: Backend — mode semua plant saat companyCode = PI

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` (method `DataTableMonitorPosition`, sekitar line 3654–3666)

### Context

Filter saat ini (line 3654–3666):
```csharp
                // ponytail: no listbagian filter — monitoring sees all tickets at this position/company
                var datasearch = db.Tiket.Where(x =>
                    x.Posto1.company_code.ToLower() == effectiveCompanyCode.ToLower() &&
                    x.position == position &&
```

- [ ] **Step 1: Edit — tambah flag holding + ubah kondisi company**

Cari exact string:
```csharp
                // ponytail: no listbagian filter — monitoring sees all tickets at this position/company
                var datasearch = db.Tiket.Where(x =>
                    x.Posto1.company_code.ToLower() == effectiveCompanyCode.ToLower() &&
                    x.position == position &&
```

Ganti jadi:
```csharp
                // PI = holding: no tickets of its own, show all plants
                bool isHoldingAll = effectiveCompanyCode.ToLower() == "pi";

                // ponytail: no listbagian filter — monitoring sees all tickets at this position/company
                var datasearch = db.Tiket.Where(x =>
                    (isHoldingAll || x.Posto1.company_code.ToLower() == effectiveCompanyCode.ToLower()) &&
                    x.position == position &&
```

- [ ] **Step 2: Verify compile**

```powershell
cd "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME"
msbuild SISTROAWESOME.csproj /t:Build /p:Configuration=Debug /v:m
```

Expected: Build succeeded, 0 errors. (Kalau msbuild tidak ada di PATH, cukup verifikasi visual — perubahan hanya 2 baris deklarasi bool + 1 kondisi OR.)

- [ ] **Step 3: Commit backend**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "feat: DataTableMonitorPosition shows all plants when companyCode=PI (holding)"
```

---

## Task 2: Frontend — default PKG + dropdown lokal tanpa switchCompany

**Files:**
- Modify: `src/app/antrian/live-monitoring/page.tsx`

### Context

Saat ini page pakai `activeCompanyCode` global dari `useCompany()` dan dropdown memanggil `switchCompany(val)` yang re-auth ASP.NET + mengubah company global untuk seluruh app. Kita ganti dengan state lokal — `DataTableMonitorPosition` menerima `companyCode` sebagai parameter, tidak butuh token company yang cocok.

**Baris yang terlibat:**

Line ~76 (hooks):
```typescript
  const { activeCompanyCode, switchCompany } = useCompany();
```

Line ~140-an (payload):
```typescript
          ...(activeCompanyCode ? { companyCode: activeCompanyCode } : {}),
```

Dependency effect: `[activeCompanyCode, apiTable, token]`

Dropdown (line ~195):
```tsx
              value={activeCompanyCode ?? ""}
              onChange={(val) => { switchCompany(val).catch(console.error); }}
```

Card header fallback (line ~290):
```tsx
                        {ticket.company || activeCompanyCode}
```

- [ ] **Step 1: Ganti hook + tambah state lokal**

Cari:
```typescript
  const { activeCompanyCode, switchCompany } = useCompany();
```

Ganti:
```typescript
  const [selectedCompany, setSelectedCompany] = useState("PKG");
```

Hapus juga import `useCompany` jika tidak dipakai lagi di file ini (cek dulu dengan grep `useCompany` — kalau hanya satu pemakaian, hapus baris import `import { useCompany } from "@/context/CompanyContext";`).

- [ ] **Step 2: Update payload fetch**

Cari:
```typescript
          ...(activeCompanyCode ? { companyCode: activeCompanyCode } : {}),
```

Ganti:
```typescript
          companyCode: selectedCompany,
```

- [ ] **Step 3: Update dependency array effect fetch**

Cari:
```typescript
  }, [activeCompanyCode, apiTable, token]);
```

Ganti:
```typescript
  }, [selectedCompany, apiTable, token]);
```

- [ ] **Step 4: Update console.log fetch (opsional tapi konsisten)**

Cari:
```typescript
        console.log(`[live-monitoring] API Result for ${activeCompanyCode}:`, {
```

Ganti:
```typescript
        console.log(`[live-monitoring] API Result for ${selectedCompany}:`, {
```

- [ ] **Step 5: Update dropdown**

Cari:
```tsx
              value={activeCompanyCode ?? ""}
              onChange={(val) => { switchCompany(val).catch(console.error); }}
```

Ganti:
```tsx
              value={selectedCompany}
              onChange={(val) => setSelectedCompany(val)}
```

- [ ] **Step 6: Update fallback badge plant di kartu**

Cari:
```tsx
                        {ticket.company || activeCompanyCode}
```

Ganti:
```tsx
                        {ticket.company || selectedCompany}
```

- [ ] **Step 7: Pastikan "Pupuk Indonesia" ada di daftar dropdown**

Daftar fallback companies (line ~82) saat ini:
```typescript
  const [companies, setCompanies] = useState<{ company_code: string; company: string }[]>([
    { company_code: "PKG", company: "Petrokimia Gresik" },
    { company_code: "PKC", company: "Pupuk Kujang" },
    { company_code: "PIM", company: "Pupuk Iskandar Muda" },
    { company_code: "LOG4MENENG", company: "Logistics Meneng" },
  ]);
```

Tambah PI:
```typescript
  const [companies, setCompanies] = useState<{ company_code: string; company: string }[]>([
    { company_code: "PKG", company: "Petrokimia Gresik" },
    { company_code: "PKC", company: "Pupuk Kujang" },
    { company_code: "PIM", company: "Pupuk Iskandar Muda" },
    { company_code: "PI", company: "Pupuk Indonesia (Semua Plant)" },
    { company_code: "LOG4MENENG", company: "Logistics Meneng" },
  ]);
```

Catatan: `getCompanyListFitur` menimpa daftar ini dari API dan PI punya `statusPlant = true` jadi PI ikut dari API. Fallback hanya untuk sebelum API respond. Namun tambahkan guard yang sama seperti LOG4MENENG di handler API supaya PI selalu ada:

Cari:
```typescript
          if (!formatted.some(m => m.company_code === "LOG4MENENG")) {
            formatted.push({ company_code: "LOG4MENENG", company: "Logistics Meneng" });
          }
```

Ganti:
```typescript
          if (!formatted.some(m => m.company_code === "LOG4MENENG")) {
            formatted.push({ company_code: "LOG4MENENG", company: "Logistics Meneng" });
          }
          if (!formatted.some(m => m.company_code === "PI")) {
            formatted.push({ company_code: "PI", company: "Pupuk Indonesia (Semua Plant)" });
          }
```

- [ ] **Step 8: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit
```

Expected: 0 errors (abaikan error stale di `.next/types` jika masih menyebut analisis-hambatan).

- [ ] **Step 9: Commit frontend**

```bash
cd c:\Users\weka\Indigo\SISTROV2-next
git add src/app/antrian/live-monitoring/page.tsx
git commit -m "feat: live-monitoring defaults to PKG, local company selector, PI shows all plants"
```

---

## Task 3: Verifikasi manual

- [ ] **Step 1: Restart backend** (IIS Express) supaya perubahan `DataTableMonitorPosition` aktif.

- [ ] **Step 2: Buka `http://localhost:3000/antrian/live-monitoring`**
  - Dropdown terisi "Petrokimia Gresik", data PKG langsung tampil tanpa pilih apa-apa.

- [ ] **Step 3: Pilih "Pupuk Indonesia (Semua Plant)"**
  - Kartu dari beberapa plant muncul (badge plant di kartu menunjukkan PKG/PKC/PIM/dll, bukan PI).
  - Ketiga section (Timbang Kosong / Sedang Dimuat / Checkout) berisi gabungan semua plant.

- [ ] **Step 4: Pilih kembali plant lain (mis. PKC)** — data terfilter ke plant itu saja.

---

## Self-Review

**Spec coverage:**
- ✅ Default PKG saat pertama buka — `useState("PKG")`, fetch langsung jalan (companyCode selalu terisi)
- ✅ Pilih PI → semua plant tampil — backend bypass `isHoldingAll`
- ✅ "tampilkan seluruh antrian" — length 200 per posisi sudah ada, gabungan semua plant ikut
- ✅ Plant asal tetap terlihat di mode PI — badge `ticket.company` per tiket (sudah ada dari fitur sebelumnya)
- ✅ Dropdown tidak lagi mengubah company global (side effect switchCompany hilang, ganti instan)

**Placeholder scan:** None.

**Type consistency:** `selectedCompany: string` dipakai konsisten di payload, deps, dropdown, fallback badge.

**Catatan keamanan:** Bypass PI membuka data semua plant lewat endpoint monitoring untuk siapa pun yang punya token valid. Endpoint memang sudah tanpa listbagian (keputusan sebelumnya, data monitoring dianggap non-sensitif lintas departemen). Jika nanti perlu dibatasi per role, tambah cek `myCompanyCode == "PI" || role Viewer` di backend.
