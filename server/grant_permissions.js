const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db_test',
    password: 'Hospital456!',
    port: 5434, // Test Proxy Port
});

async function grantPermissions() {
    try {
        console.log('Connecting to hospital_db_test on localhost:5434...');
        
        // Grant usage on schema
        await pool.query("GRANT ALL ON SCHEMA public TO test_guard;");
        console.log('Granted SCHEMA usage.');

        // Grant tables
        await pool.query("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test_guard;");
        console.log('Granted TABLE privileges.');

        // Grant sequences
        await pool.query("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test_guard;");
        console.log('Granted SEQUENCE privileges.');

        console.log('✅ Permissions granted successfully to test_guard.');
    } catch (err) {
        console.error('❌ Error granting permissions:', err);
    } finally {
        await pool.end();
    }
}

grantPermissions();
