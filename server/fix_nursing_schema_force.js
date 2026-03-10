const pool = require('./config/db');

const statements = [
    `ALTER TABLE pain_scores ADD COLUMN patient_id INT REFERENCES patients(id)`,
    `ALTER TABLE fluid_balance ADD COLUMN patient_id INT REFERENCES patients(id)`,
    `ALTER TABLE iv_lines ADD COLUMN patient_id INT REFERENCES patients(id)`,
    
    // Backfill
    `UPDATE pain_scores SET patient_id = (SELECT patient_id FROM admissions WHERE admissions.id = pain_scores.admission_id) WHERE patient_id IS NULL`,
    `UPDATE fluid_balance SET patient_id = (SELECT patient_id FROM admissions WHERE admissions.id = fluid_balance.admission_id) WHERE patient_id IS NULL`,
    `UPDATE iv_lines SET patient_id = (SELECT patient_id FROM admissions WHERE admissions.id = iv_lines.admission_id) WHERE patient_id IS NULL`
];

(async () => {
    try {
        console.log("Forcing Patient ID Column Add...");
        for (const sql of statements) {
            try {
                await pool.query(sql);
                console.log(`Executed: ${sql.substring(0, 50)}...`);
            } catch (err) {
                console.log(`Error (Ignored if exists): ${err.message}`);
            }
        }
        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
