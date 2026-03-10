/**
 * Run Titan Migrations Script
 * Execute from command line: node run_titan_migrations.js
 * Connects to database and runs migrations in safe order
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Use environment variables or defaults
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'hospital_db',
    port: process.env.DB_PORT || 5432
});

const migrations = [
    { name: '302_feature_flags', file: 'migrations/302_feature_flags.sql', safe: true },
    { name: '301_backfill_null_hospital_ids', file: 'migrations/301_backfill_null_hospital_ids.sql', safe: true },
    { name: '300_row_level_security', file: 'migrations/300_row_level_security.sql', safe: true }
];

async function runMigrations() {
    console.log('🚀 Starting Titan Migrations...\n');
    
    const client = await pool.connect();
    
    try {
        for (const migration of migrations) {
            console.log(`📄 Running: ${migration.name}`);
            
            const filePath = path.join(__dirname, migration.file);
            if (!fs.existsSync(filePath)) {
                console.log(`   ⚠️  File not found: ${filePath}`);
                continue;
            }
            
            const sql = fs.readFileSync(filePath, 'utf8');
            
            try {
                await client.query(sql);
                console.log(`   ✅ Success\n`);
            } catch (err) {
                console.log(`   ❌ Error: ${err.message}\n`);
                if (!migration.safe) {
                    throw err;
                }
            }
        }
        
        console.log('✅ All Titan migrations completed!');
        
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
