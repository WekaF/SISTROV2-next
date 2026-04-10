import { NextResponse } from "next/server";
import { getDbConnection } from "@/lib/db";
import sql from "mssql";

export async function GET() {
  try {
    const pool = await getDbConnection();

    // Fetch Products
    const productsResult = await pool.request().query("SELECT ID as id, NamaProduk as name FROM Produk WHERE deleted = '0' OR deleted IS NULL");
    
    // Fetch Wilayah (Moda)
    const wilayahResult = await pool.request().query("SELECT abbrev as id, nama as name FROM M_Wilayah");

    // Fetch Areas (Areas/Clusters) - using M_Bagian as typically Areas map to Bagian in SISTRO
    const areasResult = await pool.request().query("SELECT abbrev as id, nama as name, wilayah as wilayahId FROM M_Bagian");

    return NextResponse.json({
      success: true,
      products: productsResult.recordset,
      wilayah: wilayahResult.recordset,
      areas: areasResult.recordset
    });
  } catch (error: any) {
    console.error("Lookup API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
