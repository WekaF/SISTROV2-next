"use client"
import { useState, useEffect, useRef } from "react"
import { Clock, Package, Filter, Calendar, FileEdit, X, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Badge from "@/components/ui/badge/Badge"
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable"
import { useSession } from "next-auth/react"
import { normalizeRole } from "@/lib/role-utils"
import { useToast } from "@/components/ui/toast"
import { useCompany } from "@/context/CompanyContext"

interface ShiftRow {
  id: number
  guid: string
  tanggal: string
  tanggalString: string
  shift: string
  namaproduk: string
  kuota: number
  kuotaHeader: number
  kuota_terpesan: number
  kuota_in: number
  kuota_out: number
  activated: string
  wilayahString: string
  bagianString: string
  updatedbyString: string
}

interface LookupItem { id: string; name: string }

export default function KuotaShiftsPage() {
  const { data: session } = useSession()
  const { activeCompanyCode } = useCompany()
  const { addToast } = useToast()
  const activeRole = normalizeRole((session?.user as any)?.role)
  const canEdit = ["candal", "superadmin", "admin", "pod"].includes(activeRole)

  const [products, setProducts] = useState<LookupItem[]>([])
  const [sdFilter, setSdFilter] = useState("")
  const [edFilter, setEdFilter] = useState("")
  const [produkFilter, setProdukFilter] = useState("")
  const [appliedSD, setAppliedSD] = useState("")
  const [appliedED, setAppliedED] = useState("")
  const [appliedProduk, setAppliedProduk] = useState("")

  // Edit modal state
  const [editRow, setEditRow] = useState<ShiftRow | null>(null)
  const [editKuota, setEditKuota] = useState("")
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/kuota/lookup")
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.products) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (editRow) {
      setEditKuota(String(editRow.kuota))
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [editRow])

  const applyFilter = () => {
    setAppliedSD(sdFilter)
    setAppliedED(edFilter)
    setAppliedProduk(produkFilter)
  }

  const resetFilter = () => {
    setSdFilter(""); setEdFilter(""); setProdukFilter("")
    setAppliedSD(""); setAppliedED(""); setAppliedProduk("")
  }

  const handleSave = async () => {
    if (!editRow) return
    const kuotaNum = Number(editKuota)
    if (isNaN(kuotaNum) || kuotaNum < 0) {
      addToast({ variant: "warning", title: "Kuota tidak valid", description: "Masukkan nilai kuota yang benar." })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/kuota/shifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guid: editRow.guid, kuota: kuotaNum }),
      })
      const data = await res.json()
      if (data.success) {
        addToast({ variant: "success", title: "Kuota shift berhasil diperbarui" })
        setEditRow(null)
        setRefreshKey(k => k + 1)
      } else {
        addToast({ variant: "destructive", title: "Gagal menyimpan", description: data.error })
      }
    } catch {
      addToast({ variant: "destructive", title: "Gagal menyimpan", description: "Terjadi kesalahan." })
    } finally {
      setSaving(false)
    }
  }

  const fetcher = async (params: DataTableParams) => {
    const qs = new URLSearchParams({
      draw:   String(params.draw),
      start:  String(params.start),
      length: String(params.length),
      search: params.search || "",
      SD:     appliedSD,
      ED:     appliedED,
      produk: appliedProduk,
    })
    if (activeCompanyCode) qs.set("companyCode", activeCompanyCode)
    const res = await fetch(`/api/kuota/shifts?${qs}`)
    const data = await res.json()
    if (!data.success) throw new Error(data.error || "Gagal memuat data")
    return {
      data: data.data ?? [],
      recordsTotal:    data.recordsTotal    ?? 0,
      recordsFiltered: data.recordsFiltered ?? 0,
    }
  }

  const columns: DataTableColumn<ShiftRow>[] = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="font-semibold text-sm whitespace-nowrap">{item.tanggalString || item.tanggal}</span>
        </div>
      ),
    },
    {
      key: "shift",
      header: "Shift",
      render: (item) => (
        <Badge
          color={item.shift === "1" ? "info" : item.shift === "2" ? "warning" : "success"}
          size="sm" variant="light"
        >
          Shift {item.shift}
        </Badge>
      ),
    },
    {
      key: "wilayahString",
      header: "Wilayah",
      render: (item) => <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.wilayahString || "—"}</span>,
    },
    {
      key: "bagianString",
      header: "Bagian / Area",
      render: (item) => <span className="text-xs font-semibold text-gray-900 dark:text-white">{item.bagianString || "—"}</span>,
    },
    {
      key: "namaproduk",
      header: "Produk",
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="p-1 bg-brand-50 rounded text-brand-500 dark:bg-brand-500/10 shrink-0">
            <Package className="h-3 w-3" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">{item.namaproduk || "—"}</span>
        </div>
      ),
    },
    {
      key: "kuotaHeader",
      header: "Kuota Bagian",
      headerClassName: "text-right",
      className: "text-right",
      render: (item) => (
        <span className="text-xs font-semibold text-gray-500">
          {Number(item.kuotaHeader || 0).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "kuota",
      header: "Kuota Shift",
      headerClassName: "text-right",
      className: "text-right",
      render: (item) => (
        <span className="font-bold text-gray-900 dark:text-white text-sm">
          {Number(item.kuota).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "kuota_terpesan",
      header: "Terpesan",
      headerClassName: "text-right",
      className: "text-right",
      render: (item) => <span className="font-semibold text-blue-600 text-sm">{Number(item.kuota_terpesan).toLocaleString("id-ID")}</span>,
    },
    {
      key: "kuota_in",
      header: "Masuk",
      headerClassName: "text-right",
      className: "text-right",
      render: (item) => <span className="font-semibold text-orange-600 text-sm">{Number(item.kuota_in).toLocaleString("id-ID")}</span>,
    },
    {
      key: "kuota_out",
      header: "Keluar",
      headerClassName: "text-right",
      className: "text-right",
      render: (item) => <span className="font-semibold text-green-600 text-sm">{Number(item.kuota_out).toLocaleString("id-ID")}</span>,
    },
    {
      key: "activated",
      header: "Status",
      render: (item) => (
        <Badge color={item.activated === "1" ? "success" : "error"} size="sm" variant="light">
          {item.activated === "1" ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      key: "updatedbyString",
      header: "Updated By",
      render: (item) => <span className="text-xs text-gray-500 dark:text-gray-400">{item.updatedbyString || "—"}</span>,
    },
    ...(canEdit ? [{
      key: "action",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      render: (item: ShiftRow) => (
        <Button
          variant="ghost"
          size="icon-sm"
          title="Edit Kuota Shift"
          className="hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
          onClick={() => setEditRow(item)}
        >
          <FileEdit className="h-4 w-4" />
        </Button>
      ),
    }] as DataTableColumn<ShiftRow>[] : []),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-serif">Kuota Per Shift</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Monitor alokasi tonase per shift, wilayah, dan bagian.</p>
      </div>

      {/* Filter */}
      <Card className="shadow-theme-xs">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-brand-500" />
            <span className="font-bold text-sm text-gray-900 dark:text-white">Filter</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal Mulai</label>
              <Input type="date" value={sdFilter} onChange={(e) => setSdFilter(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal Selesai</label>
              <Input type="date" value={edFilter} onChange={(e) => setEdFilter(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</label>
              <select
                className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/5"
                value={produkFilter}
                onChange={(e) => setProdukFilter(e.target.value)}
              >
                <option value="">Semua Produk</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button size="sm" className="flex-1" onClick={applyFilter}>
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                Filter
              </Button>
              <Button size="sm" variant="outline" onClick={resetFilter}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DataTable */}
      <Card className="shadow-theme-xs">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-brand-500" />
            <span className="font-bold text-gray-900 dark:text-white">Daftar Kuota Per Shift</span>
          </div>
          <DataTable<ShiftRow>
            queryKey={["kuota-shifts", activeCompanyCode ?? "all", appliedSD, appliedED, appliedProduk, refreshKey]}
            fetcher={fetcher}
            columns={columns}
            rowKey={(r) => r.guid || r.id}
            searchPlaceholder="Cari produk, wilayah, bagian..."
            defaultPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyText="Belum ada data kuota shift."
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditRow(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-white dark:bg-gray-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-blue-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">Edit Kuota Shift</h3>
              </div>
              <button
                onClick={() => setEditRow(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Info */}
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Tanggal</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{editRow.tanggalString || editRow.tanggal}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Shift</p>
                  <Badge
                    color={editRow.shift === "1" ? "info" : editRow.shift === "2" ? "warning" : "success"}
                    size="sm" variant="light"
                  >
                    Shift {editRow.shift}
                  </Badge>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Bagian</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{editRow.bagianString}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Produk</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{editRow.namaproduk}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Kuota Saat Ini</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{Number(editRow.kuota).toLocaleString("id-ID")} Ton</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Terpesan</p>
                  <p className="text-sm font-bold text-blue-600">{Number(editRow.kuota_terpesan).toLocaleString("id-ID")} Ton</p>
                </div>
              </div>

              {Number(editKuota) < editRow.kuota_terpesan && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-lg text-red-600 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Kuota baru tidak boleh lebih kecil dari kuota terpesan ({Number(editRow.kuota_terpesan).toLocaleString("id-ID")})
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Kuota Baru (Ton)</label>
                <Input
                  ref={inputRef}
                  type="number"
                  placeholder="Masukkan kuota baru..."
                  value={editKuota}
                  onChange={(e) => setEditKuota(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave() }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" onClick={() => setEditRow(null)} disabled={saving}>Batal</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !editKuota || Number(editKuota) < editRow.kuota_terpesan}
              >
                {saving && <div className="w-3.5 h-3.5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
