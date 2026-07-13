# Fix Role Toggle Bug + Remove Plant/Company Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix bug where saving a role change in the "Edit Pengguna" modal (`/superadmin/settings/users`) deletes the user's previously-assigned roles instead of adding to them, and remove the "Plant / Company Mapping" section from that same modal.

**Architecture:** Root cause is in the ASP.NET backend (`sistropigroup`), not the Next.js frontend. `UserAccountController.UpdateUserProfile` unconditionally deletes ALL `AspNetUserRoles` rows for the user, then only re-adds roles if the request body includes a `roles` array — but the Next.js `PUT /api/admin/users` route never sends `roles` to that call (it manages roles via separate `AddtoRole`/`RemoveUserFromRole` calls computed from a client-side diff). Net effect: every profile save wipes roles first, and the diff logic — which only re-adds roles *newly toggled on* — doesn't restore roles that were already assigned, since it thinks they're unchanged. Fix: stop `UpdateUserProfile` from touching roles at all; role sync is already fully handled by the separate diff-based calls. Separately, delete the unused "Plant / Company Mapping" UI block and its now-dead state/query in the Next.js page.

**Tech Stack:** ASP.NET Framework 4.5 (Web API, EF6, ASP.NET Identity) for the backend fix; Next.js 16 / React / TanStack Query for the frontend cleanup.

---

### Task 1: Stop `UpdateUserProfile` from wiping roles (backend root-cause fix)

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\UserAccountController.cs:642-677`

- [ ] **Step 1: Read current method to confirm line numbers haven't shifted**

Run (from repo root, in a terminal — this is a separate repo from SISTROV2-next):
```
type C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\UserAccountController.cs | findstr /n "UpdateUserProfile"
```
Expected: line ~642 shows `public IHttpActionResult UpdateUserProfile(UserModelView user)`. If the line number differs, re-locate the method before editing — the replacement below matches on the method body text, not the line number.

- [ ] **Step 2: Remove the role-wipe/re-add block**

Current code (`C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\UserAccountController.cs:642-677`):
```csharp
        public IHttpActionResult UpdateUserProfile(UserModelView user)
        {
            try
            {
                var existingUser = db.AspNetUsers.Find(user.Id);
                if (existingUser == null) return Content(HttpStatusCode.NotFound, "User not found");

                existingUser.fullname = user.fullname;
                db.Entry(existingUser).State = System.Data.Entity.EntityState.Modified;
                db.SaveChanges();

                // Update Role
                var currentRoles = db.AspNetUserRoles.Where(x => x.UserId == user.Id).ToList();
                if (currentRoles.Any())
                {
                    db.AspNetUserRoles.RemoveRange(currentRoles);
                    db.SaveChanges();
                }

                if (user.roles != null && user.roles.Any())
                {
                    ApplicationDbContext context = new ApplicationDbContext();
                    var UserManager = new UserManager<ApplicationUser>(new UserStore<ApplicationUser>(context));
                    foreach(var roleName in user.roles)
                    {
                        UserManager.AddToRole(user.Id, roleName);
                    }
                }

                return Ok("Profile updated successfully");
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.BadRequest, "Update failed: " + ex.Message);
            }
        }
```

Replace with (role management removed — roles are synced separately by the `AddtoRole`/`RemoveUserFromRole` endpoints, called by the Next.js `PUT /api/admin/users` route right after this one):
```csharp
        public IHttpActionResult UpdateUserProfile(UserModelView user)
        {
            try
            {
                var existingUser = db.AspNetUsers.Find(user.Id);
                if (existingUser == null) return Content(HttpStatusCode.NotFound, "User not found");

                existingUser.fullname = user.fullname;
                db.Entry(existingUser).State = System.Data.Entity.EntityState.Modified;
                db.SaveChanges();

                return Ok("Profile updated successfully");
            }
            catch (Exception ex)
            {
                return Content(HttpStatusCode.BadRequest, "Update failed: " + ex.Message);
            }
        }
```

- [ ] **Step 3: Restart the local backend and rebuild**

Run:
```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```
Expected: IIS Express starts without build errors. If it was already running, stop it first (Ctrl+C in its terminal) then restart so the recompiled DLL is picked up.

- [ ] **Step 4: Manual verification — role add no longer deletes existing roles**

With both backend (`localhost:8090`) and frontend (`npm run dev:local`) running:
1. Open `http://localhost:3000/superadmin/settings/users`
2. Click Edit (pencil icon) on a user that already has at least one role assigned (e.g. "Staff")
3. Click a second role chip (e.g. "Admin") so it becomes highlighted alongside "Staff"
4. Click "Simpan Perubahan"
5. Confirm the toast says success, then check the user's row in the table

Expected: the Roles column now shows **both** "Staff" and "Admin" badges. Before the fix, it would show only "Admin" (the newly toggled one), with "Staff" gone.

- [ ] **Step 5: Manual verification — role removal still works**

1. Edit the same user again, click the "Staff" chip to un-highlight it (keep "Admin" checked)
2. Save

Expected: Roles column now shows only "Admin". Confirms `RemoveUserFromRole` diff path still works (this plan doesn't touch it).

- [ ] **Step 6: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/UserAccountController.cs
git commit -m "fix: stop UpdateUserProfile from wiping user roles on every save"
```

---

### Task 2: Remove "Plant / Company Mapping" section from Edit/Add Pengguna modal

**Files:**
- Modify: `c:\Users\weka\Indigo\SISTROV2-next\src\app\superadmin\settings\users\page.tsx`

- [ ] **Step 1: Remove the `companiesData` query and `availableCompanies` derived value**

Remove (`page.tsx:78-84`):
```tsx
  const { data: companiesData } = useQuery({
    queryKey: ["admin-companies-lookup"],
    queryFn: async () => {
      const res = await fetch("/api/admin/companies/lookup");
      return res.json() as Promise<any[]>;
    }
  });
```

Remove (`page.tsx:88`):
```tsx
  const availableCompanies = companiesData || [];
```

- [ ] **Step 2: Remove `companyIds` from form state**

In `emptyForm` (`page.tsx:49-52`), change:
```tsx
  const emptyForm = {
    id: "", username: "", password: "", fullName: "", email: "",
    isActive: true, roles: [] as string[], companyIds: [] as string[], sapVendorCode: ""
  };
```
to:
```tsx
  const emptyForm = {
    id: "", username: "", password: "", fullName: "", email: "",
    isActive: true, roles: [] as string[], sapVendorCode: ""
  };
```

In `handleEditClick` (`page.tsx:169-179`), remove the `companyIds: [],` line so the object reads:
```tsx
    setFormData({
      id: user.id,
      username: user.username || "",
      password: "",
      fullName: user.fullname || "",
      email: user.email || "",
      isActive: user.isactive ?? true,
      roles: [...existingRoles],             // editable copy
      sapVendorCode: user.sapvendorcode || ""
    });
```

- [ ] **Step 3: Remove the `toggleCompany` function**

Remove (`page.tsx:210-215`):
```tsx
  const toggleCompany = (id: string) => {
    setFormData(prev => ({
      ...prev,
      companyIds: prev.companyIds.includes(id) ? prev.companyIds.filter(c => c !== id) : [...prev.companyIds, id]
    }));
  };
```

- [ ] **Step 4: Remove the "Plant / Company Mapping" JSX block**

Remove (`page.tsx:424-444`):
```tsx
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400">Plant / Company Mapping</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {availableCompanies.map((company: any, idx: number) => {
                      const id = company.code || company.id || company.company_code;
                      if (!id) return null;
                      const isSelected = formData.companyIds.includes(id);
                      return (
                        <button key={`company-${id}-${idx}`} type="button" onClick={() => toggleCompany(id)}
                          className={`p-3 rounded-xl text-xs font-medium text-left transition-all border ${isSelected ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-gray-50/50 text-gray-600 border-gray-100 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded ${isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                              <Building className="h-3 w-3" />
                            </div>
                            <span className="truncate">{company.name || company.Name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
```
The `</CardContent>` that immediately follows stays — only this `<div className="space-y-3">...</div>` block is deleted.

- [ ] **Step 5: Remove the now-unused `Building` icon import**

In the `lucide-react` import (`page.tsx:3-6`), change:
```tsx
import {
  Users, Search, UserPlus, ShieldCheck, Mail, UserCheck,
  Building, Key, Edit, Trash2, X, Loader2, Check, Eye, EyeOff,
} from "lucide-react";
```
to:
```tsx
import {
  Users, Search, UserPlus, ShieldCheck, Mail, UserCheck,
  Key, Edit, Trash2, X, Loader2, Check, Eye, EyeOff,
} from "lucide-react";
```

- [ ] **Step 6: Update stale copy that references plant/company mapping**

Change (`page.tsx:231`):
```tsx
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola akses, role, dan mapping pengguna ke seluruh company/plant.</p>
```
to:
```tsx
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola akses dan role pengguna.</p>
```

Change (`page.tsx:347`):
```tsx
                <CardDescription>{isEditing ? "Update profil, role, dan plant mapping." : "Buat akun pengguna baru dengan role dan akses plant."}</CardDescription>
```
to:
```tsx
                <CardDescription>{isEditing ? "Update profil dan role pengguna." : "Buat akun pengguna baru dengan role."}</CardDescription>
```

- [ ] **Step 7: Type-check**

Run: `rtk tsc`
Expected: no errors in `src/app/superadmin/settings/users/page.tsx` (no leftover references to `companyIds`, `availableCompanies`, `toggleCompany`, or `Building`).

- [ ] **Step 8: Manual verification in browser**

1. Open `http://localhost:3000/superadmin/settings/users`
2. Click Edit on any user, and separately click "Tambah User Baru"

Expected: neither modal shows a "Plant / Company Mapping" section. Role Selection chips still work (add/remove) as verified in Task 1.

- [ ] **Step 9: Commit**

```bash
rtk git add src/app/superadmin/settings/users/page.tsx
rtk git commit -m "fix: remove unused Plant/Company Mapping section from Edit Pengguna modal"
```

---

## Notes / explicitly out of scope

- `UpdateUserProfile` also silently ignores `Email` and `IsActive` sent by the frontend (only `fullname` is persisted) — this is a pre-existing, separate bug not mentioned in the report. Not fixed here to keep this change scoped to the reported issue; flag to the user if worth a follow-up plan.
- The `/api/admin/companies/lookup` endpoint itself is left untouched — it may be used elsewhere; this plan only removes its one caller in this modal.
