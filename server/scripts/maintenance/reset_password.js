const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function resetPassword() {
    try {
        const hash = await bcrypt.hash('password123', 10);
        const res = await pool.query("UPDATE users SET password = $1 WHERE username = 'admin' RETURNING *", [hash]);

        if (res.rows.length > 0) {
            console.log('✅ Admin password updated successfully');
        } else {
            console.log('⚠️ Admin user not found. Creating one...');
            await pool.query(
                "INSERT INTO users (username, password, role, email, is_active) VALUES ($1, $2, 'admin', 'admin@hospital.com', true)",
                ['admin', hash]
            );
            console.log('✅ Admin user created');
        }
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

resetPassword();
