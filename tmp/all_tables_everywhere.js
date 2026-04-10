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

async function listAllTablesEverywhere() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Connected.\n';
    
    const result = await pool.request().query("SELECT s.name AS schema_name, t.name AS table_name FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id ORDER BY schema_name, table_name");
    output += 'All Tables (Schema.Table):\n';
    result.recordset.forEach(r => output += ` - ${r.schema_name}.${r.table_name}\n`);

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/all_tables_complete.txt', output);
}

listAllTablesEverywhere();
