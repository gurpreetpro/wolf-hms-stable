/**
 * Seed Lab Demo Data for Lab Technician Practice
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function seedLabData() {
    try {
        console.log('🔬 Seeding Lab Demo Data...\n');

        // Get existing patients
        const patients = await pool.query('SELECT id, name FROM patients LIMIT 5');
        console.log(`Found ${patients.rows.length} patients\n`);

        if (patients.rows.length === 0) {
            console.log('❌ No patients found! Please create patients first.');
            return;
        }

        // Lab tests to create
        const tests = [
            'Complete Blood Count (CBC)',
            'Blood Sugar Fasting',
            'Liver Function Test (LFT)',
            'Kidney Function Test (RFT)',
            'Lipid Profile'
        ];

        let created = 0;
        for (let i = 0; i < patients.rows.length; i++) {
            const patient = patients.rows[i];
            const testName = tests[i % tests.length];
            const priority = i === 0 ? 'Urgent' : 'Normal';

            try {
                await pool.query(`
                    INSERT INTO lab_requests (patient_id, test_name, status, priority, requested_at, notes)
                    VALUES ($1, $2, $3, $4, NOW(), $5)
                `, [patient.id, testName, 'Pending', priority, 'Demo lab request for practice']);

                console.log(`✅ Created: ${testName} for ${patient.name} [${priority}]`);
                created++;
            } catch (err) {
                console.log(`⚠️ Skipped: ${testName} - ${err.message}`);
            }
        }

        console.log(`\n🎉 Created ${created} lab requests!`);
        console.log('\n📌 Lab Technician Login: lab_user / password123');
        console.log('🌐 URL: http://localhost:5173');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

seedLabData();
