import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aspnetFetchServer } from "@/lib/api-client";
import { getProductsFromApg } from "@/lib/apg-service";

function isAuthorized(session: any): boolean {
  const roles = (session?.user as any)?.roles || [];
  return !!session?.user && roles.some((r: string) => ["superadmin", "ti"].includes(r.toLowerCase()));
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(session)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    let apgProducts: any[] = [];
    try {
      apgProducts = await getProductsFromApg();
    } catch (err: any) {
      throw new Error(`Gagal mengambil data dari APG: ${err.message}`);
    }

    if (!apgProducts || apgProducts.length === 0) {
      throw new Error("Data produk dari APG kosong atau tidak dapat diakses.");
    }

    // APG returns combo-style { value, text } pairs
    const items = apgProducts
      .map((ext: any) => {
        const kode = (ext.value || ext.VALUE || ext.id || ext.ID || '').toString().trim();
        let nama = (ext.text || ext.TEXT || ext.name || ext.NAME || '').toString().trim();
        
        // Strip code prefix if present (e.g. "1000036 Urea Bersubsidi" -> "Urea Bersubsidi")
        if (nama.startsWith(kode)) {
          nama = nama.substring(kode.length).replace(/^[\s\-]+/, '').trim();
        }

        // Limit name length to avoid DB issues
        if (nama.length > 200) nama = nama.substring(0, 197) + "...";

        return { 
          ID: 0, // ID should be 0 for upsert/insert scenarios in most C# controllers
          Nama: nama, 
          Kode: kode 
        };
      })
      .filter((i: any) => i.Kode && i.Nama);

    if (items.length === 0) {
      throw new Error("Tidak ada data valid dari APG setelah mapping.");
    }

    const token = (session?.user as any)?.aspnetToken as string;
    const res = await aspnetFetchServer('/api/SuperadminProduk/SyncBulk', token, {
      method: 'POST',
      body: JSON.stringify(items),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`Sync API error: ${res.status} ${errText}`);
    }

    const result = await res.json();
    return NextResponse.json({
      success: true,
      message: result.message ?? `Sync selesai. ${result.added} ditambahkan, ${result.updated} diperbarui.`
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
