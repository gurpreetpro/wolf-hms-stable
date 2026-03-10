const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db_test',
    password: 'Hospital456!',
    port: 5434, // Test Proxy Port
});

async function resetDb() {
    try {
        console.log('⚠️ DROPPING PUBLIC SCHEMA on hospital_db_test...');
        await pool.query('DROP SCHEMA public CASCADE');
        await pool.query('CREATE SCHEMA public');
        await pool.query('GRANT ALL ON SCHEMA public TO postgres');
        await pool.query('GRANT ALL ON SCHEMA public TO public');
        console.log('✅ Schema reset complete. DB is clean.');
    } catch (err) {
        console.error('❌ Reset failed:', err.message);
    } finally {
        await pool.end();
    }
}

resetDb();
