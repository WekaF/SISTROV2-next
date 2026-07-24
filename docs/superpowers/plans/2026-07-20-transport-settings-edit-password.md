# Transport Settings Edit & Change Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Edit" and "Ganti Password" actions to `/superadmin/settings/transport` (Master Data Transport), matching the capability sistropigroup's admin UIs provide for other entities.

**Architecture:** The vendor row (`Transport` table) currently has no update path in the ASP.NET backend — `TransportirController` only has `AddData` (create). We add a matching `UpdateData` action there, then a `PUT` proxy in this repo's `/api/admin/transport` route, then wire an Edit modal into the page. Password change already has a working backend (`UserAccount/ChangePassword`) and an already-implemented `PUT /api/admin/transport/users` proxy in this repo — nothing calls it yet. We wire a "Ganti Password" action that resolves each vendor's `AspNetUsers` guid by cross-referencing the existing `/api/admin/transport/users?role=Transport` list (which already returns `guid` per user) against the vendor's `username`, joined client-side by username (case-insensitive) since the two datasets come from different backend queries with no shared key today.

**Tech Stack:** ASP.NET Framework 4.5 Web API (`sistropigroup`), Next.js 16 App Router API routes, React Query, existing shadcn-style `Dialog`/`Button`/`Input` components.

**No test runner exists in either repo for this surface** — `vstest` discovery is broken in this environment (see `sistropigroup` dev-workflow notes) and this Next.js repo has no vitest/jest configured. Verification here follows the established project convention: MSBuild build-success (0 errors) plus hand-traced assertions for the backend change, `tsc --noEmit` plus manual click-through against a running dev server for the frontend change.

---

### Task 1: Backend — add `UpdateData` to `TransportirController`

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TransportirController.cs:168-196` (right after the existing `AddData` action)

- [ ] **Step 1: Add the `UpdateData` action**

Open `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TransportirController.cs`. Insert this new method immediately after the closing `}` of `AddData` (currently ending at line 196), still inside the `TransportirController` class body:

```csharp
        [HttpPost]
        public IHttpActionResult UpdateData(Transport transport)
        {
            try
            {
                Transport existing = db.Transport.Find(transport.ID);
                if (existing == null)
                {
                    return Content(HttpStatusCode.NotFound, "Data transportir tidak ditemukan.");
                }

                Transport duplicateKode = db.Transport.Where(x => x.ID != transport.ID && x.kode == transport.kode).SingleOrDefault();
                if (duplicateKode != null)
                {
                    return Content(HttpStatusCode.BadRequest, "Maaf... Kode SAP sudah dipakai transportir lain.");
                }

                existing.nama = transport.nama;
                existing.kode = transport.kode;
                existing.singkatan = transport.singkatan;
                existing.email = transport.email;
                existing.isCharter = transport.isCharter;
                db.Entry(existing).State = EntityState.Modified;
                db.SaveChanges();
                return Content(HttpStatusCode.OK, "Any object");
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.BadRequest, "Something error. Please check data...");
            }
        }
```

This mirrors `AddData`'s existing error-handling style (line 168-196 in the same file) and reuses the `EntityState` type already available via the file's `using System.Data.Entity;` (line 7).

Note: `username` is intentionally **not** updated here — it's the login identity tied to the separate `AspNetUsers`/`Register` flow, not a vendor-profile field. Editing it would desync the `Transport.username` pointer from the actual login account.

- [ ] **Step 2: Build the backend and verify 0 errors**

Run (per this environment's known MSBuild-via-git-bash quirk — use dash-style switches and `MSYS_NO_PATHCONV=1`):

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo
```

Expected: `Build succeeded.` with `0 Error(s)` in the summary. If MSBuild reports a missing `Transport` symbol or ambiguous `EntityState`, re-check the `using` list at the top of `TransportirController.cs` (it already has `using System.Data.Entity;` at line 7 — do not add a duplicate).

- [ ] **Step 3: Hand-trace the route**

Confirm by inspection (no live server needed for this step): `App_Start/WebApiConfig.cs:23` defines `routeTemplate: "api/{controller}/{action}/{id}"`, action-based (not strict-verb) routing — so `UpdateData` becomes reachable at `POST /api/Transportir/UpdateData`, matching how `AddData` is already reached at `POST /api/Transportir/AddData`.

- [ ] **Step 4: Commit**

The `sistropigroup` working tree has pre-existing unrelated modified files (`Web.config`, `SuperadminArmadaController.cs`) — stage only the file this task touched:

```bash
cd "C:/Users/weka/Indigo/sistropigroup" && git add SISTROAWESOME/api/TransportirController.cs && git commit -m "feat: add Transportir UpdateData endpoint for vendor edit"
```

---

### Task 2: Frontend — add `PUT` proxy for vendor edit

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\transport\route.ts` (add a `PUT` export after the existing `POST`, which ends at line 96)

- [ ] **Step 1: Add the `PUT` handler**

Append this function to the end of `c:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\transport\route.ts`, after the existing `POST` function's closing `}` (line 96):

```typescript
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { ID, nama, kode, singkatan, email, isCharter } = body;
    if (!ID || !nama || !kode) {
      return NextResponse.json({ success: false, error: "ID, nama, dan kode wajib diisi" }, { status: 400 });
    }

    const res = await fetch(`${ASPNET}/api/Transportir/UpdateData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken(session)}`,
      },
      body: JSON.stringify({ ID, nama, kode, singkatan, email, isCharter: isCharter || false }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: msg }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Transportir berhasil diperbarui" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

This follows the exact pattern of the existing `POST` handler in the same file (lines 67-96): same auth check, same `ASPNET` base URL, same error-shape.

- [ ] **Step 2: Typecheck**

Run:

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

Expected: no errors referencing `src/app/api/admin/transport/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/transport/route.ts && git commit -m "feat: add PUT proxy for transportir vendor edit"
```

---

### Task 3: Frontend — Edit modal on the transport settings page

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\superadmin\settings\transport\page.tsx`

This task converts the existing "Add" dialog into a dual-purpose Add/Edit dialog (same fields: nama, kode, singkatan, email, isCharter), and adds a per-row Edit button.

- [ ] **Step 1: Swap the icon import to add `Pencil`**

In `c:\Users\weka\Indigo\SISTROV2-next\src\app\superadmin\settings\transport\page.tsx`, change the `lucide-react` import block (lines 3-17):

```typescript
import {
  Truck,
  Mail,
  UserCheck,
  Search,
  Plus,
  Pencil,
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building,
  Eye,
} from "lucide-react";
```

- [ ] **Step 2: Replace `isAddOpen` state with dual-purpose form state**

Replace this block (lines 114-117):

```typescript
  const [selected, setSelected] = useState<TransportData | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<TransportData>>({});
```

with:

```typescript
  const [selected, setSelected] = useState<TransportData | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formData, setFormData] = useState<Partial<TransportData>>({});
```

- [ ] **Step 3: Add the update mutation next to `createMutation`**

Insert this immediately after the `createMutation` block (after its closing `});` at line 157):

```typescript

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TransportData>) => {
      const res = await fetch("/api/admin/transport", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      addToast({ title: "Transportir diperbarui", variant: "success" });
      setIsFormOpen(false);
      setFormData({});
      queryClient.invalidateQueries({ queryKey: ["transports"] });
    },
    onError: (e: any) => addToast({ title: "Error", description: e.message, variant: "destructive" }),
  });
```

- [ ] **Step 4: Update the "Tambah Vendor" header button**

Replace (lines 176-182):

```typescript
        <Button
          className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          onClick={() => { setFormData({}); setIsAddOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Vendor
        </Button>
```

with:

```typescript
        <Button
          className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20"
          onClick={() => { setFormMode("add"); setFormData({}); setIsFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Vendor
        </Button>
```

- [ ] **Step 5: Add the Edit button to each table row**

Replace the "Aksi" cell (lines 324-333):

```typescript
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                          onClick={() => { setSelected(t); setIsViewOpen(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
```

with:

```typescript
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                            onClick={() => { setSelected(t); setIsViewOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                            onClick={() => { setFormMode("edit"); setFormData({ ...t }); setIsFormOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
```

(The "Ganti Password" button is added here too, in Task 4 — left out of this step so each task stays independently verifiable.)

- [ ] **Step 6: Make the dialog dual-purpose**

Replace the entire "Add Modal" block (lines 350-404):

```typescript
      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Transportir</DialogTitle>
            <DialogDescription>Masukkan data vendor transportir baru.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Transportir</label>
              <Input className="mt-1" placeholder="Nama lengkap transportir" value={formData.nama || ""} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode SAP</label>
                <Input className="mt-1" placeholder="Kode SAP" value={formData.kode || ""} onChange={(e) => setFormData({ ...formData, kode: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Singkatan</label>
                <Input className="mt-1" placeholder="Singkatan" value={formData.singkatan || ""} onChange={(e) => setFormData({ ...formData, singkatan: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Username (Login)</label>
                <Input className="mt-1" placeholder="Username" value={formData.username || ""} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                <Input className="mt-1" type="email" placeholder="Email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isCharter || false}
                onChange={(e) => setFormData({ ...formData, isCharter: e.target.checked })}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Transportir Charter</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600"
              disabled={createMutation.isPending || !formData.nama || !formData.kode}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

with:

```typescript
      {/* Add / Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{formMode === "add" ? "Tambah Transportir" : "Edit Transportir"}</DialogTitle>
            <DialogDescription>
              {formMode === "add" ? "Masukkan data vendor transportir baru." : "Perbarui data vendor transportir."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Transportir</label>
              <Input className="mt-1" placeholder="Nama lengkap transportir" value={formData.nama || ""} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kode SAP</label>
                <Input className="mt-1" placeholder="Kode SAP" value={formData.kode || ""} onChange={(e) => setFormData({ ...formData, kode: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Singkatan</label>
                <Input className="mt-1" placeholder="Singkatan" value={formData.singkatan || ""} onChange={(e) => setFormData({ ...formData, singkatan: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Username (Login)</label>
                <Input
                  className="mt-1 disabled:opacity-60"
                  placeholder="Username"
                  value={formData.username || ""}
                  disabled={formMode === "edit"}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                <Input className="mt-1" type="email" placeholder="Email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-white/5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isCharter || false}
                onChange={(e) => setFormData({ ...formData, isCharter: e.target.checked })}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="text-xs font-black uppercase text-gray-500 tracking-widest">Transportir Charter</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600"
              disabled={(formMode === "add" ? createMutation.isPending : updateMutation.isPending) || !formData.nama || !formData.kode}
              onClick={() => formMode === "add" ? createMutation.mutate(formData) : updateMutation.mutate(formData)}
            >
              {(formMode === "add" ? createMutation.isPending : updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

Note `formData.username` stays disabled but populated in edit mode — it's still sent to the API route, but `route.ts`'s `PUT` handler (Task 2) never reads `username` off the body, so it's a harmless no-op field, not a silent bypass of the "username isn't editable" rule.

- [ ] **Step 7: Typecheck**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

Expected: no errors referencing `src/app/superadmin/settings/transport/page.tsx`. If `Pencil` shows as an unused-import or missing-export error, confirm `lucide-react`'s installed version (`^1.7.0` per `package.json`) exports `Pencil` — it does in all mainline lucide-react releases.

- [ ] **Step 8: Manual verify**

Start the dev server (`npm run dev` from repo root, or `npm run dev:local` if the local IIS Express backend from Task 1 is running), sign in as a `SuperAdmin`/`TI` role user, open `/superadmin/settings/transport`, click the pencil icon on a vendor row, change "Singkatan", save, and confirm the table refreshes with the new value and a success toast appears.

- [ ] **Step 9: Commit**

```bash
git add src/app/superadmin/settings/transport/page.tsx && git commit -m "feat: add vendor edit modal to transport settings page"
```

---

### Task 4: Frontend — Ganti Password action

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\superadmin\settings\transport\page.tsx`

- [ ] **Step 1: Add `KeyRound` to the icon import**

Extend the import from Task 3 Step 1 to also include `KeyRound`:

```typescript
import {
  Truck,
  Mail,
  UserCheck,
  Search,
  Plus,
  Pencil,
  KeyRound,
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building,
  Eye,
} from "lucide-react";
```

- [ ] **Step 2: Widen the transport-users query and add password modal state**

Replace the `usersResult` query (lines 129-137):

```typescript
  const { data: usersResult } = useQuery({
    queryKey: ["transport-users-count"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/transport/users?page=1&limit=1`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
  });
```

with:

```typescript
  const { data: usersResult } = useQuery({
    queryKey: ["transport-users-list"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/transport/users?page=1&limit=500`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
  });
```

`pagination.total` (used further down for the "User Akun" stat card) comes from the ASP.NET `recordsFiltered`/`recordsTotal` count regardless of `limit`, so the stat card stays correct — `limit=500` just makes the `data` array itself carry every transport user's `guid`, not only the first row.

Then add password-modal state right after the `formData` state (from Task 3 Step 2):

```typescript
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<{ guid: string; nama: string; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
```

- [ ] **Step 3: Build the username → guid map**

Insert this after the `transports`/`pagination`/`userTotal`/`charterCount` derived-value block (lines 159-162):

```typescript
  const guidByUsername = React.useMemo(() => {
    const map = new Map<string, string>();
    (usersResult?.data || []).forEach((u: any) => {
      if (u.username && u.guid) map.set(String(u.username).toLowerCase(), u.guid);
    });
    return map;
  }, [usersResult]);
```

- [ ] **Step 4: Add the password mutation next to `updateMutation`**

Insert after `updateMutation` (added in Task 3 Step 3):

```typescript

  const passwordMutation = useMutation({
    mutationFn: async ({ guid, newpassword }: { guid: string; newpassword: string }) => {
      const res = await fetch("/api/admin/transport/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guid, newpassword }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      return d;
    },
    onSuccess: () => {
      addToast({ title: "Password diperbarui", variant: "success" });
      setIsPasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: any) => addToast({ title: "Error", description: e.message, variant: "destructive" }),
  });
```

- [ ] **Step 5: Add the "Ganti Password" button to each row**

Extend the "Aksi" cell from Task 3 Step 5 — add this `Button` right after the Edit (`Pencil`) button, still inside the same `<div className="flex items-center justify-end gap-1">`:

```typescript
                          {t.username && guidByUsername.get(t.username.toLowerCase()) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                              onClick={() => {
                                setPasswordTarget({ guid: guidByUsername.get(t.username!.toLowerCase())!, nama: t.nama, username: t.username! });
                                setNewPassword("");
                                setConfirmPassword("");
                                setIsPasswordOpen(true);
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
```

The button only renders when a matching login account exists — vendors added without a `username`, or whose `username` doesn't (yet) match an `AspNetUsers` row, have no account to reset a password on.

- [ ] **Step 6: Add the password Dialog**

Insert this new `Dialog` block right after the "Add / Edit Modal" `Dialog` closes (end of Task 3 Step 6's replacement, before the "View Modal" `Dialog`):

```typescript
      {/* Password Modal */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ganti Password</DialogTitle>
            <DialogDescription>
              {passwordTarget?.nama} ({passwordTarget?.username})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password Baru</label>
              <Input className="mt-1" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ulangi Password</label>
              <Input className="mt-1" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-[11px] text-red-500 font-semibold">Password tidak cocok</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordOpen(false)}>Batal</Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600"
              disabled={passwordMutation.isPending || !newPassword || newPassword !== confirmPassword}
              onClick={() => passwordTarget && passwordMutation.mutate({ guid: passwordTarget.guid, newpassword: newPassword })}
            >
              {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 7: Typecheck**

```bash
cd "c:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```

Expected: no errors referencing `src/app/superadmin/settings/transport/page.tsx`.

- [ ] **Step 8: Manual verify**

With the dev server running (from Task 3 Step 8) and a vendor row that has a linked login account (has a non-empty "Username" column in the table), click the key icon, enter matching passwords, save, and confirm the success toast appears and the modal closes. Then confirm a vendor row with no username shows no key icon at all.

- [ ] **Step 9: Commit**

```bash
git add src/app/superadmin/settings/transport/page.tsx && git commit -m "feat: add change-password action to transport settings page"
```

---

## Out of scope

- **Vendor delete** — not requested, and `TransportirController` has no `DeleteData` action either (only `UserAccountController` has one, for the linked login account). Left untouched.
- **Editing `username`** — kept read-only in the Edit modal; changing it would desync `Transport.username` from the actual `AspNetUsers.UserName` login record, which nothing in this plan (or the existing `Register` flow) reconciles.
- **Creating the login account alongside a new vendor** — the existing "Tambah Vendor" flow already only calls `Transportir/AddData` (not `Transportir/Register`), so a freshly added vendor has no working login today. Pre-existing gap, not touched by this plan.
