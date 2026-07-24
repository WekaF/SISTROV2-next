# Kuota Schedule Wizard — Dynamic Shift Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `/kuota/schedule/new` (and its twin `/kuota/schedule/edit/[id]`) so Step 4 "Shift Breakdown" renders the number of shift inputs the active company actually has configured, instead of a hardcoded 3.

**Architecture:** The ASP.NET backend (`sistropigroup`) already computes the correct per-company shift count in `KuotaController.DataBagian()` (`shift = db.M_Shift.Where(x => x.company_code == myCompanyCode).Count()`), but the Next.js lookup proxy (`src/app/api/kuota/lookup/route.ts`) discards that field before it reaches the browser. Both wizard pages then hardcode `[1, 2, 3].map(...)` for the shift inputs. The fix threads the real count through the proxy and renders that many inputs in both wizards.

**Tech Stack:** Next.js 16 (App Router), React client components, no test framework in this repo (verify via `npm run lint`, `next build` type-check, and manual browser check per project convention).

---

## Root Cause (confirmed)

- Backend: `M_Shift` is a **per-company** master table (`sistropigroup/SISTROAWESOME/api/ShiftController.cs`), each row has `level` (shift number), `keterangan` (e.g. "Shift 1"), `scope`, `starttime`, `endtime`. A company like "Sumbariu" that only has one `M_Shift` row legitimately has 1 shift.
- Backend already exposes the count: `sistropigroup/SISTROAWESOME/api/KuotaController.cs:713-736` (`DataBagian()`) returns `{ bagian: [...], shift: <count> }`.
- Bug site 1: [src/app/api/kuota/lookup/route.ts:35](../../../src/app/api/kuota/lookup/route.ts#L35) reads `bagianData.bagian` but never reads `bagianData.shift` — the count is dropped.
- Bug site 2: [src/app/kuota/schedule/new/page.tsx:406](../../../src/app/kuota/schedule/new/page.tsx#L406) — `{[1, 2, 3].map(sNum => (...` hardcodes 3 shift inputs regardless of company.
- Bug site 3 (duplicate): [src/app/kuota/schedule/edit/[id]/page.tsx:420](../../../src/app/kuota/schedule/edit/[id]/page.tsx#L420) — identical hardcode, same wizard copy-pasted for the edit flow.

All three sites must be fixed together — fixing only `new/page.tsx` would leave `edit/[id]/page.tsx` still showing 3 boxes for a 1-shift company.

---

### Task 1: Forward the real shift count through the lookup API

**Files:**
- Modify: `src/app/api/kuota/lookup/route.ts:27-46`

- [ ] **Step 1: Edit the response parsing to include `shiftCount`**

Current code (lines 27-46):

```ts
    const products = Array.isArray(produkData)
      ? produkData.map((p: any) => ({ id: String(p.ID ?? p.id ?? ""), name: p.Nama ?? p.nama ?? "" }))
      : []

    const wilayah = Array.isArray(wilayahData)
      ? wilayahData.map((w: any) => ({ id: w.abbrev ?? "", name: w.keterangan ?? "" }))
      : []

    const bagianList = Array.isArray(bagianData?.bagian) ? bagianData.bagian : Array.isArray(bagianData) ? bagianData : []
    const areas = bagianList.map((a: any) => ({
      id: a.abbrev ?? "",
      name: a.keterangan ?? "",
      wilayahId: a.scope ?? "",
    }))

    return NextResponse.json({ success: true, products, wilayah, areas })
```

Replace with:

```ts
    const products = Array.isArray(produkData)
      ? produkData.map((p: any) => ({ id: String(p.ID ?? p.id ?? ""), name: p.Nama ?? p.nama ?? "" }))
      : []

    const wilayah = Array.isArray(wilayahData)
      ? wilayahData.map((w: any) => ({ id: w.abbrev ?? "", name: w.keterangan ?? "" }))
      : []

    const bagianList = Array.isArray(bagianData?.bagian) ? bagianData.bagian : Array.isArray(bagianData) ? bagianData : []
    const areas = bagianList.map((a: any) => ({
      id: a.abbrev ?? "",
      name: a.keterangan ?? "",
      wilayahId: a.scope ?? "",
    }))

    // DataBagian also returns the per-company M_Shift count (see
    // sistropigroup/SISTROAWESOME/api/KuotaController.cs DataBagian()).
    // This is how many shift slots the active company actually has configured.
    const shiftCount = Number(bagianData?.shift) || 0

    return NextResponse.json({ success: true, products, wilayah, areas, shiftCount })
```

- [ ] **Step 2: Verify the field reaches the browser**

Run `npm run dev`, log in, open DevTools → Network, navigate to `/kuota/schedule/new`, and inspect the response body of the `GET /api/kuota/lookup` request.
Expected: JSON body contains a `shiftCount` field with a positive integer (e.g. `1` for a single-shift company, `3` for a three-shift company). If it is `0` or missing, the ASP.NET backend's `bagianData.shift` field name has drifted — re-check `KuotaController.cs` before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/kuota/lookup/route.ts
git commit -m "fix(kuota): forward per-company shift count from lookup API"
```

---

### Task 2: Render dynamic shift inputs in the "New Quota" wizard

**Files:**
- Modify: `src/app/kuota/schedule/new/page.tsx`

- [ ] **Step 1: Add `shiftCount` to the lookup state**

Current (lines 39-43):

```ts
  const [lookup, setLookup] = useState({
    products: [] as LookupItem[],
    wilayah: [] as LookupItem[],
    areas: [] as LookupItem[],
  });
```

Replace with:

```ts
  const [lookup, setLookup] = useState({
    products: [] as LookupItem[],
    wilayah: [] as LookupItem[],
    areas: [] as LookupItem[],
    shiftCount: 0,
  });
```

- [ ] **Step 2: Populate it from the fetch response**

Current (lines 58-77):

```ts
  useEffect(() => {
    async function fetchLookup() {
      try {
        const res = await fetch('/api/kuota/lookup');
        const data = await res.json();
        if (data.success) {
          setLookup({
            products: data.products,
            wilayah: data.wilayah,
            areas: data.areas,
          });
        }
      } catch (error) {
        console.error("Failed to fetch lookup data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLookup();
  }, []);
```

Replace with:

```ts
  useEffect(() => {
    async function fetchLookup() {
      try {
        const res = await fetch('/api/kuota/lookup');
        const data = await res.json();
        if (data.success) {
          setLookup({
            products: data.products,
            wilayah: data.wilayah,
            areas: data.areas,
            shiftCount: data.shiftCount,
          });
        }
      } catch (error) {
        console.error("Failed to fetch lookup data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLookup();
  }, []);
```

- [ ] **Step 3: Derive the shift number list next to the other math validations**

Current (lines 90-92):

```ts
  // Math Validations
  const totalWilayah = Object.values(formData.wilayah).reduce((a, b) => a + b, 0);
  const totalAreas = Object.values(formData.areas).reduce((a, b) => a + b, 0);
```

Replace with:

```ts
  // Math Validations
  const totalWilayah = Object.values(formData.wilayah).reduce((a, b) => a + b, 0);
  const totalAreas = Object.values(formData.areas).reduce((a, b) => a + b, 0);
  // At least 1 so the wizard never renders zero shift inputs if the lookup
  // call fails to return a count.
  const shiftNumbers = Array.from({ length: Math.max(1, lookup.shiftCount) }, (_, i) => i + 1);
```

- [ ] **Step 4: Replace the hardcoded `[1, 2, 3]` grid in Step 4**

Current (lines 405-429):

```tsx
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {[1, 2, 3].map(sNum => (
                            <div key={sNum} className="space-y-2">
                               <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Shift {sNum}</label>
                               <Input
                                  type="number"
                                  placeholder="0"
                                  value={formData.shifts[a.id]?.[sNum] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                    setFormData({
                                      ...formData,
                                      shifts: {
                                        ...formData.shifts,
                                        [a.id]: {
                                          ...formData.shifts[a.id],
                                          [sNum]: val
                                        }
                                      }
                                    });
                                  }}
                               />
                            </div>
                          ))}
                       </div>
```

Replace with:

```tsx
                       <div
                          className="grid grid-cols-1 md:grid-cols-[repeat(var(--shift-cols),minmax(0,1fr))] gap-6"
                          style={{ "--shift-cols": shiftNumbers.length } as React.CSSProperties}
                       >
                          {shiftNumbers.map(sNum => (
                            <div key={sNum} className="space-y-2">
                               <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Shift {sNum}</label>
                               <Input
                                  type="number"
                                  placeholder="0"
                                  value={formData.shifts[a.id]?.[sNum] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                    setFormData({
                                      ...formData,
                                      shifts: {
                                        ...formData.shifts,
                                        [a.id]: {
                                          ...formData.shifts[a.id],
                                          [sNum]: val
                                        }
                                      }
                                    });
                                  }}
                               />
                            </div>
                          ))}
                       </div>
```

(`grid-cols-[repeat(var(--shift-cols),minmax(0,1fr))]` is a static Tailwind class string — the arbitrary value references a CSS custom property, so Tailwind's JIT scanner picks it up at build time while the actual column count is set at runtime via the inline `style`.)

- [ ] **Step 5: Manual verification**

Run `npm run dev`, log in as a user whose active company has exactly 1 configured shift (e.g. the company behind "Sumbariu"), go to `/kuota/schedule/new`, fill Step 1–3 with a real product/tonnage, and reach Step 4.
Expected: each area card shows exactly **1** shift input, labeled "Shift 1".
Then switch to (or log in as) a company known to have 3 shifts and repeat.
Expected: each area card shows **3** shift inputs, labeled "Shift 1", "Shift 2", "Shift 3" — confirming the fix didn't regress the multi-shift case.

- [ ] **Step 6: Type-check and lint**

```bash
npm run lint
```

Expected: no new errors in `src/app/kuota/schedule/new/page.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/app/kuota/schedule/new/page.tsx
git commit -m "fix(kuota): render shift inputs by actual company shift count in new wizard"
```

---

### Task 3: Apply the same fix to the "Edit Quota" wizard

**Files:**
- Modify: `src/app/kuota/schedule/edit/[id]/page.tsx`

This file is a copy of the new-quota wizard with the same bug at the same relative spots. Repeat Task 2's edits here.

- [ ] **Step 1: Add `shiftCount` to the lookup state**

Current (lines 41-45):

```ts
  const [lookup, setLookup] = useState({
    products: [] as LookupItem[],
    wilayah: [] as LookupItem[],
    areas: [] as LookupItem[],
  });
```

Replace with:

```ts
  const [lookup, setLookup] = useState({
    products: [] as LookupItem[],
    wilayah: [] as LookupItem[],
    areas: [] as LookupItem[],
    shiftCount: 0,
  });
```

- [ ] **Step 2: Populate it from the fetch response**

Current (lines 62-71):

```ts
        // Fetch Lookup Data
        const resLookup = await fetch('/api/kuota/lookup');
        const dataLookup = await resLookup.json();
        if (dataLookup.success) {
          setLookup({
            products: dataLookup.products,
            wilayah: dataLookup.wilayah,
            areas: dataLookup.areas,
          });
        }
```

Replace with:

```ts
        // Fetch Lookup Data
        const resLookup = await fetch('/api/kuota/lookup');
        const dataLookup = await resLookup.json();
        if (dataLookup.success) {
          setLookup({
            products: dataLookup.products,
            wilayah: dataLookup.wilayah,
            areas: dataLookup.areas,
            shiftCount: dataLookup.shiftCount,
          });
        }
```

- [ ] **Step 3: Derive the shift number list next to the other math validations**

Find the `totalWilayah` / `totalAreas` block (same pattern as Task 2 Step 3, search for `const totalAreas = Object.values(formData.areas)`) and add directly below it:

```ts
  const shiftNumbers = Array.from({ length: Math.max(1, lookup.shiftCount) }, (_, i) => i + 1);
```

- [ ] **Step 4: Replace the hardcoded `[1, 2, 3]` grid in Step 4**

Current (lines 419-443):

```tsx
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {[1, 2, 3].map(sNum => (
                            <div key={sNum} className="space-y-2">
                               <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Shift {sNum}</label>
                               <Input 
                                  type="number" 
                                  placeholder="0"
                                  value={formData.shifts[a.id]?.[sNum] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                                    setFormData({
```

Apply the identical replacement used in Task 2 Step 4 — swap `[1, 2, 3]` for `shiftNumbers` and the wrapping `<div>`'s className/style for the `--shift-cols` version. (The rest of the `onChange` body and closing tags in this file are byte-identical to the new-wizard version; only the opening `<div>` and the `.map` source array change.)

- [ ] **Step 5: Manual verification**

Repeat Task 2 Step 5, but starting from an existing saved quota: go to `/kuota/schedule`, click "Edit" on a row belonging to a 1-shift company, confirm Step 4 shows 1 shift input pre-filled with the existing value. Repeat for a 3-shift company's row.

- [ ] **Step 6: Type-check and lint**

```bash
npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add "src/app/kuota/schedule/edit/[id]/page.tsx"
git commit -m "fix(kuota): render shift inputs by actual company shift count in edit wizard"
```

---

## Self-Review Notes

- **Spec coverage:** user's report ("Sumbariu only has 1 shift but the wizard lets you set 3") is addressed by Task 1 (data) + Task 2 (new wizard UI) + Task 3 (edit wizard UI, the duplicate site found during investigation).
- **No test framework in repo** — verification is manual browser + `npm run lint`, matching how the rest of this codebase is validated (no `vitest`/`jest` in `package.json`).
- **Not in scope:** the ASP.NET backend needs no change — `KuotaController.DataBagian()` already computes the correct count; only the Next.js proxy was dropping it.
