import sql from 'mssql';

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

async function test() {
  try {
    const pool = await sql.connect(sqlConfig);
    const result = await pool.request().query("SELECT UserName, SapVendorCode FROM Users WHERE UserName = 'SISTRO_DEV'");
    console.log("DB Result Keys:", Object.keys(result.recordset[0]));
    console.log("DB Result Value:", result.recordset[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
