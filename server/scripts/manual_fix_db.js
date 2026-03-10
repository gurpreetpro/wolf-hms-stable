const { pool } = require('../db');

async function fixDb() {
    try {
        console.log('Applying manual DB fixes...');

        // 1. Create clinical_vitals
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clinical_vitals (
                id SERIAL PRIMARY KEY,
                patient_id UUID REFERENCES patients(id),
                bp_systolic INTEGER,
                bp_diastolic INTEGER,
                heart_rate INTEGER,
                temperature DECIMAL(5, 2),
                spo2 INTEGER,
                respiratory_rate INTEGER,
                recorded_at TIMESTAMP DEFAULT NOW(),
                recorded_by VARCHAR(100)
            );
            CREATE INDEX IF NOT EXISTS idx_clinical_vitals_patient ON clinical_vitals(patient_id);
            CREATE INDEX IF NOT EXISTS idx_clinical_vitals_time ON clinical_vitals(recorded_at);
        `);
        console.log('Created clinical_vitals table.');

        // 2. Ensure equipment_types has daily_rate
        await pool.query(`
            ALTER TABLE equipment_types 
            ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2) DEFAULT 0;
        `);
        console.log('Fixed equipment_types.');

        // 3. Ensure wards has total_beds and available_beds
        await pool.query(`
            ALTER TABLE wards 
            ADD COLUMN IF NOT EXISTS total_beds INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS available_beds INT DEFAULT 0;
        `);
        console.log('Fixed wards.');

        console.log('All manual fixes applied successfully.');
        process.exit(0);

    } catch (err) {
        console.error('Manual fix failed:', err);
        process.exit(1);
    }
}

fixDb();
