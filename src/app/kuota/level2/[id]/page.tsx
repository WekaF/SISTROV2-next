"use client"
import { useState, useEffect } from "react"
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  FileEdit,
  Package,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Badge from "@/components/ui/badge/Badge"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"

interface Level2Row {
  id: number
  guid: string
  wilayahAbbrev: string
  wilayahNama: string
  tanggal: string
  tanggalString: string
  kuota: number
  kuota_terpesan: number
  kuota_in: number
  kuota_out: number
  activated: string
  status: string
  updatedonString: string
  updatedbyString: string
}

interface Header {
  id: number
  tanggal: string
  tanggalString: string
  namaproduk: string
  kuotaTotal: number
  kuota_terpesan: number
  kuota_in: number
  kuota_out: number
  totalAlokasi: number
  selisih: number
}

export default function KuotaLevel2Page() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const userRole = (session?.user as any)?.role?.toLowerCase() ?? ""
  const canEdit = ["candal", "superadmin", "admin"].includes(userRole)

  const [loading, setLoading] = useState(true)
  const [header, setHeader] = useState<Header | null>(null)
  const [data, setData] = useState<Level2Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const [editModal, setEditModal] = useState<{ open: boolean; row: Level2Row | null }>({ open: false, row: null })
  const [editKuota, setEditKuota] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/kuota/level2/${id}`)
        const json = await res.json()
        if (json.success) {
          setHeader(json.header)
          setData(json.data)
        } else {
          setError(json.error || "Gagal memuat data")
        }
      } catch {
        setError("Terjadi kesalahan sistem")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const openEdit = (row: Level2Row) => {
    setEditModal({ open: true, row })
    setEditKuota(String(row.kuota))
  }

  const saveEdit = async () => {
    if (!editModal.row) return
    const targetGuid = editModal.row.guid
    const targetRow = editModal.row
    const newKuota = Number(editKuota)

    // Snapshot for rollback
    const previousData = [...data]
    const previousHeader = header ? { ...header } : null

    setSaving(true)

    // Optimistic: update UI immediately, close modal
    setData(prev => prev.map(row =>
      row.guid === targetGuid ? { ...row, kuota: newKuota } : row
    ))
    setEditModal({ open: false, row: null })

    try {
      const res = await fetch(`/api/kuota/level2/${targetGuid}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kuota: newKuota }),
      })
      const json = await res.json()
      if (!json.success) {
        // Rollback
        setData(previousData)
        setHeader(previousHeader)
        setEditModal({ open: true, row: targetRow })
        setEditKuota(String(targetRow.kuota))
        alert(json.error || "Gagal menyimpan")
      } else {
        // Background sync with server
        const refreshRes = await fetch(`/api/kuota/level2/${id}`)
        const refreshJson = await refreshRes.json()
        if (refreshJson.success) {
          setHeader(refreshJson.header)
          setData(refreshJson.data)
        }
      }
    } catch {
      // Rollback
      setData(previousData)
      setHeader(previousHeader)
      setEditModal({ open: true, row: targetRow })
      setEditKuota(String(targetRow.kuota))
      alert("Terjadi kesalahan sistem")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 animate-pulse">Memuat data wilayah...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-red-500">
        <AlertTriangle className="h-10 w-10" />
        <p className="font-semibold">{error}</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Kembali</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <button onClick={() => router.push("/kuota/schedule")} className="hover:text-brand-500 transition-colors">
          Kuota
        </button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-900 dark:text-white font-semibold">Detail Wilayah</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-serif">
            Kuota Level 2 — Per Wilayah
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Distribusi kuota ke setiap moda transportasi / wilayah.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/kuota/schedule")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* Info Header Card */}
      {header && (
        <Card className="shadow-theme-xs">
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tanggal</p>
                <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                  <Calendar className="h-4 w-4 text-brand-500" />
                  {header.tanggalString}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Produk</p>
                <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                  <Package className="h-4 w-4 text-brand-500" />
                  {header.namaproduk || "—"}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Kuota Total</p>
                <p className="font-bold text-xl text-brand-600">
                  {Number(header.kuotaTotal).toLocaleString("id-ID")}
                  <span className="text-xs font-normal text-gray-400 ml-1">Ton</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Status Alokasi</p>
                {header.selisih > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <Badge color="warning" size="sm" variant="light">
                      Selisih {Number(header.selisih).toLocaleString("id-ID")} Ton
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <Badge color="success" size="sm" variant="light">Terisi Penuh</Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="shadow-theme-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-500" />
            <span className="font-bold text-gray-900 dark:text-white">Distribusi per Wilayah</span>
            <span className="ml-auto text-xs text-gray-400">{data.length} wilayah</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider w-10">No.</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Transportasi / Wilayah</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Produk</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right">Kuota Total</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right">Kuota</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right text-blue-500">Terpesan</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right text-orange-500">Masuk</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right text-green-500">Keluar</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Updatedon</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Updated By</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-gray-500 italic">
                      Belum ada data wilayah.
                    </td>
                  </tr>
                ) : (
                  data.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group"
                    >
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                        {(idx + 1).toString().padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{item.tanggalString}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">
                          {item.wilayahNama}
                        </div>
                        <div className="text-xs text-gray-400">{item.wilayahAbbrev}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {header?.namaproduk || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-500 text-sm">
                        {Number(header?.kuotaTotal || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white text-sm">
                        {Number(item.kuota).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600 text-sm">
                        {Number(item.kuota_terpesan).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-600 text-sm">
                        {Number(item.kuota_in).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 text-sm">
                        {Number(item.kuota_out).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          color={item.activated === "1" ? "success" : "error"}
                          size="sm"
                          variant="light"
                        >
                          {item.activated === "1" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {item.updatedonString || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {item.updatedbyString || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Lihat Detail Area"
                            className="hover:text-brand-500"
                            onClick={() => router.push(`/kuota/level3/${item.guid}?l1=${id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit Kuota Wilayah"
                              className="hover:text-blue-500"
                              onClick={() => openEdit(item)}
                            >
                              <FileEdit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Drill Down ke Area"
                            className="hover:text-brand-500"
                            onClick={() => router.push(`/kuota/level3/${item.guid}?l1=${id}`)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editModal.open && editModal.row && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Edit Kuota Wilayah
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editModal.row.wilayahNama} ({editModal.row.wilayahAbbrev})
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
                  Kuota (Ton)
                </label>
                <input
                  type="number"
                  value={editKuota}
                  onChange={(e) => setEditKuota(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-sm"
                  min={editModal.row.kuota_terpesan}
                />
                {Number(editKuota) < editModal.row.kuota_terpesan && (
                  <p className="text-xs text-red-500 mt-1">
                    Kuota tidak boleh kurang dari terpesan ({editModal.row.kuota_terpesan})
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModal({ open: false, row: null })}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={saveEdit}
                disabled={saving || Number(editKuota) < editModal.row.kuota_terpesan}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
