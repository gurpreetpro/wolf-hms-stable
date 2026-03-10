const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CLOUD_URL = 'https://wolfhms-fdurncganq-el.a.run.app';
const SETUP_KEY = 'WolfSetup2024!'; // Must match env var on cloud
const MIGRATIONS_DIR = path.join(__dirname, 'server', 'migrations');

async function runMigrations() {
    console.log(`[MIGRATE] Targeted Cloud URL: ${CLOUD_URL}`);
    console.log(`[MIGRATE] Reading migrations from: ${MIGRATIONS_DIR}`);

    let files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
    files.sort(); // Ensure order like 001, 002...

    console.log(`[MIGRATE] Found ${files.length} migration files.`);

    for (const file of files) {
        const filePath = path.join(MIGRATIONS_DIR, file);
        const sqlContent = fs.readFileSync(filePath, 'utf8');

        console.log(`[MIGRATE] Processing: ${file}...`);
        fs.writeFileSync('last_migration.txt', file);
        try {
            await axios.post(`${CLOUD_URL}/api/health/exec-sql`, {
                sql: sqlContent,
                setupKey: SETUP_KEY
            });
            console.log(`[SUCCESS] ${file}`);
        } catch (error) {
            console.error(`[ERROR] Failed to execute ${file}`);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                // console.error(`Data: ${JSON.stringify(error.response.data)}`); // Truncated
                fs.writeFileSync('migration_error.json', JSON.stringify(error.response.data, null, 2));
                console.error('Saved full error to migration_error.json');
            } else {
                console.error(error.message);
            }
            // Decide if we should stop. Usually yes for migrations.
            console.error('[STOP] Halting migrations due to error.');
            process.exit(1);
        }
    }

    console.log('[MIGRATE] All migrations completed successfully.');
}

runMigrations();
