# Tiket Action Visibility + Delete Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Gudang/Timbangan/Security users View + Print buttons on `/tiket` (they currently see none), and add a role-gated Delete action on `/admin/tickets` (StaffArea + SuperAdmin/TI always; Transport only when the ticket's posto is type "SO"), enforced on both frontend and backend.

**Architecture:** The row-action buttons for both `/tiket` and `/admin/tickets` are rendered by one shared component, `src/components/ticket/TicketActions.tsx` (confirmed via grep — only these two pages render `<TicketActions>`; `/security/tickets`, `/warehouse/tickets`, `/weighbridge/tickets` all render a separate read-only `TicketListView` stub with no actions at all, out of scope here). Root cause of "no action on /tiket" for Gudang/Timbangan/Security: `canInteract` in that component only allows `superadmin`/`staffarea`/`transport`, so View/Print never render for those three roles — this is a one-line permission gap, not a rendering bug. The Delete feature reuses an **existing, already-implemented** backend endpoint (`POST /api/Tiket/DeleteData` in `sistropigroup/SISTROAWESOME/api/TiketController.cs:3007`) and an existing reason-lookup endpoint (`GET /api/Alasan/DataFilter?param=delete`, confirmed to return exactly the delete-reason list via `Mst_alasan.action == 'delete'`) — no new backend endpoint needed. However, `DeleteData` currently has **zero role/authorization check** (verified by reading the method) — the frontend button gating alone would not actually enforce "transport can't delete unless SO", since anyone could call the endpoint directly. This plan adds the same rule server-side too (defense in depth), in the ASP.NET repo at `C:\Users\weka\Indigo\sistropigroup`, which is a **separate git repository** from this one.

**Tech Stack:** Next.js 16 client component (React, `@tanstack/react-query`), ASP.NET Framework 4.5 / EF6 (C#) for the backend enforcement task.

---

### Task 1: Let Gudang/Timbangan/Security see View + Print on `/tiket` and `/admin/tickets`

**Files:**
- Modify: `src/components/ticket/TicketActions.tsx:18,43-68`

- [ ] **Step 1: Import the existing `isReadOnlyRole` helper and widen `canInteract`**

Current (line 18):
```tsx
import { normalizeRole } from "@/lib/role-utils";
```

Replace with:
```tsx
import { normalizeRole, isReadOnlyRole } from "@/lib/role-utils";
```

`isReadOnlyRole` already exists in `src/lib/role-utils.ts:60-67` and returns true for `security`/`jembatan_timbang` (the canonical name `normalizeRole` gives to the `Timbangan` ASP.NET role — confirmed by reading `ROLE_MAP` in that file). It does **not** cover `gudang` (that's intentional there — `gudang` has its own broader `hasGudangAccess` helper used elsewhere for full management access, not read-only). Don't touch `isReadOnlyRole` itself — `src/app/gudang/page.tsx:72` and `src/app/antrian/page.tsx:101` both call it and would break if `gudang` were added to its definition. Instead, OR in the `gudang` check locally, only for ticket-action purposes.

Current (lines 43-68):
```tsx
  const { data: session, status: sessionStatus } = useSession();
  const userRole = normalizeRole((session?.user as any)?.roleName || (session?.user as any)?.role);
  
  const isSuperAdmin = userRole === "superadmin" || userRole === "ti";
  const isStaffArea = userRole === "staffarea";
  const isTransport = userRole === "transport" || userRole === "rekanan";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const router = useRouter();

  // Loading state
  if (sessionStatus === "loading") {
    return <div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-none" />;
  }

  // Normalize status to string for comparison
  const currentStatus = String(status || "").padStart(2, '0');

  // Permission: Edit allowed if role is authorized AND status is '00'
  const canEdit = (isSuperAdmin || isStaffArea || isTransport) && currentStatus === "00";
  
  // Permission: Reschedule allowed ONLY for superadmin and staffarea
  const canReschedule = isSuperAdmin || isStaffArea;

  // Permission: View/Print allowed for these roles
  const canInteract = isSuperAdmin || isStaffArea || isTransport;
```

Replace with:
```tsx
  const { data: session, status: sessionStatus } = useSession();
  const userRole = normalizeRole((session?.user as any)?.roleName || (session?.user as any)?.role);
  
  const isSuperAdmin = userRole === "superadmin" || userRole === "ti";
  const isStaffArea = userRole === "staffarea";
  const isTransport = userRole === "transport" || userRole === "rekanan";
  const isMonitoringRole = isReadOnlyRole(userRole) || userRole === "gudang";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const router = useRouter();

  // Loading state
  if (sessionStatus === "loading") {
    return <div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-none" />;
  }

  // Normalize status to string for comparison
  const currentStatus = String(status || "").padStart(2, '0');

  // Permission: Edit allowed if role is authorized AND status is '00'
  const canEdit = (isSuperAdmin || isStaffArea || isTransport) && currentStatus === "00";
  
  // Permission: Reschedule allowed ONLY for superadmin and staffarea
  const canReschedule = isSuperAdmin || isStaffArea;

  // Permission: View/Print allowed for these roles
  const canInteract = isSuperAdmin || isStaffArea || isTransport || isMonitoringRole;
```

Note: `isMonitoringRole` only affects `canInteract` (View/Print). `canEdit` and `canReschedule` are untouched, so Gudang/Timbangan/Security still cannot edit or reschedule — only view and print, exactly as requested.

- [ ] **Step 2: Type-check**

Run: `cd c:\Users\weka\Indigo\SISTROV2-next; npx tsc --noEmit`
Expected: no errors referencing `TicketActions.tsx`

- [ ] **Step 3: Commit**

```bash
cd c:\Users\weka\Indigo\SISTROV2-next
git add src/components/ticket/TicketActions.tsx
git commit -m "fix: let gudang/timbangan/security view and print tickets"
```

---

### Task 2: Add a Delete action (button + confirm modal) to TicketActions

**Files:**
- Modify: `src/components/ticket/TicketActions.tsx` (imports, props, component body, new modal component at end of file)

- [ ] **Step 1: Add the `Trash2` icon import**

Current (line 4, after Task 1's edit this is still line 4):
```tsx
import { Eye, Printer, Loader2, FileEdit, Search, AlertCircle, CheckCircle2, Clock } from "lucide-react";
```

Replace with:
```tsx
import { Eye, Printer, Loader2, FileEdit, Search, AlertCircle, CheckCircle2, Clock, Trash2 } from "lucide-react";
```

- [ ] **Step 2: Add `posto` and `showDelete` props to `TicketActionsProps`**

Current (lines 20-30):
```tsx
interface TicketActionsProps {
  bookingNo: string;
  id?: string;
  status?: string;
  currentNopol?: string;
  currentDriver?: string;
  postoGuid?: string;
  showView?: boolean;
  showPrint?: boolean;
  className?: string;
}
```

Replace with:
```tsx
interface TicketActionsProps {
  bookingNo: string;
  id?: string;
  status?: string;
  currentNopol?: string;
  currentDriver?: string;
  postoGuid?: string;
  posto?: string;
  showView?: boolean;
  showPrint?: boolean;
  showDelete?: boolean;
  className?: string;
}
```

- [ ] **Step 3: Destructure the new props and compute delete permission**

Current (lines 32-41, function signature):
```tsx
export function TicketActions({
  bookingNo,
  id,
  status,
  currentNopol,
  currentDriver,
  showView = true,
  showPrint = true,
  className = "",
}: TicketActionsProps) {
```

Replace with:
```tsx
export function TicketActions({
  bookingNo,
  id,
  status,
  currentNopol,
  currentDriver,
  posto,
  showView = true,
  showPrint = true,
  showDelete = false,
  className = "",
}: TicketActionsProps) {
```

Then, immediately after the `canInteract` line added in Task 1 (still inside the same component body), add the delete permission and modal-open state. Current (after Task 1's edit):
```tsx
  // Permission: View/Print allowed for these roles
  const canInteract = isSuperAdmin || isStaffArea || isTransport || isMonitoringRole;

  const handlePrint = () => {
```

Replace with:
```tsx
  // Permission: View/Print allowed for these roles
  const canInteract = isSuperAdmin || isStaffArea || isTransport || isMonitoringRole;

  // Posto codes starting with anything other than "5" are SO-type (same heuristic
  // already used in TicketEditModal below to pick GP vs kontainer input mode).
  const isSOPosto = !!posto && posto.charAt(0) !== "5";

  // Permission: Delete allowed for SuperAdmin/TI and StaffArea always;
  // Transport only when the ticket's posto is SO-type.
  const canDelete = isSuperAdmin || isStaffArea || (isTransport && isSOPosto);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handlePrint = () => {
```

- [ ] **Step 4: Render the Delete button and modal**

Current (lines 113-145, the Print button through the end of the returned JSX and the modals):
```tsx
      {showPrint && canInteract && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-none border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-300 hover:scale-110 active:scale-90"
          onClick={handlePrint}
          title="Cetak Tiket"
        >
          <Printer className="h-3.5 w-3.5" />
        </Button>
      )}


      {/* Ticket Edit Modal */}
      {canEdit && (
        <TicketEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          bookingNo={bookingNo}
          currentNopol={currentNopol}
          currentDriver={currentDriver}
        />
      )}

      {/* Ticket Reschedule Modal */}
      <TicketRescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        bookingNo={bookingNo}
      />
    </div>
  );
}
```

Replace with:
```tsx
      {showPrint && canInteract && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-none border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-300 hover:scale-110 active:scale-90"
          onClick={handlePrint}
          title="Cetak Tiket"
        >
          <Printer className="h-3.5 w-3.5" />
        </Button>
      )}

      {showDelete && canDelete && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 rounded-none border-gray-200 hover:border-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 hover:scale-110 active:scale-90"
          onClick={() => setIsDeleteOpen(true)}
          title="Hapus Tiket"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Ticket Edit Modal */}
      {canEdit && (
        <TicketEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          bookingNo={bookingNo}
          currentNopol={currentNopol}
          currentDriver={currentDriver}
        />
      )}

      {/* Ticket Reschedule Modal */}
      <TicketRescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        bookingNo={bookingNo}
      />

      {/* Ticket Delete Modal */}
      {showDelete && canDelete && (
        <TicketDeleteModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          bookingNo={bookingNo}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add the `TicketDeleteModal` component**

Add this new component at the very end of the file, after the closing brace of `TicketRescheduleModal` (the file currently ends with that component's closing `}` on the last line):

```tsx

interface TicketDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingNo: string;
}

export function TicketDeleteModal({
  isOpen,
  onClose,
  bookingNo,
}: TicketDeleteModalProps) {
  const { apiJson } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [alasanId, setAlasanId] = useState("");

  useEffect(() => {
    if (!isOpen) setAlasanId("");
  }, [isOpen]);

  const { data: reasons } = useQuery({
    queryKey: ["reasons-delete"],
    queryFn: () => apiJson(`/api/Alasan/DataFilter?param=delete`),
    enabled: isOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiJson("/api/Tiket/DeleteData", {
        method: "POST",
        body: JSON.stringify({
          bookingno: bookingNo,
          posto: alasanId, // Backend DeleteData expects the Mst_alasan reason id here, not the actual posto value
        }),
      });
    },
    onSuccess: () => {
      addToast({ title: "Berhasil", description: "Tiket berhasil dihapus.", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["rekanan-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets-global"] });
      onClose();
    },
    onError: (err: any) => {
      addToast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const handleDelete = () => {
    if (!alasanId) {
      addToast({ title: "Peringatan", description: "Alasan penghapusan harus diisi.", variant: "warning" });
      return;
    }
    deleteMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-none border-none shadow-2xl">
        <DialogHeader className="p-6 bg-rose-50/50 dark:bg-rose-500/10 border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-600" />
            Hapus Tiket
          </DialogTitle>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Booking No: <span className="text-rose-600">{bookingNo}</span>
          </p>
        </DialogHeader>

        <div className="p-8 space-y-6 bg-white dark:bg-gray-900">
          <p className="text-sm font-bold text-rose-600">
            Tindakan ini tidak dapat dibatalkan. Tiket akan dihapus permanen dari sistem.
          </p>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Alasan Penghapusan :</label>
            <select
              className="w-full h-11 px-4 rounded-none font-bold bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 outline-none focus:border-rose-500 transition-all text-sm"
              value={alasanId}
              onChange={(e) => setAlasanId(e.target.value)}
            >
              <option value="">Pilih Alasan...</option>
              {Array.isArray(reasons) && reasons.map((r: any) => (
                <option key={r.id} value={r.id}>{r.alasan}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-none px-6 font-bold uppercase text-[10px] tracking-widest h-11">
            Batal
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-none px-8 font-black uppercase text-[10px] tracking-widest h-11 shadow-xl shadow-rose-500/20"
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus Tiket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

This mirrors the existing `TicketEditModal`/`TicketRescheduleModal` components in the same file exactly (same imports already present at the top of the file: `useState`, `useEffect`, `useQuery`, `useMutation`, `useQueryClient`, `useApi`, `useToast`, `Dialog*`, `Button`, `AlertCircle`, `Loader2` — no new imports needed beyond `Trash2` from Step 1).

- [ ] **Step 6: Type-check**

Run: `cd c:\Users\weka\Indigo\SISTROV2-next; npx tsc --noEmit`
Expected: no errors referencing `TicketActions.tsx`

- [ ] **Step 7: Commit**

```bash
cd c:\Users\weka\Indigo\SISTROV2-next
git add src/components/ticket/TicketActions.tsx
git commit -m "feat: add delete ticket action with role/SO-posto gating"
```

---

### Task 3: Enable the Delete button on `/admin/tickets`

**Files:**
- Modify: `src/app/admin/tickets/page.tsx` (the `actions` column's `render` function)

- [ ] **Step 1: Pass `posto` and `showDelete` to `<TicketActions>`**

Current:
```tsx
    {
      key: "actions",
      header: "Aksi",
      render: (row: any) => (
        <TicketActions 
          bookingNo={row.bookingno} 
          status={row.position || row.status} 
          currentNopol={row.nopol}
          currentDriver={row.driver}
          className="justify-start"
        />
      ),
    },
```

Replace with:
```tsx
    {
      key: "actions",
      header: "Aksi",
      render: (row: any) => (
        <TicketActions 
          bookingNo={row.bookingno} 
          status={row.position || row.status} 
          currentNopol={row.nopol}
          currentDriver={row.driver}
          posto={row.posto}
          showDelete={true}
          className="justify-start"
        />
      ),
    },
```

`row.posto` already exists on every row returned by `DataTableFilterLegacy` (it's rendered as its own "POSTO" column right next to this one), so no new data fetch is needed.

`/tiket/page.tsx` is intentionally **not** touched — the user only asked for delete on `/admin/tickets`, and `showDelete` defaults to `false`, so `/tiket` keeps behaving exactly as before.

- [ ] **Step 2: Type-check**

Run: `cd c:\Users\weka\Indigo\SISTROV2-next; npx tsc --noEmit`
Expected: no errors referencing `admin/tickets/page.tsx`

- [ ] **Step 3: Commit**

```bash
cd c:\Users\weka\Indigo\SISTROV2-next
git add src/app/admin/tickets/page.tsx
git commit -m "feat: show delete ticket action on admin tickets table"
```

---

### Task 4: Enforce the same delete rule on the backend (defense in depth)

**Why this task exists:** `DeleteData` in the ASP.NET backend has no role check today — verified by reading the full method body. Without this task, Tasks 1-3 only *hide* the button from unauthorized roles in the browser; a Transport user (or anyone with a valid session) could still call `POST /api/Tiket/DeleteData` directly (e.g. via curl or browser devtools) and delete any ticket regardless of posto type, because the server itself never checks. This task makes the stated rule ("staffarea and superadmin/TI can always delete; transport only for SO-type posto") actually enforced, not just hidden.

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\TiketController.cs:3007-3015`

**This is a separate git repository** at `C:\Users\weka\Indigo\sistropigroup` — do not run these git commands from the `SISTROV2-next` checkout.

- [ ] **Step 1: Add the authorization check to `DeleteData`**

Current (lines 3007-3015):
```csharp
        public IHttpActionResult DeleteData(Tiket param)
        {
            try
            {
                var dataUpdate = db.Tiket.Where(x => x.bookingno == param.bookingno).SingleOrDefault();
                if (dataUpdate == null)
                    return Content(HttpStatusCode.BadRequest, "Nomor tiket tidak dikenali");

                ValidationResponse response = kuotaHelper.updateKuota(dataUpdate);
```

Replace with:
```csharp
        public IHttpActionResult DeleteData(Tiket param)
        {
            try
            {
                var dataUpdate = db.Tiket.Where(x => x.bookingno == param.bookingno).SingleOrDefault();
                if (dataUpdate == null)
                    return Content(HttpStatusCode.BadRequest, "Nomor tiket tidak dikenali");

                // Mirrors the frontend gating in TicketActions.tsx: SuperAdmin/TI and
                // StaffArea can always delete; Transport only when the ticket's posto
                // is SO-type (posto codes starting with anything other than "5").
                bool isSuperAdminOrTI = IsUserInRole("SuperAdmin") || IsUserInRole("TI") || IsUserInRole("Admin") || IsUserInRole("AdminSumbu");
                bool isSOPosto = !string.IsNullOrEmpty(dataUpdate.posto) && dataUpdate.posto.Substring(0, 1) != "5";
                bool canDelete = isSuperAdminOrTI || isStaffArea || (isTransport && isSOPosto);
                if (!canDelete)
                {
                    return Content(HttpStatusCode.Forbidden, "Anda tidak memiliki izin untuk menghapus tiket ini");
                }

                ValidationResponse response = kuotaHelper.updateKuota(dataUpdate);
```

Note on `isSuperAdminOrTI`: the frontend's `normalizeRole` (in `src/lib/role-utils.ts`) maps the ASP.NET roles `TI`, `SuperAdmin`, `Admin`, and `AdminSumbu` all to the same canonical `"superadmin"` string, and `TicketActions.tsx`'s `isSuperAdmin` check is effectively "any of those four roles". This backend check includes all four for parity — using only `SuperAdmin`/`TI` would silently reject `Admin`/`AdminSumbu` users the frontend button already allows through.

`isStaffArea` and `isTransport` are pre-existing protected properties on `BaseApiController` (`c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\BaseApiController.cs:50-51`) already used elsewhere in this same file — no new helper needed.

- [ ] **Step 2: Build the solution**

This is an ASP.NET Framework 4.5 project (not .NET Core) — build via Visual Studio ("Build Solution") or, if `msbuild` is on PATH:
Run: `cd C:\Users\weka\Indigo\sistropigroup; msbuild SISTROAWESOME.sln /t:Build /p:Configuration=Debug`
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 3: Manual verification**

There is no automated test suite covering this controller. Verify manually once the local backend is running (`sistropigroup\start-dev.ps1` per this repo's `AGENTS.md`):
1. Log in as a Transport user, open a ticket whose posto is NOT SO-type (posto code starting with "5") on `/admin/tickets` — the Delete button shouldn't even render (Task 3's gating), but as a backend check, calling `POST /aspnet-proxy/api/Tiket/DeleteData` directly with that booking's data should now return `403 Forbidden` instead of deleting it.
2. Same Transport user, a ticket whose posto IS SO-type — delete should succeed (`200 OK`), same as before this change.
3. Log in as StaffArea or SuperAdmin/TI — delete should succeed regardless of posto type, same as before.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\weka\Indigo\sistropigroup
git add SISTROAWESOME/api/TiketController.cs
git commit -m "fix: enforce delete-ticket authorization server-side (staffarea/superadmin always, transport only for SO posto)"
```

---

## Self-Review Notes

- **Spec coverage:**
  - "kenapa di /tiket tidak terdapat action" (why no action on /tiket) — explained in Architecture section: `canInteract` excluded those roles; root cause, not a rendering bug.
  - "buat action view dan print untuk user gudang timbangan dan security" — Task 1.
  - "untuk /admin/tiket buat user dapat delete tiket ... staffarea dan superadmin TI" — Tasks 2 & 3 (frontend), confirmed via user Q&A that "pod" was not a real role and only StaffArea + SuperAdmin/TI were meant.
  - "user transportir tidak dapat mendelete tiket tetapi jika tiket dan posto SO dapat mendelete" — `canDelete = isSuperAdmin || isStaffArea || (isTransport && isSOPosto)` in Task 2, mirrored server-side in Task 4.
- **Placeholder scan:** no TBD/vague steps; every code block is complete and copy-pasteable.
- **Type consistency:** `posto`/`showDelete` prop names match between the `TicketActionsProps` interface (Task 2, Step 2), the destructured function params (Task 2, Step 3), and the caller in `admin/tickets/page.tsx` (Task 3). `TicketDeleteModal` prop names (`isOpen`, `onClose`, `bookingNo`) match the `TicketEditModal`/`TicketRescheduleModal` convention already in the file.
- **Cross-repo note:** Tasks 1-3 are in `SISTROV2-next`; Task 4 is in the separate `sistropigroup` repository. They can be committed independently, but Task 4 should not be skipped — without it, Tasks 2-3 only hide the button, they don't actually restrict who can delete.
