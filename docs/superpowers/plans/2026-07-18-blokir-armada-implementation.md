# Blokir Armada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Blokir" (block) status column, toggle button, and confirmation dialog to the `/armada` and `/superadmin/settings/fleet` pages, and exclude blocked armada from every armada-selection endpoint used when creating/editing a tiket (web + mobile).

**Architecture:** The backend `Armada.IsBlocked`/`BlockedOn`/`BlockedBy`/`BlockedReason` fields and the `POST /api/Armada/ToggleBlokir` endpoint already exist (fixed and committed in a prior session, `sistropigroup` commit `c3784da`). This plan (1) surfaces the flag in the two listing endpoints' DTOs so the frontend can render it, (2) adds a `.Where(IsBlocked == false)` filter to the 4 duplicate "pick an armada for this posto" query methods (2 web, 2 mobile), and (3) builds the column/button/dialog UI on both listing pages, wiring the toggle through a new Next.js BFF proxy route for the superadmin page (which talks through `aspnetFetchServer`, unlike `/armada` which calls the ASP.NET API directly via the `useApi` hook).

**Tech Stack:** ASP.NET Framework 4.5 / EF6 (`sistropigroup`), Next.js 16 / React / TanStack Query / shadcn-style UI components (`SISTROV2-next`).

**Full spec:** `docs/superpowers/specs/2026-07-18-blokir-armada-design.md`

**No test runner available for either side** — `sistropigroup`'s `vstest.console.exe` test discovery is broken (documented, pre-existing), and `SISTROV2-next`'s `package.json` has no test script/runner configured at all. Verification throughout this plan is: backend = full `MSBuild` build (0 errors) + hand-traced assertions; frontend = `npx tsc --noEmit` (typecheck) + a manual dev-server pass at the end (Task 8).

---

### Task 1: Backend — expose blokir status in both listing endpoints

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Models\ArmadaView.cs`
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\ArmadaController.cs` (`DataTable()` method, ~L2600-2626)
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Models\ArmadaSettingView.cs`
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\SuperadminArmadaController.cs` (`List()` method, ~L39-66)

`ArmadaView` already declares `public int ID { get; set; }` (line 10) but `DataTable()`'s `Select` never populates it — the only IDs it currently exposes are baked into an HTML string (`Action`) for the pre-existing edit/delete buttons. This task adds a real `ID` field to that projection so the new Blokir button doesn't need to regex-parse HTML for something unrelated to blokir.

- [ ] **Step 1: Add 3 fields to `Models/ArmadaView.cs`**

Find (last property before the closing brace of `class ArmadaView`, currently L54-55):
```csharp
        public string masa_berlaku_kir_string { get; set; }
        public string keterangan { get; set; }
    }
```
Replace with:
```csharp
        public string masa_berlaku_kir_string { get; set; }
        public string keterangan { get; set; }
        public bool IsBlocked { get; set; }
        public string BlockedReason { get; set; }
        public Nullable<System.DateTime> BlockedOn { get; set; }
    }
```

- [ ] **Step 2: Populate `ID` + the 3 new fields in `ArmadaController.cs::DataTable()`**

Find (the `Select` building `ArmadaView`, currently ~L2600-2626):
```csharp
                List<ArmadaView> dt = datapaging.AsEnumerable().Select((x, i) => new ArmadaView
                {
                    //number = i + 1,
                    numberString = (x.Armada1?.charter == true) ? ("<div class='txt_charter'>charter</div>" + (i + 1).ToString()) : (i + 1).ToString(),
                    username = x.Armada1?.Transport?.username ?? "",
```
Replace with:
```csharp
                List<ArmadaView> dt = datapaging.AsEnumerable().Select((x, i) => new ArmadaView
                {
                    //number = i + 1,
                    ID = x.Armada1?.ID ?? 0,
                    numberString = (x.Armada1?.charter == true) ? ("<div class='txt_charter'>charter</div>" + (i + 1).ToString()) : (i + 1).ToString(),
                    username = x.Armada1?.Transport?.username ?? "",
```

Then find (same `Select`, the `charterString`/`Action` lines currently ~L2624-2625):
```csharp
                    charterString = (x.Armada1?.charter == true) ? "charter" : "",
                    Action = isAdminArmada ? delete1 + "" + (x.Armada1?.ID ?? 0) + delete2 + edit1 + "" + (x.Armada1?.ID ?? 0) + edit2 : isTransport ? edit1 + "" + (x.Armada1?.ID ?? 0) + edit2 : ""
                }).ToList();
```
Replace with:
```csharp
                    charterString = (x.Armada1?.charter == true) ? "charter" : "",
                    IsBlocked = x.Armada1?.IsBlocked ?? false,
                    BlockedReason = x.Armada1?.BlockedReason ?? "",
                    BlockedOn = x.Armada1?.BlockedOn,
                    Action = isAdminArmada ? delete1 + "" + (x.Armada1?.ID ?? 0) + delete2 + edit1 + "" + (x.Armada1?.ID ?? 0) + edit2 : isTransport ? edit1 + "" + (x.Armada1?.ID ?? 0) + edit2 : ""
                }).ToList();
```

- [ ] **Step 3: Add 3 fields to `Models/ArmadaSettingView.cs`**

Find (last property before the closing brace of `class ArmadaSettingView`, currently L29-32):
```csharp
        public string StatusArmada { get; set; }
        public int MappingCount { get; set; }
        public string Plants { get; set; }
    }
```
Replace with:
```csharp
        public string StatusArmada { get; set; }
        public int MappingCount { get; set; }
        public string Plants { get; set; }
        public bool IsBlocked { get; set; }
        public string BlockedReason { get; set; }
        public DateTime? BlockedOn { get; set; }
    }
```

- [ ] **Step 4: Populate the 3 new fields in `SuperadminArmadaController.cs::List()`**

Find (the `Select` building `ArmadaSettingView`, currently ~L63-66):
```csharp
                        StatusArmada = a.status_armada,
                        MappingCount = mappingGroups.ContainsKey(a.ID) ? mappingGroups[a.ID].Count : 0,
                        Plants = mappingGroups.ContainsKey(a.ID) ? mappingGroups[a.ID].Plants : ""
                    })
```
Replace with:
```csharp
                        StatusArmada = a.status_armada,
                        MappingCount = mappingGroups.ContainsKey(a.ID) ? mappingGroups[a.ID].Count : 0,
                        Plants = mappingGroups.ContainsKey(a.ID) ? mappingGroups[a.ID].Plants : "",
                        IsBlocked = a.IsBlocked,
                        BlockedReason = a.BlockedReason,
                        BlockedOn = a.BlockedOn
                    })
```

- [ ] **Step 5: Rebuild and verify**

Run:
```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo -v:q 2>&1 | grep "error CS"
```
Expected: no output (0 errors).

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/weka/Indigo/sistropigroup"
git add SISTROAWESOME/Models/ArmadaView.cs SISTROAWESOME/Models/ArmadaSettingView.cs SISTROAWESOME/api/ArmadaController.cs SISTROAWESOME/api/SuperadminArmadaController.cs
git commit -m "feat: expose IsBlocked/BlockedReason/BlockedOn in Armada listing endpoints"
```

---

### Task 2: Backend — exclude blocked armada from all 4 booking-selection endpoints

**Files:**
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\ArmadaController.cs` (`DataPagination` ~L3596-3705, `DataPaginationPercepatan` ~L3709-3860)
- Modify: `C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\MobileTransportController.cs` (`ListArmadaPagination` ~L499-594, `ListArmadaPaginationPercepatan` ~L602-736)

These 4 methods are pre-existing near-duplicate copies of the same `IQueryable<ArmadaMapping>` filter chain (one already has a comment noting it's "Berdasarkan ArmadaController.DataPaginationPercepatan"). Each gets the identical one-line filter added right after its existing KIR-expiry filter — that filter is unconditional (applies to every company/posto, no feature flag), which is the same behavior blokir should have, so it's inserted in the same spot for consistency.

- [ ] **Step 1: `ArmadaController.cs::DataPagination`**

Find (currently L3638-3643):
```csharp
                // Filter: KIR tidak boleh kadaluarsa (berlaku untuk semua company)
                DateTime todayKir = DateTime.Now.Date;
                query = query.Where(x => !x.Armada1.masa_berlaku_kir.HasValue ||
                                         x.Armada1.masa_berlaku_kir.Value >= todayKir);

                // Filter armada berdasarkan IdGrupTruk posto (strict): Posto.IdGrupTruk
```
Replace with:
```csharp
                // Filter: KIR tidak boleh kadaluarsa (berlaku untuk semua company)
                DateTime todayKir = DateTime.Now.Date;
                query = query.Where(x => !x.Armada1.masa_berlaku_kir.HasValue ||
                                         x.Armada1.masa_berlaku_kir.Value >= todayKir);

                // Filter: armada yang diblokir tidak boleh dipilih untuk booking
                query = query.Where(x => x.Armada1.IsBlocked == false);

                // Filter armada berdasarkan IdGrupTruk posto (strict): Posto.IdGrupTruk
```

- [ ] **Step 2: `ArmadaController.cs::DataPaginationPercepatan`**

Find (currently L3742-3747):
```csharp
                // Filter: KIR tidak boleh kadaluarsa (berlaku untuk semua company)
                DateTime todayKir = DateTime.Now.Date;
                query = query.Where(x => !x.Armada1.masa_berlaku_kir.HasValue ||
                                         x.Armada1.masa_berlaku_kir.Value >= todayKir);

                // Filter armada berdasarkan IdGrupTruk posto (strict): Posto.IdGrupTruk
```
Replace with:
```csharp
                // Filter: KIR tidak boleh kadaluarsa (berlaku untuk semua company)
                DateTime todayKir = DateTime.Now.Date;
                query = query.Where(x => !x.Armada1.masa_berlaku_kir.HasValue ||
                                         x.Armada1.masa_berlaku_kir.Value >= todayKir);

                // Filter: armada yang diblokir tidak boleh dipilih untuk booking
                query = query.Where(x => x.Armada1.IsBlocked == false);

                // Filter armada berdasarkan IdGrupTruk posto (strict): Posto.IdGrupTruk
```

**Note:** there are two occurrences of this exact "KIR tidak boleh kadaluarsa" block across the file (one in each method above) — when editing, use enough surrounding context (the method signature a few lines above, or the fact that `DataPagination`'s copy uses `Company company = db.Company...AsEnumerable()...` above it while `DataPaginationPercepatan`'s copy is preceded by the "Fetch company info for tahun pembuatan config" comment) to confirm which occurrence is being edited, so both get the filter and neither gets it twice.

- [ ] **Step 3: `MobileTransportController.cs::ListArmadaPagination`**

Find (currently L544-548):
```csharp
                DateTime todayKir = DateTime.Now.Date;
                query = query.Where(x => !x.Armada1.masa_berlaku_kir.HasValue ||
                                         x.Armada1.masa_berlaku_kir.Value >= todayKir);

                // Filter armada berdasarkan IdGrupTruk posto (strict): Posto.IdGrupTruk
                // menyimpan nilai Sumbu.Id maksimal yang boleh booking di posto ini.
```
Replace with:
```csharp
                DateTime todayKir = DateTime.Now.Date;
                query = query.Where(x => !x.Armada1.masa_berlaku_kir.HasValue ||
                                         x.Armada1.masa_berlaku_kir.Value >= todayKir);

                // Filter: armada yang diblokir tidak boleh dipilih untuk booking
                query = query.Where(x => x.Armada1.IsBlocked == false);

                // Filter armada berdasarkan IdGrupTruk posto (strict): Posto.IdGrupTruk
                // menyimpan nilai Sumbu.Id maksimal yang boleh booking di posto ini.
```

- [ ] **Step 4: `MobileTransportController.cs::ListArmadaPaginationPercepatan`**

Find (currently L635-639):
```csharp
                DateTime todayKir = DateTime.Now.Date;
                query = query.Where(x => !x.Armada1.masa_berlaku_kir.HasValue ||
                                         x.Armada1.masa_berlaku_kir.Value >= todayKir);

                // Filter armada berdasarkan IdGrupTruk posto (strict): Posto.IdGrupTruk
                // menyimpan nilai Sumbu.Id maksimal yang boleh booking di posto ini. Ini
```
Replace with:
```csharp
                DateTime todayKir = DateTime.Now.Date;
                query = query.Where(x => !x.Armada1.masa_berlaku_kir.HasValue ||
                                         x.Armada1.masa_berlaku_kir.Value >= todayKir);

                // Filter: armada yang diblokir tidak boleh dipilih untuk booking
                query = query.Where(x => x.Armada1.IsBlocked == false);

                // Filter armada berdasarkan IdGrupTruk posto (strict): Posto.IdGrupTruk
                // menyimpan nilai Sumbu.Id maksimal yang boleh booking di posto ini. Ini
```

- [ ] **Step 5: Rebuild and verify**

Run:
```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo -v:q 2>&1 | grep "error CS"
```
Expected: no output (0 errors).

- [ ] **Step 6: Hand-trace all 4 methods**

Re-read all 4 edited methods and confirm: each has exactly one new `.Where(x => x.Armada1.IsBlocked == false)` line, placed after the KIR filter and before the IdGrupTruk filter, and no existing line was altered or duplicated.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/weka/Indigo/sistropigroup"
git add SISTROAWESOME/api/ArmadaController.cs SISTROAWESOME/api/MobileTransportController.cs
git commit -m "feat: exclude blocked armada from tiket booking selection (web + mobile)"
```

---

### Task 3: Frontend — `ConfirmDialog` gets an optional content slot

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\components\ui\ConfirmDialog.tsx`

- [ ] **Step 1: Add the `children` prop**

Find:
```tsx
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info" | "success"
  isLoading?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "info",
  isLoading = false,
}) => {
```
Replace with:
```tsx
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info" | "success"
  isLoading?: boolean
  children?: React.ReactNode
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "info",
  isLoading = false,
  children,
}) => {
```

- [ ] **Step 2: Render `children` between the description and the footer**

Find:
```tsx
          <div className="space-y-1">
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <DialogDescription className="text-sm">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 sm:justify-center gap-2">
```
Replace with:
```tsx
          <div className="space-y-1">
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <DialogDescription className="text-sm">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>
        {children && <div className="px-1">{children}</div>}
        <DialogFooter className="mt-4 sm:justify-center gap-2">
```

- [ ] **Step 3: Typecheck**

Run:
```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no new errors mentioning `ConfirmDialog.tsx`. (Pre-existing unrelated errors elsewhere in the project, if any, are not this task's concern — only confirm nothing new appears for this file.)

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/components/ui/ConfirmDialog.tsx
git commit -m "feat: allow ConfirmDialog to render extra content (e.g. a reason field)"
```

---

### Task 4: Frontend — new proxy routes for the superadmin fleet page

**Files:**
- Create: `C:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\armada\toggle-blokir\route.ts`
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\armada\route.ts`

`/superadmin/settings/fleet` talks to the backend exclusively through this Next.js BFF proxy pattern (`aspnetFetchServer` with the session's ASP.NET token), never `useApi` directly — see the existing `route.ts` (GET) and `mapping/route.ts` (GET/POST/DELETE) for the established pattern this follows.

- [ ] **Step 1: Create the toggle-blokir proxy route**

Write `C:\Users\weka\Indigo\SISTROV2-next\src\app\api\admin\armada\toggle-blokir\route.ts`:
```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id, isBlocked, reason } = await req.json();
    if (id == null || typeof isBlocked !== "boolean") {
      return NextResponse.json({ success: false, error: "id dan isBlocked wajib diisi." }, { status: 400 });
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/Armada/ToggleBlokir', token, {
      method: 'POST',
      body: JSON.stringify({ ID: id, IsBlocked: isBlocked, Reason: reason || "" }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json({ success: false, error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Map the 4 new fields through the listing GET route**

Find (in `src/app/api/admin/armada/route.ts`, the per-row `.map(...)`, currently the last 2 fields before the closing `}));`):
```typescript
      mappingCount: a.MappingCount || 0,
      plants: a.Plants || '',
    }));
```
Replace with:
```typescript
      mappingCount: a.MappingCount || 0,
      plants: a.Plants || '',
      isBlocked: a.IsBlocked ?? false,
      blockedOn: a.BlockedOn || null,
      blockedReason: a.BlockedReason || null,
    }));
```

- [ ] **Step 3: Typecheck**

Run:
```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no new errors for either route file.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/app/api/admin/armada/toggle-blokir/route.ts src/app/api/admin/armada/route.ts
git commit -m "feat: add ToggleBlokir proxy route, map blokir fields through armada listing route"
```

---

### Task 5: Frontend — wire Blokir column + dialog into `/armada`

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\armada\page.tsx`

`isRekanan` (already defined at L89: `role === "rekanan" || role === "transport"`) gates the Block/Unblock button — rekanan users only ever see the status badge, matching the existing gating on the Transportir/Kode Vendor columns (L449-466).

- [ ] **Step 1: Add icons + `ConfirmDialog` import**

Find (L3):
```tsx
import { Plus, FileEdit, Trash2, ExternalLink, Eye, FileText, Download, AlertCircle, X, Loader2 } from "lucide-react";
```
Replace with:
```tsx
import { Plus, FileEdit, Trash2, ExternalLink, Eye, FileText, Download, AlertCircle, X, Loader2, Ban, Unlock } from "lucide-react";
```

Find (L10, `useToast` import line):
```tsx
import { useToast } from "@/components/ui/toast";
```
Replace with:
```tsx
import { useToast } from "@/components/ui/toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
```

- [ ] **Step 2: Add blokir fields to `FleetData`**

Find (L24-36):
```tsx
interface FleetData {
  Nopol: string;
  __key?: string;
  VendorCode?: string;
  TransporterName?: string;
  NamaTransportir?: string;
  AxleName?: string;
  NamaSumbu?: string;
  Type?: string;
  IsVerified: boolean | number;
  ExpiryDate?: string;
  TglDaftar?: string;
}
```
Replace with:
```tsx
interface FleetData {
  Nopol: string;
  __key?: string;
  VendorCode?: string;
  TransporterName?: string;
  NamaTransportir?: string;
  AxleName?: string;
  NamaSumbu?: string;
  Type?: string;
  IsVerified: boolean | number;
  ExpiryDate?: string;
  TglDaftar?: string;
  ID?: number;
  IsBlocked?: boolean;
  BlockedReason?: string;
  BlockedOn?: string;
}
```

- [ ] **Step 3: Add blokir state (next to the existing `deleteId`/`deleteReason` state)**

Find (L110-112):
```tsx
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("33");
  const [isExporting, setIsExporting] = useState(false);
```
Replace with:
```tsx
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("33");
  const [isExporting, setIsExporting] = useState(false);

  const [blokirTarget, setBlokirTarget] = useState<{ id: number; nextIsBlocked: boolean } | null>(null);
  const [blokirReason, setBlokirReason] = useState("");
```

- [ ] **Step 4: Add `blokirMutation` (right after `deleteMutation`)**

Find (L343-368, ending with the closing `});` of `deleteMutation`):
```tsx
  const deleteMutation = useMutation({
    mutationFn: async ({ id, alasan }: { id: string; alasan: string }) => {
      const fd = new URLSearchParams();
      fd.append("ID", id);
      fd.append("nopol", alasan); // ASP.NET expects reason inside 'nopol' property

      const res = await apiFetch("/api/Armada/DeleteData", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: fd.toString(),
      });
      return res;
    },
    onSuccess: (res: any) => {
      setDeleteId(null);
      if (typeof res === "string" && res.includes("sukses")) {
        addToast({ title: "Berhasil", description: "Armada telah dihapus.", variant: "default" });
        queryClient.invalidateQueries({ queryKey: ["armada"] });
      } else {
        addToast({ title: "Gagal", description: typeof res === "string" ? res : "Gagal menghapus armada", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
```
Replace with:
```tsx
  const deleteMutation = useMutation({
    mutationFn: async ({ id, alasan }: { id: string; alasan: string }) => {
      const fd = new URLSearchParams();
      fd.append("ID", id);
      fd.append("nopol", alasan); // ASP.NET expects reason inside 'nopol' property

      const res = await apiFetch("/api/Armada/DeleteData", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: fd.toString(),
      });
      return res;
    },
    onSuccess: (res: any) => {
      setDeleteId(null);
      if (typeof res === "string" && res.includes("sukses")) {
        addToast({ title: "Berhasil", description: "Armada telah dihapus.", variant: "default" });
        queryClient.invalidateQueries({ queryKey: ["armada"] });
      } else {
        addToast({ title: "Gagal", description: typeof res === "string" ? res : "Gagal menghapus armada", variant: "destructive" });
      }
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const blokirMutation = useMutation({
    mutationFn: async ({ id, isBlocked, reason }: { id: number; isBlocked: boolean; reason: string }) => {
      const res = await apiFetch("/api/Armada/ToggleBlokir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ID: id, IsBlocked: isBlocked, Reason: reason }),
      });
      return res;
    },
    onSuccess: (_res: any, variables) => {
      setBlokirTarget(null);
      setBlokirReason("");
      addToast({
        title: "Berhasil",
        description: variables.isBlocked ? "Armada telah diblokir." : "Blokir armada telah dibuka.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["armada"] });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
```

- [ ] **Step 5: Add the "Blokir" column (right after "Status")**

Find (L546-557):
```tsx
    {
      key: "Status",
      header: "Status",
      render: (f: any) => {
        const isVerified = f.isVerified ?? f.IsVerified ?? f.status ?? f.Status ?? true;
        return (
          <Badge color={isVerified ? "success" : "warning"} size="sm" variant="light" className="whitespace-nowrap">
            {isVerified ? "Active" : "Pending"}
          </Badge>
        );
      },
    },
```
Replace with:
```tsx
    {
      key: "Status",
      header: "Status",
      render: (f: any) => {
        const isVerified = f.isVerified ?? f.IsVerified ?? f.status ?? f.Status ?? true;
        return (
          <Badge color={isVerified ? "success" : "warning"} size="sm" variant="light" className="whitespace-nowrap">
            {isVerified ? "Active" : "Pending"}
          </Badge>
        );
      },
    },
    {
      key: "Blokir",
      header: "Blokir",
      render: (f: any) => {
        const isBlocked = f.isBlocked ?? f.IsBlocked ?? false;
        return (
          <Badge color={isBlocked ? "error" : "success"} size="sm" variant="light" className="whitespace-nowrap">
            {isBlocked ? "Diblokir" : "Aktif"}
          </Badge>
        );
      },
    },
```

- [ ] **Step 6: Add the Block/Unblock button in the Action column**

Find (L589-630, the whole "Action" column entry):
```tsx
    {
      key: "Action",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      render: (f: any) => {
        // C# API returns an HTML string for Action with embedded JS calls (e.g. editItemProcess('123')).
        // We extract the ID using Regex to bring the functionality natively to Next.js.
        const editMatch = f.Action?.match(/editItemProcess\('([^']+)'\)/);
        const deleteMatch = f.Action?.match(/deleteItemProcess\('([^']+)'\)/);

        const editId = editMatch ? editMatch[1] : null;
        const deleteId = deleteMatch ? deleteMatch[1] : null;

        if (!editId && !deleteId) return <span className="text-gray-400 italic text-xs">No Action</span>;

        return (
          <div className="flex items-center justify-end gap-1">
            {editId && (
              <Button
                variant="outline"
                size="sm"
                className="text-amber-500 border-amber-200 hover:bg-amber-50 bg-white dark:bg-transparent h-7 px-2"
                onClick={() => setEditId(editId)}
              >
                <FileEdit className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
            {deleteId && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50 bg-white dark:bg-transparent h-7 px-2"
                onClick={() => setDeleteId(deleteId)}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Hapus
              </Button>
            )}
          </div>
        );
      },
    },
```
Replace with:
```tsx
    {
      key: "Action",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      render: (f: any) => {
        // C# API returns an HTML string for Action with embedded JS calls (e.g. editItemProcess('123')).
        // We extract the ID using Regex to bring the functionality natively to Next.js.
        const editMatch = f.Action?.match(/editItemProcess\('([^']+)'\)/);
        const deleteMatch = f.Action?.match(/deleteItemProcess\('([^']+)'\)/);

        const editId = editMatch ? editMatch[1] : null;
        const deleteId = deleteMatch ? deleteMatch[1] : null;
        const armadaId: number | null = f.ID ?? f.id ?? null;
        const isBlocked = f.isBlocked ?? f.IsBlocked ?? false;

        if (!editId && !deleteId && !armadaId) return <span className="text-gray-400 italic text-xs">No Action</span>;

        return (
          <div className="flex items-center justify-end gap-1">
            {editId && (
              <Button
                variant="outline"
                size="sm"
                className="text-amber-500 border-amber-200 hover:bg-amber-50 bg-white dark:bg-transparent h-7 px-2"
                onClick={() => setEditId(editId)}
              >
                <FileEdit className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
            {deleteId && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50 bg-white dark:bg-transparent h-7 px-2"
                onClick={() => setDeleteId(deleteId)}
              >
                <Trash2 className="h-3 w-3 mr-1" /> Hapus
              </Button>
            )}
            {!isRekanan && armadaId != null && (
              <Button
                variant="outline"
                size="sm"
                className={isBlocked
                  ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-white dark:bg-transparent h-7 px-2"
                  : "text-gray-600 border-gray-200 hover:bg-gray-50 bg-white dark:bg-transparent h-7 px-2"}
                onClick={() => setBlokirTarget({ id: armadaId, nextIsBlocked: !isBlocked })}
              >
                {isBlocked ? <Unlock className="h-3 w-3 mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                {isBlocked ? "Buka Blokir" : "Blokir"}
              </Button>
            )}
          </div>
        );
      },
    },
```

- [ ] **Step 7: Render the blokir `ConfirmDialog` (right after the existing Delete Modal)**

Find (L846-872, the whole "Delete Modal" `<Dialog>` block, ending with its closing `</Dialog>`):
```tsx
      {/* Delete Modal */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Armada</DialogTitle>
            <DialogDescription>Masukkan alasan penghapusan unit armada ini dari sistem.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 mb-2 block">Alasan Hapus</label>
            <select
              className="w-full h-11 px-3 border border-gray-100 rounded-xl bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition-shadow"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            >
              <option value="33">Double (Duplikat)</option>
              <option value="Pensiun">Unit Rusak / Pensiun</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: deleteId!, alasan: deleteReason })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Armada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```
Replace with:
```tsx
      {/* Delete Modal */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Armada</DialogTitle>
            <DialogDescription>Masukkan alasan penghapusan unit armada ini dari sistem.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 mb-2 block">Alasan Hapus</label>
            <select
              className="w-full h-11 px-3 border border-gray-100 rounded-xl bg-white dark:bg-gray-900 dark:border-gray-800 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition-shadow"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            >
              <option value="33">Double (Duplikat)</option>
              <option value="Pensiun">Unit Rusak / Pensiun</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: deleteId!, alasan: deleteReason })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Armada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blokir/Unblock Confirm Dialog */}
      <ConfirmDialog
        open={!!blokirTarget}
        onOpenChange={(open) => { if (!open) { setBlokirTarget(null); setBlokirReason(""); } }}
        title={blokirTarget?.nextIsBlocked ? "Blokir Armada" : "Buka Blokir Armada"}
        description={blokirTarget?.nextIsBlocked
          ? "Armada yang diblokir tidak akan bisa dipilih saat pembuatan tiket baru."
          : "Armada ini akan bisa dipilih kembali saat pembuatan tiket baru."}
        onConfirm={() => blokirTarget && blokirMutation.mutate({ id: blokirTarget.id, isBlocked: blokirTarget.nextIsBlocked, reason: blokirReason })}
        confirmText={blokirMutation.isPending ? "Memproses..." : blokirTarget?.nextIsBlocked ? "Ya, Blokir" : "Ya, Buka Blokir"}
        cancelText="Batal"
        variant={blokirTarget?.nextIsBlocked ? "danger" : "warning"}
        isLoading={blokirMutation.isPending}
      >
        {blokirTarget?.nextIsBlocked && (
          <div>
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 mb-2 block">Alasan Blokir</label>
            <Input
              value={blokirReason}
              onChange={(e) => setBlokirReason(e.target.value)}
              placeholder="Contoh: KIR bermasalah, unit rusak, dsb."
            />
          </div>
        )}
      </ConfirmDialog>
```

- [ ] **Step 8: Typecheck**

Run:
```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no new errors for `src/app/armada/page.tsx`.

- [ ] **Step 9: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/app/armada/page.tsx
git commit -m "feat: add Blokir column and toggle dialog to /armada"
```

---

### Task 6: Frontend — wire Blokir column + dialog into `/superadmin/settings/fleet`

**Files:**
- Modify: `C:\Users\weka\Indigo\SISTROV2-next\src\app\superadmin\settings\fleet\page.tsx`

This page is a plain `<table>`, not the `DataTable` component — the 3 `colSpan={25}` values (loading/error/empty rows) **must** be bumped to `26` once a column is added, or those 3 states will render visually misaligned/short by one column.

- [ ] **Step 1: Add icons**

Find (L3-15):
```tsx
import {
  Truck,
  Search,
  ArrowRightLeft,
  MapPin,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
  X,
  ShieldCheck,
  Layers,
} from "lucide-react";
```
Replace with:
```tsx
import {
  Truck,
  Search,
  ArrowRightLeft,
  MapPin,
  CheckCircle2,
  Loader2,
  Trash2,
  RefreshCw,
  X,
  ShieldCheck,
  Layers,
  Ban,
  Unlock,
} from "lucide-react";
```

- [ ] **Step 2: Add blokir fields to `ArmadaRow`**

Find (L25-52):
```tsx
interface ArmadaRow {
  no: number;
  id: number;
  transportCode: string;
  nopol: string;
  updatedBy: string;
  updatedOn: string | null;
  sumbu: string;
  jenisKendaraan: string;
  qtyMax: number | null;
  kir: string;
  jbi: number | null;
  beratKendaraan: number | null;
  beratPenumpang: number | null;
  approver: string;
  approve: boolean | null;
  revised: string;
  charter: boolean | null;
  tahunPembuatan: number | null;
  noRangkaStnk: string;
  noMesinStnk: string;
  masaBerlakuKir: string | null;
  noRangkaKir: string;
  noMesinKir: string;
  statusArmada: string;
  mappingCount: number;
  plants: string;
}
```
Replace with:
```tsx
interface ArmadaRow {
  no: number;
  id: number;
  transportCode: string;
  nopol: string;
  updatedBy: string;
  updatedOn: string | null;
  sumbu: string;
  jenisKendaraan: string;
  qtyMax: number | null;
  kir: string;
  jbi: number | null;
  beratKendaraan: number | null;
  beratPenumpang: number | null;
  approver: string;
  approve: boolean | null;
  revised: string;
  charter: boolean | null;
  tahunPembuatan: number | null;
  noRangkaStnk: string;
  noMesinStnk: string;
  masaBerlakuKir: string | null;
  noRangkaKir: string;
  noMesinKir: string;
  statusArmada: string;
  mappingCount: number;
  plants: string;
  isBlocked: boolean;
  blockedOn: string | null;
  blockedReason: string | null;
}
```

- [ ] **Step 3: Add blokir state (next to the existing mapping-delete state)**

Find (L98-99):
```tsx
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showDeleteMappingConfirm, setShowDeleteMappingConfirm] = useState(false);
```
Replace with:
```tsx
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showDeleteMappingConfirm, setShowDeleteMappingConfirm] = useState(false);

  const [blokirTarget, setBlokirTarget] = useState<{ id: number; nextIsBlocked: boolean } | null>(null);
  const [blokirReason, setBlokirReason] = useState("");
```

- [ ] **Step 4: Add `blokirMutation` (right after `deleteMappingMutation`)**

Find (L181-195, the whole `deleteMappingMutation` block):
```tsx
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/armada/mapping?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      addToast({ title: "Mapping Dihapus", variant: "success" });
      if (selectedArmada) fetchMappings(selectedArmada.id);
      queryClient.invalidateQueries({ queryKey: ["superadmin-armada"] });
    },
    onError: (err: Error) => {
      addToast({ title: "Gagal Menghapus", description: err.message, variant: "destructive" });
    },
  });
```
Replace with:
```tsx
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/armada/mapping?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: () => {
      addToast({ title: "Mapping Dihapus", variant: "success" });
      if (selectedArmada) fetchMappings(selectedArmada.id);
      queryClient.invalidateQueries({ queryKey: ["superadmin-armada"] });
    },
    onError: (err: Error) => {
      addToast({ title: "Gagal Menghapus", description: err.message, variant: "destructive" });
    },
  });

  const blokirMutation = useMutation({
    mutationFn: async ({ id, isBlocked, reason }: { id: number; isBlocked: boolean; reason: string }) => {
      const res = await fetch("/api/admin/armada/toggle-blokir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isBlocked, reason }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    },
    onSuccess: (_data, variables) => {
      setBlokirTarget(null);
      setBlokirReason("");
      addToast({
        title: "Berhasil",
        description: variables.isBlocked ? "Armada telah diblokir." : "Blokir armada telah dibuka.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["superadmin-armada"] });
    },
    onError: (err: Error) => {
      addToast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });
```

- [ ] **Step 5: Add the "Blokir" table header + bump `colSpan`**

Find (L319-320):
```tsx
                  <th className={thClass}>Mapping</th>
                  <th className={thClass + " text-right"}>Aksi</th>
```
Replace with:
```tsx
                  <th className={thClass}>Mapping</th>
                  <th className={thClass}>Blokir</th>
                  <th className={thClass + " text-right"}>Aksi</th>
```

Find (3 occurrences of `colSpan={25}` — the loading row, the error row, and the empty-state row; edit each individually with its surrounding context since they're not adjacent, `replace_all` would work here too since the literal string `colSpan={25}` is identical and unambiguous in all 3 spots):
```tsx
colSpan={25}
```
Replace all 3 occurrences with:
```tsx
colSpan={26}
```

- [ ] **Step 6: Add the "Blokir" cell + action button in the row body**

Find (L409-435, the Mapping `<td>` through the closing Action `<td>`):
```tsx
                        <td className={tdClass}>
                          {a.mappingCount > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                              {a.plants.split(", ").slice(0, 3).map((p, i) => (
                                <span key={i} className="flex items-center gap-0.5 text-[9px] font-black uppercase bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                                  <MapPin className="h-2 w-2" />{p}
                                </span>
                              ))}
                              {a.plants.split(", ").length > 3 && (
                                <span className="text-[9px] text-gray-400">+{a.plants.split(", ").length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Belum di-map</span>
                          )}
                        </td>
                        <td className={tdClass + " text-right"}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Kelola Mapping"
                            className="text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                            onClick={() => { setSelectedArmada(a); setShowMappingModal(true); }}
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
```
Replace with:
```tsx
                        <td className={tdClass}>
                          {a.mappingCount > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                              {a.plants.split(", ").slice(0, 3).map((p, i) => (
                                <span key={i} className="flex items-center gap-0.5 text-[9px] font-black uppercase bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                                  <MapPin className="h-2 w-2" />{p}
                                </span>
                              ))}
                              {a.plants.split(", ").length > 3 && (
                                <span className="text-[9px] text-gray-400">+{a.plants.split(", ").length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Belum di-map</span>
                          )}
                        </td>
                        <td className={tdClass}>
                          <Badge color={a.isBlocked ? "error" : "success"} size="sm" variant="light">
                            {a.isBlocked ? "Diblokir" : "Aktif"}
                          </Badge>
                        </td>
                        <td className={tdClass + " text-right"}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Kelola Mapping"
                              className="text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                              onClick={() => { setSelectedArmada(a); setShowMappingModal(true); }}
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title={a.isBlocked ? "Buka Blokir" : "Blokir"}
                              className={a.isBlocked ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-500 hover:bg-gray-100"}
                              onClick={() => setBlokirTarget({ id: a.id, nextIsBlocked: !a.isBlocked })}
                            >
                              {a.isBlocked ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
```

- [ ] **Step 7: Render the blokir `ConfirmDialog` (right after the existing mapping-delete `ConfirmDialog`)**

Find (L571-580, the whole `ConfirmDialog` block, which is the last thing before the closing `</div>` of the component):
```tsx
      <ConfirmDialog
        open={showDeleteMappingConfirm}
        onOpenChange={setShowDeleteMappingConfirm}
        title="Hapus Mapping"
        description="Apakah Anda yakin ingin menghapus pemetaan armada ini ke plant? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDeleteMapping}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
```
Replace with:
```tsx
      <ConfirmDialog
        open={showDeleteMappingConfirm}
        onOpenChange={setShowDeleteMappingConfirm}
        title="Hapus Mapping"
        description="Apakah Anda yakin ingin menghapus pemetaan armada ini ke plant? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDeleteMapping}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />

      <ConfirmDialog
        open={!!blokirTarget}
        onOpenChange={(open) => { if (!open) { setBlokirTarget(null); setBlokirReason(""); } }}
        title={blokirTarget?.nextIsBlocked ? "Blokir Armada" : "Buka Blokir Armada"}
        description={blokirTarget?.nextIsBlocked
          ? "Armada yang diblokir tidak akan bisa dipilih saat pembuatan tiket baru."
          : "Armada ini akan bisa dipilih kembali saat pembuatan tiket baru."}
        onConfirm={() => blokirTarget && blokirMutation.mutate({ id: blokirTarget.id, isBlocked: blokirTarget.nextIsBlocked, reason: blokirReason })}
        confirmText={blokirMutation.isPending ? "Memproses..." : blokirTarget?.nextIsBlocked ? "Ya, Blokir" : "Ya, Buka Blokir"}
        cancelText="Batal"
        variant={blokirTarget?.nextIsBlocked ? "danger" : "warning"}
        isLoading={blokirMutation.isPending}
      >
        {blokirTarget?.nextIsBlocked && (
          <div>
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 mb-2 block">Alasan Blokir</label>
            <Input
              value={blokirReason}
              onChange={(e) => setBlokirReason(e.target.value)}
              placeholder="Contoh: KIR bermasalah, unit rusak, dsb."
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
```

- [ ] **Step 8: Typecheck**

Run:
```bash
cd "C:/Users/weka/Indigo/SISTROV2-next" && npx tsc --noEmit
```
Expected: no new errors for `src/app/superadmin/settings/fleet/page.tsx`.

- [ ] **Step 9: Commit**

```bash
cd "C:/Users/weka/Indigo/SISTROV2-next"
git add src/app/superadmin/settings/fleet/page.tsx
git commit -m "feat: add Blokir column and toggle dialog to /superadmin/settings/fleet"
```

---

### Task 7: End-to-end manual verification

**Files:** none (verification only, no commit)

No automated test runner exists for either repo (see plan header). This task is a manual pass through the running app to confirm the whole feature actually works, not just that it compiles.

- [ ] **Step 1: Start both projects**

Run (from `sistropigroup` root, per `AGENTS.md`):
```powershell
cd C:\Users\weka\Indigo\sistropigroup
.\start-dev.ps1
```

- [ ] **Step 2: `/armada` — toggle blokir as an admin/staff user**

Log in as a non-rekanan user, go to `/armada`, confirm:
- A "Blokir" column shows "Aktif" (green) for every row.
- Clicking "Blokir" on a row opens the confirm dialog with a reason field; submitting it closes the dialog, the row now shows "Diblokir" (red), and the Action button now reads "Buka Blokir".
- Clicking "Buka Blokir" opens the confirm dialog (no reason field this time), submitting it flips the row back to "Aktif".

- [ ] **Step 3: `/armada` — confirm rekanan users can't toggle**

Log in as a `rekanan`/`transport` user, go to `/armada`, confirm the "Blokir" column still shows status but there is no Blokir/Buka Blokir button in the Action column for any row (only Edit, if present).

- [ ] **Step 4: `/superadmin/settings/fleet` — toggle blokir**

Log in as `superadmin` or `ti`, go to `/superadmin/settings/fleet`, repeat the same block/unblock check as Step 2 (badge + button in the new "Blokir" column).

- [ ] **Step 5: Confirm booking exclusion**

Block one specific armada (note its `nopol`). Open a tiket-booking flow that lets you pick an armada (`TicketBookingDetail.tsx`'s "Pilih Armada" dropdown, or the "Edit Tiket Armada" modal in `TicketActions.tsx`) for the same transportir/company that armada belongs to, and confirm that blocked `nopol` no longer appears in the dropdown/search results. Unblock it and confirm it reappears.
