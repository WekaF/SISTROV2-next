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

    console.log("--- Company Sample ---");
    const res = await pool.request().query("SELECT TOP 10 * FROM [dbo].[Company] WHERE company_code IN ('D3GO', 'D3GD', 'D312', 'D205') OR company_code LIKE 'D3%'");
    console.table(res.recordset);

    pool.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
