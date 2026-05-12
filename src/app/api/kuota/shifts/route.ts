import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { normalizeRole } from "@/lib/role-utils"

const ASPNET = process.env.ASPNET_API_URL || "http://192.168.188.170:8090"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    const token = (session.user as any).aspnetToken

    const { searchParams } = req.nextUrl
    const draw   = searchParams.get("draw")   || "1"
    const start  = searchParams.get("start")  || "0"
    const length = searchParams.get("length") || "25"
    const search = searchParams.get("search") || ""
    const SD     = searchParams.get("SD")     || ""
    const ED     = searchParams.get("ED")     || ""
    const produk = searchParams.get("produk") || ""

    const body = new URLSearchParams({
      draw, start, length,
      "search[value]": search,
      "columns[0][name]": "number",
      "columns[1][name]": "id",
      "columns[2][name]": "tanggal",
      "columns[3][name]": "shift",
      "columns[4][name]": "idproduk",
      "order[0][column]": "2",
      "order[0][dir]": "desc",
    })
    if (SD)     body.append("SD", SD)
    if (ED)     body.append("ED", ED)
    if (produk) body.append("produk", produk)

    const res = await fetch(`${ASPNET}/api/KuotaLevel4/DataTable`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ success: false, error: `Backend error: ${res.status} ${text}` }, { status: res.status })
    }

    const aspData = await res.json()
    const rows: any[] = aspData.data || []
    const recordsTotal    = aspData.recordsTotal    ?? rows.length
    const recordsFiltered = aspData.recordsFiltered ?? rows.length

    return NextResponse.json({ success: true, data: rows, recordsTotal, recordsFiltered })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const activeRole = normalizeRole((session.user as any).role)
    if (!["candal", "superadmin", "admin", "pod"].includes(activeRole)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const token = (session.user as any).aspnetToken
    const { guid, kuota } = await req.json()

    const res = await fetch(`${ASPNET}/api/KuotaLevel4/UpdateData`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ guid, kuota: Number(kuota) }),
    })

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json({ success: false, error: txt || `Error ${res.status}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Kuota shift berhasil diperbarui" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
