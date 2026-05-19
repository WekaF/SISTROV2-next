const fetch = require('node-fetch');

async function test() {
    // Assuming we don't have token, but maybe we can just query the DB directly to see if any abbrev is null
    const { Client } = require('pg');
    const client = new Client({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/sistro'
    });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM m_shift LIMIT 5");
        console.log(res.rows);
    } catch(e) {
        console.error(e.message);
    } finally {
        client.end();
    }
}
test();
