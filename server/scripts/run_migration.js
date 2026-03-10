const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || '1234',
    port: process.env.DB_PORT || 5432,
});


async function runMigrations() {
    try {
        const migrationsDir = path.join(__dirname, '../migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.error('Migrations directory not found:', migrationsDir);
            return;
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`Found ${files.length} migration files.`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Create migrations table if not exists
            await client.query(`
                CREATE TABLE IF NOT EXISTS applied_migrations (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) UNIQUE NOT NULL,
                    applied_at TIMESTAMP DEFAULT NOW()
                );
            `);

            // Get applied migrations
            const appliedRes = await client.query('SELECT filename FROM applied_migrations');
            const appliedFiles = new Set(appliedRes.rows.map(r => r.filename));

            for (const file of files) {
                if (!appliedFiles.has(file)) {
                    console.log(`Running migration: ${file}`);
                    const sqlPath = path.join(migrationsDir, file);
                    const sql = fs.readFileSync(sqlPath, 'utf8');
                    await client.query(sql);
                    await client.query('INSERT INTO applied_migrations (filename) VALUES ($1)', [file]);
                }
            }

            await client.query('COMMIT');
            console.log('All migrations applied successfully.');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

runMigrations();
