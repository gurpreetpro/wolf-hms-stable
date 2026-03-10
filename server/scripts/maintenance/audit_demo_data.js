const pool = require('./config/db');

async function auditDemoData() {
    console.log('\n=== DEMO DATA AUDIT ===\n');

    try {
        // Lab Tests
        const labTests = await pool.query('SELECT COUNT(*) as c FROM lab_test_types');
        console.log(`1. Lab Test Types: ${labTests.rows[0].c}`);
        if (parseInt(labTests.rows[0].c) < 10) console.log('   ❌ MISSING: Need to seed lab tests!');
        else console.log('   ✅ OK');

        // Medications
        try {
            const meds = await pool.query('SELECT COUNT(*) as c FROM medications');
            console.log(`2. Medications: ${meds.rows[0].c}`);
            if (parseInt(meds.rows[0].c) < 10) console.log('   ❌ MISSING: Need to seed medications!');
            else console.log('   ✅ OK');
        } catch (e) {
            console.log('2. Medications: TABLE MISSING!');
            console.log('   ❌ CRITICAL: medications table does not exist!');
        }

        // Wards
        const wards = await pool.query('SELECT COUNT(*) as c FROM wards');
        console.log(`3. Wards: ${wards.rows[0].c}`);
        if (parseInt(wards.rows[0].c) < 3) console.log('   ❌ MISSING: Need to seed wards!');
        else console.log('   ✅ OK');

        // Users
        const users = await pool.query('SELECT COUNT(*) as c FROM users');
        console.log(`4. Users: ${users.rows[0].c}`);

        // Check for each role
        const roles = ['admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist'];
        for (const role of roles) {
            const roleCount = await pool.query('SELECT COUNT(*) as c FROM users WHERE role = $1', [role]);
            console.log(`   - ${role}: ${roleCount.rows[0].c}`);
        }

        // Patients
        const patients = await pool.query('SELECT COUNT(*) as c FROM patients');
        console.log(`5. Patients: ${patients.rows[0].c}`);

        // Radiology Types
        try {
            const radTypes = await pool.query('SELECT COUNT(*) as c FROM radiology_test_types');
            console.log(`6. Radiology Test Types: ${radTypes.rows[0].c}`);
            if (parseInt(radTypes.rows[0].c) < 5) console.log('   ❌ MISSING: Need radiology test types!');
            else console.log('   ✅ OK');
        } catch (e) {
            console.log('6. Radiology Test Types: TABLE/DATA MISSING');
        }

        // Beds
        const beds = await pool.query('SELECT COUNT(*) as c FROM beds');
        console.log(`7. Beds: ${beds.rows[0].c}`);
        if (parseInt(beds.rows[0].c) < 5) console.log('   ❌ MISSING: Need to seed beds!');
        else console.log('   ✅ OK');

        // Available beds
        const availBeds = await pool.query("SELECT COUNT(*) as c FROM beds WHERE status = 'Available'");
        console.log(`   - Available: ${availBeds.rows[0].c}`);

        console.log('\n=== END AUDIT ===\n');

    } catch (e) {
        console.error('Audit error:', e.message);
    }

    process.exit(0);
}

auditDemoData();
