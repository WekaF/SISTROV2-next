# Pengajuan Jatuh Tempo: Direct APG Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/pengajuan/jatuh-tempo` call the external Pupuk Indonesia APG API (`apg-dev.pupuk-indonesia.com`) directly from Next.js server-side routes, bypassing the ASP.NET backend hop that currently fails DNS resolution to that host.

**Architecture:** Five new Next.js API routes under `src/app/api/pengajuan-jatuh-tempo/*` replicate the shape of ASP.NET's `ApgController` → `JapoServices` → `TokenServices`: a module-singleton token cache (`src/lib/apg/token.ts`) fetches/caches a bearer token from APG's `generatetoken` endpoint, a thin fetch wrapper (`src/lib/apg/client.ts`) attaches that token and retries once on 401, and each route calls one APG endpoint and returns the response in the exact shape `page.tsx` already expects. The page's fetchers swap their URLs from `/aspnet-proxy/api/Apg/*` to the new local routes and drop the now-unused `useApi` hook.

**Tech Stack:** Next.js 16 App Router route handlers, NextAuth session (`getServerSession`), native `fetch`/`FormData` (Node 18+ runtime).

**Reference:** design spec at `docs/superpowers/specs/2026-07-20-pengajuan-jatuh-tempo-direct-apg-design.md`.

**Verified against the live APG API during design** (via `curl`, using the same credentials already present in `sistropigroup/SISTROAWESOME/Apg/Services/TokenServices.cs`):
- `POST https://apg-dev.pupuk-indonesia.com/generatetoken` — reachable, returns `{access_token, token_type, expires_in, refresh_token, ...}`.
- `GET .../inv.api/PurchaseOrderSTO/GetListPengajuanJatuhTempo?vendorcode=1000022058` — returns a raw JSON array with **PascalCase** fields (`NoPosto`, `TglPosto`, `TotalKuantumPO`, ...) — matches `page.tsx`'s `PengajuanJapoItem` field names exactly, byte for byte. No remapping needed for this endpoint.
- `GET .../inv.api/PurchaseOrderSTO/GetListRiwayatPengajuanJatuhTempo?vendorcode=1000022058` — same PascalCase shape.
- `GET .../inv.api/PurchaseOrderSTO/GetPOSTOJatuhTempoDetailDO?noposto=5520056052` — returns `{"data": [...PascalCase items], "totalDenda": 0.0, "isAllowPrint": false}`. **Note the casing split**: the array items are PascalCase, but the two summary fields are **camelCase** (`totalDenda`, `isAllowPrint`) at the top level. `page.tsx`'s `fetcherDO` reads `json?.totaldenda` and `json?.iscanprint` (all-lowercase) — that lowercasing was done by ASP.NET's own wrapper (`ApgController.DatatableDoPengajuanJapo` returns `new { data, totaldenda = totalDenda, iscanprint = isAllowPrint }`), not by APG. Task 6 below reproduces that same rename.
- `SavePengajuanJatuhTempo` (write) and `printdendarealisasiposto` (PDF) were **not** empirically probed — they mutate/generate real records, so Task 7 and Task 8 are built from reading `JapoServices.cs`'s existing behavior and verified manually in Task 9 instead.

---

### Task 1: Add APG environment variables

**Files:**
- Modify: `.env.local` (gitignored — not committed)

- [ ] **Step 1: Append the APG env vars**

Open `.env.local` and add these lines (values copied from `sistropigroup/SISTROAWESOME/Web.config:68` and `TokenServices.cs:36-37` — same dev-environment credential already used by the ASP.NET backend):

```
# APG external API (direct integration, bypasses ASP.NET backend)
APG_BASE_URL=https://apg-dev.pupuk-indonesia.com/
APG_USERNAME=ATMIN_SISTRO
APG_PASSWORD=ATMIN$1$TRoWKWK
```

- [ ] **Step 2: Verify the file was updated**

Run: `grep APG_ .env.local`
Expected: the three lines above printed back.

No commit — `.env.local` is gitignored (`.gitignore:34`).

---

### Task 2: APG token cache module

**Files:**
- Create: `src/lib/apg/token.ts`

- [ ] **Step 1: Write the module**

```typescript
// src/lib/apg/token.ts
const APG_BASE_URL = process.env.APG_BASE_URL || "https://apg-dev.pupuk-indonesia.com/";

interface ApgTokenResponse {
  access_token: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let cachedExpiry = 0; // epoch ms

async function fetchApgToken(): Promise<string> {
  const username = process.env.APG_USERNAME;
  const password = process.env.APG_PASSWORD;
  if (!username || !password) {
    throw new Error("APG_USERNAME/APG_PASSWORD is not configured");
  }

  const body = new URLSearchParams({
    username,
    password,
    grant_type: "password",
    client_id: "SISTRO-WEB",
    useRefreshTokens: "true",
  });

  const res = await fetch(`${APG_BASE_URL}generatetoken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`APG generatetoken failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as ApgTokenResponse;
  cachedToken = json.access_token;
  // 60s safety margin so a token doesn't expire mid-request.
  cachedExpiry = Date.now() + (json.expires_in - 60) * 1000;
  return cachedToken;
}

export async function getApgToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < cachedExpiry) {
    return cachedToken;
  }
  return fetchApgToken();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/lib/apg/token.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/apg/token.ts
git commit -m "feat: add APG token cache for direct APG integration"
```

---

### Task 3: APG fetch client

**Files:**
- Create: `src/lib/apg/client.ts`

- [ ] **Step 1: Write the module**

```typescript
// src/lib/apg/client.ts
import { getApgToken } from "./token";

const APG_BASE_URL = process.env.APG_BASE_URL || "https://apg-dev.pupuk-indonesia.com/";

async function withAuthRetry(
  fn: (token: string) => Promise<Response>
): Promise<Response> {
  const token = await getApgToken();
  let res = await fn(token);
  if (res.status === 401) {
    const freshToken = await getApgToken(true);
    res = await fn(freshToken);
  }
  return res;
}

/** GET request, parses JSON response. */
export async function apgGet(path: string): Promise<any> {
  const res = await withAuthRetry((token) =>
    fetch(`${APG_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`APG GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

/** POST multipart/form-data, returns the raw response body as text. */
export async function apgPostMultipartRaw(
  path: string,
  form: FormData
): Promise<string> {
  const res = await withAuthRetry((token) =>
    fetch(`${APG_BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`APG POST ${path} failed: ${res.status} ${text}`);
  }
  return res.text();
}

/** POST a JSON body, returns the raw response bytes (for PDF endpoints). */
export async function apgPostForBytes(
  path: string,
  body: object
): Promise<ArrayBuffer> {
  const res = await withAuthRetry((token) =>
    fetch(`${APG_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`APG POST ${path} failed: ${res.status} ${text}`);
  }
  return res.arrayBuffer();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/lib/apg/client.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/apg/client.ts
git commit -m "feat: add APG fetch client with 401 retry"
```

---

### Task 4: List routes (aktif + riwayat)

**Files:**
- Create: `src/app/api/pengajuan-jatuh-tempo/aktif/route.ts`
- Create: `src/app/api/pengajuan-jatuh-tempo/riwayat/route.ts`

- [ ] **Step 1: Write the aktif route**

```typescript
// src/app/api/pengajuan-jatuh-tempo/aktif/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apgGet } from "@/lib/apg/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username || !user?.companyCode) {
    return NextResponse.json({ data: "", error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await apgGet(
      `inv.api/PurchaseOrderSTO/GetListPengajuanJatuhTempo?vendorcode=${encodeURIComponent(user.companyCode)}`
    );
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { data: "", error: "Failed to fetch data", details: err.message },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 2: Write the riwayat route**

```typescript
// src/app/api/pengajuan-jatuh-tempo/riwayat/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apgGet } from "@/lib/apg/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username || !user?.companyCode) {
    return NextResponse.json({ data: "", error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await apgGet(
      `inv.api/PurchaseOrderSTO/GetListRiwayatPengajuanJatuhTempo?vendorcode=${encodeURIComponent(user.companyCode)}`
    );
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { data: "", error: "Failed to fetch data", details: err.message },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing either new file.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/pengajuan-jatuh-tempo/aktif/route.ts src/app/api/pengajuan-jatuh-tempo/riwayat/route.ts
git commit -m "feat: add direct-APG list routes for pengajuan jatuh tempo"
```

---

### Task 5: DO detail route

**Files:**
- Create: `src/app/api/pengajuan-jatuh-tempo/do/route.ts`

- [ ] **Step 1: Write the route**

Reproduces the `totalDenda`→`totaldenda` / `isAllowPrint`→`iscanprint` rename that ASP.NET's `DatatableDoPengajuanJapo` currently does (see the "Verified against the live APG API" note in the plan header — APG itself returns camelCase `totalDenda`/`isAllowPrint`, but `page.tsx`'s `fetcherDO` reads all-lowercase `totaldenda`/`iscanprint`).

```typescript
// src/app/api/pengajuan-jatuh-tempo/do/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apgGet } from "@/lib/apg/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username) {
    return NextResponse.json({ data: "", error: "Unauthorized" }, { status: 401 });
  }

  const noposto = req.nextUrl.searchParams.get("noposto");
  if (!noposto) {
    return NextResponse.json({ data: "", error: "noposto is required" }, { status: 400 });
  }

  try {
    const result = await apgGet(
      `inv.api/PurchaseOrderSTO/GetPOSTOJatuhTempoDetailDO?noposto=${encodeURIComponent(noposto)}`
    );
    return NextResponse.json({
      data: result.data,
      totaldenda: result.totalDenda,
      iscanprint: result.isAllowPrint,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: "", error: "Failed to fetch data", details: err.message },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/app/api/pengajuan-jatuh-tempo/do/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pengajuan-jatuh-tempo/do/route.ts
git commit -m "feat: add direct-APG DO detail route for pengajuan jatuh tempo"
```

---

### Task 6: Save (multipart upload) route

**Files:**
- Create: `src/app/api/pengajuan-jatuh-tempo/save/route.ts`

- [ ] **Step 1: Write the route**

Mirrors `JapoServices.SavePengajuanJapo` — forwards the `data` JSON field and `file` upload as multipart to APG, and returns the raw response text wrapped in `{ response }` (the shape `page.tsx`'s `handleSubmit` already `JSON.parse`s and reads `.Success`/`.Message` from).

```typescript
// src/app/api/pengajuan-jatuh-tempo/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apgPostMultipartRaw } from "@/lib/apg/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username) {
    return NextResponse.json({ success: false, Message: "Unauthorized" }, { status: 401 });
  }

  try {
    const incoming = await req.formData();
    const dataField = incoming.get("data");
    const file = incoming.get("file");

    if (typeof dataField !== "string") {
      return NextResponse.json({ success: false, Message: "Missing data field" }, { status: 400 });
    }

    const outgoing = new FormData();
    outgoing.append("data", dataField);
    if (file instanceof File) {
      outgoing.append("file", file, file.name);
    }

    const response = await apgPostMultipartRaw(
      "inv.api/PurchaseOrderSTO/SavePengajuanJatuhTempo",
      outgoing
    );
    return NextResponse.json({ response });
  } catch (err: any) {
    return NextResponse.json({ success: false, Message: err.message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/app/api/pengajuan-jatuh-tempo/save/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pengajuan-jatuh-tempo/save/route.ts
git commit -m "feat: add direct-APG save route for pengajuan jatuh tempo"
```

---

### Task 7: Print invoice route

**Files:**
- Create: `src/app/api/pengajuan-jatuh-tempo/print/route.ts`

- [ ] **Step 1: Write the route**

Mirrors `JapoServices.PrintInvoice` / `ApgController.PrintInvoiceDoPosto` — POSTs `{ noposto }` as JSON to APG, returns the PDF bytes with `application/pdf` content type.

```typescript
// src/app/api/pengajuan-jatuh-tempo/print/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apgPostForBytes } from "@/lib/apg/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const form = await req.formData();
  const noposto = form.get("noposto");
  if (typeof noposto !== "string") {
    return new NextResponse("noposto is required", { status: 400 });
  }

  try {
    const pdfBytes = await apgPostForBytes(
      "inv.api/purchaseordersto/printdendarealisasiposto",
      { noposto }
    );
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="Invoice.pdf"',
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 502 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/app/api/pengajuan-jatuh-tempo/print/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pengajuan-jatuh-tempo/print/route.ts
git commit -m "feat: add direct-APG print-invoice route for pengajuan jatuh tempo"
```

---

### Task 8: Rewire `page.tsx` to the new routes

**Files:**
- Modify: `src/app/pengajuan/jatuh-tempo/page.tsx`

- [ ] **Step 1: Remove the `useApi` import**

Find (line 19):
```typescript
import { useApi } from "@/hooks/use-api";
```
Delete this line entirely — no code in this file needs `apiFetch`/`apiTable` after this task.

- [ ] **Step 2: Rewire `ModalPengajuan`'s submit**

Find:
```typescript
function ModalPengajuan({ item, onClose, onSuccess }: ModalPengajuanProps) {
  const { apiFetch } = useApi();
  const { addToast } = useToast();
```
Replace with:
```typescript
function ModalPengajuan({ item, onClose, onSuccess }: ModalPengajuanProps) {
  const { addToast } = useToast();
```

Find:
```typescript
      const res = await apiFetch("/api/Apg/SavePengajuanJapoEks", {
        method: "POST",
        body: formData,
      });
```
Replace with:
```typescript
      const res = await fetch("/api/pengajuan-jatuh-tempo/save", {
        method: "POST",
        body: formData,
      });
```

- [ ] **Step 3: Rewire `ModalDetailDO`'s fetch + print**

Find:
```typescript
function ModalDetailDO({ noPosto, onClose }: ModalDetailDOProps) {
  const { apiFetch, apiTable } = useApi();
  const { addToast } = useToast();
```
Replace with:
```typescript
function ModalDetailDO({ noPosto, onClose }: ModalDetailDOProps) {
  const { addToast } = useToast();
```

Find:
```typescript
  const fetcherDO = useCallback(async (params: DataTableParams) => {
    try {
      const res = await apiFetch("/api/Apg/DatatableDoPengajuanJapo", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `noposto=${encodeURIComponent(noPosto)}`,
      });
      const json = await res.json();
```
Replace with:
```typescript
  const fetcherDO = useCallback(async (params: DataTableParams) => {
    try {
      const res = await fetch(
        `/api/pengajuan-jatuh-tempo/do?noposto=${encodeURIComponent(noPosto)}`
      );
      const json = await res.json();
```

Find:
```typescript
      const res = await apiFetch("/api/Apg/PrintInvoiceDoPosto", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `noposto=${encodeURIComponent(JSON.stringify(noPosto))}`,
      });
```
Replace with:
```typescript
      const res = await fetch("/api/pengajuan-jatuh-tempo/print", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `noposto=${encodeURIComponent(noPosto)}`,
      });
```

- [ ] **Step 4: Rewire the main page's list fetchers**

Find:
```typescript
export default function PengajuanJatuhTempoPage() {
  const { apiTable } = useApi();
  const { addToast } = useToast();
```
Replace with:
```typescript
export default function PengajuanJatuhTempoPage() {
  const { addToast } = useToast();
```

Find (inside `fetcherAktif`'s `queryFn`):
```typescript
          queryFn: async () => {
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
            return result?.data ?? [];
          },
```
Replace with:
```typescript
          queryFn: async () => {
            const res = await fetch("/api/pengajuan-jatuh-tempo/aktif");
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            return json.data ?? [];
          },
```

Find (inside `fetcherRiwayat`'s `queryFn`):
```typescript
          queryFn: async () => {
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
            return result?.data ?? [];
          },
```
Replace with:
```typescript
          queryFn: async () => {
            const res = await fetch("/api/pengajuan-jatuh-tempo/riwayat");
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            return json.data ?? [];
          },
```

Removing `apiTable`/`apiFetch` from scope means every `useCallback` dependency array that still lists them will fail to compile (`Cannot find name`). Update each one to drop the removed identifier:

- `fetcherAktif`'s deps: `[apiTable, addToast, queryClient]` → `[addToast, queryClient]`
- `fetcherRiwayat`'s deps: `[apiTable, addToast, queryClient]` → `[addToast, queryClient]`
- `fetcherDO`'s deps: `[noPosto, apiFetch, addToast]` → `[noPosto, addToast]`

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/app/pengajuan/jatuh-tempo/page.tsx` (specifically, no "cannot find name 'apiFetch'/'apiTable'/'useApi'").

- [ ] **Step 6: Lint**

Run: `npx eslint src/app/pengajuan/jatuh-tempo/page.tsx`
Expected: no new errors (existing warnings in the file, if any, are unrelated and out of scope).

- [ ] **Step 7: Commit**

```bash
git add src/app/pengajuan/jatuh-tempo/page.tsx
git commit -m "refactor: point pengajuan jatuh tempo page at direct-APG routes"
```

---

### Task 9: Manual verification

**Files:** none (no code changes — this is the QA pass called for in the design spec's Testing section)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000` with no compile errors.

- [ ] **Step 2: Log in and open the page**

Log in as a transport/rekanan user that has a `companyCode` set (e.g. one whose `Transport.kode` is `1000022058`, confirmed to have real APG data during design — see the plan header). Navigate to `/pengajuan/jatuh-tempo`.
Expected: "Pengajuan Jatuh Tempo" tab loads rows (or an empty table with no error toast, if that vendor currently has none).

- [ ] **Step 3: Check the Riwayat tab**

Click the "Riwayat Pengajuan" tab.
Expected: rows load (or empty table, no error toast).

- [ ] **Step 4: Check DO detail**

Click a `NoPosto` link in either tab.
Expected: the Detail DO modal opens, shows a DO table and a "Total Klaim (Rp)" figure.

- [ ] **Step 5: Check save + upload**

On an aktif row, click "Edit", fill in a date, a keterangan, attach a small file, submit.
Expected: a success or failure toast appears (either is acceptable proof the route round-trips to APG — a failure toast with a real APG error message, not a generic network/DNS error, confirms the integration path itself works).

- [ ] **Step 6: Check print**

In the Detail DO modal, if "Cetak Invoice" is enabled, click it.
Expected: a PDF opens in a new tab.

- [ ] **Step 7: Confirm no more `/aspnet-proxy/api/Apg/*` traffic**

Open browser devtools Network tab while repeating steps 2-6.
Expected: no requests to `/aspnet-proxy/api/Apg/*` — only to `/api/pengajuan-jatuh-tempo/*`.

No commit — this task only confirms behavior.
