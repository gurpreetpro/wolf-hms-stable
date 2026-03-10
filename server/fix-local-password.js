const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432,
});

async function run() {
    try {
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Generated hash:', hashedPassword);

        const res = await pool.query(
            "UPDATE users SET password = $1 WHERE username = 'admin_user' RETURNING *",
            [hashedPassword]
        );

        if (res.rows.length > 0) {
            console.log('✅ Password updated for admin_user');
        } else {
            console.log('❌ admin_user not found');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
