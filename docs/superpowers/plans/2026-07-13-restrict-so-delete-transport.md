# Restrict SO Deletion From Transport Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Transport/Rekanan users from deleting Sales Order (SO / Posto) records on `/so`, while leaving their existing ability to delete their own tickets on `/tiket` untouched.

**Architecture:** `/so` (`src/app/so/page.tsx`) currently computes a `canDeleteThisSO(row)` predicate that incorrectly grants delete rights to any Transport/Rekanan user, on top of the intended `canEditPosto` roles and the SO's own creator. The fix removes that grant on the frontend. The backend `POSTOController.DeleteData` action in the ASP.NET project has no role check at all today (unlike `TiketController.DeleteData`, which already blocks Transport for tickets outside SO-type postos), so a Transport user could still call the API directly even after the UI button disappears. Both layers must be fixed — frontend hides the button, backend rejects the call — matching the existing defense-in-depth pattern already used for ticket deletion.

**Tech Stack:** Next.js 16 / React (frontend, TypeScript) + ASP.NET Framework 4.5 Web API (backend, C#), NextAuth session roles, `db.Posto` (Entity Framework).

---

## Scope note

`/tiket` (`src/components/ticket/TicketActions.tsx`, `TiketController.DeleteData`) already correctly restricts *ticket* deletion for Transport to SO-type postos only — that logic is correct today and is **not** touched by this plan. This plan only removes Transport/Rekanan's ability to delete the SO record itself on `/so`.

### Task 1: Remove SO-delete permission for Transport/Rekanan on the frontend

**Files:**
- Modify: `src/app/so/page.tsx:79-83`

- [ ] **Step 1: Read current permission logic**

Current code at `src/app/so/page.tsx:77-83`:

```tsx
  const role = (session?.user as any)?.role?.toLowerCase();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isRekanan = role === "rekanan" || role === "transport";
  const fullname = session?.user?.name as string | undefined;
  const canEditPosto = roles.some((r) => POSTO_EDIT_ROLES.includes(r.toLowerCase()));
  const canDeleteThisSO = (row: SOItem) =>
    canEditPosto || isRekanan || (!!fullname && row.updatedby === fullname);
```

`isRekanan` is `true` for the `transport` and `rekanan` roles and is OR'd straight into `canDeleteThisSO`, so every Transport/Rekanan user can delete every SO row — this is the bug.

- [ ] **Step 2: Fix `canDeleteThisSO` to exclude Transport/Rekanan unconditionally**

Replace the block above with:

```tsx
  const role = (session?.user as any)?.role?.toLowerCase();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isRekanan = role === "rekanan" || role === "transport";
  const fullname = session?.user?.name as string | undefined;
  const canEditPosto = roles.some((r) => POSTO_EDIT_ROLES.includes(r.toLowerCase()));
  // Transport/Rekanan may delete their own *tickets* (see TicketActions.tsx) but must never be
  // able to delete the SO itself — enforced here even if the "own record" fallback below would
  // otherwise match (e.g. row.updatedby happens to equal their fullname).
  const canDeleteThisSO = (row: SOItem) =>
    !isRekanan && (canEditPosto || (!!fullname && row.updatedby === fullname));
```

- [ ] **Step 3: Type-check the change**

Run: `rtk tsc`
Expected: no new errors introduced in `src/app/so/page.tsx`.

- [ ] **Step 4: Manual verification (no test framework is wired up in this repo — `src/` has zero `*.test.ts*` files, so this page follows the existing project convention of manual QA instead of adding new test infra)**

1. `npm run dev` (or `npm run dev:local`), open `http://localhost:3000/so`.
2. Log in as (or simulate via session/role override) a `Transport` or `Rekanan` user → confirm the "Hapus" delete button no longer renders on any SO row, regardless of who is listed as `updatedby`.
3. Log in as a role in `POSTO_EDIT_ROLES` (e.g. `SuperAdmin`) → confirm the delete button still renders and still works.
4. Open `http://localhost:3000/tiket` as a `Transport` user with an SO-type posto ticket at position `00` → confirm the ticket delete button still renders (this page is unaffected by this change).

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/so/page.tsx
rtk git commit -m "fix: prevent Transport/Rekanan users from deleting SO records"
```

---

### Task 2: Enforce the same rule server-side in `POSTOController.DeleteData`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\POSTOController.cs:616-618`

- [ ] **Step 1: Read current backend endpoint**

Current code at `POSTOController.cs:616-623`:

```csharp
        [HttpPost]
        public IHttpActionResult DeleteData(Posto param)
        {
            try
            {
                //var dataUpdate = db.Posto.Where(x => x.noposto == param.noposto).SingleOrDefault();
                Posto dataUpdate = db.Posto.Where(x => x.noposto == param.noposto || x.guid == param.guid).SingleOrDefault();
                if (dataUpdate != null)
                {
```

There is no role check at all — any authenticated caller (including Transport) can hit this endpoint directly, even after Task 1 hides the button. Compare with `TiketController.DeleteData` (`TiketController.cs:3082-3102`), which already blocks Transport server-side using the `isTransport` property inherited from `BaseApiController`. `POSTOController` extends `BaseLoggedApiController : BaseApiController` (`BaseApiController.cs:171`), so `isTransport` (`BaseApiController.cs:51`, checks `User.IsInRole("Transport")`) is already available here. Note: there is no separate ASP.NET "Rekanan" role anywhere in the backend (confirmed by repo-wide search) — the frontend's `rekanan` normalized role always maps to the same backend `Transport` role, so checking `isTransport` alone covers both.

- [ ] **Step 2: Add the role check**

Replace the method signature block above with:

```csharp
        [HttpPost]
        public IHttpActionResult DeleteData(Posto param)
        {
            try
            {
                // Transport users may delete their own tickets (see TiketController.DeleteData) but
                // must never be able to delete the underlying SO/Posto record itself.
                if (isTransport)
                {
                    return Content(HttpStatusCode.Forbidden, "Anda tidak memiliki izin untuk menghapus SO ini");
                }

                //var dataUpdate = db.Posto.Where(x => x.noposto == param.noposto).SingleOrDefault();
                Posto dataUpdate = db.Posto.Where(x => x.noposto == param.noposto || x.guid == param.guid).SingleOrDefault();
                if (dataUpdate != null)
                {
```

- [ ] **Step 3: Build the backend project**

Open `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME.sln` in Visual Studio (or run MSBuild against it) and build — confirm no compile errors in `POSTOController.cs`. `HttpStatusCode` and `Content(...)` are already used elsewhere in this same file (e.g. line 613), so no new `using` directive is needed.

- [ ] **Step 4: Manual verification**

1. Start the backend (`sistropigroup\start-dev.ps1`) and the frontend together.
2. As a `Transport`-role user, call `POST /aspnet-proxy/api/POSTO/DeleteData` directly (e.g. via curl/Postman) with a valid `noposto` → confirm `403 Forbidden` with the message above, and confirm the SO row still exists in the DB afterward.
3. As a `SuperAdmin`/`TI`/Candal/StaffArea user, repeat the same call → confirm it still succeeds (existing behavior preserved).

- [ ] **Step 5: Commit**

```bash
rtk git add "C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\POSTOController.cs"
rtk git commit -m "fix: reject SO deletion from Transport users server-side"
```

---

## Self-review notes

- **Spec coverage:** "SO tidak dapat dihapus oleh user transport" → Task 1 (frontend) + Task 2 (backend). "Tiket SO nya saja yang dapat dihapus, bukan SO nya, di `/tiket`" → confirmed already correct in `TicketActions.tsx:99-100` / `TiketController.cs:3096-3102`, explicitly called out as out-of-scope/unaffected in the Scope note and verified in Task 1 Step 4.4.
- **Placeholder scan:** no TBD/"add error handling"/"similar to Task N" placeholders — every step has literal code.
- **Type consistency:** `canDeleteThisSO(row: SOItem)` signature and `isTransport` property name match their existing declarations exactly; no renamed identifiers introduced.
