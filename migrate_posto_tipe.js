const sql = require('mssql');

const sqlConfig = {
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

async function migrate() {
  try {
    const pool = await sql.connect(sqlConfig);
    console.log("Connected to DB.");

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[dbo].[Company]') AND name = 'posto_tipe')
      BEGIN
        ALTER TABLE [dbo].[Company] ADD [posto_tipe] VARCHAR(50) NULL
      END
    `);
    
    console.log("Migration successful: [posto_tipe] column ensured in [Company] table.");

    pool.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
