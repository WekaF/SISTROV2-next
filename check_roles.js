const sql = require('mssql');

const config = {
    user: 'sistro',
    password: 'Si$tr0@Pupuk1!',
    server: '192.168.188.29',
    port: 7869,
    database: 'SISTROPI-v2',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);
        const result = await sql.query('SELECT Id, Code, Name FROM Roles');
        console.log(JSON.stringify(result.recordset, null, 2));
        
        const users = await sql.query('SELECT UserName, Email FROM Users');
        console.log('--- USERS ---');
        console.log(JSON.stringify(users.recordset, null, 2));
        
    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

run();
