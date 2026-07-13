# SO Page Rekanan/Transport Delete Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `rekanan`/`transport` role users delete SO rows (never POSTO rows), and rebuild the SO list page to match the richer `posto/page.tsx` UI (Print button, Edit modal gated by role whitelist, embedded ticket-history in the View modal, full column set).

**Architecture:** Two independent, sequential file changes. First harden the delete guard on the existing POSTO page (`src/app/posto/page.tsx`) so `rekanan`/`transport` can never delete a POSTO row regardless of ownership. Second, fully rewrite `src/app/so/page.tsx` — same visual/structural pattern as `posto/page.tsx` (columns, Print, Edit modal, embedded ticket history) — but keep SO's existing working fetch wiring (manual `URLSearchParams` POST to `/api/SO/DataTableFilter`, `tipe=SO`) and its delete-reason dropdown, and change the Delete button's visibility rule so `rekanan`/`transport` users see it.

**Tech Stack:** Next.js 16 client component (`"use client"`), next-auth `useSession`, TanStack Query (`useQueryClient`), existing `useApi`/`useCompany` hooks, existing `DataTable` component, existing `Dialog`/`ConfirmDialog` UI primitives. No backend changes — confirmed `POSTOController.DeleteData` (backs both `/api/POSTO/DeleteData` used by both pages) has no server-side role attribute, so this is purely a front-end permission change. No test framework exists in this repo for these page components (verified via grep — zero `*.test.{ts,tsx}` reference `posto`/`SOPage`), so verification is manual (dev server + role switch), not automated tests.

---

## File Structure

- Modify: `src/app/posto/page.tsx` — harden `canDeleteThisPosto` to always exclude `rekanan`/`transport`.
- Modify (full rewrite): `src/app/so/page.tsx` — restyle to match `posto/page.tsx`, add Print/Edit-whitelist/embedded-ticket-history/extra columns, change Delete visibility to allow `rekanan`/`transport`.
- Not touched: `src/app/posto/so/page.tsx` — this is an orphaned duplicate not linked from `src/lib/menu-catalog.ts` (only `/so` is). Out of scope per user decision (replace `src/app/so/page.tsx` only).

---

### Task 1: Block POSTO delete for rekanan/transport unconditionally

**Files:**
- Modify: `src/app/posto/page.tsx:30-31`

- [ ] **Step 1: Read current guard**

Current code at `src/app/posto/page.tsx:27-31`:

```tsx
  const isRekanan = role === "rekanan" || role === "transport";
  const fullname = session?.user?.name as string | undefined;
  const isAdminTI = roles.some((r) => ["superadmin", "ti"].includes(r.toLowerCase()));
  const canDeleteThisPosto = (row: any) =>
    isAdminTI || (!!fullname && row.updatedby === fullname);
```

Today a `rekanan`/`transport` user can technically pass `canDeleteThisPosto` if `row.updatedby === fullname` (e.g. if a POSTO record happens to carry their name as `updatedby`). This must never happen — POSTO documents are POD-owned and must never be deletable by rekanan/transport, regardless of ownership match.

- [ ] **Step 2: Edit the guard**

In `src/app/posto/page.tsx`, replace:

```tsx
  const canDeleteThisPosto = (row: any) =>
    isAdminTI || (!!fullname && row.updatedby === fullname);
```

with:

```tsx
  const canDeleteThisPosto = (row: any) =>
    !isRekanan && (isAdminTI || (!!fullname && row.updatedby === fullname));
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev` (or `npm run dev:local`)

1. Log in as a `rekanan` or `transport` user, open `/posto`.
2. Confirm the "Hapus" delete button never appears on any row in the Action column, even if that row's `PIC`/`updatedby` matches the logged-in user's name.
3. Log in as `superadmin`/`ti`, confirm delete still appears as before (regression check).

Expected: rekanan/transport see zero delete buttons on `/posto`; admin/TI behavior unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/app/posto/page.tsx
git commit -m "fix: never allow rekanan/transport to delete POSTO rows"
```

---

### Task 2: Rewrite SO page to match POSTO page style and allow rekanan/transport delete

**Files:**
- Modify (full rewrite): `src/app/so/page.tsx`

**Behavior changes from the current file:**
1. Add `roles: string[]` + `fullname` + `isAdminTI` + `POSTO_EDIT_ROLES` whitelist + `canEditPosto`, copied from `posto/page.tsx`'s pattern.
2. **Edit** button now shown when `canEditPosto` is true (role whitelist), instead of the old blanket `!isRekanan`.
3. **Delete** button now shown when `canEditPosto || isRekanan || (fullname && row.updatedby === fullname)` — i.e. the same roles that could already edit/manage SO, **plus rekanan/transport explicitly**, plus the existing ownership fallback. This is the actual feature request: rekanan/transport gain the ability to delete SO rows.
4. Add a **Print** button (`window.open(\`/posto/print/${p.guid || p.noposto}\`, "_blank")`), matching POSTO's page.
5. Add the missing **CutOff**, **Kapal**, **Kota Tujuan**, **Mekanisme** (`percepatan`), **Grup Truk** (`gruptruk`), and **Status** columns — the data was already being fetched for `cutoff`/`kapal`/`kotatujuan` (present in the existing `colNames` array) but never rendered; `percepatan`/`gruptruk`/`status` are added to `colNames` and rendered, matching POSTO's column set exactly.
6. Add a date filter (`dateFilter` state + `SD` param) to the toolbar, matching POSTO's toolbar.
7. Add `companyCode` (from `useCompany()`) to the fetch payload when set, matching POSTO's multi-company filtering.
8. Replace the "Lihat Riwayat Tiket" external-link button in the View modal with an **embedded** ticket-history `DataTable`, copied verbatim from POSTO's View modal (same `/api/Tiket/DataTablePeriodeTiket` endpoint), so viewing an SO shows its bookings inline instead of linking out.
9. Everything else (the SO-specific delete-reason dropdown with `uploadcode`, the manual `URLSearchParams` fetcher hitting `/api/SO/DataTableFilter` with `tipe=SO`, the Edit modal fields) is preserved unchanged — this wiring already works and is not part of the requested change.

- [ ] **Step 1: Write the new file**

Replace the entire contents of `src/app/so/page.tsx` with:

```tsx
"use client";
import React, { useState } from "react";
import { Eye, FileEdit, Trash2, Package, Ticket, Printer, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import { useSession } from "next-auth/react";
import { useCompany } from "@/context/CompanyContext";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable, type DataTableColumn, type DataTableParams, type DataTableResult } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─────────────── Types ────────────────────────────────────────────────────────

interface SOItem {
  id: number;
  guid: string;
  noposto: string;
  tglposto: string;
  tanggalString: string;
  tgljatuhtempo: string;
  tanggaljatuhtempoString: string;
  asalString: string;
  tujuanString: string;
  transportString: string;
  distributorString: string;
  produkString: string;
  qty: number;
  qtyrencana: number;
  qtyrealisasi: number;
  qtysisaBooking: number;
  qtysisaRealisasi: number;
  wilayah: string;
  bagian: string;
  updatedby: string;
  numberString: string;
  cutoff: string;
  kapal: string;
  kotatujuan: string;
  percepatan: string;
  gruptruk: string;
  statusString: string;
  status: string;
}

// Edit SO: SuperAdmin/TI, Admin, Candal, dan StaffArea — Gudang/Security/Timbangan/Rekanan/Transport TIDAK boleh edit
const POSTO_EDIT_ROLES = [
  "superadmin", "ti",
  "admin", "adminsumbu",
  "candalkuota", "candaltruk", "candaltruck", "candalcontainer",
  "candalgudangposto", "candalgudang", "candaldept", "candalkapal",
  "staffarea", "staffarewilayah1", "staffarewilayah2",
  "staffarealayah1", "staffarealayah2", "staffareajatim",
];

// ─────────────── Page Component ──────────────────────────────────────────────

export default function SOPage() {
  const { data: session } = useSession();
  const { apiFetch } = useApi();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyCode } = useCompany();
  const companyCode = activeCompanyCode ?? undefined;

  const role = (session?.user as any)?.role?.toLowerCase();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isRekanan = role === "rekanan" || role === "transport";
  const fullname = session?.user?.name as string | undefined;
  const isAdminTI = roles.some((r) => ["superadmin", "ti"].includes(r.toLowerCase()));
  const canEditPosto = roles.some((r) => POSTO_EDIT_ROLES.includes(r.toLowerCase()));
  const canDeleteThisSO = (row: SOItem) =>
    canEditPosto || isRekanan || (!!fullname && row.updatedby === fullname);

  const [dateFilter, setDateFilter] = useState("");

  // ── Modal States ──
  const [selectedSO, setSelectedSO] = useState<SOItem | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("34");
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ qty: "", tglakhir: "", tgljatuhtempo: "" });

  // ── Fetcher — bypass apiTable to avoid double-flattening ──
  const fetcher = async (params: DataTableParams): Promise<DataTableResult<SOItem>> => {
    const form = new URLSearchParams();
    form.set("draw", String(params.draw));
    form.set("start", String(params.start));
    form.set("length", String(params.length));
    form.set("search[value]", params.search || "");
    form.set("search[regex]", "false");
    form.set("tipe", "SO");
    form.set("SD", dateFilter || "");
    form.set("order[0][column]", "3");
    form.set("order[0][dir]", "desc");
    if (companyCode) form.set("companyCode", companyCode);

    const colNames = [
      "charter","action","wilayah","tanggalString","noposto","tglakhirString",
      "asalString","tujuanString","bagian","transportString","produkString",
      "qty","qtyrencana","qtysisaBooking","qtyrealisasi","qtysisaRealisasi",
      "cutoff","kapal","kotatujuan","updatedby","tanggaljatuhtempoString",
      "percepatan","gruptruk"
    ];
    colNames.forEach((name, i) => {
      form.set(`columns[${i}][name]`, name);
      form.set(`columns[${i}][searchable]`, "true");
      form.set(`columns[${i}][orderable]`, "true");
      form.set(`columns[${i}][search][value]`, "");
      form.set(`columns[${i}][search][regex]`, "false");
    });

    const colIndices: Record<string, number> = {
      wilayah: 2, tanggalString: 3, noposto: 4, asalString: 6,
      tujuanString: 7, bagian: 8, transportString: 9, produkString: 10,
    };
    if (params.columnFilters) {
      Object.entries(params.columnFilters).forEach(([key, val]) => {
        const idx = colIndices[key];
        if (idx !== undefined && val) form.set(`columns[${idx}][search][value]`, val);
      });
    }

    const res = await apiFetch("/api/SO/DataTableFilter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) throw new Error(`[${res.status}]`);
    return res.json() as Promise<DataTableResult<SOItem>>;
  };

  // ── View ──
  const handleView = async (noposto: string) => {
    try {
      const res = await apiFetch("/api/POSTO/DetailData", {
        method: "POST",
        body: JSON.stringify({ noposto }),
      });
      const data = await res.json();
      setSelectedSO(data?.noposto ? data : data?.data ?? null);
      setIsViewOpen(true);
    } catch {
      addToast({ title: "Error", description: "Gagal memuat detail SO", variant: "destructive" });
    }
  };

  // ── Edit ──
  const handleEditInit = async (noposto: string) => {
    try {
      const res = await apiFetch("/api/POSTO/DetailData", {
        method: "POST",
        body: JSON.stringify({ noposto }),
      });
      const item = await res.json();
      const data = item?.noposto ? item : item?.data ?? item;
      setSelectedSO(data);
      setEditForm({
        qty: String(data.qty ?? ""),
        tglakhir: data.tglakhir2 ? data.tglakhir2.replace(/\//g, "-") : "",
        tgljatuhtempo: data.tgljatuhtempo ? data.tgljatuhtempo.split("T")[0] : "",
      });
      setIsEditOpen(true);
    } catch {
      addToast({ title: "Error", description: "Gagal memuat data SO", variant: "destructive" });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSO) return;
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/POSTO/UpdateData", {
        method: "POST",
        body: JSON.stringify({
          noposto: selectedSO.noposto,
          qty: parseFloat(editForm.qty),
          tglakhir: editForm.tglakhir,
          tgljatuhtempo: editForm.tgljatuhtempo || null,
        }),
      });
      if (res.ok) {
        addToast({ title: "Sukses", description: "Data SO berhasil diperbarui" });
        setIsEditOpen(false);
        queryClient.invalidateQueries({ queryKey: ["so-list"] });
      } else {
        const msg = await res.text();
        addToast({ title: "Gagal", description: msg || "Terjadi kesalahan", variant: "destructive" });
      }
    } catch {
      addToast({ title: "Error", description: "Gagal memperbarui data", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/POSTO/DeleteData", {
        method: "POST",
        body: JSON.stringify({ noposto: deleteTarget, uploadcode: deleteReason }),
      });
      if (res.ok) {
        addToast({ title: "Sukses", description: "Data SO berhasil dihapus" });
        setIsDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: ["so-list"] });
      } else {
        const msg = await res.text();
        addToast({ title: "Gagal", description: msg || "Gagal menghapus data", variant: "destructive" });
      }
    } catch {
      addToast({ title: "Error", description: "Gagal menghapus data", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("active")) return "info";
    if (s.includes("progress")) return "warning";
    if (s.includes("complete")) return "success";
    if (s.includes("cancel")) return "error";
    return "default";
  };

  // ── Columns — same style as POSTO ──
  const columns: DataTableColumn<SOItem>[] = [
    {
      key: "action",
      header: "Action",
      render: (p) => (
        <div className="flex items-center justify-start gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="bg-brand-50 text-brand-500 border-brand-200 hover:bg-brand-100 rounded-none h-7 font-bold text-[10px] uppercase tracking-wider"
            onClick={() => handleView(p.noposto)}
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> {isRekanan ? "Riwayat" : "View"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-slate-600 border-slate-200 hover:bg-slate-50 rounded-none h-7 text-[10px] uppercase tracking-wider"
            onClick={() => window.open(`/posto/print/${p.guid || p.noposto}`, "_blank")}
          >
            <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
          {canEditPosto && (
            <Button
              variant="outline"
              size="sm"
              className="text-amber-500 border-amber-200 hover:bg-amber-50 rounded-none h-7"
              onClick={() => handleEditInit(p.noposto)}
            >
              <FileEdit className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          )}
          {canDeleteThisSO(p) && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-500 border-red-200 hover:bg-red-50 rounded-none h-7"
              onClick={() => { setDeleteTarget(p.noposto); setDeleteReason("34"); setIsDeleteOpen(true); }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
            </Button>
          )}
        </div>
      ),
    },
    {
      key: "noposto",
      header: "NO SO",
      render: (p) => <span className="font-mono font-bold text-brand-600">{p.noposto}</span>,
    },
    {
      key: "tanggalString",
      header: "Tanggal",
      render: (p) => <span className="text-gray-500 font-mono text-xs">{p.tanggalString}</span>,
    },
    {
      key: "tanggaljatuhtempoString",
      header: "Jatuh Tempo",
      render: (p) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{p.tanggaljatuhtempoString || "-"}</span>,
    },
    {
      key: "transportString",
      header: "Transportir",
      render: (p) => (
        <div>
          <div className="text-sm font-medium">{p.transportString || "-"}</div>
          {p.distributorString && (
            <div className="text-[10px] text-gray-400 font-mono">{p.distributorString}</div>
          )}
        </div>
      ),
    },
    {
      key: "produkString",
      header: "Produk",
      render: (p) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-brand-500 shrink-0" />
          <span className="text-sm font-bold">{p.produkString || "-"}</span>
        </div>
      ),
    },
    {
      key: "qty",
      header: "Qty (Ton)",
      headerClassName: "text-right",
      className: "text-right font-bold",
      render: (p) => (p.qty || 0).toLocaleString(),
    },
    {
      key: "qtysisaBooking",
      header: "Sisa Booking",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div>
          <div className={cn("text-sm font-bold", (p.qtysisaBooking || 0) <= 0 ? "text-red-500" : "text-emerald-600")}>
            {(p.qtysisaBooking || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-400 uppercase">Ton</div>
        </div>
      ),
    },
    {
      key: "qtyrealisasi",
      header: "Realisasi",
      headerClassName: "text-right",
      className: "text-right",
      render: (p) => (
        <div>
          <div className="text-sm font-bold text-emerald-600">{(p.qtyrealisasi || 0).toLocaleString()}</div>
          <div className="text-[10px] text-gray-400 uppercase">Ton</div>
        </div>
      ),
    },
    { key: "asalString", header: "Asal", render: (p) => p.asalString || "-" },
    { key: "tujuanString", header: "Tujuan", render: (p) => p.tujuanString || "-" },
    { key: "wilayah", header: "Wilayah", render: (p) => <span className="font-medium">{p.wilayah || "-"}</span> },
    {
      key: "cutoff",
      header: "CutOff",
      render: (p) => (
        <span className={`text-xs font-medium ${(p.cutoff || "").includes("Cut Off (") ? "text-red-500" : "text-gray-400"}`}>
          {p.cutoff || "Belum Cut Off"}
        </span>
      ),
    },
    { key: "kapal", header: "Kapal", render: (p) => <span className="text-xs">{p.kapal || "-"}</span> },
    { key: "kotatujuan", header: "Kota Tujuan", render: (p) => <span className="text-xs">{p.kotatujuan || "-"}</span> },
    { key: "updatedby", header: "PIC", render: (p) => <span className="text-[10px] uppercase font-bold text-gray-400">{p.updatedby || "-"}</span> },
    {
      key: "percepatan",
      header: "Mekanisme",
      render: (p) => (
        <span className={`text-[10px] font-bold uppercase ${p.percepatan === "PERCEPATAN" ? "text-orange-500" : "text-gray-400"}`}>
          {p.percepatan || "-"}
        </span>
      ),
    },
    { key: "gruptruk", header: "Grup Truk", render: (p) => <span className="text-xs">{p.gruptruk || "-"}</span> },
    {
      key: "statusString",
      header: "Status",
      headerClassName: "text-center",
      className: "text-center",
      render: (p) => (
        <Badge color={getStatusBadgeColor(p.statusString || p.status) as any} size="sm">
          {p.statusString || p.status || "-"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Order (SO)</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor dan kelola semua Sales Order dari database.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable
            columns={columns}
            queryKey={["so-list", companyCode, dateFilter]}
            fetcher={fetcher}
            defaultPageSize={50}
            rowKey={(p) => p.noposto || String(p.id)}
            searchPlaceholder="Cari No SO, Transportir, Produk..."
            striped
            rowClassName={(row) => {
              if (row.tgljatuhtempo) {
                const now = new Date();
                const exp = new Date(row.tgljatuhtempo);
                if (now > exp) return "bg-red-50/30 dark:bg-red-500/5";
              }
              return "";
            }}
            toolbar={
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4 shrink-0" />
                <Input
                  type="date"
                  className="h-8 w-40 text-xs"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
                {dateFilter && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500" onClick={() => setDateFilter("")}>
                    ✕
                  </Button>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>

      {/* View Modal */}
      {isViewOpen && selectedSO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-none shadow-2xl">
            <CardHeader className="border-b dark:border-white/10 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center justify-between">
                <CardTitle>Detail SO: {selectedSO.noposto}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsViewOpen(false)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Info SO</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm"><span>No SO</span><span className="font-bold font-mono">{selectedSO.noposto}</span></div>
                      <div className="flex justify-between text-sm"><span>Tanggal</span><span className="font-bold">{selectedSO.tanggalString}</span></div>
                      <div className="flex justify-between text-sm"><span>Jatuh Tempo</span><span className="font-bold">{selectedSO.tanggaljatuhtempoString || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Wilayah</span><span className="font-bold">{selectedSO.wilayah || "-"}</span></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Lokasi</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between text-sm"><span>Asal</span><span className="font-bold">{selectedSO.asalString || "-"}</span></div>
                      <div className="flex justify-between text-sm"><span>Tujuan</span><span className="font-bold">{selectedSO.tujuanString || "-"}</span></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Transportir & Produk</p>
                    <div className="mt-2">
                      <div className="text-sm border-b pb-1 font-bold text-brand-500">{selectedSO.transportString || "-"}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-brand-500" />
                        <span className="text-sm font-bold">{selectedSO.produkString || "-"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Ringkasan Kuota</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div><p className="text-[10px] text-gray-500">Total</p><p className="text-lg font-bold">{(selectedSO.qty || 0).toLocaleString()} T</p></div>
                      <div><p className="text-[10px] text-gray-500">Booking</p><p className="text-lg font-bold text-amber-500">{(selectedSO.qtyrencana || 0).toLocaleString()} T</p></div>
                      <div><p className="text-[10px] text-gray-500">Realisasi</p><p className="text-lg font-bold text-emerald-600">{(selectedSO.qtyrealisasi || 0).toLocaleString()} T</p></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticket History Section — embedded, same as POSTO page */}
              <div className="border-t pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand-50 rounded-lg text-brand-500">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Riwayat Tiket</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Daftar muatan yang menggunakan SO ini</p>
                  </div>
                </div>

                <div className="rounded-xl border dark:border-white/10 overflow-hidden">
                  <DataTable
                    queryKey={['so-tickets-history', selectedSO?.guid || selectedSO?.noposto]}
                    fetcher={async (params) => {
                      const guidValue = selectedSO?.guid || selectedSO?.noposto;
                      const payload: any = {
                        draw: params.draw,
                        start: params.start,
                        length: params.length,
                        search: params.search || "",
                        order: [{ column: 1, dir: "desc" }],
                        posto: guidValue,
                        cmd: 'refresh',
                        columns: [
                          { data: "action", name: "", searchable: false, orderable: false },
                          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
                          { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
                          { data: "shift", name: "idshift", searchable: true, orderable: true },
                          { data: "nopol", name: "nopol", searchable: true, orderable: true },
                          { data: "driver", name: "driver", searchable: true, orderable: true },
                          { data: "qty", name: "qty", searchable: true, orderable: true },
                          { data: "updatedonString", name: "updatedon", searchable: true, orderable: true }
                        ]
                      };
                      const form = new URLSearchParams();
                      const flatten = (obj: any, prefix = '') => {
                        Object.keys(obj).forEach((key) => {
                          const k = prefix ? `${prefix}[${key}]` : key;
                          if (obj[key] === undefined || obj[key] === null) return;
                          if (typeof obj[key] === 'object') flatten(obj[key], k);
                          else form.append(k, String(obj[key]));
                        });
                      };
                      flatten(payload);
                      const res = await apiFetch(`/api/Tiket/DataTablePeriodeTiket`, {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: form.toString(),
                      });
                      if (!res.ok) throw new Error(`[${res.status}]`);
                      return res.json();
                    }}
                    rowKey={(row: any) => row.bookingno}
                    columns={[
                      {
                        key: "bookingno",
                        header: "Booking No",
                        render: (row: any) => <span className="font-bold text-gray-900 dark:text-white font-mono">{row.bookingno}</span>
                      },
                      {
                        key: "tanggalString",
                        header: "Tanggal",
                        render: (row: any) => <span className="text-gray-500 dark:text-gray-400 font-mono text-xs">{row.tanggalString}</span>
                      },
                      {
                        key: "shift",
                        header: "Shift",
                        render: (row: any) => <span className="text-xs">{row.shift}</span>
                      },
                      {
                        key: "nopol",
                        header: "Nopol",
                        render: (row: any) => <Badge color="dark" size="sm" className="font-mono">{row.nopol}</Badge>
                      },
                      {
                        key: "driver",
                        header: "Driver",
                        render: (row: any) => <span className="text-sm font-medium">{row.driver}</span>
                      },
                      {
                        key: "qty",
                        header: "Qty",
                        headerClassName: "text-right",
                        className: "text-right",
                        render: (row: any) => <span className="font-bold font-mono text-emerald-600">{row.qty?.toLocaleString()}</span>
                      }
                    ]}
                  />
                </div>
              </div>
            </CardContent>
            <CardHeader className="border-t pt-4">
              <Button variant="secondary" className="w-full" onClick={() => setIsViewOpen(false)}>Tutup</Button>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedSO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-white dark:bg-gray-900 border-none shadow-2xl">
            <CardHeader className="border-b dark:border-white/10">
              <CardTitle>Edit SO: {selectedSO.noposto}</CardTitle>
            </CardHeader>
            <form onSubmit={handleUpdate}>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-white/10 p-3 rounded-lg border border-gray-100 dark:border-gray-800 italic">
                  <div>Produk: <strong>{selectedSO.produkString}</strong></div>
                  <div>Transport: <strong>{selectedSO.transportString}</strong></div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Kuantitas (Ton)</label>
                  <Input type="number" value={editForm.qty} onChange={(e) => setEditForm({ ...editForm, qty: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Tanggal Akhir</label>
                  <Input type="date" value={editForm.tglakhir} onChange={(e) => setEditForm({ ...editForm, tglakhir: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">Tanggal Jatuh Tempo</label>
                  <Input type="date" value={editForm.tgljatuhtempo} onChange={(e) => setEditForm({ ...editForm, tgljatuhtempo: e.target.value })} />
                </div>
              </CardContent>
              <CardHeader className="border-t pt-4 flex flex-row gap-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsEditOpen(false)}>Batal</Button>
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </CardHeader>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={(o) => !o && setIsDeleteOpen(false)}>
        <DialogContent className="max-w-md rounded-none border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-red-600 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Hapus Sales Order
            </DialogTitle>
            <DialogDescription className="text-[11px] font-bold text-gray-500 mt-2">
              Konfirmasi penghapusan SO <span className="text-red-600 font-black">{deleteTarget}</span>. Tindakan ini akan dicatat dalam audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Alasan Penghapusan</label>
            <select
              className="w-full h-11 px-4 rounded-none border border-gray-100 bg-gray-50/50 text-xs font-bold outline-none focus:ring-1 focus:ring-red-500"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            >
              <option value="34">DATA DOUBLE / GANDA</option>
              <option value="99">PEMBATALAN DARI PUSAT</option>
              <option value="REVISI">REVISI DATA INPUT</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-none font-bold text-xs" onClick={() => setIsDeleteOpen(false)}>BATAL</Button>
            <Button variant="destructive" className="rounded-none px-8 font-black uppercase text-[10px]" onClick={handleDeleteConfirm} disabled={isSaving}>
              {isSaving ? "Menghapus..." : "KONFIRMASI HAPUS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build` (or `npx tsc --noEmit` if faster)

Expected: no new TypeScript errors from `src/app/so/page.tsx`. If `DataTableColumn`/`DataTableResult` prop names (`headerClassName`, `className`, `striped`, `rowClassName`, `defaultPageSize`) mismatch the actual `DataTable` component types, fix the mismatches — they're copied verbatim from the already-compiling `src/app/posto/page.tsx`, so a mismatch would mean the two files' local type usage diverged; check `src/components/ui/DataTable.tsx` for the authoritative prop types if this fails.

- [ ] **Step 3: Manual verification**

Run: `npm run dev` (or `npm run dev:local`)

1. Log in as `rekanan` (or `transport`), open `/so`.
   - Confirm rows load (list not empty, matches previous behavior).
   - Confirm the **Hapus** (delete) button now appears on every row's Action column.
   - Click Hapus → confirm the reason dropdown dialog appears → confirm delete succeeds and the row disappears / list refreshes.
   - Confirm the **Edit** button does NOT appear.
   - Click View → confirm the modal opens and the "Riwayat Tiket" table loads inline (not a link-out).
   - Click Print → confirm a new tab opens `/posto/print/<id>`.
2. Log in as `superadmin` or `admin`, open `/so`.
   - Confirm Edit and Delete both still appear (regression check — these roles are in `POSTO_EDIT_ROLES`).
   - Confirm CutOff/Kapal/Kota Tujuan/Mekanisme/Grup Truk/Status columns render with real data (not all "-") — if they render as "-" for every row, the backend `/api/SO/DataTableFilter` may not populate those fields for `tipe=SO` rows; note this but it's a display-only gap, not a regression.
3. Confirm the date filter narrows results when set and clears when the ✕ is clicked.

- [ ] **Step 4: Commit**

```bash
git add src/app/so/page.tsx
git commit -m "feat: allow rekanan/transport to delete SO rows, restyle SO page to match POSTO page"
```

---

## Out of Scope

- `src/app/posto/so/page.tsx` (orphaned duplicate, not linked in `menu-catalog.ts`) is left untouched.
- No backend changes — `POSTOController.DeleteData` already accepts any authenticated caller; this plan only changes front-end button visibility.
- No test files added — this repo has no test framework wired up for page components (verified: zero `*.test.{ts,tsx}` reference `posto`/`SOPage`); verification is manual per the steps above.
