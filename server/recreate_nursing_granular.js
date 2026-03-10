const pool = require('./config/db');

async function runSql(name, sql) {
    try {
        console.log(`Running: ${name}`);
        const res = await pool.query(sql);
        console.log(`✅ Success: ${name}`);
    } catch (e) {
        console.log(`❌ Fail: ${name} - ${e.message}`);
    }
}

(async () => {
    await runSql('Drop Pain', 'DROP TABLE IF EXISTS pain_scores CASCADE');
    await runSql('Create Pain (No FK)', `
        CREATE TABLE pain_scores (
            id SERIAL PRIMARY KEY,
            admission_id INTEGER,
            patient_id INTEGER,
            recorded_by INTEGER,
            hospital_id INTEGER,
            score INTEGER,
            location VARCHAR(100),
            notes TEXT,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await runSql('Add FK Admission', `ALTER TABLE pain_scores ADD CONSTRAINT fk_adm FOREIGN KEY (admission_id) REFERENCES admissions(id)`);
    await runSql('Add FK Patient', `ALTER TABLE pain_scores ADD CONSTRAINT fk_pat FOREIGN KEY (patient_id) REFERENCES patients(id)`);
    await runSql('Add FK User', `ALTER TABLE pain_scores ADD CONSTRAINT fk_user FOREIGN KEY (recorded_by) REFERENCES users(id)`);

    process.exit(0);
})();
