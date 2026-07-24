import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { normalizeRole } from "@/lib/role-utils"

const ASPNET = process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const activeRole = normalizeRole((session.user as any).role)
    if (!["pod", "superadmin", "candal", "admin"].includes(activeRole)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const token = (session.user as any).aspnetToken
    const jsonHeaders = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }

    const { header, wilayah, areas, shifts } = await req.json()

    const bagianRes = await fetch(`${ASPNET}/api/Kuota/DataBagian`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
    if (!bagianRes.ok) {
      return NextResponse.json({ success: false, error: "Gagal memuat data area/shift" }, { status: 502 })
    }
    const bagianData = await bagianRes.json()

    // NOTE: M_BagianDetail.tipe is a category label (POALL/POCLUSTER/SOALL/SOCLUSTER),
    // never a shift count -- Number(tipe) is always NaN. The real per-company shift
    // count is bagianData.shift (same field /api/kuota/lookup forwards as shiftCount).
    const shiftCount = Math.max(1, Number(bagianData?.shift) || 0)

    // Validate shift totals match area quotas
    for (const [uniqueId, areaKuota] of Object.entries(areas as Record<string, number>)) {
      if (Number(areaKuota) <= 0) continue
      const areaShifts = (shifts as Record<string, Record<number, number>>)[uniqueId] || {}
      const shiftTotal = Object.values(areaShifts).reduce((a: number, b: unknown) => a + Number(b), 0)
      if (Math.abs(shiftTotal - Number(areaKuota)) > 0.01) {
        return NextResponse.json({
          success: false,
          error: `Total shift area ${uniqueId} (${shiftTotal}) tidak sama dengan kuota area (${areaKuota})`,
        }, { status: 400 })
      }
    }

    const wilayahPayload = Object.entries(wilayah as Record<string, number>)
      .filter(([, v]) => Number(v) > 0)
      .map(([abbrev, kuota]) => ({
        id: "0",
        id_wilayah: abbrev,
        nama_wilayah: abbrev,
        value: Number(kuota),
      }))

    const bagianPayload = Object.entries(areas as Record<string, number>)
      .filter(([, v]) => Number(v) > 0)
      .map(([uniqueId, kuota]) => {
        let parts = uniqueId.split('::')
        const scope = parts[0]
        const abbrev = parts.length > 1 ? parts.slice(1).join('::') : uniqueId
        return {
          id: "0",
          id_area: abbrev,
          scope: scope,
          value: Number(kuota),
        }
      })

    const shiftPayload = Object.entries(areas as Record<string, number>)
      .filter(([, kuota]) => Number(kuota) > 0)
      .map(([uniqueId]) => {
        let parts = uniqueId.split('::')
        const abbrev = parts.length > 1 ? parts.slice(1).join('::') : uniqueId
        const areaShifts = (shifts as Record<string, Record<number, number>>)[uniqueId] || {}
        return {
          id_area: abbrev,
          count: shiftCount,
          idShift1: 0,
          idShift2: 0,
          idShift3: 0,
          shift1: Number(areaShifts[1]) || 0,
          shift2: Number(areaShifts[2]) || 0,
          shift3: Number(areaShifts[3]) || 0,
        }
      })

    const payload = {
      id: 0,
      startdate: header.startDate,
      enddate: header.endDate,
      produk: String(header.productId),
      harian: Number(header.totalQuota),
      wilayah: wilayahPayload,
      bagian: bagianPayload,
      shift: shiftPayload,
    }

    const res = await fetch(`${ASPNET}/api/Kuota/AddWizard`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json({ success: false, error: txt || `Error ${res.status}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Kuota berhasil disimpan" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
