const pool = require('./config/db');

(async () => {
    try {
        console.log("Recreating Wound Assessments Table (Hybrid)...");
        await pool.query("DROP TABLE IF EXISTS wound_assessments CASCADE");
        await pool.query(`
            CREATE TABLE wound_assessments (
                id SERIAL PRIMARY KEY,
                admission_id INTEGER REFERENCES admissions(id),
                patient_id UUID REFERENCES patients(id),
                location VARCHAR(100),
                type VARCHAR(50),
                size_cm VARCHAR(50),
                appearance VARCHAR(100),
                drainage VARCHAR(50),
                dressing_type VARCHAR(50),
                notes TEXT,
                recorded_by INTEGER REFERENCES users(id),
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                hospital_id INTEGER
            )
        `);
        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
