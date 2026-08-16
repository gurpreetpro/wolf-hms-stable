const path = require('path');
const bcrypt = require(path.join(__dirname, '../../server/node_modules/bcryptjs'));
const { pool } = require('../../server/db');

async function resetPasswords() {
    const newPassword = 'password123';
    const hash = await bcrypt.hash(newPassword, 10);

    // Reset admin_taneja
    const r1 = await pool.query(
        `UPDATE users SET password = $1 WHERE username = 'admin_taneja' RETURNING username, role`,
        [hash]
    );
    console.log('✅ admin_taneja:', r1.rows[0]?.role || 'NOT FOUND');

    // Reset admin_user
    const r2 = await pool.query(
        `UPDATE users SET password = $1 WHERE username = 'admin_user' RETURNING username, role`,
        [hash]
    );
    console.log('✅ admin_user:', r2.rows[0]?.role || 'NOT FOUND');

    // Create receptionist_user if missing
    const check = await pool.query(`SELECT id FROM users WHERE username = 'receptionist_user'`);
    if (check.rows.length === 0) {
        await pool.query(`
            INSERT INTO users (username, password, email, role, is_active, approval_status, hospital_id, name)
            VALUES ('receptionist_user', $1, 'reception@wolfhms.com', 'receptionist', true, 'APPROVED', 1, 'Reception Desk')
        `, [hash]);
        console.log('✅ receptionist_user CREATED (role: receptionist, hospital: 1)');
    } else {
        await pool.query(`UPDATE users SET password = $1 WHERE username = 'receptionist_user'`, [hash]);
        console.log('✅ receptionist_user password reset');
    }

    console.log(`\n🔐 All passwords set to: ${newPassword}`);
    process.exit(0);
}

resetPasswords().catch(e => { console.error('❌', e.message); process.exit(1); });
