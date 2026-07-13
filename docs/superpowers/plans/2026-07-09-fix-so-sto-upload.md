# Fix SO/STO Upload & Template QA Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 QA findings on POSTO/SO/STO upload: dates failing to parse on upload despite matching format, an outdated SO template, a missing "Tambah SO" button on the Data SO page, and the Wilayah selector not defaulting the way QA expects.

**Architecture:** Frontend-only changes in `SISTROV2-next`, all within `src/app/posto/**`. No backend changes needed for this cluster.

**Tech Stack:** Next.js 16 / React / TypeScript, `xlsx` (SheetJS) for client-side spreadsheet parsing/generation.

**No test runner exists in this repo.** Verification steps use `rtk tsc --noEmit`, `rtk lint`, and manual checks against `npm run dev:local` with real `.xlsx` files.

---

## Task 1: Fix dates not being read on POSTO/SO/STO upload

QA finding #6: "seluruh tanggal ga kebaca padahal format udh sesuai (kalo upload ke sistro dev bisa kebaca)" — dates aren't read even though the format matches, but the same file works on the dev environment.

Investigation found the root cause in `src/app/posto/upload/page.tsx`. The file-parsing call:
```tsx
const wb = XLSX.read(bstr, { type: 'array', raw: false });
...
const data = XLSX.utils.sheet_to_json(ws);
```
passes `raw: false` to `XLSX.read()` — but `raw` is not a valid option for `XLSX.read()`, it's an option for `XLSX.utils.sheet_to_json()`. Since it's on the wrong call, it's silently ignored, and `sheet_to_json(ws)` (with no options) defaults to `raw: true`. For any Excel cell that's formatted as a real **Date** type (not plain text), this returns the cell's raw serial-number value (e.g. `46020`) instead of a formatted date string. `formatTanggal()` (lines 94-129) only recognizes `dd/MM/yyyy`/`yyyy/MM/dd`-style string patterns via regex — a bare serial number like `"46020"` matches neither pattern, falls through to `new Date("46020")` (invalid), and is returned **unchanged** as `"46020"`, which is then sent to the backend as the date value — i.e. it silently fails exactly as QA describes. A file where every date cell happens to be plain text (not Excel Date-formatted) wouldn't hit this, which is consistent with QA saying it works on "sistro dev" (likely a build/version where the source files or parsing path differed).

Fix: pass `raw: false` to the correct call (`sheet_to_json`) so SheetJS returns each cell's *formatted display string* (respecting the cell's own number format) instead of the raw serial number. Also add a numeric-serial fallback inside `formatTanggal` so a raw Excel date serial is still handled correctly even if it slips through (e.g. from a differently-configured sheet).

**Files:**
- Modify: `src/app/posto/upload/page.tsx:94-129` (`formatTanggal`)
- Modify: `src/app/posto/upload/page.tsx:187, 190` (parse call)

- [ ] **Step 1: Fix the `sheet_to_json` call**

Current code (lines 186-190):
```tsx
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'array', raw: false });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
```

Replace with:
```tsx
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'array', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { raw: false });
```
(`cellDates: true` on `XLSX.read` makes SheetJS parse genuine Excel Date cells into JS `Date` objects internally, and `raw: false` on `sheet_to_json` makes it emit each cell's formatted string — the combination covers both a cell typed as Date and a cell typed as plain text/number consistently)

- [ ] **Step 2: Add a numeric Excel-serial fallback to `formatTanggal`**

Current code (lines 94-129):
```tsx
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

Replace with (adds a branch at the top for `Date` objects — which can now occur since `cellDates: true` was added in Step 1 — and a branch for a bare numeric Excel serial as a defensive fallback):
```tsx
function formatTanggal(str: any): string {
  if (!str) return "";

  // A genuine JS Date object (from XLSX cellDates: true)
  if (str instanceof Date && !isNaN(str.getTime())) {
    const year = str.getFullYear();
    const month = String(str.getMonth() + 1).padStart(2, '0');
    const day = String(str.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  const s = String(str).trim();

  // A bare Excel date serial number that slipped through as a string (e.g. "46020")
  if (/^\d{4,6}$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) {
      const parsed = XLSX.SSF.parse_date_code(serial);
      if (parsed) {
        return `${parsed.y}/${String(parsed.m).padStart(2, '0')}/${String(parsed.d).padStart(2, '0')}`;
      }
    }
  }

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
(the `20000 < serial < 80000` bound roughly covers Excel serial dates from 1954 to 2119, so a genuine 4-6 digit code like a booking number that happens to be numeric won't be misread — it's a heuristic guard, not exact validation)

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Run `npm run dev:local`, open `/posto/upload`, create a test `.xlsx` file in Excel/LibreOffice where the `TglPOSTO`/`TglSO` column cells are genuinely formatted as **Date** type (not plain text) — this is the case that previously broke — upload it, and confirm the parsed date shows correctly in the validation preview table (not a 5-digit number, not blank). Then repeat with a file where the date column is plain text (e.g. typed as `2026/04/07`) to confirm the existing working case still works (regression check).

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/posto/upload/page.tsx
rtk git commit -m "fix: correctly parse Excel date cells on POSTO/SO/STO upload"
```

---

## Task 2: Update the SO template to match production (TEMPLATE-SO V3)

QA finding #5: "template SO disesuaikan dengan prod saat ini (TEMPLATE-SO V3)" — the downloadable SO template should match the current production `TEMPLATE-SO V3` file.

Investigation found the template is generated client-side in `src/app/posto/upload/page.tsx`, `handleDownloadTemplate` (lines 395-414):
```tsx
    } else {
      headers = ["NoSO", "TglSO", "Asal", "Trans", "Produk", "Qty", "status", "tglakhir", "tgljatuhtempo", "charter", "percepatan", "idsumbu"];
      sample = ["5320069457", "2026/04/07", "D205", "1000000859", "1000036", "150", "1", "2026/04/18", "2026/04/18", "0", "0", "0"];
      filename = "Template_SO.xlsx";
    }
```

**This task cannot be completed from static code alone** — no copy of the production `TEMPLATE-SO V3` file exists anywhere in this repo (confirmed: `find . -iname "*template*so*"` returns nothing). The exact column set QA wants is an external artifact only the QA reporter or the production system has. Do not guess at column names.

**Files:**
- Modify: `src/app/posto/upload/page.tsx:395-414` (`handleDownloadTemplate`)
- Modify (only if columns change): `src/app/posto/upload/page.tsx:190-226` (the `rows.map` block that reads `row.NoSO`/`row.TglSO`/etc. from uploaded files — it must recognize whatever column names TEMPLATE-SO V3 actually uses)

- [ ] **Step 1: Obtain the reference file**

Before writing any code, get the actual `TEMPLATE-SO V3` `.xlsx` file from the QA reporter or the production SISTRO system (whoever raised this finding should be able to attach it, or point to where it's downloaded from in production). Save it to `docs/superpowers/plans/reference/TEMPLATE-SO-V3.xlsx` in this repo so the diff is reproducible and reviewable in the PR.

- [ ] **Step 2: Diff column headers**

Open the reference file's header row and list every column name in order. Compare against the current array:
```
["NoSO", "TglSO", "Asal", "Trans", "Produk", "Qty", "status", "tglakhir", "tgljatuhtempo", "charter", "percepatan", "idsumbu"]
```
Note every column that's missing, renamed, reordered, or removed.

- [ ] **Step 3: Update the template headers/sample**

In `handleDownloadTemplate`, update the `headers` and `sample` arrays for the `SO` branch (and the `POSTO`/STO branch too if the reference file shows the STO template changed as well — QA's note "upload so/sto juga sama" in finding #6 suggests STO shares the same page/logic) to match the reference file exactly, column-for-column, in the same order.

- [ ] **Step 4: Update the upload parser to match, if columns were renamed**

If Step 3 renamed or added columns (not just reordered), update the `rows.map` block (lines ~192-226) that reads `row.NoSO`, `row.TglSO`, etc. by property name from the parsed spreadsheet — every renamed column must be read under its new name, and any newly added column needs a corresponding field added to the `PostoImportCheckView` interface (lines 37-90) and wired into whatever payload gets sent to `triggerValidation`/the submit call, matching how the existing fields are handled.

- [ ] **Step 5: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 6: Manual verify**

Download the template via the "Template SO" button on `/posto/upload`, open it, and confirm the headers exactly match the reference `TEMPLATE-SO-V3.xlsx`. Fill in a sample row using the new template and confirm it uploads and validates successfully end-to-end.

- [ ] **Step 7: Commit**

```bash
rtk git add src/app/posto/upload/page.tsx docs/superpowers/plans/reference/TEMPLATE-SO-V3.xlsx
rtk git commit -m "fix: update SO template columns to match production TEMPLATE-SO V3"
```

---

## Task 3: Add "Tambah SO" button to the Data SO page

QA finding #7: "menu Data SO = tambahin tombol Tambah SO kyk di STO" — the Data SO page should have an add button like the POSTO/STO list page does.

Investigation found `src/app/posto/page.tsx` (the POSTO list) already has a working "New POSTO" button (lines 474-479) that links to `/posto/upload`, gated behind `!isRekanan`. `src/app/posto/so/page.tsx` (Data SO) has the same `isRekanan` role check already defined (line 30) but no equivalent button in its toolbar (lines 335-375).

**Files:**
- Modify: `src/app/posto/so/page.tsx:3-6` (import), `:355-372` (toolbar)

- [ ] **Step 1: Add the `Plus` icon import**

Change:
```tsx
import {
  Eye, Trash2, Calendar, Package, Ticket,
  TrendingDown, TrendingUp, Scissors, Ship,
} from "lucide-react";
```
to:
```tsx
import {
  Eye, Trash2, Calendar, Package, Ticket,
  TrendingDown, TrendingUp, Scissors, Ship, Plus,
} from "lucide-react";
```

- [ ] **Step 2: Add the button to the toolbar**

Current code (lines 355-372):
```tsx
            toolbar={
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <Input
                    type="date"
                    className="h-8 w-40 text-xs"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                  {dateFilter && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500" onClick={() => setDateFilter("")}>
                      ✕
                    </Button>
                  )}
                </div>
              </div>
            }
```

Replace with:
```tsx
            toolbar={
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <Input
                    type="date"
                    className="h-8 w-40 text-xs"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                  {dateFilter && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500" onClick={() => setDateFilter("")}>
                      ✕
                    </Button>
                  )}
                </div>
                {!isRekanan && (
                  <Button size="sm" onClick={() => (window.location.href = "/posto/upload")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah SO
                  </Button>
                )}
              </div>
            }
```

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Open `/posto/so` as a non-rekanan user, confirm a "Tambah SO" button now appears next to the date filter and navigates to `/posto/upload`. Log in as a `rekanan`/`transport`-role user and confirm the button is hidden, matching the POSTO page's existing behavior.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/posto/so/page.tsx
rtk git commit -m "feat: add Tambah SO button to Data SO page"
```

---

## Task 4: Default the Wilayah selector to "Truk ke GP"

QA finding #9: "menu upload posto/so = wilayahnya by default langsung truk ke gp" — the Wilayah dropdown should default to "Truk ke GP" instead of the current blank "-- Pilih Wilayah --" placeholder.

Investigation found `src/app/posto/upload/page.tsx`: `selectedWilayah` starts at `""` (line 146) and is populated from `/api/Wilayah/DataMappingPOSTO` (or the `DataForMapping` fallback) into `wilayahOptions` (`{ abbrev, keterangan }[]`, lines 158-174) — there's no logic anywhere that pre-selects an option. The exact `abbrev` code for "Truk ke GP" isn't hardcoded anywhere reliable in this repo (a similar-looking code, `"DW1_GP"`, appears in an unrelated file, `src/app/security/print/page.tsx:101`, mapping to display text `"TRUK KE GP"` — don't assume that's the same code without confirming against the real `wilayahOptions` API response). Match by the human-readable `keterangan` text instead, which is more robust to an unconfirmed code.

**Files:**
- Modify: `src/app/posto/upload/page.tsx:158-174`

- [ ] **Step 1: Confirm the real option label**

Run `npm run dev:local`, open `/posto/upload`, open browser devtools Network tab, find the response from `/api/Wilayah/DataMappingPOSTO` (or `DataForMapping`), and note the exact `keterangan` string for the "Truk ke GP" entry (it may be exactly "Truk ke GP", "TRUK KE GP", or something close — confirm before hardcoding a match).

- [ ] **Step 2: Auto-select it once options load**

Current code (lines 158-174):
```tsx
  // Load Wilayah Options
  useEffect(() => {
    if (!token) return;
    const fetchWilayah = async () => {
      try {
        let data = await apiJson('/api/Wilayah/DataMappingPOSTO');
        // Fallback to all regions if DataMappingPOSTO returns empty list (e.g. for SuperAdmin/TI or unmapped scopes)
        if (Array.isArray(data) && data.length === 0) {
          data = await apiJson('/api/Wilayah/DataForMapping');
        }
        if (Array.isArray(data)) setWilayahOptions(data);
      } catch (err) {
        console.error("Failed to load wilayah options", err);
      }
    };
    fetchWilayah();
  }, [apiJson, token]);
```

Replace with (matching case-insensitively on `keterangan` so exact casing from Step 1 doesn't matter, and only auto-selecting if nothing has been picked yet so it never overrides a user's manual choice):
```tsx
  // Load Wilayah Options
  useEffect(() => {
    if (!token) return;
    const fetchWilayah = async () => {
      try {
        let data = await apiJson('/api/Wilayah/DataMappingPOSTO');
        // Fallback to all regions if DataMappingPOSTO returns empty list (e.g. for SuperAdmin/TI or unmapped scopes)
        if (Array.isArray(data) && data.length === 0) {
          data = await apiJson('/api/Wilayah/DataForMapping');
        }
        if (Array.isArray(data)) {
          setWilayahOptions(data);
          const defaultOption = data.find((opt: { abbrev: string; keterangan: string }) =>
            opt.keterangan?.toLowerCase().includes("truk ke gp")
          );
          if (defaultOption) {
            setSelectedWilayah((current) => current || defaultOption.abbrev);
          }
        }
      } catch (err) {
        console.error("Failed to load wilayah options", err);
      }
    };
    fetchWilayah();
  }, [apiJson, token]);
```
(replace `"truk ke gp"` in the `.includes(...)` check with whatever exact substring you confirmed in Step 1, lowercased)

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Open `/posto/upload` fresh (no prior selection) and confirm the Wilayah dropdown now shows "Truk ke GP" selected by default instead of the blank placeholder. Manually change it to a different wilayah and confirm the selection sticks (the default-select logic doesn't fight the user's choice).

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/posto/upload/page.tsx
rtk git commit -m "fix: default Wilayah selector to 'Truk ke GP' on POSTO/SO upload"
```

---

## Self-Review Notes

- Coverage: Task 1 → #6, Task 2 → #5, Task 3 → #7, Task 4 → #9. All 4 items in this cluster covered.
- Task 2 is explicitly blocked on an external file (the real `TEMPLATE-SO V3`) that isn't in this repo — flagged rather than guessed at, per the finding's own wording ("disesuaikan dengan prod saat ini").
- Tasks 1 and 4 both touch `src/app/posto/upload/page.tsx` in different, non-overlapping regions (parsing logic vs. wilayah `useEffect`) — safe for two subagents to run in parallel, but the final merge should be reviewed together since they're the same file.
