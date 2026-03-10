const pool = require('./config/db');

// Explicitly add columns individually to handle failures gracefullly but loudly
const statements = [
    `ALTER TABLE pain_scores ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES admissions(id)`,
    `ALTER TABLE fluid_balance ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES admissions(id)`,
    `ALTER TABLE iv_lines ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES admissions(id)`
];

(async () => {
    try {
        console.log("Restoring Admission ID (UUID)...");
        for (const sql of statements) {
            try {
                await pool.query(sql);
                console.log(`Executed: ${sql}`);
            } catch (err) {
                console.log(`Error: ${err.message}`);
                // Try without constraint if FK fails
                if (err.message.includes('foreign key')) {
                     console.log("Retrying without FK constraint...");
                     const simpleSql = sql.split('REFERENCES')[0];
                     await pool.query(simpleSql);
                     console.log(`Executed (Simple): ${simpleSql}`);
                }
            }
        }
        
        // Use information_schema to verify
        const res = await pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('pain_scores', 'fluid_balance') AND column_name = 'admission_id'");
        console.table(res.rows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
