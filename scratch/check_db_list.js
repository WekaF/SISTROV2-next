const sql = require('mssql');

const config = {
  user: 'usr_sistro_dev',
  password: 'Si$tr0@Pupuk1!_d3v',
  server: '192.168.188.29',
  port: 7869,
  database: 'master', // connect to master to list databases
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function check() {
  console.log("Connecting to master database...");
  try {
    const pool = await sql.connect(config);
    console.log("Connected successfully!");

    const res = await pool.request().query(`
      SELECT name, create_date 
      FROM sys.databases 
      WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
      ORDER BY name
    `);
    console.log("Available databases on this server:", res.recordset);

    await sql.close();
  } catch (err) {
    console.error("Failed to query master databases:", err);
  }
}
check();
