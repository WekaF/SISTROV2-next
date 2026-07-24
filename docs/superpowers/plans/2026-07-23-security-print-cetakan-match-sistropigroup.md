# Security Print (Cetakan Security Pass) — Match sistropigroup Legacy Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/security/print` (`src/app/security/print/page.tsx`) render byte-for-byte the same visual design and correct data as the legacy ASP.NET "Security Pass" printout (`sistropigroup/SISTROAWESOME/Views/Tiket/PrintSecurity.cshtml`), fixing several data bugs discovered along the way.

**Architecture:** Single-file fix. No new components, no new API routes — `/api/Tiket/DetailData` (already called by this page) already returns every field needed; the current page just reads some of them under the wrong name or doesn't render them at all. All changes are inside `src/app/security/print/page.tsx`.

**Tech Stack:** Next.js 16 (App Router, client component), Tailwind CSS, `jsbarcode`, `qrcode.react`.

**Ground truth used for comparison:**
- `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Views\Tiket\PrintSecurity.cshtml` (legacy markup/logic)
- `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Controllers\TiketController.cs` `PrintSecurity` action (legacy field semantics)
- `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs` `DetailData` action (the actual JSON shape this Next.js page consumes — confirmed field names: `postowilayah` not `wilayah`, `percepatan` is raw `"0"`/`"1"` not text, `revised` exists and is currently unread)
- `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Scripts\plugin\barcode\JsBarcode.all.min.js` (confirmed library defaults: `width:2, height:100`)
- User-provided reference screenshot of the legacy printout (ticket `SISTRO_DEV_CX5XV6nN8_sec1`)

**Confirmed bugs/deviations found (not just cosmetic polish):**
1. `getModa(t.wilayah)` reads a field the API never returns (`DetailData` returns `postowilayah`) — Moda always renders `-`.
2. `t.percepatan` is rendered raw — shows literal `"0"`/`"1"` instead of `"PERCEPATAN"`/`"ZERO ODOL"`.
3. `t.qty` is rendered as a raw number (`12`) instead of Indonesian 2-decimal format (`12,00`).
4. Every data row has `border-b`/`border-b-2` classes; the legacy table has **no borders** between rows.
5. Container uses `font-mono`; legacy/reference uses a plain sans-serif font.
6. Missing "PUPUK INDONESIA HOLDING COMPANY" logo above the title.
7. Missing SISTRO logo + `Printed from sistro website v2 at {date}` footer entirely.
8. Missing conditional "Tiket direvisi : YA" row.
9. Font sizes for Nomor Polisi/Nama Driver/Gudang Muat/Antrian/Pemuatan don't match legacy px values, and Pemuatan/Moda aren't bold like legacy.
10. Barcode height uses `50` instead of the JsBarcode library default `100` that legacy relies on.

---

## File Structure

Only one file changes:

- Modify: `src/app/security/print/page.tsx` — fix the `TicketData` interface, `getModa`, the data table markup, add the header/footer logos, fix barcode config.

No new files. The two logo assets already exist in this repo at `public/images/logo/logocompany.png` (byte-identical to the legacy `assets/images/logocompany.png`) and `public/images/logo/logotiket.jpg` (byte-identical to legacy `assets/images/logotiket.jpg`) — confirmed via file size comparison. Nothing to copy.

---

### Task 1: Fix the data contract — `postowilayah` and `revised`

**Files:**
- Modify: `src/app/security/print/page.tsx:11-32` (interface), `src/app/security/print/page.tsx:107-114` (`getModa`), `src/app/security/print/page.tsx:191-192` (call site)

The `TicketData` interface currently declares a `wilayah` field and calls `getModa(t.wilayah)`. The backend's `/api/Tiket/DetailData` endpoint (`sistropigroup/SISTROAWESOME/api/TiketController.cs:592`) serializes this value as `postowilayah`, not `wilayah` — so today `t.wilayah` is always `undefined` and Moda always falls back to `-`. Also add the `revised` field, which the API already returns (`api/TiketController.cs:583`) but the page never reads.

- [ ] **Step 1: Update the `TicketData` interface**

Current (`src/app/security/print/page.tsx:11-32`):

```tsx
interface TicketData {
  data: {
    bookingno: string;
    tiketno: string;
    nopol: string;
    driver: string;
    wilayah: string;
    qty: number;
    asal: string;
    tujuan: string;
    tanggalString: string;
    shift: string;
    transportString: string;
    posto: string;
    produkString: string;
    gudangtujuan?: string;
    labelantrian?: string;
    percepatan?: string;
    emergencystatus?: string;
    company?: string;
  };
}
```

Replace with:

```tsx
interface TicketData {
  data: {
    bookingno: string;
    tiketno: string;
    nopol: string;
    driver: string;
    postowilayah: string;
    qty: number;
    asal: string;
    tujuan: string;
    tanggalString: string;
    shift: string;
    transportString: string;
    posto: string;
    produkString: string;
    gudangtujuan?: string;
    labelantrian?: string;
    percepatan?: string;
    emergencystatus?: string;
    company?: string;
    revised?: string;
  };
}
```

- [ ] **Step 2: Fix `getModa` to match the legacy switch exactly**

Current (`src/app/security/print/page.tsx:107-114`):

```tsx
  const getModa = (wilayah: string) => {
    switch (wilayah) {
      case "DW1_GP": return "TRUK KE GP";
      case "DW2_INBAG": return "INBAG";
      case "DW2_KONTAINER": return "CONTAINER";
      default: return wilayah || "-";
    }
  };
```

Replace with (case order and exact asterisk spacing copied verbatim from `PrintSecurity.cshtml:101-109`):

```tsx
  const getModa = (postowilayah: string) => {
    switch (postowilayah) {
      case "DW2_KONTAINER": return "*CONTAINER*";
      case "DW1_GP": return "* TRUK KE GP *";
      case "DW2_INBAG": return "* INBAG *";
      default: return "-";
    }
  };
```

- [ ] **Step 3: Verify no other reference to `t.wilayah` remains**

Run:

```bash
grep -n "\.wilayah" src/app/security/print/page.tsx
```

Expected: no matches (the only other usage is the Moda row, fixed in Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/app/security/print/page.tsx
git commit -m "fix(security-print): read postowilayah instead of nonexistent wilayah field"
```

---

### Task 2: Fix page font — remove monospace

**Files:**
- Modify: `src/app/security/print/page.tsx:117`

Legacy has no explicit font-family (browser default sans-serif). The reference screenshot text is clearly proportional, not monospaced. Current code forces `font-mono`.

- [ ] **Step 1: Remove `font-mono` from the container**

Current (`src/app/security/print/page.tsx:117`):

```tsx
    <div className="print-container bg-white text-black font-mono min-h-screen p-2 mx-auto max-w-[80mm]">
```

Replace with:

```tsx
    <div className="print-container bg-white text-black font-sans min-h-screen p-2 mx-auto max-w-[80mm]">
```

- [ ] **Step 2: Commit**

```bash
git add src/app/security/print/page.tsx
git commit -m "fix(security-print): use sans-serif font to match legacy printout"
```

---

### Task 3: Add the "PUPUK INDONESIA HOLDING COMPANY" logo

**Files:**
- Modify: `src/app/security/print/page.tsx:152-153`

Legacy renders `assets/images/logocompany.png` at `width:60mm` centered, with `padding-top:5mm`, immediately above the "SECURITY PASS" title (`PrintSecurity.cshtml:33-37`). The identical asset already exists at `public/images/logo/logocompany.png` in this repo (confirmed same 22768-byte file).

- [ ] **Step 1: Add the logo `<img>` before the title**

Current (`src/app/security/print/page.tsx:152-153`):

```tsx
      <div className="flex flex-col items-center text-center space-y-4">
        <h1 className="text-[30px] font-bold leading-tight">SECURITY PASS</h1>
```

Replace with:

```tsx
      <div className="flex flex-col items-center text-center space-y-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo/logocompany.png"
          alt="Pupuk Indonesia Holding Company"
          style={{ width: "60mm", paddingTop: "5mm" }}
          className="block mx-auto"
        />
        <h1 className="text-[30px] font-bold leading-tight">SECURITY PASS</h1>
```

- [ ] **Step 2: Visually verify**

Run the dev server if not already running, then open the print page for any valid booking number and confirm the logo renders above "SECURITY PASS":

```bash
npm run dev
```

Navigate to `http://localhost:3000/security/print?bookingno=<a-valid-bookingno>` and confirm the Pupuk Indonesia logo appears at the top, centered, roughly 60mm wide.

- [ ] **Step 3: Commit**

```bash
git add src/app/security/print/page.tsx
git commit -m "feat(security-print): add Pupuk Indonesia Holding Company header logo"
```

---

### Task 4: Rewrite the data table — remove borders, fix Moda/Qty/Pemuatan, add Tiket direvisi row, fix font sizes

**Files:**
- Modify: `src/app/security/print/page.tsx:175-238`

This is the biggest task: the legacy table (`PrintSecurity.cshtml:73-167`) has **no row borders at all**, formats Qty as a 2-decimal Indonesian number, transforms `percepatan` from a raw `"0"`/`"1"` flag into `"PERCEPATAN"`/`"ZERO ODOL"` text (the transform legacy's controller does server-side at `Controllers/TiketController.cs:223`, and which this repo's own `src/app/scan/tiket/page.tsx:787` already does correctly for a different print view — reuse that same expression here), adds a conditional "Tiket direvisi" row, and uses specific px font sizes per field (`Nomor Polisi`/`Nama Driver`: 16px, `Gudang Muat`: 14px, `Antrian`: 16px, `Pemuatan`: 16px bold, `Moda`: bold).

- [ ] **Step 1: Replace the entire data table block**

Current (`src/app/security/print/page.tsx:175-238`):

```tsx
        {/* Data Table */}
        <table className="w-full text-left text-[12px] border-collapse">
          <tbody>
            <tr className="border-b-2 border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Nomor Tiket</td>
              <td className="py-1">: {ticketNo}</td>
            </tr>
            <tr className="border-b-2 border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Nomor Polisi</td>
              <td className="py-1 font-black text-[18px]">: {t.nopol}</td>
            </tr>
            <tr className="border-b-2 border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Nama Driver</td>
              <td className="py-1 font-black text-[18px]">: {t.driver}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Moda</td>
              <td className="py-1">: {getModa(t.wilayah)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Qty (Ton)</td>
              <td className="py-1">: {t.qty}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Asal</td>
              <td className="py-1">: {t.asal}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">GP Tujuan</td>
              <td className="py-1">: {t.tujuan}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Tgl (Shift)</td>
              <td className="py-1">: {t.tanggalString} (Shift {t.shift})</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Transport</td>
              <td className="py-1">: {t.transportString}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">POSTO</td>
              <td className="py-1">: {t.posto}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Produk</td>
              <td className="py-1">: {t.produkString}</td>
            </tr>
            {t.gudangtujuan && (
              <tr className="border-b-2 border-black">
                <td className="py-1 pr-2 whitespace-nowrap font-bold">Gudang Muat</td>
                <td className="py-1 font-black">: {t.gudangtujuan}</td>
              </tr>
            )}
            {t.company === "PKC" && t.labelantrian && (
              <tr className="border-b border-black">
                <td className="py-1 pr-2 whitespace-nowrap">Antrian</td>
                <td className="py-1 font-bold">: {t.labelantrian}</td>
              </tr>
            )}
            <tr className="border-b border-black">
              <td className="py-1 pr-2 whitespace-nowrap">Pemuatan</td>
              <td className="py-1">: {t.percepatan}</td>
            </tr>
          </tbody>
        </table>
```

Replace with:

```tsx
        {/* Data Table */}
        <table className="w-full text-left text-[12px] border-collapse">
          <tbody>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap w-[30%]">Nomor Tiket</td>
              <td className="py-1">: {ticketNo}</td>
            </tr>
            {t.revised && (
              <tr>
                <td className="py-1 pr-2 whitespace-nowrap">Tiket direvisi</td>
                <td className="py-1">: YA</td>
              </tr>
            )}
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">Nomor Polisi</td>
              <td className="py-1">: <strong className="text-[16px]">{t.nopol}</strong></td>
            </tr>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">Nama Driver</td>
              <td className="py-1">: <strong className="text-[16px]">{t.driver}</strong></td>
            </tr>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">Moda</td>
              <td className="py-1">: <strong>{getModa(t.postowilayah)}</strong></td>
            </tr>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">Qty (Ton)</td>
              <td className="py-1">: {Number(t.qty).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">Asal</td>
              <td className="py-1">: {t.asal}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">GP Tujuan</td>
              <td className="py-1">: {t.tujuan}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">Tgl (Shift)</td>
              <td className="py-1">: {t.tanggalString} (Shift {t.shift})</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">Transport</td>
              <td className="py-1">: {t.transportString}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">POSTO</td>
              <td className="py-1">: {t.posto}</td>
            </tr>
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">Produk</td>
              <td className="py-1">: {t.produkString}</td>
            </tr>
            {t.gudangtujuan && (
              <tr>
                <td className="py-1 pr-2 whitespace-nowrap">Gudang Muat</td>
                <td className="py-1">: <strong className="text-[14px]">{t.gudangtujuan}</strong></td>
              </tr>
            )}
            {t.company === "PKC" && t.labelantrian && (
              <tr>
                <td className="py-1 pr-2 whitespace-nowrap">Antrian</td>
                <td className="py-1">: <strong className="text-[16px]">{t.labelantrian}</strong></td>
              </tr>
            )}
            <tr>
              <td className="py-1 pr-2 whitespace-nowrap">Pemuatan</td>
              <td className="py-1">: <strong className="text-[16px]">{t.percepatan === "1" ? "PERCEPATAN" : "ZERO ODOL"}</strong></td>
            </tr>
          </tbody>
        </table>
```

- [ ] **Step 2: Verify no data row keeps a border class**

Run:

```bash
grep -n "border-b" src/app/security/print/page.tsx
```

Expected: no matches inside the data table (the emergency banner's `border-t-2`/`border-b-2` divider lines, a few sections above the table, are untouched and expected to remain).

- [ ] **Step 3: Manual verification**

With the dev server running, open `http://localhost:3000/security/print?bookingno=<a-valid-bookingno>` and confirm:
- No horizontal lines between data rows.
- Qty shows two decimals with a comma, e.g. `12,00`.
- Moda shows e.g. `* TRUK KE GP *` in bold (not `-`).
- Pemuatan shows `PERCEPATAN` or `ZERO ODOL`, never `0`/`1`.
- If testing against a revised ticket, "Tiket direvisi : YA" appears right after "Nomor Tiket".

- [ ] **Step 4: Commit**

```bash
git add src/app/security/print/page.tsx
git commit -m "fix(security-print): remove row borders, fix Moda/Qty/Pemuatan data bugs, add Tiket direvisi row"
```

---

### Task 5: Add the SISTRO footer logo, print timestamp, and fix barcode height

**Files:**
- Modify: `src/app/security/print/page.tsx:69-85` (barcode config), `src/app/security/print/page.tsx:240-244` (barcode + footer section)

Legacy (`PrintSecurity.cshtml:169-190`) renders, after the barcode: a 1px divider, the SISTRO logo (`assets/images/logotiket.jpg`, `width:40mm`, `padding-top:3mm`), then `Printed from sistro website v2 at {dd MMMM yyyy HH:mm}` — .NET's `id-ID` culture renders the `:` time separator as `.`, producing e.g. `10.01` (confirmed against the reference screenshot). The identical logo asset already exists at `public/images/logo/logotiket.jpg` (confirmed same 49622-byte file). This entire footer section is currently missing from the Next.js page. The barcode itself must also switch from `height: 50` to `height: 100` — the legacy call passes no options object at all (`PrintSecurity.cshtml:198`, `JsBarcode("#barcode", bookingcode)`), which means it uses the library's own defaults; those defaults are confirmed directly from the bundled library file (`JsBarcode.all.min.js`) to be `width:2, height:100`.

- [ ] **Step 1: Fix barcode height to match the JsBarcode library default legacy relies on**

Current (`src/app/security/print/page.tsx:69-85`):

```tsx
  useEffect(() => {
    const ticketNo = data?.data?.tiketno || data?.data?.bookingno || bookingno || "";
    if (ticketNo && barcodeRef.current) {
      JsBarcode(barcodeRef.current, ticketNo, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true,
      });
      
      // Auto print
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [data, bookingno]);
```

Replace with:

```tsx
  useEffect(() => {
    const ticketNo = data?.data?.tiketno || data?.data?.bookingno || bookingno || "";
    if (ticketNo && barcodeRef.current) {
      JsBarcode(barcodeRef.current, ticketNo, {
        format: "CODE128",
        width: 2,
        height: 100,
        displayValue: true,
      });
      
      // Auto print
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [data, bookingno]);
```

- [ ] **Step 2: Add the SISTRO logo + printed-at footer after the barcode**

Current (`src/app/security/print/page.tsx:240-244`):

```tsx
        {/* Barcode */}
        <div className="w-full flex justify-center py-4 overflow-hidden">
          <svg ref={barcodeRef} className="max-w-full"></svg>
        </div>

```

Replace with:

```tsx
        {/* Barcode */}
        <div className="w-full flex justify-center py-4 overflow-hidden">
          <svg ref={barcodeRef} className="max-w-full"></svg>
        </div>

        {/* Divider + SISTRO footer logo */}
        <div className="w-full border-b border-black"></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo/logotiket.jpg"
          alt="SISTRO - Sistem Scheduling Truck Online"
          style={{ width: "40mm", paddingTop: "3mm" }}
          className="block mx-auto"
        />

        {/* Printed-at timestamp */}
        <div className="w-full text-left text-[0.6rem]">
          Printed from sistro website v2 at{" "}
          {new Date()
            .toLocaleString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
            .replace(" pukul ", " ")}
        </div>

```

- [ ] **Step 3: Manual verification**

With the dev server running, open `http://localhost:3000/security/print?bookingno=<a-valid-bookingno>` and confirm:
- A thin horizontal divider appears right below the barcode.
- The SISTRO logo (wordmark with a truck icon inside the "O") appears centered below the divider, roughly 40mm wide.
- Below that, left-aligned small text reads `Printed from sistro website v2 at <today's date> <HH.MM>` with a dot, not a colon, between hour and minute (e.g. `23 Juli 2026 10.01`).
- The barcode itself looks taller/more prominent than before (height 100 vs the old 50).

- [ ] **Step 4: Commit**

```bash
git add src/app/security/print/page.tsx
git commit -m "feat(security-print): add SISTRO footer logo and printed-at timestamp, fix barcode height"
```

---

### Task 6: Full side-by-side verification against the reference screenshot

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server (skip if already running)**

```bash
npm run dev
```

- [ ] **Step 2: Print-preview the page**

Navigate to `http://localhost:3000/security/print?bookingno=<a-valid-bookingno>` for a ticket that has been scanned/validated by a Security-role account (this page requires session auth — log in as a user with the `Security` role first, or whichever role your test data uses, per `src/middleware.ts` RBAC rules). Use the browser's Print Preview (Ctrl+P) rather than relying only on the on-screen layout, since the `@media print` rules in this file (lines ~118-150) change spacing.

- [ ] **Step 3: Compare field-by-field against the reference screenshot**

Confirm every row matches, top to bottom: Pupuk Indonesia logo → SECURITY PASS → QR code → (EMERGENCY banner if applicable) → Nomor Tiket → (Tiket direvisi if applicable) → Nomor Polisi (bold, 16px) → Nama Driver (bold, 16px) → Moda (bold, asterisked) → Qty (Ton) (2 decimals, comma) → Asal → GP Tujuan → Tgl (Shift) → Transport → POSTO → Produk → (Gudang Muat if applicable, bold, 14px) → (Antrian if PKC + present, bold, 16px) → Pemuatan (bold, 16px, `PERCEPATAN`/`ZERO ODOL` text) → barcode (CODE128, ticket number printed below it) → divider → SISTRO logo → `Printed from sistro website v2 at ...` footer with dot time separator.

- [ ] **Step 4: Check the two conditional edge cases if test data allows**

- A ticket with `emergencystatus` set: confirm the red EMERGENCY banner with top/bottom borders appears between the QR code and the data table.
- A ticket with `company === "PKC"` and `labelantrian` set: confirm the Antrian row appears between Gudang Muat and Pemuatan.

No commit for this task — it's verification only. If any mismatch is found, return to the relevant task above and fix it there (don't patch ad hoc here).

---

### Task 7: Fix the same `wilayah`/`postowilayah` bug at its duplicate site

**Files:**
- Modify: `src/components/ticket/TicketPrintDocument.tsx:227`

Discovered during code-quality review of Task 1: `TicketPrintDocument.tsx` (a different print view — the regular ticket print, not the security pass) calls the *same* `/api/Tiket/DetailData` endpoint and has the identical bug: `data.wilayah === "DW2_KONTAINER"` reads a field the API never returns (it returns `postowilayah`, confirmed in Task 1 against `sistropigroup/SISTROAWESOME/api/TiketController.cs:592`), so the "Container" badge on that print view never renders. Same root cause, same fix, different file.

- [ ] **Step 1: Fix the field name**

Current (`src/components/ticket/TicketPrintDocument.tsx:227`):

```tsx
                        {data.wilayah === "DW2_KONTAINER" && <span className="bg-rose-500 text-white px-2 py-0.5 ml-3 text-[10px] tracking-normal font-black uppercase align-middle">Container</span>}
```

Replace with:

```tsx
                        {data.postowilayah === "DW2_KONTAINER" && <span className="bg-rose-500 text-white px-2 py-0.5 ml-3 text-[10px] tracking-normal font-black uppercase align-middle">Container</span>}
```

- [ ] **Step 2: Confirm no other reference to `.wilayah` remains in this file**

```bash
grep -n "\.wilayah\b" src/components/ticket/TicketPrintDocument.tsx
```

Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add src/components/ticket/TicketPrintDocument.tsx
git commit -m "fix(ticket-print): read postowilayah instead of nonexistent wilayah field"
```

---

## Self-Review Notes

- **Spec coverage:** every deviation listed in the "Confirmed bugs/deviations found" section above maps to a task (font → Task 2, borders/Moda/Qty/Pemuatan/revised/font-sizes → Task 4, both logos + footer → Tasks 3 & 5, barcode height → Task 5).
- **Not ported, deliberately:** the legacy `ViewBag.times` shift-schedule block (`PrintSecurity.cshtml:169-171`, e.g. "Shift 1: 07:00:00 WIB - 15:00:00 WIB") is intentionally excluded — it isn't visible in the user's reference screenshot (the test ticket's company had no matching `Mst_Shift` rows, so it rendered empty), and porting it would require a new backend field the current `DetailData` API doesn't expose. Also not ported: the dead `ViewBag.count` block (`PrintSecurity.cshtml:46-53`) — confirmed via the legacy controller that it's never actually set, so it's dead code, not a real feature.
- **Type consistency:** `TicketData.data.postowilayah` (Task 1) is the only interface field renamed; `getModa` (Task 1) and its call site (Task 4) both updated together so there's no leftover reference to `wilayah`.
