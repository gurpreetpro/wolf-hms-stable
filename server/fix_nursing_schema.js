const pool = require('./config/db');

const statements = [
    `ALTER TABLE pain_scores ADD COLUMN IF NOT EXISTS patient_id INT REFERENCES patients(id)`,
    `ALTER TABLE fluid_balance ADD COLUMN IF NOT EXISTS patient_id INT REFERENCES patients(id)`,
    `ALTER TABLE iv_lines ADD COLUMN IF NOT EXISTS patient_id INT REFERENCES patients(id)`,

    // Backfill logic
    `UPDATE pain_scores SET patient_id = (SELECT patient_id FROM admissions WHERE admissions.id = pain_scores.admission_id) WHERE patient_id IS NULL`,
    `UPDATE fluid_balance SET patient_id = (SELECT patient_id FROM admissions WHERE admissions.id = fluid_balance.admission_id) WHERE patient_id IS NULL`,
    `UPDATE iv_lines SET patient_id = (SELECT patient_id FROM admissions WHERE admissions.id = iv_lines.admission_id) WHERE patient_id IS NULL`
];

(async () => {
    try {
        console.log("Applying Patient ID Fix to Nursing Tables...");
        for (const sql of statements) {
            try {
                await pool.query(sql);
            } catch (err) {
                console.log(`Warning: ${err.message}`);
            }
        }
        console.log("Fix applied successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Migration Fatal Error:", e);
        process.exit(1);
    }
})();
