const pool = require('./config/db');

const testInsert = async () => {
    try {
        console.log('Testing Bed History Insert...');

        // We need a valid admission ID because of FK constraint
        const admRes = await pool.query('SELECT id FROM admissions LIMIT 1');
        let admId = null;
        if (admRes.rows.length > 0) {
            admId = admRes.rows[0].id;
        } else {
            console.log('No admissions found, creating dummy...');
            // Create dummy patient
            const pRes = await pool.query("INSERT INTO patients (name) VALUES ('Dummy') RETURNING id");
            const pId = pRes.rows[0].id;
            const aRes = await pool.query("INSERT INTO admissions (patient_id, ward, bed_number) VALUES ($1, 'Ward A', '101') RETURNING id", [pId]);
            admId = aRes.rows[0].id;
        }

        console.log('Using Admission ID:', admId);

        await pool.query(
            "INSERT INTO bed_history (admission_id, ward, bed_number, action) VALUES ($1, 'Ward A', '101', 'Admitted')",
            [admId]
        );

        console.log('✅ Bed History Insert Successful.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Insert Failed:', err);
        process.exit(1);
    }
};

testInsert();
