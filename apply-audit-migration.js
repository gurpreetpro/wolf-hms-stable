const { Pool } = require('./server/node_modules/pg');
const fs = require('fs');
const path = require('path');

// Hardcoded for Local Dev since dotenv is missing in root
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!', 
    port: 5432,
});

const applyMigration = async (filePath) => {
    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`Applying migration: ${filePath}`);
        await pool.query(sql);
        console.log('Migration applied successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
};

const migrationFile = process.argv[2];
if (!migrationFile) {
    console.error('Please provide a migration file path.');
    process.exit(1);
}

applyMigration(migrationFile);
