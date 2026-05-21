import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  BarChart3,
  History,
  ClipboardList,
  Truck,
  XCircle,
  AlertCircle,
  Database,
} from "lucide-react"

const REPORTS = [
  {
    title: "Antrian Per Gudang",
    description: "Antrian kendaraan aktif berdasarkan gudang tujuan.",
    url: "/reports/antrian",
    icon: History,
  },
  {
    title: "Laporan Booking",
    description: "Daftar tiket booking beserta status pemuatan dan posisi.",
    url: "/reports/booking",
    icon: ClipboardList,
  },
  {
    title: "Laporan Loading",
    description: "Tiket yang sudah memasuki proses pemuatan dengan timestamp checkpoint.",
    url: "/reports/loading",
    icon: Truck,
  },
  {
    title: "Laporan Pembatalan",
    description: "Tiket yang dibatalkan beserta alasan dan nilai denda.",
    url: "/reports/cancelation",
    icon: XCircle,
  },
  {
    title: "Log Bypass",
    description: "Riwayat aktivitas bypass tiket dengan perubahan posisi.",
    url: "/reports/log-bypass",
    icon: AlertCircle,
  },
  {
    title: "Log Kuota",
    description: "Riwayat perubahan kuota beserta nilai sebelum dan sesudah.",
    url: "/reports/log-kuota",
    icon: Database,
  },
]

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7" />
        <div>
          <h1 className="text-2xl font-bold">Laporan</h1>
          <p className="text-sm text-muted-foreground">Pilih laporan yang ingin ditampilkan</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link key={r.url} href={r.url}>
            <Card className="h-full hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <r.icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{r.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{r.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
