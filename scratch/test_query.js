const { query } = require("./src/lib/db");

async function test() {
  try {
    const res = await query(`
      SELECT
        h.id,
        h.guid,
        h.tanggal,
        TO_CHAR(h.tanggal, 'DD Month YYYY') AS "tanggalString",
        p.nama AS "namaproduk",
        h.kuota,
        COALESCE(h.kuota_terpesan, 0) AS kuota_terpesan,
        COALESCE(h.kuota_in, 0) AS kuota_in,
        COALESCE(h.kuota_out, 0) AS kuota_out,
        h.activated,
        CASE WHEN h.activated = '1' THEN 'Aktif' ELSE 'Nonaktif' END AS status,
        h.updatedon,
        TO_CHAR(h.updatedon, 'DD Mon YYYY HH24:MI') AS "updatedonString",
        u.fullname AS "updatedbyString"
      FROM kuota1header h
      LEFT JOIN produk p ON h.idproduk = p.id::varchar
      LEFT JOIN aspnetusers u ON h.updatedby = u.id
      ORDER BY h.tanggal DESC
      LIMIT 10
    `);
    console.log("Success! Rows:", res.rows.length);
  } catch (e) {
    console.error("Query failed:", e.message);
  } finally {
    process.exit();
  }
}

test();
