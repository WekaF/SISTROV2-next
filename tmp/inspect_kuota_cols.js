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

async function inspectColumns() {
  try {
    const pool = await sql.connect(config);
    const tables = ['Kuota_Header', 'Kuota_Wilayah', 'Kuota_Area', 'Kuota_Shift'];
    for (const table of tables) {
      const columns = await pool.request().query(`SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'`);
      console.log(`\nColumns for ${table}:`);
      console.table(columns.recordset);
    }
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

inspectColumns();
