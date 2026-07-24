# User Management Change-Password Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/superadmin/settings/users` and `/admin/pengaturan/user` a working "Ganti Password" action in the Aksi column of each user table, matching how sistropigroup's legacy `Account/NewUser` page resets a user's password (dedicated action button → password-only modal → admin-style reset, no old password required).

**Architecture:** The root cause of "change password modal ini tidak bisa mengganti sepenuhnya" is that the ASP.NET `UserAccount/UpdateProfil` action (called by both pages' current "edit" save flow) never reads or applies its `Password` parameter — it updates `fullname`/`Email`/`PhoneNumber`/`IsIdentik`/`MfaRemember` only, so any password typed into the existing edit-modal password field is silently discarded. The legacy `NewUser.cshtml` page never used that path either — it has a separate per-row "change password" button that posts straight to `UserAccount/ChangePassword` (an admin-style reset via `UserManager.ResetPassword`, no old password needed). This repo already has a working proxy for that exact endpoint at `PUT /api/admin/transport/users` (added for the transport vendor page, see `docs/superpowers/plans/2026-07-20-transport-settings-edit-password.md`) — it forwards `{ guid, newpassword }` to `UserAccount/ChangePassword` and isn't transport-specific in any way. We reuse it (widening its role check to include `admin`, since `/admin/pengaturan/user` is used by the `Admin` role, not just `SuperAdmin`/`TI`), add a "Ganti Password" button + modal to both pages, and delete the dead password field from the `/admin/pengaturan/user` "Otorisasi Profil" modal so it stops misleading users into thinking it works.

**Tech Stack:** Next.js 16 App Router API routes, React Query, existing inline Card-based modals (no shared `Dialog` component in these two files — following each file's existing pattern).

**No test runner exists in this repo for this surface** (no vitest/jest configured — confirmed via `package.json`). Verification follows the established project convention for this kind of change: `tsc --noEmit` for type safety, plus manual click-through against a running dev server.

---

### Task 1: Widen the existing password-reset proxy to allow the `Admin` role

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\transport\users\route.ts`

The `GET`/`POST`/`DELETE` handlers in this file are transport-vendor-specific and must stay restricted to `superadmin`/`ti` (via the existing `isAuthorized` function). The `PUT` handler, however, is a generic `{ guid, newpassword }` → `UserAccount/ChangePassword` proxy with nothing transport-specific in it — we're about to call it from `/admin/pengaturan/user`, which `Admin`-role users access. Give `PUT` its own, wider check instead of loosening `isAuthorized` (which would also loosen `GET`/`POST`/`DELETE` on vendor accounts — not requested, and not safe).

- [ ] **Step 1: Add a second authorization helper**

In `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\transport\users\route.ts`, insert this function immediately after the existing `isAuthorized` function (currently lines 7-10):

```typescript
function isAuthorizedForPasswordReset(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti", "admin"].includes(r.toLowerCase()));
}
```

- [ ] **Step 2: Use it in the `PUT` handler only**

In the same file, find the `PUT` handler (currently lines 111-136). Change its first check from:

```typescript
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
```

to:

```typescript
    if (!isAuthorizedForPasswordReset(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
```

Do not touch the `GET`, `POST`, or `DELETE` handlers — they keep calling `isAuthorized` (superadmin/ti only) exactly as before.

- [ ] **Step 3: Typecheck**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

Expected: no errors referencing `src/app/api/admin/transport/users/route.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/transport/users/route.ts && git commit -m "fix: allow admin role to use the password-reset proxy"
```

---

### Task 2: "Ganti Password" action on `/superadmin/settings/users`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\superadmin\settings\users\page.tsx`

This page's table rows already carry the user's ASP.NET guid as `u.id` (mapped server-side in `GET /api/admin/users` — confirmed at `src/app/api/admin/users/route.ts:35`), so no extra lookup is needed here; the row itself has everything the reset call needs.

- [ ] **Step 1: Add password-modal state**

In `c:\Users\weka\Indigo\SISTROV2-next\src\app\superadmin\settings\users\page.tsx`, right after the existing `const [formData, setFormData] = useState(emptyForm);` line (currently line 50), add:

```typescript
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
```

- [ ] **Step 2: Add the password mutation**

Insert this right after the `deleteMutation` block closes (currently ending at line 139, the `});` before the `columns` declaration):

```typescript

  const passwordMutation = useMutation({
    mutationFn: async ({ guid, newpassword }: { guid: string; newpassword: string }) => {
      const res = await fetch("/api/admin/transport/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guid, newpassword }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Password Diperbarui", description: "Password pengguna berhasil diganti.", variant: "success" });
      setShowPasswordModal(false);
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => addToast({ title: "Gagal Ganti Password", description: err.message, variant: "destructive" }),
  });
```

- [ ] **Step 3: Add the button to the Actions column**

Replace the `actions` column's `render` (currently lines 201-209):

```typescript
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="hover:text-brand-500 hover:bg-brand-50" onClick={() => handleEditClick(u)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-rose-500 hover:bg-rose-50" onClick={() => { setSelectedUser(u); setShowDeleteConfirm(true); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
```

with:

```typescript
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="hover:text-brand-500 hover:bg-brand-50" onClick={() => handleEditClick(u)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-amber-500 hover:bg-amber-50" onClick={() => { setPasswordTarget(u); setNewPassword(""); setConfirmPassword(""); setShowPasswordModal(true); }}>
            <Key className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:text-rose-500 hover:bg-rose-50" onClick={() => { setSelectedUser(u); setShowDeleteConfirm(true); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
```

(`Key`, `Eye`, and `EyeOff` are already imported from `lucide-react` at the top of this file — no import changes needed.)

- [ ] **Step 4: Add the password modal**

Insert this new block right after the existing Edit/Create modal's closing `)}` (currently line 439) and before the `<ConfirmDialog` element:

```typescript

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm shadow-2xl border-none bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>Ganti Password</CardTitle>
                <CardDescription>@{passwordTarget?.username}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPasswordModal(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400">Password Baru</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Min. 8 karakter"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowNewPassword(s => !s)}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400">Ulangi Password</label>
                <Input type={showNewPassword ? "text" : "password"} placeholder="Ulangi password baru" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-rose-500 font-semibold">Password tidak cocok.</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-gray-50/50 p-4 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setShowPasswordModal(false)}>Batal</Button>
              <Button
                type="button"
                className="bg-brand-500 hover:bg-brand-600 min-w-[130px]"
                disabled={passwordMutation.isPending || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                onClick={() => passwordTarget && passwordMutation.mutate({ guid: passwordTarget.id, newpassword: newPassword })}
              >
                {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
```

- [ ] **Step 5: Typecheck**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

Expected: no errors referencing `src/app/superadmin/settings/users/page.tsx`.

- [ ] **Step 6: Manual verify**

Start the dev server (`npm run dev`), sign in as `SuperAdmin`/`TI`, open `/superadmin/settings/users`, click the key icon on any row, enter a new password (≥8 chars) twice matching, save — confirm a success toast and the modal closes. Then log out and log back in as that user with the new password to confirm the reset actually took effect on the backend (not just a green toast).

- [ ] **Step 7: Commit**

```bash
git add src/app/superadmin/settings/users/page.tsx && git commit -m "feat: add change-password action to superadmin user settings page"
```

---

### Task 3: Remove the dead password field and add "Ganti Password" on `/admin/pengaturan/user`

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\admin\pengaturan\user\page.tsx`

Unlike Task 2's page, this page's table rows (from `GET /api/admin/users/plant`, backed by ASP.NET `getUserAll`) don't carry the user's guid at all — only `username`, `email`, `company_code`, `deskripsi`. The existing "Edit" flow already works around this by calling `PATCH /api/admin/users/plant?username=...` (→ ASP.NET `GetUserDetail`) to fetch the full record, including `Id`, before opening its modal. The "Ganti Password" button reuses that same lookup.

- [ ] **Step 1: Delete the dead "Credential Update" password field**

In `c:\Users\weka\Indigo\SISTROV2-next\src\app\admin\pengaturan\user\page.tsx`, remove this block entirely (currently lines 572-584, inside the "Otorisasi Profil" edit modal, right before the modal's `</div>` that closes `overflow-y-auto flex-1 p-8 space-y-8`):

```typescript
              <div className="p-6 bg-rose-500/[0.03] dark:bg-rose-500/[0.02] border border-rose-500/10">
                <div className="flex items-center gap-2 text-rose-500 mb-4">
                  <Lock className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Credential Update</span>
                </div>
                <Input 
                  type="password"
                  placeholder="NEW PASSWORD (OPTIONAL)"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="h-10 bg-white dark:bg-transparent border-gray-100 dark:border-white/5 focus:ring-rose-500/20 text-center font-mono tracking-[0.3em] rounded-none"
                />
              </div>
```

This field posted to `updateMutation` → `PUT /api/admin/users/plant` → ASP.NET `UpdateProfil`, which never reads its `Password` parameter (confirmed in `sistropigroup/SISTROAWESOME/api/UserAccountController.cs`, `UpdateProfil` method — it touches `fullname`, `PhoneNumber`, `Email`, `username1`, `IsIdentik`, `MfaRemember`, nothing password-related). Typing a password here silently did nothing; deleting it removes the misleading UI. `Lock` stays imported — it's reused for the new button in Step 4.

- [ ] **Step 2: Drop the now-unused `password` key from form state**

Remove the `password: "",` line from `emptyForm` (currently line 102):

```typescript
  const emptyForm = {
    id: "",
    username: "",
    fullName: "",
    email: "",
    companyCode: "",
    deskripsi: "",
    password: "",
    isIdentik: false,
    mfaRemember: false,
  };
```

becomes:

```typescript
  const emptyForm = {
    id: "",
    username: "",
    fullName: "",
    email: "",
    companyCode: "",
    deskripsi: "",
    isIdentik: false,
    mfaRemember: false,
  };
```

And remove the `password: "",` line from `openEdit`'s `setFormData` call (currently line 287):

```typescript
      setFormData({
        id: d.Id || d.id,
        username: d.username || d.UserName,
        fullName: d.fullname || d.FullName || "",
        email: d.email || d.Email || "",
        companyCode: d.company_code || "",
        deskripsi: d.deskripsi || "",
        password: "",
        isIdentik: d.IsIdentik === true,
        mfaRemember: d.MfaRemember === true,
      });
```

becomes:

```typescript
      setFormData({
        id: d.Id || d.id,
        username: d.username || d.UserName,
        fullName: d.fullname || d.FullName || "",
        email: d.email || d.Email || "",
        companyCode: d.company_code || "",
        deskripsi: d.deskripsi || "",
        isIdentik: d.IsIdentik === true,
        mfaRemember: d.MfaRemember === true,
      });
```

(`createForm.password`, used by the separate "Tambah User Baru" create flow, is untouched — that field works today and isn't part of this bug.)

- [ ] **Step 3: Add password-modal state**

Right after the existing `const [formData, setFormData] = useState(emptyForm);` line (now around line 105 after Step 2's edit), add:

```typescript
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<{ username: string; guid: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
```

- [ ] **Step 4: Add the password mutation and the guid-resolving open handler**

Insert this right after the `updateMutation` block closes (currently ending at line 268, the `});` before `const openEdit = async (user: any) => {`):

```typescript

  const passwordMutation = useMutation({
    mutationFn: async ({ guid, newpassword }: { guid: string; newpassword: string }) => {
      const res = await fetch("/api/admin/transport/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guid, newpassword }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      addToast({ title: "Password Diperbarui", description: "Password pengguna berhasil diganti.", variant: "success" });
      setShowPasswordModal(false);
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmNewPassword("");
    },
    onError: (err: any) => addToast({ title: "Gagal Ganti Password", description: err.message, variant: "destructive" }),
  });

  const openPasswordModal = async (user: any) => {
    const username = user.username || user.UserName;
    try {
      const res = await fetch(`/api/admin/users/plant?username=${encodeURIComponent(username)}`, { method: 'PATCH' });
      const detail = await res.json();
      const guid = detail?.data?.Id || detail?.data?.id;
      if (!detail.success || !guid) throw new Error(detail.message || "Gagal mengambil data pengguna");
      setPasswordTarget({ username, guid });
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordModal(true);
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };
```

- [ ] **Step 5: Add the button to the Aksi column**

Replace the `action` column's `render` (currently lines 234-243):

```typescript
      render: (u) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => openEdit(u)}
          className="text-gray-300 hover:text-brand-500 hover:bg-brand-500/5 rounded-none h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      ),
```

with:

```typescript
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => openEdit(u)}
            className="text-gray-300 hover:text-brand-500 hover:bg-brand-500/5 rounded-none h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => openPasswordModal(u)}
            className="text-gray-300 hover:text-amber-500 hover:bg-amber-500/5 rounded-none h-8 w-8 p-0"
          >
            <Lock className="h-4 w-4" />
          </Button>
        </div>
      ),
```

- [ ] **Step 6: Add the password modal**

Insert this new block right after the "Edit Modal" block's closing `)}` (the one containing `Otorisasi Profil` — currently line 600) and before the "Admin Confirmation Modal" block:

```typescript

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm rounded-none border-none bg-white dark:bg-[#1a1c1e] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <CardHeader className="border-b dark:border-white/5 pb-6 bg-gray-50/50 dark:bg-white/[0.02] p-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Ganti Password</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest text-brand-500 mt-1">{passwordTarget?.username}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="rounded-none hover:bg-gray-200 dark:hover:bg-white/10" onClick={() => setShowPasswordModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <div className="p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Password Baru</label>
                <Input type="password" placeholder="Min. 8 karakter" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-10 rounded-none" autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ulangi Password</label>
                <Input type="password" placeholder="Ulangi password baru" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="h-10 rounded-none" autoComplete="new-password" />
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className="text-[11px] text-rose-500 font-semibold">Password tidak cocok.</p>
                )}
              </div>
            </div>
            <CardFooter className="flex justify-end gap-4 p-8 border-t dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
              <Button variant="ghost" className="font-black uppercase tracking-widest text-[10px] text-gray-500 h-10 px-6 rounded-none" onClick={() => setShowPasswordModal(false)}>
                BATAL
              </Button>
              <Button
                className="bg-brand-500 hover:bg-brand-600 font-black uppercase tracking-widest text-[10px] px-10 h-10 rounded-none"
                disabled={passwordMutation.isPending || !newPassword || newPassword.length < 8 || newPassword !== confirmNewPassword}
                onClick={() => passwordTarget && passwordMutation.mutate({ guid: passwordTarget.guid, newpassword: newPassword })}
              >
                {passwordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "SIMPAN"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
```

- [ ] **Step 7: Typecheck**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

Expected: no errors referencing `src/app/admin/pengaturan/user/page.tsx`.

- [ ] **Step 8: Manual verify**

Start the dev server, sign in as a user with the `Admin` role, open `/admin/pengaturan/user`, click the lock icon on any row, enter a new password (≥8 chars) twice matching, save — confirm a success toast and the modal closes. Then open "Edit" (pencil icon) on the same user and confirm the "Credential Update" field is gone from the "Otorisasi Profil" modal. Finally, log out and log back in as that user with the new password to confirm the reset actually took effect on the backend.

- [ ] **Step 9: Commit**

```bash
git add src/app/admin/pengaturan/user/page.tsx && git commit -m "fix: remove dead password field, add working change-password action"
```

---

## Out of scope

- **Rewriting `UserAccount/UpdateProfil` to also accept a password** — not needed; the legacy reference page (`Account/NewUser`) doesn't do this either, it uses the separate `ChangePassword` action, which this plan wires up instead.
- **Requiring the caller's own admin password before a reset** — the legacy `NewUser.cshtml` `passwordItem()` flow doesn't ask for one either (only the *self-service* "my own password" flow, `ChangePassword2`, needs the old password). Server-side role checks (Task 1) are the authorization boundary here, matching the legacy behavior being replicated.
- **`AdminSumbu`/`Staff`/`Viewer` access to either page** — unchanged; only `SuperAdmin`/`TI` (page 1) and `SuperAdmin`/`Admin`/`TI` (page 2, via Task 1's widened check) can reset passwords, same roles that could already reach each page's other admin actions.
