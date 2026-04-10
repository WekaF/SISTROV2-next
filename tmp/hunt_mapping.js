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

async function huntMappingTable() {
  let output = '';
  try {
    const pool = await sql.connect(config);
    output += 'Connected.\n';
    
    // Probing for common naming patterns
    const probes = [
      "Produk_Plant",
      "Plant_Produk",
      "Company_Produk",
      "Produk_Company",
      "Mapping_Produk",
      "Product_Mapping",
      "Gudang_Produk",
      "Produk_Gudang",
      "M_Mapping",
      "M_Produk_Mapping"
    ];

    for (const table of probes) {
      try {
        await pool.request().query(`SELECT TOP 1 * FROM ${table}`);
        output += `Found Table: ${table}\n`;
      } catch (e) {}
    }

    await pool.close();
  } catch (err) {
    output += 'Error: ' + err.message + '\n';
  }
  fs.writeFileSync('tmp/hunt_mapping.txt', output);
}

huntMappingTable();
