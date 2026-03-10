const pool = require('./config/db'); // Use the app's verified connection
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🔌 Connecting to database (via config/db.js)...');
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('✅ Connected.');

        console.log('📄 Reading migration file...');
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '045_user_profile_upgrade.sql'), 'utf8');
        
        console.log('🚀 Executing migration...');
        await pool.query(sql);
        
        console.log('✅ Migration successful! Columns updated.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
