const sql = require('mssql');

const config = {
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

async function findQuotaTables() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Quota%' OR TABLE_NAME LIKE '%Kuota%'");
    console.log('Quota related tables:');
    console.table(result.recordset);
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

findQuotaTables();
