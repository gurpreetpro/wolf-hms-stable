const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

const cleanup = async () => {
    try {
        console.log('🧹 Cleaning up database...');

        // 1. Discharge all active admissions
        await pool.query("UPDATE admissions SET status = 'Discharged', discharge_date = NOW() WHERE status = 'Admitted'");
        console.log('✅ All active admissions marked as Discharged.');

        // 2. Free all beds
        await pool.query("UPDATE beds SET status = 'Available'");
        console.log('✅ All beds marked as Available.');

        // 3. Clear care tasks (optional, but good for clean slate)
        // await pool.query("DELETE FROM care_tasks"); 

    } catch (err) {
        console.error('❌ Cleanup failed:', err);
    } finally {
        await pool.end();
    }
};

cleanup();
