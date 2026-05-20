<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:cross-project-context -->
# Cross-Project Context

## Architecture

This repo (SISTROV2-next) is the **Next.js 16 frontend** paired with an **ASP.NET Framework 4.5 backend** at:

```
C:\Users\weka\Indigo\sistropigroup
```

Both projects form one system called **SISTRO** (Sistem Informasi Transport & Operasi).

## How They Connect

| Layer | Value |
|---|---|
| Backend URL (network) | `http://192.168.188.170:8090` |
| Backend URL (local dev) | `http://localhost:8090` |
| Proxy path (this project) | `/aspnet-proxy/:path*` → backend URL |
| Proxy config (this project) | `next.config.ts` → `rewrites()` function |
| Env var | `ASPNET_API_URL` in `.env.local` |

When you need to trace an API call: calls to `/aspnet-proxy/api/...` in this codebase hit controllers in `sistropigroup/SISTROAWESOME/api/*Controller.cs`.

## Starting Both Projects (One Command)

```powershell
# From sistropigroup root:
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1              # local backend (IIS Express port 8090) + Next.js
.\start-dev.ps1 -NetworkBackend  # skip local backend, use network server
```

For frontend only:
```powershell
cd C:\Users\weka\Indigo\SISTROV2-next
npm run dev           # network backend at 192.168.188.170:8090
npm run dev:local     # local backend at localhost:8090
```

## Role System

Roles in both projects: `SuperAdmin`, `TI`, `Admin`, `AdminSumbu`, `Staff`, `Viewer`

- RBAC enforced in this project at `src/middleware.ts`
- Backend auth via `sistropigroup/SISTROAWESOME/Services/TokenServices.cs`

## Key Cross-Project Files

| File | What it does |
|---|---|
| `next.config.ts` | Proxy config: `/aspnet-proxy/*` → backend |
| `.env.local` | Backend URL, NextAuth, PostgreSQL config |
| `.env.local.localhost` | Local dev override (localhost:8090) |
| `src/middleware.ts` | RBAC for all routes |
| `sistropigroup/SISTROAWESOME/Global.asax.cs` | Backend startup, Firebase, TokenServices |
<!-- END:cross-project-context -->
