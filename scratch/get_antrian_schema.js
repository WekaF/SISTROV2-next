const sql = require('mssql');

const config = {
  user: 'usr_sistro_dev',
  password: 'Si$tr0@Pupuk1!_d3v',
  server: '192.168.188.29',
  port: 7869,
  database: 'SISTRODEV',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function check() {
  console.log("Connecting to SISTRODEV...");
  try {
    const pool = await sql.connect(config);
    console.log("Connected successfully!");

    // Get column definitions
    const resColumns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Antrian'
      ORDER BY ORDINAL_POSITION
    `);
    console.log("\nColumn Definitions for 'Antrian' in SISTRODEV:");
    console.log(resColumns.recordset);

    // Get primary key
    const resPK = await pool.request().query(`
      SELECT Col.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS Tab, INFORMATION_SCHEMA.KEY_COLUMN_USAGE Col
      WHERE Col.CONSTRAINT_NAME = Tab.CONSTRAINT_NAME
        AND Col.TABLE_NAME = Tab.TABLE_NAME
        AND Tab.CONSTRAINT_TYPE = 'PRIMARY KEY'
        AND Col.TABLE_NAME = 'Antrian'
    `);
    console.log("\nPrimary Key of 'Antrian':", resPK.recordset);

    await sql.close();
  } catch (err) {
    console.error("Failed to query schema:", err);
  }
}
check();
