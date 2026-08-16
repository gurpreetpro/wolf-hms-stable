require('dotenv').config();
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('🌱 Seeding clinical staff for Hospital ID 1...');
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = [
        { username: 'admin', email: 'admin@wolf.com', role: 'admin', department: 'Administration' },
        { username: 'doctor', email: 'doctor@wolf.com', role: 'doctor', department: 'General Medicine' },
        { username: 'nurse', email: 'nurse@wolf.com', role: 'nurse', department: 'Nursing' },
        { username: 'lab_tech', email: 'lab_tech@wolf.com', role: 'lab_tech', department: 'Lab' },
        { username: 'pharmacist', email: 'pharmacist@wolf.com', role: 'pharmacist', department: 'Pharmacy' }
    ];

    for (const member of staff) {
        try {
            // Delete any conflicting users first
            await pool.query('DELETE FROM users WHERE username = $1 OR email = $2', [member.username, member.email]);
            
            // Insert user
            const result = await pool.query(
                `INSERT INTO users (username, email, password, role, department, hospital_id, is_active, approval_status) 
                 VALUES ($1, $2, $3, $4, $5, 1, true, 'APPROVED') RETURNING id`,
                [member.username, member.email, hashedPassword, member.role, member.department]
            );
            console.log(`✅ Seeded ${member.username} (${member.role}) with ID: ${result.rows[0].id}`);
        } catch (err) {
            console.error(`❌ Failed to seed ${member.username}:`, err.message);
        }
    }
    
    // Ensure role constraint is satisfied (if any)
    try {
        await pool.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS users_role_check;
        `);
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_role_check 
            CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'anaesthetist', 'billing', 'finance', 'super_admin', 'platform_admin'));
        `);
        console.log('✅ Updated users_role_check constraint');
    } catch (e) {
        console.warn('⚠️ Constraint check update warning:', e.message);
    }

    console.log('🌱 Seeding clinical staff completed!');
    process.exit(0);
}

seed().catch(err => {
    console.error('Error seeding:', err);
    process.exit(1);
});
