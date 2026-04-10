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
    const result = await pool.request().query("SELECT TOP 1 * FROM Users WHERE NIK IS NOT NULL");
    if (result.recordset.length > 0) {
      console.log("Found User with NIK:", result.recordset[0].UserName);
      console.log("Keys in recordset:", Object.keys(result.recordset[0]));
      console.log("NIK Value:", result.recordset[0].NIK);
    } else {
      console.log("No user found with NIK NOT NULL");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
