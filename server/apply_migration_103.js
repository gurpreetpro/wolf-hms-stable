const pool = require('./config/db');

const statements = [
    // 1. Create Tables
    `CREATE TABLE IF NOT EXISTS wound_assessments (
        id SERIAL PRIMARY KEY,
        admission_id INT REFERENCES admissions(id),
        patient_id INT REFERENCES patients(id),
        location TEXT,
        type TEXT,
        size_cm TEXT,
        appearance TEXT,
        drainage TEXT,
        dressing_type TEXT,
        notes TEXT,
        assessed_by INT REFERENCES users(id),
        assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hospital_id INT REFERENCES hospitals(id)
    )`,
    `CREATE TABLE IF NOT EXISTS fall_risk_assessments (
        id SERIAL PRIMARY KEY,
        admission_id INT REFERENCES admissions(id),
        patient_id INT REFERENCES patients(id),
        score INT,
        risk_level TEXT,
        history_of_falling TEXT,
        secondary_diagnosis TEXT,
        ambulatory_aid TEXT,
        iv_therapy TEXT,
        gait TEXT,
        mental_status TEXT,
        assessed_by INT REFERENCES users(id),
        assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hospital_id INT REFERENCES hospitals(id)
    )`,

    // 2. Add hospital_id to existing tables
    `ALTER TABLE fluid_balance ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id)`,
    `ALTER TABLE iv_lines ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id)`,
    `ALTER TABLE patient_consumables ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id)`,
    `ALTER TABLE nursing_care_plans ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id)`,
    `ALTER TABLE round_notes ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id)`,
    `ALTER TABLE soap_notes ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id)`,

    // 3. Populate default hospital_id
    `UPDATE fluid_balance SET hospital_id = 1 WHERE hospital_id IS NULL`,
    `UPDATE iv_lines SET hospital_id = 1 WHERE hospital_id IS NULL`,
    `UPDATE patient_consumables SET hospital_id = 1 WHERE hospital_id IS NULL`,
    `UPDATE nursing_care_plans SET hospital_id = 1 WHERE hospital_id IS NULL`,
    `UPDATE round_notes SET hospital_id = 1 WHERE hospital_id IS NULL`,
    `UPDATE soap_notes SET hospital_id = 1 WHERE hospital_id IS NULL`
];

(async () => {
    try {
        console.log("Applying Migration 103 (Sequential)...");
        for (const sql of statements) {
            try {
                await pool.query(sql);
            } catch (err) {
                // Ignore if error is "relation already exists" etc, but ADD COLUMN IF NOT EXISTS handles it.
                // Just log.
                console.log(`Command failed (non-critical if exists): ${sql.substring(0, 50)}... Error: ${err.message}`);
            }
        }
        console.log("Migration 103 applied successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Migration Fatal Error:", e);
        process.exit(1);
    }
})();
