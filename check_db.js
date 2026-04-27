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

const query = process.argv[2] || "SELECT TOP 10 * FROM INFORMATION_SCHEMA.TABLES";

async function run() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(query);
    console.log(JSON.stringify(result.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
