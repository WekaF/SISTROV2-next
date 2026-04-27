/**
 * SISTROPI-v2 → PostgreSQL Migration
 * Mengambil schema & data dari SQL Server lalu apply ke PostgreSQL
 */
import sql from 'mssql';
import pg from 'pg';

const SS_CFG = {
  server: '192.168.188.29', port: 7869,
  database: 'SISTROPI-v2',
  user: 'sistro', password: 'Si$tr0@Pupuk1!',
  options: { encrypt: true, trustServerCertificate: true, requestTimeout: 60000 }
};

const PG_CFG = {
  host: 'localhost', port: 5432,
  database: 'sistrodev_v3',
  user: 'weka', password: ''
};

// Mapping tipe SQL Server → PostgreSQL
function mapType(ssType, maxLen, precision, scale, isNullable) {
  const t = ssType.toLowerCase();
  let pgType;
  if (['bigint'].includes(t))                           pgType = 'BIGINT';
  else if (['int','integer'].includes(t))               pgType = 'INTEGER';
  else if (['smallint','tinyint'].includes(t))          pgType = 'SMALLINT';
  else if (['bit'].includes(t))                         pgType = 'BOOLEAN';
  else if (['float','real'].includes(t))                pgType = 'DOUBLE PRECISION';
  else if (['decimal','numeric','money','smallmoney'].includes(t))
                                                        pgType = `NUMERIC(${precision||18},${scale||0})`;
  else if (['datetime','datetime2','smalldatetime'].includes(t)) pgType = 'TIMESTAMP(3)';
  else if (['date'].includes(t))                        pgType = 'DATE';
  else if (['time'].includes(t))                        pgType = 'TIME';
  else if (['nvarchar','varchar'].includes(t))          pgType = maxLen === -1 ? 'TEXT' : `VARCHAR(${maxLen})`;
  else if (['nchar','char'].includes(t))                pgType = `CHAR(${maxLen})`;
  else if (['ntext','text'].includes(t))                pgType = 'TEXT';
  else if (['uniqueidentifier'].includes(t))            pgType = 'UUID';
  else if (['varbinary','binary','image'].includes(t))  pgType = 'BYTEA';
  else if (['xml'].includes(t))                         pgType = 'TEXT';
  else                                                  pgType = 'TEXT';
  return pgType + (isNullable === 'NO' ? ' NOT NULL' : '');
}

// Escape nilai untuk INSERT
function escVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean')   return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date)        return `'${val.toISOString().replace('T',' ').slice(0,23)}'`;
  if (Buffer.isBuffer(val))       return `'\\x${val.toString('hex')}'`;
  if (typeof val === 'number')    return String(val);
  // string: escape single quotes
  return `'${String(val).replace(/'/g, "''")}'`;
}

const TABLES = [
  'Company','Roles','M_Wilayah','M_Bagian','M_BagianDetail',
  'Regions','Sumbu','M_Fleet','M_Percepatan',
  'Gudang','Gudang_SPPT','GudangMuatMapping','GudangTujuanMapping',
  'MappingProdukGudang','Produk','ProdukMapping',
  'M_Transport','Users','UserRoles','UserCompanies',
  'Kuota1Header','Kuota2Wilayah','Kuota3Bagian','Kuota4Shift',
  'Kuota_Header','Kuota_Wilayah','Kuota_Area','Kuota_Shift',
  'Antrian','Posto','Tiket','TiketLog','LogTriggerPindahGudang'
];

async function run() {
  console.log('🔌 Connecting to SQL Server...');
  const ssPool = await sql.connect(SS_CFG);
  console.log('✓ SQL Server connected');

  const pgPool = new pg.Pool(PG_CFG);
  const pgClient = await pgPool.connect();
  console.log('✓ PostgreSQL connected\n');

  const ddlLines = [];
  const dmlLines = [];

  for (const tbl of TABLES) {
    // ── Schema ────────────────────────────────────────────────
    const colsRes = await ssPool.request().query(`
      SELECT
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.CHARACTER_MAXIMUM_LENGTH,
        c.NUMERIC_PRECISION,
        c.NUMERIC_SCALE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT,
        COLUMNPROPERTY(OBJECT_ID('dbo.${tbl}'), c.COLUMN_NAME, 'IsIdentity') AS is_identity
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = 'dbo' AND c.TABLE_NAME = '${tbl}'
      ORDER BY c.ORDINAL_POSITION
    `);

    const pkRes = await ssPool.request().query(`
      SELECT kcu.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      WHERE tc.TABLE_NAME = '${tbl}' AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      ORDER BY kcu.ORDINAL_POSITION
    `);
    const pkCols = pkRes.recordset.map(r => r.COLUMN_NAME);

    const cols = colsRes.recordset;
    if (!cols.length) { console.log(`  ⚠ ${tbl}: no columns found, skipping`); continue; }

    const pgTbl = tbl.toLowerCase();
    const colDefs = cols.map(c => {
      const colName = c.COLUMN_NAME.toLowerCase();
      let typeDef;
      if (c.is_identity) {
        // identity → serial / bigserial
        const baseType = c.DATA_TYPE.toLowerCase();
        typeDef = (baseType === 'bigint') ? 'BIGSERIAL' : 'SERIAL';
      } else {
        typeDef = mapType(c.DATA_TYPE, c.CHARACTER_MAXIMUM_LENGTH,
                          c.NUMERIC_PRECISION, c.NUMERIC_SCALE, c.IS_NULLABLE);
      }
      return `    ${colName} ${typeDef}`;
    });

    let ddl = `DROP TABLE IF EXISTS public.${pgTbl} CASCADE;\n`;
    ddl += `CREATE TABLE public.${pgTbl} (\n${colDefs.join(',\n')}`;
    if (pkCols.length) {
      ddl += `,\n    CONSTRAINT pk_${pgTbl} PRIMARY KEY (${pkCols.map(c=>c.toLowerCase()).join(', ')})`;
    }
    ddl += '\n);\n';
    ddlLines.push(ddl);

    // ── Data ──────────────────────────────────────────────────
    const dataRes = await ssPool.request().query(`SELECT * FROM dbo.${tbl} WITH (NOLOCK)`);
    const rows = dataRes.recordset;
    const colNames = cols.map(c => c.COLUMN_NAME.toLowerCase());
    const identityCols = cols.filter(c => c.is_identity).map(c => c.COLUMN_NAME.toLowerCase());

    if (rows.length > 0) {
      // filter out identity cols from INSERT (pg SERIAL handles auto)
      const insertCols = colNames.filter(c => !identityCols.includes(c));
      const insertColsStr = insertCols.map(c => `"${c}"`).join(', ');

      let dml = '';
      if (identityCols.length > 0) {
        dml += `-- Reset sequence setelah bulk insert\n`;
      }

      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const values = chunk.map(row =>
          '(' + insertCols.map(c => escVal(row[cols.find(cc => cc.COLUMN_NAME.toLowerCase() === c).COLUMN_NAME])).join(', ') + ')'
        );
        dml += `INSERT INTO public.${pgTbl} (${insertColsStr}) VALUES\n${values.join(',\n')};\n`;
      }

      // reset sequences jika ada identity col
      if (identityCols.length > 0) {
        for (const ic of identityCols) {
          dml += `SELECT setval(pg_get_serial_sequence('public.${pgTbl}', '${ic}'), COALESCE(MAX("${ic}"), 1)) FROM public.${pgTbl};\n`;
        }
      }
      dmlLines.push(dml);
    }

    console.log(`  ✓ ${tbl.padEnd(30)} ${cols.length} cols, ${rows.length} rows`);
  }

  // ── Apply ke PostgreSQL ──────────────────────────────────────
  console.log('\n📥 Applying schema to PostgreSQL...');
  await pgClient.query('BEGIN');
  try {
    for (const ddl of ddlLines) {
      await pgClient.query(ddl);
    }
    console.log('✓ Tables created');

    console.log('📥 Inserting data...');
    for (const dml of dmlLines) {
      await pgClient.query(dml);
    }
    console.log('✓ Data inserted');

    await pgClient.query('COMMIT');
    console.log('\n✅ Migration selesai!');
  } catch (err) {
    await pgClient.query('ROLLBACK');
    console.error('\n❌ Migration gagal, ROLLBACK:', err.message);
    // Print first 500 chars of failing query for debug
    console.error(err.query ? err.query.slice(0, 500) : '');
    throw err;
  } finally {
    pgClient.release();
    await pgPool.end();
    await ssPool.close();
  }
}

run().catch(e => { console.error(e.message); process.exit(1); });
