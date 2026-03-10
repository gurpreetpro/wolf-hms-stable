// Test the nurse API endpoints directly
const pool = require('./config/db');

async function testNurseQueries() {
    console.log('Testing Nurse API Queries...\n');

    try {
        // Get a sample admission
        const admissions = await pool.query(`
            SELECT a.id AS admission_id, a.patient_id, p.name 
            FROM admissions a 
            JOIN patients p ON a.patient_id = p.id 
            WHERE a.status = 'Admitted' 
            LIMIT 1
        `);

        if (admissions.rows.length === 0) {
            console.log('ERROR: No admitted patients found!');
            process.exit(1);
        }

        const { admission_id, patient_id, name } = admissions.rows[0];
        console.log(`Testing with patient: ${name} (admission_id: ${admission_id})\n`);

        // Test each query that the NursePatientProfile uses

        // 1. Care Plan
        console.log('1. Care Plan query...');
        try {
            const cp = await pool.query('SELECT * FROM nursing_care_plans WHERE admission_id = $1 ORDER BY updated_at DESC LIMIT 1', [admission_id]);
            console.log(`   ✓ Success - ${cp.rows.length} rows`);
        } catch (e) {
            console.log(`   ✗ ERROR: ${e.message}`);
        }

        // 2. Pain Scores
        console.log('2. Pain Scores query...');
        try {
            const ps = await pool.query('SELECT * FROM pain_scores WHERE admission_id = $1 ORDER BY recorded_at DESC LIMIT 10', [admission_id]);
            console.log(`   ✓ Success - ${ps.rows.length} rows`);
        } catch (e) {
            console.log(`   ✗ ERROR: ${e.message}`);
        }

        // 3. Fluid Balance
        console.log('3. Fluid Balance query...');
        try {
            const fb = await pool.query(`SELECT * FROM fluid_balance WHERE admission_id = $1 AND recorded_at > NOW() - INTERVAL '24 hours' ORDER BY recorded_at DESC`, [admission_id]);
            console.log(`   ✓ Success - ${fb.rows.length} rows`);
        } catch (e) {
            console.log(`   ✗ ERROR: ${e.message}`);
        }

        // 4. IV Lines
        console.log('4. IV Lines query...');
        try {
            const iv = await pool.query('SELECT * FROM iv_lines WHERE admission_id = $1 ORDER BY inserted_at DESC', [admission_id]);
            console.log(`   ✓ Success - ${iv.rows.length} rows`);
        } catch (e) {
            console.log(`   ✗ ERROR: ${e.message}`);
        }

        // 5. Care Tasks  
        console.log('5. Care Tasks query...');
        try {
            const ct = await pool.query('SELECT * FROM care_tasks WHERE admission_id = $1 ORDER BY scheduled_time ASC', [admission_id]);
            console.log(`   ✓ Success - ${ct.rows.length} rows`);
        } catch (e) {
            console.log(`   ✗ ERROR: ${e.message}`);
        }

        // 6. Vitals by Patient
        console.log('6. Vitals by Patient query...');
        try {
            const v = await pool.query(`SELECT * FROM vitals_logs WHERE admission_id IN (SELECT id FROM admissions WHERE patient_id = $1) ORDER BY created_at DESC LIMIT 10`, [patient_id]);
            console.log(`   ✓ Success - ${v.rows.length} rows`);
        } catch (e) {
            console.log(`   ✗ ERROR: ${e.message}`);
        }

        // 7. Lab Results
        console.log('7. Lab Results by Patient query...');
        try {
            const lr = await pool.query(`SELECT lr.id, lr.test_type_id, t.name as test_name, lr.status, lr.requested_at, lr.updated_at, res.result_json FROM lab_requests lr JOIN lab_test_types t ON lr.test_type_id = t.id LEFT JOIN lab_results res ON lr.id = res.request_id WHERE lr.patient_id = $1 ORDER BY lr.requested_at DESC`, [patient_id]);
            console.log(`   ✓ Success - ${lr.rows.length} rows`);
        } catch (e) {
            console.log(`   ✗ ERROR: ${e.message}`);
        }

        console.log('\n✅ All queries passed!');

    } catch (e) {
        console.error('Global error:', e.message);
    }

    process.exit(0);
}

testNurseQueries();
