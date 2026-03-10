const { pool } = require('../db');

async function setup() {
    try {
        // 1. Get a patient
        const patientRes = await pool.query('SELECT id, name FROM patients LIMIT 1');
        if (patientRes.rows.length === 0) {
            console.error('❌ No patients found. Please seed patients first.');
            return;
        }
        const patient = patientRes.rows[0];

        // 2. Get CBC Text ID
        const testRes = await pool.query("SELECT id FROM lab_test_types WHERE name = 'CBC'");
        let testTypeId;
        if (testRes.rows.length === 0) {
            console.log('Creating CBC test type...');
            const newTest = await pool.query("INSERT INTO lab_test_types (name, price, normal_range) VALUES ('CBC', 500, 'N/A') RETURNING id");
            testTypeId = newTest.rows[0].id;
        } else {
            testTypeId = testRes.rows[0].id;
        }

        // 3. Create Request
        const requestRes = await pool.query(`
            INSERT INTO lab_requests (patient_id, test_type_id, status, doctor_id)
            VALUES ($1, $2, 'Pending', 1)
            RETURNING id
        `, [patient.id, testTypeId]);

        console.log('✅ Created Dummy Lab Request');
        console.log(`🆔 Request ID: ${requestRes.rows[0].id}`);
        console.log(`📄 Barcode to use: ORDER${requestRes.rows[0].id}`);
        console.log(`👤 Patient: ${patient.name} (${patient.id})`);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

setup();
