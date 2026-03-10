const pool = require('./config/db');

const statements = [
    // 1. Revert admission_id to INT
    // Remove UUID columns
    `ALTER TABLE pain_scores DROP COLUMN admission_id`,
    `ALTER TABLE fluid_balance DROP COLUMN admission_id`,
    `ALTER TABLE iv_lines DROP COLUMN admission_id`,

    // Add INT columns
    `ALTER TABLE pain_scores ADD COLUMN admission_id INTEGER REFERENCES admissions(id)`,
    `ALTER TABLE fluid_balance ADD COLUMN admission_id INTEGER REFERENCES admissions(id)`,
    `ALTER TABLE iv_lines ADD COLUMN admission_id INTEGER REFERENCES admissions(id)`,

    // 2. Fix Fluid Balance Volume
    `ALTER TABLE fluid_balance ADD COLUMN IF NOT EXISTS volume_ml INTEGER`
];

(async () => {
    try {
        console.log("Restoring Nursing Schema (INT & Volume)...");
        for (const sql of statements) {
            try {
                await pool.query(sql);
                console.log(`Executed: ${sql}`);
            } catch (err) {
                console.log(`Error: ${err.message}`);
            }
        }
        
        // Verify Fluid Columns
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'fluid_balance'");
        console.log("Fluid Columns:", res.rows.map(r => r.column_name));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
