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

async function checkColumns() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Successfully connected.\n';
    
    output += '\nProduk Columns:\n';
    const prdCols = await pool.request().query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Produk'");
    prdCols.recordset.forEach(c => output += ` - ${c.column_name} (${c.data_type})\n`);

    output += '\nCompany Columns:\n';
    const compCols = await pool.request().query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Company'");
    compCols.recordset.forEach(c => output += ` - ${c.column_name} (${c.data_type})\n`);

    output += '\nGudang Columns:\n';
    const gdnCols = await pool.request().query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Gudang'");
    gdnCols.recordset.forEach(c => output += ` - ${c.column_name} (${c.data_type})\n`);

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/columns_info.txt', output);
}

checkColumns();
