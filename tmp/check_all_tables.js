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
    output += 'Successfully connected to the database.\n';
    
    const result = await pool.request().query("SELECT name FROM sys.tables ORDER BY name");
    output += 'All Tables:\n';
    result.recordset.forEach(row => {
      output += ' - ' + row.name + '\n';
    });

    await pool.close();
  } catch (err) {
    output += 'Database error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/all_tables.txt', output);
}

checkAllTables();
