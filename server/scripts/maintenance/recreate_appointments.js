const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const recreate = async () => {
    try {
        console.log('Dropping appointments...');
        await pool.query("DROP TABLE IF EXISTS appointments CASCADE");
        console.log('Dropped.');

        console.log('Creating appointments...');
        // Simplified schema to ensure creation
        await pool.query(`
            CREATE TABLE appointments (
                id VARCHAR(50) PRIMARY KEY,
                patient_id UUID,
                doctor_id INT,
                department VARCHAR(100),
                appointment_date DATE,
                appointment_time VARCHAR(10),
                reason TEXT,
                notes TEXT,
                status VARCHAR(50) DEFAULT 'Scheduled',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Created.');
        process.exit(0);
    } catch (err) {
        console.error('Error recreating table:');
        console.error(err);
        process.exit(1);
    }
};

recreate();
