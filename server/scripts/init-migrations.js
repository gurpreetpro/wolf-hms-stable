const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env from one level up (server root)
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

const init = async () => {
    try {
        console.log('🔄 Initializing migration history...');
        
        // 1. Ensure migrations table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Read migration files
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort();

        // 3. Mark all EXCEPT the last one (090_audit_logs) as applied
        // Because we manually ran 090, we should mark that too actually.
        // Let's mark ALL as applied since we know the DB is up to date manually.
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const file of files) {
                // Check if already logged
                const check = await client.query('SELECT id FROM migrations WHERE name = $1', [file]);
                if (check.rows.length === 0) {
                    await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    console.log(`✅ Marked as applied: ${file}`);
                }
            }
            await client.query('COMMIT');
            console.log('🎉 Migration history synchronized.');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Init Error:', err);
    } finally {
        await pool.end();
    }
};

init();
