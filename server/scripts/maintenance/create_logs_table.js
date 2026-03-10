const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432
});

async function createLogsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(50) NOT NULL,
                details TEXT,
                ip_address VARCHAR(45),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Created system_logs table');

        // Create index
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp DESC);`);
        console.log('✅ Created index on timestamp');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createLogsTable();
