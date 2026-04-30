const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sistrodev_v3',
  user: 'weka',
  password: ''
});

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Tables:", res.rows.map(r => r.table_name).join(', '));
    
    const columns = await pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('usercompanies', 'company')");
    console.log("Columns:", columns.rows);
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await pool.end();
  }
}

check();
