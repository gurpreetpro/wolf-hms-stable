const { runMigration } = require('./migrate');
const pool = require('./config/db');

async function run() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await runMigration('208_clinical_ward_tables.sql');
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}
run();
