/**
 * mssql-client.ts
 * Koneksi ke SQL Server (SISTROSTAGING / database ASP.NET)
 * Dibaca dari env variable: MSSQL_CONNECTION_STRING atau komponen terpisah.
 */

import sql from "mssql";

const connectionString =
  process.env.MSSQL_CONNECTION_STRING ||
  `Server=${process.env.MSSQL_HOST || "192.168.188.29,7869"},${process.env.MSSQL_PORT || ""};Database=${process.env.MSSQL_DB || "SISTROSTAGING"};User Id=${process.env.MSSQL_USER || "usr_sistro_dev"};Password=${process.env.MSSQL_PASS || ""};TrustServerCertificate=true;Encrypt=false;`;

const config: sql.config = {
  server: process.env.MSSQL_HOST || "192.168.188.29",
  port: parseInt(process.env.MSSQL_PORT || "7869"),
  database: process.env.MSSQL_DB || "SISTROSTAGING",
  user: process.env.MSSQL_USER || "usr_sistro_dev",
  password: process.env.MSSQL_PASS || "Si$tr0@Pupuk1!_d3v",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 15000,
  connectionTimeout: 15000,
};

// Singleton pool — re-used across requests in same process lifecycle
let poolPromise: Promise<sql.ConnectionPool> | null = null;

export async function getSqlPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect();
  }
  return poolPromise;
}

export { sql };
