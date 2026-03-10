const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hms',
    password: 'postgres',
    port: 5432,
});

async function createWardIncharge() {
    try {
        // First, list existing users
        const existingUsers = await pool.query('SELECT username, role FROM users ORDER BY role');
        console.log('\\n=== Existing Users ===');
        existingUsers.rows.forEach(u => console.log(`${u.username} - ${u.role}`));

        // Check if ward_incharge exists
        const wardUser = await pool.query("SELECT * FROM users WHERE username = 'ward_incharge'");

        if (wardUser.rows.length > 0) {
            console.log('\\n✅ ward_incharge user already exists');
        } else {
            // Create ward_incharge user
            const hashedPassword = await bcrypt.hash('password123', 10);
            await pool.query(
                "INSERT INTO users (username, password_hash, role, full_name) VALUES ($1, $2, $3, $4)",
                ['ward_incharge', hashedPassword, 'ward_incharge', 'Ward In-Charge']
            );
            console.log('\\n✅ Created ward_incharge user');
        }

        // Also check/create nurse user
        const nurseUser = await pool.query("SELECT * FROM users WHERE username = 'nurse'");

        if (nurseUser.rows.length > 0) {
            console.log('✅ nurse user already exists');
        } else {
            const hashedPassword = await bcrypt.hash('password123', 10);
            await pool.query(
                "INSERT INTO users (username, password_hash, role, full_name) VALUES ($1, $2, $3, $4)",
                ['nurse', hashedPassword, 'nurse', 'Staff Nurse']
            );
            console.log('✅ Created nurse user');
        }

        // List users again to confirm
        const updatedUsers = await pool.query("SELECT username, role FROM users ORDER BY role");
        console.log('\\n=== Updated Users ===');
        updatedUsers.rows.forEach(u => console.log(`${u.username} - ${u.role}`));

        console.log('\\n🔑 Login Credentials:');
        console.log('   ward_incharge / password123');
        console.log('   nurse / password123');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

createWardIncharge();
