import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const ASPNET = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const token = (session.user as any).aspnetToken

    const res = await fetch(`${ASPNET}/api/KuotaLevel4/DataTable`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        draw: "1", start: "0", length: "100",
        level3: id,
        "columns[0][name]": "tanggal",
        "order[0][column]": "0",
        "order[0][dir]": "asc",
      }).toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ success: false, error: `Backend error: ${res.status} ${text}` }, { status: res.status })
    }

    const aspData = await res.json()
    const rows = aspData.data || []

    const firstRow = rows[0] || {}
    const header = {
      bagianAbbrev: "",
      bagianNama: firstRow.bagianString ?? "",
      tanggal: firstRow.tanggal ?? "",
      tanggalString: firstRow.tanggalString ?? "",
      kuotaBagian: Number(firstRow.kuotaHeader) || 0,
      wilayahAbbrev: "",
      wilayahNama: firstRow.wilayahString ?? "",
      namaproduk: firstRow.namaproduk ?? "",
      kuotaTotal: 0,
    }

    return NextResponse.json({ success: true, header, data: rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
