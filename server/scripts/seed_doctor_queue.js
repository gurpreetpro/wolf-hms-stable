const pool = require('../config/db');

async function seed() {
    try {
        console.log('🌱 Seeding Doctor Queue & Specialists...');

        // 1. Get or Create 'doctor_user'
        let doctorRes = await pool.query("SELECT id, password FROM users WHERE username = 'doctor_user'");
        let doctorId, passwordHash;

        if (doctorRes.rows.length === 0) {
            console.log('...Creating doctor_user');
            // detailed default hash (bcrypt for 'password')
            passwordHash = '$2b$10$EixZAYVK1F6I7.1.P./Y..'; 
            const insertRes = await pool.query(`
                INSERT INTO users (username, password, role, department, email, hospital_id)
                VALUES ('doctor_user', $1, 'doctor', 'General Medicine', 'doc@test.com', 1)
                RETURNING id
            `, [passwordHash]);
            doctorId = insertRes.rows[0].id;
        } else {
            doctorId = doctorRes.rows[0].id;
            passwordHash = doctorRes.rows[0].password;
            console.log(`...Found doctor_user (ID: ${doctorId})`);
        }

        // Fix Sequence just in case
        await pool.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");

        // 2. Create Specialist Doctors (for Referral Dropdown)
        const specialists = [
            { name: 'Dr. Cardio', dept: 'Cardiology' },
            { name: 'Dr. Ortho', dept: 'Orthopedics' },
            { name: 'Dr. Neuro', dept: 'Neurology' }
        ];

        for (const spec of specialists) {
            try {
                 await pool.query(`
                    INSERT INTO users (username, password, role, department, email, hospital_id)
                    VALUES ($1, $2, 'doctor', $3, $4, 1)
                    ON CONFLICT (username) DO NOTHING
                `, [spec.name, passwordHash, spec.dept, spec.name.replace(/\s/g, '').toLowerCase() + '@hospital.com']);
                console.log(`...Ensured specialist: ${spec.name}`);
            } catch (e) {
                console.log(`...Skipping specialist ${spec.name} (exists or error)`);
            }
        }

        // 3. Create Patients & Add to Queue
        const patients = [
            { name: 'Ravi Kumar', intent: 'Chest Pain' },
            { name: 'Anita Singh', intent: 'Fever 3 days' },
            { name: 'John Doe', intent: 'Knee Pain' }
        ];

        for (const p of patients) {
            // Create Patient
            const patRes = await pool.query(`
                INSERT INTO patients (name, dob, gender, phone, address, uhid, hospital_id)
                VALUES ($1, '1985-05-15', 'M', '9876598765', 'Model Town', 'UHID' || floor(random() * 100000), 1)
                RETURNING id
            `, [p.name]);
            const patId = patRes.rows[0].id;

            // Add to OPD Visits (Queue)
            // Use opd_visits, timestamp defaults or use CURRENT_DATE
            await pool.query(`
                INSERT INTO opd_visits (patient_id, doctor_id, token_number, status, hospital_id, visit_date)
                VALUES ($1, $2, floor(random() * 100) + 1, 'Waiting', 1, CURRENT_DATE)
            `, [patId, doctorId]);
             console.log(`...Added ${p.name} to Queue`);
        }

        console.log('✅ Seeding Complete. Refresh Doctor Dashboard.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

seed();
