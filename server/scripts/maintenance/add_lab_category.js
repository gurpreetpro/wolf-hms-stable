const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432
});

async function addCategoryColumn() {
    try {
        await pool.query(`
            ALTER TABLE lab_test_types 
            ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General'
        `);
        console.log('✅ Added category column to lab_test_types');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addCategoryColumn();
