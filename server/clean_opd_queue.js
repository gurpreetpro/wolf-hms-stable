const pool = require('./config/db');

async function fixState() {
    try {
        console.log('Cleaning up tables from migration 034...');
        
        const tables = [
            'opd_queue',
            'claim_scrub_results', 'claim_scrub_rules',
            'collections_worklist',
            'instrument_logs', 'instrument_drivers', 'lab_instruments',
            'pharmacy_refunds', 'controlled_substance_log',
            'radiology_orders',
            'lab_qc_results', 'lab_qc_materials',
            'lab_reagents',
            'lab_critical_alerts',
            'lab_payments',
            'clinical_tasks',
            // Migration 035 tables
            'denial_codes', 'lab_result_versions', 'lab_audit_log', 
            'lab_package_items', 'reagent_usage_log'
            // NOT dropping lab_test_categories as it might be a core table.
            // If it exists, 035 has IF NOT EXISTS so it should be fine.  
        ];

        for (const table of tables) {
            await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(`Dropped ${table}`);
        }

        console.log('Resetting migration history...');
        await pool.query("DELETE FROM _migrations WHERE name IN ('034_final_fixes.sql', '035_controller_sync.sql', '036_lab_fixes.sql')");
        console.log('Migration history reset.');

        console.log('Cleanup complete.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

fixState();
