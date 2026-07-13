# Restore ASP.NET Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix "everything errors" regression caused by removing the `/aspnet-proxy` rewrite — restore same-origin proxying for browser-side API calls.

**Architecture:** Two files were changed together, breaking the pairing: `next.config.ts` lost the `rewrites()` that mapped `/aspnet-proxy/:path*` → the ASP.NET backend, and `src/lib/api-client.ts` lost the `typeof window` branch that made client-side code call `/aspnet-proxy` (same-origin) instead of the backend URL directly (cross-origin). Without the proxy, browser fetches from `useApi()` (`src/hooks/use-api.ts`) and `SignInForm.tsx` go straight to the ASP.NET origin and get blocked by CORS. Fix: restore both halves of the proxy pairing. No backend changes needed — this was a client-side regression, not a CORS-policy gap.

**Tech Stack:** Next.js 16 rewrites, TypeScript.

---

### Task 1: Restore proxy rewrite in next.config.ts

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Read current file to confirm exact insertion point**

Run: `Read next.config.ts` — confirm the `webpack` config block ends right before `export default nextConfig;`, matching this current state:

```ts
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 2: Add back the `rewrites()` function**

Replace:

```ts
    return config;
  },
};

export default nextConfig;
```

With:

```ts
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/aspnet-proxy/:path*",
        destination: `${ASPNET_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

Confirm `ASPNET_URL` is already defined earlier in the file (it was used before removal, so the const should still exist above `nextConfig`) — if `grep -n "ASPNET_URL" next.config.ts` returns no match outside the removed block, stop and re-derive it from `process.env.ASPNET_API_URL` before proceeding.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "fix: restore aspnet-proxy rewrite"
```

---

### Task 2: Restore client/server BASE_URL split in api-client.ts

**Files:**
- Modify: `src/lib/api-client.ts:11`

- [ ] **Step 1: Replace the BASE_URL constant**

Replace:

```ts
const BASE_URL = process.env.NEXT_PUBLIC_ASPNET_API_URL || process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com";
```

With:

```ts
const BASE_URL = typeof window !== 'undefined'
  ? "/aspnet-proxy"
  : (process.env.NEXT_PUBLIC_ASPNET_API_URL || process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com");
```

This keeps `aspnetFetchServer` (server components / route handlers) calling the backend directly — that path never went through the proxy and isn't part of the regression. Only the client (`window` defined) branch needs `/aspnet-proxy`, since `API_BASE` (exported at line 46, `export const API_BASE = BASE_URL;`) is consumed by `useApi()` and `SignInForm.tsx`, both browser-side.

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "fix: route client-side API_BASE through aspnet-proxy again"
```

---

### Task 3: Verify the fix end-to-end

**Files:** none (manual verification — this repo has no test runner configured for this app)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev:local
```

Wait for `Ready` in terminal output.

- [ ] **Step 2: Open the login page and check network tab**

Open `http://localhost:3000/login` in a browser with DevTools → Network open. Attempt a login.

Expected: the "get user companies" request goes to `http://localhost:3000/aspnet-proxy/api/Company/GetUserCompanies?...` (same-origin, 200 or 4xx from backend logic — NOT a CORS error / `net::ERR_FAILED`).

- [ ] **Step 3: Check a page that uses `useApi()`**

Log in, then open `http://localhost:3000/armada`. In Network tab, confirm calls logged as `[useApi] Fetching: /aspnet-proxy/api/...` in the console succeed (status 200, response body present) rather than failing with a CORS or network error.

- [ ] **Step 4: Confirm no regressions in server-side routes**

Open `http://localhost:3000/manager` (a server-rendered page using `aspnetFetchServer`). Confirm it loads data normally — this path was never proxied and should be unaffected by Task 2's change.

- [ ] **Step 5: Commit is already done per-task — no additional commit needed here.**

If Step 2 or 3 still show CORS/network errors, stop and re-check that `ASPNET_URL` in `next.config.ts` resolves to a reachable backend (`http://localhost:8090` when using `dev:local`) — that's a separate, new root cause, not the one this plan fixes.
