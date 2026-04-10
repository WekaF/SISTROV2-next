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

async function findMappingByColumns() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Connected.\n';
    
    // Find tables that have both a reference to Produk and a reference to Company/Plant
    const result = await pool.request().query(`
      SELECT table_name
      FROM information_schema.columns
      WHERE column_name LIKE '%Produk%' OR column_name LIKE '%ProductId%'
      INTERSECT
      SELECT table_name
      FROM information_schema.columns
      WHERE column_name LIKE '%Company%' OR column_name LIKE '%Plant%'
    `);
    
    output += 'Potential Mapping Tables (Intersection):\n';
    result.recordset.forEach(r => output += ` - ${r.table_name}\n`);

    // Check Gudang_SPPT again
    const sampleGS = await pool.request().query("SELECT TOP 1 * FROM Gudang_SPPT");
    output += '\nGudang_SPPT Sample:\n';
    output += JSON.stringify(sampleGS.recordset, null, 2) + '\n';

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/find_mapping_v5.txt', output);
}

findMappingByColumns();
