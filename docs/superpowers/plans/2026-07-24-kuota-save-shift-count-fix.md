# Kuota Schedule Save — Shift Count Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `POST /api/pod/kuota` (create) and `PUT /api/pod/kuota/[id]` (edit) so the shift `count` sent to the ASP.NET backend matches the active company's actual configured shift count, instead of always being `3`. This is the single root cause behind both symptoms reported on `/kuota/schedule/edit/[id]` and `/kuota/schedule/new`.

**Architecture:** `M_BagianDetail.tipe` (the per-area "type" column) is a category label — always one of `POALL` / `POCLUSTER` / `SOALL` / `SOCLUSTER` — never a numeric shift count. Both save routes compute `Number(b.tipe) || 3`, which is always `NaN || 3 = 3` because `tipe` is never numeric. The routes never read `bagianData.shift` (the real per-company `M_Shift` count that `/api/kuota/lookup` already correctly forwards to the browser as `shiftCount`), so the number of `Kuota4Shift` rows created/updated on save is always 3, regardless of the company's real shift count or what the Step 4 UI showed. The fix: stop deriving `count` from `tipe`, derive it from `bagianData.shift` instead — the same value the lookup route already extracts and the UI already renders by.

**Tech Stack:** Next.js 16 (App Router) API routes, ASP.NET Framework 4.5 backend (`sistropigroup`, unchanged — it already handles `count` 1/2/3 correctly on both insert and update). No test framework in this repo (verify via `npm run lint`, manual browser check, and a direct SQL read against the shared dev/staging DB).

---

## Root Cause (confirmed)

Confirmed by reading the current code in both repos and querying the live `SISTROSTAGING` database directly (`sqlcmd`, connection details in `sistropigroup/SISTROAWESOME/Web.config`):

- `M_BagianDetail.tipe` values across the whole table are **only** `POALL`, `POCLUSTER`, `SOALL`, `SOCLUSTER` — confirmed via `SELECT DISTINCT tipe FROM M_BagianDetail`. It is a category label, not a shift count.
- `M_Shift` (the real per-company shift count, queried by `KuotaController.DataBagian()` at `sistropigroup/SISTROAWESOME/api/KuotaController.cs:729` as `db.M_Shift.Where(x => x.company_code == myCompanyCode).Count()`) varies genuinely per company — confirmed several companies configured with exactly 1 shift (e.g. `B425`, `D243`, `CILACAP`, `BANJARMASIN2`, `MAKASAR2`, `PADIMAS`) and several with 3 (`PKG`, `PKGEX`, `MEDAN`, `LOMBOK`, `ROMO`, `F207`, ...).
- Bug site 1 — [src/app/api/pod/kuota/route.ts:34](../../../src/app/api/pod/kuota/route.ts#L34) (`POST`, create flow): `areaTipes[b.abbrev] = Number(b.tipe) || 3`. Since `b.tipe` is always a non-numeric string, `Number(b.tipe)` is always `NaN`, so this is always `3`. Used at [route.ts:79](../../../src/app/api/pod/kuota/route.ts#L79) as the `count` field sent to `POST /api/Kuota/AddWizard`.
- Bug site 2 (same defect) — [src/app/api/pod/kuota/[id]/route.ts:174](<../../../src/app/api/pod/kuota/[id]/route.ts#L174>) (`PUT`, edit flow): identical `areaTipes[b.abbrev] = Number(b.tipe) || 3`. Used at [[id]/route.ts:216](<../../../src/app/api/pod/kuota/[id]/route.ts#L216>) as the `count` field sent to `POST /api/Kuota/UpdateWizard`.
- The ASP.NET side (`KuotaController.cs` `AddWizard`/`UpdateWizard`/`insertKuotaShiftBaru`/`updateKuotaShiftBaru`) already branches correctly on `count` 1, 2, or 3 (confirmed by reading all three branches) — **it is never given the correct value**, so it always takes the `count == 3` branch: on create it inserts 3 `Kuota4Shift` rows per area (`shift2`/`shift3` = 0 since the UI never collected them); on edit it takes the "insert" sub-branch (because `idShift2`/`idShift3` read as `0`/missing) instead of "update", which **creates extra duplicate shift rows on every edit-save** of an area whose company is actually configured for fewer than 3 shifts.

**Why this also explains "can't save when filling Sales Order kuota":** "Sales Order" is not a separate code path — it's simply the area named `SO` / `SOALL` / `SOJATENG` / etc. (confirmed via `SELECT ... FROM M_BagianDetail WHERE keterengan LIKE '%Sales%'`; keterengan is literally `"Sales Order"` for most companies). It is saved through the exact same `count`-always-3 logic as every other area — no SO-specific code exists anywhere in `KuotaController.cs`'s `AddWizard`/`UpdateWizard` path (confirmed by grep). For a 1-shift company, filling SO's kuota and saving repeatedly (edit) drives the record into the duplicate-row state described above; on the next load, `GET /api/pod/kuota/[id]` (`src/app/api/pod/kuota/[id]/route.ts:108-116`) overwrites `shifts[uniqueId][sNum]` per row in DB-return order, so a duplicated shift row can make the previously-saved SO value appear to silently revert — this is what reads to a user as "still can't save."

This is a single defect with two symptoms. Fixing the `count` calculation in both routes fixes both.

**Known limitation (not fixed by this plan):** on companies where this bug has already run, `Kuota4Shift` may already contain orphaned junk rows (extra shift rows with `kuota = 0`) from past buggy saves. This fix stops new junk from being created and stops updating/reading the junk going forward (the edit wizard already trims displayed shift keys to the real `shiftCount` — see `src/app/kuota/schedule/edit/[id]/page.tsx:81-88`, from commit `2483a45`), but it does not retroactively delete existing orphaned rows. Flag this to the user as a possible follow-up data-cleanup task; out of scope here since the user only asked about the save behavior.

---

### Task 1: Fix the shift count sent by the create route

**Files:**
- Modify: `src/app/api/pod/kuota/route.ts`

- [ ] **Step 1: Replace the per-area `tipe`-derived count with the real company shift count**

Current code (lines 21-35):

```ts
    const { header, wilayah, areas, shifts } = await req.json()

    // Fetch area scopes from ASP.NET to map area abbrev -> wilayah abbrev
    const bagianRes = await fetch(`${ASPNET}/api/Kuota/DataBagian`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
    const bagianData = await bagianRes.json()
    const bagianList: any[] = Array.isArray(bagianData?.bagian) ? bagianData.bagian : Array.isArray(bagianData) ? bagianData : []

    const areaScopes: Record<string, string> = {}
    const areaTipes: Record<string, number> = {}
    for (const b of bagianList) {
      areaScopes[b.abbrev] = b.scope || ""
      areaTipes[b.abbrev] = Number(b.tipe) || 3
    }
```

Replace with:

```ts
    const { header, wilayah, areas, shifts } = await req.json()

    // Fetch area scopes from ASP.NET to map area abbrev -> wilayah abbrev
    const bagianRes = await fetch(`${ASPNET}/api/Kuota/DataBagian`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
    const bagianData = await bagianRes.json()
    const bagianList: any[] = Array.isArray(bagianData?.bagian) ? bagianData.bagian : Array.isArray(bagianData) ? bagianData : []

    // NOTE: M_BagianDetail.tipe is a category label (POALL/POCLUSTER/SOALL/SOCLUSTER),
    // never a shift count -- Number(tipe) is always NaN. The real per-company shift
    // count is bagianData.shift (same field /api/kuota/lookup forwards as shiftCount).
    const shiftCount = Math.max(1, Number(bagianData?.shift) || 0)
```

(Note: `areaScopes` is removed here because it was assigned but never read anywhere in this file — `bagianPayload` below already derives scope directly from the `uniqueId` split. Confirmed via `grep -n areaScopes src/app/api/pod/kuota/route.ts` returning only its own declaration/assignment.)

- [ ] **Step 2: Use the company-wide `shiftCount` in the shift payload**

Current code (lines 73-90):

```ts
    const shiftPayload = Object.entries(areas as Record<string, number>)
      .filter(([, kuota]) => Number(kuota) > 0)
      .map(([uniqueId]) => {
        let parts = uniqueId.split('::')
        const abbrev = parts.length > 1 ? parts.slice(1).join('::') : uniqueId
        const areaShifts = (shifts as Record<string, Record<number, number>>)[uniqueId] || {}
        const count = areaTipes[abbrev] || 3
        return {
          id_area: abbrev,
          count,
          idShift1: 0,
          idShift2: 0,
          idShift3: 0,
          shift1: Number(areaShifts[1]) || 0,
          shift2: Number(areaShifts[2]) || 0,
          shift3: Number(areaShifts[3]) || 0,
        }
      })
```

Replace with:

```ts
    const shiftPayload = Object.entries(areas as Record<string, number>)
      .filter(([, kuota]) => Number(kuota) > 0)
      .map(([uniqueId]) => {
        let parts = uniqueId.split('::')
        const abbrev = parts.length > 1 ? parts.slice(1).join('::') : uniqueId
        const areaShifts = (shifts as Record<string, Record<number, number>>)[uniqueId] || {}
        return {
          id_area: abbrev,
          count: shiftCount,
          idShift1: 0,
          idShift2: 0,
          idShift3: 0,
          shift1: Number(areaShifts[1]) || 0,
          shift2: Number(areaShifts[2]) || 0,
          shift3: Number(areaShifts[3]) || 0,
        }
      })
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run lint
```

Expected: no new errors in `src/app/api/pod/kuota/route.ts`. If TypeScript flags `areaTipes` or `areaScopes` as unused/undefined anywhere else in the file, that means a reference was missed — search the file again with `grep -n "areaTipes\|areaScopes" src/app/api/pod/kuota/route.ts` and remove/update it; there should be zero remaining references to either name after this step.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/pod/kuota/route.ts
git commit -m "fix(kuota): send real per-company shift count on create instead of always 3"
```

---

### Task 2: Fix the shift count sent by the edit route

**Files:**
- Modify: `src/app/api/pod/kuota/[id]/route.ts`

- [ ] **Step 1: Replace the per-area `tipe`-derived count with the real company shift count**

Current code (lines 159-175):

```ts
    const { header, wilayah, areas, shifts, _meta } = await req.json()
    const wilayahIds: Record<string, number> = _meta?.wilayahIds || {}
    const areaIds: Record<string, number> = _meta?.areaIds || {}
    const areaScopes: Record<string, string> = _meta?.areaScopes || {}
    const shiftNumericIds: Record<string, Record<string, number>> = _meta?.shiftNumericIds || {}
    const shiftCounts: Record<string, number> = _meta?.shiftCounts || {}

    // Fetch area scopes from ASP.NET to map area abbrev -> wilayah abbrev and tipe
    const bagianRes = await fetch(`${ASPNET}/api/Kuota/DataBagian`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
    const bagianData = await bagianRes.json()
    const bagianList: any[] = Array.isArray(bagianData?.bagian) ? bagianData.bagian : Array.isArray(bagianData) ? bagianData : []
    const areaTipes: Record<string, number> = {}
    for (const b of bagianList) {
      areaTipes[b.abbrev] = Number(b.tipe) || 3
    }
```

Replace with:

```ts
    const { header, wilayah, areas, shifts, _meta } = await req.json()
    const wilayahIds: Record<string, number> = _meta?.wilayahIds || {}
    const areaIds: Record<string, number> = _meta?.areaIds || {}
    const areaScopes: Record<string, string> = _meta?.areaScopes || {}
    const shiftNumericIds: Record<string, Record<string, number>> = _meta?.shiftNumericIds || {}

    // Fetch area scopes from ASP.NET to map area abbrev -> wilayah abbrev and tipe
    const bagianRes = await fetch(`${ASPNET}/api/Kuota/DataBagian`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
    const bagianData = await bagianRes.json()
    const bagianList: any[] = Array.isArray(bagianData?.bagian) ? bagianData.bagian : Array.isArray(bagianData) ? bagianData : []
    // NOTE: M_BagianDetail.tipe is a category label (POALL/POCLUSTER/SOALL/SOCLUSTER),
    // never a shift count -- Number(tipe) is always NaN. The real per-company shift
    // count is bagianData.shift (same field /api/kuota/lookup forwards as shiftCount).
    const shiftCount = Math.max(1, Number(bagianData?.shift) || 0)
```

(`shiftCounts` from `_meta` is removed here too — it was destructured but never read anywhere in this file, confirmed via `grep -n shiftCounts src/app/api/pod/kuota/[id]/route.ts` showing only its declaration. `areaScopes` here is a *different*, legitimately-used variable — sourced from `_meta`, consumed at line 208 — leave it untouched.)

- [ ] **Step 2: Use the company-wide `shiftCount` in the shift payload**

Current code (lines 213-229):

```ts
    const shiftPayload = Object.entries(areas as Record<string, number>).map(([uniqueId, kuota]) => {
      let parts = uniqueId.split('::')
      const abbrev = parts.length > 1 ? parts.slice(1).join('::') : uniqueId
      const count = areaTipes[abbrev] || 3
      const areaShifts = (shifts as Record<string, Record<number, number>>)[uniqueId] || {}
      const numericIds = shiftNumericIds[uniqueId] || {}
        return {
          id_area: abbrev,
          count,
          idShift1: numericIds["1"] || 0,
          idShift2: numericIds["2"] || 0,
          idShift3: numericIds["3"] || 0,
          shift1: Number(areaShifts[1]) || 0,
          shift2: Number(areaShifts[2]) || 0,
          shift3: Number(areaShifts[3]) || 0,
        }
      })
```

Replace with:

```ts
    const shiftPayload = Object.entries(areas as Record<string, number>).map(([uniqueId, kuota]) => {
      let parts = uniqueId.split('::')
      const abbrev = parts.length > 1 ? parts.slice(1).join('::') : uniqueId
      const areaShifts = (shifts as Record<string, Record<number, number>>)[uniqueId] || {}
      const numericIds = shiftNumericIds[uniqueId] || {}
        return {
          id_area: abbrev,
          count: shiftCount,
          idShift1: numericIds["1"] || 0,
          idShift2: numericIds["2"] || 0,
          idShift3: numericIds["3"] || 0,
          shift1: Number(areaShifts[1]) || 0,
          shift2: Number(areaShifts[2]) || 0,
          shift3: Number(areaShifts[3]) || 0,
        }
      })
```

- [ ] **Step 3: Type-check and lint**

```bash
npm run lint
```

Expected: no new errors in `src/app/api/pod/kuota/[id]/route.ts`. Confirm zero remaining references to `areaTipes` or `shiftCounts` with `grep -n "areaTipes\|shiftCounts" "src/app/api/pod/kuota/[id]/route.ts"`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/pod/kuota/[id]/route.ts"
git commit -m "fix(kuota): send real per-company shift count on edit instead of always 3"
```

---

### Task 3: Manual end-to-end verification (create + edit + Sales Order specifically)

No automated test framework exists in this repo (matches convention from the prior `2026-07-23-kuota-schedule-shift-count-fix.md` plan). Verify with the running dev server plus a direct read of the shared dev database.

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server if not already running**

```bash
npm run dev
```

- [ ] **Step 2: Create — verify a 1-shift company only writes 1 shift row per area, including Sales Order**

1. Log in as a user whose active company is one of the confirmed 1-shift companies (`B425`, `D243`, `CILACAP`, `BANJARMASIN2`, `MAKASAR2`, or `PADIMAS` — confirmed via `SELECT company_code, COUNT(*) FROM M_Shift GROUP BY company_code` against `SISTROSTAGING`).
2. Go to `/kuota/schedule/new`. Fill Step 1 (product, a tomorrow-or-later date, total tonase — e.g. `100`).
3. Step 2 (Moda): fill the single wilayah total to match (e.g. `100`).
4. Step 3 (Cluster): split the total across the company's areas, giving the area whose name is **"Sales Order"** a nonzero value (e.g. `40`), and the rest to the other area(s) (e.g. `POSTO` = `60`).
5. Step 4 (Shift): confirm exactly **one** shift input per area (this part was already fixed by the prior plan — if it shows 3 inputs, stop and re-check `src/app/kuota/schedule/new/page.tsx` before continuing). Fill Shift 1 with the full area amount for each area.
6. Click **Save Quota Schedule**. Expected: success toast, redirect to `/kuota/schedule`. This is the exact case the user reported as failing — confirm it now succeeds.
7. Verify in DB (replace `<COMPANY>`, `<DATE>` with what you used):

```bash
sqlcmd -S "192.168.188.29,7869" -U usr_sistro_dev -P 'Si$tr0@Pupuk1!_d3v' -d SISTROSTAGING -Q "SET NOCOUNT ON; SELECT kb.bagian, COUNT(ks.id) AS shift_rows, SUM(ks.kuota) AS total_kuota FROM Kuota1Header kh JOIN Kuota2Wilayah kw ON kw.level1=kh.id JOIN Kuota3Bagian kb ON kb.level2=kw.id JOIN Kuota4Shift ks ON ks.level3=kb.id WHERE kh.company_code='<COMPANY>' AND kh.tanggal='<DATE>' GROUP BY kb.bagian" -W -s"|"
```

Expected: `shift_rows = 1` for every `bagian` row (including the Sales Order one), not 3.

- [ ] **Step 3: Edit — verify saving again doesn't duplicate shift rows**

1. From `/kuota/schedule`, open the record just created for editing.
2. Confirm Step 4 shows exactly 1 shift input per area, pre-filled with the value just saved (including Sales Order's `40`).
3. Change the Sales Order amount to a different nonzero value (e.g. `50`, adjusting another area to keep totals balanced) and Save. Expected: success toast.
4. Re-run the same `sqlcmd` query from Step 2.7. Expected: `shift_rows` is **still 1** per area (not 2 — confirms the edit path updated the existing row instead of inserting a duplicate), and Sales Order's `total_kuota` reflects the new value (`50`).

- [ ] **Step 4: Regression check — a 3-shift company still gets 3 shift rows**

1. Log in as a user on a confirmed 3-shift company (`PKG`, `MEDAN`, `LOMBOK`, or `ROMO`).
2. Repeat Step 2 (create) with a product/date not already used by that company.
3. Confirm Step 4 shows 3 shift inputs per area, fill all three, save.
4. Re-run the `sqlcmd` query from Step 2.7 for that company/date. Expected: `shift_rows = 3` per area — confirms the fix didn't break the multi-shift case.

- [ ] **Step 5: If Sales Order save still fails after this fix**

If Step 2.6 or 3.3 still shows an error toast (rather than success), capture the exact `description` text shown in the toast (it comes straight from the ASP.NET response body via `data.error` in both routes) and treat it as a **new, separate** bug — the shift-count defect fixed in Tasks 1-2 was the only defect found in `AddWizard`/`UpdateWizard`/`insertKuotaShiftBaru`/`updateKuotaShiftBaru` after a full read of those methods and a DB audit of `M_BagianDetail`/`M_WilayahDetail`/`M_Shift`; a failure surviving this fix needs its own investigation starting from that exact error text rather than a repeat of this plan's hypothesis.

---

## Self-Review Notes

- **Spec coverage:** "kenapa saat save ada 3 shift padahal ada beberapa company plant yang mempunyai 1 shift saja" → Task 1 (create) fixes this directly, Task 3 Step 2 verifies it with a real DB row count. "ketika edit dan create masih tidak bisa save ketika mengisi kuota Sales order" → Task 2 (edit) fixes the same defect in the update path, which is what was corrupting/reverting Sales Order's saved value on repeated edits; Task 3 Steps 2-3 specifically exercise the Sales Order area on both create and edit.
- **Not guessed as fact:** the causal link from "always-3-shift bug" to "Sales Order specifically feels broken" is the strongest explanation found (no SO-specific code exists in the ASP.NET save path — confirmed by grep across the whole `sistropigroup` repo), but it wasn't reproduced live (no test credentials available in this session). Task 3 Step 5 exists specifically so this isn't silently assumed away if wrong.
- **Not in scope:** cleaning up already-orphaned junk `Kuota4Shift` rows created by past buggy saves (see "Known limitation" above); the ASP.NET backend (`sistropigroup`) needs no change — it already handles `count` 1/2/3 correctly, it was only ever being told the wrong number.
- **No test framework in repo** — verification is manual browser + `npm run lint` + direct SQL read, matching this codebase's existing convention (see prior `2026-07-23-kuota-schedule-shift-count-fix.md` plan).
