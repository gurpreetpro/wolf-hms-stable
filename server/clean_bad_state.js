const { pool } = require('./db');

async function clean() {
    try {
        console.log('🧹 Cleaning up bad tables...');
        await pool.query('DROP TABLE IF EXISTS patient_insurance CASCADE');
        await pool.query('DROP TABLE IF EXISTS insurance_claims CASCADE');
        await pool.query('DROP TABLE IF EXISTS insurance_preauth CASCADE');
        await pool.query('DROP TABLE IF EXISTS tpa_credentials CASCADE');
        await pool.query('DROP TABLE IF EXISTS tpa_providers CASCADE');
        await pool.query('DROP TABLE IF EXISTS surgeries CASCADE');
        await pool.query('DROP TABLE IF EXISTS theaters CASCADE');
        await pool.query('DROP TABLE IF EXISTS blood_units CASCADE');
        console.log('✅ Tables dropped.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

clean();
