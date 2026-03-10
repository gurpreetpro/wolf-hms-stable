const pool = require('./config/db');

async function fixAdminPassword() {
    try {
        const hash = '$2b$10$qW7Il1AkceF/oWAC8lOzEeK2AQE5mMT8GjweTzCXGMdACCejXoLOS';
        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE username = $2',
            [hash, 'admin_user']
        );
        console.log('✅ Rows affected:', result.rowCount);
        
        // Verify the update
        const check = await pool.query('SELECT username, password FROM users WHERE username = $1', ['admin_user']);
        if (check.rows.length > 0) {
            console.log('✅ User found:', check.rows[0].username);
            console.log('✅ Password hash starts with:', check.rows[0].password.substring(0, 20) + '...');
        } else {
            console.log('❌ User admin_user not found!');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

fixAdminPassword();
