// Quick script to retrieve users from the PROD database
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'hospital_db',
    user: 'postgres',
    password: 'Hospital456!'
});

async function getUsers() {
    try {
        console.log('Connecting to PROD database...');
        
        const result = await pool.query(`
            SELECT id, username, name, role, email, is_active
            FROM users 
            ORDER BY id
            LIMIT 25
        `);
        
        console.log('\n=== Users ===');
        console.table(result.rows);
        
        // Get admin users specifically
        const admins = await pool.query(`
            SELECT username, name, role
            FROM users 
            WHERE role = 'admin'
        `);
        
        console.log('\n=== Admin Users ===');
        console.table(admins.rows);
        
    } catch (err) {
        console.error('Database error:', err.message);
    } finally {
        await pool.end();
    }
}

getUsers();
