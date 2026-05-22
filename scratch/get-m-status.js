const sql = require("mssql");

const config = {
  server: "192.168.188.29",
  port: 7869,
  database: "SISTROSTAGING",
  user: "usr_sistro_dev",
  password: "Si$tr0@Pupuk1!_d3v",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function run() {
  try {
    const pool = await sql.connect(config);
    const res = await pool.request().query(`
      SELECT TOP 10 id, bookingno, position, positioncode, updatedon FROM LogArmada ORDER BY id DESC
    `);
    console.log("LogArmada sample:");
    console.log(JSON.stringify(res.recordset, null, 2));
    await sql.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
