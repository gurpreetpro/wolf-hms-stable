const { runMigration } = require('./migrate');
const pool = require('./config/db');

async function run() {
    try {
        // Ensure migrations table exists (migrate.js helper might check it but good to be safe)
        // Actually migrate.js ensureMigrationsTable is safer, but not exported.
        // We'll just define it here or skip if we assume schema exists.
        // But schema_migrations table existence is key.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT NOW(),
                checksum VARCHAR(64)
            )
        `);

        await runMigration('206_add_capacity_to_wards.sql');
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}
run();
