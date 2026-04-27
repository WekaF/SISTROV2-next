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

async function check() {
  try {
    const pool = await sql.connect(sqlConfig);
    console.log("Connected to DB.");

    const columns = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Gudang'");
    console.table(columns.recordset);

    pool.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
