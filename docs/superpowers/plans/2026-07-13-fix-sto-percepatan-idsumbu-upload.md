# Fix STO Upload: Percepatan=1 and idSumbu Columns Not Read Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix POSTO/STO upload (`/posto/upload`) so `Percepatan=1` rows are correctly labeled/validated (not shown as "ZERO ODOL"), `idSumbu` values other than `0` are correctly read (not silently forced to `0`), and the "Daftar Jenis Truk & Sumbu" reference card shows the real `Id`/name/axle-ratio values from the `Sumbu` master table (`M_Sumbu`) instead of a hardcoded guess — so the Id a user types into the `idSumbu` column always matches what the card told them.

**Architecture:** Frontend-only changes in `SISTROV2-next`, entirely within `src/app/posto/upload/page.tsx`. No backend changes needed — the ASP.NET backend (`sistropigroup/SISTROAWESOME/Controllers/POSTOController.cs`, `api/SumbuController.cs`) already reads/persists `percepatan`/`gruptruk` correctly and already exposes the full `Sumbu` master list (`GET/POST api/Sumbu/DataTable`); the bugs are in how the Next.js page parses the uploaded Excel file, how it reads the server's validation response, and how it sources the reference card's data.

**Tech Stack:** Next.js 16 / React / TypeScript, `xlsx` (SheetJS) for client-side spreadsheet parsing.

**No test runner exists in this repo.** Verification steps use `rtk tsc --noEmit`, `rtk lint`, and manual checks against `npm run dev:local` with a real `.xlsx` file built from the sample data in this ticket.

---

## Root Cause Analysis (verified by reading source, not guessed)

Two independent, unrelated bugs both land on the same page (`src/app/posto/upload/page.tsx`) and together produce the reported symptom ("Percepatan=1 rows come out as ZERO ODOL, idSumbu is always read as 0"):

**Bug 1 — `idSumbu` column never read.**
`src/app/posto/upload/page.tsx:237` (current, uncommitted state):
```tsx
gruptruk: String(mapped.idsumbu || mapped.GrupTruk || "0"),
```
JS object property lookup is case-sensitive. The actual production template — confirmed by reading the real header row out of `public/template/TEMPLATE-POSTO-versi4.xlsx` with the `xlsx` package — is:
```
["NoPOSTO","TglPOSTO","Asal","Tujuan","Trans","Produk","Qty","status","tglakhir","tgljatuhtempo","charter","Percepatan","idSumbu"]
```
The header is `idSumbu` (capital S), which is neither `mapped.idsumbu` (all-lowercase) nor `mapped.GrupTruk`. Both lookups miss, so every row falls through to the `"0"` default — exactly the "idsumbu selain 0 ga kebaca (dianggap idsumbu = 0)" symptom, regardless of what value is actually in the column.

The legacy ASP.NET side already hit and fixed this same class of bug. `sistropigroup/SISTROAWESOME/Views/POSTO/ImportExcel.cshtml:411-416`:
```js
var GrupTruk = "";
var _rowKeys = Object.keys(XL_row_object[i]).reduce(function(acc, k) { acc[k.toLowerCase()] = k; return acc; }, {});
var _sumbuKey = _rowKeys["idsumbu"] || _rowKeys["gruptruk"];
if (_sumbuKey) {
    GrupTruk = XL_row_object[i][_sumbuKey];
}
```
It builds a case-insensitive map of the row's actual keys and looks up through that, so it doesn't matter whether the column is named `idSumbu`, `IDSUMBU`, or `idsumbu` in a given file. Task 1 ports this exact mechanism into the Next.js page.

**Bug 2 — `Percepatan=1` rows always render/validate as "ZERO ODOL".**
The `checkUpload` response's `percepatan` field is a C# `string` on the backend — confirmed in `sistropigroup/SISTROAWESOME/Models/POSTOView.cs:217` (`PostoImportCheckView.percepatan`) and `:700` in `Controllers/POSTOController.cs` (`arr.percepatan = d.percepatan;`, itself a `string` per `POSTOimportView.percepatan` at `POSTOView.cs:155`). Over JSON this arrives in the browser as the *string* `"1"` or `"0"`.

The Next.js page's `PostoImportCheckView` interface declares `percepatan: number` and compares with strict equality against the number `1` in three places:
- `src/app/posto/upload/page.tsx:318` — percepatan valid-date-window check inside `isRowError`
- `src/app/posto/upload/page.tsx:719` — the "PERCEPATAN" badge next to the date
- `src/app/posto/upload/page.tsx:768` — the "Mekanisme" column text ("PERCEPATAN" vs "ZERO ODOL")

`"1" === 1` is always `false` in JavaScript, so all three checks silently fail no matter what the row's real percepatan value is: the badge never shows, the column always reads "ZERO ODOL", and the percepatan valid-date-window validation at line 318 is never even run (so an out-of-window percepatan row is never flagged as an error either — a second, quieter consequence of the same bug).

The legacy ASP.NET side already handles this exact string/number ambiguity by checking both forms. `ImportExcel.cshtml:514` and `:756`:
```js
if (respon.listposto[i].Percepatan == "1" || respon.listposto[i].percepatan == 1) {
```
Task 2 ports the same "compare as text" fix into the Next.js page via a small shared helper.

---

## Task 1: Fix `idSumbu` column not being read on POSTO/STO upload

**Files:**
- Modify: `src/app/posto/upload/page.tsx:213-241` (the `rows.map` block inside `handleFileChange`)

- [ ] **Step 1: Add a case-insensitive column lookup for the sumbu column**

Current code (lines 213-241):
```tsx
      const rows = data.map((row: any) => {
        const isSO = !!(row.NoSO || row.TglSO);
        const mapped: any = { ...row };

        if (isSO) {
          if (!mapped.NoPOSTO) mapped.NoPOSTO = row.NoSO;
          if (!mapped.TglPOSTO) mapped.TglPOSTO = row.TglSO;
          if (!mapped.distributor) mapped.distributor = row.Trans;
          if (!mapped.Tujuan) mapped.Tujuan = row.Asal;
        }

        return {
          noPOSTO: String(mapped.NoPOSTO || "").trim(),
          tglPOSTO: formatTanggal(mapped.TglPOSTO),
          Asal: String(mapped.Asal || "").trim(),
          Tujuan: String(mapped.Tujuan || "").trim(),
          Trans: String(mapped.Trans || "").trim(),
          Produk: String(mapped.Produk || "").trim(),
          Qty: parseQty(mapped.Qty),
          status: String(mapped.status || mapped.Status || "1"),
          tglAkhir: formatTanggal(mapped.tglakhir || mapped.TglAkhir || mapped.TglPOSTO),
          tglJatuhTempo: formatTanggal(mapped.tgljatuhtempo || mapped.TglJatuhTempo || mapped.TglPOSTO),
          charter: String(mapped.charter || mapped.Charter || "0"),
          percepatan: Number(mapped.percepatan ?? mapped.Percepatan ?? 0),
          gruptruk: String(mapped.idsumbu || mapped.GrupTruk || "0"),
          kapal: String(mapped.kapal || mapped.Kapal || ""),
          distributor: String(mapped.distributor || mapped.Distributor || ""),
        };
      });
```

Replace with (adds a case-insensitive key map, mirroring `ImportExcel.cshtml`'s `_rowKeys`/`_sumbuKey` pattern, and uses it to resolve the sumbu column instead of the two hardcoded-case lookups):
```tsx
      const rows = data.map((row: any) => {
        const isSO = !!(row.NoSO || row.TglSO);
        const mapped: any = { ...row };

        if (isSO) {
          if (!mapped.NoPOSTO) mapped.NoPOSTO = row.NoSO;
          if (!mapped.TglPOSTO) mapped.TglPOSTO = row.TglSO;
          if (!mapped.distributor) mapped.distributor = row.Trans;
          if (!mapped.Tujuan) mapped.Tujuan = row.Asal;
        }

        // Excel header casing for the sumbu column varies by template revision
        // ("idSumbu", "IdSumbu", "GrupTruk", ...). Look it up case-insensitively
        // instead of hardcoding every casing variant — matches sistropigroup's
        // ImportExcel.cshtml (_rowKeys / _sumbuKey).
        const rowKeys: Record<string, string> = Object.keys(row).reduce((acc: Record<string, string>, k) => {
          acc[k.toLowerCase()] = k;
          return acc;
        }, {});
        const sumbuKey = rowKeys["idsumbu"] || rowKeys["gruptruk"];

        return {
          noPOSTO: String(mapped.NoPOSTO || "").trim(),
          tglPOSTO: formatTanggal(mapped.TglPOSTO),
          Asal: String(mapped.Asal || "").trim(),
          Tujuan: String(mapped.Tujuan || "").trim(),
          Trans: String(mapped.Trans || "").trim(),
          Produk: String(mapped.Produk || "").trim(),
          Qty: parseQty(mapped.Qty),
          status: String(mapped.status || mapped.Status || "1"),
          tglAkhir: formatTanggal(mapped.tglakhir || mapped.TglAkhir || mapped.TglPOSTO),
          tglJatuhTempo: formatTanggal(mapped.tgljatuhtempo || mapped.TglJatuhTempo || mapped.TglPOSTO),
          charter: String(mapped.charter || mapped.Charter || "0"),
          percepatan: Number(mapped.percepatan ?? mapped.Percepatan ?? 0),
          gruptruk: String(sumbuKey ? row[sumbuKey] : "0"),
          kapal: String(mapped.kapal || mapped.Kapal || ""),
          distributor: String(mapped.distributor || mapped.Distributor || ""),
        };
      });
```

- [ ] **Step 2: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 3: Manual verify**

Run `npm run dev:local`, open `/posto/upload`. Build a small `.xlsx` test file (Excel/LibreOffice, header row exactly `NoPOSTO, TglPOSTO, Asal, Tujuan, Trans, Produk, Qty, status, tglakhir, tgljatuhtempo, charter, Percepatan, idSumbu`) with a few rows using different `idSumbu` values (e.g. `0`, `1`, `5`, `11` — matching the ticket's sample data). Upload it, and in the validation preview table confirm the "Sumbu" column (last column) shows the actual value from the file for each row, not `0` for every row.

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/posto/upload/page.tsx
rtk git commit -m "fix: read idSumbu column case-insensitively on POSTO/STO upload"
```

---

## Task 2: Fix `Percepatan=1` rows rendering/validating as "ZERO ODOL"

**Files:**
- Modify: `src/app/posto/upload/page.tsx:65` (interface field type)
- Modify: `src/app/posto/upload/page.tsx:142-147` (add a shared helper next to `parseQty`)
- Modify: `src/app/posto/upload/page.tsx:318` (`isRowError` percepatan-window check)
- Modify: `src/app/posto/upload/page.tsx:719` (PERCEPATAN badge)
- Modify: `src/app/posto/upload/page.tsx:768` (Mekanisme column text)

- [ ] **Step 1: Correct the interface type**

Current code (line 65):
```tsx
  percepatan: number;       // 0 atau 1
```

Replace with:
```tsx
  percepatan: number | string; // backend (PostoImportCheckView.percepatan, C# string) mengirim "0"/"1" — gunakan isPercepatan()
```

- [ ] **Step 2: Add a shared comparison helper**

Current code (lines 142-147):
```tsx
function parseQty(val: any): string {
  if (val === undefined || val === null) return "0";
  let s = String(val).replace(/,/g, '.'); // Handle comma as decimal point
  const num = parseFloat(s);
  return isNaN(num) ? "0" : num.toString();
}
```

Replace with (adds `isPercepatan` right after `parseQty`):
```tsx
function parseQty(val: any): string {
  if (val === undefined || val === null) return "0";
  let s = String(val).replace(/,/g, '.'); // Handle comma as decimal point
  const num = parseFloat(s);
  return isNaN(num) ? "0" : num.toString();
}

// Backend's PostoImportCheckView.percepatan is a C# `string` ("0"/"1"), so it must be
// compared as text, not with strict equality against the number 1 — mirrors
// sistropigroup's ImportExcel.cshtml dual-form check (`Percepatan == "1" || percepatan == 1`).
function isPercepatan(value: number | string | undefined | null): boolean {
  return String(value ?? "") === "1";
}
```

- [ ] **Step 3: Fix the percepatan-window validation**

Current code (line 318, inside `isRowError`):
```tsx
    if (item.percepatan === 1 && item.validfrom && item.validto) {
```

Replace with:
```tsx
    if (isPercepatan(item.percepatan) && item.validfrom && item.validto) {
```

- [ ] **Step 4: Fix the PERCEPATAN badge**

Current code (line 719):
```tsx
                                  {item.percepatan === 1 && (
```

Replace with:
```tsx
                                  {isPercepatan(item.percepatan) && (
```

- [ ] **Step 5: Fix the Mekanisme column text**

Current code (line 768):
```tsx
                              {item.percepatan === 1 ? "PERCEPATAN" : "ZERO ODOL"}
```

Replace with:
```tsx
                              {isPercepatan(item.percepatan) ? "PERCEPATAN" : "ZERO ODOL"}
```

- [ ] **Step 6: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 7: Manual verify**

Using the same test `.xlsx` from Task 1 (or a new one), include rows with `Percepatan` set to `1` and rows set to `0`, with `TglPOSTO` inside the currently-configured percepatan valid date range (check `/superadmin/settings/percepatan` or `/armada/percepatan` for the active `validfrom`/`validto` window for the test company). Upload and confirm in the validation preview:
- Rows with `Percepatan=1` show the blue "PERCEPATAN" badge next to the date and "PERCEPATAN" in the Mekanisme column.
- Rows with `Percepatan=0` show neither the badge nor "PERCEPATAN" (Mekanisme column reads "ZERO ODOL").
- A `Percepatan=1` row with `TglPOSTO` outside the valid window is marked as an error (red row) — confirms the date-window check in `isRowError` is actually running now.

- [ ] **Step 8: Commit**

```bash
rtk git add src/app/posto/upload/page.tsx
rtk git commit -m "fix: compare Percepatan as string from backend on POSTO/STO upload"
```

---

## Task 3: Show real `Sumbu` master data (DB `Id`) in the "Daftar Jenis Truk & Sumbu" card

The upload page has an in-progress, **uncommitted** edit already sitting in the working tree (visible via `git diff`) that tries to replace the hardcoded 11-row truck/sumbu legend with live data, but it has two bugs: it fetches from an **admin-only** endpoint that most POSTO/STO uploaders (Staff/Transport/company users, not just SuperAdmin/TI/AdminSumbu/AdminArmada) will get a 401 from, and it maps the response fields backwards (truck name and axle-ratio string are swapped).

**Files:**
- Modify: `src/app/posto/upload/page.tsx:153` (hook destructure)
- Modify: `src/app/posto/upload/page.tsx:197-207` (`fetchSumbu`)
- Modify: `src/app/posto/upload/page.tsx:211` (effect deps)
- Modify: `src/app/posto/upload/page.tsx:629` (field mapping in the card render)

- [ ] **Step 1: Pull in `apiTable` from the existing `useApi()` hook**

Current code (line 153):
```tsx
  const { apiJson, apiFetch, token } = useApi();
```

Replace with:
```tsx
  const { apiJson, apiFetch, apiTable, token } = useApi();
```
(`apiTable`, defined in `src/hooks/use-api.ts:62-103`, already exists specifically for calling ASP.NET DataTables-style endpoints straight from the client through the `/aspnet-proxy` rewrite — same auth model as every other master-data lookup already on this page, e.g. `/api/Wilayah/DataMappingPOSTO`. No new backend or Next.js API route is needed.)

- [ ] **Step 2: Fetch the real `Sumbu` list instead of the admin-only route**

Current code (lines 197-207):
```tsx
    const fetchSumbu = async () => {
      try {
        const res = await fetch('/api/admin/sumbu');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) setSumbuOptions(json.data);
        }
      } catch (err) {
        console.error("Failed to load sumbu", err);
      }
    };
```

Replace with (calls `api/Sumbu/DataTable` on the ASP.NET backend directly — the same endpoint `src/app/api/admin/sumbu/route.ts` proxies for the admin CRUD page, confirmed in `sistropigroup/SISTROAWESOME/api/SumbuController.cs:24-84` to return every `Sumbu` row unfiltered, ordered by `Id`, with no role restriction on the backend side):
```tsx
    const fetchSumbu = async () => {
      try {
        const res = await apiTable('/api/Sumbu/DataTable', {
          start: 0,
          length: 200,
          order: [{ column: 0, dir: "asc" }],
          columns: [{ data: "Id", name: "Id", searchable: "true", orderable: "true", search: { value: "", regex: "false" } }],
        });
        if (Array.isArray(res?.data)) setSumbuOptions(res.data);
      } catch (err) {
        console.error("Failed to load sumbu", err);
      }
    };
```

- [ ] **Step 3: Update the effect's dependency array**

Current code (line 211):
```tsx
  }, [apiJson, token]);
```

Replace with:
```tsx
  }, [apiJson, apiTable, token]);
```

- [ ] **Step 4: Fix the swapped field mapping in the card**

Current code (line 629) — this reads the *axle-ratio string* field (`nama`, e.g. `"1.2"`) into the name slot and the *payload-capacity number* field (`muatan`, e.g. `8000`) into the ratio-badge slot, backwards from what the `Sumbu` table actually stores (confirmed against `sistropigroup/SISTROAWESOME/BDO/Sumbu.cs:23-30`: `jenistruk` = truck type name, `nama` = axle-ratio string like `"1.2"`, `muatan` = decimal capacity — and against the legacy reference card in `ImportExcel.cshtml:196-199`, which renders `item.jenistruk` as the name and `item.nama` as the badge):
```tsx
                  {(sumbuOptions.length > 0 ? sumbuOptions.map((t: any) => ({ n: t.nama, s: t.muatan, id: t.Id })) : [
```

Replace with:
```tsx
                  {(sumbuOptions.length > 0 ? sumbuOptions.map((t: any) => ({ n: t.jenistruk, s: t.nama, id: t.Id })) : [
```

(the hardcoded fallback array below this line stays as-is — it only renders when the fetch above hasn't populated `sumbuOptions` yet, e.g. first paint or if the backend call fails)

- [ ] **Step 5: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 6: Manual verify**

Run `npm run dev:local`, log in as a **non-admin** role that can upload POSTO/STO (e.g. Staff or a company/transport user — not SuperAdmin/TI/AdminSumbu/AdminArmada), open `/posto/upload`. In the "Daftar Jenis Truk & Sumbu" card, confirm:
- It shows real truck type names (e.g. "Colt Diesel (CDD)") with their axle-ratio badge (e.g. "1.2") — not blank, not swapped.
- Open browser devtools Network tab, find the `api/Sumbu/DataTable` request — confirm it returns `200` (not `401`) for this non-admin user.
- Cross-check one row's `Id` (visible via the `{t.id}.` prefix in the list) against the actual `Sumbu` table (ask a SuperAdmin/TI user to check `/admin/sumbu` or query the DB directly) to confirm the `Id` shown really is the value to type into the `idSumbu` upload column.
- If the aspnet-proxy is unreachable, confirm the card still falls back to the static list rather than rendering empty (regression check on the existing fallback behavior).

- [ ] **Step 7: Commit**

```bash
rtk git add src/app/posto/upload/page.tsx
rtk git commit -m "fix: load real Sumbu master data for the upload page's truck/sumbu legend"
```

---

## Task 4: End-to-end verification with the exact ticket data

**Files:** none (verification only)

- [ ] **Step 1: Build the exact test file from the ticket**

Create an `.xlsx` file with header row `NoPOSTO, TglPOSTO, Asal, Tujuan, Trans, Produk, Qty, status, tglakhir, tgljatuhtempo, charter, Percepatan, idSumbu` and the 24 data rows from the ticket (`NoPOSTO` `5120001234`–`5120001257`, all dated `13/07/2026`, `Percepatan` alternating `0` then `1` per block of 12, `idSumbu` cycling `0`–`11`).

- [ ] **Step 2: Upload and inspect the preview table**

Run `npm run dev:local`, open `/posto/upload`, select the wilayah the test transportir/gudang codes belong to, upload the file. In the preview table, confirm:
- The 12 rows with `Percepatan=0` show "ZERO ODOL" and `idSumbu` values `0` through `11` in the Sumbu column (not all `0`).
- The 12 rows with `Percepatan=1` show the "PERCEPATAN" badge/label and their own `idSumbu` values `0` through `11` (not all `0`).
- Cross-check the `idSumbu` values `0`-`11` used in the test file against the `Id` column shown in the "Daftar Jenis Truk & Sumbu" card (Task 3) — confirm the values line up with real rows in the `Sumbu` table, not an arbitrary 0-11 range that happens to not exist in the DB.
- (Expect these specific rows to still fail other validation checks unrelated to this fix — e.g. `Trans` code `9999999999` and `Asal`/`Tujuan` codes not existing in the test company's master data — that's correct behavior, not a regression; only the Percepatan/idSumbu columns are in scope here.)

- [ ] **Step 3: No commit** — this task only confirms Tasks 1-3 together against the real reported data; nothing to commit.

---

## Self-Review Notes

- Coverage: "STO percepatan 1 ... ga kebaca (dianggap zero odol)" → Task 2. "idsumbu selain 0 ga kebaca (dianggap idsumbu = 0)" → Task 1. "cek di kode sistropigroup, samakan yang disana" → Tasks 1 and 2 explicitly port the exact mechanism already present in `sistropigroup/SISTROAWESOME/Views/POSTO/ImportExcel.cshtml` (case-insensitive `_rowKeys`/`_sumbuKey` lookup for Task 1; dual string/number `Percepatan == "1" || percepatan == 1` check for Task 2). "gunakan id sumbu yang sudah tertera di db di M_Sumbu" / "data ini real dari db" → Task 3, sourcing the reference card from the real `Sumbu` table via the already-existing `api/Sumbu/DataTable` endpoint instead of a hardcoded/guessed array. Task 4 verifies all three together against the literal sample data from the ticket.
- No backend changes are needed anywhere in this plan: `sistropigroup/SISTROAWESOME/Controllers/POSTOController.cs` (`checkUpload:553`, `SimpanUpload:977`) already reads and persists `percepatan`/`gruptruk` correctly once the frontend sends/interprets them correctly — confirmed by reading `posto.Percepatan = d.percepatan;` / `posto.IdGrupTruk = d.gruptruk;` at lines 1027-1028. `api/SumbuController.cs`'s `DataTable()` action already returns the full unfiltered `Sumbu` master list with no role restriction — confirmed by reading the action body directly.
- Task 3 fixes an **uncommitted, in-progress** edit already present in the working tree (`git diff` on `page.tsx` shows a partial `sumbuOptions`/`fetchSumbu` addition before this plan was written) rather than the file's last-committed state — the "current code" snippets in Task 3 reflect what's on disk right now, not `HEAD`.
- All three fixes are scoped to `src/app/posto/upload/page.tsx` only, in non-overlapping regions (Task 1: the `rows.map` Excel-parsing block; Task 2: `isRowError` + two render sites + one helper; Task 3: the sumbu-fetch effect + one render line) — safe to execute as three subagents in parallel, but review the merge together since it's one file, and the implementer for each task should re-read the current file state first since Task 3 in particular starts from an already-dirty baseline.
