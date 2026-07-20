# Pengajuan Jatuh Tempo: Direct APG Integration Design

## Problem

`/pengajuan/jatuh-tempo` calls Next.js's `apiFetch`/`apiTable` helpers, which prefix
requests with `/aspnet-proxy` — rewritten by `next.config.ts` to the ASP.NET backend
(`ASPNET_API_URL`). The backend's `ApgController` (via `JapoServices` /
`TokenServices`) then calls the external Pupuk Indonesia APG API at
`https://apg-dev.pupuk-indonesia.com`.

The ASP.NET server currently cannot resolve `apg-dev.pupuk-indonesia.com` —
`WebException: "The remote name could not be resolved"` — a DNS/network problem on
that server, confirmed distinct from an auth failure (credential is valid;
`nslookup` and a Postman call both succeed from a developer machine; the ASP.NET
server's network path is what's broken).

Root cause is server infrastructure (DNS/firewall) on the ASP.NET host, not
something this repo's code can fix. This design is a workaround: move the APG
integration used by this one page into Next.js's own server-side API routes, so it
calls `apg-dev.pupuk-indonesia.com` directly and skips the broken ASP.NET hop
entirely.

**Not fixed by this change:** any other feature still routed through
`ApgController`/`JapoServices` (e.g. `getDataNotif`) stays broken until the ASP.NET
server's network/DNS is fixed. This design intentionally covers only the 5
endpoints `/pengajuan/jatuh-tempo` uses.

## Architecture

```
page.tsx (client)
   │ fetch (same-origin, session cookie)
   ▼
src/app/api/pengajuan-jatuh-tempo/*/route.ts   (Next.js API routes)
   │ getServerSession → user.username, user.companyCode
   ▼
src/lib/apg/client.ts   (apgGet / apgPostJson / apgPostMultipart / apgPostForBytes)
   │ Bearer token, retry once on 401
   ▼
src/lib/apg/token.ts   (module-singleton token cache)
   │ POST {APG_BASE_URL}/generatetoken  (APG_USERNAME/APG_PASSWORD from env)
   ▼
https://apg-dev.pupuk-indonesia.com   (external Pupuk Indonesia API)
```

This mirrors the existing ASP.NET shape (`ApgController` → `JapoServices` →
`TokenServices` → external API) one-for-one, just re-homed into Next.js.

## Components

### `src/lib/apg/token.ts`

Module-level singleton (in-memory `_token` / `_expiry`, same lifetime as the Node
process — acceptable since this is a self-hosted long-running server, not
serverless/edge).

- `getApgToken(): Promise<string>` — returns cached token if not expired,
  otherwise POSTs to `{APG_BASE_URL}/generatetoken` with
  `{ username: APG_USERNAME, password: APG_PASSWORD, grant_type: "password",
  client_id: "SISTRO-WEB", useRefreshTokens: "true" }` as
  `application/x-www-form-urlencoded`, parses `{ access_token, expires_in }`,
  caches `expiry = now + expires_in - 60s` (60s safety margin), returns the token.
- Throws on non-2xx or network failure — caller (`client.ts`) surfaces this as the
  route's error response.

### `src/lib/apg/client.ts`

Thin fetch wrapper. Each function: attach `Authorization: Bearer <token>`, on a
`401` response call `getApgToken()` again (bypassing cache) and retry once, then
give up.

- `apgGet(path: string): Promise<any>` — JSON GET.
- `apgPostMultipart(path: string, form: FormData): Promise<any>` — JSON response.
- `apgPostForBytes(path: string, body: object): Promise<ArrayBuffer>` — for the PDF
  endpoint (JSON body in, binary out).

### API routes (`src/app/api/pengajuan-jatuh-tempo/*/route.ts`)

All five follow the same shape:

1. `getServerSession(authOptions)`; if `!user?.username || !user?.companyCode`,
   return `401 { data: "", error: "Unauthorized" }`.
2. Call the matching `apg*` client function with `vendorcode = user.companyCode`
   (never taken from the request — closes a spoofing gap that existed in the old
   flow, where `SavePengajuanJapoEks`'s payload was client-supplied).
3. On success, return `{ data: <parsed> }` (plus `totaldenda`/`iscanprint` for the
   DO route, matching the current shape the frontend already reads).
4. On failure, return `{ data: "", error: "Failed to fetch data", details:
   err.message }` — same shape the frontend's existing catch/toast logic expects,
   so no UI error-handling changes are needed beyond swapping the URL.

| Route | Method | APG endpoint | Notes |
|---|---|---|---|
| `/api/pengajuan-jatuh-tempo/aktif` | GET | `inv.api/PurchaseOrderSTO/GetListPengajuanJatuhTempo?vendorcode=` | |
| `/api/pengajuan-jatuh-tempo/riwayat` | GET | `inv.api/PurchaseOrderSTO/GetListRiwayatPengajuanJatuhTempo?vendorcode=` | |
| `/api/pengajuan-jatuh-tempo/do` | GET | `inv.api/PurchaseOrderSTO/GetPOSTOJatuhTempoDetailDO?noposto=` | `noposto` query param from client (not user-scoped data) |
| `/api/pengajuan-jatuh-tempo/save` | POST | `inv.api/PurchaseOrderSTO/SavePengajuanJatuhTempo` | multipart passthrough (`data` JSON field + `file`) |
| `/api/pengajuan-jatuh-tempo/print` | POST | `inv.api/purchaseordersto/printdendarealisasiposto` | returns `application/pdf` bytes directly, not JSON |

### `page.tsx` changes

Replace the two `apiTable("/api/Apg/...")` calls (`fetcherAktif`, `fetcherRiwayat`)
and three `apiFetch("/api/Apg/...")` calls (`fetcherDO`, `handleSubmit`,
`handlePrint`) with plain `fetch("/api/pengajuan-jatuh-tempo/...")`. Since these
new routes are same-origin, the session cookie rides along automatically — no
manual `Authorization` header needed. `vendorcode` is no longer sent from the
client (server derives it from the session); the `noposto` param for the DO/print
routes stays client-supplied since it's not sensitive per-vendor data.

DataTable/React Query wiring (`queryKey`, `staleTime`, client-side
filter/paginate) is unchanged — only the URL and the vendorcode plumbing move.

## Environment

New vars in `.env.local` (server-side only, no `NEXT_PUBLIC_` prefix):

```
APG_BASE_URL=https://apg-dev.pupuk-indonesia.com/
APG_USERNAME=ATMIN_SISTRO
APG_PASSWORD=ATMIN$1$TRoWKWK
```

(Values copied from `TokenServices.cs` — same dev-environment credential already
in the ASP.NET codebase, just no longer hardcoded in this repo's source.)

## Error handling

- **APG network/DNS failure** (the original bug, now against Next.js's own network
  path instead of ASP.NET's): surfaced via the route's `{ error: "Failed to fetch
  data", details }` shape → existing `addToast` in `page.tsx` shows it. If Next.js's
  production host has the *same* restricted network as the ASP.NET server, this
  workaround will fail identically — that's a deployment-topology risk called out
  in the prior conversation, not something this design can verify from here.
- **APG 401** (token expired/invalid): one retry with a freshly-fetched token,
  per `client.ts` above; a second 401 propagates as a normal error.
- **Missing session/companyCode**: `401` before any APG call is attempted.

## Testing / verification

No test runner is configured in this repo (`package.json` has no
vitest/jest). Verification is manual, via the `run` skill or equivalent:

1. Start dev server, log in as a transport/rekanan user with a `companyCode`.
2. Open `/pengajuan/jatuh-tempo` — confirm "Pengajuan Jatuh Tempo" tab loads data
   (or an empty-but-not-erroring table if the vendor has none).
3. Switch to "Riwayat Pengajuan" tab — confirm it loads.
4. Click a `NoPosto` — confirm the DO detail modal loads, denda total shown.
5. Open the edit modal on an aktif row, fill date + keterangan + upload a file,
   submit — confirm success toast and that the row reflects the update after
   refetch.
6. Click "Cetak Invoice" in the DO modal (if `isCanPrint`) — confirm a PDF opens.
7. Force a token-expiry path once by inspecting `token.ts`'s cache logic manually
   (no automated test — this is a workaround on a page with no existing test
   coverage; adding a test harness is out of scope per YAGNI).
