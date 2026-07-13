# Fix User Plant QA Finding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix QA finding #33 — "menu user plant = gagal tambah data user" (adding a new user on the User Plant page fails).

**Architecture:** Frontend-only change in `SISTROV2-next` (`src/app/api/admin/users/route.ts` and `src/app/superadmin/settings/users/page.tsx`). No backend changes — the backend behavior that causes the failure is intentional-but-unaccommodated by the frontend's call shape, not a backend bug.

**Tech Stack:** Next.js 16 / React / TypeScript, ASP.NET Identity on the backend (read-only reference, not modified).

**No test runner exists in this repo.** Verification steps use `rtk tsc --noEmit`, `rtk lint`, and manual checks against `npm run dev:local` with a real backend connection.

---

## Task 1: Fix "gagal tambah data user" on User Plant

Investigation traced this precisely through both repos:

1. **Frontend** (`src/app/api/admin/users/route.ts`, `POST`, lines 58-68) calls the backend's `Register` endpoint with only `Username`, `Password`, `FullName`, `Email`, `IsActive`, `SAPVendorCode` — deliberately **no role field** — because the page's design assigns roles in a *separate* follow-up loop (lines 76-83, `POST /api/UserAccount/AddtoRole` per role) after `Register` succeeds.

2. **Backend** (`sistropigroup/SISTROAWESOME/api/UserAccountController.cs`): `Register()` (line 572) routes non-transport users (i.e. every "User Plant" registration, since `user.kode` is never sent) to `adduserFunction(user, false)` (line 664). That function:
   - Creates the Identity user (`UserManager.Create`, line 681) — **this succeeds**.
   - Immediately calls `UserManager.AddToRole(users.Id, user.rolename)` (line 684) using `UserModelView.rolename` — a field the frontend's `Register` call never populates, so it's `null`.
   - `AddToRole` with a null/empty role name fails (`result1.Succeeded == false`), so the endpoint returns `Content(HttpStatusCode.BadRequest, "Something error. Assign role error...")` (line 699) — **this is the exact failure QA sees**.
   - Because that branch never reaches the `company_code` assignment (line 691, inside the `if (result1.Succeeded)` block), a partially-created Identity user with no role and no `company_code` is left behind in the database even though the API reported failure.
   - The frontend's own `Register` handler (`route.ts` line 70) returns immediately on this failure — the separate `AddtoRole` loop that was supposed to assign roles (lines 76-83) never even runs, because it's unreachable code after an early failure.

Root cause: the backend's `Register` endpoint unconditionally requires a role at creation time (via `rolename`), but the frontend's call contract assumes roles can be assigned afterward. Fix: send the first selected role as `RoleName` on the initial `Register` call (satisfying the backend's requirement), then keep the existing follow-up loop to assign any *additional* selected roles — and require at least one role to be selected client-side, since a user with zero roles was never a valid creation to attempt against this backend endpoint.

**Files:**
- Modify: `src/app/api/admin/users/route.ts:58-68`
- Modify: `src/app/superadmin/settings/users/page.tsx:262-268`

- [ ] **Step 1: Read the current POST handler**

```bash
rtk read src/app/api/admin/users/route.ts 49 89
```

- [ ] **Step 2: Send the first selected role on the initial Register call**

Change:
```ts
    // Register basic user data
    const registerRes = await aspnetFetchServer('/api/UserAccount/Register', token, {
      method: 'POST',
      body: JSON.stringify({
        Username: body.username,
        Password: body.password,
        FullName: body.fullName,
        Email: body.email,
        IsActive: body.isActive !== false,
        SAPVendorCode: body.sapVendorCode || null
      })
    });

    if (!registerRes.ok) {
      const err = await registerRes.text();
      return NextResponse.json({ success: false, error: err }, { status: registerRes.status });
    }

    // Role assignments
    if (body.roles && body.roles.length > 0) {
      for (const roleName of body.roles) {
        await aspnetFetchServer('/api/UserAccount/AddtoRole', token, {
          method: 'POST',
          body: JSON.stringify({ username: body.username, role: roleName })
        });
      }
    }
```
to:
```ts
    if (!body.roles || body.roles.length === 0) {
      return NextResponse.json({ success: false, error: "Minimal satu role harus dipilih." }, { status: 400 });
    }

    // Register basic user data. The backend's Register endpoint assigns a role as part of
    // user creation (UserManager.AddToRole inside adduserFunction) — it fails outright if
    // RoleName is missing, so the first selected role must go in this call, not only in the
    // follow-up AddtoRole loop below.
    const registerRes = await aspnetFetchServer('/api/UserAccount/Register', token, {
      method: 'POST',
      body: JSON.stringify({
        Username: body.username,
        Password: body.password,
        FullName: body.fullName,
        Email: body.email,
        IsActive: body.isActive !== false,
        SAPVendorCode: body.sapVendorCode || null,
        RoleName: body.roles[0]
      })
    });

    if (!registerRes.ok) {
      const err = await registerRes.text();
      return NextResponse.json({ success: false, error: err }, { status: registerRes.status });
    }

    // Assign any additional roles beyond the first (already assigned during Register above).
    for (const roleName of body.roles.slice(1)) {
      await aspnetFetchServer('/api/UserAccount/AddtoRole', token, {
        method: 'POST',
        body: JSON.stringify({ username: body.username, role: roleName })
      });
    }
```

- [ ] **Step 3: Require at least one role before submitting, client-side**

In `src/app/superadmin/settings/users/page.tsx`, current code (lines 262-268):
```tsx
  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!isEditing) {
      if (!formData.username.trim()) return addToast({ title: "Validasi Gagal", description: "Username diperlukan.", variant: "destructive" });
      if (!formData.password || formData.password.length < 8) return addToast({ title: "Validasi Gagal", description: "Password minimal 8 karakter.", variant: "destructive" });
      if (!formData.fullName.trim()) return addToast({ title: "Validasi Gagal", description: "Nama lengkap diperlukan.", variant: "destructive" });
      createMutation.mutate(formData);
    } else {
```
Replace with:
```tsx
  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!isEditing) {
      if (!formData.username.trim()) return addToast({ title: "Validasi Gagal", description: "Username diperlukan.", variant: "destructive" });
      if (!formData.password || formData.password.length < 8) return addToast({ title: "Validasi Gagal", description: "Password minimal 8 karakter.", variant: "destructive" });
      if (!formData.fullName.trim()) return addToast({ title: "Validasi Gagal", description: "Nama lengkap diperlukan.", variant: "destructive" });
      if (!formData.roles || formData.roles.length === 0) return addToast({ title: "Validasi Gagal", description: "Pilih minimal satu role.", variant: "destructive" });
      createMutation.mutate(formData);
    } else {
```

- [ ] **Step 4: Type-check and lint**

Run: `rtk tsc --noEmit && rtk lint`
Expected: no new errors

- [ ] **Step 5: Manual verify**

Open `/superadmin/settings/users`, click "Tambah User Baru", fill in username/password/full name, select at least one role, and submit — confirm the user is created successfully (no "Something error" response, and the new user appears in the list with the selected role(s)). Then try submitting with no role selected and confirm the client-side validation blocks it with "Pilih minimal satu role" before any network call happens. If more than one role is selected, confirm the created user ends up with all of them (check via "Edit" on the new user).

- [ ] **Step 6: Commit**

```bash
rtk git add src/app/api/admin/users/route.ts src/app/superadmin/settings/users/page.tsx
rtk git commit -m "fix: send initial role on user creation so backend Register call succeeds"
```

---

## Self-Review Notes

- Coverage: Task 1 → #33. The only item in this cluster.
- This fix is self-contained to the two files listed; no dependency on any other plan in this QA pass.
