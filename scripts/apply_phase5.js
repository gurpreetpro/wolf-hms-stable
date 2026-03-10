const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server directory
const envPath = path.resolve(__dirname, '../server/.env');
console.log(`Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

const db = require('../server/db');
const fs = require('fs');

async function applyMigration() {
    try {
        const sqlPath = path.join(__dirname, '../server/db/migrations/phase5_seeds.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Applying Phase 5 Migration...');
        await db.pool.query(sql);
        console.log('✅ Migration applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', JSON.stringify(err, null, 2));
        console.error(err.message);
        process.exit(1);
    }
}

applyMigration();
