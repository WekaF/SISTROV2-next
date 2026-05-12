const { query } = require("./src/lib/db");

async function check() {
  try {
    const res = await query("SELECT COUNT(*) as count FROM kuota4shift WHERE DATE(tanggal) = CURRENT_DATE");
    console.log("Rows for today in kuota4shift:", res.rows[0].count);
    
    const res2 = await query("SELECT COUNT(*) as count FROM kuota1header WHERE DATE(tanggal) = CURRENT_DATE");
    console.log("Rows for today in kuota1header:", res2.rows[0].count);

    const res3 = await query("SELECT DISTINCT company_code FROM kuota1header");
    console.log("Company codes in kuota1header:", res3.rows.map(r => r.company_code));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

check();
