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

    const [level2Res, dataRes] = await Promise.all([
      fetch(`${ASPNET}/api/KuotaLevel2/DetailData`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ guid: id }),
      }),
      fetch(`${ASPNET}/api/KuotaLevel3/DataTable`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          draw: "1", start: "0", length: "10000",
          level2: id,
          "columns[0][name]": "bagian",
          "order[0][column]": "0",
          "order[0][dir]": "asc",
        }).toString(),
      }),
    ])

    if (!level2Res.ok) {
      return NextResponse.json({ success: false, error: "Data Level 2 tidak ditemukan" }, { status: 404 })
    }

    const [level2Data, aspData] = await Promise.all([level2Res.json(), dataRes.json()])
    if (!level2Data) {
      return NextResponse.json({ success: false, error: "Data Level 2 tidak ditemukan" }, { status: 404 })
    }

    const rawRows = aspData.data || []
    const rows = rawRows.map((r: any) => ({
      ...r,
      bagianAbbrev: r.bagian ?? "",
      bagianNama: r.bagianString ?? "",
    }))

    const header = {
      level2Id: level2Data.id,
      level2Guid: id,
      wilayahAbbrev: "",
      wilayahNama: "",
      tanggal: level2Data.tanggal,
      tanggalString: level2Data.tanggalString,
      kuotaWilayah: Number(level2Data.kuota) || 0,
      namaproduk: level2Data.namaproduk || "",
      kuotaTotal: 0,
    }

    return NextResponse.json({ success: true, header, data: rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
