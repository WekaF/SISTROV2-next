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

    console.log("--- M_Bagian Schema ---");
    const res = await pool.request().query("SELECT TOP 1 * FROM [dbo].[M_Bagian]");
    console.table(res.recordset);
    
    // Check if company_code exists
    const columns = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'M_Bagian'");
    console.log("--- M_Bagian Columns ---");
    console.table(columns.recordset);

    pool.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
