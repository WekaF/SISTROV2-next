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
  console.log("Checking IDENTITY property of SISTRODEV.dbo.Antrian...");
  try {
    const devPool = await sql.connect({ ...config, database: 'SISTRODEV' });
    
    // Check if the 'id' column has identity property
    const resIdentity = await devPool.request().query(`
      SELECT COLUMN_NAME, COLUMNPROPERTY(object_id(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS IsIdentity
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Antrian' AND COLUMN_NAME = 'id'
    `);
    
    const isIdentity = resIdentity.recordset[0]?.IsIdentity === 1;
    console.log("Is 'id' column an IDENTITY column?", isIdentity);
    await sql.close();

    // Recreate in SISTROSTAGING
    console.log("\nConnecting to SISTROSTAGING...");
    const stagingPool = await sql.connect({ ...config, database: 'SISTROSTAGING' });
    
    const createTableQuery = `
      CREATE TABLE [dbo].[Antrian] (
        [id] [int] ${isIdentity ? 'IDENTITY(1,1)' : ''} NOT NULL,
        [ticketID] [varchar](50) NOT NULL,
        [storageID] [varchar](50) NULL,
        [updatedon] [datetime] NULL CONSTRAINT [DF_Antrian_updatedon] DEFAULT (getdate()),
        [timekosong] [datetime] NULL,
        [status] [varchar](50) NULL,
        [skipcount] [int] NULL CONSTRAINT [DF_Antrian_skipcount] DEFAULT ((0)),
        [lastskiptime] [datetime] NULL,
        [revised] [varchar](255) NULL,
        [pic] [varchar](255) NULL,
        CONSTRAINT [PK_Antrian] PRIMARY KEY CLUSTERED ([ticketID] ASC)
      );
    `;
    
    console.log("Executing CREATE TABLE query in SISTROSTAGING...");
    await stagingPool.request().query(createTableQuery);
    console.log("SUCCESS! Recreated 'Antrian' table in SISTROSTAGING database.");

    await sql.close();
  } catch (err) {
    console.error("Failed:", err.message);
  }
}
check();
