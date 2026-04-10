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

async function solveMystery() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Connected.\n';
    
    // 1. Check if M_Wilayah and M_Bagian are views or synonyms
    const objects = await pool.request().query("SELECT name, type_desc FROM sys.objects WHERE name IN ('M_Wilayah', 'M_Bagian', 'M_Mapping_Stok', 'Produk_Mapping')");
    output += 'Object Metadata:\n';
    objects.recordset.forEach(r => output += ` - ${r.name}: ${r.type_desc}\n`);

    // 2. Search for any table with "Plant" in it again, very broadly
    const allObj = await pool.request().query("SELECT name, type_desc FROM sys.objects WHERE name LIKE '%Mapping%' OR name LIKE '%Plant%' OR name LIKE '%Company%'");
    output += '\nRelated Objects:\n';
    allObj.recordset.forEach(r => output += ` - ${r.name} (${r.type_desc})\n`);

    // 3. If no mapping table, maybe it's in the Produk table? Check columns of Produk again.
    const prodCols = await pool.request().query("SELECT * FROM information_schema.columns WHERE table_name = 'Produk'");
    output += '\nProduk Columns Details:\n';
    prodCols.recordset.forEach(c => output += ` - ${c.COLUMN_NAME} (${c.DATA_TYPE})\n`);

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/mystery_solved.txt', output);
}

solveMystery();
