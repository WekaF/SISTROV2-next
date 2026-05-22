import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const ASPNET = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com"

function parseAspDate(tanggal: any): string {
  if (!tanggal) return new Date().toISOString().substring(0, 10)
  const s = String(tanggal)
  const msMatch = s.match(/\/Date\((\d+)([+-]\d+)?\)\//)
  if (msMatch) return new Date(Number(msMatch[1])).toISOString().substring(0, 10)
  return s.substring(0, 10)
}

function dtBody(extra: Record<string, string>) {
  return new URLSearchParams({
    draw: "1", start: "0", length: "10000",
    "columns[0][name]": "id",
    "order[0][column]": "0",
    "order[0][dir]": "asc",
    ...extra,
  }).toString()
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const token = (session.user as any).aspnetToken
    const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" }
    const jsonHeaders = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }

    // Step 1: Level1 header + Level2 wilayah rows
    const [level1Res, level2Res] = await Promise.all([
      fetch(`${ASPNET}/api/KuotaLevel1/DetailData`, {
        method: "POST", headers: jsonHeaders,
        body: JSON.stringify({ guid: id }),
      }),
      fetch(`${ASPNET}/api/KuotaLevel2/DataTable`, {
        method: "POST", headers,
        body: dtBody({ level1: id }),
      }),
    ])

    if (!level1Res.ok) return NextResponse.json({ success: false, error: "Data kuota tidak ditemukan" }, { status: 404 })
    const level1Data = await level1Res.json()
    if (!level1Data) return NextResponse.json({ success: false, error: "Data kuota tidak ditemukan" }, { status: 404 })

    const level2Raw = await level2Res.json()
    const wilayahRows: any[] = level2Raw.data || []

    // Step 2: Level3 rows for each wilayah (parallel)
    const level3Results = await Promise.all(
      wilayahRows.map((w: any) =>
        fetch(`${ASPNET}/api/KuotaLevel3/DataTable`, {
          method: "POST", headers,
          body: dtBody({ level2: w.guid }),
        }).then(r => r.json())
      )
    )

    const areaRows: any[] = []
    level3Results.forEach((res, i) => {
      const rows = res.data || []
      rows.forEach((a: any) => areaRows.push({ ...a, _wilayahAbbrev: wilayahRows[i].wilayah }))
    })

    // Step 3: Level4 rows for each area (parallel)
    const level4Results = await Promise.all(
      areaRows.map((a: any) =>
        fetch(`${ASPNET}/api/KuotaLevel4/DataTable`, {
          method: "POST", headers,
          body: dtBody({ level3: a.guid }),
        }).then(r => r.json())
      )
    )

    // Assemble form data structure
    const wilayah: Record<string, number> = {}
    const wilayahGuids: Record<string, string> = {}
    const wilayahIds: Record<string, number> = {}
    wilayahRows.forEach((w: any) => {
      wilayah[w.wilayah] = Number(w.kuota) || 0
      wilayahGuids[w.wilayah] = w.guid
      wilayahIds[w.wilayah] = Number(w.id)
    })

    const areas: Record<string, number> = {}
    const areaGuids: Record<string, string> = {}
    const areaIds: Record<string, number> = {}
    const areaScopes: Record<string, string> = {}
    areaRows.forEach((a: any) => {
      areas[a.bagian] = Number(a.kuota) || 0
      areaGuids[a.bagian] = a.guid
      areaIds[a.bagian] = Number(a.id)
      areaScopes[a.bagian] = a._wilayahAbbrev
    })

    const shifts: Record<string, Record<number, number>> = {}
    const shiftNumericIds: Record<string, Record<string, number>> = {}
    const shiftCounts: Record<string, number> = {}
    level4Results.forEach((res, i) => {
      const bagianAbbrev = areaRows[i].bagian
      const shiftRows: any[] = res.data || []
      shiftRows.forEach((s: any) => {
        if (!shifts[bagianAbbrev]) shifts[bagianAbbrev] = {}
        if (!shiftNumericIds[bagianAbbrev]) shiftNumericIds[bagianAbbrev] = {}
        const sNum = Number(s.shift)
        shifts[bagianAbbrev][sNum] = Number(s.kuota) || 0
        shiftNumericIds[bagianAbbrev][String(sNum)] = Number(s.id)
      })
      shiftCounts[bagianAbbrev] = shiftRows.length
    })

    const tanggal = parseAspDate(level1Data.tanggal)

    return NextResponse.json({
      success: true,
      data: {
        header: {
          guid: level1Data.guid,
          id: level1Data.id,
          startDate: tanggal,
          endDate: tanggal,
          productId: String(level1Data.idproduk ?? ""),
          totalQuota: Number(level1Data.kuota) || 0,
        },
        wilayah,
        areas,
        shifts,
        _meta: {
          wilayahGuids,
          wilayahIds,
          areaGuids,
          areaIds,
          areaScopes,
          shiftNumericIds,
          shiftCounts,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    await params
    const token = (session.user as any).aspnetToken
    const jsonHeaders = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }

    const { header, wilayah, areas, shifts, _meta } = await req.json()
    const wilayahIds: Record<string, number> = _meta?.wilayahIds || {}
    const areaIds: Record<string, number> = _meta?.areaIds || {}
    const areaScopes: Record<string, string> = _meta?.areaScopes || {}
    const shiftNumericIds: Record<string, Record<string, number>> = _meta?.shiftNumericIds || {}
    const shiftCounts: Record<string, number> = _meta?.shiftCounts || {}

    // Validate totals before sending to server
    const totalWilayah = Object.values(wilayah as Record<string, number>).reduce((a, b) => a + b, 0)
    if (Math.abs(totalWilayah - Number(header.totalQuota)) > 0.01) {
      return NextResponse.json({ success: false, error: "Total moda transportasi tidak sama dengan kuota harian" }, { status: 400 })
    }

    for (const [areaAbbrev, areaKuota] of Object.entries(areas as Record<string, number>)) {
      const areaShifts = (shifts as Record<string, Record<number, number>>)[areaAbbrev] || {}
      const shiftTotal = Object.values(areaShifts).reduce((a: number, b: number) => a + b, 0)
      if (areaKuota > 0 && Math.abs(shiftTotal - areaKuota) > 0.01) {
        return NextResponse.json({
          success: false,
          error: `Total shift area ${areaAbbrev} (${shiftTotal}) tidak sama dengan kuota area (${areaKuota})`
        }, { status: 400 })
      }
    }

    // Build UpdateWizard payload (same format as old app)
    const wilayahPayload = Object.entries(wilayah as Record<string, number>).map(([abbrev, kuota]) => ({
      id: String(wilayahIds[abbrev] || ""),
      id_wilayah: abbrev,
      nama_wilayah: abbrev,
      value: Number(kuota),
    }))

    const bagianPayload = Object.entries(areas as Record<string, number>).map(([abbrev, kuota]) => ({
      id: String(areaIds[abbrev] || ""),
      id_area: abbrev,
      scope: areaScopes[abbrev] || "",
      value: Number(kuota),
    }))

    const shiftPayload = Object.entries(areas as Record<string, number>)
      .filter(([, kuota]) => Number(kuota) > 0)
      .map(([abbrev]) => {
        const areaShifts = (shifts as Record<string, Record<number, number>>)[abbrev] || {}
        const numericIds = shiftNumericIds[abbrev] || {}
        const count = shiftCounts[abbrev] || 3
        return {
          id_area: abbrev,
          count,
          idShift1: numericIds["1"] || 0,
          idShift2: numericIds["2"] || 0,
          idShift3: numericIds["3"] || 0,
          shift1: Number(areaShifts[1]) || 0,
          shift2: Number(areaShifts[2]) || 0,
          shift3: Number(areaShifts[3]) || 0,
        }
      })

    const payload = {
      id: Number(header.id),
      startdate: header.startDate,
      enddate: header.endDate,
      produk: String(header.productId),
      harian: Number(header.totalQuota),
      wilayah: wilayahPayload,
      bagian: bagianPayload,
      shift: shiftPayload,
    }

    const res = await fetch(`${ASPNET}/api/Kuota/UpdateWizard`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json({ success: false, error: txt || `Error ${res.status}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Kuota berhasil diperbarui" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
