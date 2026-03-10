const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

const clearData = async () => {
    try {
        console.log('🗑️  Starting Data Deletion...');

        // Truncate tables with CASCADE to remove dependent data
        // We preserve: users, lab_test_types, inventory_items
        const query = `
            TRUNCATE TABLE 
                invoice_items,
                invoices,
                emergency_logs,
                lab_results,
                lab_requests,
                vitals_logs,
                bed_history,
                care_tasks,
                opd_visits,
                admissions,
                patients
            RESTART IDENTITY CASCADE;
        `;

        console.log('Executing TRUNCATE command...');
        await pool.query(query);

        // Reset bed status to Available since admissions are gone
        console.log('Resetting bed statuses...');
        // Note: bed_history is gone, but we might need to update a 'beds' table if it exists?
        // Checking schema... admissions table has ward/bed_number but there isn't a separate 'beds' table in the migration script I saw?
        // Wait, cleanup_db.js had: await pool.query("UPDATE beds SET status = 'Available'");
        // Let me check if 'beds' table exists. The migration script didn't show a 'beds' table, only 'bed_history'.
        // Ah, maybe 'beds' was in an earlier schema or I missed it.
        // Let's check if 'beds' table exists safely.

        const bedsTableCheck = await pool.query("SELECT to_regclass('public.beds')");
        if (bedsTableCheck.rows[0].to_regclass) {
            await pool.query("UPDATE beds SET status = 'Available'");
            console.log('✅ Beds marked as Available.');
        } else {
            console.log('ℹ️  No separate beds table found (beds might be managed dynamically or in admissions).');
        }

        console.log('✅ Mock data deleted successfully!');
        console.log('   - Patients, Admissions, Visits cleared');
        console.log('   - Clinical & Lab data cleared');
        console.log('   - Billing & Emergency logs cleared');
        console.log('   - Users & Catalogs preserved');

    } catch (err) {
        console.error('❌ Error deleting data:', err);
    } finally {
        await pool.end();
    }
};

clearData();
