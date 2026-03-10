const pool = require('./config/db');

const statements = [
    `DROP TABLE IF EXISTS pain_scores CASCADE`,
    `DROP TABLE IF EXISTS fluid_balance CASCADE`,
    `DROP TABLE IF EXISTS iv_lines CASCADE`,

    `CREATE TABLE pain_scores (
        id SERIAL PRIMARY KEY,
        admission_id INTEGER REFERENCES admissions(id),
        patient_id INTEGER REFERENCES patients(id),
        score INTEGER,
        location VARCHAR(100),
        notes TEXT,
        recorded_by INTEGER REFERENCES users(id),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hospital_id INTEGER
    )`,

    `CREATE TABLE fluid_balance (
        id SERIAL PRIMARY KEY,
        admission_id INTEGER REFERENCES admissions(id),
        patient_id INTEGER REFERENCES patients(id),
        type VARCHAR(50),
        subtype VARCHAR(50),
        volume_ml INTEGER,
        notes TEXT,
        recorded_by INTEGER REFERENCES users(id),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hospital_id INTEGER
    )`,

    `CREATE TABLE iv_lines (
        id SERIAL PRIMARY KEY,
        admission_id INTEGER REFERENCES admissions(id),
        patient_id INTEGER REFERENCES patients(id),
        iv_line_type VARCHAR(50), 
        site VARCHAR(100),
        gauge VARCHAR(20),
        start_date TIMESTAMP,
        notes TEXT,
        recorded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hospital_id INTEGER
    )`
];

(async () => {
    try {
        console.log("Recreating Nursing Tables...");
        for (const sql of statements) {
            await pool.query(sql);
            console.log(`Executed: ${sql.substring(0, 30)}...`);
        }
        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
