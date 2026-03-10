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

const run = async () => {
    const command = process.argv[2] || 'up'; // Default to 'up'

    if (command === 'up') {
        await migrateUp();
    } else {
        console.log(`Unknown command: ${command}`);
        process.exit(1);
    }
    
    await pool.end();
};

const migrateUp = async () => {
    try {
        console.log('🔄 Checking database connection...');
        
        // 1. Ensure migrations table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Get applied migrations
        const result = await pool.query('SELECT name FROM migrations');
        const applied = new Set(result.rows.map(row => row.name));

        // 3. Read migration files
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Ensure 001 runs before 002

        // 4. Run pending migrations
        for (const file of files) {
            if (!applied.has(file)) {
                console.log(`🚀 Applying migration: ${file}`);
                const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
                
                // Transaction
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await client.query(sql);
                    await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    await client.query('COMMIT');
                    console.log(`✅ Applied: ${file}`);
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error(`❌ Failed: ${file}`, err.message);
                    process.exit(1); 
                } finally {
                    client.release();
                }
            } else {
                // console.log(`⏭️ Skipped (Already applied): ${file}`);
            }
        }
        console.log('🎉 All migrations up to date.');

    } catch (err) {
        console.error('Migration Error:', err);
        process.exit(1);
    }
};

run();
