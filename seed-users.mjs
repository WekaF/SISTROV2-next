import sql from 'mssql';
import bcrypt from 'bcryptjs';

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

const passwordText = 'Sistro123!';

async function seed() {
  let pool;
  try {
    pool = await sql.connect(sqlConfig);
    console.log("Connected to DB...");

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordText, salt);

    // 1. Ensure Roles & Companies exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM Roles WHERE Code = 'pod')
        INSERT INTO Roles (Code, Name) VALUES ('pod', 'User POD');
      IF NOT EXISTS (SELECT 1 FROM Company WHERE company_code = 'PKG')
        INSERT INTO Company (company_code, company, has_security, timbangan, has_gudang) VALUES ('PKG', 'Petrokimia Gresik', 1, 1, 1);
      IF NOT EXISTS (SELECT 1 FROM Company WHERE company_code = 'PKC')
        INSERT INTO Company (company_code, company, has_security, timbangan, has_gudang) VALUES ('PKC', 'Pupuk Kujang', 1, 1, 1);
    `);
    console.log("Roles and Companies verified.");

    const users = [
      { username: 'SISTRO_DEV', email: 'sistro_dev@dummy.com', name: 'Rekanan Dev', nik: null, sap: '9999999999', role: 'rekanan', companies: [] },
      { username: 'superadmin', email: 'superadmin@sistro.com', name: 'Sistro Superadmin', nik: null, sap: null, role: 'superadmin', companies: [] },
      { username: '2156225', email: '2156225@sistro.com', name: 'User POD', nik: '2156225', sap: null, role: 'pod', companies: ['PKG', 'PKC'] },
      { username: 'gudang_pkg_1', email: 'gudang_pkg_1@sistro.com', name: 'Gudang PKG', nik: null, sap: null, role: 'gudang', companies: ['PKG'] },
      { username: 'security_pkg_1', email: 'security_pkg_1@sistro.com', name: 'Security PKG', nik: null, sap: null, role: 'security', companies: ['PKG'] },
      { username: 'timbang_pkg_1', email: 'timbang_pkg_1@sistro.com', name: 'Timbang PKG', nik: null, sap: null, role: 'jembatan_timbang', companies: ['PKG'] },
      { username: '91010257', email: '91010257@sistro.com', name: 'User Admin', nik: '91010257', sap: null, role: 'admin', companies: [] }
    ];

    for (const u of users) {
      // Check if user exists
      const userCheck = await pool.request().input('user', sql.NVarChar, u.username).query('SELECT Id FROM Users WHERE UserName = @user');
      let userId;
      
      if (userCheck.recordset.length === 0) {
        // Insert User
        const insertUser = await pool.request()
          .input('user', sql.NVarChar, u.username)
          .input('email', sql.NVarChar, u.email)
          .input('hash', sql.NVarChar, hash)
          .input('name', sql.VarChar, u.name)
          .input('nik', sql.VarChar, u.nik)
          .input('sap', sql.VarChar, u.sap)
          .query(`
            INSERT INTO Users (UserName, Email, PasswordHash, FullName, NIK, SapVendorCode) 
            OUTPUT INSERTED.Id
            VALUES (@user, @email, @hash, @name, @nik, @sap)
          `);
        userId = insertUser.recordset[0].Id;
        console.log(`Inserted user: ${u.username}`);
      } else {
        userId = userCheck.recordset[0].Id;
        console.log(`User ${u.username} already exists. Updating email...`);
        // Just enforce the email if it was already there (with NULL)
        await pool.request()
          .input('uid', sql.UniqueIdentifier, userId)
          .input('email', sql.NVarChar, u.email)
          .query('UPDATE Users SET Email = @email WHERE Id = @uid AND Email IS NULL');
      }

      // Check Role
      const roleCheck = await pool.request().input('rcode', sql.VarChar, u.role).query('SELECT Id FROM Roles WHERE Code = @rcode');
      if (roleCheck.recordset.length > 0) {
        const roleId = roleCheck.recordset[0].Id;
        // Insert UserRole
        await pool.request()
          .input('uid', sql.UniqueIdentifier, userId)
          .input('rid', sql.Int, roleId)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId=@uid AND RoleId=@rid)
              INSERT INTO UserRoles (UserId, RoleId) VALUES (@uid, @rid)
          `);
      }

      // Check Companies
      for (const comp of u.companies) {
        await pool.request()
          .input('uid', sql.UniqueIdentifier, userId)
          .input('cc', sql.VarChar, comp)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM UserCompanies WHERE UserId=@uid AND CompanyCode=@cc)
              INSERT INTO UserCompanies (UserId, CompanyCode) VALUES (@uid, @cc)
          `);
      }
    }
    
    console.log("Seeding completely finished.");

  } catch (e) {
    console.error("Error generating seed:", e);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

seed();
