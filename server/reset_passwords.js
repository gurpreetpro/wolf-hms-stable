const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost', user: 'wolfhms',
    password: 'W0lfDB_2026!!Secure', database: 'hospital_db'
});

(async () => {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hash, 'admin_user']);
    const r = await pool.query('SELECT id, username, role, hospital_id FROM users WHERE hospital_id = 1 ORDER BY id LIMIT 5');
    console.log('Users for Hospital 1:', JSON.stringify(r.rows, null, 2));
    
    // Also reset superadmin
    const hash2 = await bcrypt.hash('wolf2026', 10);
    await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hash2, 'gurpreetpro']);
    
    // Count total tables
    const tables = await pool.query("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'");
    console.log('Total tables:', tables.rows[0].count);
    
    await pool.end();
    console.log('Password reset done.');
})();
