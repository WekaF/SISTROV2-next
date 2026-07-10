import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const ASPNET = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com"

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
    const startDate       = searchParams.get("startDate")   || ""
    const endDate         = searchParams.get("endDate")     || ""
    const produkFilter   = searchParams.get("produk")      || ""
    const statusFilter   = searchParams.get("status")      || ""
    const companyCode    = searchParams.get("companyCode") || ""

    const body = new URLSearchParams({
      draw, start, length,
      "search[value]": search,
      "columns[0][name]": "number",
      "columns[1][name]": "id",
      "columns[2][name]": "tanggal",
      "columns[3][name]": "idproduk",
      "columns[4][name]": "kuota",
      "columns[5][name]": "kuota_terpesan",
      "columns[6][name]": "kuota_in",
      "columns[7][name]": "kuota_out",
      "columns[8][name]": "activated",
      "columns[9][name]": "updatedon",
      "columns[10][name]": "updatedby",
      "order[0][column]": "2",
      "order[0][dir]": "desc",
    })

    if (startDate) body.append("SD", startDate)
    if (endDate)   body.append("ED", endDate)
    if (produkFilter)  body.append("columns[3][search][value]", produkFilter)
    if (statusFilter)  body.append("columns[8][search][value]", statusFilter)
    if (companyCode)   body.append("companyCode", companyCode)

    const [dataRes, metricsRes] = await Promise.all([
      fetch(`${ASPNET}/api/KuotaLevel1/DataTableFilter`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      }),
      // Fetch all data for metrics (unfiltered, limit 10000)
      start === "0" && !search && !startDate && !endDate && !produkFilter && !statusFilter
        ? fetch(`${ASPNET}/api/KuotaLevel1/DataTableFilter`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              draw: "1", start: "0", length: "10000",
              "columns[2][name]": "tanggal",
              "order[0][column]": "2", "order[0][dir]": "desc",
              ...(companyCode ? { companyCode } : {}),
            }).toString(),
          })
        : Promise.resolve(null),
    ])

    if (!dataRes.ok) {
      const text = await dataRes.text()
      return NextResponse.json({ success: false, error: `Backend error: ${dataRes.status} ${text}` }, { status: dataRes.status })
    }

    const aspData = await dataRes.json()
    const rows: any[] = aspData.data || []
    const recordsTotal    = aspData.recordsTotal    ?? rows.length
    const recordsFiltered = aspData.recordsFiltered ?? rows.length

    let metrics = { totalDailyQuota: 0, totalBooked: 0, totalIn: 0, totalOut: 0 }
    if (metricsRes) {
      const allData = await metricsRes.json()
      const allRows: any[] = allData.data || []
      metrics = {
        totalDailyQuota: allRows.reduce((a, r) => a + (Number(r.kuota) || 0), 0),
        totalBooked:     allRows.reduce((a, r) => a + (Number(r.kuota_terpesan) || 0), 0),
        totalIn:         allRows.reduce((a, r) => a + (Number(r.kuota_in) || 0), 0),
        totalOut:        allRows.reduce((a, r) => a + (Number(r.kuota_out) || 0), 0),
      }
    }

    return NextResponse.json({ success: true, data: rows, recordsTotal, recordsFiltered, metrics })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
