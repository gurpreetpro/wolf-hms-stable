const pool = require('./config/db');

const testAdmission = async () => {
    try {
        console.log('Testing Admission...');

        // 1. Get a patient
        const patientRes = await pool.query('SELECT id FROM patients LIMIT 1');
        if (patientRes.rows.length === 0) {
            console.log('No patients found. Creating one...');
            // Create dummy patient
            const newP = await pool.query("INSERT INTO patients (name, gender, phone) VALUES ('Test Patient', 'Male', '9999999999') RETURNING id");
            patientRes.rows.push(newP.rows[0]);
        }
        const patientId = patientRes.rows[0].id;

        // 2. Get a ward and bed
        const wardRes = await pool.query('SELECT name FROM wards LIMIT 1');
        const wardName = wardRes.rows[0].name;

        // Find an available bed in this ward
        const bedRes = await pool.query("SELECT bed_number FROM beds WHERE ward_id = (SELECT id FROM wards WHERE name = $1) AND status = 'Available' LIMIT 1", [wardName]);

        if (bedRes.rows.length === 0) {
            console.log('No available beds found. Resetting a bed...');
            await pool.query("UPDATE beds SET status = 'Available' WHERE ward_id = (SELECT id FROM wards WHERE name = $1) LIMIT 1", [wardName]);
            // Retry
            const bedRes2 = await pool.query("SELECT bed_number FROM beds WHERE ward_id = (SELECT id FROM wards WHERE name = $1) AND status = 'Available' LIMIT 1", [wardName]);
            if (bedRes2.rows.length === 0) throw new Error("Still no beds");
            bedRes.rows.push(bedRes2.rows[0]);
        }
        const bedNumber = bedRes.rows[0].bed_number;

        console.log(`Admitting Patient ${patientId} to ${wardName} - ${bedNumber}`);

        // 3. Run Admission Logic (Copied from Controller)
        // Check if bed is already occupied
        const bedCheck = await pool.query(
            "SELECT * FROM admissions WHERE ward = $1 AND bed_number = $2 AND status = 'Admitted'",
            [wardName, bedNumber]
        );
        if (bedCheck.rows.length > 0) {
            throw new Error('Bed is already occupied (Simulation Check)');
        }

        const result = await pool.query(
            'INSERT INTO admissions (patient_id, ward, bed_number, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [patientId, wardName, bedNumber, 'Admitted']
        );

        console.log('Admission Inserted:', result.rows[0].id);

        // Log Bed History
        console.log('Inserting Bed History...');
        await pool.query(
            'INSERT INTO bed_history (admission_id, ward, bed_number, action) VALUES ($1, $2, $3, $4)',
            [result.rows[0].id, wardName, bedNumber, 'Admitted']
        );
        console.log('Bed History Inserted.');

        // UPDATE BED STATUS TO OCCUPIED
        console.log('Updating Bed Status...');
        await pool.query(
            "UPDATE beds SET status = 'Occupied' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name = $2)",
            [bedNumber, wardName]
        );
        console.log('Bed Status Updated.');

        console.log('✅ Admission Test Successful!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Admission Test Failed:', err);
        process.exit(1);
    }
};

testAdmission();
