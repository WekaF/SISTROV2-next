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

async function getSamples() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Connected.\n';
    
    output += '\nProduk Sample:\n';
    const prd = await pool.request().query("SELECT TOP 5 * FROM Produk");
    output += JSON.stringify(prd.recordset, null, 2) + '\n';

    output += '\nCompany Sample:\n';
    const comp = await pool.request().query("SELECT TOP 5 * FROM Company");
    output += JSON.stringify(comp.recordset, null, 2) + '\n';

    output += '\nGudang Sample:\n';
    const gud = await pool.request().query("SELECT TOP 5 * FROM Gudang");
    output += JSON.stringify(gud.recordset, null, 2) + '\n';

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/db_samples.txt', output);
}

getSamples();
