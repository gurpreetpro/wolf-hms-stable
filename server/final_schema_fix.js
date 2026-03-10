const pool = require('./config/db');

(async () => {
    try {
        console.log("🔍 Checking 'pain_scores' columns BEFORE fix...");
        const cols1 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'pain_scores'");
        console.log(cols1.rows.map(r => r.column_name));

        console.log("🛠️ Attempting: ALTER TABLE pain_scores ADD COLUMN patient_id INTEGER...");
        try {
            await pool.query("ALTER TABLE pain_scores ADD COLUMN patient_id INTEGER");
            console.log("✅ ALTER TABLE success.");
        } catch (err) {
            console.log("⚠️ ALTER TABLE failed: " + err.message);
        }
        
        console.log("🛠️ Attempting: ALTER TABLE fluid_balance ADD COLUMN patient_id INTEGER...");
        try {
            await pool.query("ALTER TABLE fluid_balance ADD COLUMN patient_id INTEGER");
            console.log("✅ ALTER TABLE success.");
        } catch (err) {
            console.log("⚠️ ALTER TABLE failed: " + err.message);
        }

        console.log("🛠️ Attempting: ALTER TABLE iv_lines ADD COLUMN patient_id INTEGER...");
        try {
            await pool.query("ALTER TABLE iv_lines ADD COLUMN patient_id INTEGER");
            console.log("✅ ALTER TABLE success.");
        } catch (err) {
            console.log("⚠️ ALTER TABLE failed: " + err.message);
        }

        console.log("🔍 Checking 'pain_scores' columns AFTER fix...");
        const cols2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'pain_scores'");
        console.log(cols2.rows.map(r => r.column_name));

        process.exit(0);
    } catch (e) {
        console.error("FATAL:", e);
        process.exit(1);
    }
})();
