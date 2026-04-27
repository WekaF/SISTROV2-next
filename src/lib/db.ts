import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const globalForPg = global as unknown as { pgPool: Pool | undefined };

function createPool(): Pool {
  return new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE || 'sistrodev_v3',
    user: process.env.PGUSER || 'weka',
    password: process.env.PGPASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export const getPool = (): Pool => {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = createPool();
    globalForPg.pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
      globalForPg.pgPool = undefined;
    });
  }
  return globalForPg.pgPool;
};

export const getDbConnection = async (): Promise<PoolClient> => {
  return getPool().connect();
};

export const query = async <T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const pool = getPool();
  return pool.query<T>(text, params);
};
