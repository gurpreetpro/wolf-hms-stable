const pool = require('./config/db');

const statements = [
    // 1. Revert admission_id to UUID
    `ALTER TABLE pain_scores DROP COLUMN admission_id`,
    `ALTER TABLE fluid_balance DROP COLUMN admission_id`,
    `ALTER TABLE iv_lines DROP COLUMN admission_id`,

    `ALTER TABLE pain_scores ADD COLUMN admission_id UUID REFERENCES admissions(id)`,
    `ALTER TABLE fluid_balance ADD COLUMN admission_id UUID REFERENCES admissions(id)`,
    `ALTER TABLE iv_lines ADD COLUMN admission_id UUID REFERENCES admissions(id)`,

    // 2. Fix Fluid Balance Notes
    `ALTER TABLE fluid_balance ADD COLUMN IF NOT EXISTS notes TEXT`
];

(async () => {
    try {
        console.log("Restoring Nursing Schema (UUID & Notes)...");
        for (const sql of statements) {
            try {
                await pool.query(sql);
                console.log(`Executed: ${sql}`);
            } catch (err) {
                console.log(`Error: ${err.message}`);
            }
        }
        
        // Check Data Types
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pain_scores'");
        console.table(res.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
