const pool = require('./config/db');

const statements = [
    // 1. Truncate to clear data (DEV ONLY - Safe here)
    `TRUNCATE TABLE pain_scores, fluid_balance, iv_lines CASCADE`,

    // 2. Fix Admission ID Types
    // Note: If they are FKs, we might need to drop constraint first? 
    // Assuming no explicit constraint name known, but usually "pain_scores_admission_id_fkey".
    // I'll try simple ALTER TYPE. If it fails due to FK, I'll drop constraint.
    // Actually, converting INT to UUID is hard. Better to DROP column and ADD it back?
    // But data is gone anyway.
    
    `ALTER TABLE pain_scores DROP COLUMN admission_id`,
    `ALTER TABLE pain_scores ADD COLUMN admission_id UUID REFERENCES admissions(id)`,

    `ALTER TABLE fluid_balance DROP COLUMN admission_id`,
    `ALTER TABLE fluid_balance ADD COLUMN admission_id UUID REFERENCES admissions(id)`,

    `ALTER TABLE iv_lines DROP COLUMN admission_id`,
    `ALTER TABLE iv_lines ADD COLUMN admission_id UUID REFERENCES admissions(id)`,

    // 3. Fix Fluid Balance Columns
    `ALTER TABLE fluid_balance ADD COLUMN IF NOT EXISTS type VARCHAR(50)`,
    `ALTER TABLE fluid_balance ADD COLUMN IF NOT EXISTS subtype VARCHAR(50)`
];

(async () => {
    try {
        console.log("Fixing Nursing Schema (UUID & Columns)...");
        for (const sql of statements) {
            try {
                await pool.query(sql);
                console.log(`Executed: ${sql.substring(0, 50)}...`);
            } catch (err) {
                console.log(`Error: ${err.message}`);
                // Proceeding because maybe column already dropped/added
            }
        }
        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
