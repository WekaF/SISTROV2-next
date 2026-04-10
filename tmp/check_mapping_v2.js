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

async function checkMappingTables() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Successfully connected to the database.\n';
    
    const result = await pool.request().query("SELECT name FROM sys.tables ORDER BY name");
    output += 'Tables found:\n';
    result.recordset.forEach(row => {
      if (row.name.toLowerCase().includes('mapping') || row.name.toLowerCase().includes('produk')) {
        output += ' - ' + row.name + '\n';
      }
    });

    const companyResult = await pool.request().query("SELECT TOP 5 company_code, nama_company, statusPlant FROM Company");
    output += '\nSample from Company table:\n';
    output += JSON.stringify(companyResult.recordset, null, 2) + '\n';

    await pool.close();
  } catch (err) {
    output += 'Database error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/db_info.txt', output);
}

checkMappingTables();
