"use client"
import { useState, useCallback } from "react"
import {
  CalendarCheck,
  Plus,
  Download,
  Eye,
  FileEdit,
  Calendar,
  Package,
  TrendingUp,
  BarChart3,
  Clock,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Badge from "@/components/ui/badge/Badge"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { DataTable, type DataTableColumn, type DataTableParams } from "@/components/ui/DataTable"
import { normalizeRole } from "@/lib/role-utils"
import { useCompany } from "@/context/CompanyContext"
import { useToast } from "@/components/ui/toast"
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns"

type QuotaFilterMode = "harian" | "bulanan" | "tahunan"

function getQuotaDateRange(mode: QuotaFilterMode, value: string): { startDate: string; endDate: string } {
  if (!value) return { startDate: "", endDate: "" }
  if (mode === "harian") return { startDate: value, endDate: value }
  if (mode === "bulanan") {
    const [y, m] = value.split("-").map(Number)
    if (!y || !m) return { startDate: "", endDate: "" }
    const ref = new Date(y, m - 1, 1)
    return { startDate: format(startOfMonth(ref), "yyyy-MM-dd"), endDate: format(endOfMonth(ref), "yyyy-MM-dd") }
  }
  const y = Number(value)
  if (!y || value.length !== 4) return { startDate: "", endDate: "" }
  const ref = new Date(y, 0, 1)
  return { startDate: format(startOfYear(ref), "yyyy-MM-dd"), endDate: format(endOfYear(ref), "yyyy-MM-dd") }
}

interface QuotaRow {
  id: number
  guid: string
  tanggal: string
  tanggalString: string
  namaproduk: string
  kuota: number
  kuota_terpesan: number
  kuota_in: number
  kuota_out: number
  activated: string
  status: string
  updatedonString: string
  updatedbyString: string
}

export default function QuotaSchedulePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { activeCompanyCode } = useCompany()

  const activeRole = normalizeRole((session?.user as any)?.role)
  const canEdit = ["candal", "superadmin", "admin", "pod"].includes(activeRole)

  const { addToast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [filterMode, setFilterMode] = useState<QuotaFilterMode>("bulanan")
  const [filterValue, setFilterValue] = useState("")
  const { startDate, endDate } = getQuotaDateRange(filterMode, filterValue)

  const [metrics, setMetrics] = useState({ totalDailyQuota: 0, totalBooked: 0, totalIn: 0, totalOut: 0 })

  // Metrics akan diupdate otomatis dari fetcher DataTable, mengikuti filter aktif

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const qs = new URLSearchParams({
        draw: "1", start: "0", length: "10000",
        search: "",
        startDate,
        endDate,
      })
      if (activeCompanyCode) qs.set("companyCode", activeCompanyCode)
      const res = await fetch(`/api/kuota/schedule?${qs}`)
      const result = await res.json()

      if (!result.success) throw new Error(result.error || "Gagal load data")
      const data = result.data || []

      const headers = ["Tanggal", "Produk", "Kuota", "Terpesan", "Masuk", "Keluar", "Status", "Last Update", "By"]
      const rows = data.map((item: any) => [
        item.tanggalString || item.tanggal,
        item.namaproduk,
        item.kuota,
        item.kuota_terpesan,
        item.kuota_in,
        item.kuota_out,
        item.status,
        item.updatedonString,
        item.updatedbyString
      ])

      const XLSX = await import("xlsx")
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Jadwal_Kuota")
      XLSX.writeFile(wb, `Jadwal_Kuota_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err: any) {
      addToast({ title: "Error", description: "Gagal Export: " + err.message, variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const fetcher = useCallback(async (params: DataTableParams) => {
    const qs = new URLSearchParams({
      draw: String(params.draw),
      start: String(params.start),
      length: String(params.length),
      search: params.search || "",
      produk: params.columnFilters?.produk || "",
      status: params.columnFilters?.status || "",
      startDate,
      endDate,
    })
    if (activeCompanyCode) qs.set("companyCode", activeCompanyCode)
    const res = await fetch(`/api/kuota/schedule?${qs}`)
    const data = await res.json()
    if (!data.success) throw new Error(data.error || "Gagal memuat data")

    if (data.metrics) {
      setMetrics(data.metrics)
    }

    return {
      data: data.data ?? [],
      recordsTotal: data.recordsTotal ?? 0,
      recordsFiltered: data.recordsFiltered ?? 0,
    }
  }, [activeCompanyCode, startDate, endDate])

  const columns: DataTableColumn<QuotaRow>[] = [
    {
      key: "tanggal",
      header: "Tanggal",
      searchable: true,
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="font-semibold text-sm whitespace-nowrap">{item.tanggalString || item.tanggal}</span>
        </div>
      ),
    },
    {
      key: "produk",
      header: "Produk",
      searchable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-50 rounded-lg text-brand-500 dark:bg-brand-500/10 shrink-0">
            <Package className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm">{item.namaproduk || "—"}</span>
        </div>
      ),
    },
    {
      key: "kuota",
      header: "Kuota (Ton)",
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
      render: (item) => (
        <span className="font-semibold text-blue-600 text-sm">
          {Number(item.kuota_terpesan).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "kuota_in",
      header: "Masuk",
      headerClassName: "text-right",
      className: "text-right",
      render: (item) => (
        <span className="font-semibold text-orange-600 text-sm">
          {Number(item.kuota_in).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "kuota_out",
      header: "Keluar",
      headerClassName: "text-right",
      className: "text-right",
      render: (item) => (
        <span className="font-semibold text-green-600 text-sm">
          {Number(item.kuota_out).toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "activated",
      header: "Status",
      searchable: true,
      render: (item) => (
        <Badge color={item.activated === "1" ? "success" : "error"} size="sm" variant="light">
          {item.activated === "1" ? "Aktif" : "Nonaktif"}
        </Badge>
      ),
    },
    {
      key: "updatedonString",
      header: "Updatedon",
      render: (item) => <span className="text-xs text-gray-500 whitespace-nowrap">{item.updatedonString || "—"}</span>,
    },
    {
      key: "updatedbyString",
      header: "Updated By",
      render: (item) => <span className="text-xs text-gray-600 dark:text-gray-400">{item.updatedbyString || "—"}</span>,
    },
    {
      key: "action",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Lihat Detail Wilayah"
            className="hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
            onClick={() => router.push(`/kuota/level2/${item.guid}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Edit Kuota"
              className="hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              onClick={() => router.push(`/kuota/schedule/edit/${item.guid}`)}
            >
              <FileEdit className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            title="Drill Down Wilayah"
            className="hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
            onClick={() => router.push(`/kuota/level2/${item.guid}`)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-serif">
            Penjadwalan Kuota
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kelola alokasi tonase harian untuk setiap produk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => router.push("/kuota/schedule/new")} className="dark:bg-brand-600 dark:text-white dark:hover:bg-brand-500">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Kuota
            </Button>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-500 shadow-theme-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-lg text-brand-500 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Kuota (Sesuai Filter)</p>
              <p className="text-xl font-bold">{metrics.totalDailyQuota.toLocaleString("id-ID")}<span className="text-xs font-normal"> Ton</span></p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500 shadow-theme-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-500 shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Terpesan (Sesuai Filter)</p>
              <p className="text-xl font-bold text-blue-600">{metrics.totalBooked.toLocaleString("id-ID")}<span className="text-xs font-normal"> Ton</span></p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500 shadow-theme-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-orange-500 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Proses Muat (Sesuai Filter)</p>
              <p className="text-xl font-bold text-orange-600">{metrics.totalIn.toLocaleString("id-ID")}<span className="text-xs font-normal"> Ton</span></p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500 shadow-theme-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg text-green-500 shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Realisasi (Sesuai Filter)</p>
              <p className="text-xl font-bold text-green-600">{metrics.totalOut.toLocaleString("id-ID")}<span className="text-xs font-normal"> Ton</span></p>
            </div>
          </div>
        </Card>
      </div>

      {/* DataTable */}
      <Card className="shadow-theme-xs">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck className="h-5 w-5 text-brand-500" />
            <span className="font-bold text-gray-900 dark:text-white">Daftar Kuota</span>
          </div>
          <DataTable<QuotaRow>
            queryKey={["kuota-schedule", activeCompanyCode ?? "all", filterMode, filterValue]}
            fetcher={fetcher}
            columns={columns}
            rowKey={(r) => r.guid || r.id}
            searchPlaceholder="Cari tanggal, produk..."
            defaultPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyText="Belum ada jadwal kuota."
            toolbar={
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4 shrink-0" />
                <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
                  {(["harian", "bulanan", "tahunan"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setFilterMode(mode)
                        setFilterValue("")
                      }}
                      className={`px-2.5 h-8 text-xs font-semibold capitalize transition-colors ${filterMode === mode
                          ? "bg-brand-500 text-white"
                          : "bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                {filterMode === "harian" && (
                  <Input
                    type="date"
                    className="h-8 w-36 text-xs bg-white dark:bg-gray-800"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                )}
                {filterMode === "bulanan" && (
                  <Input
                    type="month"
                    className="h-8 w-36 text-xs bg-white dark:bg-gray-800"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                )}
                {filterMode === "tahunan" && (
                  <Input
                    type="number"
                    placeholder="Tahun"
                    min={2015}
                    max={2100}
                    className="h-8 w-24 text-xs bg-white dark:bg-gray-800"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                )}
                {filterValue && (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-red-500" onClick={() => setFilterValue("")}>
                    ✕
                  </Button>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
