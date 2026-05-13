import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;
    const [wilayahRes, bagianRes] = await Promise.all([
      aspnetFetchServer('/api/Kuota/DataWilayah', token),
      aspnetFetchServer('/api/Kuota/DataBagian', token),
    ]);

    if (!wilayahRes.ok) throw new Error("Failed to fetch wilayah");
    if (!bagianRes.ok) throw new Error("Failed to fetch bagian");

    const wilayahData: any[] = await wilayahRes.json();
    const bagianRaw = await bagianRes.json();
    const bagianData: any[] = Array.isArray(bagianRaw?.bagian) ? bagianRaw.bagian : Array.isArray(bagianRaw) ? bagianRaw : [];

    return NextResponse.json({
      success: true,
      data: {
        wilayah: wilayahData.map(w => ({ abbrev: w.abbrev ?? w.Abbrev ?? "", keterangan: w.keterangan ?? w.Keterangan ?? "" })),
        bagian: bagianData.map(b => ({ abbrev: b.abbrev ?? b.Abbrev ?? "", keterangan: b.keterangan ?? b.Keterangan ?? "", wilayah: b.scope ?? b.wilayah ?? "", tipe: b.tipe ?? b.Tipe ?? "" })),
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
