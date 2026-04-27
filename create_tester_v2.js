const sql = require('mssql');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

async function run() {
  try {
    const pool = await sql.connect(config);
    const passwordHash = await bcrypt.hash('password123', 10);
    const userId = crypto.randomUUID();

    // Check if tester already exists, if so delete
    await pool.request().input('uname', 'tester').query("DELETE FROM UserCompanies WHERE UserId IN (SELECT Id FROM Users WHERE UserName = @uname)");
    await pool.request().input('uname', 'tester').query("DELETE FROM UserRoles WHERE UserId IN (SELECT Id FROM Users WHERE UserName = @uname)");
    await pool.request().input('uname', 'tester').query("DELETE FROM Users WHERE UserName = @uname");

    await pool.request()
      .input('uid', userId)
      .input('uname', 'tester')
      .input('email', 'tester@example.com')
      .input('pass', passwordHash)
      .query("INSERT INTO Users (Id, UserName, Email, PasswordHash, IsActive, CreatedAt) VALUES (@uid, @uname, @email, @pass, 1, GETDATE())");

    const roleRes = await pool.request().query("SELECT Id FROM Roles WHERE Code = 'pod'");
    const roleId = roleRes.recordset[0].Id;

    await pool.request().input('uid', userId).input('rid', roleId).query("INSERT INTO UserRoles (UserId, RoleId) VALUES (@uid, @rid)");
    await pool.request().input('uid', userId).input('cc', 'PKG').query("INSERT INTO UserCompanies (UserId, CompanyCode) VALUES (@uid, @cc)");
    await pool.request().input('uid', userId).input('cc2', 'PKC').query("INSERT INTO UserCompanies (UserId, CompanyCode) VALUES (@uid, @cc2)");

    console.log('Tester user created/reset successfully');
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

run();
