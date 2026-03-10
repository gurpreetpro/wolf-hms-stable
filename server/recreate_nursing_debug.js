const pool = require('./config/db');

async function runSql(name, sql) {
    try {
        console.log(`Running: ${name}`);
        await pool.query(sql);
        console.log(`✅ Success: ${name}`);
    } catch (e) {
        console.log(`❌ Fail: ${name} - ${e.message}`);
    }
}

(async () => {
    // Pain Scores (INT)
    await runSql('Drop Pain', 'DROP TABLE IF EXISTS pain_scores CASCADE');
    await runSql('Create Pain (INT)', `
        CREATE TABLE pain_scores (
            id SERIAL PRIMARY KEY,
            admission_id INTEGER REFERENCES admissions(id),
            patient_id INTEGER REFERENCES patients(id),
            score INTEGER,
            location VARCHAR(100),
            notes TEXT,
            recorded_by INTEGER REFERENCES users(id),
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            hospital_id INTEGER
        )
    `);

    // Fluid Balance (INT)
    await runSql('Drop Fluid', 'DROP TABLE IF EXISTS fluid_balance CASCADE');
    await runSql('Create Fluid (INT)', `
        CREATE TABLE fluid_balance (
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
        )
    `);

    // IV Lines (INT)
    await runSql('Drop IV', 'DROP TABLE IF EXISTS iv_lines CASCADE');
    await runSql('Create IV (INT)', `
        CREATE TABLE iv_lines (
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
        )
    `);

    process.exit(0);
})();
