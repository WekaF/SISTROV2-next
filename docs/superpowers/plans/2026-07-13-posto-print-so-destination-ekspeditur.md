# POSTO Print: Show Ekspeditur Name for SO Destination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the POSTO print page (`/posto/print/[id]`), when the POSTO is an SO (Sales Order — i.e. `noposto` does not start with `"5"`), the "Tujuan Barang" (destination) block must show the ekspeditur/transporter name instead of the destination warehouse.

**Architecture:** Frontend-only change in `BookingPrintDocument.tsx`. The `/api/POSTO/PrintData` response already includes `transportString` (the transporter/ekspeditur name, sourced from `Transport1.nama` on the backend) alongside the existing `tujuanString`/`tujuanAlamat`/`tujuanKab`/`tujuanProv` destination-warehouse fields — no backend change is needed. Add a client-side `isSO` check using the same `noposto.charAt(0) !== "5"` heuristic already used elsewhere in this codebase (`src/components/ticket/TicketActions.tsx:93,256`), and branch the "Tujuan Barang" table on it.

**Tech Stack:** Next.js 16, React, TypeScript.

---

### Task 1: Swap destination for ekspeditur name on SO-type POSTO prints

**Files:**
- Modify: `src/components/ticket/BookingPrintDocument.tsx:58` (add derived `isSO` constant)
- Modify: `src/components/ticket/BookingPrintDocument.tsx:268-289` (branch the "Tujuan Barang" table body)

**Background:**

The print document is rendered from the JSON returned by `GET /aspnet-proxy/api/POSTO/PrintData?noposto=...` (proxied backend controller: `sistropigroup/SISTROAWESOME/api/POSTOController.cs:706-771`). That response already contains everything needed:

- `data.noposto` — the POSTO number. Its first character distinguishes transaction type: `"5"` prefix = STO (Stock Transport Order, destination is a real warehouse), anything else = SO (Sales Order, "destination" should be the transporter/ekspeditur).
- `data.transportString` — the transporter/ekspeditur company name (`Transport1.nama` on the backend). This is the exact same field already used above in the "Kepada Yth" block (`BookingPrintDocument.tsx:246`) and in the signature row (`BookingPrintDocument.tsx:373`).
- `data.tujuanString` / `data.tujuanAlamat` / `data.tujuanKab` / `data.tujuanProv` — destination warehouse fields (`Gudang1` navigation property on the backend). These stay as-is for STO prints.

This mirrors an existing heuristic already used in `src/components/ticket/TicketActions.tsx:93` (`const isSOPosto = !!posto && posto.charAt(0) !== "5";`) and `TicketActions.tsx:256` (`const isSO = postoNum.substring(0, 1) !== "5";`) — same rule, new place.

- [ ] **Step 1: Add the `isSO` derived constant**

In `src/components/ticket/BookingPrintDocument.tsx`, immediately after the existing `qrValue` line (currently line 58):

```tsx
  const qrValue = `${typeof window !== 'undefined' ? window.location.origin : ''}/DocPub/POSTO?noposto=${data.guid}`;

  // POSTO numbers not starting with "5" are SO (Sales Order) transactions — same heuristic
  // used in src/components/ticket/TicketActions.tsx. For SO, "Tujuan Barang" shows the
  // ekspeditur (transporter) name instead of the destination warehouse.
  const isSO = !!data.noposto && data.noposto.charAt(0) !== "5";
```

- [ ] **Step 2: Branch the "Tujuan Barang" table on `isSO`**

Replace the existing block (currently `BookingPrintDocument.tsx:268-289`):

```tsx
              <table border={0}>
                <tbody>
                  <tr><td><b>Tujuan Barang: </b></td></tr>
                  {data.bagian === "POPELABUHAN" ? (
                    <>
                      <tr><td>{data.tujuanString}</td></tr>
                      {data.tujuanAlamat && <tr><td>{data.tujuanAlamat}</td></tr>}
                      {data.kapal && <tr><td>Kapal {data.kapal}</td></tr>}
                      {data.kotatujuan && <tr><td>{data.kotatujuan}</td></tr>}
                    </>
                  ) : (
                    <>
                      <tr><td>{data.tujuanString}</td></tr>
                      {data.tujuanAlamat && <tr><td>{data.tujuanAlamat}</td></tr>}
                      {data.tujuanKab && <tr><td>{data.tujuanKab}</td></tr>}
                      {data.tujuanProv && <tr><td>{data.tujuanProv}</td></tr>}
                    </>
                  )}
                  <tr><td>Indonesia</td></tr>
                </tbody>
              </table>
```

with:

```tsx
              <table border={0}>
                <tbody>
                  <tr><td><b>Tujuan Barang: </b></td></tr>
                  {isSO ? (
                    <tr><td>{data.transportString}</td></tr>
                  ) : data.bagian === "POPELABUHAN" ? (
                    <>
                      <tr><td>{data.tujuanString}</td></tr>
                      {data.tujuanAlamat && <tr><td>{data.tujuanAlamat}</td></tr>}
                      {data.kapal && <tr><td>Kapal {data.kapal}</td></tr>}
                      {data.kotatujuan && <tr><td>{data.kotatujuan}</td></tr>}
                    </>
                  ) : (
                    <>
                      <tr><td>{data.tujuanString}</td></tr>
                      {data.tujuanAlamat && <tr><td>{data.tujuanAlamat}</td></tr>}
                      {data.tujuanKab && <tr><td>{data.tujuanKab}</td></tr>}
                      {data.tujuanProv && <tr><td>{data.tujuanProv}</td></tr>}
                    </>
                  )}
                  <tr><td>Indonesia</td></tr>
                </tbody>
              </table>
```

This produces exactly the requested output for SO POSTOs:

```
Tujuan Barang:
Transport Dummy
Indonesia
```

...and leaves STO (`"5"`-prefixed) POSTOs unchanged (still shows `Gudang1`-derived warehouse address, `POPELABUHAN` branch untouched).

- [ ] **Step 3: Manual verification (no test framework exists in this repo — see note below)**

Start the frontend (from `SISTROV2-next`):

```bash
npm run dev
```

Verify the STO case is unchanged — open the URL from the bug report (this POSTO's `noposto` starts with `"5"`, confirmed by it currently rendering `Gudang1`-derived destination text):

```
http://localhost:3000/posto/print/f6bad347-4735-401a-ae4f-4ca041c2396a
```

Expected: "Tujuan Barang" still shows `DC PADANG I` / address / kab / prov — unchanged from before.

Then verify the SO case — go to `http://localhost:3000/so`, pick any row (its `noposto` will not start with `"5"`), click the print action (opens `/posto/print/{guid}` in a new tab). Confirm "Tujuan Barang" now shows only the transporter name (matching the value shown in "Kepada Yth" and the signature row on the same document) followed by "Indonesia", with no warehouse address/kab/prov lines.

Note: this repository has no test files anywhere (`*.test.*` search returns nothing) and no test runner configured — this is a display-only React component with no unit test scaffold, so this plan does not add one. Manual verification in the browser is the existing project convention for UI changes.

- [ ] **Step 4: Commit**

```bash
git add src/components/ticket/BookingPrintDocument.tsx
git commit -m "fix: show ekspeditur name instead of destination warehouse on SO posto prints"
```

---

## Self-Review Notes

- **Spec coverage:** Single requirement from the bug report ("SO atau selain angka 5 didepan → tujuan diganti dengan nama ekspeditur, bukan gudang tujuan") — covered by Task 1 in full, including the exact example output format ("Transport Dummy" / "Indonesia").
- **No backend change needed:** confirmed via investigation that `PrintData` (`POSTOController.cs:706-771`) already returns `transportString` (ekspeditur) unconditionally alongside `tujuanString` (warehouse) — no new field or backend deploy required.
- **Consistency:** reuses the exact `charAt(0) !== "5"` heuristic already established in `TicketActions.tsx` rather than inventing a new one.
