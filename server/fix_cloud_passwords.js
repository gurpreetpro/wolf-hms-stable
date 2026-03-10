const pool = require('./config/db-cloud');
const bcrypt = require('bcryptjs');

async function fixPasswords() {
    console.log('Fixing Cloud SQL user passwords...');
    
    const hash = await bcrypt.hash('Wolf@2024!', 10);
    console.log('Generated hash:', hash);
    
    // Update ALL users with the password
    const result = await pool.query(
        `UPDATE users SET password = $1 RETURNING username`,
        [hash]
    );
    
    console.log(`Updated ${result.rowCount} users with password: Wolf@2024!`);
    
    // Show updated users
    const users = await pool.query('SELECT username, role, password IS NOT NULL as has_pwd FROM users LIMIT 10');
    console.log('Users:', users.rows);
    
    process.exit(0);
}

fixPasswords().catch(e => { console.error(e); process.exit(1); });
