# Fix Gudang & Warehouse QA Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 QA findings on the warehouse (gudang) pages: a broken sort column in Laporan Gudang, a stale legacy page title, a leading-zero stock input, a status-toggle that silently fails, a detail popup that fails to load, an unclear "tonase" value that sometimes shows the wrong number, an oversized "Tambah Gudang Tujuan" popup, and a fully redundant "Monitoring Pemuatan" page that duplicates "List Gudang" (including its own copy of two of the bugs above).

**Architecture:** Mostly frontend (`SISTROV2-next`). Two findings (#17's root cause investigation) are frontend-only fixes to how the frontend interprets/verifies backend responses — no backend code changes needed anywhere in this plan.

**Tech Stack:** Next.js 16 / React / TypeScript, TanStack Query, the shared `DataTable` component (`src/components/ui/DataTable.tsx`), `useApi()`'s `apiFetch`/`apiJson` (`src/hooks/use-api.ts`).

**No test runner exists in this repo.** Verification steps use `rtk tsc --noEmit`, `rtk lint`, and manual checks against `npm run dev:local`.

---

## Task 1: Fix ambiguous sort column in Laporan Gudang

QA finding #3: "laporan Gudang masih bug". Investigation found `src/app/reports/warehouses/page.tsx` registers two different DataTables server-side columns with the same `name: "ID"` — the `number` column (row index) and the `KodeGudang` column (the actual warehouse code). Since DataTables server-side sorting/searching is keyed by `name`, this collision makes sorting/searching on "Kode" ambiguous or silently wrong.

**Files:**
- Modify: `src/app/reports/warehouses/page.tsx:30-45`

- [ ] **Step 1: Read the column definitions**

```bash
rtk read src/app/reports/warehouses/page.tsx 25 50
```

- [ ] **Step 2: Give the two columns distinct `name` values**

Change:
```tsx
{ data: "number", name: "ID", searchable: false, orderable: false }
```
to:
```tsx
{ data: "number", name: "Number", searchable: false, orderable: false }
```
and leave:
```tsx
{ data: "KodeGudang", name: "ID", searchable: true, orderable: true }
```
as-is (it should keep `name: "ID"` since that's presumably the actual backend sort/search key the ASP.NET `GudangDataTable` endpoint expects for the code column — only the non-sortable `number` column's bogus `name` needs to change since it was never a real sort target).

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Run `npm run dev:local`, open `/reports/warehouses`, click the "Kode" column header to sort ascending/descending, and confirm the table actually re-sorts by warehouse code (not silently doing nothing or sorting by row index).

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/reports/warehouses/page.tsx
rtk git commit -m "fix: resolve duplicate DataTable column name breaking sort on Laporan Gudang"
```

---

## Task 2: List Gudang header text

QA finding #15: "menu list Gudang = headernya daftar Gudang Gresik, ganti" (header still says a specific city name, should be generic). Investigation found the Next.js page `src/app/gudang/page.tsx:362` already renders a generic `<h1>Daftar Gudang</h1>` with no city name — the "Daftar Gudang Gresik" title only exists in the **legacy ASP.NET MVC view** `sistropigroup/SISTROAWESOME/Views/Gudang/List.cshtml:16` (`ViewBag.Title = "Daftar Gudang Gresik";`), which is a different, older page outside this Next.js app. QA was very likely looking at that legacy page (if it's still reachable) rather than the SISTRO v2 frontend.

**Files:**
- Verify only: `src/app/gudang/page.tsx:362`
- Modify (if still reachable): `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Views\Gudang\List.cshtml:16`

- [ ] **Step 1: Confirm the Next.js page is already correct**

```bash
rtk read src/app/gudang/page.tsx 358 366
```
Expected: `<h1>` reads "Daftar Gudang" with no city name. If it already does, no frontend change is needed for this item.

- [ ] **Step 2: Check whether the legacy MVC page is still reachable**

Ask the user (or check IIS/routing config in `sistropigroup`) whether `Views/Gudang/List.cshtml` is still served to real users, or whether it's dead code left over from the pre-SISTRO-v2 system. If it's dead/unreachable, skip Step 3 — there's nothing to fix.

- [ ] **Step 3: Fix the legacy title (only if the page is still reachable)**

In `sistropigroup/SISTROAWESOME/Views/Gudang/List.cshtml`, change:
```csharp
ViewBag.Title = "Daftar Gudang Gresik";
```
to:
```csharp
ViewBag.Title = "Daftar Gudang";
```

- [ ] **Step 4: Manual verify**

Open `/gudang` in the running Next.js app and confirm the header reads "Daftar Gudang". If Step 3 was needed, also verify the legacy MVC page's browser tab title / page header.

- [ ] **Step 5: Commit (only if Step 3 was needed)**

```bash
git add SISTROAWESOME/Views/Gudang/List.cshtml
git commit -m "fix: remove hardcoded city name from legacy gudang list title"
```
(run inside `sistropigroup`, not this repo)

---

## Task 3: Fix leading-zero artifact in "Tambah Stok" input

QA finding #16: the stock input shows a literal leading `"0"` before the user's typed digits (e.g. "0100" instead of "100"), or doesn't clear to exactly what was typed. Root cause: `tambahanStok` state defaults to the number `0` (`src/app/gudang/page.tsx:83`) and is reset to `0` (not blank) every time the "Tambah Stok" modal opens (line 181), so the input always starts from a literal `"0"` rather than an empty field.

**Files:**
- Modify: `src/app/gudang/page.tsx:83, 181, 202, 597-598, 627`

- [ ] **Step 1: Change state type to allow an empty value**

Line 83, change:
```tsx
const [tambahanStok, setTambahanStok] = useState<number>(0);
```
to:
```tsx
const [tambahanStok, setTambahanStok] = useState<number | "">("");
```

- [ ] **Step 2: Reset to empty instead of 0 when opening the modal**

Line 181, change:
```tsx
setTambahanStok(0);
```
to:
```tsx
setTambahanStok("");
```

- [ ] **Step 3: Update the save guard to handle the empty case**

Line 202, change:
```tsx
if (!gudangDetail || tambahanStok < 0) return;
```
to:
```tsx
if (!gudangDetail || tambahanStok === "" || tambahanStok < 0) return;
```

- [ ] **Step 4: Update the input's value/onChange**

Lines 593-601, change the `onChange` from:
```tsx
onChange={(e) => setTambahanStok(Number(e.target.value))}
```
to:
```tsx
onChange={(e) => setTambahanStok(e.target.value === "" ? "" : Number(e.target.value))}
```
(the `value={tambahanStok}` binding stays the same — React renders an empty string as a blank input, and a number as its digits with no leading zero)

- [ ] **Step 5: Update the disabled-button guard**

Line 627, change:
```tsx
disabled={isSaving || tambahanStok <= 0}
```
to:
```tsx
disabled={isSaving || tambahanStok === "" || tambahanStok <= 0}
```

- [ ] **Step 6: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors (TypeScript should now correctly narrow `tambahanStok` to `number` after the `=== ""` guards in Steps 3/5; if it complains about `String(tambahanStok)` at line 207, that's fine — `String` accepts `number | ""`)

- [ ] **Step 7: Manual verify**

Open `/gudang`, click "Tambah Stok" on any row, confirm the input starts blank (not "0"), type "100", confirm it shows exactly "100" (not "0100"), and confirm the submit button stays disabled until a value > 0 is entered.

- [ ] **Step 8: Commit**

```bash
rtk git add src/app/gudang/page.tsx
rtk git commit -m "fix: stop 'tambah stok' input from showing a literal leading zero"
```

---

## Task 4: Fix "gagal aktifin status gudang" (activate/deactivate silently fails)

QA finding #17. Investigation found two compounding bugs in `src/app/gudang/page.tsx`:

1. **The toggle handler never checks the HTTP response status.** `handleToggleAktifConfirm` (lines 231-251) calls `apiFetch("/api/Gudang/GudangMuatSetting", ...)` and, because `fetch()` never rejects on a non-2xx HTTP status, the code always shows a "Sukses" toast and optimistically invalidates the query — even if the backend returned 401/403/500. After the list refetches, the row still shows the old status, which reads to a user as "gagal aktifin" even though the UI just told them it succeeded.
2. **Status detection misreads the backend's role-dependent HTML string.** The backend (`GudangController.cs` `DataMapping`, confirmed via `sistropigroup` source) returns the `Aktif` field as raw HTML that differs by role: for `CandalGudang`/`TI` roles it's a switch `<input>` whose `checked` attribute is present only when active; for all other roles it's a `<span class="badge badge-success">Aktif</span>` / `badge-danger` string. The frontend's `isAktif` detection (lines 294-300) only checks for `"badge-success"` / `">aktif<"` substrings — it never checks for the switch-input's `checked` attribute, so for `CandalGudang`/`TI` users the toggle always renders as "Nonaktif" regardless of the real state, and clicking it sends the wrong intended next-status.

**Files:**
- Modify: `src/app/gudang/page.tsx:231-251` (response check)
- Modify: `src/app/gudang/page.tsx:292-300` (status detection)

- [ ] **Step 1: Add response-status checking to the toggle handler**

Current code (lines 231-251):
```tsx
  const handleToggleAktifConfirm = async () => {
    if (!toggleTarget) return;
    const { row, nextStatus } = toggleTarget;
    try {
      const fd = new URLSearchParams();
      fd.append("id", String(row.id));
      fd.append("aktif", nextStatus ? "true" : "false");
      if (activeCompanyCode) fd.append("companyCode", activeCompanyCode);

      await apiFetch("/api/Gudang/GudangMuatSetting", {
        method: "POST",
        body: fd.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      addToast({ title: "Sukses", description: `Gudang ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gudang-list"] });
      setToggleTarget(null);
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengubah status gudang", variant: "destructive" });
    }
  };
```

Replace with:
```tsx
  const handleToggleAktifConfirm = async () => {
    if (!toggleTarget) return;
    const { row, nextStatus } = toggleTarget;
    try {
      const fd = new URLSearchParams();
      fd.append("id", String(row.id));
      fd.append("aktif", nextStatus ? "true" : "false");
      if (activeCompanyCode) fd.append("companyCode", activeCompanyCode);

      const res = await apiFetch("/api/Gudang/GudangMuatSetting", {
        method: "POST",
        body: fd.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      if (!res.ok) {
        throw new Error(`GudangMuatSetting failed: ${res.status}`);
      }
      addToast({ title: "Sukses", description: `Gudang ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["gudang-list"] });
      setToggleTarget(null);
    } catch (err) {
      addToast({ title: "Error", description: "Gagal mengubah status gudang", variant: "destructive" });
    }
  };
```

- [ ] **Step 2: Extend `isAktif` detection to recognize the switch-input's `checked` attribute**

Current code (lines 292-300):
```tsx
      render: (row) => {
        // Detect active status from HTML badge string or standard boolean/string
        const aktifStr = String(row.Aktif || "").toLowerCase();
        const isAktif =
          aktifStr.includes("badge-success") ||
          aktifStr.includes(">aktif<") ||
          row.Aktif === "1" ||
          row.Aktif === "True" ||
          row.Aktif === true;
```

Replace with:
```tsx
      render: (row) => {
        // Detect active status from HTML badge string, HTML switch-input string, or standard boolean/string.
        // Backend returns different HTML per role: CandalGudang/TI get a <input type=checkbox ... checked/>
        // switch, everyone else gets a <span class="badge badge-success/danger"> — both must be handled.
        const aktifStr = String(row.Aktif || "").toLowerCase();
        const isAktif =
          aktifStr.includes("badge-success") ||
          aktifStr.includes(">aktif<") ||
          /\bchecked\b/.test(aktifStr) ||
          row.Aktif === "1" ||
          row.Aktif === "True" ||
          row.Aktif === true;
```

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Run `npm run dev:local`, log in as a `TI`/`CandalGudang`-role user, open `/gudang`, confirm the status toggle now correctly reflects each row's real active/inactive state (not always "Nonaktif"). Click a toggle and confirm: (a) if the backend call succeeds, the row's status visibly flips after refetch; (b) if you simulate a failure (e.g. temporarily point `activeCompanyCode` at an invalid value, or use devtools to block the request), the toast now says "Gagal mengubah status gudang" instead of falsely claiming success.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/gudang/page.tsx
rtk git commit -m "fix: check response status and role-dependent HTML on gudang status toggle"
```

---

## Task 5: Fix "Gudang Tujuan Bagian" detail popup failing to load

QA finding #18. Investigation found `src/app/gudang/tujuan-bagian/page.tsx`'s `handleOpenDetail` (lines 81-107) tries to extract a numeric warehouse ID from an `Action` HTML string via `row.Action?.match(/ViewGudang\('(\d+)'\)/)` — but the backend (`GudangController.cs` `DataGudangTujuan`, confirmed via `sistropigroup` source) embeds `x.g.ID`, the warehouse's real (often alphanumeric, e.g. `"SPPT01"`) code, inside that string — the `\d+` regex only matches pure digits, so it fails to match for alphanumeric codes. When the regex fails, the code falls back to `row.id || row.idgudang` — but on this endpoint `id` is populated from `(int)x.g.Tipe` (the warehouse **type** enum, not its identity!) while `idgudang` holds the real code (`x.g.ID`). Since `row.id` (the Tipe value) is often a non-zero, truthy number, the `||` fallback picks the wrong value first and sends the warehouse's *type* instead of its *ID* to the detail endpoint, which then finds no matching row.

Fix: stop parsing the `Action` HTML string entirely and use `row.idgudang` directly — it's already the correct field for this exact purpose.

**Files:**
- Modify: `src/app/gudang/tujuan-bagian/page.tsx:81-107`

- [ ] **Step 1: Read current handler**

```bash
rtk read src/app/gudang/tujuan-bagian/page.tsx 81 107
```

- [ ] **Step 2: Replace the ID resolution and simplify the request body**

Current code:
```tsx
  const handleOpenDetail = async (row: any) => {
    const match = row.Action?.match(/ViewGudang\('(\d+)'\)/);
    const storageID = match ? match[1] : (row.id || row.idgudang);

    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    try {
      console.log("[DetailDataTujuan] Fetching for storageID:", storageID);
      const res = await apiJson("/api/Gudang/DetailDataTujuan", {
        method: "POST",
        body: JSON.stringify({ 
          storageID: storageID,
          StorageID: storageID,
          storageid: storageID,
          id: storageID
        })
      });
      console.log("[DetailDataTujuan] Response:", res);
      const data = res.response || res;
      setDetail(data);
    } catch (err) {
      console.error("[DetailDataTujuan] Error:", err);
      addToast({ title: "Error", description: "Gagal memuat detail gudang", variant: "destructive" });
    } finally {
      setIsLoadingDetail(false);
    }
  };
```

Replace with:
```tsx
  const handleOpenDetail = async (row: any) => {
    const storageID = row.idgudang;

    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    try {
      const res = await apiJson("/api/Gudang/DetailDataTujuan", {
        method: "POST",
        body: JSON.stringify({ storageID }),
      });
      const data = res.response || res;
      setDetail(data);
    } catch (err) {
      addToast({ title: "Error", description: "Gagal memuat detail gudang", variant: "destructive" });
    } finally {
      setIsLoadingDetail(false);
    }
  };
```

`row.idgudang` is populated straight from the `DataGudangTujuan` DataTable response (`idgudang: x.g.ID` server-side — see `columns` definition in this same file, `key: "idgudang"`), so it's always present and always the real warehouse code, no regex or multi-key guessing needed. The backend's `DetailDataTujuan([FromBody] Antrian param)` binds JSON case-insensitively via the default Web API JSON formatter, so a single `storageID` key is sufficient.

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Open `/gudang/tujuan-bagian`, click "Detail" on several rows — including at least one whose warehouse code is alphanumeric (not purely numeric) — and confirm the detail modal loads real data (namagudang, alamat, kecamatan, kabupaten, provinsi) instead of showing the "Gagal memuat detail gudang" error toast.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/gudang/tujuan-bagian/page.tsx
rtk git commit -m "fix: use idgudang directly instead of parsing Action HTML for detail lookup"
```

---

## Task 6: Fix and clarify the "Tonase" column

QA finding #19: "tonase yg ada itu maksudnya apa?" (what does this tonase value mean?). Investigation found two issues in `src/app/gudang/tujuan-bagian/page.tsx:166-171`:
1. The column's render function falls back through `row.qty || row.tonase || row.id` — if both `qty` and `tonase` are falsy, it silently displays `row.id` (the row's database ID) as if it were a tonnage figure. That's a real bug, not just a labeling issue.
2. There's no explanation anywhere of what this figure represents (per the page's own subtitle at line 192, "* Kuota dalam satuan ton" — this is the warehouse's loading quota in tons, not its physical capacity).

**Files:**
- Modify: `src/app/gudang/tujuan-bagian/page.tsx:166-171`

- [ ] **Step 1: Read current column definition**

```bash
rtk read src/app/gudang/tujuan-bagian/page.tsx 160 172
```

- [ ] **Step 2: Remove the incorrect `row.id` fallback and add a tooltip**

Current code:
```tsx
    { 
      key: "tonase", 
      header: "Tonase", 
      className: "text-right",
      render: (row) => <span className="font-black text-brand-600">{row.qty || row.tonase || row.id} <span className="text-[10px] uppercase">Ton</span></span>
    },
```

Replace with:
```tsx
    { 
      key: "tonase", 
      header: (
        <span className="inline-flex items-center gap-1">
          Kuota Tonase
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </TooltipTrigger>
            <TooltipContent>
              Kuota muat maksimum (dalam ton) untuk gudang tujuan ini, bukan kapasitas fisik gudang.
            </TooltipContent>
          </Tooltip>
        </span>
      ), 
      className: "text-right",
      render: (row) => {
        const value = row.qty || row.tonase;
        return (
          <span className="font-black text-brand-600">
            {value != null ? value : "-"} <span className="text-[10px] uppercase">Ton</span>
          </span>
        );
      }
    },
```

- [ ] **Step 3: Add the tooltip imports if not already present**

At the top of `src/app/gudang/tujuan-bagian/page.tsx`, if `Tooltip`/`TooltipTrigger`/`TooltipContent` and `HelpCircle` aren't already imported, add:
```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
```

- [ ] **Step 4: Confirm `DataTableColumn.header` accepts a `ReactNode`, not just a string**

```bash
rtk grep "header" src/components/ui/DataTable.tsx
```
If `DataTableColumn.header` is typed as `string` only, widen it to `React.ReactNode` in `src/components/ui/DataTable.tsx` so this column (and any future one) can render a header with an inline tooltip. This is a type-only change; the component's render logic already just interpolates `{column.header}` in JSX, which accepts `ReactNode`.

- [ ] **Step 5: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 6: Manual verify**

Open `/gudang/tujuan-bagian`, confirm the "Kuota Tonase" column header shows a help icon whose tooltip explains the value is a loading quota, and confirm no row ever displays a database ID in place of a real quota (a row with genuinely no quota data should now show "-" instead of a stray small number).

- [ ] **Step 7: Commit**

```bash
rtk git add src/app/gudang/tujuan-bagian/page.tsx src/components/ui/DataTable.tsx
rtk git commit -m "fix: stop tonase column falling back to row id, add explanatory tooltip"
```

---

## Task 7: Fix oversized "Tambah Gudang Tujuan" popup

QA finding #20: the "add gudang tujuan" form popup is too large — the submit/cancel buttons at the bottom aren't reachable without first resizing something. Investigation found `src/app/gudang/tujuan-bagian/page.tsx:279` (`<DialogContent className="max-w-3xl p-0 overflow-hidden ...">`) has 8 input fields in a 2-column grid plus a large banner header, with no `max-height`/scroll constraint — on shorter viewports the footer buttons can be pushed off-screen. The Detail modal in the same file (line 217) has the same missing constraint but is much shorter so it doesn't visibly break; `src/app/gudang/page.tsx`'s own detail modal already uses the correct pattern (`max-h-[90vh] overflow-hidden flex flex-col`) — reuse that.

**Files:**
- Modify: `src/app/gudang/tujuan-bagian/page.tsx:279`

- [ ] **Step 1: Read the current Dialog structure**

```bash
rtk read src/app/gudang/tujuan-bagian/page.tsx 277 350
```

- [ ] **Step 2: Constrain the dialog height and make the body scrollable**

Change line 279 from:
```tsx
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950">
```
to:
```tsx
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 max-h-[90vh] flex flex-col">
```

Then wrap the scrollable body (the `<div className="p-8 space-y-6">` block starting at line 286, which holds the form fields and the footer buttons) so only the fields scroll and the footer stays pinned. Split it into two parts:
```tsx
          <div className="p-8 space-y-6 overflow-y-auto">
            {/* ... all existing field groups (Kode Gudang through Provinsi) stay here, unchanged ... */}
          </div>
          <div className="flex gap-4 p-8 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" className="flex-1 h-12 font-bold rounded-xl" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-black gap-2 rounded-xl shadow-lg shadow-green-500/20" onClick={handleSave} disabled={isSaving}>
              <Send className="h-4 w-4" /> {isSaving ? "MEMPROSES..." : "TAMBAH GUDANG"}
            </Button>
          </div>
```
(i.e., move the existing `<div className="flex gap-4 pt-4">...Batal/Tambah Gudang buttons...</div>` block, currently at lines 343-348 inside the same scrolling container, out into its own non-scrolling footer `div` with a top border, and remove it from the end of the scrollable fields `div`.)

- [ ] **Step 3: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 4: Manual verify**

Open `/gudang/tujuan-bagian`, click "Tambah Gudang", shrink the browser window vertically (or test on a laptop-height viewport, ~700px tall), and confirm: the header banner and "Batal"/"Tambah Gudang" buttons stay visible at all times, while the 8 input fields scroll independently inside the modal body.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/gudang/tujuan-bagian/page.tsx
rtk git commit -m "fix: constrain Tambah Gudang Tujuan modal height so action buttons stay reachable"
```

---

## Task 8: Delete the redundant "Monitoring Pemuatan" page

QA findings #21, #22, #23. QA reports that "Monitoring Pemuatan" (`src/app/gudang/targets/page.tsx`) duplicates "List Gudang" (`src/app/gudang/page.tsx`) — same `DataMapping`-style data, same detail modal shape — and asks to delete it (#23). Separately, QA also found two bugs specific to that same page: its header still says "Gudang Tujuan Bagian" instead of "Monitoring Pemuatan" (#21, line 210), and its status badge shows "Tutup" even when the warehouse is active (#22) because its `isAktif` check (lines 170, 264: `row.Aktif === "1" || row.Aktif === "True" || row.Aktif === true`) omits the HTML-badge-string handling that `gudang/page.tsx` has (and that Task 4 of this plan just extended to also cover the switch-input case).

Since deleting the page removes the buggy code entirely, deletion resolves all three findings at once — there is no need to also fix #21/#22 in place first.

**Files:**
- Delete: `src/app/gudang/targets/page.tsx`
- Modify: `src/lib/menu-catalog.ts:50`
- Modify: `src/lib/menu-configs.tsx:184, 290, 692`

- [ ] **Step 1: Confirm no other code imports from the targets page**

```bash
rtk grep "gudang/targets" src
```
Expected: only the menu-catalog/menu-configs entries listed above, plus the page file itself. If anything else references it (e.g. a Link/redirect elsewhere), note it — those references need updating too before deletion.

- [ ] **Step 2: Delete the page**

```bash
rm -r "src/app/gudang/targets"
```

- [ ] **Step 3: Remove the menu entry from menu-catalog.ts**

In `src/lib/menu-catalog.ts`, delete line 50:
```ts
      { path: "/gudang/targets", label: "Monitoring Pemuatan" },
```

- [ ] **Step 4: Remove the menu entry from menu-configs.tsx (3 occurrences)**

In `src/lib/menu-configs.tsx`, delete all three occurrences of:
```tsx
          { name: "Monitoring Pemuatan", path: "/gudang/targets" },
```
at lines 184, 290, and 692 (line numbers will shift after the first deletion — search for the literal string each time rather than relying on the original line numbers).

- [ ] **Step 5: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no errors, and no dangling references to `/gudang/targets`

- [ ] **Step 6: Manual verify**

Run `npm run dev:local`, open the sidebar for a role that previously saw "Monitoring Pemuatan" (e.g. `CandalGudang`/`TI`), confirm the menu item is gone and no broken link remains, and confirm `/gudang/targets` now 404s.

- [ ] **Step 7: Commit**

```bash
rtk git add -A src/app/gudang/targets src/lib/menu-catalog.ts src/lib/menu-configs.tsx
rtk git commit -m "chore: remove redundant Monitoring Pemuatan page (duplicate of List Gudang)"
```

---

## Self-Review Notes

- Coverage: Task 1 → #3, Task 2 → #15, Task 3 → #16, Task 4 → #17, Task 5 → #18, Task 6 → #19, Task 7 → #20, Task 8 → #21+#22+#23. All 10 items in this cluster covered.
- Task 8 depends on nothing else in this plan and can run first or last — but if executed by a subagent in parallel with Task 4, note Task 4's `isAktif` fix in `gudang/page.tsx` is unaffected by Task 8's deletion (different file).
- Task 6 Step 4 (widening `DataTableColumn.header` to `ReactNode`) is a shared component change — if another in-flight plan also touches `DataTable.tsx`, coordinate to avoid a merge conflict.
