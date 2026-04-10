import sql from 'mssql';

const sqlConfig: sql.config = {
  // Using connection string from environment
  // e.g. "Data Source=192.168.188.29,7869;Initial Catalog=SISTROPI-v2;User ID=sistro;Password=***"
  // mssql package doesn't cleanly parse standard .NET connection strings easily without parsing manually or using proper objects.
  server: '192.168.188.29',
  port: 7869,
  database: 'SISTROPI-v2',
  user: 'sistro',
  password: 'Si$tr0@Pupuk1!',
  options: {
    encrypt: true,
    trustServerCertificate: true, // Necessary for self-signed certificates in local/dev DBs
  },
};

// Global pool to prevent connection tearing on Next.js hot-reloads
const globalForSql = global as unknown as { sqlPool: Promise<sql.ConnectionPool> | undefined };

export const getDbConnection = async (): Promise<sql.ConnectionPool> => {
  if (!globalForSql.sqlPool) {
    globalForSql.sqlPool = sql.connect(sqlConfig).catch(err => {
      console.error('SQL Connection Error: ', err);
      globalForSql.sqlPool = undefined;
      throw err;
    });
  }
  return globalForSql.sqlPool;
};
