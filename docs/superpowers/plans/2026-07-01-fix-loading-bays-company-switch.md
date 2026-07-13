# Fix Loading Bays Company Switch Not Updating Data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the loading bays card and live-monitoring page so data actually refreshes when the user switches company/plant.

**Architecture:** Root cause is two-part: (1) both pages keep local `selectedDockPlant` state disconnected from the global `CompanyContext`; (2) the server-side `/api/dashboard/loading-bays` route uses the **session ASP.NET token** which is company-scoped — passing `companyCode=PKC` with a PKG token returns PKG data regardless. Real company filtering requires `switchCompany()` which re-auths and gets a new token. Fix: wire both UIs to `useCompany()` context so the token and company code are always in sync.

**Tech Stack:** Next.js 16, React, `CompanyContext` (`src/context/CompanyContext.tsx`), `useCompany()` hook.

---

## File Map

| File | Change |
|---|---|
| `src/components/dashboard/ViewerDashboard.tsx` | Remove local `selectedDockPlant` state, local `companies` state, and company-list fetch. Replace with `useCompany()`. Wire fetch dep to `activeCompanyCode`. Remove the SearchableSelect from the card header. |
| `src/app/antrian/live-monitoring/page.tsx` | Replace local `selectedDockPlant`/`companies` state + company-list fetch with `useCompany()`. Wire `SearchableSelect.onChange` to `switchCompany()`. Wire fetch dep to `activeCompanyCode`. |

---

## Task 1: Fix ViewerDashboard Loading Bays — use global company context

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx`

### What to change

**Add import** (line ~32 area, after `useApi` import):
```tsx
import { useCompany } from "@/context/CompanyContext";
```

**Replace** the `useCompany()` call near line 155 area (in the component body, after existing hooks). The ViewerDashboard already calls `useApi()`. Add this line:
```tsx
const { activeCompanyCode } = useCompany();
```

**Remove** these 3 lines (lines ~175, ~191-196):
```tsx
// REMOVE:
const [selectedDockPlant, setSelectedDockPlant] = useState<string>("PKG");
// ...
const [companies, setCompanies] = useState<any[]>([
  { company_code: "PKG", company: "Petrokimia Gresik" },
  { company_code: "PKC", company: "Pupuk Kujang" },
  { company_code: "PIM", company: "Pupuk Iskandar Muda" },
  { company_code: "LOG4MENENG", company: "Logistics Meneng" }
]);
```

**Remove** the company-list fetch effect (lines ~205-223):
```tsx
// REMOVE THIS WHOLE EFFECT:
useEffect(() => {
  apiJson<any[]>("/api/Company/getCompanyListFitur")
    .then(...)
    .catch(...);
}, [apiJson]);
```

**Replace** the fetch effect dep array (line ~252). Change:
```tsx
}, [selectedDockPlant]);
```
to:
```tsx
}, [activeCompanyCode]);
```

**Replace** the `qs` construction inside `fetchBays` (line ~230). Change:
```tsx
const qs = selectedDockPlant
  ? `?companyCode=${encodeURIComponent(selectedDockPlant)}`
  : "";
```
to:
```tsx
const qs = activeCompanyCode
  ? `?companyCode=${encodeURIComponent(activeCompanyCode)}`
  : "";
```

**Remove** the SearchableSelect from the card header (lines ~1298-1309):
```tsx
// REMOVE:
<div className="w-64 shrink-0 self-start md:self-auto">
  <SearchableSelect
    options={companies.map((c: any) => ({
      value: c.company_code,
      label: c.company || c.company_code
    }))}
    value={selectedDockPlant}
    onChange={(val) => setSelectedDockPlant(val)}
    placeholder="Pilih Perusahaan/Plant..."
    searchPlaceholder="Cari plant..."
  />
</div>
```

Replace with a static label showing the active company:
```tsx
<div className="shrink-0 self-start md:self-auto">
  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-3 py-1.5 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
    {activeCompanyCode ?? "—"}
  </span>
</div>
```

After all edits, check that `SearchableSelect` is still used elsewhere in ViewerDashboard. If NOT, remove that import. If yes, keep it.

- [ ] **Step 1: Read current file to confirm line numbers before editing**

```
Read src/components/dashboard/ViewerDashboard.tsx lines 1-50 (imports)
Read src/components/dashboard/ViewerDashboard.tsx lines 155-200 (state declarations)
Read src/components/dashboard/ViewerDashboard.tsx lines 198-255 (effects)
Read src/components/dashboard/ViewerDashboard.tsx lines 1286-1315 (card header with SearchableSelect)
```

- [ ] **Step 2: Add `useCompany` import**

Add to imports at top of file (line ~32):
```tsx
import { useCompany } from "@/context/CompanyContext";
```

- [ ] **Step 3: Add `activeCompanyCode` from context in component body**

Find where `const { apiJson } = useApi();` is used (around line 155) and add below it:
```tsx
const { activeCompanyCode } = useCompany();
```

- [ ] **Step 4: Remove `selectedDockPlant` state, `companies` state, company-list fetch effect**

Remove:
- `const [selectedDockPlant, setSelectedDockPlant] = useState<string>("PKG");`
- The `companies` state declaration (4 hardcoded companies)
- The entire `useEffect(() => { apiJson<any[]>("/api/Company/getCompanyListFitur")... }, [apiJson]);` block

- [ ] **Step 5: Update `fetchBays` effect**

Change `selectedDockPlant` → `activeCompanyCode` in:
1. The `qs` construction inside `fetchBays`
2. The dep array `}, [selectedDockPlant])` → `}, [activeCompanyCode])`

- [ ] **Step 6: Replace SearchableSelect in card header**

Replace the `<div className="w-64 shrink-0 ..."><SearchableSelect ... /></div>` block with:
```tsx
<div className="shrink-0 self-start md:self-auto">
  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-3 py-1.5 bg-gray-100 dark:bg-white/[0.05] rounded-lg">
    {activeCompanyCode ?? "—"}
  </span>
</div>
```

- [ ] **Step 7: Check if `SearchableSelect` is still used in ViewerDashboard**

Grep for `SearchableSelect` in `ViewerDashboard.tsx`. If no other usage, remove it from the imports:
```
import { SearchableSelect } from "@/components/ui/SearchableSelect";
```

Also check if `apiJson` is still used for other things. If the company-list fetch was the only usage, also remove `useApi` import + destructuring.

- [ ] **Step 8: Build check**

```powershell
rtk tsc --noEmit 2>&1 | head -40
```
Expected: no errors related to `selectedDockPlant`, `companies`, or `SearchableSelect` in ViewerDashboard.

- [ ] **Step 9: Commit**

```bash
rtk git add src/components/dashboard/ViewerDashboard.tsx
rtk git commit -m "fix: loading bays card tracks global company context instead of local state"
```

---

## Task 2: Fix live-monitoring page — wire dropdown to `switchCompany()`

**Files:**
- Modify: `src/app/antrian/live-monitoring/page.tsx`

### What to change

The page currently has:
- Local `companies` state (hardcoded) + company-list fetch effect via `apiJson`
- Local `selectedDockPlant` state initialized to `"PKG"`
- SearchableSelect `onChange` calls `setSelectedDockPlant(val)` — just local state
- fetch effect dep on `[selectedDockPlant]`

Replace all of that with:
- `useCompany()` for `companies`, `activeCompanyCode`, and `switchCompany`
- SearchableSelect `onChange` calls `switchCompany(val)` — actually switches company + gets new token
- fetch effect dep on `[activeCompanyCode]`

- [ ] **Step 1: Read current imports and state**

```
Read src/app/antrian/live-monitoring/page.tsx lines 1-50
```

- [ ] **Step 2: Update imports**

Add `useCompany` import. Remove `useApi` import if `apiJson` was only used for company list:
```tsx
import { useCompany } from "@/context/CompanyContext";
```

- [ ] **Step 3: Replace local state and effects with context**

Remove:
```tsx
const { apiJson } = useApi();
const [companies, setCompanies] = useState<any[]>([...]);
const [selectedDockPlant, setSelectedDockPlant] = useState<string>("PKG");
```
And the company-list fetch effect:
```tsx
useEffect(() => {
  apiJson<any[]>("/api/Company/getCompanyListFitur")
    .then(...)
    .catch(...);
}, [apiJson]);
```

Replace with:
```tsx
const { companies, activeCompanyCode, switchCompany } = useCompany();
```

- [ ] **Step 4: Update `fetchBays` effect**

Change `selectedDockPlant` → `activeCompanyCode` in:
1. The `qs` construction inside `fetchBays`
2. The dep array `}, [selectedDockPlant])` → `}, [activeCompanyCode])`

- [ ] **Step 5: Update SearchableSelect binding**

Change from:
```tsx
<SearchableSelect
  options={companies.map((c: any) => ({
    value: c.company_code,
    label: c.company || c.company_code,
  }))}
  value={selectedDockPlant}
  onChange={(val) => setSelectedDockPlant(val)}
  placeholder="Pilih Perusahaan/Plant..."
  searchPlaceholder="Cari plant..."
/>
```

To:
```tsx
<SearchableSelect
  options={companies.map((c) => ({
    value: c.company_code,
    label: c.company,
  }))}
  value={activeCompanyCode ?? ""}
  onChange={(val) => { switchCompany(val).catch(console.error); }}
  placeholder="Pilih Perusahaan/Plant..."
  searchPlaceholder="Cari plant..."
/>
```

Note: `useCompany().companies` is `Company[]` with fields `{ company_code, company }` — not `any[]`, so no need to coerce `.company || .company_code`.

- [ ] **Step 6: Remove now-unused imports**

Check if `useApi` and `useState` (for removed states) are still needed. Remove if not.

- [ ] **Step 7: Build check**

```powershell
rtk tsc --noEmit 2>&1 | head -40
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
rtk git add src/app/antrian/live-monitoring/page.tsx
rtk git commit -m "fix: live-monitoring page wires company dropdown to switchCompany() for real token refresh"
```

---

## Self-Review

**Spec coverage:**
- ✅ ViewerDashboard no longer has disconnected local company state
- ✅ ViewerDashboard fetch dep tracks `activeCompanyCode` from context
- ✅ live-monitoring page `onChange` calls `switchCompany()` → new token
- ✅ live-monitoring page fetch dep tracks `activeCompanyCode`

**Placeholder scan:** None — all code is complete and exact.

**Type consistency:** `useCompany()` returns `{ companies: Company[], activeCompanyCode: string | null, switchCompany: (code: string) => Promise<void> }` — all usages match.

**Edge cases:**
- `activeCompanyCode` can be `null` during loading — the `qs` construction handles this (`null` is falsy, so `qs = ""` and the route returns unfiltered data, which is acceptable).
- `switchCompany` is async and can throw — wrapped in `.catch(console.error)` in the onChange.
