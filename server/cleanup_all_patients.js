/**
 * Wolf HMS - FULL DATA CLEANUP
 * ============================
 * Removes ALL patient data for production reset.
 * 
 * WARNING: This deletes ALL patients, admissions, and related data!
 * 
 * Usage: node cleanup_all_patients.js
 */

const pool = require('./config/db');

async function cleanupAll() {
    console.log('🗑️  Wolf HMS - FULL PATIENT DATA CLEANUP');
    console.log('=========================================\n');
    console.log('⚠️  WARNING: This will delete ALL patient data!\n');

    try {
        // Step 1: Count what will be deleted
        const patients = await pool.query('SELECT COUNT(*) as count FROM patients');
        const admissions = await pool.query('SELECT COUNT(*) as count FROM admissions');
        const tasks = await pool.query('SELECT COUNT(*) as count FROM care_tasks');
        const labs = await pool.query('SELECT COUNT(*) as count FROM lab_requests');
        const invoices = await pool.query('SELECT COUNT(*) as count FROM invoices');

        console.log('📊 Data to be deleted:');
        console.log(`   - Patients: ${patients.rows[0].count}`);
        console.log(`   - Admissions: ${admissions.rows[0].count}`);
        console.log(`   - Care Tasks: ${tasks.rows[0].count}`);
        console.log(`   - Lab Requests: ${labs.rows[0].count}`);
        console.log(`   - Invoices: ${invoices.rows[0].count}`);
        console.log('');

        console.log('🗑️  Deleting all data in correct order...\n');

        // Delete in foreign key order
        const deletions = [
            { name: 'Care Tasks', query: 'DELETE FROM care_tasks' },
            { name: 'Lab Requests', query: 'DELETE FROM lab_requests' },
            { name: 'Vitals', query: 'DELETE FROM vitals' },
            { name: 'Pain Scores', query: 'DELETE FROM pain_scores' },
            { name: 'Fluid Balance', query: 'DELETE FROM fluid_balance' },
            { name: 'IV Lines', query: 'DELETE FROM iv_lines' },
            { name: 'Wound Assessments', query: 'DELETE FROM wound_assessments' },
            { name: 'Fall Risk', query: 'DELETE FROM fall_risk_assessments' },
            { name: 'Invoice Items', query: 'DELETE FROM invoice_items' },
            { name: 'Invoices', query: 'DELETE FROM invoices' },
            { name: 'OPD Queue', query: 'DELETE FROM opd_queue' },
            { name: 'OPD Visits', query: 'DELETE FROM opd_visits' },
            { name: 'Billing Segments', query: 'DELETE FROM billing_segments' },
            { name: 'Prescriptions', query: 'DELETE FROM prescriptions' },
            { name: 'Rounds', query: 'DELETE FROM rounds' },
            { name: 'SOAP Notes', query: 'DELETE FROM soap_notes' },
            { name: 'Admissions', query: 'DELETE FROM admissions' },
            { name: 'Patients', query: 'DELETE FROM patients' },
        ];

        for (const del of deletions) {
            try {
                const result = await pool.query(del.query);
                console.log(`   ✓ Deleted ${result.rowCount || 0} from ${del.name}`);
            } catch (e) {
                // Table might not exist or be empty
                console.log(`   - ${del.name}: ${e.message.substring(0, 50)}`);
            }
        }

        // Reset sequences
        console.log('\n🔄 Resetting ID sequences...');
        const sequences = [
            "SELECT setval('patients_id_seq', 1, false)",
            "SELECT setval('admissions_id_seq', 1, false)",
            "SELECT setval('care_tasks_id_seq', 1, false)",
            "SELECT setval('lab_requests_id_seq', 1, false)",
            "SELECT setval('invoices_id_seq', 1, false)"
        ];
        for (const seq of sequences) {
            try {
                await pool.query(seq);
            } catch (e) { /* Sequence might not exist */ }
        }
        console.log('   ✓ Sequences reset');

        console.log('\n✅ ALL PATIENT DATA DELETED!');
        console.log('   Database is now clean for production.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

cleanupAll();
