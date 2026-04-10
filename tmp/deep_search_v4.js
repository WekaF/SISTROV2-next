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

async function deepSearch() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Connected.\n';
    
    // Explicitly check for M_Wilayah and M_Bagian
    const m_tables = await pool.request().query("SELECT name FROM sys.tables WHERE name LIKE 'M_%'");
    output += 'M_ Tables:\n';
    m_tables.recordset.forEach(r => output += ` - ${r.name}\n`);

    // Check if M_Wilayah has a mapping to Produk
    const m_wil_cols = await pool.request().query("SELECT column_name FROM information_schema.columns WHERE table_name = 'M_Wilayah'");
    output += '\nM_Wilayah Columns:\n';
    m_wil_cols.recordset.forEach(c => output += ` - ${c.column_name}\n`);

    // The user says "Plant". Let's search for "Plant" in any string column in any table? No.
    // Let's check Company table again.
    const company = await pool.request().query("SELECT TOP 10 * FROM Company");
    output += '\nCompany Sample:\n';
    output += JSON.stringify(company.recordset, null, 2) + '\n';

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/deep_search_v4.txt', output);
}

deepSearch();
