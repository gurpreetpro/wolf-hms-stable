const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'admin',
    host: '217.216.78.81',
    database: 'wolfhms_db',
    password: 'wolfhms_secure_password',
    port: 5432,
});

async function run() {
    try {
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        console.log('Total migration files:', files.length);

        const res = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'migrations'
            );
        `);

        if (res.rows[0].exists) {
            const executed = await pool.query('SELECT name FROM migrations');
            const executedNames = new Set(executed.rows.map(r => r.name));
            const pending = files.filter(f => !executedNames.has(f));
            console.log('Pending migrations:', pending.length);

            for (const file of pending) {
                console.log('Executing', file, '...');
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                try {
                    await pool.query(sql);
                    await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    console.log('Done', file);
                } catch (e) {
                    console.error('Failed', file, ':', e.message);
                }
            }
        } else {
            console.log('migrations table does not exist. Creating it...');
            await pool.query('CREATE TABLE migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, executed_at TIMESTAMP DEFAULT NOW());');
            console.log('Table created. Rerun the script.');
        }
    } catch (e) {
        console.error('Script Error:', e.message);
    } finally {
        pool.end();
    }
}

run();
