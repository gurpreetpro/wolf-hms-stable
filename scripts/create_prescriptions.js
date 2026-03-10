const axios = require('axios');

const URL = 'https://wolf-tech-server-708086797390.asia-south1.run.app/api/health/exec-sql';
const KEY = 'WolfSetup2024!';

async function runQuery(label, sql) {
    try {
        console.log(`\n--- ${label} ---`);
        const res = await axios.post(URL, {
            setupKey: KEY,
            sql: sql
        });
        if (res.data.success) {
            console.log(`Success! Rows: ${res.data.rowCount}`);
        } else {
            console.log('Query returned success: false', res.data);
        }
    } catch (e) {
        console.error('Error:', e.response?.data?.error || e.message);
    }
}

async function createPrescriptions() {
    // Create the prescriptions table (from 070_prescriptions.sql schema)
    await runQuery('Create prescriptions table', `
        CREATE TABLE IF NOT EXISTS prescriptions (
            id SERIAL PRIMARY KEY,
            patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
            doctor_id INT REFERENCES users(id) ON DELETE SET NULL,
            admission_id INT REFERENCES admissions(id) ON DELETE SET NULL,
            opd_visit_id INT REFERENCES opd_visits(id) ON DELETE SET NULL,
            medications JSONB NOT NULL DEFAULT '[]',
            instructions TEXT,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `);
    
    await runQuery('Create prescription indexes', `
        CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
        CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
    `);
    
    console.log('\n✅ prescriptions table created. Redeploy to continue migrations.');
}

createPrescriptions();
