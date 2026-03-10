const pool = require('./config/db');

const createTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS emergency_logs (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) NOT NULL,
                location VARCHAR(100),
                triggered_by INTEGER REFERENCES users(id),
                status VARCHAR(50) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('emergency_logs table created or already exists.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        pool.end();
    }
};

createTable();
