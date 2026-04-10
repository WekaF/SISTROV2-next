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

async function checkAllTables() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Successfully connected.\n';
    
    const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
    output += 'Tables:\n';
    result.recordset.forEach(row => {
      output += ' - ' + row.TABLE_NAME + '\n';
    });

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/tables_v2.txt', output);
}

checkAllTables();
