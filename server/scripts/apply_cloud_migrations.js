const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: process.env.DB_PASSWORD || 'Hospital456!',
    port: 5434, // Cloud SQL Proxy Port
};

console.log('Using Cloud Proxy Config:', { ...poolConfig, password: '***' });

const pool = new Pool(poolConfig);

async function runCloudMigrations() {
    try {
        const migrationsDir = path.join(__dirname, '../migrations');
        const targetFiles = ['040_100_percent_fix.sql', '041_last_mile_fixes.sql', '042_nurse_tables.sql', '043_final_polish.sql'];

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const file of targetFiles) {
                console.log(`Running migration: ${file}`);
                const sqlPath = path.join(migrationsDir, file);
                if (fs.existsSync(sqlPath)) {
                    const sql = fs.readFileSync(sqlPath, 'utf8');
                    await client.query(sql);
                    console.log(`Success: ${file}`);
                } else {
                    console.error(`File not found: ${file}`);
                }
            }

            await client.query('COMMIT');
            console.log('✅ Cloud migrations applied successfully.');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runCloudMigrations();
