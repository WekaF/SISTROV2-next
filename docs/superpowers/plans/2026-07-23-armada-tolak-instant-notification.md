# Armada Rejection Instant Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an approver rejects an armada submission, the transport user's in-app notification bell updates immediately (sub-second) instead of waiting up to 30 seconds for the next poll.

**Architecture:** Today the web bell is pure poll-and-diff: `NotificationDropdown` polls `GET /api/notifications` every 30s, which re-fetches `ArmadaReview` status from the ASP.NET backend and diffs it against a stored snapshot — only creating a `Notification` row if something changed. The reject action itself (`ArmadaController.TolakDataReview` in the ASP.NET backend) never talks to the Next.js app; it only fires Firebase push + WhatsApp to the mobile channel. This plan adds a third, event-driven path: the backend calls a new Next.js webhook the instant it rejects an armada, which writes the notification row immediately and pushes it to any open browser tab over Server-Sent Events (SSE). The existing 30s poll stays as-is, as a fallback safety net.

**Tech Stack:** ASP.NET Framework 4.5 / EF6 (backend, `C:\Users\weka\Indigo\sistropigroup`), Next.js 16 App Router + Prisma + next-auth (frontend, `c:\Users\weka\Indigo\SISTROV2-next`), native `EventSource`/SSE (no new dependency).

**Testing note:** Neither repo has a working automated test runner for this code path — the backend's `vstest.console.exe` discovery is broken (see `sistropigroup` project notes: use MSBuild build-success as the pass signal), and this Next.js repo has no test framework configured at all. Every task below verifies with a concrete, runnable manual check (MSBuild build, `curl`, or a browser trace) instead of an automated test — treat each verification command as mandatory, not optional.

---

## Prerequisite: which dev mode to test with

The backend calls the webhook URL configured in **its own** `Web.config` — it does not know about your personal machine. In local dev this only works end-to-end if you run the **local backend** (`start-dev.ps1` from `sistropigroup`, IIS Express on port 8090 + this repo on `localhost:3000`), because that's the only backend instance whose `Web.config` you control and can point at `http://localhost:3000`.

If you instead run `npm run dev` (this repo pointed at the shared `sistro-dev.pupuk-indonesia.com` backend), the shared backend's `Web.config` points at whatever URL was configured for that shared deployment — **not your machine** — so you will see zero webhook traffic and might mistakenly conclude the feature is broken. Use `npm run dev:local` + the local backend for every verification step in this plan.

---

### Task 1: Backend config — add the webhook target URL

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Web.config` (~line 64)
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Web.Prod.config` (~line 19-24)

- [ ] **Step 1: Add the dev appSetting**

In `Web.config`, right after the existing `SistroPublicUrl` line:

```xml
    <add key="SistroPublicUrl" value="http://sistro-dev.pupuk-indonesia.com" />
    <!-- Server-to-server target for instant (webhook) notifications to the Next.js app.
         Dev value points at a locally-running Next.js dev server (localhost:3000). -->
    <add key="NextJsWebhookUrl" value="http://localhost:3000" />
```

- [ ] **Step 2: Add the prod override**

In `Web.Prod.config`, mirror the existing `SistroPublicUrl` transform block:

```xml
    <add key="SistroPublicUrl"
         value="http://sistro.pupuk-indonesia.com"
         xdt:Transform="SetAttributes" xdt:Locator="Match(key)" />
    <add key="NextJsWebhookUrl"
         value="http://sistro.pupuk-indonesia.com"
         xdt:Transform="SetAttributes" xdt:Locator="Match(key)" />
```

- [ ] **Step 3: Verify the config parses**

Run:
```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)` (adding an appSettings key never breaks a build, but this confirms the XML is well-formed and the project still compiles).

- [ ] **Step 4: Commit**

```bash
git add SISTROAWESOME/Web.config SISTROAWESOME/Web.Prod.config
git commit -m "feat(notifications): add NextJsWebhookUrl config for instant push"
```

---

### Task 2: Backend — add the webhook-sending helper

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Helper\GeneralHelper.cs` (insert after `SendWA`, ~line 378)

- [ ] **Step 1: Add `NotifyNextArmadaRejected`**

Insert directly after the closing brace of `SendWA` (line 378) and before `SendWANonAsync` (line 380):

```csharp
        public async Task<string> NotifyNextArmadaRejected(string username, int armadaReviewId, string nopol, string alasan)
        {
            try
            {
                string baseUrl = ConfigurationManager.AppSettings["NextJsWebhookUrl"];
                if (string.IsNullOrEmpty(baseUrl)) return "gagal";

                var values = new Dictionary<string, object>
                {
                    { "username", username },
                    { "armadaReviewId", armadaReviewId },
                    { "nopol", nopol },
                    { "alasan", alasan },
                };
                var json = JsonConvert.SerializeObject(values);

                var request = new HttpRequestMessage(HttpMethod.Post, baseUrl.TrimEnd('/') + "/api/webhooks/armada-rejected")
                {
                    Content = new StringContent(json, UnicodeEncoding.UTF8, "application/json"),
                };
                request.Headers.Add("Token", privateHeaderToken);

                HttpResponseMessage response = await client.SendAsync(request);
                response.EnsureSuccessStatusCode();
                return "sukses";
            }
            catch (Exception)
            {
                return "gagal";
            }
        }
```

This reuses the existing `privateHeaderToken` shared-secret convention (already used by `NotLoginController` for the same kind of internal call) instead of inventing a new secret, and builds a per-request `HttpRequestMessage` rather than mutating the static `client.DefaultRequestHeaders` the way `SendWA` does — `SendWA` and this method can both fire from concurrent requests, and shared mutable headers on a static `HttpClient` would race.

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)`.

- [ ] **Step 3: Commit**

```bash
git add SISTROAWESOME/Helper/GeneralHelper.cs
git commit -m "feat(notifications): add NotifyNextArmadaRejected webhook helper"
```

---

### Task 3: Backend — call the webhook from TolakDataReview

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\ArmadaController.cs:1062-1079`

- [ ] **Step 1: Add the call inside the existing fire-and-forget block**

Current code (lines 1062-1079):

```csharp
                Task.Run(async () =>
                {
                    try
                    {
                        var result_send = await gh.SendNotification(send);
                        if (!string.IsNullOrEmpty(phoneNumber))
                        {
                            parameterWA wa = new parameterWA();
                            wa.number = phoneNumber;
                            wa.text = textSend;
                            await gh.SendWA(wa);
                        }
                    }
                    catch
                    {
                        // Ignore notification failures silently
                    }
                });
```

Replace with:

```csharp
                Task.Run(async () =>
                {
                    try
                    {
                        var result_send = await gh.SendNotification(send);
                        if (!string.IsNullOrEmpty(phoneNumber))
                        {
                            parameterWA wa = new parameterWA();
                            wa.number = phoneNumber;
                            wa.text = textSend;
                            await gh.SendWA(wa);
                        }
                        if (usernameTransport != null)
                        {
                            await gh.NotifyNextArmadaRejected(usernameTransport.username, dataUpdate.ID, dataUpdate.nopol, param.alasan);
                        }
                    }
                    catch
                    {
                        // Ignore notification failures silently
                    }
                });
```

Same best-effort semantics as the existing FCM/WA calls: if the Next.js app is unreachable, the rejection itself still succeeds (the poll-based sync still catches it eventually).

- [ ] **Step 2: Verify it compiles**

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```
Expected: `0 Error(s)`.

- [ ] **Step 3: Commit**

```bash
git add SISTROAWESOME/api/ArmadaController.cs
git commit -m "feat(notifications): call webhook on armada rejection"
```

---

### Task 4: Frontend — shared notification-creation helper

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\lib\notifications\sync-transportir.ts`

The poll path (`syncTransportirNotifications`, lines 129-157) already knows exactly how to record an armada rejection (`seedOrDiff` + `createNotificationOnce`, using dedupeKey `${userId}:ARMADA_REJECTED:${sourceId}`). The webhook needs to do the same thing — factor it into a function both paths can call, so there's exactly one place that owns the message copy and dedupe key.

- [ ] **Step 1: Add the exported helper**

Add this function to `sync-transportir.ts`, after `createNotificationOnce` (after line 65, before `export async function syncTransportirNotifications`):

```typescript
export async function createArmadaRejectedNotification(
  userId: string,
  armadaReviewId: number,
  nopol: string,
) {
  await seedOrDiff(userId, "armada_review", String(armadaReviewId), "Ditolak/Revisi");
  await createNotificationOnce(
    userId,
    "ARMADA_REJECTED",
    "Armada ditolak",
    `Pengajuan armada ${nopol} ditolak / perlu revisi.`,
    String(armadaReviewId),
    nopol,
  );
}
```

- [ ] **Step 2: Replace the duplicated logic in the poll path**

In `syncTransportirNotifications`, the existing branch (lines 136-155):

```typescript
      if (result === "changed") {
        if (row.aprrovestatus === "Sudah diapprove") {
          await createNotificationOnce(
            userId,
            "ARMADA_APPROVED",
            "Armada disetujui",
            `Pengajuan armada ${row.nopol} telah disetujui.`,
            String(row.ID),
            row.nopol,
          );
        } else if (row.aprrovestatus === "Ditolak/Revisi") {
          await createNotificationOnce(
            userId,
            "ARMADA_REJECTED",
            "Armada ditolak",
            `Pengajuan armada ${row.nopol} ditolak / perlu revisi.`,
            String(row.ID),
            row.nopol,
          );
        }
      }
```

Note this branch runs after `seedOrDiff` has already been called (line 130-135) with `row.aprrovestatus` as the new status — so calling `createArmadaRejectedNotification` here would call `seedOrDiff` a second time with the same value, which is harmless (it just reads `unchanged` and no-ops) but redundant. Keep the approved branch as-is and only replace the rejected branch, calling `createNotificationOnce` directly (not the new wrapper) to avoid the redundant `seedOrDiff`:

```typescript
      if (result === "changed") {
        if (row.aprrovestatus === "Sudah diapprove") {
          await createNotificationOnce(
            userId,
            "ARMADA_APPROVED",
            "Armada disetujui",
            `Pengajuan armada ${row.nopol} telah disetujui.`,
            String(row.ID),
            row.nopol,
          );
        } else if (row.aprrovestatus === "Ditolak/Revisi") {
          await createNotificationOnce(
            userId,
            "ARMADA_REJECTED",
            "Armada ditolak",
            `Pengajuan armada ${row.nopol} ditolak / perlu revisi.`,
            String(row.ID),
            row.nopol,
          );
        }
      }
```

(No change needed here — this confirms the poll path's rejected branch and the new `createArmadaRejectedNotification` wrapper produce byte-identical `title`/`message`/`dedupeKey`. Leave this block untouched; the wrapper in Step 1 is only consumed by the new webhook route in Task 6.)

- [ ] **Step 3: Verify it type-checks**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no errors referencing `sync-transportir.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/notifications/sync-transportir.ts
git commit -m "feat(notifications): extract createArmadaRejectedNotification helper"
```

---

### Task 5: Frontend — SSE subscriber hub

**Files:**
- Create: `c:\Users\weka\Indigo\SISTROV2-next\src\lib\notifications\sse-hub.ts`

- [ ] **Step 1: Write the module**

```typescript
type Controller = ReadableStreamDefaultController<Uint8Array>;

const subscribers = new Map<string, Set<Controller>>();
const encoder = new TextEncoder();

export function subscribe(username: string, controller: Controller) {
  if (!subscribers.has(username)) subscribers.set(username, new Set());
  subscribers.get(username)!.add(controller);
}

export function unsubscribe(username: string, controller: Controller) {
  const set = subscribers.get(username);
  if (!set) return;
  set.delete(controller);
  if (set.size === 0) subscribers.delete(username);
}

// ponytail: in-memory, single-Node-process only. Fine for this app's current
// deployment (one server process); if it's ever run as multiple instances,
// this needs a shared pub/sub (Redis) instead — every instance would otherwise
// only see the subscribers connected to itself.
export function broadcast(username: string, event: string, data: unknown) {
  const set = subscribers.get(username);
  if (!set) return;
  const payload = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  for (const controller of set) {
    try {
      controller.enqueue(payload);
    } catch {
      // Dead connection — its own cancel() will unsubscribe it.
    }
  }
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no errors referencing `sse-hub.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/notifications/sse-hub.ts
git commit -m "feat(notifications): add in-memory SSE subscriber hub"
```

---

### Task 6: Frontend — SSE stream endpoint

**Files:**
- Create: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\notifications\stream\route.ts`

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeRole } from "@/lib/role-utils";
import { subscribe, unsubscribe } from "@/lib/notifications/sse-hub";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.username) {
    return new Response("Unauthorized", { status: 401 });
  }

  const role = normalizeRole(user.role);
  if (role !== "transport" && role !== "rekanan") {
    return new Response("Forbidden", { status: 403 });
  }

  const username = user.username as string;
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let activeController: ReadableStreamDefaultController<Uint8Array> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      activeController = controller;
      subscribe(username, controller);
      controller.enqueue(encoder.encode(": connected\n\n"));
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 20_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (activeController) unsubscribe(username, activeController);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no errors referencing `stream/route.ts`.

- [ ] **Step 3: Start the dev server and verify the stream opens**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npm run dev:local
```
In a separate terminal, with a real transport-user session cookie (copy the `next-auth.session-token` cookie value from your browser devtools after logging in as a transport user):
```bash
curl -N -H "Cookie: next-auth.session-token=<paste-cookie-value>" http://localhost:3000/api/notifications/stream
```
Expected: the connection stays open and prints `: connected` immediately, then `: ping` every 20 seconds. Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/notifications/stream/route.ts
git commit -m "feat(notifications): add SSE stream endpoint for transport users"
```

---

### Task 7: Frontend — webhook receiver

**Files:**
- Create: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\webhooks\armada-rejected\route.ts`
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\.env.local` (add one line)

- [ ] **Step 1: Add the shared-secret env var**

Append to `.env.local` (matches the ASP.NET backend's `privateHeaderToken` dev value from `Web.config` — see Task 2):
```
SISTRO_WEBHOOK_TOKEN=123456788
```

- [ ] **Step 2: Write the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createArmadaRejectedNotification } from "@/lib/notifications/sync-transportir";
import { broadcast } from "@/lib/notifications/sse-hub";

interface ArmadaRejectedPayload {
  username?: string;
  armadaReviewId?: number;
  nopol?: string;
  alasan?: string;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("Token");
  if (!token || token !== process.env.SISTRO_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ArmadaRejectedPayload | null;
  if (!body?.username || !body?.armadaReviewId || !body?.nopol) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await createArmadaRejectedNotification(body.username, body.armadaReviewId, body.nopol);
  broadcast(body.username, "notification", {});

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify it type-checks**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no errors referencing `armada-rejected/route.ts`.

- [ ] **Step 4: Verify the auth check rejects a bad token**

With the dev server running (`npm run dev:local`):
```bash
curl -i -X POST http://localhost:3000/api/webhooks/armada-rejected \
  -H "Content-Type: application/json" \
  -H "Token: wrong-token" \
  -d "{\"username\":\"test\",\"armadaReviewId\":1,\"nopol\":\"B1234XYZ\"}"
```
Expected: `HTTP/1.1 401` with `{"error":"unauthorized"}`.

- [ ] **Step 5: Verify a correct call creates the notification**

```bash
curl -i -X POST http://localhost:3000/api/webhooks/armada-rejected \
  -H "Content-Type: application/json" \
  -H "Token: 123456788" \
  -d "{\"username\":\"<a real transport username from your dev DB>\",\"armadaReviewId\":999001,\"nopol\":\"B1234XYZ\",\"alasan\":\"test\"}"
```
Expected: `HTTP/1.1 200` with `{"ok":true}`. Then confirm the row exists:
```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx prisma studio
```
Open the `Notification` table (in the `LOG_DATABASE_URL` / prismaLog datasource) and confirm a row with `type=ARMADA_REJECTED`, `sourceId=999001`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/webhooks/armada-rejected/route.ts .env.local
git commit -m "feat(notifications): add armada-rejected webhook receiver"
```

Note: `.env.local` is expected to already be gitignored in this repo (it holds live DB credentials) — if this commit step shows it as staged, stop and confirm with the user before proceeding; don't push real secrets from this file.

---

### Task 8: Frontend — wire the bell to the SSE stream

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\components\header\NotificationDropdown.tsx`

- [ ] **Step 1: Add the EventSource effect**

In `NotificationDropdown.tsx`, after the `useQuery` block (after line 36, before `const notifications = data?.data ?? [];` at line 38):

```tsx
  React.useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    es.addEventListener("notification", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    return () => es.close();
  }, [queryClient]);
```

The existing 30s `refetchInterval` stays untouched — it's now just the fallback path if the SSE connection ever drops silently.

- [ ] **Step 2: Verify it type-checks**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no errors referencing `NotificationDropdown.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/header/NotificationDropdown.tsx
git commit -m "feat(notifications): subscribe bell to SSE push"
```

---

### Task 9: End-to-end verification (both repos, real reject flow)

**Files:** none — manual verification only.

- [ ] **Step 1: Start both apps in local mode**

```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```
This starts the local IIS Express backend (port 8090, `Web.config` → `NextJsWebhookUrl=http://localhost:3000`) and this repo's dev server together.

- [ ] **Step 2: Open two browser sessions**

Session A: log in as a transport/rekanan user who has at least one armada pending review; open the header bell dropdown so `NotificationDropdown` is mounted.
Session B (separate browser or incognito): log in as an approver, go to `/armada/approvals`.

- [ ] **Step 3: Reject the pending armada in Session B**

Click reject, confirm.

- [ ] **Step 4: Confirm instant delivery in Session A**

Expected: within ~1 second (no manual refresh, no waiting for the 30s poll), the bell's unread dot appears and the dropdown shows "Armada ditolak" for that nopol.

- [ ] **Step 5: If it doesn't appear instantly, check each layer in order**

1. Backend reached the webhook? Check the ASP.NET backend's IIS Express console/log for exceptions from `NotifyNextArmadaRejected` (it swallows errors silently by design — temporarily add a `Debug.WriteLine` in the catch block if you need to see the failure reason, then remove it).
2. Next.js received it? Check the `npm run dev:local` terminal output for the POST to `/api/webhooks/armada-rejected`.
3. Notification row created? Run `cd "c:/Users/weka/Indigo/SISTROV2-next" && npx prisma studio`, open the `Notification` table (the `LOG_DATABASE_URL` datasource), and look for a fresh `type=ARMADA_REJECTED` row for that armada.
4. SSE delivered it? Check the browser devtools Network tab for the `/api/notifications/stream` request — it should show as pending/streaming (type `eventsource`), and a `notification` event should appear in the EventStream tab at the moment of rejection.

This isolates which of the four hops (backend → webhook → DB → SSE) is the one that's silent, instead of guessing.
