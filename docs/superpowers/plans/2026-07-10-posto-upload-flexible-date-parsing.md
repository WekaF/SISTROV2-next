# POSTO Upload — Flexible Date Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix POSTO/SO Excel upload so dates that are ambiguous (day/month swapped) are parsed correctly instead of silently disappearing, and give the user visible feedback when a date is ambiguous or unparseable.

**Architecture:** Extract the date-parsing logic out of `src/app/posto/upload/page.tsx` into a pure, testable module `src/lib/posto-date.ts`. The new parser reads real `Date` objects from `xlsx` (via `cellDates: true`) when available, and for string input uses a rule-based disambiguation: any group `> 12` can only be a day, which lets the parser auto-correct day/month swaps; when both groups are `<= 12` (genuinely ambiguous), it falls back to the existing SISTRO convention (`dd/MM/yyyy`) but flags the row as ambiguous. Rows with a date that fails to parse are no longer silently dropped — they're excluded from submission but reported to the user via toast. Rows with an ambiguous-but-parsed date get a visible badge in the preview table.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, `xlsx` (SheetJS), existing `useToast` / `Badge` components. No new dependencies. No test framework exists in this repo (`package.json` has no `vitest`/`jest`), so verification uses a single assert-based self-check script (via `npx tsx`, not a permanent dependency) rather than introducing a full test framework for one module.

---

## Context for the implementer

Current buggy code lives in `src/app/posto/upload/page.tsx:94-129` (function `formatTanggal`):

```ts
function formatTanggal(str: any): string {
  if (!str) return "";
  const s = String(str).trim();

  // Pattern 1: dd/MM/yyyy atau dd-MM-yyyy
  const p1 = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
  // Pattern 2: yyyy/MM/dd atau yyyy-MM-dd
  const p2 = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;

  let formatted = s;
  if (p1.test(s)) {
    const match = s.match(p1);
    if (match) {
      const [_, d, m, y] = match;
      formatted = `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
    }
  } else if (p2.test(s)) {
    const match = s.match(p2);
    if (match) {
      const [_, y, m, d] = match;
      formatted = `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;
    }
  }

  // Convert to yyyy/MM/dd for server
  try {
    const date = new Date(formatted);
    if (isNaN(date.getTime())) return s;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    return s;
  }
}
```

Two bugs:
1. **No swap detection.** `dd/MM/yyyy` is always assumed. If the uploaded value is actually `MM/dd/yyyy` (e.g. Excel exported it in US format), the day/month get silently swapped or, if the "month" ends up `> 12`, `new Date(...)` returns `Invalid Date` and the function returns the *original raw string* `s` — which is not in `yyyy/MM/dd` format.
2. **Silent failure.** That raw string is assigned to `tglPOSTO` (`page.tsx:205`). The existing client-side filter `rows.filter(r => r.noPOSTO && r.tglPOSTO && ...)` (`page.tsx:223`) treats it as truthy (non-empty string) so the row is NOT filtered out — it gets sent to the backend in a broken format, which is why the date "sometimes doesn't appear" after upload: the backend can't parse it and the field ends up blank downstream.

This plan replaces that function with a rule-based parser that:
- Auto-corrects unambiguous swaps (when one group is `> 12`, it can only be the day).
- Flags genuinely ambiguous dates (both groups `<= 12`) instead of guessing silently.
- Never returns a non-empty, wrongly-formatted string — invalid input always yields `formatted: ""`, which the UI then reports explicitly instead of passing through.

---

## Task 1: Create the pure date-parsing module

**Files:**
- Create: `src/lib/posto-date.ts`

- [ ] **Step 1: Write the module**

```ts
// src/lib/posto-date.ts

export interface ParsedTanggal {
  /** "yyyy/MM/dd" siap dikirim ke server, atau "" jika gagal parse. */
  formatted: string;
  /** true jika hari & bulan sama-sama <= 12 (urutan bisa jadi tertukar, tidak bisa dipastikan). */
  ambiguous: boolean;
  /** true jika formatted berhasil diisi dengan tanggal kalender yang valid. */
  valid: boolean;
}

const MONTH_MAX = 12;

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > MONTH_MAX) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

const FAIL: ParsedTanggal = { formatted: "", ambiguous: false, valid: false };

/**
 * Parser tanggal fleksibel untuk upload POSTO/SO.
 *
 * Aturan disambiguasi untuk input string dua-angka (dd/MM/yyyy vs MM/dd/yyyy):
 * - Jika salah satu angka > 12, angka itu pasti hari (bulan tidak mungkin > 12).
 *   Ini otomatis mengoreksi kasus tanggal & bulan tertukar.
 * - Jika kedua angka <= 12, urutan tidak bisa dipastikan. Default ke konvensi
 *   SISTRO (dd/MM/yyyy) dan tandai ambiguous = true supaya UI bisa memperingatkan user.
 * - Jika kedua angka > 12, atau hasilnya bukan tanggal kalender valid, parsing gagal.
 */
export function parseTanggalFleksibel(raw: any): ParsedTanggal {
  if (raw === undefined || raw === null || raw === "") return FAIL;

  // Sel Excel yang sudah berupa Date (hasil XLSX.read({ cellDates: true })) — tidak ambigu.
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return FAIL;
    const y = raw.getFullYear();
    const m = raw.getMonth() + 1;
    const d = raw.getDate();
    return { formatted: `${y}/${pad2(m)}/${pad2(d)}`, ambiguous: false, valid: true };
  }

  const s = String(raw).trim();
  if (!s) return FAIL;

  // Format ISO: yyyy-MM-dd atau yyyy/MM/dd — tidak ambigu.
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (!isValidCalendarDate(y, m, d)) return FAIL;
    return { formatted: `${y}/${pad2(m)}/${pad2(d)}`, ambiguous: false, valid: true };
  }

  // Format dua-angka: dd/MM/yyyy atau MM/dd/yyyy (bisa tertukar).
  const dm = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dm) {
    const g1 = Number(dm[1]);
    const g2 = Number(dm[2]);
    const y = Number(dm[3]);

    const g1IsMonth = g1 <= MONTH_MAX;
    const g2IsMonth = g2 <= MONTH_MAX;

    if (g1IsMonth && !g2IsMonth) {
      // g2 > 12 pasti hari -> g1 pasti bulan. Mengoreksi kasus tertukar (mis. "04/25/2026").
      if (!isValidCalendarDate(y, g1, g2)) return FAIL;
      return { formatted: `${y}/${pad2(g1)}/${pad2(g2)}`, ambiguous: false, valid: true };
    }
    if (!g1IsMonth && g2IsMonth) {
      // g1 > 12 pasti hari -> g2 pasti bulan (mis. "25/04/2026").
      if (!isValidCalendarDate(y, g2, g1)) return FAIL;
      return { formatted: `${y}/${pad2(g2)}/${pad2(g1)}`, ambiguous: false, valid: true };
    }
    if (g1IsMonth && g2IsMonth) {
      // Ambigu: default konvensi SISTRO dd/MM/yyyy (g1 = hari, g2 = bulan).
      if (!isValidCalendarDate(y, g2, g1)) return FAIL;
      return { formatted: `${y}/${pad2(g2)}/${pad2(g1)}`, ambiguous: true, valid: true };
    }
    // Kedua angka > 12: tidak mungkin valid.
    return FAIL;
  }

  return FAIL;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/posto-date.ts
git commit -m "feat: add flexible date parser for POSTO upload"
```

---

## Task 2: Add an assert-based self-check (no test framework in this repo)

**Files:**
- Create: `src/lib/posto-date.selfcheck.ts`

- [ ] **Step 1: Write the self-check script**

```ts
// src/lib/posto-date.selfcheck.ts
// Jalankan manual: npx tsx src/lib/posto-date.selfcheck.ts
import assert from "node:assert";
import { parseTanggalFleksibel } from "./posto-date";

// ISO, tidak ambigu
assert.deepStrictEqual(
  parseTanggalFleksibel("2026/04/07"),
  { formatted: "2026/04/07", ambiguous: false, valid: true }
);
assert.deepStrictEqual(
  parseTanggalFleksibel("2026-04-07"),
  { formatted: "2026/04/07", ambiguous: false, valid: true }
);

// dd/MM ambigu (keduanya <= 12) -> default dd/MM, ditandai ambiguous
assert.deepStrictEqual(
  parseTanggalFleksibel("07/04/2026"),
  { formatted: "2026/04/07", ambiguous: true, valid: true }
);

// Tertukar otomatis terkoreksi: "04/25/2026" cuma valid sebagai MM/dd (25 tidak mungkin bulan)
assert.deepStrictEqual(
  parseTanggalFleksibel("04/25/2026"),
  { formatted: "2026/04/25", ambiguous: false, valid: true }
);

// Hari > 12 di posisi depan, jelas dd/MM: "25/04/2026"
assert.deepStrictEqual(
  parseTanggalFleksibel("25/04/2026"),
  { formatted: "2026/04/25", ambiguous: false, valid: true }
);

// Date object (hasil cellDates: true dari XLSX.read)
assert.deepStrictEqual(
  parseTanggalFleksibel(new Date(2026, 3, 7)),
  { formatted: "2026/04/07", ambiguous: false, valid: true }
);

// Kedua angka > 12: tidak valid
assert.deepStrictEqual(
  parseTanggalFleksibel("13/14/2026"),
  { formatted: "", ambiguous: false, valid: false }
);

// Tanggal kalender tidak ada (30 Februari)
assert.deepStrictEqual(
  parseTanggalFleksibel("30/02/2026"),
  { formatted: "", ambiguous: false, valid: false }
);

// Kosong / null / undefined
assert.deepStrictEqual(parseTanggalFleksibel(""), { formatted: "", ambiguous: false, valid: false });
assert.deepStrictEqual(parseTanggalFleksibel(null), { formatted: "", ambiguous: false, valid: false });
assert.deepStrictEqual(parseTanggalFleksibel(undefined), { formatted: "", ambiguous: false, valid: false });

console.log("posto-date self-check: semua assertion lolos");
```

- [ ] **Step 2: Run it and confirm it fails before Task 1's implementation is correct**

This step only matters if you're implementing Task 1 and Task 2 in strict TDD order (write self-check first, watch it fail against a stub, then write the real implementation). If Task 1 is already committed with the implementation above, skip straight to Step 3.

- [ ] **Step 3: Run the self-check against the real implementation**

Run: `npx --yes tsx src/lib/posto-date.selfcheck.ts`
Expected output: `posto-date self-check: semua assertion lolos` (no `AssertionError` thrown).

- [ ] **Step 4: Commit**

```bash
git add src/lib/posto-date.selfcheck.ts
git commit -m "test: add self-check for flexible date parser"
```

---

## Task 3: Wire the new parser into the upload page, read real Date objects from Excel

**Files:**
- Modify: `src/app/posto/upload/page.tsx`

- [ ] **Step 1: Import the new parser and drop the old `formatTanggal`**

Add the import near the top (after the other `@/` imports, around `page.tsx:33`):

```ts
import { cn } from "@/lib/utils";
import { parseTanggalFleksibel } from "@/lib/posto-date";
```

Delete the entire `formatTanggal` function (`page.tsx:94-129`). Keep `parseQty` as-is.

- [ ] **Step 2: Make `XLSX.read` return real `Date` objects for date cells**

In `handleFileChange` (`page.tsx:187`), change:

```ts
      const wb = XLSX.read(bstr, { type: 'array', raw: false });
```

to:

```ts
      const wb = XLSX.read(bstr, { type: 'array', raw: false, cellDates: true });
```

This makes Excel-native date cells arrive as JS `Date` objects instead of locale-dependent strings, removing the ambiguity entirely for the common case (only manually-typed text dates still need the string-parsing rules in `parseTanggalFleksibel`).

- [ ] **Step 3: Replace the row-mapping logic to use the flexible parser and track invalid/ambiguous rows**

Replace the `rows` mapping and the two lines after it (`page.tsx:192-230`, from `const rows = data.map(...)` through the `if (validInitialRows.length > 0 ...)` block) with:

```ts
      const rows = data.map((row: any) => {
        const isSO = !!(row.NoSO || row.TglSO);
        const mapped: any = { ...row };

        if (isSO) {
          if (!mapped.NoPOSTO) mapped.NoPOSTO = row.NoSO;
          if (!mapped.TglPOSTO) mapped.TglPOSTO = row.TglSO;
          if (!mapped.distributor) mapped.distributor = row.Trans;
          if (!mapped.Tujuan) mapped.Tujuan = row.Asal;
        }

        const tgl = parseTanggalFleksibel(mapped.TglPOSTO);
        const tglAkhir = parseTanggalFleksibel(mapped.tglakhir || mapped.TglPOSTO);
        const tglJatuhTempo = parseTanggalFleksibel(mapped.tgljatuhtempo || mapped.TglPOSTO);

        return {
          noPOSTO: String(mapped.NoPOSTO || "").trim(),
          tglPOSTO: tgl.formatted,
          tglValid: tgl.valid,
          tglAmbiguous: tgl.ambiguous,
          Asal: String(mapped.Asal || "").trim(),
          Tujuan: String(mapped.Tujuan || "").trim(),
          Trans: String(mapped.Trans || "").trim(),
          Produk: String(mapped.Produk || "").trim(),
          Qty: parseQty(mapped.Qty),
          status: String(mapped.status || "1"),
          tglAkhir: tglAkhir.formatted,
          tglJatuhTempo: tglJatuhTempo.formatted,
          charter: String(mapped.charter || "0"),
          percepatan: mapped.percepatan ?? 0,
          gruptruk: String(mapped.idsumbu || mapped.GrupTruk || "0"),
          kapal: String(mapped.kapal || ""),
          distributor: String(mapped.distributor || ""),
        };
      });

      const invalidDateRows = rows.filter(r => r.noPOSTO && !r.tglValid);
      const validInitialRows = rows.filter(r => r.noPOSTO && r.tglValid && r.Trans && r.Produk);
      setParsedRows(validInitialRows);
      setAmbiguousCount(validInitialRows.filter(r => r.tglAmbiguous).length);

      if (invalidDateRows.length > 0) {
        const contoh = invalidDateRows.slice(0, 5).map(r => r.noPOSTO).join(", ");
        addToast({
          title: "Tanggal tidak valid",
          description: `${invalidDateRows.length} baris dilewati karena format tanggal tidak dikenali (No: ${contoh}${invalidDateRows.length > 5 ? ", ..." : ""}). Periksa kolom TglPOSTO pada file Excel.`,
          variant: "destructive"
        });
      }

      if (validInitialRows.length > 0 && selectedWilayah) {
        triggerValidation(validInitialRows, selectedWilayah);
      } else if (!selectedWilayah) {
        addToast({ title: "Peringatan", description: "Pilih wilayah terlebih dahulu", variant: "warning" });
      }
```

- [ ] **Step 4: Add the `ambiguousCount` state**

Next to the other `useState` declarations (`page.tsx:153`, after `summary`), add:

```ts
  const [summary, setSummary] = useState({ sukses: 0, gagal: 0 });
  const [ambiguousCount, setAmbiguousCount] = useState(0);
```

- [ ] **Step 5: Commit**

```bash
git add src/app/posto/upload/page.tsx
git commit -m "fix: use flexible date parser and report invalid dates in POSTO upload"
```

---

## Task 4: Surface ambiguous dates in the preview table

**Files:**
- Modify: `src/app/posto/upload/page.tsx`

- [ ] **Step 1: Add a "CEK TGL" badge next to ambiguous dates in the preview table**

In the table body, the Tanggal cell currently reads (`page.tsx:699-711`):

```tsx
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span>{item.tglpostoString}</span>
                                <div className="flex gap-1">
                                  {item.charter === "1" && (
                                    <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100 border-none text-[9px] px-1.5 py-0">CHARTER</Badge>
                                  )}
                                  {item.percepatan === 1 && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 border-none text-[9px] px-1.5 py-0">PERCEPATAN</Badge>
                                  )}
                                </div>
                              </div>
                            </td>
```

Replace it with (adds a badge driven by `parsedRows[idx]?.tglAmbiguous` — `parsedRows` and `validationResult.listposto` are built from and posted in the same order, index-aligned):

```tsx
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span>{item.tglpostoString}</span>
                                <div className="flex gap-1">
                                  {item.charter === "1" && (
                                    <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100 border-none text-[9px] px-1.5 py-0">CHARTER</Badge>
                                  )}
                                  {item.percepatan === 1 && (
                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100 border-none text-[9px] px-1.5 py-0">PERCEPATAN</Badge>
                                  )}
                                  {parsedRows[idx]?.tglAmbiguous && (
                                    <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 hover:bg-purple-100 border-none text-[9px] px-1.5 py-0">CEK TGL</Badge>
                                  )}
                                </div>
                              </div>
                            </td>
```

- [ ] **Step 2: Add a summary banner when there are ambiguous dates**

Directly below the existing "Peringatan Validasi" banner block (`page.tsx:779-787`, the `{validationResult && summary.gagal > 0 && (...)}` block), add a sibling block:

```tsx
          {validationResult && ambiguousCount > 0 && (
            <div className="p-4 bg-purple-50 border border-purple-100 dark:bg-purple-900/10 dark:border-purple-900/20 rounded-2xl flex gap-3">
              <Info className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-800 dark:text-purple-400">
                <p className="font-bold mb-1">Tanggal Perlu Dicek</p>
                <p>Terdapat {ambiguousCount} baris (ditandai <strong>CEK TGL</strong>) dengan format tanggal yang bisa dibaca dengan dua cara (hari/bulan sama-sama ≤ 12). Sistem membacanya sebagai Tanggal/Bulan/Tahun — pastikan ini sesuai maksud Anda sebelum menekan Simpan.</p>
              </div>
            </div>
          )}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/posto/upload/page.tsx
git commit -m "feat: flag ambiguous dates in POSTO upload preview"
```

---

## Task 5: Update the on-page guidance text

**Files:**
- Modify: `src/app/posto/upload/page.tsx`

- [ ] **Step 1: Update the "Ketentuan Upload" bullet about date format**

Current text (`page.tsx:582`):

```tsx
                  <li>Format tanggal harus sesuai kebutuhan sistem: <span className="text-red-500 font-bold">Tanggal/Bulan/Tahun</span> atau <span className="text-red-500 font-bold">Tahun/Bulan/Tanggal</span>. Format yang salah akan ditolak.</li>
```

Replace with:

```tsx
                  <li>Format tanggal yang didukung: <span className="text-red-500 font-bold">Tanggal/Bulan/Tahun</span> atau <span className="text-red-500 font-bold">Tahun/Bulan/Tanggal</span>. Jika Tanggal dan Bulan tertukar tapi salah satu angkanya &gt; 12, sistem otomatis mengoreksi urutannya. Jika kedua angka ≤ 12 (ambigu), baris akan ditandai <strong>CEK TGL</strong> pada tabel preview untuk diperiksa manual. Baris dengan tanggal yang sama sekali tidak valid akan dilewati dan dilaporkan lewat notifikasi.</li>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/posto/upload/page.tsx
git commit -m "docs: clarify flexible date handling in POSTO upload guidance"
```

---

## Task 6: Manual verification in the browser

**Files:** none (manual QA pass)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev:local` (or `npm run dev` if using the network backend) from `c:\Users\weka\Indigo\SISTROV2-next`.

- [ ] **Step 2: Build a test Excel file with three kinds of rows**

Using the "Template POSTO" download button on `/posto/upload`, edit the file to contain three rows with distinct `TglPOSTO` values:
1. `25/04/2026` — day > 12, unambiguous, should show as `25 April 2026` with no badge.
2. `04/25/2026` — swapped, still resolves to `25 April 2026` (auto-corrected), no badge.
3. `07/04/2026` — both ≤ 12, ambiguous, should show as `07 April 2026` WITH the `CEK TGL` badge, and the purple "Tanggal Perlu Dicek" banner should appear.
4. `31/13/2026` — both invalid (13 can't be a month), should NOT appear in the preview table at all; instead a red "Tanggal tidak valid" toast should appear naming that row's `NoPOSTO`.

- [ ] **Step 3: Upload the file, pick a Wilayah, and confirm the behavior above matches for all 4 rows**

- [ ] **Step 4: Confirm existing behavior still works — upload a file with only clean, unambiguous dates and confirm no badges/banners appear and submission still succeeds as before**

---

## Self-Review Notes

- **Spec coverage:** "bisa dibuat flexibel?" → Task 1/3 (auto-correct via >12 rule, real Date objects via `cellDates`). "tanggal dan bulan kebalik?" → Task 1's swap-correction branches + Task 2's self-check cases for `04/25/2026` / `25/04/2026`. "solusinya?" → Task 3 (no more silent drop, explicit toast) + Task 4 (ambiguous-row badge/banner) + Task 5 (updated on-page guidance).
- **No placeholders:** every step has literal code/commands to run.
- **Type consistency:** `ParsedTanggal` shape (`formatted`, `ambiguous`, `valid`) is defined once in Task 1 and used identically in Tasks 2–4; the local row shape (`tglPOSTO`, `tglValid`, `tglAmbiguous`) is defined once in Task 3 and consumed as-is in Task 4 (`parsedRows[idx]?.tglAmbiguous`).
- **Scope:** frontend-only. Backend (`sistropigroup`) already accepts `tglposto` in `yyyy/MM/dd` — untouched, since the fix guarantees that format or an empty (excluded) row, matching current contract.
