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

async function checkSynonyms() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Connected.\n';
    
    const result = await pool.request().query("SELECT name, base_object_name FROM sys.synonyms");
    output += 'Synonyms:\n';
    result.recordset.forEach(r => output += ` - ${r.name} -> ${r.base_object_name}\n`);

    const tables = await pool.request().query("SELECT name FROM sys.tables");
    output += '\nTables again:\n';
    tables.recordset.forEach(r => output += ` - ${r.name}\n`);

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/synonyms_info.txt', output);
}

checkSynonyms();
