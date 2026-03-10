const pool = require('../config/db');

async function seed() {
    try {
        console.log('🌱 Seeding Demo Patient...');
        
        // 1. Create Patient
        const patientRes = await pool.query(`
            INSERT INTO patients (name, dob, gender, phone, address, uhid)
            VALUES ('Paramjit Kaur', '1970-01-01', 'F', '9876543210', 'Test Address', 'D' || floor(random() * 10000))
            RETURNING id, name
        `);
        const patientId = patientRes.rows[0].id;
        console.log(`✅ Patient Created: ${patientRes.rows[0].name} (ID: ${patientId})`);

        // 2. Find Test Type (Hematology/CBC)
        let testTypeRes = await pool.query("SELECT id, name FROM lab_test_types WHERE name ILIKE '%Hem%' OR name ILIKE '%Blood%' OR name ILIKE '%CBC%' LIMIT 1");
        
        let testTypeId;
        if (testTypeRes.rows.length > 0) {
            testTypeId = testTypeRes.rows[0].id;
            console.log(`✅ Found Test Type: ${testTypeRes.rows[0].name} (ID: ${testTypeId})`);
        } else {
            console.log('⚠️ No exact match for Hematology. Creating one...');
            const newTest = await pool.query("INSERT INTO lab_test_types (name, price, category_id, hospital_id) VALUES ('Complete Blood Count', 500, 1, 1) RETURNING id");
            testTypeId = newTest.rows[0].id;
        }

        // 3. Create Lab Request
        // Needs a doctor. We'll pick the first one or NULL if allowed.
        const doctorRes = await pool.query("SELECT id FROM users WHERE role = 'doctor' LIMIT 1");
        const doctorId = doctorRes.rows.length > 0 ? doctorRes.rows[0].id : null;

        const reqRes = await pool.query(`
            INSERT INTO lab_requests (patient_id, test_type_id, doctor_id, hospital_id)
            VALUES ($1, $2, $3, 1)
            RETURNING id
        `, [patientId, testTypeId, doctorId]);

        console.log(`✅ Lab Request Created: ID ${reqRes.rows[0].id}`);
        console.log('✨ You can now see this in the Lab Dashboard Pending Queue.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

seed();
