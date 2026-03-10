const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432,
});

async function listCheck() {
    try {
        console.log('--- LOCAL HOSPITALS ---');
        const hospitals = await pool.query('SELECT id, name, code FROM hospitals ORDER BY id');
        hospitals.rows.forEach(h => console.log(`[HOSPITAL] ID: ${h.id} | Name: ${h.name} | Code: ${h.code}`));

        console.log('\n--- LOCAL USERS ---');
        const users = await pool.query(`
            SELECT u.id, u.username, u.role, u.password, h.name as hospital_name 
            FROM users u 
            LEFT JOIN hospitals h ON u.hospital_id = h.id 
            ORDER BY u.hospital_id, u.username
        `);
        
        users.rows.forEach(u => {
             // Show first few chars of hash to prove it exists
             const pw = u.password ? u.password.substring(0, 10) + '...' : 'NO PASSWORD';
             console.log(`[USER] ${u.username.padEnd(20)} | Role: ${u.role.padEnd(15)} | Hospital: ${u.hospital_name || 'None'} | PW: ${pw}`);
        });

        console.log('\nTotal Users:', users.rows.length);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

listCheck();
