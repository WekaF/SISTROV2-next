# Pengajuan Jatuh Tempo — DataTable Pagination Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/pengajuan/jatuh-tempo`, both tabs ("Pengajuan Jatuh Tempo" and "Riwayat Pengajuan") must actually paginate and search client-side, instead of dumping every row from the backend onto a single page regardless of page size or search term.

**Architecture:** The `DataTable` component (`src/components/ui/DataTable.tsx`) is correct — it renders exactly whatever `data.data` its `fetcher` returns, and shows `recordsFiltered`/`recordsTotal` for the page count. The bug is that the two ASP.NET backend endpoints this page calls (`/api/Apg/DatatablePengajuanJapo` and `/api/Apg/DatatableRiwayatPengajuanJapo`, in `sistropigroup/SISTROAWESOME/api/ApgController.cs`) read `start`/`length` from the request but never apply `Skip`/`Take` — all paging/filtering/`recordsTotal`/`recordsFiltered` logic is commented out (`ApgController.cs:82-134` and `:173-198` and onward). They always return the full dataset with no paging metadata. The fix chosen is **frontend-only**: apply the same client-side slice+filter workaround this file already uses for the identical backend limitation in `ModalDetailDO`'s `fetcherDO` (`src/app/pengajuan/jatuh-tempo/page.tsx:368-405`). Backend server-side paging was considered but rejected for this pass — it requires editing/rebuilding/deploying the separate `sistropigroup` ASP.NET repo and risks the classic Razor view (`Views/POSTO/PengajuanJapo.cshtml`) that hits the same endpoint.

**Tech Stack:** Next.js 16 (App Router, client component), TanStack Query (via the existing `DataTable` component), TypeScript. No test framework exists in this repo (`package.json` has no `test` script, no `vitest`/`playwright`) — verification is manual, in-browser, matching how the rest of this codebase is tested.

---

## File Structure

Only one file changes — no new files.

| File | Responsibility |
|---|---|
| `src/app/pengajuan/jatuh-tempo/page.tsx` | Modify `fetcherAktif` (lines 524-549) and `fetcherRiwayat` (lines 551-576) to filter+paginate the backend's full-dataset response client-side, mirroring the existing `fetcherDO` pattern (lines 368-405) in the same file. |

No changes to `DataTable.tsx`, `use-api.ts`, or the backend — those are correct/out of scope for this fix.

---

## Task 1: Fix `fetcherAktif` (tab "Pengajuan Jatuh Tempo")

**Files:**
- Modify: `src/app/pengajuan/jatuh-tempo/page.tsx:524-549`

- [ ] **Step 1: Replace the `fetcherAktif` body**

Find this block (page.tsx:524-549):

```tsx
  const fetcherAktif = useCallback(
    async (params: DataTableParams) => {
      try {
        const result = await apiTable("/api/Apg/DatatablePengajuanJapo", {
          draw: params.draw,
          start: params.start,
          length: params.length,
          search: { value: params.search },
          cmd: "refresh",
          columns: [
            { data: "NoPosto", name: "NoPosto", searchable: true, orderable: true }
          ]
        });
        const data: PengajuanJapoItem[] = result?.data ?? [];
        return { 
          data, 
          recordsTotal: result?.recordsTotal ?? data.length, 
          recordsFiltered: result?.recordsFiltered ?? data.length 
        };
      } catch (err: any) {
        addToast({ title: "Error", description: "Gagal memuat data pengajuan", variant: "destructive" });
        return { data: [], recordsTotal: 0, recordsFiltered: 0 };
      }
    },
    [apiTable, addToast]
  );
```

Replace it with:

```tsx
  const fetcherAktif = useCallback(
    async (params: DataTableParams) => {
      try {
        const result = await apiTable("/api/Apg/DatatablePengajuanJapo", {
          draw: params.draw,
          start: params.start,
          length: params.length,
          search: { value: params.search },
          cmd: "refresh",
          columns: [
            { data: "NoPosto", name: "NoPosto", searchable: true, orderable: true }
          ]
        });
        const allData: PengajuanJapoItem[] = result?.data ?? [];

        // Backend endpoint (ApgController.DatatablePengajuanJapo) ignores start/length/search
        // and always returns the full dataset — filter and page it here instead, same
        // workaround as fetcherDO in ModalDetailDO below.
        let filtered = allData;
        if (params.search) {
          const lowerSearch = params.search.toLowerCase();
          filtered = filtered.filter((item) =>
            Object.values(item).some(
              (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch)
            )
          );
        }

        const paginated = filtered.slice(params.start, params.start + params.length);

        return {
          data: paginated,
          recordsTotal: allData.length,
          recordsFiltered: filtered.length,
        };
      } catch (err: any) {
        addToast({ title: "Error", description: "Gagal memuat data pengajuan", variant: "destructive" });
        return { data: [], recordsTotal: 0, recordsFiltered: 0 };
      }
    },
    [apiTable, addToast]
  );
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pengajuan/jatuh-tempo/page.tsx
git commit -m "fix: paginate/filter Pengajuan Jatuh Tempo table client-side"
```

---

## Task 2: Fix `fetcherRiwayat` (tab "Riwayat Pengajuan")

**Files:**
- Modify: `src/app/pengajuan/jatuh-tempo/page.tsx:551-576`

- [ ] **Step 1: Replace the `fetcherRiwayat` body**

Find this block (page.tsx:551-576):

```tsx
  const fetcherRiwayat = useCallback(
    async (params: DataTableParams) => {
      try {
        const result = await apiTable("/api/Apg/DatatableRiwayatPengajuanJapo", {
          draw: params.draw,
          start: params.start,
          length: params.length,
          search: { value: params.search },
          cmd: "refresh",
          columns: [
            { data: "NoPosto", name: "NoPosto", searchable: true, orderable: true }
          ]
        });
        const data: RiwayatJapoItem[] = result?.data ?? [];
        return { 
          data, 
          recordsTotal: result?.recordsTotal ?? data.length, 
          recordsFiltered: result?.recordsFiltered ?? data.length 
        };
      } catch (err: any) {
        addToast({ title: "Error", description: "Gagal memuat riwayat pengajuan", variant: "destructive" });
        return { data: [], recordsTotal: 0, recordsFiltered: 0 };
      }
    },
    [apiTable, addToast]
  );
```

Replace it with:

```tsx
  const fetcherRiwayat = useCallback(
    async (params: DataTableParams) => {
      try {
        const result = await apiTable("/api/Apg/DatatableRiwayatPengajuanJapo", {
          draw: params.draw,
          start: params.start,
          length: params.length,
          search: { value: params.search },
          cmd: "refresh",
          columns: [
            { data: "NoPosto", name: "NoPosto", searchable: true, orderable: true }
          ]
        });
        const allData: RiwayatJapoItem[] = result?.data ?? [];

        // Backend endpoint (ApgController.DatatableRiwayatPengajuanJapo) ignores
        // start/length/search and always returns the full dataset — filter and page
        // it here instead, same workaround as fetcherDO in ModalDetailDO below.
        let filtered = allData;
        if (params.search) {
          const lowerSearch = params.search.toLowerCase();
          filtered = filtered.filter((item) =>
            Object.values(item).some(
              (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(lowerSearch)
            )
          );
        }

        const paginated = filtered.slice(params.start, params.start + params.length);

        return {
          data: paginated,
          recordsTotal: allData.length,
          recordsFiltered: filtered.length,
        };
      } catch (err: any) {
        addToast({ title: "Error", description: "Gagal memuat riwayat pengajuan", variant: "destructive" });
        return { data: [], recordsTotal: 0, recordsFiltered: 0 };
      }
    },
    [apiTable, addToast]
  );
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pengajuan/jatuh-tempo/page.tsx
git commit -m "fix: paginate/filter Riwayat Pengajuan table client-side"
```

---

## Task 3: Manual Verification

No test framework exists in this repo, so verification is manual in the browser (matches how the rest of the app is verified — see `/verify` skill).

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open the page and check tab "Pengajuan Jatuh Tempo"**

Navigate to `http://localhost:3000/pengajuan/jatuh-tempo`.

Expected:
- The row count shown at bottom left (`X–Y / Z Data`) should be less than or equal to the selected page size (default 25), not the full dataset count in one page.
- "Halaman 1 DARI N" should show `N > 1` if the backend has more than 25 rows for this user's `Transport.kode`.
- Clicking the next-page arrow changes the visible rows.
- Changing "Baris per halaman" to 10/50/100 changes how many rows render.

- [ ] **Step 3: Check search on tab "Pengajuan Jatuh Tempo"**

Type a partial POSTO number (or any value known to exist in a row, e.g. part of `PlantAsalDesc`) into the search box.

Expected: only matching rows show, and the total count at bottom-left drops to the filtered count.

- [ ] **Step 4: Repeat Steps 2-3 on tab "Riwayat Pengajuan"**

Switch to the "Riwayat Pengajuan" tab and confirm the same pagination and search behavior.

- [ ] **Step 5: Confirm "Detail DO" modal still works (regression check)**

Click a POSTO number to open the "Detail DO" modal (`ModalDetailDO`). Confirm its table still paginates correctly — this task doesn't touch `fetcherDO`, but it's the pattern being copied, so a quick sanity check confirms no accidental shared-state regression.

---

## Self-Review Notes

- **Spec coverage:** User asked to fix "data masih keluar semua meskipun sudah di datatable" (all data still shows despite DataTable being in use) on both tabs — Task 1 covers "Pengajuan Jatuh Tempo", Task 2 covers "Riwayat Pengajuan". Both are duplicate sites of the same bug pattern (per the codebase's existing `fetcherDO` precedent), both fixed — no bug left unfixed at a sibling call site.
- **Backend root cause documented but deliberately not touched this pass** — user chose the frontend-only fix to avoid a cross-repo ASP.NET rebuild/deploy. If the dataset grows large enough that shipping the full unpaginated payload over the wire becomes a problem, the real fix is uncommenting the `Skip`/`Take`/`recordsTotal`/`recordsFiltered` logic already sitting (commented out) in `ApgController.cs:82-134` (`DatatablePengajuanJapo`) and `:196-198`+ (`DatatableRiwayatPengajuanJapo`).
- **No placeholders:** both tasks show complete before/after code, not descriptions of changes.
