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

async function checkTables() {
  try {
    const pool = await sql.connect(config);
    console.log('Connected to SQL Server');

    const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    console.log('Tables in database:');
    console.table(result.recordset);

    const tablesToDetail = ['Produk', 'M_Wilayah', 'M_Bagian', 'Gudang', 'Posto'];
    for (const table of tablesToDetail) {
      try {
        const columns = await pool.request().query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'`);
        console.log(`\nColumns for ${table}:`);
        console.table(columns.recordset);
      } catch (e) {
        console.log(`\nTable ${table} not found or error fetching columns.`);
      }
    }

    await pool.close();
  } catch (err) {
    console.error('Database connection error:', err);
  }
}

checkTables();
