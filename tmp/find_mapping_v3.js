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

async function searchForMapping() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Connected.\n';
    
    // Find any column that looks like a product ID in any table
    const result = await pool.request().query("SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%Produk%' OR column_name LIKE '%ProductId%'");
    output += 'Tables with Product references:\n';
    result.recordset.forEach(r => output += ` - ${r.table_name}.${r.column_name}\n`);

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/find_mapping_v3.txt', output);
}

searchForMapping();
