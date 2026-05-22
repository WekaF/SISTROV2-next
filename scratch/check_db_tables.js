const sql = require('mssql');

const config = {
  user: 'usr_sistro_dev',
  password: 'Si$tr0@Pupuk1!_d3v',
  server: '192.168.188.29',
  port: 7869,
  database: 'SISTROSTAGING',
  options: {
    encrypt: false, // Use false for local/dev servers unless SSL is required
    trustServerCertificate: true
  }
};

async function check() {
  console.log("Connecting to SQL Server:", config.server, "port:", config.port, "database:", config.database);
  try {
    const pool = await sql.connect(config);
    console.log("Connected successfully!");

    console.log("\n--- Searching for 'Antrian' in table names ---");
    const res = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%Antrian%'
      ORDER BY TABLE_NAME
    `);
    console.log("Matching tables found:", res.recordset);

    console.log("\n--- Listing first 20 tables in the database ---");
    const resAll = await pool.request().query(`
      SELECT TOP 20 TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      ORDER BY TABLE_NAME
    `);
    console.log("Some tables in database:", resAll.recordset);

    await sql.close();
  } catch (err) {
    console.error("DB connection or query failed:", err);
  }
}
check();
