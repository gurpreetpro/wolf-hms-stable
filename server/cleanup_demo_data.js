/**
 * Wolf HMS - Demo Data Cleanup Script
 * ====================================
 * Removes all test/demo patients and related data created by simulation scripts.
 * 
 * Usage: node cleanup_demo_data.js [--dry-run] [--confirm]
 * 
 * Options:
 *   --dry-run   Preview what would be deleted (no actual deletion)
 *   --confirm   Skip confirmation prompt and execute directly
 */

const pool = require('./config/db');

const DRY_RUN = process.argv.includes('--dry-run');
const AUTO_CONFIRM = process.argv.includes('--confirm');

async function cleanup() {
    console.log('🧹 Wolf HMS - Demo Data Cleanup');
    console.log('================================\n');
    
    if (DRY_RUN) {
        console.log('⚠️  DRY RUN MODE - No data will be deleted\n');
    }

    try {
        // Step 1: Identify Demo/Test Patients
        console.log('📊 Analyzing data...\n');

        // Patients created by simulation (name pattern: Test_*)
        const testPatients = await pool.query(`
            SELECT id, name, phone, created_at 
            FROM patients 
            WHERE name LIKE 'Test_%' OR name LIKE 'Regression_%' OR name LIKE 'Sim_%'
            ORDER BY created_at DESC
        `);

        // Admissions linked to test patients
        const testAdmissions = await pool.query(`
            SELECT a.id, a.patient_id, a.status, p.name 
            FROM admissions a
            JOIN patients p ON a.patient_id = p.id
            WHERE p.name LIKE 'Test_%' OR p.name LIKE 'Regression_%' OR p.name LIKE 'Sim_%'
        `);

        // Care tasks linked to test admissions
        const testTasks = await pool.query(`
            SELECT ct.id, ct.task_type, ct.status
            FROM care_tasks ct
            JOIN admissions a ON ct.admission_id = a.id
            JOIN patients p ON a.patient_id = p.id
            WHERE p.name LIKE 'Test_%' OR p.name LIKE 'Regression_%' OR p.name LIKE 'Sim_%'
        `);

        // Lab requests linked to test patients
        const testLabs = await pool.query(`
            SELECT lr.id, lr.status
            FROM lab_requests lr
            JOIN patients p ON lr.patient_id = p.id
            WHERE p.name LIKE 'Test_%' OR p.name LIKE 'Regression_%' OR p.name LIKE 'Sim_%'
        `);

        console.log('📋 Data to be cleaned:');
        console.log(`   - Test Patients: ${testPatients.rows.length}`);
        console.log(`   - Test Admissions: ${testAdmissions.rows.length}`);
        console.log(`   - Care Tasks: ${testTasks.rows.length}`);
        console.log(`   - Lab Requests: ${testLabs.rows.length}`);
        console.log('');

        if (testPatients.rows.length === 0) {
            console.log('✅ No demo/test data found. Database is clean!');
            process.exit(0);
        }

        // Show sample of what will be deleted
        console.log('📝 Sample patients to delete:');
        testPatients.rows.slice(0, 5).forEach(p => {
            console.log(`   - ${p.name} (ID: ${p.id}, Phone: ${p.phone})`);
        });
        if (testPatients.rows.length > 5) {
            console.log(`   ... and ${testPatients.rows.length - 5} more`);
        }
        console.log('');

        if (DRY_RUN) {
            console.log('🔍 DRY RUN complete. Use without --dry-run to delete.');
            process.exit(0);
        }

        // Confirmation
        if (!AUTO_CONFIRM) {
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise(resolve => {
                rl.question('⚠️  Are you sure you want to delete this data? (yes/no): ', resolve);
            });
            rl.close();

            if (answer.toLowerCase() !== 'yes') {
                console.log('❌ Cleanup cancelled.');
                process.exit(0);
            }
        }

        // Step 2: Delete in correct order (respect foreign keys)
        console.log('\n🗑️  Deleting demo data...\n');

        // Delete care tasks first
        const deletedTasks = await pool.query(`
            DELETE FROM care_tasks 
            WHERE admission_id IN (
                SELECT a.id FROM admissions a
                JOIN patients p ON a.patient_id = p.id
                WHERE p.name LIKE 'Test_%' OR p.name LIKE 'Regression_%' OR p.name LIKE 'Sim_%'
            )
            RETURNING id
        `);
        console.log(`   ✓ Deleted ${deletedTasks.rowCount} care tasks`);

        // Delete lab requests
        const deletedLabs = await pool.query(`
            DELETE FROM lab_requests 
            WHERE patient_id IN (
                SELECT id FROM patients 
                WHERE name LIKE 'Test_%' OR name LIKE 'Regression_%' OR name LIKE 'Sim_%'
            )
            RETURNING id
        `);
        console.log(`   ✓ Deleted ${deletedLabs.rowCount} lab requests`);

        // Delete vitals
        const deletedVitals = await pool.query(`
            DELETE FROM vitals 
            WHERE admission_id IN (
                SELECT a.id FROM admissions a
                JOIN patients p ON a.patient_id = p.id
                WHERE p.name LIKE 'Test_%' OR p.name LIKE 'Regression_%' OR p.name LIKE 'Sim_%'
            )
            RETURNING id
        `);
        console.log(`   ✓ Deleted ${deletedVitals.rowCount} vital records`);

        // Delete invoice items and invoices
        const deletedInvoiceItems = await pool.query(`
            DELETE FROM invoice_items 
            WHERE invoice_id IN (
                SELECT i.id FROM invoices i
                JOIN patients p ON i.patient_id = p.id
                WHERE p.name LIKE 'Test_%' OR p.name LIKE 'Regression_%' OR p.name LIKE 'Sim_%'
            )
            RETURNING id
        `);
        console.log(`   ✓ Deleted ${deletedInvoiceItems.rowCount} invoice items`);

        const deletedInvoices = await pool.query(`
            DELETE FROM invoices 
            WHERE patient_id IN (
                SELECT id FROM patients 
                WHERE name LIKE 'Test_%' OR name LIKE 'Regression_%' OR name LIKE 'Sim_%'
            )
            RETURNING id
        `);
        console.log(`   ✓ Deleted ${deletedInvoices.rowCount} invoices`);

        // Delete nursing records
        const nursingTables = ['pain_scores', 'fluid_balance', 'wound_assessments', 'fall_risk_assessments', 'iv_lines'];
        for (const table of nursingTables) {
            try {
                const deleted = await pool.query(`
                    DELETE FROM ${table} 
                    WHERE admission_id IN (
                        SELECT a.id FROM admissions a
                        JOIN patients p ON a.patient_id = p.id
                        WHERE p.name LIKE 'Test_%' OR p.name LIKE 'Regression_%' OR p.name LIKE 'Sim_%'
                    )
                    RETURNING id
                `);
                console.log(`   ✓ Deleted ${deleted.rowCount} ${table} records`);
            } catch (e) {
                // Table might not exist
            }
        }

        // Delete admissions
        const deletedAdmissions = await pool.query(`
            DELETE FROM admissions 
            WHERE patient_id IN (
                SELECT id FROM patients 
                WHERE name LIKE 'Test_%' OR name LIKE 'Regression_%' OR name LIKE 'Sim_%'
            )
            RETURNING id
        `);
        console.log(`   ✓ Deleted ${deletedAdmissions.rowCount} admissions`);

        // Delete OPD visits
        const deletedVisits = await pool.query(`
            DELETE FROM opd_visits 
            WHERE patient_id IN (
                SELECT id FROM patients 
                WHERE name LIKE 'Test_%' OR name LIKE 'Regression_%' OR name LIKE 'Sim_%'
            )
            RETURNING id
        `);
        console.log(`   ✓ Deleted ${deletedVisits.rowCount} OPD visits`);

        // Finally, delete patients
        const deletedPatients = await pool.query(`
            DELETE FROM patients 
            WHERE name LIKE 'Test_%' OR name LIKE 'Regression_%' OR name LIKE 'Sim_%'
            RETURNING id
        `);
        console.log(`   ✓ Deleted ${deletedPatients.rowCount} patients`);

        console.log('\n✅ Demo data cleanup complete!');
        console.log(`   Total patients removed: ${deletedPatients.rowCount}`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

cleanup();
