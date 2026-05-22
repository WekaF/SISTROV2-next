const sql = require('mssql');

const config = {
  user: 'usr_sistro_dev',
  password: 'Si$tr0@Pupuk1!_d3v',
  server: '192.168.188.29',
  port: 7869,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function check() {
  const dbs = ['SISTRODEV', 'SISTROPI', 'SISTROPI-v2', 'SISTROSTAGING'];
  
  for (const dbName of dbs) {
    console.log(`\nChecking database: ${dbName}...`);
    try {
      const dbConfig = { ...config, database: dbName };
      const pool = await sql.connect(dbConfig);
      
      const res = await pool.request().query(`
        SELECT TABLE_SCHEMA, TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'Antrian'
      `);
      
      if (res.recordset.length > 0) {
        console.log(`[FOUND!] 'Antrian' table exists in ${dbName}!`);
      } else {
        console.log(`[NOT FOUND] 'Antrian' table does NOT exist in ${dbName}.`);
        
        // Let's also check if there is any table matching '%Antri%'
        const resAntri = await pool.request().query(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Antri%'
        `);
        console.log("Matching tables:", resAntri.recordset.map(r => r.TABLE_NAME));
      }
      
      await sql.close();
    } catch (err) {
      console.error(`Failed to connect or query ${dbName}:`, err.message);
    }
  }
}
check();
