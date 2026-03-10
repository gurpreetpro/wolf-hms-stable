const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    user: 'test_guard', // Use the test user now to verify permissions
    host: 'localhost',
    database: 'hospital_db_test',
    password: 'WolfGuard2025!',
    port: 5434, // Test Proxy Port
});

async function seedTestUser() {
    try {
        console.log('Connecting to hospital_db_test on localhost:5434...');
        
        const username = 'guard_user';
        const rawPassword = 'password123';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        
        // Check if user exists
        const check = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        
        if (check.rows.length > 0) {
            console.log('User already exists. Updating password...');
            await pool.query("UPDATE users SET password = $1 WHERE username = $2", [hashedPassword, username]);
        } else {
            console.log('Creating new guard_user...');
            await pool.query(`
                INSERT INTO users (username, password, email, role, is_active, approval_status, department)
                VALUES ($1, $2, 'guard@test.com', 'security_guard', true, 'APPROVED', 'Security')
            `, [username, hashedPassword]);
        }

        console.log('✅ guard_user seeded successfully in TEST DB.');
    } catch (err) {
        console.error('❌ Error seeding user:', err.message);
        if (err.detail) console.error('Detail:', err.detail);
        if (err.table) console.error('Table:', err.table);
    } finally {
        await pool.end();
    }
}

seedTestUser();
