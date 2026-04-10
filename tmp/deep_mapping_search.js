const sql = require('mssql');
const fs = require('fs');

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

async function checkMappingMechanism() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Connected.\n';
    
    // Search for any mapping related tables or columns
    const mappingTables = await pool.request().query("SELECT name FROM sys.tables WHERE name LIKE '%Map%' OR name LIKE '%Plant%' OR name LIKE '%Prod%'");
    output += 'Mapping/Product/Plant Tables:\n';
    mappingTables.recordset.forEach(r => output += ` - ${r.name}\n`);

    // Check if there is a table for Gudang-Product relationship
    const gudangProd = await pool.request().query("SELECT name FROM sys.tables WHERE name LIKE '%Gudang%' AND name LIKE '%Prod%'");
    if (gudangProd.recordset.length > 0) {
      output += '\nGudang-Product relation tables found:\n';
      gudangProd.recordset.forEach(r => output += ` - ${r.name}\n`);
    }

    // Check Gudang_SPPT columns
    output += '\nGudang_SPPT Columns:\n';
    const gspptCols = await pool.request().query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Gudang_SPPT'");
    gspptCols.recordset.forEach(c => output += ` - ${c.column_name}\n`);

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/mapping_search.txt', output);
}

checkMappingMechanism();
