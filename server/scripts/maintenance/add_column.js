const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432
});

async function addColumn() {
    try {
        await pool.query(`
            ALTER TABLE lab_requests 
            ADD COLUMN IF NOT EXISTS test_name VARCHAR(255)
        `);
        console.log('✅ Added test_name column to lab_requests');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addColumn();
