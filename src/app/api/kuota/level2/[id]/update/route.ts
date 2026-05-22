import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { withAudit } from "@/lib/with-audit"

const ASPNET = process.env.ASPNET_API_URL || "http://192.168.188.170:8090"

export const PATCH = withAudit(async function(req: NextRequest, context: any) {
  const { params } = context as { params: Promise<{ id: string }> }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userRole = (session.user as any).role?.toLowerCase()
    if (!["candal", "superadmin", "admin"].includes(userRole))
      return NextResponse.json({ success: false, error: "Akses ditolak" }, { status: 403 })

    const { id } = await params
    const { kuota } = await req.json()
    const kuotaNum = Number(kuota)
    if (isNaN(kuotaNum) || kuotaNum < 0)
      return NextResponse.json({ success: false, error: "Nilai kuota tidak valid" }, { status: 400 })

    const token = (session.user as any).aspnetToken
    const res = await fetch(`${ASPNET}/api/KuotaLevel2/UpdateData`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ guid: id, kuota: kuotaNum }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ success: false, error: text || "Gagal memperbarui kuota" }, { status: res.status })
    }

    return NextResponse.json({ success: true, message: "Kuota wilayah berhasil diperbarui" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
})
