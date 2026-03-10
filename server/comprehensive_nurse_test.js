// Comprehensive test of nurse API endpoints via HTTP
const http = require('http');
const pool = require('./config/db');

async function testNurseAPI() {
    console.log('='.repeat(60));
    console.log('COMPREHENSIVE NURSE API TEST');
    console.log('='.repeat(60));

    try {
        // 1. First get a valid token by finding a nurse user
        console.log('\n1. Getting authentication token...');
        const users = await pool.query(`SELECT id, username, role FROM users WHERE role IN ('nurse', 'ward_incharge', 'admin') LIMIT 1`);
        if (users.rows.length === 0) {
            console.log('   ✗ No nurse/admin user found!');
            return;
        }
        console.log(`   Found user: ${users.rows[0].username} (${users.rows[0].role})`);

        // 2. Get a valid admitted patient
        console.log('\n2. Getting admitted patient...');
        const admissions = await pool.query(`
            SELECT 
                a.id AS admission_id, 
                a.patient_id, 
                p.name AS patient_name,
                a.ward,
                a.bed_number,
                a.status
            FROM admissions a 
            JOIN patients p ON a.patient_id = p.id 
            WHERE a.status = 'Admitted' 
            LIMIT 1
        `);

        if (admissions.rows.length === 0) {
            console.log('   ✗ No admitted patients found! This might be the issue.');
            return;
        }

        const admission = admissions.rows[0];
        console.log(`   admission_id: ${admission.admission_id}`);
        console.log(`   patient_id: ${admission.patient_id}`);
        console.log(`   patient_name: ${admission.patient_name}`);
        console.log(`   ward: ${admission.ward}, bed: ${admission.bed_number}`);

        // 3. Check if patient_id is valid UUID
        console.log('\n3. Validating patient_id format...');
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(admission.patient_id)) {
            console.log(`   ✓ patient_id is valid UUID`);
        } else {
            console.log(`   ✗ patient_id is NOT valid UUID: ${admission.patient_id}`);
        }

        // 4. Test each query the NursePatientProfile makes
        console.log('\n4. Testing individual queries...\n');

        const queries = [
            {
                name: 'Care Plan',
                query: 'SELECT * FROM nursing_care_plans WHERE admission_id = $1 ORDER BY updated_at DESC LIMIT 1',
                params: [admission.admission_id]
            },
            {
                name: 'Pain Scores',
                query: 'SELECT * FROM pain_scores WHERE admission_id = $1 ORDER BY recorded_at DESC LIMIT 10',
                params: [admission.admission_id]
            },
            {
                name: 'Fluid Balance',
                query: `SELECT * FROM fluid_balance WHERE admission_id = $1 AND recorded_at > NOW() - INTERVAL '24 hours' ORDER BY recorded_at DESC`,
                params: [admission.admission_id]
            },
            {
                name: 'IV Lines',
                query: 'SELECT * FROM iv_lines WHERE admission_id = $1 ORDER BY inserted_at DESC',
                params: [admission.admission_id]
            },
            {
                name: 'Care Tasks',
                query: 'SELECT * FROM care_tasks WHERE admission_id = $1 ORDER BY scheduled_time ASC',
                params: [admission.admission_id]
            },
            {
                name: 'Vitals (by patient)',
                query: `SELECT * FROM vitals_logs WHERE admission_id IN (SELECT id FROM admissions WHERE patient_id = $1) ORDER BY created_at DESC LIMIT 10`,
                params: [admission.patient_id]
            },
            {
                name: 'Lab Results',
                query: `SELECT lr.id, lr.test_type_id, t.name as test_name, lr.status, lr.requested_at, lr.updated_at, res.result_json 
                        FROM lab_requests lr 
                        JOIN lab_test_types t ON lr.test_type_id = t.id 
                        LEFT JOIN lab_results res ON lr.id = res.request_id 
                        WHERE lr.patient_id = $1 
                        ORDER BY lr.requested_at DESC`,
                params: [admission.patient_id]
            }
        ];

        for (const q of queries) {
            try {
                const result = await pool.query(q.query, q.params);
                console.log(`   ✓ ${q.name}: ${result.rows.length} rows`);
            } catch (e) {
                console.log(`   ✗ ${q.name}: ERROR - ${e.message}`);
            }
        }

        // 5. Check if there are any column schema issues
        console.log('\n5. Checking for potential schema issues...');

        const tableChecks = [
            { table: 'nursing_care_plans', requiredCols: ['admission_id', 'patient_id', 'diagnosis', 'goal', 'interventions', 'updated_at'] },
            { table: 'pain_scores', requiredCols: ['admission_id', 'score', 'location', 'recorded_at'] },
            { table: 'fluid_balance', requiredCols: ['admission_id', 'type', 'subtype', 'volume_ml', 'recorded_at'] },
            { table: 'iv_lines', requiredCols: ['admission_id', 'site', 'gauge', 'status', 'inserted_at'] },
            { table: 'care_tasks', requiredCols: ['admission_id', 'type', 'description', 'status', 'scheduled_time'] },
            { table: 'vitals_logs', requiredCols: ['admission_id', 'bp', 'heart_rate', 'temp', 'spo2', 'created_at'] }
        ];

        for (const tc of tableChecks) {
            const cols = await pool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = $1
            `, [tc.table]);

            const existingCols = cols.rows.map(c => c.column_name);
            const missingCols = tc.requiredCols.filter(c => !existingCols.includes(c));

            if (missingCols.length === 0) {
                console.log(`   ✓ ${tc.table}: All required columns exist`);
            } else {
                console.log(`   ✗ ${tc.table}: Missing columns: ${missingCols.join(', ')}`);
            }
        }

        // 6. Check admission_id data type consistency
        console.log('\n6. Checking admission_id data types across tables...');
        const admissionIdTypes = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE column_name = 'admission_id' 
            AND table_schema = 'public'
            ORDER BY table_name
        `);

        admissionIdTypes.rows.forEach(r => {
            console.log(`   ${r.table_name}.admission_id: ${r.data_type}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('TEST COMPLETE');
        console.log('='.repeat(60));

    } catch (e) {
        console.error('Global Error:', e.message);
        console.error(e.stack);
    }

    process.exit(0);
}

testNurseAPI();
