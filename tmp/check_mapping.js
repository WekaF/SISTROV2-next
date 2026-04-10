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

async function checkMappingTables() {
  try {
    const pool = await sql.connect(config);
    console.log('Successfully connected to the database.');
    
    // List all tables to find the mapping table
    const result = await pool.request().query("SELECT name FROM sys.tables ORDER BY name");
    console.log('Tables found:');
    result.recordset.forEach(row => {
      if (row.name.toLowerCase().includes('mapping') || row.name.toLowerCase().includes('produk')) {
        console.log(' - ' + row.name);
      }
    });

    // Check Company table to see how plants are identified
    try {
      const companyResult = await pool.request().query("SELECT TOP 5 * FROM Company");
      console.log('\nSample from Company table:');
      console.table(companyResult.recordset);
    } catch (e) {}

    await pool.close();
  } catch (err) {
    console.error('Database error:', err.message);
  }
}

checkMappingTables();
