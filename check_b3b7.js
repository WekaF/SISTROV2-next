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

    const res = await pool.request()
      .input('id', 'B3B7')
      .query("SELECT * FROM [dbo].[Gudang] WHERE ID = @id");
    console.table(res.recordset);

    pool.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
