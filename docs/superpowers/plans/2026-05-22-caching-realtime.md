# Caching & Real-time Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kurangi API hits yang tidak perlu, tambah optimistic updates pada mutation form, dan tambah SSE auto-refresh pada halaman antrian.

**Architecture:** Tiga perbaikan independen: (1) global TanStack Query config untuk stop re-fetch saat window focus; (2) optimistic update pattern di kuota + armada mutations; (3) SSE stream baru untuk halaman antrian yang auto-invalidate query tanpa user klik refresh.

**Tech Stack:** TanStack Query v5, Next.js 16 App Router, SSE (Server-Sent Events), EventSource API, React 19.

---

## Architecture Decision

| Masalah | Root cause | Fix |
|---------|------------|-----|
| API terhit tiap kali user klik tab | `refetchOnWindowFocus: true` (default TQ) | Set `false` di QueryProvider |
| Data stale lama di memory | `gcTime` default 5 menit (sama dengan `staleTime`) | Set `gcTime: 10 menit` |
| Form mutation terasa lambat | Tunggu server response sebelum update UI | Optimistic update: update UI dulu, rollback kalau error |
| Antrian harus manual refresh | Pakai `useQuery` polling via user action | SSE stream 30 detik → auto-invalidate |

---

## File Structure

```
src/
  providers/
    QueryProvider.tsx              # MODIFY: add refetchOnWindowFocus, gcTime, refetchOnReconnect

  app/
    api/
      stream/
        antrian/
          route.ts                 # CREATE: SSE stream antrian (30s poll from ASP.NET)

  hooks/
    use-antrian-stream.ts          # CREATE: EventSource hook, same pattern as use-dashboard-stream.ts

  app/
    antrian/
      page.tsx                     # MODIFY: use SSE hook → invalidateQueries on new data

    kuota/                         # MODIFY (wherever kuota level2/level3 mutation form is):
      [page-with-level2-form]      # add onMutate/onError/onSettled to useMutation
```

> **Catatan kuota pages:** Investigasi menemukan mutation di `PATCH /api/kuota/level2/[id]/update` dan `PATCH /api/kuota/level3/[id]/update`. Cari halaman yang memanggil route ini (`src/app/**/*.tsx`) dan terapkan pattern dari Task 3.

---

## Task 1: QueryProvider — Matikan refetchOnWindowFocus + Tune gcTime

**Files:**
- Modify: `src/providers/QueryProvider.tsx`

**Masalah sekarang:** `staleTime: 5min` sudah ada, tapi `refetchOnWindowFocus` default `true` → tiap kali user alt-tab balik ke browser, TanStack Query re-fetch SEMUA active queries. Ini penyebab utama API spam.

- [ ] **Step 1: Baca file existing**

Read `src/providers/QueryProvider.tsx`. Isinya sekarang:
```typescript
"use client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
      },
    },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Update QueryProvider.tsx**

Replace seluruh isi dengan:

```typescript
"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,        // data fresh 5 menit, no re-fetch
        gcTime: 1000 * 60 * 10,          // cache tetap di memory 10 menit setelah unmount
        retry: 1,
        refetchOnWindowFocus: false,      // UTAMA: stop re-fetch tiap alt-tab
        refetchOnReconnect: true,         // re-fetch kalau internet reconnect (masuk akal)
        refetchOnMount: true,             // re-fetch kalau component mount baru (behavior normal)
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-String "QueryProvider"
```

Expected: no output (no errors).

- [ ] **Step 4: Manual test**

1. `npm run dev`
2. Buka halaman admin (mis. `/admin/users`)
3. Buka DevTools → Network → XHR
4. Alt-tab keluar dari browser, lalu balik
5. Verifikasi: **TIDAK ada** request baru ke `/api/admin/users/*`

Sebelumnya (tanpa fix): ada request baru tiap focus.

- [ ] **Step 5: Commit**

```bash
git add src/providers/QueryProvider.tsx
git commit -m "perf(query): disable refetchOnWindowFocus, set gcTime 10min — stop API spam on window focus"
```

---

## Task 2: Optimistic Update — Kuota Level2 & Level3

**Files:**
- Modify: halaman yang punya mutation ke `/api/kuota/level2/[id]/update` dan `/api/kuota/level3/[id]/update`

**Cara menemukan halaman:** 

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
Select-String -Path "src\app\**\*.tsx" -Pattern "kuota/level2|kuota/level3" -Recurse
```

Atau grep:
```bash
grep -r "kuota/level2\|kuota/level3" src/app --include="*.tsx" -l
```

- [ ] **Step 1: Temukan halaman yang menggunakan mutation kuota**

Jalankan perintah grep di atas. Catat file yang ditemukan — itulah target modifikasi.

- [ ] **Step 2: Pahami struktur useMutation yang ada**

Baca file yang ditemukan. Cari pattern `useMutation` yang memanggil route kuota. Contoh pattern yang mungkin ada:

```typescript
// Pattern yang MUNGKIN ada sekarang (tanpa optimistic):
const updateMutation = useMutation({
  mutationFn: async (data: { id: string; value: number }) => {
    const res = await fetch(`/api/kuota/level2/${data.id}/update`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Update failed");
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["kuota-level2"] });
    addToast({ type: "success", message: "Berhasil diupdate" });
  },
});
```

- [ ] **Step 3: Tambahkan optimistic update**

Tambah `onMutate`, `onError`, `onSettled` ke mutation yang ditemukan. Pattern:

```typescript
// CATAT: ganti ["kuota-level2"] dengan queryKey yang BENAR dari halaman tersebut
// Lihat useQuery di atas mutation untuk menemukan queryKey yang dipakai

const updateMutation = useMutation({
  mutationFn: async (data: { id: string; value: number }) => {
    const res = await fetch(`/api/kuota/level2/${data.id}/update`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Update failed");
    return res.json();
  },

  // === TAMBAHKAN INI ===
  onMutate: async (newData) => {
    // 1. Cancel outgoing re-fetches (hindari overwrite optimistic update)
    await queryClient.cancelQueries({ queryKey: ["kuota-level2"] });

    // 2. Snapshot nilai sebelum update (untuk rollback)
    const previousData = queryClient.getQueryData(["kuota-level2"]);

    // 3. Update cache optimistically
    queryClient.setQueryData(["kuota-level2"], (old: any) => {
      if (!old) return old;
      // Update item yang berubah — sesuaikan dengan shape data actual
      return old.map((item: any) =>
        item.id === newData.id ? { ...item, value: newData.value } : item
      );
    });

    // 4. Return snapshot untuk onError rollback
    return { previousData };
  },

  onError: (_err, _newData, context) => {
    // Rollback ke data sebelum mutation
    if (context?.previousData !== undefined) {
      queryClient.setQueryData(["kuota-level2"], context.previousData);
    }
    addToast({ type: "error", message: "Gagal update, data dikembalikan" });
  },

  onSettled: () => {
    // Selalu re-sync dengan server setelah selesai (success atau error)
    queryClient.invalidateQueries({ queryKey: ["kuota-level2"] });
  },
  // === SELESAI TAMBAHAN ===
});
```

> **PENTING:** `["kuota-level2"]` harus diganti dengan queryKey yang BENAR dari `useQuery` di halaman tersebut. Lihat queryKey yang dipakai oleh useQuery di atas. Juga sesuaikan `setQueryData` mapper dengan shape data actual (mungkin bukan array `.map`, bisa object, dll).

**Terapkan pattern yang sama untuk level3:** Ganti `["kuota-level2"]` dengan queryKey level3, dan `kuota/level2` URL dengan `kuota/level3`.

- [ ] **Step 4: Test optimistic update**

1. Buka halaman kuota
2. Buka DevTools → Network
3. Update nilai kuota
4. Verifikasi: **UI langsung berubah** sebelum network response selesai
5. Test rollback: matikan backend sementara, update → verifikasi UI kembali ke nilai sebelumnya + error toast muncul

- [ ] **Step 5: Commit**

```bash
git add src/app/[path-to-kuota-page]/
git commit -m "feat(ux): optimistic update for kuota level2 + level3 mutations — instant UI feedback with rollback"
```

---

## Task 3: SSE Stream untuk Antrian

**Files:**
- Create: `src/app/api/stream/antrian/route.ts`
- Create: `src/hooks/use-antrian-stream.ts`
- Modify: `src/app/antrian/page.tsx`

**Tujuan:** Halaman antrian auto-refresh tiap 30 detik tanpa user klik refresh. SSE mengirim signal "ada data baru" → hook trigger `queryClient.invalidateQueries`.

### Sub-task 3a: Buat SSE Route

- [ ] **Step 1: Buat direktori dan file**

Create `src/app/api/stream/antrian/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

const STREAM_INTERVAL_MS = 30_000;

async function fetchAntrianSummary(token: string, companyCode?: string) {
  try {
    const body: Record<string, unknown> = { Page: 1, Length: 1, mode: "aktif" };
    if (companyCode) body.companyCode = companyCode;

    const res = await aspnetFetchServer("/api/Antrian/DataTable", token, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      total: data.recordsTotal ?? 0,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = (session?.user as any)?.aspnetToken as string;
  const companyCode = new URL(req.url).searchParams.get("companyCode") ?? undefined;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (req.signal.aborted) return;
        try {
          const payload = await fetchAntrianSummary(token, companyCode);
          if (payload) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          }
        } catch {
          // silent — client will reconnect via onerror
        }
      };

      await send();
      const interval = setInterval(send, STREAM_INTERVAL_MS);

      req.signal.onabort = () => {
        clearInterval(interval);
        controller.close();
      };
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

### Sub-task 3b: Buat Hook

- [ ] **Step 2: Buat hook**

Create `src/hooks/use-antrian-stream.ts`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

export type AntrianStreamStatus = "connecting" | "live" | "error";

export interface AntrianStreamData {
  total: number;
  timestamp: number;
}

interface UseAntrianStreamResult {
  data: AntrianStreamData | null;
  status: AntrianStreamStatus;
  lastUpdated: Date | null;
}

export function useAntrianStream(companyCode?: string): UseAntrianStreamResult {
  const [data, setData]               = useState<AntrianStreamData | null>(null);
  const [status, setStatus]           = useState<AntrianStreamStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const esRef                         = useRef<EventSource | null>(null);
  const retryRef                      = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      esRef.current?.close();
      setStatus("connecting");

      const url = companyCode
        ? `/api/stream/antrian?companyCode=${encodeURIComponent(companyCode)}`
        : "/api/stream/antrian";

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const parsed: AntrianStreamData = JSON.parse(event.data);
          setData(parsed);
          setStatus("live");
          setLastUpdated(new Date());
        } catch {
          // malformed payload — ignore this tick
        }
      };

      es.onerror = () => {
        setStatus("error");
        es.close();
        esRef.current = null;
        clearTimeout(retryRef.current ?? undefined);
        retryRef.current = setTimeout(connect, 5_000);
      };
    };

    connect();

    return () => {
      clearTimeout(retryRef.current ?? undefined);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [companyCode]);

  return { data, status, lastUpdated };
}
```

### Sub-task 3c: Integrasikan ke Antrian Page

- [ ] **Step 3: Baca antrian page**

Read `src/app/antrian/page.tsx` — fokus pada:
1. Bagian atas component `AntrianContent` (imports, hooks, state)
2. Dimana `useQueryClient` dipakai
3. Bagaimana `fetchAntrian` dipanggil — apakah via `useQuery` dengan queryKey, atau via DataTable callback

- [ ] **Step 4: Tambahkan import hook ke antrian page**

Di bagian imports atas `src/app/antrian/page.tsx`, tambahkan:

```typescript
import { useAntrianStream } from "@/hooks/use-antrian-stream";
```

- [ ] **Step 5: Tambahkan SSE integration di dalam AntrianContent component**

Temukan tempat yang tepat (setelah existing hooks/state declarations), tambahkan:

```typescript
// SSE: auto-refresh antrian data setiap 30 detik
const companyCodeForStream = companyFromUrl || activeCompanyCode || undefined;
const { data: streamData, status: streamStatus, lastUpdated: streamUpdated } =
  useAntrianStream(companyCodeForStream ?? undefined);

// Ketika SSE mengirim update, invalidate semua query antrian
useEffect(() => {
  if (!streamData) return;
  // Invalidate query antrian agar DataTable re-fetch data terbaru
  queryClient.invalidateQueries({ queryKey: ["gudang-summary"] });
  // Jika ada queryKey lain untuk data antrian utama, tambahkan di sini
}, [streamData, queryClient]);
```

- [ ] **Step 6: Tambahkan status indicator (opsional tapi direkomendasikan)**

Tambahkan indicator kecil di header halaman untuk menunjukkan koneksi live. Cari bagian header/title di antrian page, tambahkan:

```typescript
// Di bawah judul halaman (cari bagian JSX yang tampilkan heading antrian)
{streamStatus === "live" && (
  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
    Live · {streamUpdated ? `Update ${streamUpdated.toLocaleTimeString("id-ID")}` : ""}
  </span>
)}
{streamStatus === "error" && (
  <span className="text-xs text-amber-600">⚠ Reconnecting...</span>
)}
```

- [ ] **Step 7: TypeScript check**

```powershell
cd "c:\Users\weka\Indigo\SISTROV2-next"
npx tsc --noEmit 2>&1 | Select-String "antrian"
```

Expected: no errors.

- [ ] **Step 8: Manual test**

1. `npm run dev`
2. Buka halaman `/antrian`
3. Buka DevTools → Network → Filter "stream/antrian"
4. Verifikasi: SSE connection terbuat, events mengalir tiap 30 detik
5. Verifikasi: green "Live" indicator muncul
6. Verifikasi: 30 detik kemudian, data gudang-summary di-refresh otomatis tanpa klik

- [ ] **Step 9: Commit**

```bash
git add src/app/api/stream/antrian/route.ts src/hooks/use-antrian-stream.ts src/app/antrian/page.tsx
git commit -m "feat(realtime): SSE stream for antrian page — auto-refresh every 30s, live status indicator"
```

---

## Self-Review

**Spec coverage:**
- [x] Tune TanStack Query → Task 1 (refetchOnWindowFocus, gcTime)
- [x] Optimistic updates → Task 2 (kuota level2 + level3 pattern)
- [x] Expand SSE → Task 3 (antrian stream + hook + page integration)

**Placeholder scan:**
- Task 2 Step 3 mengandung "ganti queryKey dengan yang BENAR" — ini intentional karena queryKey actual harus dibaca dari file saat implementasi. Bukan placeholder, tapi instruction.

**Type consistency:**
- `AntrianStreamData.total: number` konsisten antara route dan hook
- `AntrianStreamData.timestamp: number` konsisten

---

## Catatan Implementasi

**Task 2 (optimistic update):** Shape data di `setQueryData` mapper HARUS sesuai dengan actual response dari query. Baca `queryFn` sebelum menulis mapper. Kalau data bukan array tapi object, sesuaikan logic update-nya.

**Task 3 SSE + DataTable:** Kalau DataTable di antrian page punya queryKey sendiri (selain `gudang-summary`), tambahkan ke `queryClient.invalidateQueries` call di `useEffect`. Jalankan `Select-String -Path "src/app/antrian/page.tsx" -Pattern "queryKey"` untuk menemukan semua query keys yang dipakai.

**SSE di production:** Pastikan deployment environment support long-lived HTTP connections. Vercel Edge Functions punya 30s limit — gunakan Node.js runtime (`export const runtime = "nodejs"`) jika deploy ke Vercel.
