import sql from 'mssql';

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

async function test() {
  const pool = await sql.connect(sqlConfig);
  const result = await pool.request().query('SELECT UserName, FullName, RoleId FROM Users LEFT JOIN UserRoles on Users.Id = UserRoles.UserId');
  console.log("Existing Users:");
  console.dir(result.recordset);
  process.exit(0);
}
test();
