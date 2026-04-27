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

    console.log("--- M_BagianDetail Sample ---");
    const bagRes = await pool.request().query("SELECT TOP 20 * FROM [dbo].[M_BagianDetail]");
    console.table(bagRes.recordset);
    
    // Check specific codes from sample
    const sampleCodes = ['D3GO', 'D3GD', 'D312', 'D205'];
    const bagMapRes = await pool.request()
      .query(`SELECT * FROM [dbo].[M_BagianDetail] WHERE company_code IN ('D3GO', 'D3GD', 'D312', 'D205')`);
    console.log("--- M_BagianDetail for sample codes ---");
    console.table(bagMapRes.recordset);

    pool.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
