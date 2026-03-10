const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function cleanDemoPatients() {
    try {
        console.log('🧹 Cleaning Demo Patients...');

        // Delete patients with demo/test names
        const deletePatterns = [
            'Demo %',
            'Test %',
            'Sim User %',
            'racer_%',
            'demo_%',
            'test_%'
        ];

        for (const pattern of deletePatterns) {
            // First delete related records
            await pool.query(`
                DELETE FROM care_tasks WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE $1)
            `, [pattern]);
            await pool.query(`
                DELETE FROM vitals_logs WHERE admission_id IN (SELECT id FROM admissions WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE $1))
            `, [pattern]);
            await pool.query(`
                DELETE FROM bed_history WHERE admission_id IN (SELECT id FROM admissions WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE $1))
            `, [pattern]);
            await pool.query(`
                DELETE FROM lab_requests WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE $1)
            `, [pattern]);
            await pool.query(`
                DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE $1))
            `, [pattern]);
            await pool.query(`
                DELETE FROM invoices WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE $1)
            `, [pattern]);
            await pool.query(`
                DELETE FROM admissions WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE $1)
            `, [pattern]);

            // Finally delete patients
            const result = await pool.query(`DELETE FROM patients WHERE name LIKE $1`, [pattern]);
            if (result.rowCount > 0) {
                console.log(`  Deleted ${result.rowCount} patients matching '${pattern}'`);
            }
        }

        // Reset all beds to Available
        await pool.query("UPDATE beds SET status = 'Available'");
        console.log('✅ All beds reset to Available');

        console.log('✅ Demo patient cleanup complete!');
    } catch (err) {
        console.error('❌ Cleanup error:', err.message);
    } finally {
        pool.end();
    }
}

cleanDemoPatients();
