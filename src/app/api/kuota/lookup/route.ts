import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const ASPNET = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const token = (session.user as any).aspnetToken
    const headers = { "Authorization": `Bearer ${token}` }

    const [produkRes, wilayahRes, bagianRes] = await Promise.all([
      fetch(`${ASPNET}/api/ProdukMapping/ProdukMappingList`, { headers }),
      fetch(`${ASPNET}/api/Kuota/DataWilayah`, { headers }),
      fetch(`${ASPNET}/api/Kuota/DataBagian`, { headers }),
    ])

    const [produkData, wilayahData, bagianData] = await Promise.all([
      produkRes.json(),
      wilayahRes.json(),
      bagianRes.json(),
    ])

    const products = Array.isArray(produkData)
      ? produkData.map((p: any) => ({ id: String(p.ID ?? p.id ?? ""), name: p.Nama ?? p.nama ?? "" }))
      : []

    const wilayah = Array.isArray(wilayahData)
      ? wilayahData.map((w: any) => ({ id: w.abbrev ?? "", name: w.keterangan ?? "" }))
      : []

    const bagianList = Array.isArray(bagianData?.bagian) ? bagianData.bagian : Array.isArray(bagianData) ? bagianData : []
    const areas = bagianList.map((a: any) => ({
      id: a.abbrev ?? "",
      name: a.keterangan ?? "",
      wilayahId: a.scope ?? "",
    }))

    return NextResponse.json({ success: true, products, wilayah, areas })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
