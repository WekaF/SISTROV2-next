const sql = require('mssql');

const sqlConfig = {
  server: '192.168.188.29',
  port: 7869,
  database: 'SISTROPI-v2',
  user: 'sistro',
  password: 'Si$tr0@Pupuk1!',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function debug() {
  try {
    const pool = await sql.connect(sqlConfig);
    console.log("Connected to DB.");

    console.log("--- M_Bagian POALL count per Wilayah ---");
    const res = await pool.request().query("SELECT scope, abbrev, keterangan FROM [dbo].[M_Bagian] WHERE abbrev LIKE 'PO%'");
    console.table(res.recordset);

    pool.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
