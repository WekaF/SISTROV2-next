import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";


export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const roles = (session?.user as any)?.roles || [];
    const isAuth = !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
    if (!isAuth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = (session?.user as any)?.aspnetToken as string;

    // Fetch data from APG first
    let externalWarehouses: any[] = [];
    try {
      const { getWarehousesFromApg } = await import("@/lib/apg-service");
      externalWarehouses = await getWarehousesFromApg();
    } catch (err: any) {
      throw new Error(`Gagal mengambil data dari APG: ${err.message}`);
    }

    if (!externalWarehouses || externalWarehouses.length === 0) {
      throw new Error("Data gudang dari APG kosong atau tidak dapat diakses.");
    }

    // Map to the format expected by SuperadminGudang/SyncBulk
    const items = externalWarehouses.map((ext: any) => ({
      ID: (ext.Plant || ext.plant || ext.id || ext.ID || "").toString().trim(),
      Deskripsi: (ext.PlantDesc || ext.plantdesc || ext.PlantDescription || ext.deskripsi || ext.Deskripsi || "").toString().trim(),
      Alamat: ext.Alamat || ext.alamat || ext.Address || "",
      Kecamatan: ext.KecmatName || ext.kecamatan || ext.District || "",
      Kabupaten: ext.KotakabName || ext.kabupaten || ext.City || "",
      Propinsi: ext.RegioDesc || ext.propinsi || ext.Province || "",
    })).filter(i => i.ID && i.Deskripsi);

    if (items.length === 0) {
      throw new Error("Tidak ada data valid hasil mapping dari APG.");
    }

    // Sync ke C# API dengan payload yang valid
    const syncRes = await aspnetFetchServer('/api/SuperadminGudang/SyncBulk', token, {
      method: 'POST',
      body: JSON.stringify(items),
    });

    if (!syncRes.ok) {
      const errText = await syncRes.text().catch(() => syncRes.statusText);
      throw new Error(`Sync API error: ${syncRes.status} ${errText}`);
    }

    const result = await syncRes.json();
    return NextResponse.json({ success: true, message: result.message ?? `Sync selesai. ${result.added} ditambahkan, ${result.updated} diperbarui.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
