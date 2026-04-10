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
        console.log('Connected to database.');

        // 1. Ensure Roles table aligns with Mapping
        console.log('Aligning Roles table...');
        const roles = [
            { id: 1, code: 'superadmin', name: 'Super Admin' },
            { id: 2, code: 'admin', name: 'Administrator' },
            { id: 3, code: 'pod', name: 'POD / Pusat Operasional' },
            { id: 4, code: 'security', name: 'Security' },
            { id: 5, code: 'jembatan_timbang', name: 'Timbangan' },
            { id: 6, code: 'gudang', name: 'Admin Gudang' },
            { id: 7, code: 'rekanan', name: 'Rekanan / Transportir' }
        ];

        for (const role of roles) {
            await sql.query(`
                IF EXISTS (SELECT 1 FROM Roles WHERE Id = ${role.id})
                BEGIN
                    UPDATE Roles SET Code = '${role.code}', Name = '${role.name}' WHERE Id = ${role.id}
                END
                ELSE
                BEGIN
                    SET IDENTITY_INSERT Roles ON;
                    INSERT INTO Roles (Id, Code, Name) VALUES (${role.id}, '${role.code}', '${role.name}');
                    SET IDENTITY_INSERT Roles OFF;
                END
            `);
        }

        // 2. Clear existing UserRoles for specific users to ensure clean assignment
        const usersToMap = [
            'superadmin', 'admin', '2156225', '91010257', 
            'security_pkg_1', 'timbang_pkg_1', 'gudang_pkg_1', 'SISTRO_DEV'
        ];

        console.log('Mapping users to roles...');
        const mappings = [
            { user: 'superadmin', roleId: 1 },
            { user: 'admin', roleId: 2 },
            { user: '2156225', roleId: 3 },
            { user: '91010257', roleId: 3 },
            { user: 'security_pkg_1', roleId: 4 },
            { user: 'timbang_pkg_1', roleId: 5 },
            { user: 'gudang_pkg_1', roleId: 6 },
            { user: 'SISTRO_DEV', roleId: 7 }
        ];

        for (const m of mappings) {
            await sql.query(`
                DECLARE @UserId UNIQUEIDENTIFIER;
                SELECT @UserId = Id FROM Users WHERE UserName = '${m.user}';
                
                IF @UserId IS NOT NULL
                BEGIN
                    DELETE FROM UserRoles WHERE UserId = @UserId;
                    INSERT INTO UserRoles (UserId, RoleId) VALUES (@UserId, ${m.roleId});
                    PRINT 'Mapped ${m.user} to Role ${m.roleId}';
                END
                ELSE
                BEGIN
                    PRINT 'User ${m.user} not found';
                END
            `);
        }

        console.log('Role alignment complete.');

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

run();
