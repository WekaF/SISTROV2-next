"use client"
import { Suspense, useState, useEffect } from "react"
import {
  ArrowLeft,
  ChevronRight,
  Package,
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Badge from "@/components/ui/badge/Badge"
import { useRouter, useParams, useSearchParams } from "next/navigation"

interface Level4Row {
  id: number
  guid: string
  shift: string
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
  bagianAbbrev: string
  bagianNama: string
  tanggal: string
  tanggalString: string
  kuotaBagian: number
  wilayahAbbrev: string
  wilayahNama: string
  namaproduk: string
  kuotaTotal: number
}

const SHIFT_LABELS: Record<string, string> = {
  "1": "Shift 1 (06:00–14:00)",
  "2": "Shift 2 (14:00–22:00)",
  "3": "Shift 3 (22:00–06:00)",
}

function KuotaLevel4Content() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const l1 = searchParams.get("l1") || ""
  const l2 = searchParams.get("l2") || ""

  const [loading, setLoading] = useState(true)
  const [header, setHeader] = useState<Header | null>(null)
  const [data, setData] = useState<Level4Row[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/kuota/level4/${id}`)
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 animate-pulse">Memuat data shift...</p>
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
        {header && (
          <>
            <button
              onClick={() => l1 ? router.push(`/kuota/level2/${l1}`) : router.push("/kuota/schedule")}
              className="hover:text-brand-500 transition-colors"
            >
              {header.wilayahNama || "Level 2"}
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            <button
              onClick={() => l2 ? router.push(`/kuota/level3/${l2}?l1=${l1}`) : router.back()}
              className="hover:text-brand-500 transition-colors"
            >
              {header.bagianNama || "Level 3"}
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
          </>
        )}
        <span className="text-gray-900 dark:text-white font-semibold">Detail Shift</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-serif">
            Kuota Level 4 — Per Shift
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Distribusi kuota ke setiap shift harian.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
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
                  {header.tanggalString || "—"}
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
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Area</p>
                <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  {header.bagianNama || "—"}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Kuota Area</p>
                <p className="font-bold text-xl text-brand-600">
                  {Number(header.kuotaBagian).toLocaleString("id-ID")}
                  <span className="text-xs font-normal text-gray-400 ml-1">Ton</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards per Shift */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.map((item) => (
            <Card key={item.id} className="p-4 border-l-4 border-l-brand-500 shadow-theme-xs">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {SHIFT_LABELS[item.shift] || `Shift ${item.shift}`}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {Number(item.kuota).toLocaleString("id-ID")}
                    <span className="text-xs font-normal text-gray-400 ml-1">Ton</span>
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-blue-600">Terpesan: {Number(item.kuota_terpesan).toLocaleString("id-ID")}</span>
                    <span className="text-green-600">Keluar: {Number(item.kuota_out).toLocaleString("id-ID")}</span>
                  </div>
                </div>
                <div className="p-2 bg-brand-50 dark:bg-brand-500/10 rounded-lg text-brand-500">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="shadow-theme-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-500" />
            <span className="font-bold text-gray-900 dark:text-white">Detail per Shift</span>
            <span className="ml-auto text-xs text-gray-400">{data.length} shift</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gray-50 dark:bg-white/[0.02]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider w-10">No.</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Tanggal</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Shift</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Area</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Produk</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right">Kuota Area</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right">Kuota Shift</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right text-blue-500">Terpesan</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right text-orange-500">Masuk</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider text-right text-green-500">Keluar</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Updatedon</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-gray-400 tracking-wider">Updated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-gray-500 italic">
                      Belum ada data shift.
                    </td>
                  </tr>
                ) : (
                  data.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                        {(idx + 1).toString().padStart(2, "0")}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{item.tanggalString}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">
                          {SHIFT_LABELS[item.shift] || `Shift ${item.shift}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {header?.bagianNama || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {header?.namaproduk || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-500 text-sm">
                        {Number(header?.kuotaBagian || 0).toLocaleString("id-ID")}
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function KuotaLevel4Page() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 animate-pulse">Memuat data shift...</p>
      </div>
    }>
      <KuotaLevel4Content />
    </Suspense>
  )
}
