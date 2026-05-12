import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const ASPNET = process.env.ASPNET_API_URL || "http://192.168.188.170:8090"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const token = (session.user as any).aspnetToken

    const [summaryRes, dataRes] = await Promise.all([
      fetch(`${ASPNET}/api/KuotaLevel2/Summary?guid=${encodeURIComponent(id)}`, {
        headers: { "Authorization": `Bearer ${token}` },
      }),
      fetch(`${ASPNET}/api/KuotaLevel2/DataTable`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          draw: "1", start: "0", length: "10000",
          level1: id,
          "columns[0][name]": "wilayah",
          "order[0][column]": "0",
          "order[0][dir]": "asc",
        }).toString(),
      }),
    ])

    if (!summaryRes.ok) {
      return NextResponse.json({ success: false, error: "Data Level 1 tidak ditemukan" }, { status: 404 })
    }

    const [summary, aspData] = await Promise.all([summaryRes.json(), dataRes.json()])
    const kuota1 = summary?.kuota1
    if (!kuota1) {
      return NextResponse.json({ success: false, error: "Data Level 1 tidak ditemukan" }, { status: 404 })
    }

    const rawRows = aspData.data || []
    const rows = rawRows.map((r: any) => ({
      ...r,
      wilayahAbbrev: r.wilayah ?? "",
      wilayahNama: r.wilayahString ?? "",
    }))

    const totalAlokasi = rows.reduce((a: number, r: any) => a + (Number(r.kuota) || 0), 0)
    const selisih = Number(kuota1.kuota) - totalAlokasi

    const header = {
      id: kuota1.id,
      guid: kuota1.guid,
      tanggal: kuota1.tanggal,
      tanggalString: kuota1.tanggalString,
      namaproduk: kuota1.namaproduk,
      kuotaTotal: kuota1.kuota,
      kuota_terpesan: kuota1.kuota_terpesan,
      kuota_in: kuota1.kuota_in,
      kuota_out: kuota1.kuota_out,
      activated: kuota1.activated,
      totalAlokasi,
      selisih,
    }

    return NextResponse.json({ success: true, header, data: rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
