const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function createDemoUsers() {
    try {
        // First update the role constraint to include all needed roles
        console.log('Updating role constraint...');
        await pool.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS users_role_check;
        `);
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_role_check 
            CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'anaesthetist', 'billing', 'finance'));
        `);
        console.log('✅ Role constraint updated!\n');

        // Generate fresh hash for 'demo123'
        const hashedPassword = await bcrypt.hash('demo123', 10);
        console.log('Generated hash for demo123:', hashedPassword);

        // All demo users with CORRECT role names
        const demoUsers = [
            { username: 'demo_admin', email: 'demo.admin@wolf.com', role: 'admin', department: 'Administration' },
            { username: 'Dr. Demo (Medicine)', email: 'demo.doctor@wolf.com', role: 'doctor', department: 'General Medicine' },
            { username: 'Dr. Ortho', email: 'dr.ortho@wolf.com', role: 'doctor', department: 'Orthopedics' },
            { username: 'demo_receptionist', email: 'demo.reception@wolf.com', role: 'receptionist', department: 'Reception' },
            { username: 'demo_pharmacist', email: 'demo.pharmacy@wolf.com', role: 'pharmacist', department: 'Pharmacy' },
            { username: 'demo_lab_tech', email: 'demo.lab@wolf.com', role: 'lab_tech', department: 'Lab' },
            { username: 'demo_nurse', email: 'demo.nurse@wolf.com', role: 'nurse', department: 'Nursing' },
            { username: 'demo_billing', email: 'demo.billing@wolf.com', role: 'billing', department: 'Finance' }
        ];

        console.log('Creating demo users...\n');

        for (const user of demoUsers) {
            try {
                // Delete any existing user with same username or email
                await pool.query('DELETE FROM users WHERE username = $1 OR email = $2',
                    [user.username, user.email]);

                // Insert fresh
                const result = await pool.query(
                    'INSERT INTO users (username, email, password, role, is_active, department) VALUES ($1, $2, $3, $4, true, $5) RETURNING id',
                    [user.username, user.email, hashedPassword, user.role, user.department || null]
                );
                console.log(`✅ ${user.username} (${user.role}) - ID: ${result.rows[0].id}`);
            } catch (err) {
                console.log(`❌ ${user.username}: ${err.message}`);
            }
        }

        // Verify all doctors are created
        console.log('\n📋 All active doctors in system:');
        const doctors = await pool.query(
            "SELECT id, username, role, is_active FROM users WHERE role = 'doctor' AND is_active = true"
        );
        doctors.rows.forEach(d => console.log(`  ID ${d.id}: ${d.username}`));

        console.log('\n🎉 All demo users created!');
        console.log('Password for ALL accounts: demo123');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

createDemoUsers();
